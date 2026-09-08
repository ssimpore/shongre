import {
  isActiveMarketResolvedListingPromotion,
  type MarketResolvedListingPromotion,
} from "@shongre/contracts/discovery";
import type {
  ListingCardView,
  ListingCharacteristicIcon,
} from "@shongre/contracts/listings";
import type { MarketCode, Money } from "@shongre/contracts/primitives";
import type { MoneyConversionProjection } from "@shongre/contracts/currency";
import { localizeTaxonomyLabels } from "@shongre/contracts/taxonomy-labels";
import type { VehiclePublic } from "@shongre/contracts/auto";
import type {
  EmploymentCatalog,
  JobPostingCard,
  SalaryRange,
} from "@shongre/contracts/employment";
import type { PropertyPublic } from "@shongre/contracts/real-estate";
import {
  formatProjectedMoney,
  type MoneyDisplayConverter,
} from "../../utilities/formatters";
import {
  getListingPeriodLabel,
  getListingPriceCopy,
} from "./listing-price.presentation";

interface ListingDecisionDetail {
  label: string;
  icon: ListingCharacteristicIcon;
}

const VEHICLE_FUEL_LABELS = {
  fr: {
    petrol: "Essence",
    diesel: "Diesel",
    electric: "Électrique",
    hybrid: "Hybride",
    plug_in_hybrid: "Hybride rechargeable",
    lpg: "GPL",
    hydrogen: "Hydrogène",
    other: "Autre",
  },
  en: {
    petrol: "Petrol",
    diesel: "Diesel",
    electric: "Electric",
    hybrid: "Hybrid",
    plug_in_hybrid: "Plug-in hybrid",
    lpg: "LPG",
    hydrogen: "Hydrogen",
    other: "Other",
  },
} as const;

function isFrench(locale: string) {
  return locale.toLowerCase().startsWith("fr");
}

function decisionDetailsProjection(details: ListingDecisionDetail[]) {
  return {
    characteristics: details.map(({ label }) => label),
    characteristicIcons: details.map(({ icon }) => icon),
  };
}

function presentPropertyDecisionDetails(
  property: PropertyPublic,
  locale: string,
): ListingDecisionDetail[] {
  const details: Array<ListingDecisionDetail | undefined> = [
    property.characteristics?.livingAreaSquareMeters > 0
      ? {
          label: `${new Intl.NumberFormat(locale).format(
            property.characteristics.livingAreaSquareMeters,
          )} m²`,
          icon: "ruler",
        }
      : undefined,
    property.characteristics?.rooms > 0
      ? {
          label: `${new Intl.NumberFormat(locale).format(
            property.characteristics.rooms,
          )} ${
            isFrench(locale)
              ? property.characteristics.rooms > 1
                ? "pièces"
                : "pièce"
              : property.characteristics.rooms > 1
                ? "rooms"
                : "room"
          }`,
          icon: "layout-grid",
        }
      : undefined,
    property.energy?.dpeClass
      ? { label: `DPE ${property.energy.dpeClass}`, icon: "home" }
      : undefined,
  ];
  return details.filter((detail): detail is ListingDecisionDetail =>
    Boolean(detail),
  );
}

function presentVehicleDecisionDetails(
  vehicle: VehiclePublic,
  locale: string,
): ListingDecisionDetail[] {
  const technical = vehicle.technical;
  if (!technical) return [];
  return [
    { label: String(technical.modelYear), icon: "calendar" },
    {
      label: `${new Intl.NumberFormat(locale).format(technical.mileage)} ${technical.mileageUnit}`,
      icon: "gauge",
    },
    {
      label:
        VEHICLE_FUEL_LABELS[isFrench(locale) ? "fr" : "en"][technical.fuelType],
      icon: "fuel",
    },
  ];
}

function presentEmploymentDecisionDetails(
  job: JobPostingCard,
): ListingDecisionDetail[] {
  const details: ListingDecisionDetail[] = [
    { label: job.contractTypeLabel, icon: "briefcase" },
    { label: job.workingArrangementLabel, icon: "laptop" },
    { label: job.professionLabel, icon: "briefcase" },
  ];
  return details.filter(
    ({ label }, index) =>
      label.trim().length > 0 &&
      details.findIndex(({ label: other }) => other === label) === index,
  );
}

function presentVehicleResponseTime(
  responseTimeMinutes: number | undefined,
  locale: string,
) {
  if (responseTimeMinutes === undefined) return undefined;
  const hours = Math.floor(responseTimeMinutes / 60);
  const minutes = responseTimeMinutes % 60;
  const duration = [
    hours ? `${hours} h` : undefined,
    minutes || !hours ? `${minutes} min` : undefined,
  ]
    .filter(Boolean)
    .join(" ");
  return `${isFrench(locale) ? "Répond en" : "Replies in"} ${duration}`;
}

function formatMoney(
  money: Money,
  locale: string,
  convertMoney?: MoneyDisplayConverter,
): string {
  return formatProjectedMoney(money, {
    locale,
    convertMoney,
    compact: true,
  });
}

function salaryLabel(
  salary: SalaryRange | undefined,
  catalog: EmploymentCatalog | null | undefined,
  locale: string,
  convertMoney?: (money: Money) => MoneyConversionProjection,
): string {
  const copy = getListingPriceCopy(locale);
  if (!salary?.isPublic) return copy.salaryUndisclosed;
  const minimum = salary.minimum
    ? formatMoney(salary.minimum, locale, convertMoney)
    : "";
  const maximum = salary.maximum
    ? formatMoney(salary.maximum, locale, convertMoney)
    : "";
  const range =
    minimum && maximum
      ? `${minimum} – ${maximum}`
      : minimum || maximum || copy.salaryDisclosed;
  const frequencyCode = salary.frequencyId.split(".").at(-1) as Parameters<
    typeof getListingPeriodLabel
  >[0];
  const knownFrequency = ["hour", "day", "week", "month", "year"].includes(
    frequencyCode,
  )
    ? getListingPeriodLabel(frequencyCode, locale, "frequency")
    : undefined;
  const catalogFrequency = catalog?.dictionaries.find(
    (entry) => entry.id === salary.frequencyId,
  )?.label;
  const frequency =
    knownFrequency ||
    (locale.toLowerCase().startsWith("fr")
      ? catalogFrequency?.toLocaleLowerCase(locale)
      : undefined);
  return `${range}${frequency ? ` · ${frequency}` : ""}`;
}

function resolvePromotionForMarket(
  promotion: MarketResolvedListingPromotion | undefined,
  marketCode: MarketCode,
): ListingCardView["promotion"] {
  if (!isActiveMarketResolvedListingPromotion(promotion, marketCode))
    return undefined;
  return {
    state: promotion.state,
    type: promotion.type,
    marketCode: promotion.marketCode,
    startsAt: promotion.startsAt,
    endsAt: promotion.endsAt,
    promotedAt: promotion.promotedAt,
    source: promotion.source,
    sourceId: promotion.sourceId,
    label: promotion.label,
  };
}

export function presentPropertyListingCard(
  property: PropertyPublic,
  locale: string,
  marketCode: MarketCode,
  convertMoney?: (money: Money) => MoneyConversionProjection,
): ListingCardView {
  const priceProjection = convertMoney?.(property.financials.price);
  const displayPrice = priceProjection?.display || property.financials.price;
  const promotion = resolvePromotionForMarket(
    property.resolvedPromotion,
    marketCode,
  );
  const decisionDetails = decisionDetailsProjection(
    presentPropertyDecisionDetails(property, locale),
  );
  return {
    id: property.id,
    title: property.title,
    price: displayPrice,
    priceKind: "amount",
    priceLabel: `${formatMoney(
      property.financials.price,
      locale,
      convertMoney,
    )}${getListingPeriodLabel(property.financials.period, locale)}`,
    imageUrl: property.media.photos[0],
    city: property.address.publicLabel,
    marketCode,
    categoryLabel: localizeTaxonomyLabels(
      property.taxonomy?.rootLabels,
      locale,
    ),
    conditionLabel: "",
    publisherType:
      property.seller.type === "owner" ? "private" : "professional",
    ...decisionDetails,
    publishedAt: property.publishedAt,
    photoCount: property.media.photos.length,
    isNegotiable: property.financials.isNegotiable,
    seller: {
      id: property.seller.id,
      name: property.seller.displayName,
      sellerType: property.seller.type === "owner" ? "individual" : "pro",
      avatarUrl: property.seller.logoUrl,
      city: property.address.city,
      isIdentityVerified: property.seller.verificationLabels.length > 0,
      rating: property.seller.rating,
      reviewCount: property.seller.reviewCount,
      isBusinessVerified: property.seller.verificationLabels.length > 0,
      responseTimeLabel: property.seller.responseTimeLabel,
    },
    isUrgent: promotion?.type === "urgent_badge",
    isFeatured: Boolean(promotion && promotion.type !== "urgent_badge"),
    promotion,
  };
}

export function presentVehicleListingCard(
  vehicle: VehiclePublic,
  locale: string,
  marketCode: MarketCode,
  convertMoney?: (money: Money) => MoneyConversionProjection,
): ListingCardView {
  const priceProjection = convertMoney?.(vehicle.price);
  const promotion = resolvePromotionForMarket(
    vehicle.resolvedPromotion,
    marketCode,
  );
  const decisionDetails = decisionDetailsProjection(
    presentVehicleDecisionDetails(vehicle, locale),
  );
  return {
    id: vehicle.id,
    title: vehicle.title,
    price: priceProjection?.display || vehicle.price,
    priceKind: "amount",
    priceLabel: priceProjection?.estimated
      ? formatMoney(vehicle.price, locale, convertMoney)
      : undefined,
    imageUrl: vehicle.mediaUrls[0],
    city: vehicle.locationLabel,
    marketCode,
    categoryLabel: localizeTaxonomyLabels(vehicle.taxonomy?.rootLabels, locale),
    brandLabel: vehicle.makeLabel,
    conditionLabel: "",
    publisherType:
      vehicle.seller.type === "dealer" ? "professional" : "private",
    ...decisionDetails,
    publishedAt: vehicle.publishedAt,
    photoCount: vehicle.mediaUrls.length,
    isNegotiable: vehicle.priceNegotiable,
    seller: {
      id: vehicle.seller.id,
      name: vehicle.seller.displayName,
      sellerType: vehicle.seller.type === "dealer" ? "pro" : "individual",
      avatarUrl: vehicle.seller.logoUrl,
      city: vehicle.seller.locationLabel,
      isIdentityVerified: vehicle.trust.sellerIdentity === "verified",
      rating: vehicle.seller.rating,
      reviewCount: vehicle.seller.reviewCount,
      isBusinessVerified: vehicle.seller.verifiedBusiness,
      responseTimeLabel: presentVehicleResponseTime(
        vehicle.seller.responseTimeMinutes,
        locale,
      ),
    },
    isUrgent: promotion?.type === "urgent_badge",
    isFeatured: Boolean(promotion && promotion.type !== "urgent_badge"),
    promotion,
  };
}

export function presentEmploymentListingCard(
  job: JobPostingCard,
  catalog: EmploymentCatalog | null | undefined,
  locale: string,
  marketCode: MarketCode,
  convertMoney?: (money: Money) => MoneyConversionProjection,
): ListingCardView {
  const representativePrice = job.salary?.isPublic
    ? job.salary.minimum || job.salary.maximum
    : undefined;
  const priceProjection = representativePrice
    ? convertMoney?.(representativePrice)
    : undefined;
  const promotion = resolvePromotionForMarket(
    job.resolvedPromotion,
    marketCode,
  );
  const decisionDetails = decisionDetailsProjection(
    presentEmploymentDecisionDetails(job),
  );
  return {
    id: job.id,
    title: job.title,
    price: priceProjection?.display || representativePrice,
    priceKind: representativePrice ? "amount" : "unpriced",
    priceLabel: salaryLabel(job.salary, catalog, locale, convertMoney),
    imageUrl: job.employer.logoUrl,
    city: job.primaryLocation.label,
    marketCode,
    categoryLabel: localizeTaxonomyLabels(job.taxonomy?.rootLabels, locale),
    conditionLabel: "",
    publisherType: job.employer.organizationId ? "professional" : "private",
    ...decisionDetails,
    publishedAt: job.publishedAt,
    seller: {
      id: job.employer.id,
      name: job.employer.name,
      sellerType: job.employer.organizationId ? "pro" : "individual",
      avatarUrl: job.employer.logoUrl,
      city: job.primaryLocation.city,
      isIdentityVerified: job.employer.isPubliclyVerified,
      rating: job.employer.rating,
      reviewCount: job.employer.reviewCount,
      isBusinessVerified: job.employer.isPubliclyVerified,
    },
    isUrgent: promotion?.type === "urgent_badge",
    isFeatured: Boolean(promotion && promotion.type !== "urgent_badge"),
    promotion,
  };
}
