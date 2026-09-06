/** Hosts known to resize from a `w` query parameter. */
const RESIZABLE_HOSTS = new Set(["images.unsplash.com"]);

/**
 * Widths offered to the browser for marketplace photos and avatars. The small
 * steps keep dense identity rows from rounding up to a much larger source.
 */
export const DEFAULT_WIDTH_LADDER = [
  64, 96, 128, 160, 240, 320, 480, 640, 800, 1080, 1440,
] as const;

function parseResizableUrl(src: string): URL | null {
  if (!src || src.startsWith("data:") || src.startsWith("blob:")) return null;
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  return RESIZABLE_HOSTS.has(url.hostname) ? url : null;
}

export function isResizableSource(src: string | undefined): boolean {
  return typeof src === "string" && parseResizableUrl(src) !== null;
}

/** Returns one provider-sized fallback URL for browsers without `srcset`. */
export function buildSizedImageUrl(
  src: string | undefined,
  width: number,
): string | undefined {
  if (typeof src !== "string" || !Number.isFinite(width) || width <= 0) {
    return undefined;
  }
  const url = parseResizableUrl(src);
  if (!url) return undefined;
  const intrinsic = Number(url.searchParams.get("w"));
  url.searchParams.set(
    "w",
    String(
      Number.isFinite(intrinsic) && intrinsic > 0
        ? Math.min(Math.round(width), intrinsic)
        : Math.round(width),
    ),
  );
  return url.href;
}

/**
 * Builds a `w`-descriptor ladder only for image hosts whose resize semantics
 * are known. Unknown, local, data, and blob sources safely keep their `src`.
 */
export function buildSrcSet(
  src: string | undefined,
  ladder: readonly number[] = DEFAULT_WIDTH_LADDER,
): string | undefined {
  if (typeof src !== "string") return undefined;
  const url = parseResizableUrl(src);
  if (!url) return undefined;

  const intrinsic = Number(url.searchParams.get("w"));
  const capped =
    Number.isFinite(intrinsic) && intrinsic > 0
      ? ladder.filter((width) => width <= intrinsic)
      : [...ladder];
  const widths = capped.length > 0 ? capped : [ladder[0]];

  return widths
    .map((width) => {
      const variant = new URL(url.href);
      variant.searchParams.set("w", String(width));
      return `${variant.href} ${width}w`;
    })
    .join(", ");
}

export const IMAGE_SIZES = {
  card: "(max-width: 639px) calc(100vw - 2rem), (max-width: 767px) calc((100vw - 3rem) / 2), (max-width: 1023px) calc((100vw - 4rem) / 3), 208px",
  thumbnail: "(max-width: 640px) 100vw, 220px",
  compact: "208px",
  gallery: "(max-width: 1024px) 100vw, 900px",
  thumb: "80px",
} as const;

export const AVATAR_SIZES = {
  sm: "28px",
  md: "40px",
  lg: "48px",
  xl: "64px",
  "2xl": "(max-width: 640px) 96px, 128px",
} as const;

const IMAGE_FALLBACK_WIDTHS = new Map<string, number>([
  [IMAGE_SIZES.card, 640],
  [IMAGE_SIZES.thumbnail, 480],
  [IMAGE_SIZES.compact, 480],
  [IMAGE_SIZES.gallery, 640],
  [IMAGE_SIZES.thumb, 160],
]);

/**
 * Builds a conservative `src` fallback alongside `srcset`. This matters for
 * client-rendered images whose initial candidate can otherwise remain the
 * fixture's oversized source even after the responsive attributes arrive.
 */
export function buildResponsiveFallbackUrl(
  src: string | undefined,
  sizes: string | undefined,
): string | undefined {
  if (!sizes) return undefined;
  const knownWidth = IMAGE_FALLBACK_WIDTHS.get(sizes);
  if (knownWidth) return buildSizedImageUrl(src, knownWidth);

  if (!sizes.includes("vw")) {
    const declaredPixels = [...sizes.matchAll(/(\d+(?:\.\d+)?)px/g)].map(
      (match) => Number(match[1]),
    );
    const largest = Math.max(0, ...declaredPixels);
    if (largest > 0) {
      const target = largest * 2;
      const width =
        DEFAULT_WIDTH_LADDER.find((candidate) => candidate >= target) ??
        DEFAULT_WIDTH_LADDER.at(-1)!;
      return buildSizedImageUrl(src, width);
    }
  }

  return buildSizedImageUrl(src, 640);
}
