/**
 * Responsive-source derivation for marketplace media.
 *
 * Listing photos are served from image CDNs that resize on the fly from a
 * `w` query parameter. Every card was requesting the same fixed source the
 * fixture happened to carry — `w=800` — and painting it into a ~270px slot,
 * so a phone downloaded roughly nine times the pixels it could display.
 *
 * These helpers rewrite that one parameter into a `srcset` ladder. They are
 * deliberately pure and host-aware: a URL we do not recognise is returned
 * untouched rather than guessed at, because emitting a `srcset` a host does
 * not honour would fetch broken sources on every breakpoint.
 */

/**
 * Hosts known to resize from a `w` query parameter.
 *
 * Add a host only after confirming it honours `w` — an unrecognised host
 * falls back to the original `src`, which is always safe.
 */
const RESIZABLE_HOSTS = new Set(['images.unsplash.com']);

/**
 * The width ladder offered to the browser.
 *
 * Chosen against the real slots in the product: the 28-48px avatar circle, a
 * 2-up mobile grid (~180px), a 4/5-up desktop grid (~270px), the list-variant
 * thumbnail (~220px) and the detail gallery (up to ~900px) — each with room
 * for a 2x device pixel ratio. The three sub-128px steps exist for avatars,
 * which otherwise had to round up to 160w for a 28px circle.
 */
export const DEFAULT_WIDTH_LADDER = [64, 96, 128, 160, 240, 320, 480, 640, 800, 1080, 1440] as const;

/** Parses `src` when it is an absolute http(s) URL we can safely rewrite. */
function parseResizableUrl(src: string): URL | null {
  if (!src || src.startsWith('data:') || src.startsWith('blob:')) return null;
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    // Relative paths (local assets) are served as-is and have no resize API.
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (!RESIZABLE_HOSTS.has(url.hostname)) return null;
  return url;
}

/** True when `buildSrcSet` can produce a ladder for this source. */
export function isResizableSource(src: string | undefined): boolean {
  return typeof src === 'string' && parseResizableUrl(src) !== null;
}

/**
 * Builds a `w`-descriptor `srcset` for a resizable source.
 *
 * Returns `undefined` for anything we cannot rewrite, so the caller simply
 * omits the attribute and the browser falls back to `src`.
 */
export function buildSrcSet(
  src: string | undefined,
  ladder: readonly number[] = DEFAULT_WIDTH_LADDER,
): string | undefined {
  if (typeof src !== 'string') return undefined;
  const url = parseResizableUrl(src);
  if (!url) return undefined;

  // Never offer sources larger than the one the fixture asked for: upscaling
  // past the original costs bytes for no visible gain.
  const intrinsic = Number(url.searchParams.get('w'));
  const capped = Number.isFinite(intrinsic) && intrinsic > 0
    ? ladder.filter((w) => w <= intrinsic)
    : [...ladder];

  // A source whose intrinsic width sits below the whole ladder still deserves
  // its own entry, otherwise the ladder is empty and we emit nothing.
  const widths = capped.length > 0 ? capped : [ladder[0]];

  return widths
    .map((w) => {
      const variant = new URL(url.href);
      variant.searchParams.set('w', String(w));
      return `${variant.href} ${w}w`;
    })
    .join(', ');
}

/**
 * `sizes` values for the recurring media slots.
 *
 * Kept here rather than typed at each call site so the grid definitions and
 * the media hints cannot drift apart silently: when a grid gains a column,
 * this is the one place that has to change.
 */
export const IMAGE_SIZES = {
  /** 2-up on phones, 3-up on tablets, 4/5-up on desktop. */
  card: '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw',
  /** Fixed-width thumbnail beside list-variant copy. */
  thumbnail: '(max-width: 640px) 100vw, 220px',
  /** Dense 8-up rail and compact cards. */
  compact: '(max-width: 640px) 33vw, 160px',
  /** Listing detail gallery — full width on phones, capped by the content column. */
  gallery: '(max-width: 1024px) 100vw, 900px',
  /** Gallery filmstrip thumbnails (56-80px painted, 2x accounted for). */
  thumb: '80px',
} as const;

/**
 * Per-size hints for the avatar circle.
 *
 * Avatars span 28px in a message list to 128px on a profile header — a single
 * shared value would either starve the header or overfeed the list, so the
 * scale is mirrored here and keyed by the same names `Avatar` accepts.
 */
export const AVATAR_SIZES = {
  sm: '28px',
  md: '40px',
  lg: '48px',
  xl: '64px',
  '2xl': '(max-width: 640px) 96px, 128px',
} as const;

export type ImageSizesKey = keyof typeof IMAGE_SIZES;
