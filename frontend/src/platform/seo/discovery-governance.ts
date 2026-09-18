import { brand } from "@shongre/brand";
import { COUNTRY_REGISTRY } from "@shongre/contracts/market-country";

export type DiscoveryCrawlerPurpose =
  "search" | "user_retrieval" | "model_training";

export interface DiscoveryCrawlerDefinition {
  readonly userAgent: string;
  readonly purpose: DiscoveryCrawlerPurpose;
  readonly verifiedIpSource?: string;
}

/**
 * Public crawler identifiers are declarations, not authentication. Production
 * edge controls must verify the source against each provider's current,
 * published IP ranges before granting a bot-specific rate-limit exception.
 */
export const DISCOVERY_CRAWLERS = Object.freeze({
  openAiSearch: {
    userAgent: "OAI-SearchBot",
    purpose: "search",
    verifiedIpSource: "https://openai.com/searchbot.json",
  },
  openAiUser: {
    userAgent: "ChatGPT-User",
    purpose: "user_retrieval",
  },
  openAiTraining: {
    userAgent: "GPTBot",
    purpose: "model_training",
    verifiedIpSource: "https://openai.com/gptbot.json",
  },
  perplexitySearch: {
    userAgent: "PerplexityBot",
    purpose: "search",
    verifiedIpSource: "https://www.perplexity.com/perplexitybot.json",
  },
  perplexityUser: {
    userAgent: "Perplexity-User",
    purpose: "user_retrieval",
    verifiedIpSource: "https://www.perplexity.com/perplexity-user.json",
  },
} satisfies Readonly<Record<string, DiscoveryCrawlerDefinition>>);

/**
 * The crawlers served the blocking, head-rendered metadata. Defined in
 * `@shongre/contracts/seo-crawlers` because `next.config.ts` reads it; the
 * governance test keeps every registered discovery crawler inside it.
 */
export { HEAD_METADATA_CRAWLER_PATTERN } from "@shongre/contracts/seo-crawlers";

export type ModelTrainingCrawlerPolicy = "allow" | "deny";

export interface DiscoveryRobotsRule {
  userAgent: string | string[];
  allow?: string | string[];
  disallow?: string | string[];
}

export function parseModelTrainingCrawlerPolicy(
  value: string | undefined,
): ModelTrainingCrawlerPolicy {
  const normalized = (value || "deny").trim().toLowerCase();
  if (normalized !== "allow" && normalized !== "deny") {
    throw new Error(
      `[Web Config] SEO_GPTBOT_TRAINING_POLICY must be "allow" or "deny", received "${value}".`,
    );
  }
  return normalized;
}

const PRIVATE_CRAWL_ROUTE_PREFIXES = Object.freeze([
  "/admin",
  "/api",
  "/auth",
  "/compte",
  "/connexion",
  "/deposer",
  "/favoris",
  "/inscription",
  "/messages",
  "/notifications",
  "/paiement",
  "/verification",
]);

/**
 * Private and transactional paths stay unavailable to every crawler on both
 * canonical hosts. The international host serves several market prefixes, so
 * its robots file must protect `/be/compte` as well as `/compte` without
 * maintaining a second country or URL registry here.
 */
export const PRIVATE_CRAWL_PATHS = Object.freeze(
  Array.from(
    new Set([
      ...PRIVATE_CRAWL_ROUTE_PREFIXES,
      ...COUNTRY_REGISTRY.filter(
        (country) => country.canonicalDomainMode === "international",
      ).flatMap((country) =>
        PRIVATE_CRAWL_ROUTE_PREFIXES.map(
          (pathname) => `/${country.slug}${pathname}`,
        ),
      ),
    ]),
  ).sort(),
);

const SEARCH_AND_RETRIEVAL_AGENTS = Object.values(DISCOVERY_CRAWLERS)
  .filter(({ purpose }) => purpose !== "model_training")
  .map(({ userAgent }) => userAgent);

export function buildDiscoveryRobotsRules(input: {
  production: boolean;
  trainingPolicy?: ModelTrainingCrawlerPolicy;
}): DiscoveryRobotsRule[] {
  if (!input.production) return [{ userAgent: "*", disallow: "/" }];

  const publicRules = {
    allow: "/",
    disallow: [...PRIVATE_CRAWL_PATHS],
  };
  const trainingPolicy = input.trainingPolicy ?? "deny";

  return [
    {
      userAgent: SEARCH_AND_RETRIEVAL_AGENTS,
      ...publicRules,
    },
    {
      userAgent: DISCOVERY_CRAWLERS.openAiTraining.userAgent,
      ...(trainingPolicy === "allow" ? publicRules : { disallow: "/" }),
    },
    { userAgent: "*", ...publicRules },
  ];
}

export function validWebmasterVerificationToken(
  value: string | undefined,
): string | undefined {
  const token = value?.trim();
  if (!token) return undefined;
  if (!/^[A-Za-z0-9._=-]{6,256}$/.test(token)) {
    throw new Error("[Web Config] Invalid webmaster verification token.");
  }
  return token;
}

export function validIndexNowKey(
  value: string | undefined,
): string | undefined {
  const key = value?.trim();
  if (!key) return undefined;
  if (!/^[A-Za-z0-9-]{8,128}$/.test(key)) {
    throw new Error("[Web Config] Invalid INDEXNOW_KEY.");
  }
  return key;
}

export interface DiscoveryManifestLink {
  readonly label: string;
  readonly url: string;
}

export function renderDiscoveryManifest(input: {
  canonicalSite: string;
  sitemap: string;
  links: readonly DiscoveryManifestLink[];
}): string {
  const safeUrl = (value: string) => {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) {
      throw new Error("Discovery manifest URLs must be public HTTP(S) URLs.");
    }
    return url.toString();
  };
  const links = input.links.map(
    ({ label, url }) =>
      `- [${label.replace(/[\[\]\r\n]/g, "")}](${safeUrl(url)})`,
  );
  return [
    `# ${brand.name}`,
    "",
    "> Place de marché locale pour particuliers et professionnels. This file is a concise discovery aid; canonical HTML, robots directives and sitemaps remain authoritative.",
    "",
    `Canonical site: ${safeUrl(input.canonicalSite)}`,
    `Sitemap: ${safeUrl(input.sitemap)}`,
    "",
    "## Public reference pages",
    "",
    ...links,
    "",
    "## Content and access policy",
    "",
    "- Only public, canonical and currently available pages may be cited.",
    "- Prices, availability, locations, dates and seller details must be read from the current canonical page.",
    "- Account, messaging, payment, administration and other private routes are not public sources.",
    "- Search visibility or citation is never guaranteed.",
    "",
  ].join("\n");
}
