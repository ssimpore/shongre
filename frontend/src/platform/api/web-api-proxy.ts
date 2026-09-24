import { randomUUID } from "node:crypto";
import { SHONGRE_API_PREFIX } from "@shongre/contracts/openapi";
import { SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS } from "@shongre/contracts/performance";
import { webEnvironmentFromEnvironment } from "../market/market-infrastructure";
import { createApplicationRegistry } from "../applications/application-registry";
import { edgeIdentityHeaders } from "./edge-identity";

const forwardedHeaders = [
  "accept",
  "accept-language",
  "user-agent",
  "content-type",
  "x-csrf-token",
  "x-shongre-market",
  "idempotency-key",
  "if-none-match",
];
const sessionCookies = new Set([
  "shongre_access",
  "shongre_refresh",
  "shongre_csrf",
  "shongre_oauth_completion",
]);

function failure(status: number, code: string, requestId: string): Response {
  return Response.json(
    {
      error: {
        code,
        statusCode: status,
        message: "La requête ne peut pas être traitée.",
      },
    },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store",
        "X-Request-Id": requestId,
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    },
  );
}

/**
 * The relay is one reader's hop, never a shared cache, so the backend's
 * cacheability is narrowed to what that reader's own cache may do with it: a
 * validator-only policy passes through, a shared profile keeps only its
 * browser lifetime, and everything else — writes, errors, credentialed reads,
 * anything the backend did not classify — is never stored.
 */
function browserCacheControl(upstream: string | null): string {
  const directives = new Map<string, string>();
  for (const directive of (upstream || "").split(",")) {
    const [name, value = ""] = directive.trim().toLowerCase().split("=", 2);
    if (name) directives.set(name, value);
  }
  if (directives.has("no-store")) return "private, no-store";
  if (directives.has("no-cache")) return "private, no-cache";
  const maxAge = Number(directives.get("max-age"));
  if (!directives.has("public") || !Number.isInteger(maxAge) || maxAge < 0)
    return "private, no-store";
  return maxAge === 0 ? "private, no-cache" : `private, max-age=${maxAge}`;
}

/** A fixed-upstream transport only. The backend owns every API decision. */
export async function forwardWebApiRequest(
  request: Request,
): Promise<Response> {
  const suppliedId = request.headers.get("x-request-id") || "";
  const requestId = /^[A-Za-z0-9._-]{1,128}$/.test(suppliedId)
    ? suppliedId
    : randomUUID();
  try {
    const environment = webEnvironmentFromEnvironment();
    const applications = createApplicationRegistry({
      environment: environment.environment,
      marketplaceOrigin:
        process.env.SHONGRE_MARKETPLACE_ORIGIN ||
        environment.urls.franceApp.origin,
      origins: {
        solutions: process.env.SHONGRE_SOLUTIONS_ORIGIN,
        prospects: process.env.SHONGRE_PROSPECTS_ORIGIN,
        facturation: process.env.SHONGRE_FACTURATION_ORIGIN,
      },
    });
    const allowedOrigins = new Set([
      environment.urls.franceApp.origin,
      environment.urls.internationalApp.origin,
      ...Object.values(applications).map((application) => application.origin),
    ]);
    const url = new URL(request.url);
    // Next's internal URL may use the private listener. Resolve the external
    // host only through the same explicit edge-trust setting as the Web shell.
    const forwardedHost =
      process.env.SHONGRE_TRUST_PROXY_HOST === "true"
        ? request.headers.get("x-forwarded-host")?.split(",", 1)[0]?.trim()
        : undefined;
    const host = forwardedHost || request.headers.get("host") || url.host;
    const origin = [...allowedOrigins].find(
      (candidate) => new URL(candidate).host === host,
    );
    const readiness =
      url.pathname === "/readyz" && ["GET", "HEAD"].includes(request.method);
    if (
      !origin ||
      (!readiness && !url.pathname.startsWith(`${SHONGRE_API_PREFIX}/`))
    )
      return failure(400, "BAD_REQUEST", requestId);
    const mutating = !["GET", "HEAD", "OPTIONS"].includes(request.method);
    const suppliedOrigin = request.headers.get("origin");
    if (
      (suppliedOrigin && suppliedOrigin !== origin) ||
      (mutating && suppliedOrigin !== origin)
    ) {
      return failure(403, "FORBIDDEN", requestId);
    }
    if (request.headers.get("sec-fetch-site") === "cross-site")
      return failure(403, "FORBIDDEN", requestId);
    const target = new URL(environment.urls.api);
    if (target.origin === origin)
      return failure(503, "INTERNAL_ERROR", requestId);
    target.pathname = url.pathname;
    target.search = url.search;
    const headers = new Headers();
    for (const name of forwardedHeaders) {
      const value = request.headers.get(name);
      if (value !== null) headers.set(name, value);
    }
    headers.set("x-request-id", requestId);
    headers.set("x-shongre-client", "web");
    headers.set("origin", origin);
    const cookies = (request.headers.get("cookie") || "")
      .split(";")
      .filter((cookie) => sessionCookies.has(cookie.split("=", 1)[0].trim()))
      .join(";");
    if (cookies && !readiness) headers.set("cookie", cookies);
    const referrer = request.headers.get("referer");
    if (referrer) {
      const parsedReferrer = new URL(referrer);
      if (parsedReferrer.origin !== origin)
        return failure(403, "FORBIDDEN", requestId);
      // Market resolution needs the path, never private query-string values.
      headers.set("referer", `${origin}${parsedReferrer.pathname}`);
    }
    for (const [name, value] of Object.entries(
      edgeIdentityHeaders(request.headers),
    ))
      headers.set(name, value);
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: mutating ? request.body : undefined,
      ...(mutating ? { duplex: "half" as const } : {}),
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.any([
        request.signal,
        AbortSignal.timeout(
          SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS.frontend.apiRequestTimeoutMs,
        ),
      ]),
    });
    const responseHeaders = new Headers();
    for (const name of [
      "content-type",
      "etag",
      "retry-after",
      "x-request-id",
    ]) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    const cacheControl = browserCacheControl(
      upstream.headers.get("cache-control"),
    );
    responseHeaders.set("Cache-Control", cacheControl);
    // A stored response is keyed on the market and language it answered, so
    // the browser never replays one market's data to another.
    const vary = upstream.headers.get("vary");
    if (vary && cacheControl !== "private, no-store")
      responseHeaders.set("Vary", vary);
    responseHeaders.set("X-Content-Type-Options", "nosniff");
    responseHeaders.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    for (const cookie of upstream.headers.getSetCookie()) {
      if (!sessionCookies.has(cookie.split("=", 1)[0])) continue;
      responseHeaders.append(
        "Set-Cookie",
        cookie.replace(/;\s*Domain=[^;]*/gi, ""),
      );
    }
    // Browser adapters consume JSON; provider redirects remain on the backend
    // callback boundary and must never become a credential-forwarding hop.
    if (
      upstream.status >= 300 &&
      upstream.status < 400 &&
      upstream.status !== 304
    ) {
      await upstream.body?.cancel();
      return failure(502, "INTERNAL_ERROR", requestId);
    }
    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return failure(502, "INTERNAL_ERROR", requestId);
  }
}
