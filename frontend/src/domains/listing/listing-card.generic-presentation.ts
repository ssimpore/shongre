import type {
  ListingCharacteristicIcon,
  ListingCardView,
  Money,
  MoneyConversionProjection,
} from "@shongre/contracts";
import { getTaxonomyV4CardBrandLabel } from "@shongre/contracts/taxonomy-v4-card";
import type { Listing } from "../../types";
import { getListingCategoryLabel } from "../taxonomy/listing-category.display";
import { resolveListingPhotoUrl } from "./listing-media";
import { resolveGenericListingPrice } from "./listing-price.presentation";

export interface GenericListingCardPricing {
  currentPrice: Money;
}

const CARD_ATTRIBUTE_GROUPS: Record<string, readonly (readonly string[])[]> = {
  vehicles: [["model_year", "year"], ["mileage"], ["fuel_type", "fuel"]],
  vehicules: [["model_year", "year"], ["mileage"], ["fuel_type", "fuel"]],
  real_estate: [
    ["rooms"],
    ["living_area", "livingAreaSquareMeters"],
    ["dpe_class", "dpeClass"],
  ],
  immobilier: [
    ["rooms"],
    ["living_area", "livingAreaSquareMeters"],
    ["dpe_class", "dpeClass"],
  ],
  jobs: [
    ["contractType", "contract_type"],
    ["workingArrangement", "working_arrangement", "remote_work"],
    ["profession", "professionLabel"],
  ],
  emploi: [
    ["contractType", "contract_type"],
    ["workingArrangement", "working_arrangement", "remote_work"],
    ["profession", "professionLabel"],
  ],
  education: [
    ["subject", "serviceType", "service_type"],
    ["deliveryModes", "delivery_mode"],
    ["audience_level", "level"],
  ],
  animaux: [["petType", "pet_type"], ["material"], ["size"]],
  electronics: [["storage", "storage_capacity_gb"], ["model"], ["color"]],
  electronique: [["storage", "storage_capacity_gb"], ["model"], ["color"]],
  fashion: [["size"], ["clothing_category", "clothingCategory"], ["material"]],
  mode: [["size"], ["clothing_category", "clothingCategory"], ["material"]],
  home_garden: [["furniture_type"], ["material"], ["dimensions_width"]],
  maison: [["furniture_type"], ["material"], ["dimensions_width"]],
  "maison-deco": [["furniture_type"], ["material"], ["dimensions_width"]],
};

const INTERNAL_ATTRIBUTE_KEYS = new Set([
  "canonicalPath",
  "verticalEntityId",
  "verticalSchemaVersion",
  "verticalType",
  "price_type",
]);

const VALUE_LABELS: Record<string, { fr: string; en: string }> = {
  apartment: { fr: "Appartement", en: "Apartment" },
  house: { fr: "Maison", en: "House" },
  permanent: { fr: "CDI", en: "Permanent" },
  fixed_term: { fr: "CDD", en: "Fixed-term" },
  temporary: { fr: "Intérim", en: "Temporary" },
  apprenticeship: { fr: "Alternance", en: "Apprenticeship" },
  internship: { fr: "Stage", en: "Internship" },
  seasonal: { fr: "Saisonnier", en: "Seasonal" },
  online: { fr: "En ligne", en: "Online" },
  in_person: { fr: "En présentiel", en: "In person" },
  children: { fr: "Enfants", en: "Children" },
  teenagers: { fr: "Adolescents", en: "Teenagers" },
  adults: { fr: "Adultes", en: "Adults" },
  petrol: { fr: "Essence", en: "Petrol" },
  essence: { fr: "Essence", en: "Petrol" },
  diesel: { fr: "Diesel", en: "Diesel" },
  electric: { fr: "Électrique", en: "Electric" },
  hybrid: { fr: "Hybride", en: "Hybrid" },
  automatic: { fr: "Automatique", en: "Automatic" },
  manual: { fr: "Manuelle", en: "Manual" },
  remote: { fr: "Télétravail", en: "Remote" },
  fully_remote: { fr: "Télétravail", en: "Remote" },
  onsite: { fr: "Sur site", en: "On-site" },
  hybrid_work: { fr: "Hybride", en: "Hybrid" },
};

const ATTRIBUTE_ICON_BY_KEY: Readonly<
  Record<string, ListingCharacteristicIcon>
> = {
  audience_level: "book-open",
  clothing_category: "shirt",
  clothingCategory: "shirt",
  color: "tag",
  contract_type: "briefcase",
  contractType: "briefcase",
  delivery_mode: "laptop",
  deliveryModes: "laptop",
  dimensions_width: "ruler",
  dpe_class: "home",
  dpeClass: "home",
  fuel: "fuel",
  fuel_type: "fuel",
  furniture_type: "home",
  living_area: "ruler",
  livingAreaSquareMeters: "ruler",
  material: "layers",
  mileage: "gauge",
  model: "tag",
  model_year: "calendar",
  pet_type: "tag",
  petType: "tag",
  profession: "briefcase",
  professionLabel: "briefcase",
  remote_work: "laptop",
  rooms: "layout-grid",
  service_type: "book-open",
  serviceType: "book-open",
  size: "ruler",
  storage: "database",
  storage_capacity_gb: "database",
  subject: "book-open",
  working_arrangement: "laptop",
  workingArrangement: "laptop",
  year: "calendar",
};

export interface GenericListingCardCharacteristic {
  icon: ListingCharacteristicIcon;
  label: string;
}

function characteristicIconForKey(key: string): ListingCharacteristicIcon {
  const known = ATTRIBUTE_ICON_BY_KEY[key];
  if (known) return known;

  const normalized = key.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
  if (/(?:year|date|age)/u.test(normalized)) return "calendar";
  if (/(?:mileage|distance|odometer|speed)/u.test(normalized)) return "gauge";
  if (/(?:fuel|energy|motor)/u.test(normalized)) return "fuel";
  if (/(?:area|dimension|height|length|size|width)/u.test(normalized))
    return "ruler";
  if (/(?:room|bedroom)/u.test(normalized)) return "layout-grid";
  if (/(?:contract|job|profession|trade)/u.test(normalized)) return "briefcase";
  if (/(?:digital|online|remote|software)/u.test(normalized)) return "laptop";
  if (/(?:capacity|memory|storage)/u.test(normalized)) return "database";
  if (/(?:clothing|garment|shirt)/u.test(normalized)) return "shirt";
  if (/(?:material|composition|type|category)/u.test(normalized))
    return "layers";
  return "tag";
}

function humanize(value: string, language: "fr" | "en"): string {
  const normalized = value.trim().toLocaleLowerCase("fr-FR");
  const known = VALUE_LABELS[normalized];
  if (known) return known[language];
  const spaced = value.replace(/[_-]+/g, " ").trim();
  return spaced ? spaced.charAt(0).toLocaleUpperCase() + spaced.slice(1) : "";
}

function formatAttribute(
  key: string,
  value: unknown,
  attributes: Listing["attributes"],
  locale: string,
): string {
  if (value === undefined || value === null || value === "") return "";
  const language = locale.toLocaleLowerCase().startsWith("en") ? "en" : "fr";
  if (Array.isArray(value)) {
    return value
      .map((entry) => formatAttribute(key, entry, attributes, locale))
      .filter(Boolean)
      .join(", ");
  }
  if (typeof value === "boolean") {
    return value
      ? language === "fr"
        ? "Oui"
        : "Yes"
      : language === "fr"
        ? "Non"
        : "No";
  }
  if (["model_year", "year"].includes(key)) return String(value);
  if (key === "mileage") {
    const numeric = Number(value);
    const formatted = Number.isFinite(numeric)
      ? new Intl.NumberFormat(locale).format(numeric)
      : String(value);
    return `${formatted} ${String(attributes.mileage_unit || "km")}`;
  }
  if (["living_area", "livingAreaSquareMeters", "land_area"].includes(key)) {
    const numeric = Number(value);
    const formatted = Number.isFinite(numeric)
      ? new Intl.NumberFormat(locale).format(numeric)
      : String(value);
    return `${formatted} m²`;
  }
  if (key === "rooms") {
    const numeric = Number(value);
    return language === "fr"
      ? `${value} pièce${numeric > 1 ? "s" : ""}`
      : `${value} room${numeric === 1 ? "" : "s"}`;
  }
  if (["dpe_class", "dpeClass"].includes(key)) return `DPE ${String(value)}`;
  if (key === "storage_capacity_gb") {
    return `${new Intl.NumberFormat(locale).format(Number(value))} ${language === "fr" ? "Go" : "GB"}`;
  }
  if (key === "storage" && typeof value === "string") {
    return language === "fr" ? value.replace(/gb\b/iu, "Go") : value;
  }
  if (typeof value === "number")
    return new Intl.NumberFormat(locale).format(value);
  return humanize(String(value), language);
}

/**
 * Project up to three real decision attributes for detail-rich card variants.
 * Explicit category groups avoid leaking internal projection metadata, while
 * the bounded fallback lets newly introduced taxonomy families degrade safely.
 */
export function getGenericListingCardCharacteristicPresentation(
  listing: Pick<Listing, "attributes" | "categorySlug" | "subCategorySlug">,
  locale: string,
): GenericListingCardCharacteristic[] {
  const attributes = listing.attributes || {};
  const groups =
    CARD_ATTRIBUTE_GROUPS[listing.categorySlug] ||
    CARD_ATTRIBUTE_GROUPS[listing.subCategorySlug] ||
    Object.keys(attributes)
      .filter((key) => !INTERNAL_ATTRIBUTE_KEYS.has(key))
      .map((key) => [key]);

  const values = groups.flatMap((group) => {
    const key = group.find(
      (candidate) =>
        attributes[candidate] !== undefined && attributes[candidate] !== null,
    );
    if (!key) return [];
    const formatted = formatAttribute(key, attributes[key], attributes, locale);
    return formatted
      ? [{ icon: characteristicIconForKey(key), label: formatted }]
      : [];
  });

  return values
    .filter(
      (value, index) =>
        values.findIndex((candidate) => candidate.label === value.label) ===
        index,
    )
    .slice(0, 3);
}

/**
 * Preserve the owning vertical's canonical route without accepting a
 * protocol-relative or otherwise external destination from listing data.
 */
export function getGenericListingCardHref(
  listing: Pick<Listing, "id"> & Partial<Pick<Listing, "attributes">>,
): string {
  const configuredPath = listing.attributes?.canonicalPath;
  return typeof configuredPath === "string" &&
    configuredPath.startsWith("/") &&
    !configuredPath.startsWith("//")
    ? configuredPath
    : `/annonce/${listing.id}`;
}

/**
 * Return only a publisher-provided brand. The compact card never guesses one
 * from its title, model, seller, or category.
 */
export function getGenericListingBrandLabel(
  listing: Pick<Listing, "attributes">,
  locale = "fr-FR",
): string | undefined {
  const brand = listing.attributes?.brand;
  if (typeof brand !== "string" || !brand.trim()) return undefined;
  return getTaxonomyV4CardBrandLabel(brand, locale) || brand.trim();
}

/**
 * A generic promotion is safe to use only on the exact market projection and
 * while every piece of authoritative provenance and schedule evidence exists.
 * Legacy `isBoosted` / `boostType` flags are deliberately ignored.
 */
export function hasActiveGenericListingPromotion(
  listing: Pick<
    Listing,
    | "marketCode"
    | "promotionState"
    | "promotionType"
    | "promotionSource"
    | "promotionSourceId"
    | "promotionStartAt"
    | "promotionEndAt"
  >,
  requestedMarketCode: string | undefined,
  now = Date.now(),
): boolean {
  if (
    !requestedMarketCode ||
    listing.marketCode?.toUpperCase() !== requestedMarketCode.toUpperCase() ||
    listing.promotionState !== "active" ||
    !listing.promotionType ||
    !listing.promotionSource ||
    !listing.promotionSourceId?.trim()
  ) {
    return false;
  }

  const startsAt = Date.parse(listing.promotionStartAt ?? "");
  const endsAt = Date.parse(listing.promotionEndAt ?? "");
  return (
    Number.isFinite(startsAt) &&
    Number.isFinite(endsAt) &&
    startsAt <= now &&
    endsAt > now
  );
}

/** Pure generic-listing projection shared by cards, map markers and details. */
export function projectGenericListingCardView(
  listing: Listing,
  locale: string,
  requestedMarketCode: string,
  pricing?: GenericListingCardPricing,
  convertMoney?: (money: Money) => MoneyConversionProjection,
): ListingCardView {
  const listingMarketCode = listing.marketCode ?? requestedMarketCode;
  const isRequestedMarket =
    listingMarketCode.toUpperCase() === requestedMarketCode.toUpperCase();
  const currency = listing.currency ?? listing.pricePresentation?.currency;
  const price = pricing
    ? { kind: "amount" as const, money: pricing.currentPrice }
    : resolveGenericListingPrice(
        {
          price: listing.price,
          currency,
          isFreeDonation: listing.isFreeDonation,
          priceType: listing.attributes?.price_type,
          pricePresentation: listing.pricePresentation,
        },
        locale,
        convertMoney,
      );
  const hasActivePromotion = hasActiveGenericListingPromotion(
    listing,
    requestedMarketCode,
  );
  const promotion: ListingCardView["promotion"] = hasActivePromotion
    ? {
        state: "active",
        type: listing.promotionType!,
        marketCode: listingMarketCode,
        source: listing.promotionSource!,
        sourceId: listing.promotionSourceId!,
        startsAt: listing.promotionStartAt!,
        endsAt: listing.promotionEndAt!,
        promotedAt: listing.promotedAt,
        label: listing.promotionLabel,
      }
    : undefined;
  const brandLabel = getGenericListingBrandLabel(listing, locale);
  const characteristicPresentation =
    getGenericListingCardCharacteristicPresentation(listing, locale).filter(
      ({ label }) =>
        !brandLabel ||
        label.toLocaleLowerCase(locale) !==
          brandLabel.toLocaleLowerCase(locale),
    );

  return {
    id: listing.id,
    title: listing.title,
    price: price.kind === "amount" ? price.money : undefined,
    priceLabel: pricing ? undefined : price.label,
    priceKind: price.kind,
    imageUrl: resolveListingPhotoUrl(
      listing.coverImageUrl || listing.photos?.[0],
    ),
    city: listing.city,
    marketCode: listingMarketCode,
    categoryLabel: getListingCategoryLabel(listing, locale),
    brandLabel,
    conditionLabel: "",
    publisherType:
      listing.publisherType ??
      (listing.sellerType === "pro" ? "professional" : "private"),
    characteristics: characteristicPresentation.map(({ label }) => label),
    characteristicIcons: characteristicPresentation.map(({ icon }) => icon),
    publishedAt: listing.publishedAt,
    seller: {
      id: listing.sellerId,
      name: listing.sellerName,
      sellerType: listing.sellerType,
      avatarUrl: listing.sellerAvatarUrl,
      city: listing.sellerCity,
      isIdentityVerified: listing.sellerIsVerified,
      rating: listing.sellerRating,
      reviewCount: listing.sellerReviewCount,
      organizationName: listing.publisherOrganizationName,
      organizationLogoUrl: listing.publisherOrganizationLogoUrl,
      branchName: listing.publisherBranchName,
      isBusinessVerified:
        listing.publisherVerificationStatus === "business_verified",
      responseTimeLabel: listing.sellerResponseTimeLabel,
    },
    isUrgent: promotion?.type === "urgent_badge",
    isFeatured: Boolean(promotion && promotion.type !== "urgent_badge"),
    promotion,
    discovery: isRequestedMarket ? listing.discovery : undefined,
  };
}
