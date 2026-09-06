import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CourseOffer, TutorProfile } from "@shongre/contracts/courses";
import type { VehiclePrivate } from "@shongre/contracts/auto";
import type { PropertyPrivate } from "@shongre/contracts/real-estate";
import {
  EMPLOYMENT_DEMO_JOBS,
  type JobPostingDetail,
} from "@shongre/contracts/employment-demo";
import type { Listing, UserProfile } from "../../src/shared/types/index.js";
import {
  CANONICAL_DEMO_LISTINGS,
  PostgresListingRepository,
} from "../../src/infrastructure/database/repositories/listing.repository.js";
import {
  DEMO_AUTO_VEHICLES,
  PostgresAutoRepository,
} from "../../src/infrastructure/database/repositories/auto.repository.js";
import {
  DEMO_COURSE_OFFERS,
  DEMO_TUTOR_PROFILES,
  PostgresCoursesRepository,
} from "../../src/infrastructure/database/repositories/courses.repository.js";
import { PostgresEmploymentRepository } from "../../src/infrastructure/database/repositories/employment.repository.js";
import {
  DEFAULT_REAL_ESTATE_PROPERTIES,
  PostgresRealEstateRepository,
} from "../../src/infrastructure/database/repositories/real-estate.repository.js";
import { PostgresUserRepository } from "../../src/infrastructure/database/repositories/user.repository.js";
import { getSupabaseAdminClient } from "../../src/infrastructure/supabase/supabase-client.js";
import { hashPassword } from "../../src/shared/auth/password.js";
import { DEMO_ACCOUNT_PASSWORD } from "../../src/app/bootstrap/demo-account-password.js";
import { importBaselineCommercialCatalog } from "../monetization/import-baseline.js";
import { localSeedUuid } from "./local-seed-identity.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicAssetRoot = path.resolve(__dirname, "../../../frontend/public");
const FIXED_EXPIRES_AT = "2099-12-31T23:59:59.000Z";
const FIXED_CREATED_AT = "2026-08-01T08:00:00.000Z";

type SeedProfile = Pick<
  UserProfile,
  "name" | "accountType" | "primaryRole" | "role"
> & {
  legacyId: string;
  slug: string;
  city: string;
  country?: string;
  professionalVertical?: UserProfile["professionalVertical"];
};

const PROFILE_SEEDS: readonly SeedProfile[] = [
  {
    legacyId: "user_thomas",
    slug: "thomas-laurent-local",
    name: "Thomas Laurent",
    accountType: "individual",
    primaryRole: "individual_buyer",
    role: "individual_buyer",
    city: "Paris",
  },
  {
    legacyId: "user_camille",
    slug: "camille-martin-local",
    name: "Camille Martin",
    accountType: "individual",
    primaryRole: "individual_seller",
    role: "individual_seller",
    city: "Lyon",
  },
  {
    legacyId: "owner_marie",
    slug: "marie-durand-local",
    name: "Marie Durand",
    accountType: "individual",
    primaryRole: "individual_seller",
    role: "individual_seller",
    city: "Lyon",
  },
  {
    legacyId: "member_clara",
    slug: "clara-canopee-local",
    name: "Clara Dubois",
    accountType: "professional",
    professionalVertical: "real_estate",
    primaryRole: "pro_seller",
    role: "pro_seller",
    city: "Lyon",
  },
  {
    legacyId: "user_auto_dealer",
    slug: "auto-select-lyon-local",
    name: "Auto Select Lyon",
    accountType: "professional",
    professionalVertical: "automotive",
    primaryRole: "pro_seller",
    role: "pro_seller",
    city: "Lyon",
  },
  ...[
    ["user_tutor_thomas", "thomas-bernard-local", "Thomas Bernard", "Toulouse"],
    ["user_tutor_ines", "ines-martin-local", "Inès Martin", "Toulouse"],
    ["user_tutor_julien", "julien-robert-local", "Julien Robert", "Toulouse"],
    ["user_tutor_clara", "clara-dubois-local", "Clara Dubois", "Toulouse"],
    ["user_tutor_sophie", "sophie-martin-local", "Sophie Martin", "Lyon"],
  ].map(([legacyId, slug, name, city]) => ({
    legacyId,
    slug,
    name,
    city,
    accountType: "individual" as const,
    primaryRole: "individual_seller",
    role: "individual_seller",
  })),
  {
    legacyId: "user_employment_clara",
    slug: "clara-technova-local",
    name: "Clara TechNova",
    accountType: "professional",
    professionalVertical: "employment",
    primaryRole: "pro_seller",
    role: "pro_seller",
    city: "Lyon",
  },
  {
    legacyId: "employer-atelier-vert",
    slug: "atelier-vert-owner-local",
    name: "Atelier Vert",
    accountType: "professional",
    professionalVertical: "employment",
    primaryRole: "pro_seller",
    role: "pro_seller",
    city: "Nantes",
  },
  {
    legacyId: "employer-horizon-talents",
    slug: "horizon-talents-owner-local",
    name: "Horizon Talents",
    accountType: "professional",
    professionalVertical: "employment",
    primaryRole: "pro_seller",
    role: "pro_seller",
    city: "Paris",
  },
  {
    legacyId: "employer-private-martin",
    slug: "famille-martin-local",
    name: "Famille Martin",
    accountType: "individual",
    primaryRole: "individual_seller",
    role: "individual_seller",
    city: "Lyon",
  },
];

const profileId = (legacyId: string) => localSeedUuid("profile", legacyId);
const organizationId = (legacyId: string) =>
  localSeedUuid("organization", legacyId);
const listingId = (legacyId: string) => localSeedUuid("listing", legacyId);

function contentTypeFor(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  if (extension === ".svg") return "image/svg+xml";
  return "image/jpeg";
}

async function uploadPublicAsset(
  bucket: "avatars" | "listing-media",
  objectPath: string,
  relativeSourcePath: string,
): Promise<string> {
  const sourcePath = path.join(publicAssetRoot, relativeSourcePath);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Local seed asset is missing: ${sourcePath}`);
  }
  const client = getSupabaseAdminClient();
  const { error } = await client.storage
    .from(bucket)
    .upload(objectPath, fs.readFileSync(sourcePath), {
      cacheControl: "3600",
      contentType: contentTypeFor(sourcePath),
      upsert: true,
    });
  if (error) throw error;
  return client.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl;
}

async function seedPublicMedia() {
  const avatarUrls = new Map<string, string>();
  for (const profile of PROFILE_SEEDS) {
    avatarUrls.set(
      profile.legacyId,
      await uploadPublicAsset(
        "avatars",
        `local-seed/profiles/${profile.legacyId}.png`,
        "apple-touch-icon.png",
      ),
    );
  }

  const vehicleAssets: Record<string, string> = {
    vehicle_3008_diesel: "images/auto/peugeot-3008-diesel.jpg",
    vehicle_3008_petrol: "images/auto/peugeot-3008-petrol.jpg",
    vehicle_3008_hybrid: "images/auto/peugeot-3008-hybrid.jpg",
    vehicle_bmw_x3: "images/auto/bmw-x3.jpg",
  };
  const vehicleUrls = new Map<string, string>();
  for (const [legacyId, source] of Object.entries(vehicleAssets)) {
    vehicleUrls.set(
      legacyId,
      await uploadPublicAsset(
        "listing-media",
        `local-seed/automotive/${path.basename(source)}`,
        source,
      ),
    );
  }

  const propertyAssets: Record<string, string> = {
    property_apartment_lyon: "images/immo/appartement-lyon.webp",
    property_rental_lyon: "images/immo/location-lyon.webp",
    property_house_ecully: "images/immo/maison-ecully.webp",
  };
  const propertyUrls = new Map<string, string>();
  for (const [legacyId, source] of Object.entries(propertyAssets)) {
    propertyUrls.set(
      legacyId,
      await uploadPublicAsset(
        "listing-media",
        `local-seed/real-estate/${path.basename(source)}`,
        source,
      ),
    );
  }

  const genericUrl = await uploadPublicAsset(
    "listing-media",
    "local-seed/marketplace/sports-plein-air.jpg",
    "images/categories/sports-plein-air.jpg",
  );
  const employerLogoUrl = await uploadPublicAsset(
    "avatars",
    "local-seed/organizations/employer-logo.png",
    "brand/shongre/icon/mono-orange.png",
  );

  return {
    avatarUrls,
    employerLogoUrl,
    genericUrl,
    propertyUrls,
    vehicleUrls,
  };
}

async function seedProfiles(
  avatarUrls: ReadonlyMap<string, string>,
): Promise<void> {
  const repository = new PostgresUserRepository();
  const usersMissingCredentials: string[] = [];
  for (const seed of PROFILE_SEEDS) {
    const user: UserProfile = {
      id: profileId(seed.legacyId),
      slug: seed.slug,
      email: `${seed.slug}@local.shongre.invalid`,
      name: seed.name,
      accountType: seed.accountType,
      professionalVertical: seed.professionalVertical,
      primaryRole: seed.primaryRole,
      role: seed.role,
      sellerType: seed.accountType === "professional" ? "pro" : "individual",
      status: "active",
      avatarUrl: avatarUrls.get(seed.legacyId),
      city: seed.city,
      country: seed.country || "FR",
      bio: "Profil synthétique pour le développement local Shongre.",
      isVerified: true,
      isIdentityVerified: true,
      isPhoneVerified: true,
      isEmailVerified: true,
      isBusinessVerified: seed.accountType === "professional",
      rating: 4.8,
      reviewCount: 12,
      responseRatePercent: 98,
      responseTimeText: "en moins de deux heures",
      createdAt: FIXED_CREATED_AT,
    };
    await repository.save(user);
    if (!(await repository.findCredentialByUserId(user.id))) {
      usersMissingCredentials.push(user.id);
    }
  }
  if (!usersMissingCredentials.length) return;
  const credentialHash = await hashPassword(DEMO_ACCOUNT_PASSWORD);
  for (const userId of usersMissingCredentials) {
    await repository.saveCredential({ userId, passwordHash: credentialHash });
  }
}

async function seedOrganizations(): Promise<{
  auto: { organizationId: string; locationId: string };
  course: { organizationId: string };
  realEstate: {
    organizationId: string;
    branches: Record<"branch_lyon" | "branch_ecully", string>;
  };
}> {
  const client = getSupabaseAdminClient() as any;
  const autoOrganizationId = organizationId("dealer_auto_select_lyon");
  const realEstateOrganizationId = organizationId("agency_canopee");
  const courseOrganizationId = organizationId("org_college_lumiere");
  const organizations = [
    {
      id: autoOrganizationId,
      owner_id: profileId("user_auto_dealer"),
      legal_name: "Auto Select Lyon Développement",
      trade_name: "Auto Select Lyon",
      registered_address: "Adresse synthétique — Lyon",
      city: "Lyon",
      postal_code: "69002",
      country: "FR",
      is_verified: true,
      status: "active",
      professional_vertical: "automotive",
    },
    {
      id: realEstateOrganizationId,
      owner_id: profileId("member_clara"),
      legal_name: "Agence Canopée Développement",
      trade_name: "Agence Canopée",
      registered_address: "Adresse synthétique — Lyon",
      city: "Lyon",
      postal_code: "69007",
      country: "FR",
      is_verified: true,
      status: "active",
      professional_vertical: "real_estate",
    },
    {
      id: courseOrganizationId,
      owner_id: profileId("user_tutor_sophie"),
      legal_name: "Collège Lumière Développement",
      trade_name: "Collège Lumière",
      registered_address: "Adresse synthétique — Lyon",
      city: "Lyon",
      postal_code: "69003",
      country: "FR",
      is_verified: true,
      status: "active",
      professional_vertical: "education",
    },
  ];
  const organizationResult = await client
    .from("organizations")
    .upsert(organizations);
  if (organizationResult.error) throw organizationResult.error;

  const autoLocationId = localSeedUuid("auto-location", "dealer_location_lyon");
  const autoOrganizationResult = await client
    .from("auto_dealer_organizations")
    .upsert({
      id: autoOrganizationId,
      market_code: "FR",
      slug: "auto-select-lyon-local",
      plan_id: "auto_dealer_growth",
      verification_status: "verified",
      public_payload: {
        id: autoOrganizationId,
        name: "Auto Select Lyon",
        slug: "auto-select-lyon-local",
      },
      settings: { localSeed: true },
    });
  if (autoOrganizationResult.error) throw autoOrganizationResult.error;
  const autoLocationResult = await client.from("auto_dealer_locations").upsert({
    id: autoLocationId,
    dealer_organization_id: autoOrganizationId,
    market_code: "FR",
    name: "Lyon Centre",
    public_address: "Lyon 2e",
    city: "Lyon",
    postal_code: "69002",
    is_active: true,
    public_payload: { name: "Lyon Centre", city: "Lyon" },
  });
  if (autoLocationResult.error) throw autoLocationResult.error;
  const autoMemberResult = await client.from("auto_dealer_members").upsert({
    id: localSeedUuid("auto-member", "user_auto_dealer"),
    dealer_organization_id: autoOrganizationId,
    user_id: profileId("user_auto_dealer"),
    role: "owner",
    location_ids: [autoLocationId],
    status: "active",
    public_payload: { displayName: "Auto Select Lyon" },
  });
  if (autoMemberResult.error) throw autoMemberResult.error;

  const agencyResult = await client.from("real_estate_agencies").upsert({
    organization_id: realEstateOrganizationId,
    market_code: "FR",
    slug: "agence-canopee-local",
    verification_status: "verified",
    public_payload: {
      id: realEstateOrganizationId,
      name: "Agence Canopée",
      slug: "agence-canopee-local",
    },
    settings: { localSeed: true },
  });
  if (agencyResult.error) throw agencyResult.error;
  const branches = {
    branch_lyon: localSeedUuid("real-estate-branch", "branch_lyon"),
    branch_ecully: localSeedUuid("real-estate-branch", "branch_ecully"),
  };
  const branchResult = await client.from("real_estate_branches").upsert([
    {
      id: branches.branch_lyon,
      organization_id: realEstateOrganizationId,
      name: "Lyon Jean Macé",
      city: "Lyon",
      postal_code: "69007",
      public_address: "Lyon 7e",
      is_active: true,
    },
    {
      id: branches.branch_ecully,
      organization_id: realEstateOrganizationId,
      name: "Écully Centre",
      city: "Écully",
      postal_code: "69130",
      public_address: "Écully centre",
      is_active: true,
    },
  ]);
  if (branchResult.error) throw branchResult.error;
  const agencyMemberResult = await client
    .from("real_estate_agency_members")
    .upsert(
      {
        organization_id: realEstateOrganizationId,
        user_id: profileId("member_clara"),
        role: "owner",
        branch_ids: Object.values(branches),
        status: "active",
      },
      { onConflict: "organization_id,user_id" },
    );
  if (agencyMemberResult.error) throw agencyMemberResult.error;

  const courseOrganizationResult = await client
    .from("course_organizations")
    .upsert({
      id: courseOrganizationId,
      market_code: "FR",
      slug: "college-lumiere-local",
      verification_status: "verified",
      plan_id: "school_organization",
      public_payload: {
        id: courseOrganizationId,
        name: "Collège Lumière",
        slug: "college-lumiere-local",
      },
      settings: { localSeed: true },
    });
  if (courseOrganizationResult.error) throw courseOrganizationResult.error;

  return {
    auto: { organizationId: autoOrganizationId, locationId: autoLocationId },
    course: { organizationId: courseOrganizationId },
    realEstate: { organizationId: realEstateOrganizationId, branches },
  };
}

async function seedGenericListings(genericUrl: string): Promise<void> {
  const repository = new PostgresListingRepository();
  const client = getSupabaseAdminClient() as any;
  for (const source of [
    CANONICAL_DEMO_LISTINGS.list_1,
    CANONICAL_DEMO_LISTINGS.list_be_1,
  ]) {
    const mappedId = listingId(source.id);
    const listing: Listing = {
      ...structuredClone(source),
      id: mappedId,
      sellerId: profileId(source.sellerId),
      publisherUserId: profileId(source.publisherUserId || source.sellerId),
      images: [genericUrl],
      expiresAt: FIXED_EXPIRES_AT,
    };
    await repository.save(listing);
    const deleteResult = await client
      .from("listing_media")
      .delete()
      .eq("listing_id", mappedId);
    if (deleteResult.error) throw deleteResult.error;
    const mediaResult = await client.from("listing_media").insert({
      id: localSeedUuid("listing-media", source.id),
      listing_id: mappedId,
      url: genericUrl,
      sort_order: 0,
      is_primary: true,
    });
    if (mediaResult.error) throw mediaResult.error;
  }
}

async function seedAutomotive(
  context: { organizationId: string; locationId: string },
  vehicleUrls: ReadonlyMap<string, string>,
): Promise<void> {
  const repository = new PostgresAutoRepository();
  for (const source of DEMO_AUTO_VEHICLES) {
    const vehicle: VehiclePrivate = {
      ...structuredClone(source),
      id: localSeedUuid("vehicle", source.id),
      dealerOrganizationId: context.organizationId,
      dealerLocationId: context.locationId,
      seller: { ...source.seller, id: context.organizationId },
      mediaUrls: [vehicleUrls.get(source.id)!],
      vinHash: `local-seed:${localSeedUuid("vehicle-vin", source.id)}`,
    };
    await repository.saveVehicle(vehicle);
  }
}

async function seedRealEstate(
  context: {
    organizationId: string;
    branches: Record<"branch_lyon" | "branch_ecully", string>;
  },
  propertyUrls: ReadonlyMap<string, string>,
): Promise<void> {
  const repository = new PostgresRealEstateRepository();
  for (const source of DEFAULT_REAL_ESTATE_PROPERTIES) {
    const isAgency = source.seller.type === "agency";
    const property: PropertyPrivate = {
      ...structuredClone(source),
      id: localSeedUuid("real-estate-property", source.id),
      listingId: listingId(source.listingId),
      createdByUserId: profileId(source.createdByUserId),
      ownerUserId: source.ownerUserId
        ? profileId(source.ownerUserId)
        : undefined,
      organizationId: isAgency ? context.organizationId : undefined,
      branchId: source.branchId
        ? context.branches[source.branchId as keyof typeof context.branches]
        : undefined,
      media: {
        ...source.media,
        photos: [propertyUrls.get(source.id)!],
      },
      seller: {
        ...source.seller,
        id: isAgency ? context.organizationId : profileId(source.seller.id),
      },
    };
    await repository.saveProperty(property);
  }
}

async function seedCourses(
  courseOrganizationId: string,
  avatarUrls: ReadonlyMap<string, string>,
): Promise<void> {
  const repository = new PostgresCoursesRepository();
  const tutorIds = new Map<string, string>();
  for (const source of DEMO_TUTOR_PROFILES) {
    const mappedId = localSeedUuid("course-tutor", source.id);
    tutorIds.set(source.id, mappedId);
    const profile: TutorProfile = {
      ...structuredClone(source),
      id: mappedId,
      userId: profileId(source.userId),
      organizationId: source.organizationId ? courseOrganizationId : undefined,
      avatarUrl: avatarUrls.get(source.userId)!,
    };
    await repository.saveTutorProfile(profile);
  }
  for (const source of DEMO_COURSE_OFFERS) {
    const offer: CourseOffer = {
      ...structuredClone(source),
      id: localSeedUuid("course-offer", source.id),
      listingId: source.listingId ? listingId(source.listingId) : undefined,
      tutorProfileId: tutorIds.get(source.tutorProfileId)!,
      organizationId: source.organizationId ? courseOrganizationId : undefined,
      pricingOptions: source.pricingOptions.map((price) => ({
        ...price,
        id: localSeedUuid("course-price", price.id),
      })),
    };
    await repository.saveCourseOffer(offer);
  }
  const memberResult = await (getSupabaseAdminClient() as any)
    .from("course_organization_members")
    .upsert({
      id: localSeedUuid("course-member", "user_tutor_sophie"),
      organization_id: courseOrganizationId,
      user_id: profileId("user_tutor_sophie"),
      tutor_profile_id: tutorIds.get("tutor_sophie"),
      role: "owner",
      permissions: [],
      status: "active",
    });
  if (memberResult.error) throw memberResult.error;
}

async function seedEmployment(employerLogoUrl: string): Promise<void> {
  const repository = new PostgresEmploymentRepository();
  const client = getSupabaseAdminClient() as any;
  const employers = Array.from(
    new Map(
      EMPLOYMENT_DEMO_JOBS.map((job) => [job.employer.id, job.employer]),
    ).values(),
  );
  for (const employer of employers) {
    const ownerLegacyId = employer.publisherUserId || employer.id;
    const result = await client.from("employment_employer_profiles").upsert({
      id: localSeedUuid("employment-employer", employer.id),
      organization_id: null,
      owner_user_id: profileId(ownerLegacyId),
      employer_type_id: employer.employerTypeId,
      slug: `${employer.slug}-local`,
      display_name: employer.name,
      description: employer.description || null,
      logo_url: employerLogoUrl,
      website_url: null,
      verification_level: employer.verificationLevel,
      verification_evidence: {},
      status: "active",
      brand_settings: { localSeed: true },
    });
    if (result.error) throw result.error;
  }

  for (const source of EMPLOYMENT_DEMO_JOBS) {
    const ownerLegacyId = source.employer.publisherUserId || source.employer.id;
    const job: JobPostingDetail = {
      ...structuredClone(source),
      id: localSeedUuid("employment-job", source.id),
      expiresAt: FIXED_EXPIRES_AT,
      applicationDeadline: "2099-12-01T23:59:59.000Z",
      employer: {
        ...source.employer,
        id: localSeedUuid("employment-employer", source.employer.id),
        publisherUserId: profileId(ownerLegacyId),
        organizationId: undefined,
        branchId: undefined,
        logoUrl: employerLogoUrl,
      },
      primaryLocation: {
        ...source.primaryLocation,
        id: localSeedUuid("employment-location", source.primaryLocation.id),
      },
      screeningQuestions: source.screeningQuestions.map((question) => ({
        ...question,
        id: localSeedUuid("employment-question", question.id),
      })),
    };
    await repository.saveJob(job, profileId(ownerLegacyId));
  }
}

export interface LocalDevelopmentSeedSummary {
  profiles: number;
  genericListings: number;
  vehicles: number;
  properties: number;
  tutors: number;
  courseOffers: number;
  jobs: number;
  publicStorageObjects: number;
}

export async function seedLocalDevelopmentData(): Promise<LocalDevelopmentSeedSummary> {
  await importBaselineCommercialCatalog();
  const media = await seedPublicMedia();
  await seedProfiles(media.avatarUrls);
  const organizations = await seedOrganizations();
  await seedGenericListings(media.genericUrl);
  await seedAutomotive(organizations.auto, media.vehicleUrls);
  await seedRealEstate(organizations.realEstate, media.propertyUrls);
  await seedCourses(organizations.course.organizationId, media.avatarUrls);
  await seedEmployment(media.employerLogoUrl);

  return {
    profiles: PROFILE_SEEDS.length,
    genericListings: 2,
    vehicles: DEMO_AUTO_VEHICLES.length,
    properties: DEFAULT_REAL_ESTATE_PROPERTIES.length,
    tutors: DEMO_TUTOR_PROFILES.length,
    courseOffers: DEMO_COURSE_OFFERS.length,
    jobs: EMPLOYMENT_DEMO_JOBS.length,
    publicStorageObjects: PROFILE_SEEDS.length + 4 + 3 + 2,
  };
}
