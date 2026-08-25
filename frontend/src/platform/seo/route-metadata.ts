import type { Metadata } from "next";
import {
  buildPublicUrl,
  COUNTRY_REGISTRY,
  type MarketContext,
} from "@shongre/contracts";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  resolveCanonical,
  resolveOpenGraphLocale,
  resolveTitle,
} from "../../services/seo.service";
import { INITIAL_LISTINGS, DEMO_USERS } from "../../mocks/initialDemoData";
import { TAXONOMY } from "../../domains/taxonomy/taxonomy.data";
import type { Listing } from "../../types";
import { MARKET_CONFIG } from "../../configuration/market.config";

interface RouteMetadataInput {
  pathname: string;
  query?: Record<string, string | string[] | undefined>;
  origin?: string;
  marketContext?: MarketContext;
}

const staticPages: Record<
  string,
  { title: string; description?: string; noIndex?: boolean }
> = {
  "/": { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION },
  "/categories": { title: "Toutes les catégories" },
  "/collections": { title: "Collections" },
  "/bons-plans": { title: "Bons plans & prix réduits" },
  "/recherche": { title: "Résultats de recherche" },
  "/professionnels": { title: "Professionnels" },
  "/solutions-pro": { title: "Solutions pour les professionnels" },
  "/tarifs": { title: "Tarifs professionnels" },
  "/aide": { title: "Centre d’aide" },
  "/support": { title: "Centre d’aide" },
  "/securite": { title: "Sécurité" },
  "/contact": { title: "Nous contacter" },
  "/conditions-utilisation": { title: "Conditions d’utilisation" },
  "/confidentialite": { title: "Confidentialité" },
  "/mentions-legales": { title: "Mentions légales" },
  "/accessibilite": { title: "Accessibilité" },
  "/connexion": { title: "Connexion", noIndex: true },
  "/inscription": { title: "Créer un compte", noIndex: true },
  "/account/delete": { title: "Supprimer mon compte", noIndex: true },
};

interface EntityMetadata {
  title: string;
  description: string;
  image?: string;
  /** `product` is emitted through `other`: Next's OpenGraphType union
   *  predates it, but unfurlers and rich results both look for it. */
  ogType?: "website" | "article" | "profile" | "product";
  noIndex?: boolean;
}

/** Title-cases a slug so `/categorie/bebe-puericulture-enfants` stops shipping
 *  "Annonces bebe puericulture enfants". Falls back to the taxonomy label when
 *  the slug is known, which restores the accents the slug threw away. */
function categoryTitle(slug: string): string {
  const node = TAXONOMY.find((n) => n.slug === slug);
  if (node?.name) return node.name;

  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function absoluteUrl(url: string, origin: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `${origin.replace(/\/+$/, "")}/${url.replace(/^\/+/, "")}`;
}

function formatPriceLabel(
  listing: Listing,
  locale = MARKET_CONFIG.defaultLocale,
  currency = MARKET_CONFIG.defaultCurrency,
): string {
  if (listing.isFreeDonation) return "Don gratuit";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: listing.currency || currency,
    maximumFractionDigits: Number.isInteger(listing.price) ? 0 : 2,
  }).format(listing.price);
}

function findSellerBySlug(slug: string) {
  return Object.values(DEMO_USERS).find(
    (user) => user.slug === slug || user.id === slug,
  );
}

/**
 * Metadata for the routes whose subject is a record rather than a page.
 *
 * Returns `undefined` for anything else so the static table stays in charge.
 */
function resolveEntityMetadata(
  pathname: string,
  options: { locale?: string; currency?: string; countryCode?: string } = {},
): EntityMetadata | undefined {
  const [, segment, rawSlug] = pathname.split("/");
  if (!rawSlug) return undefined;
  const slug = decodeURIComponent(rawSlug);

  if (segment === "annonce") {
    const listing = INITIAL_LISTINGS.find((l) => l.id === slug);
    if (!listing) return undefined;
    const listingMarkets = listing.marketCodes?.length
      ? listing.marketCodes
      : [listing.marketCode];
    if (
      options.countryCode &&
      !listingMarkets.includes(options.countryCode)
    ) {
      return {
        title: "Annonce indisponible dans ce pays",
        description: DEFAULT_DESCRIPTION,
        noIndex: true,
      };
    }
    const price = formatPriceLabel(
      listing,
      options.locale,
      options.currency,
    );
    return {
      title: `${listing.title} - ${price} à ${listing.city}`,
      description: `${listing.title} en vente à ${listing.city} (${listing.postalCode}) pour ${price}. Retrouvez toutes les annonces ${listing.categoryLabel} sur Shongre.`,
      image: listing.coverImageUrl || listing.photos?.[0]?.url,
      ogType: "product",
      // A sold or expired listing should stop competing in search results.
      noIndex: listing.status !== "active",
    };
  }

  if (
    segment === "boutique" ||
    segment === "profil" ||
    segment === "vendeur" ||
    segment === "u"
  ) {
    const seller = findSellerBySlug(slug);
    if (!seller) return undefined;
    const isPro =
      String(seller.sellerType) === "pro" ||
      String(seller.accountType) === "professional";
    const where = seller.city ? ` à ${seller.city}` : "";
    return {
      title: isPro
        ? `${seller.name} - Boutique professionnelle${where}`
        : `${seller.name} - Annonces${where}`,
      description:
        seller.bio?.trim() ||
        `Découvrez les annonces de ${seller.name}${where} sur Shongre : profil vérifié, messagerie intégrée et paiement sécurisé.`,
      image: seller.avatarUrl,
      ogType: "profile",
    };
  }

  return undefined;
}

export function metadataForRoute({
  pathname,
  query,
  origin,
  marketContext,
}: RouteMetadataInput): Metadata {
  const route = staticPages[pathname];
  const isSearch = pathname === "/recherche";
  const isPrivate =
    pathname.startsWith("/compte") ||
    pathname.startsWith("/admin") ||
    pathname === "/messages" ||
    pathname === "/deposer";
  const category = pathname.startsWith("/categorie/")
    ? decodeURIComponent(pathname.split("/").pop() ?? "")
    : undefined;

  /* Resolved from the same demo catalogue the app renders, so the document a
     crawler or a link unfurler receives describes the actual page. Every
     listing, shop and profile previously shipped the fallback
     "Petites annonces | Shongre" with the generic site blurb and no image —
     invisible from inside the browser, because the SPA patches the title after
     hydration and the server copy is what gets indexed and shared. */
  const entity = resolveEntityMetadata(pathname, {
    countryCode: marketContext?.countryCode || undefined,
    locale: marketContext?.locale || undefined,
    currency: marketContext?.currency || undefined,
  });

  const title =
    entity?.title ??
    route?.title ??
    (category
      ? `Annonces ${categoryTitle(category)}`
      : isSearch
        ? "Résultats de recherche"
        : "Petites annonces");
  const description =
    entity?.description ?? route?.description ?? DEFAULT_DESCRIPTION;
  const noIndex =
    route?.noIndex ||
    isPrivate ||
    entity?.noIndex ||
    (isSearch && Boolean(query?.query));
  const canonicalPath = category
    ? `/categorie/${encodeURIComponent(category)}`
    : pathname;
  const canonical = marketContext?.countryCode
    ? buildPublicUrl({
        country: marketContext.countryCode,
        route: canonicalPath,
      })
    : resolveCanonical(canonicalPath, origin || "https://shongre.fr");
  const resolvedTitle = resolveTitle(title);
  const canonicalOrigin = new URL(canonical).origin;
  const image = entity?.image
    ? absoluteUrl(entity.image, canonicalOrigin)
    : undefined;
  const alternateCountries =
    !noIndex && marketContext
      ? COUNTRY_REGISTRY.filter(
          (country) =>
            country.enabled &&
            country.seo.indexable &&
            country.marketplace.enabled &&
            ["active", "beta"].includes(country.launchStatus),
        )
      : [];
  const listingId = pathname.startsWith("/annonce/")
    ? decodeURIComponent(pathname.split("/")[2] || "")
    : null;
  const listing = listingId
    ? INITIAL_LISTINGS.find((entry) => entry.id === listingId)
    : undefined;
  const listingMarkets = listing
    ? listing.marketCodes?.length
      ? listing.marketCodes
      : [listing.marketCode]
    : null;
  const languages = Object.fromEntries(
    alternateCountries
      .filter(
        (country) => !listingMarkets || listingMarkets.includes(country.code),
      )
      .map((country) => [
        country.seo.hreflang,
        buildPublicUrl({ country: country.code, route: canonicalPath }),
      ]),
  );
  if (Object.keys(languages).length > 0) {
    languages["x-default"] = "https://shongre.com/";
  }

  return {
    title: resolvedTitle,
    description,
    alternates: {
      canonical,
      ...(Object.keys(languages).length > 0 ? { languages } : {}),
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      title: resolvedTitle,
      description,
      /* Next's OpenGraphType union has no `product`, and routing it through
         `other` emits `<meta name="og:type">` — Open Graph requires
         `property=`, so unfurlers ignore it and the valid tag goes missing.
         `website` is correct and understood everywhere; product semantics are
         carried by the Product JSON-LD this route also renders. */
      type: entity?.ogType === "profile" ? "profile" : "website",
      locale: resolveOpenGraphLocale(
        marketContext?.locale || MARKET_CONFIG.defaultLocale,
      ),
      alternateLocale: alternateCountries
        .filter((country) => country.code !== marketContext?.countryCode)
        .map((country) => resolveOpenGraphLocale(country.defaultLocale)),
      siteName: "Shongre",
      url: canonical,
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      // A marketplace link is a picture of a thing; the small card wasted it.
      card: image ? "summary_large_image" : "summary",
      title: resolvedTitle,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

/**
 * JSON-LD for the routes whose subject is a record, serialised for the server.
 *
 * Returns `null` for everything else. `<` is escaped so a title containing a
 * closing tag cannot break out of the `<script>` element.
 */
export function structuredDataForRoute(
  pathname: string,
  originOrContext: string | MarketContext,
): string | null {
  const [, segment, rawSlug] = pathname.split("/");
  if (!rawSlug) return null;
  const slug = decodeURIComponent(rawSlug);
  const marketContext =
    typeof originOrContext === "string" ? undefined : originOrContext;
  const origin =
    typeof originOrContext === "string"
      ? originOrContext
      : new URL(originOrContext.canonicalUrl).origin;
  const canonical = marketContext?.countryCode
    ? buildPublicUrl({ country: marketContext.countryCode, route: pathname })
    : resolveCanonical(pathname, origin);

  let payload: Record<string, unknown> | null = null;

  if (segment === "annonce") {
    const listing = INITIAL_LISTINGS.find((l) => l.id === slug);
    if (!listing) return null;
    const image = listing.coverImageUrl || listing.photos?.[0]?.url;
    payload = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: listing.title,
      description: listing.description,
      ...(image ? { image: [absoluteUrl(image, origin)] } : {}),
      category: listing.categoryLabel,
      offers: {
        "@type": "Offer",
        price: listing.isFreeDonation ? 0 : listing.price,
        priceCurrency:
          listing.currency ||
          marketContext?.currency ||
          MARKET_CONFIG.defaultCurrency,
        availability:
          listing.status === "active"
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        itemCondition: "https://schema.org/UsedCondition",
        url: canonical,
        ...(listing.sellerName
          ? { seller: { "@type": "Person", name: listing.sellerName } }
          : {}),
      },
    };
  } else if (
    segment === "boutique" ||
    segment === "profil" ||
    segment === "vendeur" ||
    segment === "u"
  ) {
    const seller = findSellerBySlug(slug);
    if (!seller) return null;
    payload = {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      mainEntity: {
        "@type":
          String(seller.sellerType) === "pro" ||
          String(seller.accountType) === "professional"
            ? "Organization"
            : "Person",
        name: seller.name,
        ...(seller.avatarUrl
          ? { image: absoluteUrl(seller.avatarUrl, origin) }
          : {}),
        ...(seller.city
          ? {
              address: {
                "@type": "PostalAddress",
                addressLocality: seller.city,
              },
            }
          : {}),
        url: canonical,
      },
    };
  }

  if (!payload) return null;
  return JSON.stringify(payload).replace(/</g, "\\u003c");
}
