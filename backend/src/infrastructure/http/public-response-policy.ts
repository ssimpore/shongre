import { createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { promisify } from "node:util";
import { gzip } from "node:zlib";
import type { PublicCacheProfileName } from "@shongre/contracts/performance";
import { config } from "../../app/config/index.js";

const PUBLIC_RESPONSE_PROFILES = {
  getListings: "discovery",
  getListingsById: "discovery",
  getHome: "discovery",
  getHomeTrending: "discovery",
  getSolutions: "catalog",
  getSolutionBySlug: "catalog",
  getAutoCatalog: "catalog",
  getBusinessRulesCatalog: "catalog",
  getEducationCatalog: "catalog",
  getEmploymentCatalog: "catalog",
  getRealEstateCatalog: "catalog",
  getTaxonomyHeaderNavigation: "catalog",
  getTaxonomyV4Tree: "catalog",
  resolveTaxonomyV4PublicationSchema: "catalog",
  getTaxonomyV4Options: "catalog",
  getTaxonomyNodesById: "catalog",
  getTaxonomyNodesByIdAttributes: "catalog",
  getTaxonomyNodesByIdChildren: "catalog",
  getTaxonomyRoot: "catalog",
  getTaxonomySearchFilters: "catalog",
  getTaxonomySlugBySlug: "catalog",
  getCurrencyCatalog: "reference",
  getMarkets: "reference",
  getMarketsByCode: "reference",
  getMarketsActive: "reference",
  getMarketsEffectiveByCode: "reference",
} as const satisfies Readonly<Record<string, PublicCacheProfileName>>;

const gzipAsync = promisify(gzip);

export interface PublicResponsePolicyInput {
  method: string;
  operationId: string;
  accessKind: "public" | "authenticated" | "permission";
  hasCredentials: boolean;
}

export function resolvePublicResponseProfile(
  input: PublicResponsePolicyInput,
): PublicCacheProfileName | null {
  if (
    input.method !== "GET" ||
    input.accessKind !== "public" ||
    input.hasCredentials
  ) {
    return null;
  }
  return (
    PUBLIC_RESPONSE_PROFILES[
      input.operationId as keyof typeof PUBLIC_RESPONSE_PROFILES
    ] || null
  );
}

function normalizedTagPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function cacheDomain(operationId: string): string {
  if (/Listing|Home|Trending/.test(operationId)) return "discovery";
  if (/Taxonomy/.test(operationId)) return "taxonomy";
  if (/BusinessRules|ProfessionalPlan/.test(operationId)) return "commercial";
  if (/Currency|ExchangeRate/.test(operationId)) return "currency";
  if (/Market|Countr/.test(operationId)) return "markets";
  if (/Solution/.test(operationId)) return "solutions";
  if (/Auto/.test(operationId)) return "auto";
  if (/Education|Course|Tutor/.test(operationId)) return "education";
  if (/Employment|Job/.test(operationId)) return "employment";
  if (/RealEstate/.test(operationId)) return "real-estate";
  return "public";
}

export function publicCacheTags(input: {
  operationId: string;
  marketCode: string | null;
  params: Readonly<Record<string, string>>;
}): string[] {
  const prefix = `shongre-${normalizedTagPart(config.performance.publicCache.cacheKeyVersion)}`;
  const domain = cacheDomain(input.operationId);
  const market = input.marketCode
    ? `${prefix}-market-${normalizedTagPart(input.marketCode)}`
    : `${prefix}-platform`;
  const tags = new Set([`${prefix}-${domain}`, market]);
  for (const [name, value] of Object.entries(input.params)) {
    if (value) {
      tags.add(
        `${prefix}-${domain}-${normalizedTagPart(name)}-${normalizedTagPart(value)}`,
      );
    }
  }
  return [...tags];
}

export function cacheInvalidationTags(input: {
  method: string;
  operationId: string;
  marketCode: string | null;
  params: Readonly<Record<string, string>>;
}): string[] {
  if (["GET", "HEAD", "OPTIONS"].includes(input.method)) return [];
  if (
    /(Search|Simulate|Preview|Validate|Detect|Calculate|Quote|Test|Parse|Check|Explain|Lookup)/.test(
      input.operationId,
    )
  ) {
    return [];
  }
  const domain = cacheDomain(input.operationId);
  if (domain === "public") return [];
  return publicCacheTags(input);
}

function mergeVary(res: ServerResponse, names: readonly string[]): void {
  const current = String(res.getHeader("Vary") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  res.setHeader("Vary", [...new Set([...current, ...names])].join(", "));
}

function cacheControl(profile: PublicCacheProfileName): string {
  const cache = config.performance.publicCache.profiles[profile];
  return [
    "public",
    `max-age=${cache.browserMaxAgeSeconds}`,
    `s-maxage=${cache.sharedMaxAgeSeconds}`,
    `stale-while-revalidate=${cache.staleWhileRevalidateSeconds}`,
    `stale-if-error=${cache.staleIfErrorSeconds}`,
  ].join(", ");
}

function requestHasCredentials(req: IncomingMessage): boolean {
  return Boolean(req.headers.authorization || req.headers.cookie);
}

function requestMatchesEtag(req: IncomingMessage, etag: string): boolean {
  const candidate = String(req.headers["if-none-match"] || "");
  return candidate
    .split(",")
    .map((value) => value.trim())
    .some((value) => value === "*" || value === etag);
}

export async function writeJsonResponse(input: {
  req: IncomingMessage;
  res: ServerResponse;
  method: string;
  operationId: string;
  accessKind: PublicResponsePolicyInput["accessKind"];
  statusCode: number;
  marketCode: string | null;
  params: Readonly<Record<string, string>>;
  result: unknown;
}): Promise<void> {
  const payload = JSON.stringify(input.result ?? null);
  const acceptsGzip = String(input.req.headers["accept-encoding"] || "")
    .split(",")
    .some((value) => value.trim().split(";")[0] === "gzip");
  const encodedPayload: string | Buffer =
    acceptsGzip &&
    Buffer.byteLength(payload) >= config.performance.compressionMinimumBytes
      ? await gzipAsync(payload)
      : payload;
  const profile = resolvePublicResponseProfile({
    method: input.method,
    operationId: input.operationId,
    accessKind: input.accessKind,
    hasCredentials: requestHasCredentials(input.req),
  });

  input.res.setHeader("Content-Type", "application/json");
  input.res.setHeader("Content-Length", Buffer.byteLength(encodedPayload));
  if (Buffer.isBuffer(encodedPayload))
    input.res.setHeader("Content-Encoding", "gzip");
  mergeVary(input.res, ["Accept-Encoding"]);
  if (!profile || input.statusCode < 200 || input.statusCode >= 300) {
    input.res.setHeader("Cache-Control", "private, no-store, max-age=0");
    input.res.writeHead(input.statusCode);
    input.res.end(encodedPayload);
    return;
  }

  const etag = `"${createHash("sha256").update(encodedPayload).digest("base64url")}"`;
  const policy = cacheControl(profile);
  input.res.setHeader("Cache-Control", policy);
  input.res.setHeader("CDN-Cache-Control", policy);
  input.res.setHeader("ETag", etag);
  input.res.setHeader("Cache-Tag", publicCacheTags(input).join(","));
  input.res.setHeader(
    "X-Shongre-Cache-Key-Version",
    config.performance.publicCache.cacheKeyVersion,
  );
  mergeVary(input.res, ["Origin", "X-Shongre-Market", "Accept-Language"]);

  if (requestMatchesEtag(input.req, etag)) {
    input.res.writeHead(304);
    input.res.end();
    return;
  }
  input.res.writeHead(input.statusCode);
  input.res.end(encodedPayload);
}
