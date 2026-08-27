import { NextRequest, NextResponse } from "next/server";
import {
  isLocal,
  isTest,
  resolveMarketContext,
  type EnvironmentConfig,
} from "@shongre/contracts";
import {
  marketInfrastructureFromEnvironment,
  webEnvironmentFromEnvironment,
} from "./src/platform/market/market-infrastructure";

function requestHostname(request: NextRequest): string {
  const trustProxy = process.env.SHONGRE_TRUST_PROXY_HOST === "true";
  const forwarded = trustProxy
    ? request.headers.get("x-forwarded-host")?.split(",", 1)[0]?.trim()
    : "";
  return forwarded || request.headers.get("host") || request.nextUrl.host;
}

function contentSecurityPolicy(environment: EnvironmentConfig): string {
  const localDevelopment =
    isLocal(environment.environment) || isTest(environment.environment);
  const connectSources = [
    "'self'",
    environment.urls.api.origin,
    "https://api.stripe.com",
    "https://m.stripe.network",
  ];
  const scriptSources = ["'self'", "'unsafe-inline'", "https://js.stripe.com"];
  const configuredAnalyticsOrigins = [
    process.env.NEXT_PUBLIC_POSTHOG_HOST,
    process.env.NEXT_PUBLIC_MATOMO_URL,
  ]
    .filter(Boolean)
    .flatMap((value) => {
      try {
        return [new URL(value!).origin];
      } catch {
        return [];
      }
    });
  connectSources.push(...configuredAnalyticsOrigins);
  scriptSources.push(...configuredAnalyticsOrigins);
  if (process.env.NEXT_PUBLIC_GA4_ENABLED === "true") {
    scriptSources.push("https://www.googletagmanager.com");
    connectSources.push(
      "https://www.google-analytics.com",
      "https://region1.google-analytics.com",
    );
  }
  if (process.env.NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_ENABLED === "true") {
    scriptSources.push("https://static.cloudflareinsights.com");
    connectSources.push("https://cloudflareinsights.com");
  }
  if (localDevelopment) {
    connectSources.push("http:", "ws:", "wss:");
  }

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSources.join(" ")}${localDevelopment ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https:",
    "font-src 'self' data:",
    `connect-src ${connectSources.join(" ")}`,
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  if (environment.urls.franceApp.protocol === "https:") {
    directives.push("upgrade-insecure-requests");
  }
  return directives.join("; ");
}

function applyRuntimeHeaders(
  response: NextResponse,
  environment: EnvironmentConfig,
): NextResponse {
  response.headers.set(
    "Content-Security-Policy",
    contentSecurityPolicy(environment),
  );
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), geolocation=(self), microphone=(), payment=(self)",
  );
  if (environment.urls.franceApp.protocol === "https:") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }
  if (!environment.searchIndexingEnabled) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  return response;
}

export function proxy(request: NextRequest) {
  const environment = webEnvironmentFromEnvironment();
  const hostname = requestHostname(request);
  const allowLocalE2EHost = process.env.SHONGRE_E2E_ALLOW_LOCAL_HOSTS === "1";
  let context: ReturnType<typeof resolveMarketContext>;
  try {
    context = resolveMarketContext({
      hostname,
      pathname: request.nextUrl.pathname,
      infrastructure: marketInfrastructureFromEnvironment(),
      allowDevelopmentHosts:
        isLocal(environment.environment) ||
        isTest(environment.environment) ||
        allowLocalE2EHost,
    });
  } catch {
    console.error(
      JSON.stringify({
        event: "market_resolution",
        metric: "resolution_error",
        hostname,
      }),
    );
    return applyRuntimeHeaders(
      new NextResponse("Market resolution failed", {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }),
      environment,
    );
  }

  if (context.kind === "invalid_host") {
    console.warn(
      JSON.stringify({
        event: "market_resolution",
        metric: "invalid_host",
        outcome: "invalid_host",
        hostname,
      }),
    );
    return applyRuntimeHeaders(
      new NextResponse("Invalid Shongre host", {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      }),
      environment,
    );
  }

  if (context.kind === "redirect" && context.redirectUrl) {
    const destination = new URL(context.redirectUrl);
    const normalizedRequestHost = hostname
      .toLowerCase()
      .replace(/:\d+$/, "")
      .replace(/\.$/, "");
    if (
      destination.hostname.toLowerCase() === normalizedRequestHost &&
      destination.pathname === request.nextUrl.pathname
    ) {
      console.error(
        JSON.stringify({
          event: "market_resolution",
          metric: "redirect_loop",
          hostname,
          reason: context.reason,
        }),
      );
      return applyRuntimeHeaders(
        new NextResponse("Canonical redirect loop prevented", {
          status: 508,
          headers: { "Cache-Control": "no-store" },
        }),
        environment,
      );
    }
    console.info(
      JSON.stringify({
        event: "market_resolution",
        metric: "redirect",
        secondaryMetric: "canonical_mismatch",
        outcome: "redirect",
        hostname,
        country: context.countryCode || "GLOBAL",
        reason: context.reason,
      }),
    );
    destination.search = request.nextUrl.search;
    return applyRuntimeHeaders(
      NextResponse.redirect(destination, 308),
      environment,
    );
  }

  if (context.kind === "not_found") {
    console.warn(
      JSON.stringify({
        event: "market_resolution",
        metric:
          context.reason === "UNKNOWN_COUNTRY"
            ? "unknown_country"
            : "canonical_mismatch",
        outcome: "not_found",
        hostname,
        reason: context.reason,
      }),
    );
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-shongre-resolved-host", hostname);
  requestHeaders.set("x-shongre-market-kind", context.kind);
  if (context.countryCode) {
    requestHeaders.set("x-shongre-market-code", context.countryCode);
    requestHeaders.set("x-shongre-market-locale", context.locale || "");
    requestHeaders.set("x-shongre-market-currency", context.currency || "");
  } else {
    requestHeaders.delete("x-shongre-market-code");
    requestHeaders.delete("x-shongre-market-locale");
    requestHeaders.delete("x-shongre-market-currency");
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Vary", "Host");
  response.headers.set("x-shongre-market", context.countryCode || "GLOBAL");
  return applyRuntimeHeaders(response, environment);
}

export const config = {
  matcher: [
    "/((?!healthz$|_next/static|_next/image|favicon\\.ico|favicon\\.svg|images/|fonts/).*)",
  ],
};
