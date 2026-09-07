const SITEMAP_MAX_URLS = 50_000;
const SITEMAP_MAX_BYTES = 50 * 1024 * 1024;
const SITEMAP_TARGET_BYTES = 45 * 1024 * 1024;

export interface SitemapEntry {
  url: string;
  lastModified?: string;
  imageUrls?: readonly string[];
}

export interface SitemapGroup {
  id: string;
  entries: SitemapEntry[];
}

export interface SitemapShard extends SitemapGroup {
  page: number;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function normalizedLastModified(value?: string): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : undefined;
}

function normalizedImageUrls(values: readonly string[] = []): string[] {
  return Array.from(
    new Set(
      values.flatMap((value) => {
        try {
          const url = new URL(value);
          return ["http:", "https:"].includes(url.protocol) &&
            !url.username &&
            !url.password
            ? [url.toString()]
            : [];
        } catch {
          return [];
        }
      }),
    ),
  ).slice(0, 1_000);
}

function serializeSitemapUrl(entry: SitemapEntry): string {
  const lastModified = normalizedLastModified(entry.lastModified);
  const images = normalizedImageUrls(entry.imageUrls)
    .map(
      (url) =>
        `<image:image><image:loc>${escapeXml(url)}</image:loc></image:image>`,
    )
    .join("");
  return `<url><loc>${escapeXml(entry.url)}</loc>${lastModified ? `<lastmod>${escapeXml(lastModified)}</lastmod>` : ""}${images}</url>`;
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export function renderUrlSet(entries: SitemapEntry[]): string {
  const hasImages = entries.some(
    (entry) => normalizedImageUrls(entry.imageUrls).length,
  );
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${hasImages ? ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"' : ""}>`,
    ...entries.map(serializeSitemapUrl),
    "</urlset>",
  ].join("");
  if (
    entries.length > SITEMAP_MAX_URLS ||
    byteLength(body) > SITEMAP_MAX_BYTES
  ) {
    throw new Error(
      "Sitemap exceeds the protocol URL or uncompressed byte limit.",
    );
  }
  return body;
}

export function renderSitemapIndex(urls: string[]): string {
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((url) => `<sitemap><loc>${escapeXml(url)}</loc></sitemap>`),
    "</sitemapindex>",
  ].join("");
  if (urls.length > SITEMAP_MAX_URLS || byteLength(body) > SITEMAP_MAX_BYTES) {
    throw new Error("Sitemap index exceeds the protocol URL or byte limit.");
  }
  return body;
}

export function partitionSitemapGroups(groups: SitemapGroup[]): SitemapShard[] {
  return groups.flatMap((group) => {
    const entries = [...group.entries].sort((left, right) =>
      left.url.localeCompare(right.url),
    );
    const shards: SitemapShard[] = [];
    let current: SitemapEntry[] = [];
    let currentBytes = 200;

    const flush = () => {
      if (!current.length) return;
      shards.push({ id: group.id, page: shards.length, entries: current });
      current = [];
      currentBytes = 200;
    };

    for (const entry of entries) {
      const entryBytes = byteLength(serializeSitemapUrl(entry));
      if (
        current.length >= SITEMAP_MAX_URLS ||
        currentBytes + entryBytes > SITEMAP_TARGET_BYTES
      ) {
        flush();
      }
      current.push(entry);
      currentBytes += entryBytes;
    }
    flush();
    return shards;
  });
}

export function sitemapNeedsIndex(groups: SitemapGroup[]): boolean {
  const entries = groups.flatMap((group) => group.entries);
  if (entries.length > SITEMAP_MAX_URLS) return true;
  try {
    renderUrlSet(entries);
    return false;
  } catch {
    return true;
  }
}

export function parseShardId(
  value: string,
): { id: string; page: number } | null {
  const match = value.match(/^([a-z][a-z0-9-]*)-(\d+)\.xml$/);
  if (!match) return null;
  return { id: match[1], page: Number(match[2]) };
}
