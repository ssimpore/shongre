import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

interface DemoMediaEntry {
  key: string;
  sourceUrl: string;
  fileName: string;
}

interface MarketplaceFixture {
  schemaVersion: number;
  users: unknown[];
  listings: unknown[];
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function readMediaEntries(): DemoMediaEntry[] {
  const manifest = readJson<{ schemaVersion: number; media: DemoMediaEntry[] }>(
    mediaManifestPath,
  );
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.media)) {
    throw new Error("The local media manifest is invalid.");
  }
  return manifest.media;
}

function readMarketplaceFixture(): MarketplaceFixture {
  const fixture = readJson<MarketplaceFixture>(fixturePath);
  if (
    fixture.schemaVersion !== 1 ||
    !Array.isArray(fixture.users) ||
    !Array.isArray(fixture.listings)
  ) {
    throw new Error("The backend-owned local marketplace fixture is invalid.");
  }
  return fixture;
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
          `Substituted ${entry.fileName} because the source returned HTTP ${response.status}.`,
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
      if (bytes.length <= 1_024)
        throw new Error(
          `Downloaded image is unexpectedly small: ${entry.sourceUrl}`,
        );
      fs.writeFileSync(destination, bytes);
      console.log(
        `Downloaded ${entry.fileName} (${bytes.length} bytes, sha256 ${sha256(bytes).slice(0, 12)})`,
      );
    }
  });
  await Promise.all(workers);
}

async function main() {
  const check = process.argv.includes("--check");
  const download = process.argv.includes("--download");
  const fixture = readMarketplaceFixture();
  const mediaEntries = readMediaEntries();
  const missing = mediaEntries.filter((entry) => {
    const filePath = path.join(mediaDirectory, entry.fileName);
    return !fs.existsSync(filePath) || fs.statSync(filePath).size <= 1_024;
  });

  if (download && missing.length) await downloadMedia(missing);
  if (check && missing.length) {
    throw new Error(
      `${missing.length} local database media asset(s) are missing; run npm run local-fixtures:sync`,
    );
  }
  console.log(
    `Backend local fixture is valid: ${fixture.listings.length} listings, ${fixture.users.length} profiles, ${mediaEntries.length} media assets.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
