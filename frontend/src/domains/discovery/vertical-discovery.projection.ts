import type { VehiclePrivate } from "@shongre/contracts/auto";
import type { CourseOffer, TutorProfile } from "@shongre/contracts/courses";
import type { JobPostingDetail } from "@shongre/contracts/employment";
import type { PropertyPrivate } from "@shongre/contracts/real-estate";
import type { Listing, ListingCondition, ListingStatus } from "../../types";

export type DiscoveryVertical =
  "automotive" | "employment" | "real_estate" | "tutoring";

const EMPLOYMENT_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=960&q=82";
const COURSE_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=960&q=82";
const AUTO_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=960&q=82";
const IMMO_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=960&q=82";

function expiresAfter(reference: string, days = 90): string {
  const timestamp = new Date(reference).getTime();
  if (!Number.isFinite(timestamp)) return "2027-01-01T00:00:00.000Z";
  return new Date(timestamp + days * 24 * 60 * 60 * 1000).toISOString();
}

function locationParts(label: string): { city: string; postalCode: string } {
  const postalCode = label.match(/\b\d{5}\b/)?.[0] || "00000";
  const city = label
    .replace(/\([^)]*\)/g, "")
    .replace(/\b\d{5}\b/g, "")
    .trim();
  return { city: city || label, postalCode };
}

function idSuffix(value?: string): string | undefined {
  return value?.split(".").pop();
}

function facetSlug(value?: string): string | undefined {
  if (!value) return undefined;
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function mapFacetValue(
  value: string | undefined,
  aliases: Record<string, string>,
): string | undefined {
  const normalized = facetSlug(value);
  return normalized ? aliases[normalized] || normalized : undefined;
}

const VEHICLE_FUEL: Record<string, string> = {
  essence: "petrol",
  electrique: "electric",
  hybride: "hybrid",
  hybride_rechargeable: "plug_in_hybrid",
  gpl: "lpg",
  hydrogene: "hydrogen",
};

const VEHICLE_GEARBOX: Record<string, string> = {
  manuelle: "manual",
  automatique: "automatic",
  semi_automatique: "semi_automatic",
};

const PROPERTY_TYPE: Record<string, string> = {
  appartement: "apartment",
  maison: "house",
  terrain: "land",
  parking: "parking_garage",
  commerce: "retail",
  bureau: "office",
  immeuble: "building",
};

const EMPLOYMENT_CONTRACT: Record<string, string> = {
  cdi: "permanent",
  cdd: "fixed_term",
  interim: "temporary",
  alternance: "apprenticeship",
  stage: "internship",
  saisonnier: "seasonal",
};

const EMPLOYMENT_SECTOR: Record<string, string> = {
  technology: "it_data",
  commerce: "sales_marketing",
  marketing: "sales_marketing",
  engineering: "engineering_energy",
  industry: "engineering_energy",
  construction: "construction",
  transport: "transport_logistics",
  hospitality: "retail_hospitality",
  finance: "finance_legal",
  human_resources: "sales_marketing",
  education: "education_public",
  services: "retail_hospitality",
};

const EMPLOYMENT_EXPERIENCE: Record<string, string> = {
  beginner: "none",
  junior: "1_2",
  intermediate: "3_5",
  confirmed: "6_10",
  experienced: "6_10",
  senior: "gt_10",
  expert: "gt_10",
};

const EMPLOYMENT_TELEWORK: Record<string, string> = {
  remote: "fully_remote",
  hybrid: "hybrid",
  occasional: "remote_fr",
  onsite: "onsite",
};

const EMPLOYMENT_DURATION: Record<string, string> = {
  permanent: "permanent",
  fixed_term: "fixed_term",
  temporary: "temporary",
  apprenticeship: "apprenticeship",
  internship: "internship",
};

function audienceLevels(levelIds: string[]): string[] {
  const levels = new Set<string>();
  levelIds.forEach((levelId) => {
    const level = facetSlug(idSuffix(levelId) || levelId);
    if (!level) return;
    if (level.includes("primary") || level.includes("child"))
      levels.add("children");
    if (level.includes("middle") || level.includes("high_school"))
      levels.add("teenagers");
    if (level.includes("adult") || level.includes("higher"))
      levels.add("adults");
    if (level.includes("beginner")) levels.add("beginners");
    if (level.includes("advanced")) levels.add("advanced");
  });
  return Array.from(levels);
}

function photos(
  id: string,
  title: string,
  urls: string[],
  fallback: string,
): Listing["photos"] {
  const resolved = urls.length ? urls : [fallback];
  return resolved.map((url, index) => ({
    id: `${id}-photo-${index + 1}`,
    url,
    isCover: index === 0,
    alt: title,
  }));
}

function autoStatus(vehicle: VehiclePrivate): ListingStatus {
  if (
    vehicle.lifecycle === "published" &&
    vehicle.moderationStatus === "approved"
  )
    return "active";
  if (vehicle.lifecycle === "reserved") return "reserved";
  if (vehicle.lifecycle === "sold") return "sold";
  if (vehicle.lifecycle === "pending_review") return "pending_review";
  if (vehicle.lifecycle === "draft") return "draft";
  if (vehicle.lifecycle === "expired") return "expired";
  return "archived";
}

function autoCondition(
  condition: VehiclePrivate["history"]["condition"],
): ListingCondition {
  if (condition === "new") return "new_without_tag";
  if (condition === "excellent") return "very_good";
  if (condition === "good") return "good";
  if (condition === "fair" || condition === "damaged") return "fair";
  return "for_parts";
}

export function projectAutoVehicle(vehicle: VehiclePrivate): Listing {
  const listingId = `listing_auto_${vehicle.id}`;
  const location = locationParts(vehicle.locationLabel);
  const media = photos(
    listingId,
    vehicle.title,
    vehicle.mediaUrls,
    AUTO_FALLBACK_IMAGE,
  );
  const professional = vehicle.seller.type === "dealer";
  const isUrgent = vehicle.promotionLabels.includes("urgent");
  const isFeatured = vehicle.promotionLabels.some((label) =>
    ["featured", "sponsored"].includes(label),
  );

  return {
    id: listingId,
    title: vehicle.title,
    description: vehicle.description,
    price: vehicle.price.amountMinor / 100,
    currency: vehicle.price.currency,
    isNegotiable: Boolean(vehicle.priceNegotiable),
    isFreeDonation: false,
    categorySlug: "vehicules",
    subCategorySlug:
      vehicle.vehicleType === "car"
        ? `vehicles.cars.${
            {
              hatchback: "city_cars",
              sedan: "sedans",
              estate: "estates",
              wagon: "estates",
              sport_utility_vehicle: "suv",
              suv: "suv",
              van: "utility_vans",
              pickup_truck: "utility_vans",
            }[facetSlug(vehicle.technical.bodyType) || ""] || "city_cars"
          }`
        : "vehicles.motos.motorcycles",
    categoryLabel: "Véhicules",
    subCategoryLabel:
      vehicle.vehicleType === "car" ? "Voitures" : vehicle.vehicleType,
    condition: autoCondition(vehicle.history.condition),
    sellerId: vehicle.seller.id,
    sellerName: vehicle.seller.displayName,
    sellerType: professional ? "pro" : "individual",
    publisherType: professional ? "professional" : "private",
    publisherUserId: vehicle.ownerUserId,
    publisherOrganizationId: vehicle.dealerOrganizationId,
    publisherVerificationStatus: vehicle.seller.verifiedBusiness
      ? "business_verified"
      : vehicle.trust.sellerIdentity === "verified"
        ? "identity_verified"
        : "unverified",
    publisherOrganizationName: professional
      ? vehicle.seller.displayName
      : undefined,
    publisherOrganizationLogoUrl: vehicle.seller.logoUrl,
    sellerAvatarUrl: vehicle.seller.logoUrl,
    sellerRating: 0,
    sellerReviewCount: 0,
    sellerIsVerified:
      vehicle.seller.verifiedBusiness ||
      vehicle.trust.sellerIdentity === "verified",
    sellerCity: location.city,
    sellerPostalCode: location.postalCode,
    city: location.city,
    postalCode: location.postalCode,
    department: "",
    region: "",
    photos: media,
    coverImageUrl: media[0].url,
    deliveryOptions: [{ type: "hand_delivery", available: true, price: 0 }],
    isOnlinePaymentAvailable: false,
    attributes: {
      verticalType: "automotive",
      verticalEntityId: vehicle.id,
      verticalSchemaVersion: vehicle.schemaVersion,
      canonicalPath: `/auto/vehicule/${vehicle.slug}`,
      ...vehicle.dynamicAttributes,
      vehicleType: vehicle.vehicleType,
      make: vehicle.makeLabel,
      brand: mapFacetValue(vehicle.makeLabel, {
        mercedes_benz: "mercedes",
      }),
      model: facetSlug(vehicle.modelLabel),
      model_year: vehicle.technical.modelYear,
      mileage: vehicle.technical.mileage,
      mileage_unit: vehicle.technical.mileageUnit,
      body_type: mapFacetValue(vehicle.technical.bodyType, {
        hatchback: "city_car",
        estate: "estate",
        wagon: "estate",
        sport_utility_vehicle: "suv",
        van: "van",
        pickup_truck: "pickup",
      }),
      fuel_type: mapFacetValue(vehicle.technical.fuelType, VEHICLE_FUEL),
      transmission: mapFacetValue(
        vehicle.technical.transmission,
        VEHICLE_GEARBOX,
      ),
      critair_class: vehicle.technical.critAirClass,
      first_registration_date: vehicle.technical.firstRegistrationDate,
      doors: vehicle.technical.doors,
      seats: vehicle.technical.seats,
      fiscal_power: vehicle.technical.fiscalPower,
      power_hp: vehicle.technical.powerHp,
      battery_capacity_kwh: vehicle.technical.batteryCapacityKwh,
      electric_range_km: vehicle.technical.electricRangeKm,
      first_hand:
        vehicle.history.previousOwnerCount === undefined
          ? undefined
          : vehicle.history.previousOwnerCount <= 1,
      service_history:
        vehicle.history.maintenanceBookStatus === "complete" ||
        vehicle.dynamicAttributes.serviceHistory === true,
      previous_owners: vehicle.history.previousOwnerCount,
      co2_emissions: vehicle.technical.co2GramsPerKm,
    },
    status: autoStatus(vehicle),
    createdAt: vehicle.publishedAt,
    publishedAt: vehicle.publishedAt,
    organicFreshnessAt: vehicle.publishedAt,
    updatedAt: vehicle.updatedAt,
    expiresAt: expiresAfter(vehicle.publishedAt),
    viewsCount: 0,
    favoritesCount: 0,
    contactCount: 0,
    isBoosted: isUrgent || isFeatured || undefined,
    boostType: isUrgent ? "urgent" : isFeatured ? "highlight" : undefined,
    marketCode: vehicle.marketCodes[0],
    marketCodes: vehicle.marketCodes,
    externalStockId: vehicle.stockReference,
  };
}

function employmentStatus(job: JobPostingDetail): ListingStatus {
  if (job.lifecycle === "published") return "active";
  if (job.lifecycle === "pending_review") return "pending_review";
  if (job.lifecycle === "draft") return "draft";
  if (job.lifecycle === "expired") return "expired";
  return "archived";
}

export function projectEmploymentJob(job: JobPostingDetail): Listing {
  const listingId = `listing_employment_${job.id}`;
  const professional = Boolean(job.employer.organizationId);
  const media = photos(
    listingId,
    job.title,
    job.employer.logoUrl ? [job.employer.logoUrl] : [],
    EMPLOYMENT_FALLBACK_IMAGE,
  );
  const salary = job.salary?.minimum || job.salary?.maximum;
  const contractCode = idSuffix(job.contractTypeId);
  const salaryFrequency = idSuffix(job.salary?.frequencyId);

  return {
    id: listingId,
    title: job.title,
    description: [
      job.employerDescription || job.employer.description,
      ...job.responsibilities,
    ]
      .filter(Boolean)
      .join(" · "),
    price: salary ? salary.amountMinor / 100 : 0,
    currency: salary?.currency || "EUR",
    isNegotiable: false,
    isFreeDonation: false,
    categorySlug: "emploi",
    subCategorySlug: `jobs.offers.${
      {
        it_data: "it_data",
        engineering_energy: "engineering_energy",
        sales_marketing: "sales_marketing",
        retail_hospitality: "retail_hospitality",
        construction: "construction_trades",
        transport_logistics: "transport_logistics",
        health_social: "health_social",
        education_public: "education_public",
        finance_legal: "finance_legal",
      }[mapFacetValue(idSuffix(job.industryId), EMPLOYMENT_SECTOR) || ""] ||
      "it_data"
    }`,
    categoryLabel: "Emploi",
    subCategoryLabel: "Offres d’emploi",
    condition: "not_applicable",
    sellerId: job.employer.id,
    sellerName: job.employer.name,
    sellerType: professional ? "pro" : "individual",
    publisherType: professional ? "professional" : "private",
    publisherOrganizationId: job.employer.organizationId,
    publisherBranchId: job.employer.branchId,
    publisherVerificationStatus: job.employer.isPubliclyVerified
      ? "business_verified"
      : "unverified",
    publisherOrganizationName: professional ? job.employer.name : undefined,
    publisherOrganizationLogoUrl: job.employer.logoUrl,
    sellerAvatarUrl: job.employer.logoUrl,
    sellerRating: 0,
    sellerReviewCount: 0,
    sellerIsVerified: job.employer.isPubliclyVerified,
    sellerCity: job.primaryLocation.city,
    sellerPostalCode: job.primaryLocation.postalCode || "00000",
    city: job.primaryLocation.label,
    postalCode: job.primaryLocation.postalCode || "00000",
    department: "",
    region: "",
    latitude: job.primaryLocation.latitude,
    longitude: job.primaryLocation.longitude,
    photos: media,
    coverImageUrl: media[0].url,
    deliveryOptions: [],
    isOnlinePaymentAvailable: false,
    attributes: {
      verticalType: "employment",
      verticalEntityId: job.id,
      verticalSchemaVersion: job.schemaVersion,
      canonicalPath: `/emploi/offre/${job.slug}`,
      profession: job.professionLabel,
      industry: job.industryLabel,
      contractType: job.contractTypeLabel,
      workingArrangement: job.workingArrangementLabel,
      salaryFrequency: job.salary?.frequencyId,
      skills: job.requiredSkills,
      contract_type: mapFacetValue(contractCode, EMPLOYMENT_CONTRACT),
      job_sector: mapFacetValue(idSuffix(job.industryId), EMPLOYMENT_SECTOR),
      experience_level: mapFacetValue(
        idSuffix(job.requiredExperienceId),
        EMPLOYMENT_EXPERIENCE,
      ),
      remote_work: mapFacetValue(
        idSuffix(job.workingArrangementId),
        EMPLOYMENT_TELEWORK,
      ),
      salary_annual_keur:
        salaryFrequency === "year" && salary
          ? salary.amountMinor / 100_000
          : undefined,
      engagement_duration: mapFacetValue(contractCode, EMPLOYMENT_DURATION),
      start_date: job.desiredStartDate,
      work_schedule: job.workScheduleIds.map((id) =>
        mapFacetValue(idSuffix(id) || id, {
          full_time: "day",
          part_time: "day",
        }),
      ),
    },
    status: employmentStatus(job),
    createdAt: job.publishedAt,
    publishedAt: job.publishedAt,
    organicFreshnessAt: job.publishedAt,
    updatedAt: job.publishedAt,
    expiresAt: job.expiresAt,
    viewsCount: 0,
    favoritesCount: 0,
    contactCount: 0,
    isBoosted: job.isUrgent || job.isFeatured || job.isSponsored || undefined,
    boostType: job.isUrgent
      ? "urgent"
      : job.isFeatured || job.isSponsored
        ? "highlight"
        : undefined,
    marketCode: job.marketCode,
    marketCodes: [job.marketCode],
  };
}

function courseStatus(tutor: TutorProfile, offer: CourseOffer): ListingStatus {
  if (offer.status === "published" && tutor.moderationStatus === "approved")
    return "active";
  if (offer.status === "pending_review") return "pending_review";
  if (offer.status === "draft") return "draft";
  return "archived";
}

export function projectCourseOffer(
  tutor: TutorProfile,
  offer: CourseOffer,
  subjectLabel = "Éducation & Formation",
): Listing {
  const listingId = offer.listingId || `listing_course_${offer.id}`;
  const activePrices = offer.pricingOptions
    .filter((option) => option.isActive)
    .sort((a, b) => a.price.amountMinor - b.price.amountMinor);
  const price = activePrices[0]?.price || {
    amountMinor: 0,
    currency: "EUR",
  };
  const imageUrls = [tutor.avatarUrl, ...tutor.mediaUrls].filter(
    (url): url is string => Boolean(url),
  );
  const media = photos(
    listingId,
    offer.title,
    imageUrls,
    COURSE_FALLBACK_IMAGE,
  );
  const professional = Boolean(tutor.organizationId);
  const city =
    offer.serviceArea?.publicLocationLabel ||
    tutor.serviceArea?.publicLocationLabel ||
    "En ligne";
  const deliveryMode = offer.deliveryModes.map((mode) =>
    mode === "online" ? "remote" : "in_person",
  );

  return {
    id: listingId,
    title: offer.title,
    description: offer.description,
    price: price.amountMinor / 100,
    currency: price.currency,
    isNegotiable: false,
    isFreeDonation: false,
    categorySlug: "education",
    subCategorySlug: "education.academic.math_science",
    categoryLabel: "Éducation & Formation",
    subCategoryLabel: "Cours particuliers",
    condition: "not_applicable",
    sellerId: tutor.id,
    sellerName: tutor.displayName,
    sellerType: professional ? "pro" : "individual",
    publisherType: professional ? "professional" : "private",
    publisherUserId: tutor.userId,
    publisherOrganizationId: tutor.organizationId,
    publisherVerificationStatus:
      tutor.verifications.business === "verified"
        ? "business_verified"
        : tutor.verifications.identity === "verified"
          ? "identity_verified"
          : tutor.verifications.phone === "verified"
            ? "phone_verified"
            : tutor.verifications.email === "verified"
              ? "email_verified"
              : "unverified",
    sellerAvatarUrl: tutor.avatarUrl,
    sellerRating: tutor.rating || 0,
    sellerReviewCount: tutor.reviewCount,
    sellerIsVerified: tutor.verifications.identity === "verified",
    sellerCity: tutor.serviceArea?.cityLabel || city,
    sellerPostalCode: "00000",
    city,
    postalCode: "00000",
    department: "",
    region: tutor.serviceArea?.region || "",
    photos: media,
    coverImageUrl: media[0].url,
    deliveryOptions: [{ type: "hand_delivery", available: true, price: 0 }],
    isOnlinePaymentAvailable: false,
    attributes: {
      verticalType: "tutoring",
      verticalEntityId: offer.id,
      verticalSchemaVersion: offer.schemaVersion,
      canonicalPath: `/education/professeur/${tutor.slug}`,
      subject: subjectLabel,
      subjectId: offer.subjectId,
      levelIds: offer.levelIds,
      deliveryModes: offer.deliveryModes,
      billing_mode:
        activePrices[0]?.type === "hourly"
          ? "hourly"
          : activePrices[0]?.type === "trial"
            ? "free_first"
            : "flat_rate",
      location_mode:
        offer.deliveryModes.length > 1
          ? "flexible"
          : offer.deliveryModes[0] === "online"
            ? "remote"
            : "provider_premises",
      audience_level: audienceLevels(offer.levelIds),
      delivery_mode: Array.from(new Set(deliveryMode)),
      travel_radius_km:
        offer.serviceArea?.radiusKm || tutor.serviceArea?.radiusKm,
      session_duration_minutes: activePrices[0]?.durationMinutes,
      languages: offer.languages,
      availability: offer.availabilitySummary,
      trialLessonAvailable: offer.trialLessonAvailable,
      sellerResponseRate: tutor.responseRatePercent,
    },
    status: courseStatus(tutor, offer),
    createdAt: offer.publishedAt || offer.createdAt,
    publishedAt: offer.publishedAt,
    organicFreshnessAt: offer.publishedAt || offer.createdAt,
    updatedAt: offer.updatedAt,
    expiresAt: expiresAfter(offer.publishedAt || offer.createdAt, 365),
    viewsCount: 0,
    favoritesCount: 0,
    contactCount: 0,
    marketCode: offer.marketCodes[0],
    marketCodes: offer.marketCodes,
  };
}

function propertyStatus(property: PropertyPrivate): ListingStatus {
  if (
    property.lifecycle === "published" &&
    property.moderationStatus === "approved"
  )
    return "active";
  if (property.lifecycle === "reserved") return "reserved";
  if (property.lifecycle === "sold") return "sold";
  if (property.lifecycle === "pending_review") return "pending_review";
  if (property.lifecycle === "draft") return "draft";
  if (property.lifecycle === "expired") return "expired";
  return "archived";
}

function propertyCondition(
  condition: PropertyPrivate["characteristics"]["condition"],
): ListingCondition {
  if (condition === "new") return "new_without_tag";
  if (condition === "excellent") return "very_good";
  if (condition === "good") return "good";
  return "fair";
}

export function projectRealEstateProperty(property: PropertyPrivate): Listing {
  const media = photos(
    property.listingId,
    property.title,
    property.media.photos,
    IMMO_FALLBACK_IMAGE,
  );
  const professional = property.seller.type !== "owner";
  const verified = property.seller.verificationLabels.length > 0;
  const amenities = property.characteristics.amenities.map(
    (amenity) => facetSlug(amenity) || amenity,
  );
  const outdoorSpace = amenities.filter((amenity) =>
    ["balcony", "terrace", "garden", "courtyard"].includes(amenity),
  );
  const parking = amenities.flatMap((amenity) => {
    if (amenity === "garage") return ["garage"];
    if (amenity === "parking") return ["open_space"];
    return [];
  });
  const heatingSource =
    property.characteristics.heatingType === "collective"
      ? "collective"
      : mapFacetValue(property.characteristics.energyType, {
          electricity: "electricity",
          electric: "electricity",
          gas: "gas",
          heat_pump: "heat_pump",
          wood: "wood",
        });

  return {
    id: property.listingId,
    title: property.title,
    description: property.description,
    price: property.financials.price.amountMinor / 100,
    currency: property.financials.price.currency,
    isNegotiable: property.financials.isNegotiable,
    isFreeDonation: false,
    categorySlug: "immobilier",
    subCategorySlug:
      property.transactionType === "sale"
        ? property.propertyType === "house"
          ? "real_estate.sales.houses"
          : property.propertyType === "land"
            ? "real_estate.sales.land"
            : "real_estate.sales.apartments"
        : property.propertyType === "house"
          ? "real_estate.rentals.houses"
          : property.characteristics.isFurnished
            ? "real_estate.rentals.furnished"
            : "real_estate.rentals.apartments",
    categoryLabel: "Immobilier",
    subCategoryLabel:
      property.transactionType === "sale" ? "Ventes" : "Locations",
    condition: propertyCondition(property.characteristics.condition),
    sellerId: property.seller.id,
    sellerName: property.seller.displayName,
    sellerType: professional ? "pro" : "individual",
    publisherType: professional ? "professional" : "private",
    publisherUserId: property.createdByUserId,
    publisherOrganizationId: property.organizationId,
    publisherBranchId: property.branchId,
    publisherVerificationStatus:
      professional && verified
        ? "business_verified"
        : verified
          ? "identity_verified"
          : "unverified",
    publisherOrganizationName: professional
      ? property.seller.displayName
      : undefined,
    publisherOrganizationLogoUrl: property.seller.logoUrl,
    sellerAvatarUrl: property.seller.logoUrl,
    sellerRating: 0,
    sellerReviewCount: 0,
    sellerIsVerified: verified,
    sellerCity: property.address.city,
    sellerPostalCode: property.address.postalCode,
    city: property.address.publicLabel,
    postalCode: property.address.postalCode,
    department: property.address.administrativeArea || "",
    region: property.address.administrativeArea || "",
    latitude: property.address.latitude,
    longitude: property.address.longitude,
    photos: media,
    coverImageUrl: media[0].url,
    deliveryOptions: [{ type: "hand_delivery", available: true, price: 0 }],
    isOnlinePaymentAvailable: false,
    isReservable: false,
    attributes: {
      verticalType: "real_estate",
      verticalEntityId: property.id,
      verticalSchemaVersion: property.schemaVersion,
      canonicalPath: `/immo/bien/${property.slug}`,
      ...property.customAttributes,
      propertyType: property.propertyType,
      transactionType: property.transactionType,
      livingAreaSquareMeters: property.characteristics.livingAreaSquareMeters,
      property_type: mapFacetValue(property.propertyType, PROPERTY_TYPE),
      property_transaction: property.transactionType,
      living_area: property.characteristics.livingAreaSquareMeters,
      land_area: property.characteristics.landAreaSquareMeters,
      rooms: property.characteristics.rooms,
      bedrooms: property.characteristics.bedrooms,
      dpeClass: property.energy.dpeClass,
      furnished:
        property.characteristics.isFurnished === undefined
          ? undefined
          : property.characteristics.isFurnished,
      dpe_class: property.energy.dpeClass,
      ges_class: property.energy.gesClass,
      floor: property.characteristics.floor,
      elevator: property.characteristics.hasLift,
      balcony: outdoorSpace.includes("balcony"),
      terrace: outdoorSpace.includes("terrace"),
      garden: outdoorSpace.includes("garden"),
      monthly_rent:
        property.financials.period === "month"
          ? property.financials.price.amountMinor / 100
          : undefined,
      availability_date: property.characteristics.availabilityDate,
      total_floors: property.characteristics.floorCount,
      heating_type: property.characteristics.heatingType,
      energy_source: heatingSource,
      amenities,
      parking: parking.length > 0,
    },
    status: propertyStatus(property),
    createdAt: property.publishedAt || property.createdAt,
    publishedAt: property.publishedAt,
    organicFreshnessAt: property.publishedAt || property.createdAt,
    updatedAt: property.sortDate,
    expiresAt: expiresAfter(property.publishedAt || property.createdAt),
    viewsCount: 0,
    favoritesCount: 0,
    contactCount: 0,
    isBoosted:
      property.promotion.featured || property.promotion.urgent || undefined,
    boostType: property.promotion.urgent
      ? "urgent"
      : property.promotion.featured || property.promotion.sponsored
        ? "highlight"
        : undefined,
    boostExpiresAt: property.promotion.endsAt,
    marketCode: property.marketCodes[0],
    marketCodes: property.marketCodes,
  };
}
