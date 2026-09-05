import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildDiscoveryRobotsRules,
  DISCOVERY_CRAWLERS,
  parseModelTrainingCrawlerPolicy,
  PRIVATE_CRAWL_PATHS,
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
  [
    "src/features/profile/components/ProBusinessInfo.tsx",
    'rel="ugc nofollow noopener noreferrer"',
  ],
] as const;
for (const [path, marker] of requiredIntegrations) {
  if (!read(path).includes(marker)) {
    errors.push(`${path} does not consume ${marker}.`);
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
  `SEO governance PASS (${Object.keys(DISCOVERY_CRAWLERS).length} crawlers, ${PRIVATE_CRAWL_PATHS.length} private path guards).`,
);
