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

const LIVE_ORIGINS: Record<ShongreApplicationId, string> = {
  marketplace: "https://shongre.fr",
  solutions: "https://solutions.shongre.fr",
  prospects: "https://prospects.shongre.fr",
  facturation: "https://facturation.shongre.fr",
};

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
  const values: Record<ShongreApplicationId, string> = isLive
    ? {
        marketplace: input.origins?.marketplace || marketplaceOrigin,
        solutions: input.origins?.solutions || LIVE_ORIGINS.solutions,
        prospects: input.origins?.prospects || LIVE_ORIGINS.prospects,
        facturation: input.origins?.facturation || LIVE_ORIGINS.facturation,
      }
    : {
        marketplace: marketplaceOrigin,
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
  const clean = pathname.trim() || "/";
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
 * Resolves only registered application identifiers. Catalog content never owns
 * hostnames, so an admin value cannot turn a launch action into an open redirect.
 */
export function resolveApplicationHref(
  registry: ShongreApplicationRegistry,
  applicationId: ShongreApplicationId,
  pathname = "/",
): string {
  const target = registry[applicationId];
  const path = normalizeTargetPath(pathname);
  const marketplaceOrigin = registry.marketplace.origin;

  if (target.origin !== marketplaceOrigin) {
    return new URL(path, `${target.origin}/`).toString();
  }

  if (applicationId === "marketplace") return path;
  if (applicationId === "prospects" && path.startsWith("/app")) return path;
  const suffix = path === "/" ? "" : path;
  return `${target.fallbackPath}${suffix}`;
}

