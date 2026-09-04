#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const officialSvgPaletteFiles = new Set([
  "frontend/src/app/layouts/Footer.tsx",
  "frontend/src/design-system/primitives/CountryFlag.tsx",
  "frontend/src/features/auth/components/SocialLoginButtons.tsx",
]);
const canonicalVerifiedIconFiles = new Set([
  "packages/ui/src/identity/VerifiedIcon.web.tsx",
  "packages/ui/src/identity/VerifiedIcon.native.tsx",
]);
const canonicalIdentityMarkerFiles = new Set([
  ...canonicalVerifiedIconFiles,
  "packages/ui/src/identity/VerificationBadge.web.tsx",
  "packages/ui/src/identity/ProBadge.web.tsx",
]);
const canonicalIdentityComponentPattern =
  /<(?:VerifiedIcon|VerificationBadge|ProBadge)\b[^>]*(?:className|style)\s*=/s;
const genericIdentityBadgePattern =
  /<Badge\b(?:(?!<\/Badge>)[\s\S]){0,500}(?:ui\.identityStatus\.|(?:Vérifi(?:é|ée)|Verified|Professionnel vérifié|Verified professional))(?:(?!<\/Badge>)[\s\S]){0,500}<\/Badge>/i;
const inlineProBadgePattern =
  /<(?:span|div|Badge)\b[^>]*(?:badge|rounded)[^>]*>\s*(?:PRO|Pro)\s*<\/(?:span|div|Badge)>/s;
const inlineIdentitySvgPattern =
  /<svg\b(?:(?!<\/svg>)[\s\S]){0,1200}(?:ui\.identityStatus\.|(?:profil|identit[ée]|professionnel|seller|profile)[ -](?:vérifi[ée]|verified))(?:(?!<\/svg>)[\s\S]){0,1200}<\/svg>/i;

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries
      .filter(
        (entry) => entry.name !== "node_modules" && entry.name !== ".next",
      )
      .map(async (entry) => {
        const target = path.join(directory, entry.name);
        return entry.isDirectory() ? filesUnder(target) : [target];
      }),
  );
  return nested.flat();
}

const sourceFiles = (
  await Promise.all([
    filesUnder(path.join(root, "frontend/app")),
    filesUnder(path.join(root, "frontend/src")),
    filesUnder(path.join(root, "mobile/app")),
    filesUnder(path.join(root, "mobile/src")),
    filesUnder(path.join(root, "packages/ui/src")),
    filesUnder(path.join(root, "packages/features/src")),
  ])
)
  .flat()
  .filter(
    (file) => /\.(?:ts|tsx)$/.test(file) && !/\.(?:test|spec)\./.test(file),
  );

for (const file of sourceFiles) {
  const relative = path.relative(root, file);
  const contents = await readFile(file, "utf8");
  // Third-party and national marks must retain their official palette. Keep
  // this allowlist narrow so feature UI cannot bypass the shared design-token
  // boundary.
  const allowsOfficialSvgPalette = officialSvgPaletteFiles.has(relative);
  if (!allowsOfficialSvgPalette && /#[\da-f]{3,8}\b/i.test(contents)) {
    failures.push(
      `${relative}: raw hexadecimal colour; use @shongre/design-tokens`,
    );
  }
  const isNative =
    relative.startsWith("mobile/") || /\.native\.tsx$/.test(relative);
  const rawNativeMetric =
    /\b(?:fontSize|lineHeight|letterSpacing|padding|paddingHorizontal|paddingVertical|paddingTop|paddingRight|paddingBottom|paddingLeft|margin|marginHorizontal|marginVertical|marginTop|marginRight|marginBottom|marginLeft|gap|rowGap|columnGap|borderRadius|borderTopLeftRadius|borderTopRightRadius|borderBottomLeftRadius|borderBottomRightRadius|borderWidth|borderTopWidth|borderRightWidth|borderBottomWidth|borderLeftWidth|width|height|minWidth|minHeight|maxWidth|maxHeight|top|right|bottom|left|shadowRadius|elevation|opacity|aspectRatio)\s*:\s*(?:-?\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)?|["']-?\d+(?:\.\d+)?%["'])/g;
  const rawNativeVisualProp =
    /\b(?:size|strokeWidth)\s*=\s*\{\s*-?\d+(?:\.\d+)?\s*\}/g;
  const rawNativeMatches = isNative
    ? [
        ...contents.matchAll(rawNativeMetric),
        ...contents.matchAll(rawNativeVisualProp),
      ].map((match) => match[0])
    : [];
  if (rawNativeMatches.length > 0) {
    failures.push(
      `${relative}: raw native visual metric (${rawNativeMatches.slice(0, 3).join(", ")}); use the native token adapter`,
    );
  }
  if (
    (relative.startsWith("frontend/") || relative.startsWith("mobile/")) &&
    /from\s+['"][^'"]*backend\//.test(contents)
  ) {
    failures.push(`${relative}: application imports backend implementation`);
  }

  if (
    /<Badge\b[^>]*\bvariant\s*=\s*(?:\{\s*)?["'](?:pro|verified)["']/s.test(
      contents,
    ) ||
    /<Badge\b[^>]*\bvariant\s*=\s*\{[^}]*["'](?:pro|verified)["']/s.test(
      contents,
    )
  ) {
    failures.push(
      `${relative}: identity status rendered through generic Badge; use ProBadge or VerificationBadge`,
    );
  }
  if (
    !canonicalVerifiedIconFiles.has(relative) &&
    /\bBadgeCheck\b/.test(contents)
  ) {
    failures.push(
      `${relative}: direct BadgeCheck usage; use the canonical VerifiedIcon or a semantically different icon`,
    );
  }
  if (
    !canonicalIdentityMarkerFiles.has(relative) &&
    /data-ui-(?:verified-icon|verification-badge|pro-badge)/.test(contents)
  ) {
    failures.push(
      `${relative}: copied canonical identity-status marker; render the @shongre/ui component`,
    );
  }
  if (
    /\b(?:listing-card-pro-badge|data-listing-card-seller-verified|data-account-verified-icon)\b/.test(
      contents,
    )
  ) {
    failures.push(
      `${relative}: obsolete local identity-status selector; use the canonical shared component marker`,
    );
  }
  if (
    !relative.startsWith("packages/ui/src/identity/") &&
    /(?:function|const)\s+(?:Verified|Verification|Pro)\w*(?:Icon|Badge)\b/.test(
      contents,
    )
  ) {
    failures.push(
      `${relative}: local identity-status component; use @shongre/ui`,
    );
  }
  if (canonicalIdentityComponentPattern.test(contents)) {
    failures.push(
      `${relative}: local style override on a canonical identity-status component`,
    );
  }
  if (
    !relative.startsWith("packages/ui/src/identity/") &&
    genericIdentityBadgePattern.test(contents)
  ) {
    failures.push(
      `${relative}: identity-status label rendered through generic Badge`,
    );
  }
  if (
    !relative.startsWith("packages/ui/src/identity/") &&
    inlineProBadgePattern.test(contents)
  ) {
    failures.push(
      `${relative}: inline professional-account badge; use the canonical ProBadge`,
    );
  }
  if (
    !canonicalVerifiedIconFiles.has(relative) &&
    inlineIdentitySvgPattern.test(contents)
  ) {
    failures.push(
      `${relative}: inline verification SVG; use the canonical VerifiedIcon`,
    );
  }
  if (/\brenderCharacteristicIcon\b/.test(contents)) {
    failures.push(
      `${relative}: local listing-characteristic icon renderer; put the semantic role on ListingCardView`,
    );
  }
}

const styleFiles = (
  await Promise.all([
    filesUnder(path.join(root, "frontend/app")),
    filesUnder(path.join(root, "frontend/src")),
    filesUnder(path.join(root, "mobile/app")),
    filesUnder(path.join(root, "mobile/src")),
    filesUnder(path.join(root, "packages/ui/src")),
    filesUnder(path.join(root, "packages/features/src")),
  ])
)
  .flat()
  .filter((file) => /\.(?:css|scss|sass|less)$/.test(file));
for (const file of styleFiles) {
  const relative = path.relative(root, file);
  const contents = await readFile(file, "utf8");
  if (
    /\[data-ui-(?:verified-icon|verification-badge|pro-badge)(?:=|\])/i.test(
      contents,
    )
  ) {
    failures.push(
      `${relative}: CSS targets a canonical identity-status component; use its typed props`,
    );
  }
}

const obsoleteTokenFiles = [
  "frontend/src/design-system/tokens/theme.ts",
  "frontend/src/design-system/tokens/colors.ts",
  "frontend/src/design-system/tokens/typography.ts",
  "frontend/src/design-system/tokens/spacing.ts",
  "mobile/src/design-system/tokens.ts",
];
for (const relative of obsoleteTokenFiles) {
  try {
    await readFile(path.join(root, relative));
    failures.push(`${relative}: obsolete local design-token source exists`);
  } catch {
    /* expected */
  }
}

const packageNames = [
  "design-tokens",
  "contracts",
  "brand",
  "shared",
  "ui",
  "features",
];
const manifests = new Map();
for (const name of packageNames) {
  const manifest = JSON.parse(
    await readFile(path.join(root, "packages", name, "package.json"), "utf8"),
  );
  manifests.set(manifest.name, {
    name,
    dependencies: { ...manifest.dependencies, ...manifest.peerDependencies },
  });
}
const allowed = new Map([
  ["@shongre/design-tokens", new Set()],
  ["@shongre/contracts", new Set()],
  ["@shongre/brand", new Set(["@shongre/design-tokens"])],
  ["@shongre/shared", new Set(["@shongre/contracts"])],
  ["@shongre/ui", new Set(["@shongre/design-tokens"])],
  [
    "@shongre/features",
    new Set([
      "@shongre/contracts",
      "@shongre/design-tokens",
      "@shongre/shared",
      "@shongre/ui",
    ]),
  ],
]);
for (const [packageName, details] of manifests) {
  for (const dependency of Object.keys(details.dependencies).filter((name) =>
    name.startsWith("@shongre/"),
  )) {
    if (!allowed.get(packageName)?.has(dependency))
      failures.push(`${packageName}: forbidden dependency on ${dependency}`);
  }
}

const requiredConsumption = new Map([
  ["frontend/src/index.css", "@shongre/design-tokens/tokens.css"],
  ["frontend/src/design-system/primitives/Button.tsx", "@shongre/ui/web"],
  [
    "frontend/src/design-system/primitives/ListingCard.tsx",
    "@shongre/features/listings/web",
  ],
  ["mobile/app/(tabs)/_layout.tsx", "@shongre/ui/native"],
  ["mobile/app/(tabs)/index.tsx", "@shongre/design-tokens/native"],
  [
    "mobile/src/components/ListingCard.tsx",
    "@shongre/features/listings/native",
  ],
]);
for (const [relative, expected] of requiredConsumption) {
  const contents = await readFile(path.join(root, relative), "utf8");
  if (!contents.includes(expected))
    failures.push(`${relative}: must consume ${expected}`);
}

if (failures.length) {
  process.stderr.write(
    `Cross-platform UI boundary check failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}\n`,
  );
  process.exit(1);
}
process.stdout.write(
  `Cross-platform UI boundary check passed (${sourceFiles.length} source files audited).\n`,
);
