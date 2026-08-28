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
import {
  DEFAULT_MARKET_LANGUAGE,
  DEFAULT_MARKET_LOCALE,
  DEFAULT_MARKET_REGION,
} from "../configuration/market-baseline";
import {
  buildPublicUrl,
  COUNTRY_REGISTRY,
  type MarketContext,
} from "@shongre/contracts";

export const SITE_NAME = "Shongre";

/** Must stay in step with the fallback description in `index.html`. */
export const DEFAULT_DESCRIPTION =
  "Plateforme moderne de petites annonces pour particuliers et professionnels " +
  "avec réservation, paiement en ligne via prestataire, remise en main " +
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
  /** Explicit environment-aware canonical, used by non-marketplace applications. */
  canonicalUrl?: string;
  /** Absolute URL. Omitted rather than faked when a page has no image. */
  image?: string;
  type?: "website" | "article" | "product" | "profile";
  /** Keeps a page out of the index. Use for anything behind auth or transient. */
  noIndex?: boolean;
  /** Deliberate link-following policy for a noindex page. */
  follow?: boolean;
  /** BCP 47 locale from the active market, e.g. `fr-FR` or `en-US`. */
  locale?: string;
  /** Restricts reciprocal alternates when an equivalent page is not global. */
  alternateCountries?: string[];
  /** Only true when the global country gateway is a genuine default alternate. */
  includeXDefault?: boolean;
  structuredData?: StructuredData[];
}

const DEFAULT_REGION_BY_LANGUAGE: Record<string, string> = {
  de: "DE",
  en: "US",
  es: "ES",
  fr: "FR",
  it: "IT",
  nl: "NL",
};

/** Converts a BCP 47 locale into the Open Graph `language_TERRITORY` form. */
export function resolveOpenGraphLocale(locale?: string): string {
  const [rawLanguage = DEFAULT_MARKET_LANGUAGE, rawRegion] = (
    locale || DEFAULT_MARKET_LOCALE
  )
    .replace(/_/g, "-")
    .split("-");
  const language = rawLanguage.toLowerCase();
  const region =
    rawRegion?.toUpperCase() ||
    DEFAULT_REGION_BY_LANGUAGE[language] ||
    DEFAULT_MARKET_REGION;
  return `${language}_${region}`;
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
  // The homepage title already opens with the brand, so appending it produced
  // "Shongre - Petites Annonces… | Shongre" on the one page that matters most.
  if (new RegExp(`^${SITE_NAME}\\b`, "i").test(trimmed)) return trimmed;
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
  const matches = Array.from(
    document.head.querySelectorAll<HTMLMetaElement>(selector),
  );
  // Prefer the node Next owns. If our earlier client pass created a temporary
  // fallback before App Router installed its tag, retract only that fallback.
  // Removing or moving an unmarked React-owned node breaks Fast Refresh's DOM
  // bookkeeping and surfaces as `removeChild` on a null parent.
  const existing =
    matches.find((node) => !node.hasAttribute(MANAGED)) ?? matches[0];
  matches
    .filter(
      (duplicate) => duplicate !== existing && duplicate.hasAttribute(MANAGED),
    )
    .forEach((duplicate) => duplicate.remove());

  if (!value) {
    matches
      .filter((node) => node.hasAttribute(MANAGED))
      .forEach((node) => node.remove());
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
  const links = Array.from(
    document.head.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]'),
  );
  let link = links.find((node) => !node.hasAttribute(MANAGED)) ?? links[0];
  links
    .filter(
      (duplicate) => duplicate !== link && duplicate.hasAttribute(MANAGED),
    )
    .forEach((duplicate) => duplicate.remove());
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    link.setAttribute(MANAGED, "");
    document.head.appendChild(link);
  }
  link.setAttribute("href", url);
}

function applyAlternateLinks(
  meta: PageMeta,
  canonicalPath: string,
  marketContext?: MarketContext | null,
) {
  if (typeof document === "undefined") return;
  const existingLinks = Array.from(
    document.head.querySelectorAll<HTMLLinkElement>(
      'link[rel="alternate"][hreflang]',
    ),
  );
  if (meta.noIndex || !marketContext?.countryCode) {
    existingLinks
      .filter((node) => node.hasAttribute(MANAGED))
      .forEach((node) => node.remove());
    return;
  }

  const allowed = meta.alternateCountries
    ? new Set(meta.alternateCountries.map((code) => code.toUpperCase()))
    : null;
  const countries = COUNTRY_REGISTRY.filter(
    (country) =>
      country.enabled &&
      country.seo.indexable &&
      country.marketplace.enabled &&
      ["active", "beta"].includes(country.launchStatus) &&
      (!allowed || allowed.has(country.code)),
  );
  const desired = countries.map((country) => ({
    hreflang: country.seo.hreflang,
    href: buildPublicUrl({
      country: country.code,
      route: canonicalPath,
      infrastructure: marketContext.infrastructure,
    }),
  }));
  if (meta.includeXDefault && countries.length > 0) {
    desired.push({
      hreflang: "x-default",
      href: `${marketContext.infrastructure.canonicalProtocol}://${marketContext.infrastructure.globalDomain}/`,
    });
  }

  const desiredLanguages = new Set(desired.map(({ hreflang }) => hreflang));
  existingLinks
    .filter(
      (node) =>
        node.hasAttribute(MANAGED) && !desiredLanguages.has(node.hreflang),
    )
    .forEach((node) => node.remove());

  for (const entry of desired) {
    const matches = existingLinks.filter(
      (node) => node.hreflang === entry.hreflang,
    );
    let link =
      matches.find((node) => !node.hasAttribute(MANAGED)) ?? matches[0];
    matches
      .filter(
        (duplicate) => duplicate !== link && duplicate.hasAttribute(MANAGED),
      )
      .forEach((duplicate) => duplicate.remove());
    if (!link) {
      link = document.createElement("link");
      link.rel = "alternate";
      link.hreflang = entry.hreflang;
      link.setAttribute(MANAGED, "");
      document.head.appendChild(link);
    }
    link.href = entry.href;
  }
}

function applyStructuredData(entries: StructuredData[]) {
  if (typeof document === "undefined") return;
  const serverScripts = Array.from(
    document.querySelectorAll<HTMLScriptElement>(
      `script[${LD_MARKER}="server"]`,
    ),
  );
  const managedScripts = Array.from(
    document.head.querySelectorAll<HTMLScriptElement>(
      `script[${LD_MARKER}="client"]`,
    ),
  );
  const usedScripts = new Set<HTMLScriptElement>();

  entries.forEach((entry, index) => {
    let script =
      serverScripts[index] ||
      managedScripts.find((candidate) => !usedScripts.has(candidate));
    if (!script) {
      script = document.createElement("script");
      script.setAttribute(LD_MARKER, "client");
      document.head.appendChild(script);
    }
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(entry);
    usedScripts.add(script);
  });

  serverScripts.slice(entries.length).forEach((script) => {
    // Server Component nodes remain in place so React retains ownership. An
    // inert MIME type prevents stale schema after a client-side route change.
    script.type = "application/json";
    script.textContent = "";
  });
  managedScripts
    .filter((script) => !usedScripts.has(script))
    .forEach((script) => script.remove());
}

/** Writes one page's metadata over whatever the previous route left behind. */
export function applyPageMeta(
  meta: PageMeta,
  marketContext?: MarketContext | null,
): void {
  if (typeof document === "undefined") return;

  const origin = window.location.origin;
  const title = resolveTitle(meta.title);
  const description = meta.description?.trim() || DEFAULT_DESCRIPTION;
  const canonicalPath =
    meta.canonicalPath ??
    marketContext?.internalPath ??
    window.location.pathname;
  const canonical = meta.canonicalUrl
    ? new URL(meta.canonicalUrl, origin)
        .toString()
        .replace(/\/$/, (match) =>
          new URL(meta.canonicalUrl!, origin).pathname === "/" ? match : "",
        )
    : marketContext?.countryCode
      ? buildPublicUrl({
          country: marketContext.countryCode,
          route: canonicalPath,
          infrastructure: marketContext.infrastructure,
        })
      : resolveCanonical(canonicalPath, origin);

  document.title = title;

  upsertMeta('meta[name="description"]', "name", "description", description);
  upsertCanonical(canonical);
  applyAlternateLinks(
    meta,
    canonicalPath,
    meta.canonicalUrl ? null : marketContext,
  );

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
  upsertMeta(
    'meta[property="og:locale"]',
    "property",
    "og:locale",
    resolveOpenGraphLocale(meta.locale || document.documentElement.lang),
  );
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
    meta.noIndex
      ? `noindex, ${meta.follow === true ? "follow" : "nofollow"}`
      : "index, follow",
  );

  applyStructuredData(meta.structuredData ?? []);
}
