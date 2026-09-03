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
  if (
    (relative.startsWith("mobile/") || /\.native\.tsx$/.test(relative)) &&
    /(?:fontSize|lineHeight|padding(?:Horizontal|Vertical)?|margin(?:Horizontal|Vertical)?|gap|borderRadius):\s*(?!0\b)\d+/g.test(
      contents,
    )
  ) {
    failures.push(
      `${relative}: raw native visual metric; use the native token adapter`,
    );
  }
  if (
    (relative.startsWith("frontend/") || relative.startsWith("mobile/")) &&
    /from\s+['"][^'"]*backend\//.test(contents)
  ) {
    failures.push(`${relative}: application imports backend implementation`);
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
