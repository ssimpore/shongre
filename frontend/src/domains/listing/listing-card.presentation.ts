import type { ListingCardView, MarketCode, Money } from "@shongre/contracts";
import type { VehiclePublic } from "@shongre/contracts/auto";
import type {
  EmploymentCatalog,
  JobPostingCard,
  SalaryRange,
} from "@shongre/contracts/employment";
import type { PropertyPublic } from "@shongre/contracts/real-estate";

interface CategoryCardPresentation<T> {
  categoryLabel: string;
  conditionLabel: (value: T) => string;
  characteristics: (value: T, locale: string) => Array<string | undefined>;
}

const PROPERTY_TYPE_LABELS: Record<PropertyPublic["propertyType"], string> = {
  apartment: "Appartement",
  house: "Maison",
  land: "Terrain",
  parking_garage: "Parking ou garage",
  commercial: "Local commercial",
  office: "Bureau",
  building: "Immeuble",
  new_development: "Programme neuf",
  holiday_rental: "Location saisonnière",
  room_shared: "Chambre ou colocation",
  other: "Autre bien",
};

const PROPERTY_CONDITION_LABELS: Record<
  PropertyPublic["characteristics"]["condition"],
  string
> = {
  new: "Neuf",
  excellent: "Excellent état",
  good: "Bon état",
  renovation_needed: "Rénovation à prévoir",
  to_renovate: "À rénover",
};

const VEHICLE_CONDITION_LABELS: Record<
  VehiclePublic["history"]["condition"],
  string
> = {
  new: "Neuf",
  excellent: "Excellent état",
  good: "Bon état",
  fair: "État correct",
  damaged: "Endommagé",
  for_parts: "Pour pièces",
};

const FUEL_LABELS: Record<VehiclePublic["technical"]["fuelType"], string> = {
  petrol: "Essence",
  diesel: "Diesel",
  electric: "Électrique",
  hybrid: "Hybride",
  plug_in_hybrid: "Hybride rechargeable",
  lpg: "GPL",
  hydrogen: "Hydrogène",
  other: "Autre énergie",
};

/**
 * Category-specific secondary information lives here rather than in pages or
 * card markup. Generic marketplace listings use taxonomy
 * `presentation.cardAttributeIds`; structured verticals use this equivalent
 * projection until their transport converges on the generic listing contract.
 */
export const STRUCTURED_LISTING_CARD_PRESENTATIONS = {
  property: {
    categoryLabel: "Immobilier",
    conditionLabel: (property: PropertyPublic) =>
      PROPERTY_CONDITION_LABELS[property.characteristics.condition],
    characteristics: (property: PropertyPublic, locale: string) => [
      PROPERTY_TYPE_LABELS[property.propertyType],
      property.characteristics.livingAreaSquareMeters > 0
        ? `${new Intl.NumberFormat(locale).format(
            property.characteristics.livingAreaSquareMeters,
          )} m²`
        : undefined,
      property.characteristics.rooms > 0
        ? `${property.characteristics.rooms} pièce${
            property.characteristics.rooms > 1 ? "s" : ""
          }`
        : property.characteristics.landAreaSquareMeters
          ? `${new Intl.NumberFormat(locale).format(
              property.characteristics.landAreaSquareMeters,
            )} m² de terrain`
          : undefined,
    ],
  },
  vehicle: {
    categoryLabel: "Véhicules",
    conditionLabel: (vehicle: VehiclePublic) =>
      VEHICLE_CONDITION_LABELS[vehicle.history.condition],
    characteristics: (vehicle: VehiclePublic, locale: string) => [
      String(vehicle.technical.modelYear),
      `${new Intl.NumberFormat(locale).format(vehicle.technical.mileage)} ${
        vehicle.technical.mileageUnit
      }`,
      FUEL_LABELS[vehicle.technical.fuelType],
    ],
  },
  employment: {
    categoryLabel: "Emploi",
    conditionLabel: (_job: JobPostingCard) => "",
    characteristics: (job: JobPostingCard) => [
      job.contractTypeLabel,
      job.workingArrangementLabel,
      job.professionLabel,
    ],
  },
} satisfies {
  property: CategoryCardPresentation<PropertyPublic>;
  vehicle: CategoryCardPresentation<VehiclePublic>;
  employment: CategoryCardPresentation<JobPostingCard>;
};

function compactCharacteristics<T>(
  presentation: CategoryCardPresentation<T>,
  value: T,
  locale: string,
): string[] {
  return presentation
    .characteristics(value, locale)
    .filter((item): item is string => Boolean(item?.trim()))
    .slice(0, 3);
}

function formatMoney(
  money: Money,
  locale: string,
  maximumFractionDigits = money.amountMinor % 100 === 0 ? 0 : 2,
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: money.currency,
    maximumFractionDigits,
  }).format(money.amountMinor / 100);
}

function salaryLabel(
  salary: SalaryRange | undefined,
  catalog: EmploymentCatalog | null | undefined,
  locale: string,
): string {
  if (!salary?.isPublic) return "Rémunération non communiquée";
  const minimum = salary.minimum ? formatMoney(salary.minimum, locale) : "";
  const maximum = salary.maximum ? formatMoney(salary.maximum, locale) : "";
  const range =
    minimum && maximum
      ? `${minimum} – ${maximum}`
      : minimum || maximum || "Rémunération communiquée";
  const frequency = catalog?.dictionaries.find(
    (entry) => entry.id === salary.frequencyId,
  )?.label;
  return `${range}${frequency ? ` · ${frequency.toLocaleLowerCase(locale)}` : ""}`;
}

function representativeSalaryMoney(
  salary: SalaryRange | undefined,
  fallbackCurrency: string,
): Money {
  return (
    salary?.minimum ||
    salary?.maximum || { amountMinor: 0, currency: fallbackCurrency }
  );
}

export function presentPropertyListingCard(
  property: PropertyPublic,
  locale: string,
): ListingCardView {
  const presentation = STRUCTURED_LISTING_CARD_PRESENTATIONS.property;
  const periodLabels: Record<PropertyPublic["financials"]["period"], string> = {
    total: "",
    month: " / mois",
    week: " / semaine",
    night: " / nuit",
  };

  return {
    id: property.id,
    title: property.title,
    price: property.financials.price,
    priceLabel: `${formatMoney(property.financials.price, locale, 0)}${
      periodLabels[property.financials.period]
    }`,
    imageUrl: property.media.photos[0],
    city: property.address.publicLabel,
    marketCode: property.address.countryCode,
    categoryLabel: presentation.categoryLabel,
    conditionLabel: presentation.conditionLabel(property),
    characteristics: compactCharacteristics(presentation, property, locale),
    publishedAt: property.publishedAt || property.sortDate,
    photoCount: property.media.photos.length,
    isNegotiable: property.financials.isNegotiable,
    seller: {
      id: property.seller.id,
      name: property.seller.displayName,
      sellerType: property.seller.type === "owner" ? "individual" : "pro",
      city: property.address.city,
      isIdentityVerified: property.seller.verificationLabels.length > 0,
      isBusinessVerified: property.seller.verificationLabels.length > 0,
    },
    isUrgent: property.promotion.urgent,
    isFeatured: property.promotion.featured || property.promotion.sponsored,
  };
}

export function presentVehicleListingCard(
  vehicle: VehiclePublic,
  locale: string,
): ListingCardView {
  const presentation = STRUCTURED_LISTING_CARD_PRESENTATIONS.vehicle;
  return {
    id: vehicle.id,
    title: vehicle.title,
    price: vehicle.price,
    imageUrl: vehicle.mediaUrls[0],
    city: vehicle.locationLabel,
    marketCode: vehicle.marketCodes[0]!,
    categoryLabel: presentation.categoryLabel,
    conditionLabel: presentation.conditionLabel(vehicle),
    characteristics: compactCharacteristics(presentation, vehicle, locale),
    publishedAt: vehicle.publishedAt,
    photoCount: vehicle.mediaUrls.length,
    isNegotiable: vehicle.priceNegotiable,
    seller: {
      id: vehicle.seller.id,
      name: vehicle.seller.displayName,
      sellerType: vehicle.seller.type === "dealer" ? "pro" : "individual",
      city: vehicle.seller.locationLabel,
      isIdentityVerified: vehicle.trust.sellerIdentity === "verified",
      isBusinessVerified: vehicle.seller.verifiedBusiness,
    },
    isUrgent: vehicle.promotionLabels.includes("urgent"),
    isFeatured: vehicle.promotionLabels.some((label) =>
      ["featured", "sponsored", "bumped"].includes(label),
    ),
  };
}

export function presentEmploymentListingCard(
  job: JobPostingCard,
  catalog: EmploymentCatalog | null | undefined,
  locale: string,
  marketCode: MarketCode,
  fallbackCurrency: string,
): ListingCardView {
  const presentation = STRUCTURED_LISTING_CARD_PRESENTATIONS.employment;
  return {
    id: job.id,
    title: job.title,
    price: representativeSalaryMoney(job.salary, fallbackCurrency),
    priceLabel: salaryLabel(job.salary, catalog, locale),
    imageUrl: job.employer.logoUrl,
    city: job.primaryLocation.label,
    marketCode,
    categoryLabel: presentation.categoryLabel,
    conditionLabel: presentation.conditionLabel(job),
    characteristics: compactCharacteristics(presentation, job, locale),
    publishedAt: job.publishedAt,
    seller: {
      id: job.employer.id,
      name: job.employer.name,
      sellerType: "pro",
      city: job.primaryLocation.city,
      isIdentityVerified: job.employer.isPubliclyVerified,
      isBusinessVerified: job.employer.isPubliclyVerified,
    },
    isUrgent: job.isUrgent,
    isFeatured: job.isFeatured || job.isSponsored,
  };
}
