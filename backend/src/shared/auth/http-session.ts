import { timingSafeEqual } from "crypto";
import type { IncomingMessage, ServerResponse } from "http";
import { isIP } from "net";
import { config } from "../../app/config/index.js";
import { AppError } from "../errors/app-error.js";
import { randomOAuthValue } from "../../modules/auth/oauth-provider.client.js";
import type {
  SessionTokens,
  AuthRequestMetadata,
} from "../../modules/auth/session.service.js";

export const ACCESS_COOKIE = "shongre_access";
export const REFRESH_COOKIE = "shongre_refresh";
export const CSRF_COOKIE = "shongre_csrf";
export const OAUTH_COMPLETION_COOKIE = "shongre_oauth_completion";

export function parseCookies(req: IncomingMessage): Record<string, string> {
  const result: Record<string, string> = {};
  for (const entry of (req.headers.cookie || "").split(";")) {
    const separator = entry.indexOf("=");
    if (separator <= 0) continue;
    const key = entry.slice(0, separator).trim();
    try {
      result[key] = decodeURIComponent(entry.slice(separator + 1).trim());
    } catch {
      // Ignore malformed cookie values instead of accepting a partially
      // decoded credential.
    }
  }
  return result;
}

function cookie(
  name: string,
  value: string,
  options: { httpOnly?: boolean; maxAge?: number; path?: string } = {},
): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${options.path || "/"}`,
    "SameSite=Lax",
  ];
  if (options.httpOnly) parts.push("HttpOnly");
  if (config.cookieSecure) parts.push("Secure");
  if (config.cookieDomain) parts.push(`Domain=${config.cookieDomain}`);
  if (options.maxAge !== undefined)
    parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  return parts.join("; ");
}

export function appendCookie(res: ServerResponse, value: string): void {
  const current = res.getHeader("Set-Cookie");
  const values = Array.isArray(current)
    ? current.map(String)
    : current
      ? [String(current)]
      : [];
  res.setHeader("Set-Cookie", [...values, value]);
}

export function setSessionCookies(
  res: ServerResponse,
  tokens: SessionTokens,
): string {
  const csrfToken = randomOAuthValue(24);
  appendCookie(
    res,
    cookie(ACCESS_COOKIE, tokens.token, {
      httpOnly: true,
      maxAge: config.authTokenTtlSeconds,
    }),
  );
  appendCookie(
    res,
    cookie(REFRESH_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      maxAge: config.authRefreshTokenTtlSeconds,
      path: "/api/v1/auth",
    }),
  );
  appendCookie(
    res,
    cookie(CSRF_COOKIE, csrfToken, {
      maxAge: config.authRefreshTokenTtlSeconds,
    }),
  );
  return csrfToken;
}

export function clearSessionCookies(res: ServerResponse): void {
  appendCookie(res, cookie(ACCESS_COOKIE, "", { httpOnly: true, maxAge: 0 }));
  appendCookie(
    res,
    cookie(REFRESH_COOKIE, "", {
      httpOnly: true,
      maxAge: 0,
      path: "/api/v1/auth",
    }),
  );
  appendCookie(res, cookie(CSRF_COOKIE, "", { maxAge: 0 }));
  appendCookie(
    res,
    cookie(OAUTH_COMPLETION_COOKIE, "", {
      httpOnly: true,
      maxAge: 0,
      path: "/api/v1/auth/oauth",
    }),
  );
}

export function setOAuthCompletionCookie(
  res: ServerResponse,
  handle: string,
): void {
  appendCookie(
    res,
    cookie(OAUTH_COMPLETION_COOKIE, handle, {
      httpOnly: true,
      maxAge: config.oauthFlowTtlSeconds,
      path: "/api/v1/auth/oauth",
    }),
  );
}

export function accessCookie(req: IncomingMessage): string | null {
  return parseCookies(req)[ACCESS_COOKIE] || null;
}

export function refreshCookie(req: IncomingMessage): string | null {
  return parseCookies(req)[REFRESH_COOKIE] || null;
}

export function oauthCompletionCookie(req: IncomingMessage): string | null {
  return parseCookies(req)[OAUTH_COMPLETION_COOKIE] || null;
}

export function requireCsrf(req: IncomingMessage): void {
  const expected = parseCookies(req)[CSRF_COOKIE];
  const suppliedHeader = req.headers["x-csrf-token"];
  const supplied = Array.isArray(suppliedHeader)
    ? suppliedHeader[0]
    : suppliedHeader;
  if (!expected || !supplied)
    throw new AppError({
      code: "FORBIDDEN",
      message: "La requête de sécurité a expiré. Rechargez la page.",
    });
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  if (
    expectedBuffer.length !== suppliedBuffer.length ||
    !timingSafeEqual(expectedBuffer, suppliedBuffer)
  ) {
    throw new AppError({
      code: "FORBIDDEN",
      message: "La requête de sécurité a expiré. Rechargez la page.",
    });
  }
}

export function requestMetadata(req: IncomingMessage): AuthRequestMetadata {
  const cloudflareHeader = Array.isArray(req.headers["cf-connecting-ip"])
    ? req.headers["cf-connecting-ip"][0]
    : req.headers["cf-connecting-ip"];
  const trustedCloudflareIp =
    process.env.SHONGRE_TRUST_PROXY_IP === "true" &&
    cloudflareHeader &&
    isIP(cloudflareHeader.trim())
      ? cloudflareHeader.trim()
      : "";
  const rawIp = trustedCloudflareIp || req.socket.remoteAddress || "";
  const ipPrefix = rawIp.includes(":")
    ? rawIp.split(":").slice(0, 4).join(":")
    : rawIp.split(".").slice(0, 3).join(".");
  const userAgent = String(req.headers["user-agent"] || "Appareil");
  const family = /Firefox/i.test(userAgent)
    ? "Firefox"
    : /Edg/i.test(userAgent)
      ? "Edge"
      : /Chrome/i.test(userAgent)
        ? "Chrome"
        : /Safari/i.test(userAgent)
          ? "Safari"
          : "Navigateur";
  const os = /iPhone|iPad/i.test(userAgent)
    ? "iOS"
    : /Android/i.test(userAgent)
      ? "Android"
      : /Windows/i.test(userAgent)
        ? "Windows"
        : /Mac OS/i.test(userAgent)
          ? "macOS"
          : "Appareil";
  return {
    ipPrefix: ipPrefix || null,
    deviceLabel: `${family} sur ${os}`,
    userAgentFamily: family,
  };
}
