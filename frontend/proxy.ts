import { NextRequest, NextResponse } from "next/server";
import { resolveMarketContext } from "@shongre/contracts";
import { marketInfrastructureFromEnvironment } from "./src/platform/market/market-infrastructure";

function requestHostname(request: NextRequest): string {
  const trustProxy = process.env.SHONGRE_TRUST_PROXY_HOST === "true";
  const forwarded = trustProxy
    ? request.headers.get("x-forwarded-host")?.split(",", 1)[0]?.trim()
    : "";
  return forwarded || request.headers.get("host") || request.nextUrl.host;
}

export function proxy(request: NextRequest) {
  const hostname = requestHostname(request);
  const allowLocalE2EHost =
    process.env.SHONGRE_E2E_ALLOW_LOCAL_HOSTS === "1";
  let context: ReturnType<typeof resolveMarketContext>;
  try {
    context = resolveMarketContext({
      hostname,
      pathname: request.nextUrl.pathname,
      infrastructure: marketInfrastructureFromEnvironment(),
      allowDevelopmentHosts:
        process.env.NODE_ENV !== "production" || allowLocalE2EHost,
    });
  } catch {
    console.error(
      JSON.stringify({
        event: "market_resolution",
        metric: "resolution_error",
        hostname,
      }),
    );
    return new NextResponse("Market resolution failed", {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
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
    return new NextResponse("Invalid Shongre host", {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
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
      return new NextResponse("Canonical redirect loop prevented", {
        status: 508,
        headers: { "Cache-Control": "no-store" },
      });
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
    return NextResponse.redirect(destination, 308);
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
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|favicon\\.svg|images/|fonts/).*)",
  ],
};
