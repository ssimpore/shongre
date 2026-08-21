/**
 * Per-route document metadata.
 *
 * `index.html` carries one static title, description and Open Graph block, which
 * is correct for the homepage and wrong for every other route: search results,
 * category pages, stores, collections and the legal pages all presented
 * themselves to crawlers and to anything unfurling a shared link as the site
 * root. Two pages set their own `document.title` by hand and one of those also
 * hand-rolled a JSON-LD `<script>` — so the parts that did exist existed twice,
 * in two shapes.
 *
 * Everything a page wants to say about itself goes through `applyPageMeta`,
 * which **updates** the tags `index.html` already ships rather than appending a
 * second set. That is the whole reason the upsert looks for an existing tag
 * first: a page that adds its own `<meta name="description">` next to the static
 * one leaves the document with two, and which one wins is up to the consumer.
 *
 * The title/canonical builders are pure so they can be tested without a DOM —
 * this project runs Vitest in Node, and the DOM application is covered from
 * Playwright instead.
 */

export const SITE_NAME = "Shongre";

/** Must stay in step with the fallback description in `index.html`. */
export const DEFAULT_DESCRIPTION =
  "Plateforme moderne de petites annonces pour particuliers et professionnels " +
  "avec réservation sécurisée sous séquestre, paiement en ligne, remise en main " +
  "propre et livraison intégrée.";

export const DEFAULT_TITLE = "Shongre - Petites Annonces Particuliers & Pros";

export interface StructuredData {
  "@context": string;
  "@type": string;
  [key: string]: unknown;
}

export interface PageMeta {
  /** The page-specific part of the title; the site name is appended for you. */
  title?: string;
  description?: string;
  /** Path only, e.g. `/recherche`. Query and hash are dropped — see below. */
  canonicalPath?: string;
  /** Absolute URL. Omitted rather than faked when a page has no image. */
  image?: string;
  type?: "website" | "article" | "product" | "profile";
  /** Keeps a page out of the index. Use for anything behind auth or transient. */
  noIndex?: boolean;
  structuredData?: StructuredData[];
}

/**
 * Appends the site name unless the page already branded its title.
 *
 * Listing detail builds a long title that ends in `| Shongre` itself, so a blind
 * append produced "… | Shongre | Shongre".
 */
export function resolveTitle(title?: string): string {
  const trimmed = (title ?? "").trim();
  if (!trimmed) return DEFAULT_TITLE;
  // Any of the separators a title might use before the brand: pipe, hyphen,
  // en dash, em dash.
  if (new RegExp(`[|\\-–—]\\s*${SITE_NAME}\\s*$`, "i").test(trimmed))
    return trimmed;
  return `${trimmed} | ${SITE_NAME}`;
}

/**
 * Absolute canonical URL for a path.
 *
 * Query strings are deliberately dropped. Search and category routes keep their
 * whole state in the URL, so `?query=velo&page=3&sortBy=price_asc` and every
 * permutation of it would otherwise each declare itself a distinct canonical
 * page — thousands of near-duplicate URLs competing with the one that should
 * rank. A page that genuinely needs a parameter in its canonical passes it in
 * `canonicalPath` explicitly.
 */
export function resolveCanonical(path: string, origin: string): string {
  const cleanOrigin = origin.replace(/\/+$/, "");
  const [bare] = (path || "/").split(/[?#]/);
  const normalised = bare.startsWith("/") ? bare : `/${bare}`;
  const trimmed = normalised.length > 1 ? normalised.replace(/\/+$/, "") : "/";
  return `${cleanOrigin}${trimmed}`;
}

/** Breadcrumb trail as schema.org, for the trail crawlers show under a result. */
export function buildBreadcrumbSchema(
  trail: { name: string; path?: string }[],
  origin: string,
): StructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      ...(crumb.path ? { item: resolveCanonical(crumb.path, origin) } : {}),
    })),
  };
}

/* -------------------------------------------------------------------------- */
/* DOM application                                                            */
/* -------------------------------------------------------------------------- */

/** Marks tags this module created, so cleanup never removes static markup. */
const MANAGED = "data-seo-managed";
const LD_MARKER = "data-seo-ld";

function upsertMeta(
  selector: string,
  attribute: "name" | "property",
  key: string,
  value?: string,
) {
  if (typeof document === "undefined") return;
  const existing = document.head.querySelector<HTMLMetaElement>(selector);

  if (!value) {
    // Only retract what this module added; static tags are left as authored.
    if (existing?.hasAttribute(MANAGED)) existing.remove();
    return;
  }

  if (existing) {
    existing.setAttribute("content", value);
    return;
  }

  const tag = document.createElement("meta");
  tag.setAttribute(attribute, key);
  tag.setAttribute("content", value);
  tag.setAttribute(MANAGED, "");
  document.head.appendChild(tag);
}

function upsertCanonical(url: string) {
  if (typeof document === "undefined") return;
  let link = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    link.setAttribute(MANAGED, "");
    document.head.appendChild(link);
  }
  link.setAttribute("href", url);
}

function applyStructuredData(entries: StructuredData[]) {
  if (typeof document === "undefined") return;
  document.head
    .querySelectorAll(`script[${LD_MARKER}]`)
    .forEach((node) => node.remove());
  for (const entry of entries) {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute(LD_MARKER, "");
    script.textContent = JSON.stringify(entry);
    document.head.appendChild(script);
  }
}

/** Writes one page's metadata over whatever the previous route left behind. */
export function applyPageMeta(meta: PageMeta): void {
  if (typeof document === "undefined") return;

  const origin = window.location.origin;
  const title = resolveTitle(meta.title);
  const description = meta.description?.trim() || DEFAULT_DESCRIPTION;
  const canonical = resolveCanonical(
    meta.canonicalPath ?? window.location.pathname,
    origin,
  );

  document.title = title;

  upsertMeta('meta[name="description"]', "name", "description", description);
  upsertCanonical(canonical);

  upsertMeta('meta[property="og:title"]', "property", "og:title", title);
  upsertMeta(
    'meta[property="og:description"]',
    "property",
    "og:description",
    description,
  );
  upsertMeta(
    'meta[property="og:type"]',
    "property",
    "og:type",
    meta.type ?? "website",
  );
  upsertMeta('meta[property="og:url"]', "property", "og:url", canonical);
  upsertMeta(
    'meta[property="og:site_name"]',
    "property",
    "og:site_name",
    SITE_NAME,
  );
  upsertMeta('meta[property="og:locale"]', "property", "og:locale", "fr_FR");
  upsertMeta('meta[property="og:image"]', "property", "og:image", meta.image);

  // A `summary_large_image` card with no image renders as a blank panel, so the
  // card type follows whether this page actually has one.
  upsertMeta(
    'meta[name="twitter:card"]',
    "name",
    "twitter:card",
    meta.image ? "summary_large_image" : "summary",
  );
  upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
  upsertMeta(
    'meta[name="twitter:description"]',
    "name",
    "twitter:description",
    description,
  );
  upsertMeta('meta[name="twitter:image"]', "name", "twitter:image", meta.image);

  upsertMeta(
    'meta[name="robots"]',
    "name",
    "robots",
    meta.noIndex ? "noindex, nofollow" : undefined,
  );

  applyStructuredData(meta.structuredData ?? []);
}
