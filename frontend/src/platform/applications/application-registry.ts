import type { AppEnvironment } from "@shongre/contracts/environment";

export const SHONGRE_APPLICATION_IDS = [
  "marketplace",
  "solutions",
  "prospects",
  "facturation",
] as const;

export type ShongreApplicationId = (typeof SHONGRE_APPLICATION_IDS)[number];

export interface ShongreApplicationRuntime {
  applicationId: ShongreApplicationId;
  origin: string;
  fallbackPath: string;
}

export type ShongreApplicationRegistry = Record<
  ShongreApplicationId,
  ShongreApplicationRuntime
>;

export interface ApplicationOriginInput {
  marketplace?: string;
  solutions?: string;
  prospects?: string;
  facturation?: string;
}

export interface ApplicationFallbackRoute {
  applicationId: Exclude<ShongreApplicationId, "marketplace">;
  applicationPath: string;
  routingBasePath: string;
}

const FALLBACK_PATHS: Record<ShongreApplicationId, string> = {
  marketplace: "/",
  solutions: "/solutions",
  prospects: "/prospects",
  facturation: "/facturation",
};

function normalizeOrigin(value: string, label: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`[Application Config] ${label} must be an absolute URL.`);
  }
  if (
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    (parsed.pathname !== "/" && parsed.pathname !== "")
  ) {
    throw new Error(
      `[Application Config] ${label} must contain an origin only.`,
    );
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`[Application Config] ${label} must use HTTP or HTTPS.`);
  }
  return parsed.origin;
}

export function createApplicationRegistry(input: {
  environment: AppEnvironment;
  marketplaceOrigin: string;
  origins?: ApplicationOriginInput;
}): ShongreApplicationRegistry {
  const isLive = input.environment === "production";
  const marketplaceOrigin = normalizeOrigin(
    input.origins?.marketplace || input.marketplaceOrigin,
    "SHONGRE_MARKETPLACE_ORIGIN",
  );
  if (isLive) {
    const missingOrigins = SHONGRE_APPLICATION_IDS.filter(
      (applicationId) =>
        applicationId !== "marketplace" && !input.origins?.[applicationId],
    );
    if (missingOrigins.length > 0) {
      throw new Error(
        `[Application Config] Production requires explicit origins for: ${missingOrigins.join(", ")}.`,
      );
    }
  }
  const values: Record<ShongreApplicationId, string> = {
    marketplace: input.origins?.marketplace || marketplaceOrigin,
    solutions: input.origins?.solutions || marketplaceOrigin,
    prospects: input.origins?.prospects || marketplaceOrigin,
    facturation: input.origins?.facturation || marketplaceOrigin,
  };

  const registry = Object.fromEntries(
    SHONGRE_APPLICATION_IDS.map((applicationId) => {
      const origin = normalizeOrigin(
        values[applicationId],
        `SHONGRE_${applicationId.toUpperCase()}_ORIGIN`,
      );
      if (isLive && new URL(origin).protocol !== "https:") {
        throw new Error(
          `[Application Config] ${applicationId} must use HTTPS in production.`,
        );
      }
      return [
        applicationId,
        { applicationId, origin, fallbackPath: FALLBACK_PATHS[applicationId] },
      ];
    }),
  ) as ShongreApplicationRegistry;

  if (isLive) {
    const hosts = SHONGRE_APPLICATION_IDS.map(
      (applicationId) => new URL(registry[applicationId].origin).host,
    );
    if (new Set(hosts).size !== hosts.length) {
      throw new Error(
        "[Application Config] Production application origins must use distinct hosts.",
      );
    }
  }
  return registry;
}

export function normalizeApplicationHostname(hostname: string): string {
  const first = hostname.split(",", 1)[0]?.trim().toLowerCase() || "";
  if (first.startsWith("[")) {
    const end = first.indexOf("]");
    return end >= 0 ? first.slice(1, end) : first;
  }
  return first.replace(/:\d+$/, "").replace(/\.$/, "");
}

export function applicationIdForHostname(
  hostname: string,
  registry: ShongreApplicationRegistry,
): ShongreApplicationId | null {
  const normalized = normalizeApplicationHostname(hostname);
  if (!normalized) return null;
  const matches = SHONGRE_APPLICATION_IDS.filter(
    (applicationId) =>
      normalizeApplicationHostname(
        new URL(registry[applicationId].origin).host,
      ) === normalized,
  );
  return matches.length === 1 ? matches[0] : null;
}

function normalizeTargetPath(pathname: string): string {
  const raw = pathname.trim() || "/";
  const clean = raw.startsWith("#") || raw.startsWith("?") ? `/${raw}` : raw;
  if (!clean.startsWith("/") || clean.startsWith("//")) {
    throw new Error("[Application Routing] Destination must be a local path.");
  }
  const parsed = new URL(clean, "https://routing.shongre.invalid");
  if (parsed.origin !== "https://routing.shongre.invalid") {
    throw new Error("[Application Routing] Cross-origin paths are forbidden.");
  }
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

/**
 * Resolves the path prefixes used when split applications intentionally share
 * the marketplace origin (local, test, and selected preview environments).
 * Production's distinct origins therefore never turn marketplace paths into
 * aliases for a separate application.
 */
export function applicationFallbackForPath(
  registry: ShongreApplicationRegistry,
  pathname: string,
): ApplicationFallbackRoute | null {
  const normalizedPathname =
    new URL(
      normalizeTargetPath(pathname),
      "https://routing.shongre.invalid",
    ).pathname.replace(/\/+$/, "") || "/";
  const marketplaceOrigin = registry.marketplace.origin;

  if (
    registry.prospects.origin === marketplaceOrigin &&
    (normalizedPathname === "/app" || normalizedPathname.startsWith("/app/"))
  ) {
    return {
      applicationId: "prospects",
      applicationPath: normalizedPathname,
      routingBasePath: "/",
    };
  }

  for (const applicationId of SHONGRE_APPLICATION_IDS) {
    // The local Prospects product page remains a marketplace route because its
    // workspace intentionally lives at the separate top-level `/app` prefix.
    if (applicationId === "marketplace" || applicationId === "prospects") {
      continue;
    }
    const application = registry[applicationId];
    if (application.origin !== marketplaceOrigin) continue;
    const prefix = application.fallbackPath;
    if (
      normalizedPathname !== prefix &&
      !normalizedPathname.startsWith(`${prefix}/`)
    ) {
      continue;
    }
    return {
      applicationId,
      applicationPath: normalizedPathname.slice(prefix.length) || "/",
      routingBasePath: prefix,
    };
  }
  return null;
}

/**
 * Resolves only registered application identifiers. Catalog content never owns
 * hostnames, so an admin value cannot turn a launch action into an open redirect.
 */
export function resolveApplicationHref(
  registry: ShongreApplicationRegistry,
  applicationId: ShongreApplicationId,
  pathname = "/",
): string {
  const target = registry[applicationId];
  const normalizedPath = normalizeTargetPath(pathname);
  const parsedPath = new URL(normalizedPath, "https://routing.shongre.invalid");
  const prefix = target.fallbackPath;
  if (
    applicationId !== "marketplace" &&
    (parsedPath.pathname === prefix ||
      parsedPath.pathname.startsWith(`${prefix}/`))
  ) {
    parsedPath.pathname = parsedPath.pathname.slice(prefix.length) || "/";
  }
  const path = `${parsedPath.pathname}${parsedPath.search}${parsedPath.hash}`;
  const marketplaceOrigin = registry.marketplace.origin;

  if (target.origin !== marketplaceOrigin) {
    return new URL(path, `${target.origin}/`).toString();
  }

  if (applicationId === "marketplace") return path;
  if (applicationId === "prospects" && path.startsWith("/app")) return path;
  const localTarget = new URL(path, "https://routing.shongre.invalid");
  const suffix =
    localTarget.pathname === "/"
      ? `${localTarget.search}${localTarget.hash}`
      : path;
  return `${target.fallbackPath}${suffix}`;
}
