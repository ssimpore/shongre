import {
  buildPublicUrl,
  COUNTRY_REGISTRY,
  type MarketContext,
} from "@shongre/contracts";
import {
  resolveLocalizedTaxonomySeoText,
  resolveTaxonomySeoRecord,
  taxonomyNodeIsIndexableInMarket,
} from "../../domains/taxonomy/taxonomy.seo";
import { isProSeller } from "../../domains/user/user.domain";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  resolveTitle,
  type PageMeta,
  type StructuredData,
} from "../../services/seo.service";
import type {
  PublicRouteData,
  PublicRouteDataResolution,
} from "./public-route-data";
import { listingMarketCodes } from "./public-route-data";

export const PROGRAMMATIC_SEO_THRESHOLDS = Object.freeze({
  categoryInventory: 1,
  collectionInventory: 2,
  sellerInventory: 1,
});

export type SeoResourceType =
  | "home"
  | "static_content"
  | "category_directory"
  | "category"
  | "collection_directory"
  | "collection"
  | "listing_collection"
  | "listing"
  | "professional_directory"
  | "seller_profile"
  | "job_collection"
  | "job"
  | "private_flow"
  | "unknown";

export type SeoLifecycleResult =
  | "available"
  | "inactive"
  | "expired"
  | "missing"
  | "restricted"
  | "not_applicable";

export type SeoExclusionReason =
  | "MARKET_NOT_INDEXABLE"
  | "PRIVATE_OR_TRANSACTIONAL"
  | "ARBITRARY_SEARCH_OR_FACET"
  | "INSUFFICIENT_INVENTORY"
  | "RESOURCE_INACTIVE"
  | "RESOURCE_EXPIRED"
  | "RESOURCE_MISSING"
  | "TAXONOMY_NOT_AVAILABLE"
  | "NON_CANONICAL_TAXONOMY_ROUTE"
  | "SERVER_CONTENT_NOT_VALIDATED"
  | "UNKNOWN_ROUTE";

export interface SeoRoutePolicy {
  knownRoute: boolean;
  indexable: boolean;
  follow: boolean;
  canonicalPath: string;
  canonicalUrl: string;
  title: string;
  description: string;
  resourceType: SeoResourceType;
  lifecycle: SeoLifecycleResult;
  sitemapEligible: boolean;
  structuredDataEligible: boolean;
  exclusionReason?: SeoExclusionReason;
  image?: string;
  openGraphType: "website" | "article" | "profile";
  alternateCountryCodes: string[];
  includeXDefault: boolean;
  lastModified?: string;
  redirectPath?: string;
  taxonomyCategoryId?: string;
  taxonomyHeading?: string;
  taxonomyStructuredData?: readonly string[];
}

export interface ResolveSeoPolicyInput {
  pathname: string;
  query?: Record<string, string | string[] | undefined>;
  marketContext: MarketContext;
  routeData?: PublicRouteDataResolution;
  now?: Date;
}

interface StaticPagePolicy {
  title: string;
  description: string;
  resourceType: SeoResourceType;
  sitemapEligible: boolean;
  alternate: boolean;
}

const STATIC_PAGES: Readonly<Record<string, StaticPagePolicy>> = Object.freeze({
  "/": {
    title: DEFAULT_TITLE,
    description:
      "Achetez et vendez près de chez vous sur Shongre : véhicules, immobilier, mode, maison et high-tech, avec paiement sécurisé, livraison intégrée et vendeurs vérifiés.",
    resourceType: "home",
    sitemapEligible: true,
    alternate: true,
  },
  "/categories": {
    title: "Toutes les catégories d'annonces",
    description:
      "Parcourez toutes les catégories d'annonces Shongre dans votre marché : véhicules, immobilier, mode, maison, multimédia, loisirs, emploi et services.",
    resourceType: "category_directory",
    sitemapEligible: true,
    alternate: true,
  },
  "/collections": {
    title: "Collections d’annonces",
    description:
      "Découvrez les sélections éditoriales Shongre composées d’annonces actives et regroupées par usage, budget ou style.",
    resourceType: "collection_directory",
    sitemapEligible: true,
    alternate: true,
  },
  "/offres-prix-reduit": {
    title: "Offres à prix réduit",
    description:
      "Les annonces dont le prix vient de baisser et les meilleures affaires du moment sur Shongre.",
    resourceType: "listing_collection",
    sitemapEligible: true,
    alternate: true,
  },
  "/professionnels": {
    title: "Annuaire des vendeurs professionnels",
    description:
      "Découvrez les boutiques et vendeurs professionnels actifs sur Shongre ainsi que leurs annonces publiques.",
    resourceType: "professional_directory",
    sitemapEligible: true,
    alternate: true,
  },
  "/solutions-pro": {
    title: "Offres et forfaits professionnels",
    description:
      "Comparez les forfaits professionnels Shongre, leurs quotas, outils d’équipe, statistiques et options de visibilité.",
    resourceType: "static_content",
    sitemapEligible: true,
    alternate: true,
  },
  "/aide": {
    title: "Centre d’aide",
    description:
      "Réponses aux questions les plus fréquentes sur la publication d'annonces, les paiements, la livraison et la sécurité sur Shongre.",
    resourceType: "static_content",
    sitemapEligible: true,
    alternate: true,
  },
  "/securite": {
    title: "Sécurité & prévention des fraudes",
    description:
      "Reconnaître une arnaque, sécuriser un paiement et acheter ou vendre sereinement sur Shongre.",
    resourceType: "static_content",
    sitemapEligible: true,
    alternate: true,
  },
  "/contact": {
    title: "Contacter Shongre",
    description:
      "Une question, un problème sur une annonce ou une transaction ? Contactez l'équipe Shongre et suivez votre demande.",
    resourceType: "static_content",
    sitemapEligible: true,
    alternate: true,
  },
  "/conditions-utilisation": {
    title: "Conditions Générales d'Utilisation",
    description:
      "Les conditions d'utilisation de la place de marché Shongre : rôle de la plateforme, paiements et litiges, engagements des vendeurs professionnels.",
    resourceType: "static_content",
    sitemapEligible: true,
    alternate: true,
  },
  "/confidentialite": {
    title: "Politique de confidentialité & RGPD",
    description:
      "Comment Shongre collecte, utilise et protège vos données personnelles, conformément au RGPD et à la loi Informatique et Libertés.",
    resourceType: "static_content",
    sitemapEligible: true,
    alternate: true,
  },
  "/mentions-legales": {
    title: "Mentions légales",
    description:
      "Éditeur, hébergeur et informations légales de la place de marché Shongre.",
    resourceType: "static_content",
    sitemapEligible: true,
    alternate: true,
  },
  "/accessibilite": {
    title: "Accessibilité",
    description:
      "Notre démarche d'accessibilité numérique : niveau de conformité visé, aménagements en place et moyen de nous signaler un obstacle.",
    resourceType: "static_content",
    sitemapEligible: true,
    alternate: true,
  },
  "/newsletter": {
    title: "Newsletter Shongre",
    description:
      "Recevez les meilleures annonces, les baisses de prix et les nouveautés Shongre dans votre boîte mail. Désinscription en un clic.",
    resourceType: "static_content",
    sitemapEligible: false,
    alternate: true,
  },
  "/prospects": {
    title: "Shongre Prospects",
    description:
      "Découvrez la solution Shongre de recherche et de qualification de prospects professionnels.",
    resourceType: "static_content",
    sitemapEligible: true,
    alternate: false,
  },
  "/facturation": {
    title: "Shongre Facturation",
    description:
      "Découvrez la solution Shongre pour créer, finaliser et suivre les factures de votre organisation.",
    resourceType: "static_content",
    sitemapEligible: true,
    alternate: false,
  },
  "/solutions": {
    title: "Solutions Shongre",
    description:
      "Découvrez les applications professionnelles disponibles dans l’écosystème Shongre.",
    resourceType: "static_content",
    sitemapEligible: true,
    alternate: false,
  },
});

const LEGACY_REDIRECTS: Readonly<Record<string, string>> = Object.freeze({
  "/terms": "/conditions-utilisation",
  "/privacy": "/confidentialite",
  "/cookies": "/confidentialite",
  "/support": "/aide",
  "/tarifs": "/solutions-pro",
  "/publier": "/deposer",
  "/bons-plans": "/offres-prix-reduit",
  "/categorie/jet-skis-and-scooters-des-mers":
    "/categorie/scooters-des-mers-et-motos-nautiques",
  "/categorie/dons-solidarite-bons-plans": "/categorie/don-d-objet",
});

export function listStaticSitemapPaths(): string[] {
  return Object.entries(STATIC_PAGES)
    .filter(([, policy]) => policy.sitemapEligible)
    .map(([pathname]) => pathname)
    .sort();
}

const PRIVATE_ROUTE_PATTERNS = [
  /^\/(?:connexion|inscription)(?:\/|$)/,
  /^\/(?:mot-de-passe-oublie|reinitialisation-mot-de-passe|verification-email)(?:\/|$)/,
  /^\/auth(?:\/|$)/,
  /^\/account(?:\/|$)/,
  /^\/compte(?:\/|$)/,
  /^\/admin(?:\/|$)/,
  /^\/deposer(?:\/|$)/,
  /^\/messages(?:\/|$)/,
  /^\/securite-interne(?:\/|$)/,
  /^\/newsletter\/(?:confirmer|desabonnement|preferences)(?:\/|$)/,
  /^\/emploi\/offre\/[^/]+\/postuler$/,
  /^\/education\/demande$/,
  /^\/auto\/comparer$/,
];

const KNOWN_NOINDEX_PUBLIC_PATTERNS = [
  /^\/auto(?:\/vehicule\/[^/]+)?$/,
  /^\/immo(?:\/bien\/[^/]+)?$/,
  /^\/education(?:\/professeur\/[^/]+)?$/,
  /^\/emploi\/(?:metier|secteur|lieu)\/[^/]+$/,
];

function normalizedPath(pathname: string): string {
  const bare = (pathname || "/").split(/[?#]/, 1)[0] || "/";
  const path = bare.startsWith("/") ? bare : `/${bare}`;
  return path.length > 1
    ? path.replace(/\/{2,}/g, "/").replace(/\/+$/, "")
    : "/";
}

function queryEntries(
  query: Record<string, string | string[] | undefined> | undefined,
): [string, string][] {
  const entries: [string, string][] = [];
  for (const [key, value] of Object.entries(query || {})) {
    if (Array.isArray(value)) {
      value.filter(Boolean).forEach((entry) => entries.push([key, entry]));
    } else if (value) {
      entries.push([key, value]);
    }
  }
  return entries;
}

export function isSeoMarketEnabled(context: MarketContext): boolean {
  const country = context.country;
  return Boolean(
    context.kind === "market" &&
    country &&
    country.enabled &&
    country.marketplace.enabled &&
    country.seo.indexable &&
    country.compliance.legalReviewStatus === "approved" &&
    ["active", "beta"].includes(country.launchStatus),
  );
}

export function listSeoMarketCountryCodes(): string[] {
  return COUNTRY_REGISTRY.filter(
    (country) =>
      country.enabled &&
      country.marketplace.enabled &&
      country.seo.indexable &&
      country.compliance.legalReviewStatus === "approved" &&
      ["active", "beta"].includes(country.launchStatus),
  ).map((country) => country.code);
}

function absoluteImage(image: string | undefined, canonicalUrl: string) {
  if (!image) return undefined;
  return new URL(image, new URL(canonicalUrl).origin).toString();
}

function formatListingPrice(
  data: Extract<PublicRouteData, { kind: "listing" }>,
  context: MarketContext,
) {
  const listing = data.listing;
  if (listing.isFreeDonation) return "Don gratuit";
  return new Intl.NumberFormat(context.locale || "fr-FR", {
    style: "currency",
    currency: listing.currency || context.currency || "EUR",
    maximumFractionDigits: Number.isInteger(listing.price) ? 0 : 2,
  }).format(listing.price);
}

function fallbackPolicy(
  context: MarketContext,
  pathname: string,
  overrides: Partial<SeoRoutePolicy> = {},
): SeoRoutePolicy {
  const canonicalPath = overrides.canonicalPath || pathname;
  return {
    knownRoute: false,
    indexable: false,
    follow: false,
    canonicalPath,
    canonicalUrl: buildPublicUrl({
      country: context.countryCode!,
      route: canonicalPath,
      infrastructure: context.infrastructure,
    }),
    title: resolveTitle("Page introuvable"),
    description: "Cette adresse ne correspond à aucune page publique Shongre.",
    resourceType: "unknown",
    lifecycle: "missing",
    sitemapEligible: false,
    structuredDataEligible: false,
    exclusionReason: "UNKNOWN_ROUTE",
    openGraphType: "website",
    alternateCountryCodes: [],
    includeXDefault: false,
    ...overrides,
  };
}

function availableAlternates(
  requested: readonly string[],
  currentCountryCode: string,
): string[] {
  const enabled = new Set(listSeoMarketCountryCodes());
  const result = Array.from(
    new Set(requested.map((code) => code.toUpperCase())),
  ).filter((code) => enabled.has(code));
  return result.includes(currentCountryCode)
    ? result
    : [currentCountryCode, ...result];
}

export function resolveSeoPolicy({
  pathname: rawPathname,
  query,
  marketContext,
  routeData = { status: "not_applicable", data: null },
  now = new Date(),
}: ResolveSeoPolicyInput): SeoRoutePolicy {
  const pathname = normalizedPath(rawPathname);
  const marketEnabled = isSeoMarketEnabled(marketContext);
  const marketExclusion = marketEnabled ? undefined : "MARKET_NOT_INDEXABLE";
  const currentCountry = marketContext.countryCode || "FR";
  const allMarkets = listSeoMarketCountryCodes();
  const entries = queryEntries(query);

  const base = (
    input: Omit<
      SeoRoutePolicy,
      "canonicalUrl" | "title" | "indexable" | "sitemapEligible"
    > & {
      title: string;
      indexable: boolean;
      sitemapEligible: boolean;
    },
  ): SeoRoutePolicy => {
    const indexable = input.indexable && marketEnabled;
    const canonicalUrl = buildPublicUrl({
      country: currentCountry,
      route: input.canonicalPath,
      infrastructure: marketContext.infrastructure,
    });
    return {
      ...input,
      title: resolveTitle(input.title),
      canonicalUrl,
      image: absoluteImage(input.image, canonicalUrl),
      indexable,
      sitemapEligible: input.sitemapEligible && indexable,
      structuredDataEligible: input.structuredDataEligible && indexable,
      exclusionReason: marketExclusion || input.exclusionReason,
    };
  };

  const legacyTarget = LEGACY_REDIRECTS[pathname];
  if (legacyTarget) {
    return base({
      knownRoute: true,
      indexable: false,
      follow: true,
      canonicalPath: legacyTarget,
      title: STATIC_PAGES[legacyTarget]?.title || "Shongre",
      description:
        STATIC_PAGES[legacyTarget]?.description || DEFAULT_DESCRIPTION,
      resourceType: "static_content",
      lifecycle: "not_applicable",
      sitemapEligible: false,
      structuredDataEligible: false,
      exclusionReason: "PRIVATE_OR_TRANSACTIONAL",
      openGraphType: "website",
      alternateCountryCodes: [],
      includeXDefault: false,
      redirectPath: legacyTarget,
    });
  }

  if (PRIVATE_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname))) {
    return base({
      knownRoute: true,
      indexable: false,
      follow: false,
      canonicalPath: pathname,
      title: "Espace privé ou action sécurisée",
      description:
        "Cette page Shongre correspond à un espace privé ou à une action sécurisée.",
      resourceType: "private_flow",
      lifecycle: "restricted",
      sitemapEligible: false,
      structuredDataEligible: false,
      exclusionReason: "PRIVATE_OR_TRANSACTIONAL",
      openGraphType: "website",
      alternateCountryCodes: [],
      includeXDefault: false,
    });
  }

  if (pathname === "/recherche") {
    const data =
      routeData.status === "found" && routeData.data.kind === "listing_search"
        ? routeData.data
        : null;
    const hasArbitraryState = entries.length > 0;
    const freeText = entries.find(
      ([key]) => key === "query" || key === "q",
    )?.[1];
    const enoughInventory = Boolean(
      data && data.total >= PROGRAMMATIC_SEO_THRESHOLDS.categoryInventory,
    );
    return base({
      knownRoute: true,
      indexable: !hasArbitraryState && enoughInventory,
      follow: true,
      canonicalPath: "/recherche",
      title: freeText ? `Recherche : ${freeText}` : "Toutes les annonces",
      description: freeText
        ? `Annonces correspondant à « ${freeText} » sur Shongre.`
        : `Parcourez les annonces actives publiées sur Shongre en ${marketContext.country?.name || "votre pays"}.`,
      resourceType: "listing_collection",
      lifecycle: "available",
      sitemapEligible: !hasArbitraryState && enoughInventory,
      structuredDataEligible: false,
      exclusionReason: hasArbitraryState
        ? "ARBITRARY_SEARCH_OR_FACET"
        : enoughInventory
          ? undefined
          : "INSUFFICIENT_INVENTORY",
      openGraphType: "website",
      alternateCountryCodes: data
        ? availableAlternates(data.availableCountryCodes, currentCountry)
        : [currentCountry],
      includeXDefault: false,
    });
  }

  const categoryMatch = pathname.match(/^\/categorie\/([^/]+)$/);
  if (categoryMatch) {
    const slug = decodeURIComponent(categoryMatch[1]);
    const taxonomyRecord = resolveTaxonomySeoRecord(slug);
    const node = taxonomyRecord?.node;
    const projection = taxonomyRecord?.projection;
    const data =
      routeData.status === "found" && routeData.data.kind === "listing_search"
        ? routeData.data
        : null;
    const enoughInventory = Boolean(
      data && data.total >= PROGRAMMATIC_SEO_THRESHOLDS.categoryInventory,
    );
    const hasArbitraryState = entries.some(
      ([key, value]) =>
        key !== "category" ||
        ![slug, node?.slug, node?.id].filter(Boolean).includes(value),
    );
    const canonicalPath =
      projection?.urlPattern ?? `/categorie/${encodeURIComponent(slug)}`;
    const nonCanonicalRoute = Boolean(
      projection && pathname !== projection.urlPattern,
    );
    const taxonomyAvailable = Boolean(
      node &&
      projection?.indexable &&
      taxonomyNodeIsIndexableInMarket(node, currentCountry),
    );
    const indexable = Boolean(
      taxonomyRecord &&
      taxonomyAvailable &&
      enoughInventory &&
      !hasArbitraryState &&
      !nonCanonicalRoute,
    );
    const heading = projection
      ? resolveLocalizedTaxonomySeoText(projection.h1, marketContext.locale)
      : slug.replace(/-/g, " ");
    const title = projection
      ? resolveLocalizedTaxonomySeoText(
          projection.titleTemplate,
          marketContext.locale,
        )
      : `${heading} — annonces`;
    const description = projection
      ? resolveLocalizedTaxonomySeoText(
          projection.descriptionTemplate,
          marketContext.locale,
        )
      : `Découvrez les annonces ${heading.toLocaleLowerCase(marketContext.locale || "fr")} actives sur Shongre en ${marketContext.country?.name || "votre pays"}.`;
    return base({
      knownRoute: Boolean(taxonomyRecord),
      indexable,
      follow: true,
      canonicalPath,
      title,
      description,
      resourceType: "category",
      lifecycle: taxonomyRecord
        ? taxonomyAvailable
          ? "available"
          : "inactive"
        : "missing",
      sitemapEligible: Boolean(projection?.sitemap.eligible && indexable),
      structuredDataEligible: Boolean(
        projection?.structuredData.length && indexable,
      ),
      exclusionReason: !taxonomyRecord
        ? "RESOURCE_MISSING"
        : nonCanonicalRoute
          ? "NON_CANONICAL_TAXONOMY_ROUTE"
          : !taxonomyAvailable
            ? "TAXONOMY_NOT_AVAILABLE"
            : hasArbitraryState
              ? "ARBITRARY_SEARCH_OR_FACET"
              : enoughInventory
                ? undefined
                : "INSUFFICIENT_INVENTORY",
      openGraphType: "website",
      alternateCountryCodes: data
        ? availableAlternates(data.availableCountryCodes, currentCountry)
        : [currentCountry],
      includeXDefault: false,
      taxonomyCategoryId: node?.id,
      taxonomyHeading: heading,
      taxonomyStructuredData: projection?.structuredData,
      ...(nonCanonicalRoute && projection
        ? { redirectPath: projection.urlPattern }
        : {}),
    });
  }

  const listingMatch = pathname.match(/^\/annonce\/([^/]+)$/);
  if (listingMatch) {
    const data =
      routeData.status === "found" && routeData.data.kind === "listing"
        ? routeData.data
        : null;
    if (!data) {
      return fallbackPolicy(marketContext, pathname, {
        knownRoute: true,
        resourceType: "listing",
        exclusionReason: "RESOURCE_MISSING",
      });
    }
    const listing = data.listing;
    const projectedCanonicalPath =
      typeof listing.attributes?.canonicalPath === "string" &&
      listing.attributes.canonicalPath.startsWith("/")
        ? normalizedPath(listing.attributes.canonicalPath)
        : null;
    if (projectedCanonicalPath && projectedCanonicalPath !== pathname) {
      return base({
        knownRoute: true,
        indexable: false,
        follow: true,
        canonicalPath: projectedCanonicalPath,
        title: listing.title,
        description: listing.description.slice(0, 300).trim(),
        resourceType: "listing",
        lifecycle: listing.status === "active" ? "available" : "inactive",
        sitemapEligible: false,
        structuredDataEligible: false,
        exclusionReason: "SERVER_CONTENT_NOT_VALIDATED",
        image: listing.coverImageUrl || listing.photos[0]?.url,
        openGraphType: "website",
        alternateCountryCodes: [],
        includeXDefault: false,
        redirectPath: projectedCanonicalPath,
      });
    }
    const active = listing.status === "active";
    const price = formatListingPrice(data, marketContext);
    return base({
      knownRoute: true,
      indexable: active,
      follow: true,
      canonicalPath: `/annonce/${encodeURIComponent(listing.id)}`,
      title: `${listing.title} — ${price} à ${listing.city}`,
      description:
        `${listing.title} à ${listing.city} (${listing.postalCode}) pour ${price}. ${listing.description}`
          .slice(0, 300)
          .trim(),
      resourceType: "listing",
      lifecycle: active ? "available" : "inactive",
      sitemapEligible: active,
      structuredDataEligible: active,
      exclusionReason: active ? undefined : "RESOURCE_INACTIVE",
      image: listing.coverImageUrl || listing.photos[0]?.url,
      openGraphType: "website",
      alternateCountryCodes: availableAlternates(
        listingMarketCodes(listing),
        currentCountry,
      ),
      includeXDefault: false,
      lastModified:
        listing.materiallyUpdatedAt || listing.updatedAt || listing.publishedAt,
    });
  }

  const sellerMatch = pathname.match(
    /^\/(boutique|profil|vendeur|u)\/([^/]+)$/,
  );
  if (sellerMatch) {
    const data =
      routeData.status === "found" && routeData.data.kind === "seller"
        ? routeData.data
        : null;
    if (!data) {
      return fallbackPolicy(marketContext, pathname, {
        knownRoute: true,
        resourceType: "seller_profile",
        exclusionReason: "RESOURCE_MISSING",
      });
    }
    const professional = isProSeller(data.seller);
    const segment = professional ? "boutique" : "profil";
    const canonicalPath = `/${segment}/${encodeURIComponent(data.seller.slug || data.seller.id)}`;
    const name = data.seller.companyName || data.seller.name;
    const enoughInventory =
      data.listings.length >= PROGRAMMATIC_SEO_THRESHOLDS.sellerInventory;
    const codes = Array.from(
      new Set(data.listings.flatMap((listing) => listingMarketCodes(listing))),
    );
    return base({
      knownRoute: true,
      indexable: enoughInventory,
      follow: true,
      canonicalPath,
      title: professional
        ? `${name} — boutique professionnelle`
        : `${name} — annonces du vendeur`,
      description:
        data.seller.bio?.trim() ||
        `Découvrez ${data.listings.length} annonce(s) active(s) de ${name}${data.seller.city ? ` à ${data.seller.city}` : ""} sur Shongre.`,
      resourceType: "seller_profile",
      lifecycle: "available",
      sitemapEligible: enoughInventory,
      structuredDataEligible: enoughInventory,
      exclusionReason: enoughInventory ? undefined : "INSUFFICIENT_INVENTORY",
      image: data.seller.avatarUrl,
      openGraphType: "profile",
      alternateCountryCodes: availableAlternates(codes, currentCountry),
      includeXDefault: false,
      lastModified: data.listings
        .map(
          (listing) =>
            listing.materiallyUpdatedAt ||
            listing.updatedAt ||
            listing.publishedAt,
        )
        .filter((value): value is string => Boolean(value))
        .sort()
        .at(-1),
      ...(pathname !== canonicalPath ? { redirectPath: canonicalPath } : {}),
    });
  }

  if (pathname === "/emploi") {
    const data =
      routeData.status === "found" &&
      routeData.data.kind === "employment_search"
        ? routeData.data
        : null;
    const hasArbitraryState = entries.length > 0;
    const enoughInventory = Boolean(data && data.total > 0);
    return base({
      knownRoute: true,
      indexable: !hasArbitraryState && enoughInventory,
      follow: true,
      canonicalPath: "/emploi",
      title: "Offres d’emploi",
      description: `Consultez les offres d’emploi actives publiées sur Shongre en ${marketContext.country?.name || "votre pays"}.`,
      resourceType: "job_collection",
      lifecycle: "available",
      sitemapEligible: !hasArbitraryState && enoughInventory,
      structuredDataEligible: false,
      exclusionReason: hasArbitraryState
        ? "ARBITRARY_SEARCH_OR_FACET"
        : enoughInventory
          ? undefined
          : "INSUFFICIENT_INVENTORY",
      openGraphType: "website",
      alternateCountryCodes: data
        ? availableAlternates(data.availableCountryCodes, currentCountry)
        : [currentCountry],
      includeXDefault: false,
    });
  }

  const jobMatch = pathname.match(/^\/emploi\/offre\/([^/]+)$/);
  if (jobMatch) {
    const data =
      routeData.status === "found" && routeData.data.kind === "job"
        ? routeData.data
        : null;
    if (!data) {
      return fallbackPolicy(marketContext, pathname, {
        knownRoute: true,
        resourceType: "job",
        exclusionReason: "RESOURCE_MISSING",
      });
    }
    const expires = new Date(data.job.expiresAt);
    const expired = Number.isFinite(expires.getTime()) && expires <= now;
    return base({
      knownRoute: true,
      indexable: !expired,
      follow: true,
      canonicalPath: `/emploi/offre/${encodeURIComponent(data.job.slug)}`,
      title: `${data.job.title} — ${data.job.employer.name}`,
      description: `${data.job.title} chez ${data.job.employer.name}, ${data.job.primaryLocation.label}. ${data.job.contractTypeLabel}, ${data.job.workingArrangementLabel}.`,
      resourceType: "job",
      lifecycle: expired ? "expired" : "available",
      sitemapEligible: !expired,
      structuredDataEligible: !expired,
      exclusionReason: expired ? "RESOURCE_EXPIRED" : undefined,
      image: data.job.employer.logoUrl,
      openGraphType: "article",
      alternateCountryCodes: [currentCountry],
      includeXDefault: false,
      lastModified: data.job.publishedAt,
    });
  }

  const collectionMatch = pathname.match(/^\/collections\/([^/]+)$/);
  if (collectionMatch) {
    const data =
      routeData.status === "found" && routeData.data.kind === "collection"
        ? routeData.data
        : null;
    if (!data) {
      return fallbackPolicy(marketContext, pathname, {
        knownRoute: true,
        resourceType: "collection",
        exclusionReason: "RESOURCE_MISSING",
      });
    }
    const enoughInventory =
      data.listings.length >= PROGRAMMATIC_SEO_THRESHOLDS.collectionInventory;
    const canonicalPath = `/collections/${encodeURIComponent(data.collection.slug)}`;
    return base({
      knownRoute: true,
      indexable: enoughInventory,
      follow: true,
      canonicalPath,
      title: data.collection.title,
      description: data.collection.description,
      resourceType: "collection",
      lifecycle: "available",
      sitemapEligible: enoughInventory,
      structuredDataEligible: enoughInventory,
      exclusionReason: enoughInventory ? undefined : "INSUFFICIENT_INVENTORY",
      image: data.collection.coverImageUrl,
      openGraphType: "website",
      alternateCountryCodes: availableAlternates(
        data.availableCountryCodes,
        currentCountry,
      ),
      includeXDefault: false,
      ...(pathname !== canonicalPath ? { redirectPath: canonicalPath } : {}),
    });
  }

  const staticPage = STATIC_PAGES[pathname];
  if (staticPage) {
    return base({
      knownRoute: true,
      indexable: true,
      follow: true,
      canonicalPath: pathname,
      title: staticPage.title,
      description: staticPage.description,
      resourceType: staticPage.resourceType,
      lifecycle: "not_applicable",
      sitemapEligible: staticPage.sitemapEligible,
      structuredDataEligible: pathname === "/" || pathname === "/categories",
      openGraphType: "website",
      alternateCountryCodes: staticPage.alternate
        ? allMarkets
        : [currentCountry],
      includeXDefault: pathname === "/",
    });
  }

  if (KNOWN_NOINDEX_PUBLIC_PATTERNS.some((pattern) => pattern.test(pathname))) {
    return base({
      knownRoute: true,
      indexable: false,
      follow: true,
      canonicalPath: pathname,
      title: "Contenu public Shongre",
      description: DEFAULT_DESCRIPTION,
      resourceType: "static_content",
      lifecycle: "available",
      sitemapEligible: false,
      structuredDataEligible: false,
      exclusionReason: "SERVER_CONTENT_NOT_VALIDATED",
      openGraphType: "website",
      alternateCountryCodes: [],
      includeXDefault: false,
    });
  }

  return fallbackPolicy(marketContext, pathname);
}

function breadcrumb(
  context: MarketContext,
  trail: { name: string; path?: string }[],
): StructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.path
        ? {
            item: buildPublicUrl({
              country: context.countryCode!,
              route: item.path,
              infrastructure: context.infrastructure,
            }),
          }
        : {}),
    })),
  };
}

export function structuredDataForPolicy(
  policy: SeoRoutePolicy,
  context: MarketContext,
  routeData: PublicRouteDataResolution,
): StructuredData[] {
  if (!policy.structuredDataEligible) return [];
  const data = routeData.status === "found" ? routeData.data : null;

  if (policy.resourceType === "home") {
    const origin = new URL(policy.canonicalUrl).origin;
    return [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Shongre",
        url: origin,
        logo: new URL("/favicon.svg", origin).toString(),
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Shongre",
        url: policy.canonicalUrl,
        inLanguage: context.locale || undefined,
      },
    ];
  }

  if (data?.kind === "listing") {
    const listing = data.listing;
    const origin = new URL(policy.canonicalUrl).origin;
    return [
      {
        "@context": "https://schema.org",
        "@type": "Product",
        name: listing.title,
        description: listing.description,
        category: listing.categoryLabel,
        ...(listing.coverImageUrl
          ? { image: [new URL(listing.coverImageUrl, origin).toString()] }
          : {}),
        offers: {
          "@type": "Offer",
          price: listing.isFreeDonation ? 0 : listing.price,
          priceCurrency: listing.currency || context.currency || "EUR",
          availability: "https://schema.org/InStock",
          itemCondition: "https://schema.org/UsedCondition",
          url: policy.canonicalUrl,
          seller: {
            "@type": isProSeller(data.seller) ? "Organization" : "Person",
            name:
              data.seller?.companyName ||
              data.seller?.name ||
              listing.sellerName,
          },
        },
      },
      breadcrumb(context, [
        { name: "Accueil", path: "/" },
        {
          name: listing.categoryLabel,
          path: `/categorie/${listing.categorySlug}`,
        },
        { name: listing.title },
      ]),
    ];
  }

  if (data?.kind === "seller") {
    const seller = data.seller;
    const professional = isProSeller(seller);
    return [
      {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        url: policy.canonicalUrl,
        mainEntity: {
          "@type": professional ? "Organization" : "Person",
          name: seller.companyName || seller.name,
          url: policy.canonicalUrl,
          ...(seller.avatarUrl ? { image: seller.avatarUrl } : {}),
          ...(seller.city
            ? {
                address: {
                  "@type": "PostalAddress",
                  addressLocality: seller.city,
                  addressCountry: seller.country || context.countryCode,
                },
              }
            : {}),
        },
      },
      breadcrumb(context, [
        { name: "Accueil", path: "/" },
        ...(professional
          ? [{ name: "Professionnels", path: "/professionnels" }]
          : []),
        { name: seller.companyName || seller.name },
      ]),
    ];
  }

  if (data?.kind === "job") {
    const job = data.job;
    return [
      {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        title: job.title,
        description: [
          job.employerDescription,
          ...job.responsibilities,
          job.qualificationSummary,
        ]
          .filter(Boolean)
          .join("\n\n"),
        datePosted: job.publishedAt,
        validThrough: job.expiresAt,
        employmentType: job.contractTypeLabel,
        hiringOrganization: {
          "@type": "Organization",
          name: job.employer.name,
          ...(job.employer.logoUrl ? { logo: job.employer.logoUrl } : {}),
        },
        ...(job.workingArrangementId.endsWith(".remote")
          ? { jobLocationType: "TELECOMMUTE" }
          : {}),
        jobLocation: {
          "@type": "Place",
          address: {
            "@type": "PostalAddress",
            addressLocality: job.primaryLocation.city,
            postalCode: job.primaryLocation.postalCode,
            addressCountry: job.primaryLocation.countryCode,
          },
        },
        url: policy.canonicalUrl,
      },
      breadcrumb(context, [
        { name: "Accueil", path: "/" },
        { name: "Emploi", path: "/emploi" },
        { name: job.title },
      ]),
    ];
  }

  if (data?.kind === "collection") {
    return [
      breadcrumb(context, [
        { name: "Accueil", path: "/" },
        { name: "Collections", path: "/collections" },
        { name: data.collection.title },
      ]),
    ];
  }

  if (policy.resourceType === "category") {
    const configuredTypes = new Set(policy.taxonomyStructuredData ?? []);
    const entries: StructuredData[] = [];
    const heading =
      policy.taxonomyHeading || policy.title.replace(/\s*[|—].*$/, "");
    if (configuredTypes.has("CollectionPage")) {
      entries.push({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: heading,
        description: policy.description,
        url: policy.canonicalUrl,
        inLanguage: context.locale || undefined,
      });
    }
    if (
      configuredTypes.has("ItemList") &&
      data?.kind === "listing_search" &&
      data.items.length
    ) {
      entries.push({
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: heading,
        numberOfItems: data.total,
        itemListElement: data.items.map((listing, index) => {
          const projectedPath =
            typeof listing.attributes?.canonicalPath === "string" &&
            listing.attributes.canonicalPath.startsWith("/")
              ? normalizedPath(listing.attributes.canonicalPath)
              : `/annonce/${encodeURIComponent(listing.id)}`;
          return {
            "@type": "ListItem",
            position: index + 1,
            name: listing.title,
            url: buildPublicUrl({
              country: context.countryCode!,
              route: projectedPath,
              infrastructure: context.infrastructure,
            }),
          };
        }),
      });
    }
    entries.push(
      breadcrumb(context, [
        { name: "Accueil", path: "/" },
        { name: "Catégories", path: "/categories" },
        { name: heading },
      ]),
    );
    return entries;
  }

  return [];
}

export function serializeStructuredData(entries: StructuredData[]): string[] {
  return entries.map((entry) => JSON.stringify(entry).replace(/</g, "\\u003c"));
}

export function pageMetaForPolicy(
  policy: SeoRoutePolicy,
  structuredData: StructuredData[] = [],
): PageMeta {
  return {
    title: policy.title,
    description: policy.description,
    canonicalPath: policy.canonicalPath,
    image: policy.image,
    type: policy.openGraphType,
    noIndex: !policy.indexable,
    follow: policy.follow,
    alternateCountries: policy.alternateCountryCodes,
    includeXDefault: policy.includeXDefault,
    structuredData,
  };
}
