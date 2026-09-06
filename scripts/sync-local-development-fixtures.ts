import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { format } from "prettier";
import {
  DEMO_USERS,
  INITIAL_CONVERSATIONS,
  INITIAL_LISTINGS,
  INITIAL_MESSAGES,
  INITIAL_NOTIFICATIONS,
  INITIAL_REVIEWS,
  INITIAL_SAVED_SEARCHES,
  INITIAL_TRANSACTIONS,
} from "../frontend/src/mocks/initialDemoData.ts";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const fixturePath = path.join(
  repositoryRoot,
  "backend/scripts/seed/fixtures/marketplace-demo.json",
);
const mediaManifestPath = path.join(
  repositoryRoot,
  "backend/scripts/seed/fixtures/demo-media.json",
);
const mediaDirectory = path.join(
  repositoryRoot,
  "backend/supabase/seed/assets/demo-media",
);
const fallbackMediaPath = path.join(
  repositoryRoot,
  "frontend/public/images/categories/services.jpg",
);
const sourceDirectories = [
  "frontend/src/mocks",
  "frontend/src/api/adapters/demo",
  "frontend/src/domains/collection",
].map((relativePath) => path.join(repositoryRoot, relativePath));

interface DemoMediaEntry {
  key: string;
  sourceUrl: string;
  fileName: string;
}

function stableJson(value: unknown): Promise<string> {
  return format(JSON.stringify(value), { parser: "json" });
}

function listSourceFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(entryPath);
    return /\.[cm]?[jt]sx?$/.test(entry.name) ? [entryPath] : [];
  });
}

function buildMediaManifest(): DemoMediaEntry[] {
  const photoIds = new Set<string>();
  const urlPattern = /https:\/\/images\.unsplash\.com\/(photo-[^?"'`\s]+)/g;
  for (const filePath of sourceDirectories.flatMap(listSourceFiles)) {
    const source = fs.readFileSync(filePath, "utf8");
    for (const match of source.matchAll(urlPattern)) photoIds.add(match[1]);
  }
  return [...photoIds].sort().map((photoId) => ({
    key: photoId,
    sourceUrl: `https://images.unsplash.com/${photoId}?fm=jpg&fit=crop&w=1200&q=80`,
    fileName: `${photoId}.jpg`,
  }));
}

function buildMarketplaceFixture() {
  return {
    schemaVersion: 1,
    generatedFrom: "frontend/src/mocks/initialDemoData.ts",
    users: Object.values(DEMO_USERS),
    listings: INITIAL_LISTINGS,
    conversations: INITIAL_CONVERSATIONS,
    messages: INITIAL_MESSAGES,
    transactions: INITIAL_TRANSACTIONS,
    notifications: INITIAL_NOTIFICATIONS,
    savedSearches: INITIAL_SAVED_SEARCHES,
    reviews: INITIAL_REVIEWS,
  };
}

function sha256(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

async function downloadMedia(entries: readonly DemoMediaEntry[]) {
  fs.mkdirSync(mediaDirectory, { recursive: true });
  let nextIndex = 0;
  const workers = Array.from({ length: 6 }, async () => {
    while (nextIndex < entries.length) {
      const entry = entries[nextIndex++];
      const destination = path.join(mediaDirectory, entry.fileName);
      if (fs.existsSync(destination) && fs.statSync(destination).size > 1_024)
        continue;
      const response = await fetch(entry.sourceUrl, {
        headers: { "User-Agent": "Shongre local fixture synchronizer" },
      });
      if (!response.ok) {
        fs.copyFileSync(fallbackMediaPath, destination);
        console.warn(
          `Substituted ${entry.fileName} with the local fallback because the source returned HTTP ${response.status}.`,
        );
        continue;
      }
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.startsWith("image/")) {
        throw new Error(
          `Unexpected content type for ${entry.sourceUrl}: ${contentType}`,
        );
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length <= 1_024) {
        throw new Error(
          `Downloaded image is unexpectedly small: ${entry.sourceUrl}`,
        );
      }
      fs.writeFileSync(destination, bytes);
      console.log(
        `Downloaded ${entry.fileName} (${bytes.length} bytes, sha256 ${sha256(bytes).slice(0, 12)})`,
      );
    }
  });
  await Promise.all(workers);
}

function assertCurrent(filePath: string, expected: string) {
  if (
    !fs.existsSync(filePath) ||
    fs.readFileSync(filePath, "utf8") !== expected
  ) {
    throw new Error(
      `${path.relative(repositoryRoot, filePath)} is stale; run npm run local-fixtures:sync`,
    );
  }
}

async function main() {
  const check = process.argv.includes("--check");
  const download = process.argv.includes("--download");
  const fixture = await stableJson(buildMarketplaceFixture());
  const mediaEntries = buildMediaManifest();
  const mediaManifest = await stableJson({
    schemaVersion: 1,
    media: mediaEntries,
  });

  if (check) {
    assertCurrent(fixturePath, fixture);
    assertCurrent(mediaManifestPath, mediaManifest);
    const missing = mediaEntries.filter((entry) => {
      const filePath = path.join(mediaDirectory, entry.fileName);
      return !fs.existsSync(filePath) || fs.statSync(filePath).size <= 1_024;
    });
    if (missing.length) {
      throw new Error(
        `${missing.length} local demo media asset(s) are missing; run npm run local-fixtures:sync`,
      );
    }
    console.log(
      `Local fixture snapshot is current: ${INITIAL_LISTINGS.length} listings, ${Object.keys(DEMO_USERS).length} profiles, ${mediaEntries.length} media assets.`,
    );
    return;
  }

  fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
  fs.writeFileSync(fixturePath, fixture);
  fs.writeFileSync(mediaManifestPath, mediaManifest);
  if (download) await downloadMedia(mediaEntries);
  console.log(
    `Synchronized local fixture snapshot: ${INITIAL_LISTINGS.length} listings, ${Object.keys(DEMO_USERS).length} profiles, ${mediaEntries.length} media assets.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
