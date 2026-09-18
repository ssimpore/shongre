import { createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { promisify } from "node:util";
import { gzip } from "node:zlib";
import type { PublicCacheProfileName } from "@shongre/contracts/performance";
import { config } from "../../app/config/index.js";

const PUBLIC_RESPONSE_PROFILES = {
  getSolutions: "catalog",
  getSolutionBySlug: "catalog",
  getBusinessRulesCatalog: "catalog",
  getCurrencyCatalog: "reference",
  getMarkets: "reference",
  getMarketsByCode: "reference",
  getMarketsActive: "reference",
  getMarketsEffectiveByCode: "reference",
} as const satisfies Readonly<Record<string, PublicCacheProfileName>>;

/**
 * Public taxonomy projections. They are the largest anonymous reads and move
 * only when an editor publishes, yet the purge adapter that would evict a
 * superseded revision from a shared cache is not evidenced, so no shared cache
 * may hold them. A reader's own cache may: every request still reaches the
 * origin, which compares the validator and answers 304 while the published
 * revision has not moved, so a returning browser downloads nothing twice and
 * never sees a revision older than the current one.
 */
const PUBLIC_REVALIDATE_ONLY_OPERATIONS: ReadonlySet<string> = new Set([
  "getTaxonomyRoot",
  "getTaxonomyNodesById",
  "getTaxonomySearchFilters",
  "getTaxonomyHeaderNavigation",
  "getTaxonomyV1Tree",
  "getTaxonomyV1Options",
  "resolveTaxonomyV1PublicationSchema",
]);

const gzipAsync = promisify(gzip);

export interface PublicResponsePolicyInput {
  method: string;
  operationId: string;
  accessKind: "public" | "authenticated" | "permission";
  hasCredentials: boolean;
}

export type PublicResponseCachePolicy =
  { kind: "shared"; profile: PublicCacheProfileName } | { kind: "revalidate" };

function isAnonymousPublicRead(input: PublicResponsePolicyInput): boolean {
  return (
    input.method === "GET" &&
    input.accessKind === "public" &&
    !input.hasCredentials
  );
}

/** The shared-cache registry: which anonymous reads a CDN may hold, and how long. */
export function resolvePublicResponseProfile(
  input: PublicResponsePolicyInput,
): PublicCacheProfileName | null {
  if (
    !isAnonymousPublicRead(input) ||
    // The existing invalidation adapter only emits tags. Until purge delivery is
    // acknowledged, taxonomy-derived responses must not serve stale revisions.
    /Taxonomy|Listing|Home|Trending|Auto|Employment|RealEstate|Education|Course|Tutor/.test(
      input.operationId,
    )
  ) {
    return null;
  }
  return (
    PUBLIC_RESPONSE_PROFILES[
      input.operationId as keyof typeof PUBLIC_RESPONSE_PROFILES
    ] || null
  );
}

/**
 * Everything a response may tell caches about itself: a shared profile, a
 * private validator-only policy, or nothing — in which case it is not stored
 * anywhere.
 */
export function resolvePublicResponseCachePolicy(
  input: PublicResponsePolicyInput,
): PublicResponseCachePolicy | null {
  if (!isAnonymousPublicRead(input)) return null;
  if (PUBLIC_REVALIDATE_ONLY_OPERATIONS.has(input.operationId))
    return { kind: "revalidate" };
  const profile = resolvePublicResponseProfile(input);
  return profile ? { kind: "shared", profile } : null;
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
  if (domain === "taxonomy")
    return [
      ...new Set(
        [
          "taxonomy",
          "discovery",
          "auto",
          "employment",
          "real-estate",
          "education",
        ].flatMap((dependency) => [
          `shongre-${normalizedTagPart(config.performance.publicCache.cacheKeyVersion)}-${dependency}`,
        ]),
      ),
    ];
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

function entityTagPayload(operationId: string, result: unknown): string {
  if (
    operationId === "getListingsSearch" &&
    result &&
    typeof result === "object" &&
    !Array.isArray(result)
  ) {
    const {
      requestId: _requestId,
      snapshotAt: _snapshotAt,
      pageInfo,
      ...stableResult
    } = result as Record<string, unknown>;
    const stablePageInfo =
      pageInfo && typeof pageInfo === "object" && !Array.isArray(pageInfo)
        ? {
            hasNextPage: Boolean(
              (pageInfo as Record<string, unknown>).hasNextPage,
            ),
          }
        : pageInfo;
    return JSON.stringify({ ...stableResult, pageInfo: stablePageInfo });
  }
  return JSON.stringify(result ?? null);
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
  const policy = resolvePublicResponseCachePolicy({
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
  if (!policy || input.statusCode < 200 || input.statusCode >= 300) {
    input.res.setHeader("Cache-Control", "private, no-store, max-age=0");
    input.res.writeHead(input.statusCode);
    input.res.end(encodedPayload);
    return;
  }

  const etag = `"${createHash("sha256")
    .update(Buffer.isBuffer(encodedPayload) ? "gzip:" : "identity:")
    .update(entityTagPayload(input.operationId, input.result))
    .digest("base64url")}"`;
  input.res.setHeader("ETag", etag);
  mergeVary(input.res, ["Origin", "X-Shongre-Market", "Accept-Language"]);
  if (policy.kind === "shared") {
    const sharedPolicy = cacheControl(policy.profile);
    input.res.setHeader("Cache-Control", sharedPolicy);
    input.res.setHeader("CDN-Cache-Control", sharedPolicy);
    input.res.setHeader("Cache-Tag", publicCacheTags(input).join(","));
    input.res.setHeader(
      "X-Shongre-Cache-Key-Version",
      config.performance.publicCache.cacheKeyVersion,
    );
  } else {
    input.res.setHeader("Cache-Control", "private, no-cache");
    input.res.setHeader("CDN-Cache-Control", "no-store");
  }

  if (requestMatchesEtag(input.req, etag)) {
    input.res.writeHead(304);
    input.res.end();
    return;
  }
  input.res.writeHead(input.statusCode);
  input.res.end(encodedPayload);
}
