import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import {
  buildDiscoveryRobotsRules,
  DISCOVERY_CRAWLERS,
  parseModelTrainingCrawlerPolicy,
  PRIVATE_CRAWL_PATHS,
  validIndexNowKey,
  validWebmasterVerificationToken,
} from "../src/platform/seo/discovery-governance";
import { DISCOVERY_PUBLIC_PATHS } from "../src/platform/seo/discovery-structured-data";

const frontendRoot = resolve(import.meta.dirname, "..");
const read = (path: string) =>
  readFileSync(resolve(frontendRoot, path), "utf8");

const errors: string[] = [];
const productionRules = buildDiscoveryRobotsRules({
  production: true,
  trainingPolicy: parseModelTrainingCrawlerPolicy(
    process.env.SEO_GPTBOT_TRAINING_POLICY,
  ),
});
validWebmasterVerificationToken(process.env.SEO_GOOGLE_SITE_VERIFICATION);
validWebmasterVerificationToken(process.env.SEO_BING_SITE_VERIFICATION);
validIndexNowKey(process.env.INDEXNOW_KEY);

const hasAgent = (agent: string) =>
  productionRules.some(({ userAgent }) =>
    Array.isArray(userAgent) ? userAgent.includes(agent) : userAgent === agent,
  );

for (const crawler of Object.values(DISCOVERY_CRAWLERS)) {
  if (!hasAgent(crawler.userAgent)) {
    errors.push(`Missing crawler policy for ${crawler.userAgent}.`);
  }
}
const wildcard = productionRules.find(({ userAgent }) => userAgent === "*");
for (const path of PRIVATE_CRAWL_PATHS) {
  if (!Array.isArray(wildcard?.disallow) || !wildcard.disallow.includes(path)) {
    errors.push(`Wildcard crawler policy does not block ${path}.`);
  }
}

const policySource = read("src/platform/seo/seo-policy.ts");
for (const [key, path] of Object.entries(DISCOVERY_PUBLIC_PATHS)) {
  if (
    !policySource.includes(`DISCOVERY_PUBLIC_PATHS.${key}`) &&
    !policySource.includes(`"${path}"`)
  ) {
    errors.push(`Public discovery path ${path} is absent from the SEO policy.`);
  }
}

const requiredIntegrations = [
  ["app/robots.ts", "buildDiscoveryRobotsRules"],
  ["app/llms.txt/route.ts", "renderDiscoveryManifest"],
  ["src/analytics/attribution.ts", "discovery-referrers"],
  ["src/app/router/index.tsx", 'path: "a-propos"'],
] as const;
for (const [path, marker] of requiredIntegrations) {
  if (!read(path).includes(marker)) {
    errors.push(`${path} does not consume ${marker}.`);
  }
}

/*
 * User-supplied outbound links must be `ugc nofollow`.
 *
 * This used to be checked by requiring one named component to contain the
 * string — a component nothing rendered, which made the guarantee vacuous while
 * a new surface could ship an unmarked seller website link and pass. The rule is
 * about every anchor whose destination comes from user-supplied data, so that is
 * what is scanned: any `<a>` whose `href` is an expression naming a
 * user-controlled URL field.
 */
const USER_SUPPLIED_HREF =
  /<a\b[^>]*\bhref=\{[^}]*\b(websiteUrl|externalUrl|profileUrl|socialUrl|sourceUrl|authorUrl|companyUrl|listingUrl|userUrl|submittedUrl)\b[^}]*\}[\s\S]*?>/g;

function walkSources(directory: string, files: string[] = []): string[] {
  for (const entry of readdirSync(resolve(frontendRoot, directory))) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const path = join(directory, entry);
    if (statSync(resolve(frontendRoot, path)).isDirectory()) {
      walkSources(path, files);
    } else if (/\.tsx$/.test(entry) && !/\.(test|spec)\.tsx$/.test(entry)) {
      files.push(path);
    }
  }
  return files;
}

let scannedOutboundLinks = 0;
for (const path of walkSources("src")) {
  const source = read(path);
  for (const match of source.matchAll(USER_SUPPLIED_HREF)) {
    scannedOutboundLinks += 1;
    const anchor = match[0];
    const rel = /\brel=["']([^"']*)["']/.exec(anchor)?.[1] ?? "";
    const tokens = new Set(rel.split(/\s+/).filter(Boolean));
    const missing = ["ugc", "nofollow", "noopener", "noreferrer"].filter(
      (token) => !tokens.has(token),
    );
    if (missing.length) {
      errors.push(
        `${relative(".", path)} renders a user-supplied outbound link without rel="${missing.join(" ")}".`,
      );
    }
  }
}

const unmanagedMetadataPatterns = [
  ["document title", /document\.title\s*=/g],
  ["canonical link", /rel=["']canonical["']/g],
] as const;
const metadataAllowlist = new Set([
  "src/services/seo.service.ts",
  "scripts/seo-audit.mjs",
]);
const sourceFiles = [
  "src/app/router/index.tsx",
  "src/features/home/HomePage.tsx",
  "src/features/legal/LegalPages.tsx",
  "src/features/support/ContactPage.tsx",
  "src/features/support/HelpCenterPage.tsx",
];
for (const path of sourceFiles) {
  if (metadataAllowlist.has(path)) continue;
  const source = read(path);
  for (const [label, pattern] of unmanagedMetadataPatterns) {
    if (pattern.test(source)) errors.push(`Unmanaged ${label} in ${path}.`);
    pattern.lastIndex = 0;
  }
}

if (errors.length) {
  errors.forEach((error) => console.error(`SEO governance: ${error}`));
  process.exit(1);
}
console.log(
  `SEO governance PASS (${Object.keys(DISCOVERY_CRAWLERS).length} crawlers, ${PRIVATE_CRAWL_PATHS.length} private path guards, ${scannedOutboundLinks} user-supplied outbound links).`,
);
