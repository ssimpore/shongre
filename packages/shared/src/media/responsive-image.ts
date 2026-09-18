/**
 * Responsive sources for marketplace imagery.
 *
 * A width ladder can only be offered to hosts whose resize semantics are known,
 * because a guessed query parameter silently returns the full-size original.
 * Two conventions are known here:
 *
 * - **`w` query parameter** — the fixture/editorial host. Always available.
 * - **Supabase Storage render endpoint** — where seller uploads live. This is a
 *   billed capability on the storage provider, so a deployment that has not
 *   enabled it must not be sent there: an un-transformed original is slow, but
 *   a rejected transform request is a broken image. It is therefore opt-in per
 *   environment through `transformMode` rather than inferred from the URL.
 */

/** Hosts known to resize from a `w` query parameter. */
const RESIZABLE_HOSTS = new Set(["images.unsplash.com"]);

/** Path segment identifying a public Supabase Storage object. */
const SUPABASE_PUBLIC_OBJECT_SEGMENT = "/storage/v1/object/public/";
/** The same object served through the image transformer. */
const SUPABASE_RENDER_SEGMENT = "/storage/v1/render/image/public/";
const SUPABASE_RENDER_QUALITY = 75;

/**
 * Whether this environment may ask the storage provider to transform images.
 * `disabled` is the safe default: originals are served unchanged.
 */
export type ImageTransformMode = "disabled" | "supabase_render";

/**
 * Parses the configured transform capability, failing closed. An unrecognised
 * or absent value serves originals rather than guessing at a paid capability.
 */
export function normalizeImageTransformMode(
  value: string | undefined | null,
): ImageTransformMode {
  return value?.trim() === "supabase_render" ? "supabase_render" : "disabled";
}

export interface ResponsiveSourceOptions {
  /** Widths to offer. Defaults to {@link DEFAULT_WIDTH_LADDER}. */
  ladder?: readonly number[];
  /** Storage transform capability for this environment. Defaults to disabled. */
  transformMode?: ImageTransformMode;
}

/**
 * Widths offered to the browser for marketplace photos and avatars. The small
 * steps keep dense identity rows from rounding up to a much larger source.
 */
export const DEFAULT_WIDTH_LADDER = [
  64, 96, 128, 160, 240, 320, 480, 640, 800, 1080, 1440,
] as const;

type ResizableSource =
  | { kind: "query_width"; url: URL; intrinsicWidth?: number }
  | { kind: "supabase_render"; url: URL };

function parseUrl(src: string): URL | null {
  if (!src || src.startsWith("data:") || src.startsWith("blob:")) return null;
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  return url;
}

function parseResizableSource(
  src: string,
  transformMode: ImageTransformMode,
): ResizableSource | null {
  const url = parseUrl(src);
  if (!url) return null;

  if (RESIZABLE_HOSTS.has(url.hostname)) {
    const declared = Number(url.searchParams.get("w"));
    return {
      kind: "query_width",
      url,
      intrinsicWidth:
        Number.isFinite(declared) && declared > 0 ? declared : undefined,
    };
  }

  if (
    transformMode === "supabase_render" &&
    url.pathname.includes(SUPABASE_PUBLIC_OBJECT_SEGMENT)
  ) {
    const rendered = new URL(url.href);
    rendered.pathname = rendered.pathname.replace(
      SUPABASE_PUBLIC_OBJECT_SEGMENT,
      SUPABASE_RENDER_SEGMENT,
    );
    return { kind: "supabase_render", url: rendered };
  }

  return null;
}

function variantUrl(source: ResizableSource, width: number): string {
  const variant = new URL(source.url.href);
  if (source.kind === "query_width") {
    const capped = source.intrinsicWidth
      ? Math.min(Math.round(width), source.intrinsicWidth)
      : Math.round(width);
    variant.searchParams.set("w", String(capped));
    return variant.href;
  }
  variant.searchParams.set("width", String(Math.round(width)));
  variant.searchParams.set("resize", "contain");
  variant.searchParams.set("quality", String(SUPABASE_RENDER_QUALITY));
  return variant.href;
}

export function isResizableSource(
  src: string | undefined,
  transformMode: ImageTransformMode = "disabled",
): boolean {
  return (
    typeof src === "string" && parseResizableSource(src, transformMode) !== null
  );
}

/** Returns one provider-sized fallback URL for browsers without `srcset`. */
export function buildSizedImageUrl(
  src: string | undefined,
  width: number,
  options: ResponsiveSourceOptions = {},
): string | undefined {
  if (typeof src !== "string" || !Number.isFinite(width) || width <= 0) {
    return undefined;
  }
  const source = parseResizableSource(src, options.transformMode ?? "disabled");
  if (!source) return undefined;
  return variantUrl(source, width);
}

/**
 * Builds a `w`-descriptor ladder only for sources whose resize semantics are
 * known. Unknown, local, data, and blob sources safely keep their `src`.
 */
export function buildSrcSet(
  src: string | undefined,
  options: ResponsiveSourceOptions = {},
): string | undefined {
  if (typeof src !== "string") return undefined;
  const source = parseResizableSource(src, options.transformMode ?? "disabled");
  if (!source) return undefined;

  const ladder = options.ladder ?? DEFAULT_WIDTH_LADDER;
  const intrinsic =
    source.kind === "query_width" ? source.intrinsicWidth : undefined;
  const capped = intrinsic
    ? ladder.filter((width) => width <= intrinsic)
    : [...ladder];
  const widths = capped.length > 0 ? capped : [ladder[0]];

  return widths
    .map((width) => `${variantUrl(source, width)} ${width}w`)
    .join(", ");
}

export const IMAGE_SIZES = {
  // Below `sm` the standard card is capped at `listing-card-mobile-max`
  // (13.75rem = 220px) and centred, so the slot only follows the viewport
  // while the viewport minus its 2rem of gutters is narrower than the cap;
  // claiming the full viewport width made phones fetch a 640w source for a
  // 220px slot.
  card: "(max-width: 252px) calc(100vw - 2rem), (max-width: 639px) 13.75rem, (max-width: 767px) calc((100vw - 3rem) / 2), (max-width: 1023px) calc((100vw - 4rem) / 3), 208px",
  thumbnail: "(max-width: 640px) 100vw, 220px",
  // The boosted hero presents its featured listing as a landscape preview at
  // every breakpoint (`listing-card-hero-horizontal`), a fixed
  // `listing-card-list-image-sm` well of 9rem; claiming the viewport there
  // fetched a 480w source for a 144px slot on phones.
  heroPreview: "144px",
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
  [IMAGE_SIZES.heroPreview, 320],
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
  options: ResponsiveSourceOptions = {},
): string | undefined {
  if (!sizes) return undefined;
  const knownWidth = IMAGE_FALLBACK_WIDTHS.get(sizes);
  if (knownWidth) return buildSizedImageUrl(src, knownWidth, options);

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
      return buildSizedImageUrl(src, width, options);
    }
  }

  return buildSizedImageUrl(src, 640, options);
}
