import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CourseOffer, TutorProfile } from "@shongre/contracts/courses";
import type { VehiclePrivate } from "@shongre/contracts/auto";
import type { PropertyPrivate } from "@shongre/contracts/real-estate";
import { resolveTaxonomyV4Identity } from "@shongre/contracts/taxonomy-v4-identity";
import {
  EMPLOYMENT_DEMO_JOBS,
  type JobPostingDetail,
} from "@shongre/contracts/employment-demo";
import type {
  Listing,
  Message,
  NotificationItem,
  ReviewItem,
  Transaction,
  UserProfile,
} from "../../src/shared/types/index.js";
import { PostgresListingRepository } from "../../src/infrastructure/database/repositories/listing.repository.js";
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
import { PostgresNotificationRepository } from "../../src/infrastructure/database/repositories/notification.repository.js";
import {
  type OrderRecord,
  PostgresOrderRepository,
} from "../../src/infrastructure/database/repositories/order.repository.js";
import { PostgresReviewRepository } from "../../src/infrastructure/database/repositories/review.repository.js";
import {
  DEFAULT_REAL_ESTATE_PROPERTIES,
  PostgresRealEstateRepository,
} from "../../src/infrastructure/database/repositories/real-estate.repository.js";
import { getSupabaseAdminClient } from "../../src/infrastructure/supabase/supabase-client.js";
import { hashPassword } from "../../src/shared/auth/password.js";
import { DEMO_ACCOUNT_PASSWORD } from "../../src/app/bootstrap/demo-account-password.js";
import { trendingService } from "../../src/modules/trending/trending.service.js";
import { importBaselineCommercialCatalog } from "../monetization/import-baseline.js";
import { runPsql } from "../database/psql.js";
import { localSeedUuid } from "./local-seed-identity.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicAssetRoot = path.resolve(__dirname, "../../../frontend/public");
const seedAssetRoot = path.resolve(
  __dirname,
  "../../supabase/seed/assets/demo-media",
);
const marketplaceFixturePath = path.resolve(
  __dirname,
  "fixtures/marketplace-demo.json",
);
const demoMediaManifestPath = path.resolve(
  __dirname,
  "fixtures/demo-media.json",
);
const FIXED_EXPIRES_AT = "2099-12-31T23:59:59.000Z";
const FIXED_CREATED_AT = "2026-08-01T08:00:00.000Z";

interface LegacyDemoFixture {
  schemaVersion: number;
  users: Array<Record<string, any>>;
  listings: Array<Record<string, any>>;
  conversations: Array<Record<string, any>>;
  messages: Record<string, Array<Record<string, any>>>;
  transactions: Array<Record<string, any>>;
  notifications: Array<Record<string, any>>;
  savedSearches: Array<Record<string, any>>;
  reviews: Array<Record<string, any>>;
}

interface DemoMediaManifest {
  schemaVersion: number;
  media: Array<{ key: string; sourceUrl: string; fileName: string }>;
}

function readSeedJson<T>(filePath: string): T {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Local seed fixture is missing: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

const marketplaceFixture = readSeedJson<LegacyDemoFixture>(
  marketplaceFixturePath,
);
const demoMediaManifest = readSeedJson<DemoMediaManifest>(
  demoMediaManifestPath,
);

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

function allSeedProfiles(): Array<Record<string, any> & { legacyId: string }> {
  const profiles = new Map<
    string,
    Record<string, any> & { legacyId: string }
  >();
  for (const seed of PROFILE_SEEDS) profiles.set(seed.legacyId, { ...seed });
  for (const user of marketplaceFixture.users) {
    profiles.set(String(user.id), { ...user, legacyId: String(user.id) });
  }
  return [...profiles.values()];
}

function normalizePrimaryRole(seed: Record<string, any>): string {
  if (seed.accountType === "professional") return "pro_seller";
  if (seed.primaryRole === "seller" || seed.role === "seller")
    return "individual_seller";
  return "individual_buyer";
}

function normalizeAccountStatus(seed: Record<string, any>): string {
  return seed.status === "limited" ? "restricted" : seed.status || "active";
}

function unsplashPhotoId(value: string | undefined): string | undefined {
  return value?.match(/images\.unsplash\.com\/(photo-[^?]+)/)?.[1];
}

function sourcePathForMediaUrl(value: string | undefined): string {
  const photoId = unsplashPhotoId(value);
  if (photoId) return path.join(seedAssetRoot, `${photoId}.jpg`);
  if (value?.startsWith("/")) {
    return path.join(publicAssetRoot, value.replace(/^\/+/, ""));
  }
  return path.join(publicAssetRoot, "apple-touch-icon.png");
}

function extensionForMediaUrl(value: string | undefined): string {
  if (unsplashPhotoId(value)) return ".jpg";
  const extension = value
    ? path.extname(new URL(value, "https://seed.invalid").pathname)
    : "";
  return extension && extension.length <= 6 ? extension.toLowerCase() : ".png";
}

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

async function uploadPublicAssetFromPath(
  bucket: "avatars" | "listing-media",
  objectPath: string,
  sourcePath: string,
): Promise<string> {
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

async function listStorageObjects(
  bucket: "avatars" | "listing-media",
  prefix: string,
): Promise<string[]> {
  const client = getSupabaseAdminClient();
  const { data, error } = await client.storage
    .from(bucket)
    .list(prefix, { limit: 1_000, sortBy: { column: "name", order: "asc" } });
  if (error) throw error;
  const paths: string[] = [];
  for (const item of data || []) {
    const itemPath = `${prefix}/${item.name}`;
    if (item.id) paths.push(itemPath);
    else paths.push(...(await listStorageObjects(bucket, itemPath)));
  }
  return paths;
}

async function removeStorageObjects(
  bucket: "avatars" | "listing-media",
  paths: readonly string[],
): Promise<void> {
  const client = getSupabaseAdminClient();
  for (let index = 0; index < paths.length; index += 100) {
    const { error } = await client.storage
      .from(bucket)
      .remove(paths.slice(index, index + 100));
    if (error) throw error;
  }
}

async function mapWithConcurrency<T, R>(
  values: readonly T[],
  concurrency: number,
  mapper: (value: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, values.length) },
    async () => {
      while (nextIndex < values.length) {
        const index = nextIndex++;
        results[index] = await mapper(values[index], index);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

async function seedPublicMedia() {
  for (const entry of demoMediaManifest.media) {
    const sourcePath = path.join(seedAssetRoot, entry.fileName);
    if (!fs.existsSync(sourcePath) || fs.statSync(sourcePath).size <= 1_024) {
      throw new Error(
        `Local demo media asset is missing or empty: ${sourcePath}`,
      );
    }
  }
  const [avatarObjects, listingObjects] = await Promise.all([
    listStorageObjects("avatars", "local-seed"),
    listStorageObjects("listing-media", "local-seed"),
  ]);
  const existingObjects = {
    avatars: new Set(avatarObjects),
    "listing-media": new Set(listingObjects),
  } satisfies Record<"avatars" | "listing-media", Set<string>>;
  const expectedObjects = {
    avatars: new Set<string>(),
    "listing-media": new Set<string>(),
  } satisfies Record<"avatars" | "listing-media", Set<string>>;
  const syncAsset = async (
    bucket: "avatars" | "listing-media",
    objectPath: string,
    sourcePath: string,
  ): Promise<string> => {
    expectedObjects[bucket].add(objectPath);
    if (existingObjects[bucket].has(objectPath)) {
      return getSupabaseAdminClient()
        .storage.from(bucket)
        .getPublicUrl(objectPath).data.publicUrl;
    }
    return uploadPublicAssetFromPath(bucket, objectPath, sourcePath);
  };
  const syncPublicAsset = (
    bucket: "avatars" | "listing-media",
    objectPath: string,
    relativeSourcePath: string,
  ) =>
    syncAsset(
      bucket,
      objectPath,
      path.join(publicAssetRoot, relativeSourcePath),
    );

  const demoMediaUrls = new Map<string, string>();
  const uploadedDemoMedia = await mapWithConcurrency(
    demoMediaManifest.media,
    4,
    async (entry) =>
      [
        entry.key,
        await syncAsset(
          "listing-media",
          `local-seed/demo-library/${entry.fileName}`,
          path.join(seedAssetRoot, entry.fileName),
        ),
      ] as const,
  );
  for (const [key, url] of uploadedDemoMedia) {
    demoMediaUrls.set(key, url);
  }

  const avatarUrls = new Map<string, string>();
  const profiles = allSeedProfiles();
  const uploadedAvatars = await mapWithConcurrency(
    profiles,
    4,
    async (profile) => {
      const sourceUrl = String(profile.avatarUrl || "");
      const extension = extensionForMediaUrl(sourceUrl);
      return [
        profile.legacyId,
        await syncAsset(
          "avatars",
          `local-seed/profiles/${profile.legacyId}${extension}`,
          sourcePathForMediaUrl(sourceUrl),
        ),
      ] as const;
    },
  );
  for (const [legacyId, url] of uploadedAvatars) {
    avatarUrls.set(legacyId, url);
  }

  const listingUrls = new Map<string, string[]>();
  const listingMedia = marketplaceFixture.listings.flatMap((listing) =>
    (listing.photos || []).map((photo, index) => ({ listing, photo, index })),
  );
  const uploadedListingMedia = await mapWithConcurrency(
    listingMedia,
    4,
    async ({ listing, photo, index }) => {
      const sourceUrl = String(photo.url || "");
      const extension = extensionForMediaUrl(sourceUrl);
      return {
        legacyId: String(listing.id),
        index,
        url: await syncAsset(
          "listing-media",
          `local-seed/marketplace/${listing.id}/${index + 1}${extension}`,
          sourcePathForMediaUrl(sourceUrl),
        ),
      };
    },
  );
  for (const { legacyId, index, url } of uploadedListingMedia) {
    const urls = listingUrls.get(legacyId) || [];
    urls[index] = url;
    listingUrls.set(legacyId, urls);
  }

  const categoryDirectory = path.join(publicAssetRoot, "images/categories");
  const categorySourceFiles = fs.readdirSync(categoryDirectory).sort();
  const categorySourceFileSet = new Set(categorySourceFiles);
  const { data: activeRootCategories, error: rootCategoryError } = await (
    getSupabaseAdminClient().from("categories" as any) as any
  )
    .select("slug")
    .is("parent_id", null)
    .eq("is_active", true)
    .eq("status", "active")
    .order("sort_order", { ascending: true });
  if (rootCategoryError) throw rootCategoryError;
  const categoryFiles = new Map(
    categorySourceFiles.map((fileName) => [fileName, fileName]),
  );
  for (const category of activeRootCategories || []) {
    const fileName = `${String(category.slug)}.jpg`;
    categoryFiles.set(
      fileName,
      categorySourceFileSet.has(fileName)
        ? fileName
        : "dons-et-objets-gratuits.jpg",
    );
  }
  await mapWithConcurrency(
    [...categoryFiles.entries()],
    4,
    async ([fileName, sourceFileName]) =>
      syncAsset(
        "listing-media",
        `local-seed/categories/${fileName}`,
        path.join(categoryDirectory, sourceFileName),
      ),
  );

  const vehicleAssets: Record<string, string> = {
    vehicle_3008_diesel: "images/auto/peugeot-3008-diesel.jpg",
    vehicle_3008_petrol: "images/auto/peugeot-3008-petrol.jpg",
    vehicle_3008_hybrid: "images/auto/peugeot-3008-hybrid.jpg",
    vehicle_bmw_x3: "images/auto/bmw-x3.jpg",
  };
  const vehicleUrls = new Map<string, string>();
  const uploadedVehicles = await mapWithConcurrency(
    Object.entries(vehicleAssets),
    4,
    async ([legacyId, source]) =>
      [
        legacyId,
        await syncPublicAsset(
          "listing-media",
          `local-seed/automotive/${path.basename(source)}`,
          source,
        ),
      ] as const,
  );
  for (const [legacyId, url] of uploadedVehicles) {
    vehicleUrls.set(legacyId, url);
  }

  const propertyAssets: Record<string, string> = {
    property_apartment_lyon: "images/immo/appartement-lyon.webp",
    property_rental_lyon: "images/immo/location-lyon.webp",
    property_house_ecully: "images/immo/maison-ecully.webp",
  };
  const propertyUrls = new Map<string, string>();
  const uploadedProperties = await mapWithConcurrency(
    Object.entries(propertyAssets),
    3,
    async ([legacyId, source]) =>
      [
        legacyId,
        await syncPublicAsset(
          "listing-media",
          `local-seed/real-estate/${path.basename(source)}`,
          source,
        ),
      ] as const,
  );
  for (const [legacyId, url] of uploadedProperties) {
    propertyUrls.set(legacyId, url);
  }

  const employerLogoUrl = await syncPublicAsset(
    "avatars",
    "local-seed/organizations/employer-logo.png",
    "brand/shongre/icon/mono-orange.png",
  );

  await Promise.all(
    (["avatars", "listing-media"] as const).map((bucket) =>
      removeStorageObjects(
        bucket,
        [...existingObjects[bucket]].filter(
          (objectPath) => !expectedObjects[bucket].has(objectPath),
        ),
      ),
    ),
  );

  return {
    avatarUrls,
    demoMediaUrls,
    employerLogoUrl,
    listingUrls,
    propertyUrls,
    vehicleUrls,
  };
}

async function seedProfiles(
  avatarUrls: ReadonlyMap<string, string>,
): Promise<void> {
  const seeds = allSeedProfiles();
  const profiles = seeds.map((seed) => {
    const accountType =
      seed.accountType === "professional" ? "professional" : "individual";
    const primaryRole = normalizePrimaryRole(seed);
    return {
      id: profileId(seed.legacyId),
      slug: seed.slug,
      email: (seed.email || `${seed.slug}@local.shongre.invalid`).toLowerCase(),
      name: seed.name,
      account_type: accountType,
      professional_vertical: seed.professionalVertical || null,
      custom_permissions: seed.customPermissions || [],
      revoked_permissions: seed.revokedPermissions || [],
      primary_role: primaryRole,
      status: normalizeAccountStatus(seed),
      avatar_url: avatarUrls.get(seed.legacyId) || null,
      phone: seed.phone || null,
      city: seed.city || null,
      postal_code: seed.postalCode || null,
      department: seed.department || null,
      region: seed.region || null,
      country: seed.country || "FR",
      bio:
        seed.bio || "Profil synthétique pour le développement local Shongre.",
      is_verified: seed.isVerified ?? true,
      is_identity_verified: seed.isIdentityVerified ?? true,
      is_phone_verified: seed.isPhoneVerified ?? true,
      is_email_verified: seed.isEmailVerified ?? true,
      is_business_verified:
        seed.isBusinessVerified ?? accountType === "professional",
      rating: Number(seed.rating ?? 4.8),
      review_count: Number(seed.reviewCount ?? 12),
      response_rate_percent: Number(seed.responseRatePercent ?? 98),
      response_time_text: seed.responseTimeText || "en moins de deux heures",
      updated_at: FIXED_CREATED_AT,
    };
  });

  const client = getSupabaseAdminClient() as any;
  const profileResult = await client.from("profiles").upsert(profiles);
  if (profileResult.error) throw profileResult.error;

  const credentialHash = await hashPassword(DEMO_ACCOUNT_PASSWORD);
  const credentialResult = await client.from("user_credentials").upsert(
    profiles.map((profile) => ({
      user_id: profile.id,
      password_hash: credentialHash,
      updated_at: FIXED_CREATED_AT,
    })),
  );
  if (credentialResult.error) throw credentialResult.error;

  const staffSeeds = seeds.filter(
    (seed) => seed.staffStatus && seed.staffStatus !== "none" && seed.staffRole,
  );
  if (staffSeeds.length) {
    const owner =
      staffSeeds.find((seed) => seed.staffRole === "owner") || staffSeeds[0];
    const actorId = profileId(owner.legacyId);
    const databaseUrl = process.env.DATABASE_URL;
    if (
      !databaseUrl ||
      !["127.0.0.1", "localhost", "::1"].includes(new URL(databaseUrl).hostname)
    ) {
      throw new Error(
        "Local Staff fixtures require a proven loopback DATABASE_URL.",
      );
    }
    // The membership guard intentionally has no unowned first-owner path. The
    // guarded local-only seed bootstraps that one synthetic owner; every other
    // membership still goes through the production trigger and audit path.
    runPsql(
      databaseUrl,
      `BEGIN;
SET LOCAL session_replication_role = replica;
INSERT INTO public.staff_memberships (
  user_id, status, staff_role, granted_by, updated_by, change_reason
) VALUES (
  '${actorId}'::uuid, 'active', 'owner', NULL, NULL,
  'Bootstrap synthétique du propriétaire Staff local'
)
ON CONFLICT (user_id) DO UPDATE SET
  status = EXCLUDED.status,
  staff_role = EXCLUDED.staff_role,
  change_reason = EXCLUDED.change_reason,
  suspended_at = NULL,
  revoked_at = NULL;
COMMIT;`,
    );
    const membershipResult = await client
      .from("staff_memberships")
      .select("user_id,status,staff_role");
    if (membershipResult.error) throw membershipResult.error;
    const memberships = new Map(
      (membershipResult.data || []).map((membership: any) => [
        membership.user_id,
        membership,
      ]),
    );
    for (const seed of staffSeeds) {
      if (seed.legacyId === owner.legacyId) continue;
      const userId = profileId(seed.legacyId);
      const status = seed.staffStatus;
      const current = memberships.get(userId);
      if (current?.status === status && current.staff_role === seed.staffRole) {
        continue;
      }
      const result = await client.from("staff_memberships").upsert({
        user_id: userId,
        status,
        staff_role: seed.staffRole,
        granted_by: actorId,
        updated_by: actorId,
        change_reason: "Scénario déterministe de développement local",
        suspended_at: status === "suspended" ? FIXED_CREATED_AT : null,
        revoked_at: status === "revoked" ? FIXED_CREATED_AT : null,
      });
      if (result.error) throw result.error;
    }
  }
}

async function seedOrganizations(): Promise<{
  auto: { organizationId: string; locationId: string };
  course: { organizationId: string };
  marketplace: { organizationId: string };
  realEstate: {
    organizationId: string;
    branches: Record<"branch_lyon" | "branch_ecully", string>;
  };
}> {
  const client = getSupabaseAdminClient() as any;
  const autoOrganizationId = organizationId("dealer_auto_select_lyon");
  const realEstateOrganizationId = organizationId("agency_canopee");
  const courseOrganizationId = organizationId("org_college_lumiere");
  const marketplaceOrganizationId = organizationId("atelier_nordique");
  const organizations = [
    {
      id: marketplaceOrganizationId,
      owner_id: profileId("user_pro_atelier"),
      legal_name: "Atelier Nordique SAS Développement",
      trade_name: "Atelier Nordique",
      registered_address: "Adresse synthétique — Lyon",
      city: "Lyon",
      postal_code: "69002",
      country: "FR",
      is_verified: true,
      status: "active",
      professional_vertical: "generic",
    },
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
    marketplace: { organizationId: marketplaceOrganizationId },
    realEstate: { organizationId: realEstateOrganizationId, branches },
  };
}

function listingStatus(value: string): Listing["status"] {
  if (value === "active" || value === "reserved") return "published";
  if (value === "pending_review" || value === "expired") return "draft";
  return value as Listing["status"];
}

function listingPromotionType(
  value: string | undefined,
): Listing["promotionType"] {
  const aliases: Record<string, Listing["promotionType"]> = {
    urgent: "urgent_badge",
    highlight: "featured",
    top_of_list: "top_placement",
    gallery_boost: "featured",
    spotlight: "homepage_spotlight",
  };
  return value
    ? aliases[value] || (value as Listing["promotionType"])
    : undefined;
}

const CATEGORY_COMPATIBILITY_IDS: Readonly<Record<string, string>> = {
  "accessoires-animaux": "pets.accessories",
  "appartements-a-vendre": "real_estate.sales",
  "cours-particuliers": "services.tutoring",
  "engins-de-chantier": "professional_btp.machinery",
  "equipement-bebe": "baby_kids",
  "sports-nautiques": "sports_outdoors.water_sports",
};

function listingCategory(
  source: Record<string, any>,
  availableCategoryIds: ReadonlySet<string>,
): {
  id: string;
  path: string[];
} {
  const resolved =
    resolveTaxonomyV4Identity(source.subCategorySlug) ||
    resolveTaxonomyV4Identity(source.categorySlug);
  const id = resolved?.id || source.subCategorySlug || source.categorySlug;
  const segments = id.split(".");
  const canonicalPath = segments.map((_, index) =>
    segments.slice(0, index + 1).join("."),
  );
  const compatibilityId = CATEGORY_COMPATIBILITY_IDS[source.subCategorySlug];
  const storageId = [
    compatibilityId,
    ...[...canonicalPath].reverse(),
    source.subCategorySlug,
    source.categorySlug,
  ].find((candidate) => candidate && availableCategoryIds.has(candidate));
  if (!storageId) {
    throw new Error(
      `No database category is compatible with ${source.categorySlug}/${source.subCategorySlug}.`,
    );
  }
  return {
    id: storageId,
    path: [
      source.categorySlug,
      source.subCategorySlug,
      ...canonicalPath,
    ].filter(
      (value, index, values) =>
        Boolean(value) && values.indexOf(value) === index,
    ),
  };
}

async function removeLegacyMarketplaceSeed(): Promise<void> {
  const client = getSupabaseAdminClient() as any;
  const ids = ["list_1", "list_be_1"].map(listingId);
  for (const table of ["listing_media", "listing_market_publications"]) {
    const result = await client.from(table).delete().in("listing_id", ids);
    if (result.error) throw result.error;
  }
  const result = await client.from("listings").delete().in("id", ids);
  if (result.error) throw result.error;
}

async function seedGenericListings(
  listingUrls: ReadonlyMap<string, readonly string[]>,
  marketplaceOrganizationId: string,
): Promise<void> {
  const repository = new PostgresListingRepository();
  const client = getSupabaseAdminClient() as any;
  await removeLegacyMarketplaceSeed();
  const categoryResult = await client.from("categories").select("id");
  if (categoryResult.error) throw categoryResult.error;
  const availableCategoryIds = new Set<string>(
    (categoryResult.data || []).map((category: any) => category.id),
  );
  for (const source of marketplaceFixture.listings) {
    const mappedId = listingId(source.id);
    const category = listingCategory(source, availableCategoryIds);
    const marketCode = String(source.marketCode || "FR").toUpperCase();
    const currency = String(source.currency || "EUR").toUpperCase();
    const price = Number(source.price || 0);
    const photos = [...(listingUrls.get(source.id) || [])];
    const marketPublications = (
      source.marketPublications?.length
        ? source.marketPublications
        : [
            {
              marketCode,
              status: "active",
              isPrimary: true,
              publishedAt: source.publishedAt || source.createdAt,
              customPrice: price,
              currency,
              complianceChecked: true,
            },
          ]
    ).map((publication: Record<string, any>) => ({
      marketCode: String(publication.marketCode || marketCode).toUpperCase(),
      status:
        publication.status === "pending"
          ? ("pending_review" as const)
          : publication.status,
      isPrimary:
        publication.isPrimary ??
        String(publication.marketCode || marketCode).toUpperCase() ===
          marketCode,
      priceMinor: Math.round(Number(publication.customPrice ?? price) * 100),
      currency: String(publication.currency || currency).toUpperCase(),
      complianceState:
        publication.complianceChecked === false
          ? ("pending" as const)
          : ("approved" as const),
      publishedAt: publication.publishedAt || source.createdAt,
      sortDate: publication.publishedAt || source.createdAt,
    }));
    const promotionType = listingPromotionType(
      source.promotionType || source.boostType,
    );
    const listing: Listing = {
      id: mappedId,
      sellerId: profileId(source.sellerId),
      publisherType:
        source.publisherType ||
        (source.sellerType === "pro" ? "professional" : "private"),
      publisherUserId: profileId(source.publisherUserId || source.sellerId),
      publisherOrganizationId:
        source.sellerType === "pro" ? marketplaceOrganizationId : undefined,
      publisherVerificationStatus:
        source.publisherVerificationStatus ||
        (source.sellerType === "pro"
          ? "business_verified"
          : source.sellerIsVerified
            ? "identity_verified"
            : "unverified"),
      categoryId: category.id,
      title: source.title,
      description: source.description,
      price,
      originalPrice: source.originalPrice,
      currency,
      status: listingStatus(source.status),
      condition: source.condition || "not_applicable",
      brand: source.attributes?.brand,
      model: source.attributes?.model,
      marketCode,
      marketCodes: source.marketCodes || [marketCode],
      marketPublications,
      city: source.city,
      postalCode: source.postalCode,
      department: source.department,
      region: source.region,
      country: source.country || marketCode,
      latitude: source.latitude,
      longitude: source.longitude,
      allowedDelivery: (source.deliveryOptions || [])
        .filter((option: Record<string, any>) => option.available)
        .map((option: Record<string, any>) => option.type)
        .filter((type: string) => type !== "custom_carrier"),
      shippingCost: Number(
        (source.deliveryOptions || []).find(
          (option: Record<string, any>) => option.available && option.price,
        )?.price || 0,
      ),
      images: photos,
      isUrgent: promotionType === "urgent_badge",
      isFeatured: Boolean(source.isBoosted && promotionType !== "urgent_badge"),
      promotionState:
        source.promotionState || (source.isBoosted ? "active" : "inactive"),
      promotionType,
      promotionSource:
        source.promotionSource ||
        (source.isBoosted ? "admin_grant" : undefined),
      promotionSourceId:
        source.promotionSourceId ||
        (source.isBoosted
          ? localSeedUuid("listing-promotion", source.id)
          : undefined),
      promotionLabel: source.promotionLabel,
      promotionStartAt:
        source.promotionStartAt ||
        (source.isBoosted ? source.createdAt : undefined),
      promotionEndAt:
        source.promotionEndAt ||
        (source.isBoosted ? FIXED_EXPIRES_AT : undefined),
      publishedAt: source.publishedAt || source.createdAt,
      materiallyUpdatedAt: source.materiallyUpdatedAt,
      organicFreshnessAt: source.organicFreshnessAt || source.createdAt,
      viewCount: Number(source.viewsCount ?? source.viewCount ?? 0),
      favoriteCount: Number(source.favoritesCount ?? 0),
      attributes: {
        ...(source.attributes || {}),
        categoryPath: category.path,
        legacyCategorySlug: source.categorySlug,
        legacySubCategorySlug: source.subCategorySlug,
        isNegotiable: Boolean(source.isNegotiable),
        isFreeDonation: Boolean(source.isFreeDonation),
        contactCount: Number(source.contactCount || 0),
      },
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
      expiresAt: FIXED_EXPIRES_AT,
    };
    await repository.save(listing);
    const deleteResult = await client
      .from("listing_media")
      .delete()
      .eq("listing_id", mappedId);
    if (deleteResult.error) throw deleteResult.error;
    if (photos.length) {
      const mediaResult = await client.from("listing_media").insert(
        photos.map((url, index) => ({
          id: localSeedUuid("listing-media", `${source.id}:${index}`),
          listing_id: mappedId,
          url,
          sort_order: index,
          is_primary: index === 0,
        })),
      );
      if (mediaResult.error) throw mediaResult.error;
    }
  }
}

function rewriteDemoMediaUrl(
  value: string | undefined,
  demoMediaUrls: ReadonlyMap<string, string>,
): string | undefined {
  const photoId = unsplashPhotoId(value);
  return photoId ? demoMediaUrls.get(photoId) : value;
}

function orderStatus(source: Record<string, any>): Transaction["status"] {
  if (source.id === "7d3e760f-4ad7-47e5-8ca5-2a4ea59a3151") return "completed";
  const aliases: Record<string, Transaction["status"]> = {
    offer_accepted: "initiated",
    payment_escrowed: "escrow_funded",
    escrow_secured: "escrow_funded",
    pending_seller_confirmation: "escrow_funded",
    seller_confirmed: "escrow_funded",
    ready_for_pickup: "pin_pending",
    pickup_scheduled: "pin_pending",
    delivered: "completed",
    handover_confirmed: "completed",
    cancelled_by_buyer: "cancelled",
    cancelled_by_seller: "cancelled",
    seller_rejected: "cancelled",
    expired: "cancelled",
  };
  return aliases[source.status] || source.status;
}

const TRANSACTION_LISTING_ALIASES: Readonly<Record<string, string>> = {
  "tx-903": "list-112",
  "tx-904": "list-103",
};

function transactionListing(source: Record<string, any>): Record<string, any> {
  const legacyListingId =
    TRANSACTION_LISTING_ALIASES[source.id] || source.listingId;
  const listing = marketplaceFixture.listings.find(
    (candidate) => candidate.id === legacyListingId,
  );
  if (!listing) {
    throw new Error(`Transaction ${source.id} has no local listing fixture.`);
  }
  return listing;
}

function transactionListingSnapshotId(transactionId: string): string {
  return localSeedUuid("transaction-listing-snapshot", transactionId);
}

async function createTransactionListingSnapshot(
  source: Record<string, any>,
  sourceListing: Record<string, any>,
): Promise<string> {
  const repository = new PostgresListingRepository();
  const client = getSupabaseAdminClient() as any;
  const sourceId = listingId(sourceListing.id);
  const snapshotId = transactionListingSnapshotId(source.id);
  const listing = await repository.findById(sourceId);
  if (!listing) {
    throw new Error(
      `Transaction ${source.id} cannot snapshot missing listing ${sourceListing.id}.`,
    );
  }

  await repository.save({
    ...listing,
    id: snapshotId,
    status: "published",
    isUrgent: false,
    isFeatured: false,
    promotionState: "inactive",
    promotionType: undefined,
    promotionSource: undefined,
    promotionSourceId: undefined,
    promotionLabel: undefined,
    promotionStartAt: undefined,
    promotionEndAt: undefined,
    externalStockId: undefined,
    duplicateGroupId: undefined,
    marketPublications: listing.marketPublications?.map((publication) => ({
      ...publication,
      promotionState: "inactive",
      promotionType: undefined,
      promotionSource: undefined,
      promotionSourceId: undefined,
      promotionLabel: undefined,
      promotionStartAt: undefined,
      promotionEndAt: undefined,
      promotedAt: undefined,
    })),
    attributes: {
      ...listing.attributes,
      localSeedRole: "transaction_snapshot",
      sourceListingId: sourceId,
    },
  });

  const deleteMediaResult = await client
    .from("listing_media")
    .delete()
    .eq("listing_id", snapshotId);
  if (deleteMediaResult.error) throw deleteMediaResult.error;
  if (listing.images.length) {
    const mediaResult = await client.from("listing_media").insert(
      listing.images.map((url, index) => ({
        id: localSeedUuid("transaction-listing-media", `${source.id}:${index}`),
        listing_id: snapshotId,
        url,
        sort_order: index,
        is_primary: index === 0,
      })),
    );
    if (mediaResult.error) throw mediaResult.error;
  }

  return snapshotId;
}

async function seedMarketplaceAccountScenario(
  demoMediaUrls: ReadonlyMap<string, string>,
): Promise<void> {
  const client = getSupabaseAdminClient() as any;
  const conversationIds = marketplaceFixture.conversations.map((source) =>
    localSeedUuid("conversation", source.id),
  );
  if (conversationIds.length) {
    const deleteResult = await client
      .from("conversations")
      .delete()
      .in("id", conversationIds);
    if (deleteResult.error) throw deleteResult.error;
    const conversationResult = await client.from("conversations").insert(
      marketplaceFixture.conversations.map((source) => ({
        id: localSeedUuid("conversation", source.id),
        listing_id: listingId(source.listingId),
        buyer_id: profileId(source.buyerId),
        seller_id: profileId(source.sellerId),
        last_message_text: source.lastMessage,
        last_message_at: source.lastMessageAt,
        created_at: source.createdAt || source.lastMessageAt,
        updated_at: source.lastMessageAt,
      })),
    );
    if (conversationResult.error) throw conversationResult.error;
  }

  const messages: Message[] = [];
  for (const [legacyConversationId, sourceMessages] of Object.entries(
    marketplaceFixture.messages,
  )) {
    for (const source of sourceMessages) {
      messages.push({
        id: localSeedUuid("message", source.id),
        conversationId: localSeedUuid("conversation", legacyConversationId),
        senderId: profileId(source.senderId),
        text: source.content,
        attachments: source.attachmentUrl
          ? [rewriteDemoMediaUrl(source.attachmentUrl, demoMediaUrls)!]
          : [],
        isOffer: source.type === "offer",
        offerPrice: source.offerAmount,
        offerAmountMinor:
          source.offerAmountMinor ||
          (source.offerAmount
            ? Math.round(source.offerAmount * 100)
            : undefined),
        offerCurrency:
          source.offerCurrency || (source.type === "offer" ? "EUR" : undefined),
        offerExpiresAt: source.offerExpiresAt,
        offerStatus: source.offerStatus,
        createdAt: source.createdAt,
      });
    }
  }
  if (messages.length) {
    const messageResult = await client.from("messages").insert(
      messages.map((message) => ({
        id: message.id,
        conversation_id: message.conversationId,
        sender_id: message.senderId,
        text: message.text,
        attachments: message.attachments || [],
        is_offer: Boolean(message.isOffer),
        offer_price: message.offerPrice || null,
        offer_status: message.offerStatus || null,
        offer_amount_minor: message.offerAmountMinor || null,
        offer_currency: message.offerCurrency || null,
        offer_expires_at: message.offerExpiresAt || null,
        created_at: message.createdAt,
      })),
    );
    if (messageResult.error) throw messageResult.error;
  }

  const orderIds = marketplaceFixture.transactions.map((source) =>
    localSeedUuid("order", source.id),
  );
  if (orderIds.length) {
    const deleteResult = await client
      .from("orders")
      .delete()
      .in("id", orderIds);
    if (deleteResult.error) throw deleteResult.error;
  }
  const transactionSnapshotIds = marketplaceFixture.transactions.map((source) =>
    transactionListingSnapshotId(source.id),
  );
  if (transactionSnapshotIds.length) {
    const deleteResult = await client
      .from("listings")
      .delete()
      .in("id", transactionSnapshotIds);
    if (deleteResult.error) throw deleteResult.error;
  }
  const orderRepository = new PostgresOrderRepository();
  for (const source of marketplaceFixture.transactions) {
    const sourceListing = transactionListing(source);
    const targetStatus = orderStatus(source);
    const terminalStatus = ["completed", "cancelled", "refunded"].includes(
      targetStatus,
    );
    // Demo fixtures intentionally keep some catalog cards active while also
    // showing historical transactions for the same product. A real order
    // correctly reserves or sells its listing through database triggers, so a
    // transaction-owned snapshot preserves both scenarios without weakening
    // the production lifecycle invariant or hiding the public demo catalog.
    const targetListingId =
      sourceListing.status === "active"
        ? await createTransactionListingSnapshot(source, sourceListing)
        : listingId(sourceListing.id);
    const listingStateResult = await client
      .from("listings")
      .update({ status: "published", updated_at: FIXED_CREATED_AT })
      .eq("id", targetListingId);
    if (listingStateResult.error) throw listingStateResult.error;
    const itemAmount = Number(source.amount ?? source.listingPrice ?? 0);
    const protectionFee = Number(source.protectionFee || 0);
    const shippingFee = Number(source.shippingFee || 0);
    const totalCharged = Number(
      source.totalAmount ?? itemAmount + protectionFee + shippingFee,
    );
    const currency = String(source.currency || "EUR").toUpperCase();
    const order: OrderRecord = {
      id: localSeedUuid("order", source.id),
      orderNumber: source.code || `LOCAL-${source.id}`,
      transactionType: "DIRECT_PURCHASE",
      listingId: targetListingId,
      buyerId: profileId(source.buyerId),
      sellerId: profileId(sourceListing.sellerId),
      status: terminalStatus ? "initiated" : targetStatus,
      itemAmount,
      itemAmountMinor: Math.round(itemAmount * 100),
      protectionFee,
      protectionFeeMinor: Math.round(protectionFee * 100),
      shippingFee,
      shippingFeeMinor: Math.round(shippingFee * 100),
      totalCharged,
      totalChargedMinor: Math.round(totalCharged * 100),
      escrowSecuredAmount: itemAmount + shippingFee,
      escrowSecuredAmountMinor: Math.round((itemAmount + shippingFee) * 100),
      currency,
      deliveryMethod:
        source.deliveryMethod === "custom_carrier"
          ? "home_delivery"
          : source.deliveryMethod,
      shippingAddress: source.deliveryAddress
        ? {
            street: source.deliveryAddress.street,
            city: source.deliveryAddress.city,
            postalCode: source.deliveryAddress.postalCode,
            country: source.marketCode || "FR",
          }
        : undefined,
      isPinVerified: source.verificationCodeStatus === "verified",
      paymentMethod: source.payment?.paymentMethod || "card",
      paymentIntentId: source.payment?.intentId,
      carrierName: source.carrierName,
      trackingNumber: source.trackingNumber,
      shippedAt: source.shippedAt,
      handoverPinAttempts: 0,
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
    };
    const createdOrder = await orderRepository.create(order);
    if (terminalStatus) {
      await orderRepository.update(createdOrder.id, { status: targetStatus });
    }
  }

  const notificationIds = marketplaceFixture.notifications.map((source) =>
    localSeedUuid("notification", source.id),
  );
  if (notificationIds.length) {
    const deleteResult = await client
      .from("notifications")
      .delete()
      .in("id", notificationIds);
    if (deleteResult.error) throw deleteResult.error;
  }
  const notificationRepository = new PostgresNotificationRepository();
  for (const source of marketplaceFixture.notifications) {
    const notification: NotificationItem = {
      id: localSeedUuid("notification", source.id),
      userId: profileId(source.userId),
      type: source.type,
      category: ["message", "offer"].includes(source.type)
        ? "messages"
        : "listings",
      title: source.title,
      body: source.message,
      marketCode: "FR",
      linkUrl: source.linkUrl || source.link,
      isRead: Boolean(source.isRead),
      inAppVisible: true,
      createdAt: source.createdAt,
    };
    await notificationRepository.save(notification);
  }

  const savedSearchIds = marketplaceFixture.savedSearches.map((source) =>
    localSeedUuid("saved-search", source.id),
  );
  if (savedSearchIds.length) {
    const deleteResult = await client
      .from("saved_searches")
      .delete()
      .in("id", savedSearchIds);
    if (deleteResult.error) throw deleteResult.error;
    const savedSearchResult = await client.from("saved_searches").insert(
      marketplaceFixture.savedSearches.map((source) => ({
        id: localSeedUuid("saved-search", source.id),
        user_id: profileId("user_thomas"),
        query: source.filters?.query || source.title,
        category_id: null,
        filters: { ...source.filters, title: source.title },
        market_code: source.filters?.marketCode || "FR",
        email_alerts_enabled: Boolean(source.hasNotifications),
        created_at: source.createdAt,
      })),
    );
    if (savedSearchResult.error) throw savedSearchResult.error;
  }

  const reviewIds = marketplaceFixture.reviews.map((source) =>
    localSeedUuid("review", source.id),
  );
  if (reviewIds.length) {
    const deleteResult = await client
      .from("reviews")
      .delete()
      .in("id", reviewIds);
    if (deleteResult.error) throw deleteResult.error;
  }
  const reviewRepository = new PostgresReviewRepository();
  for (const source of marketplaceFixture.reviews) {
    const review: ReviewItem = {
      id: localSeedUuid("review", source.id),
      targetUserId: profileId(source.targetUserId),
      authorId: profileId(source.authorId),
      authorName: source.authorName,
      rating: Number(source.rating),
      comment: source.comment,
      listingTitle: source.listingTitle,
      createdAt: source.createdAt,
    };
    await reviewRepository.save(review);
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
  const client = getSupabaseAdminClient() as any;
  const existingResult = await client
    .from("real_estate_properties")
    .select("id,listing_id,slug");
  if (existingResult.error) throw existingResult.error;
  const existingBySlug = new Map(
    (existingResult.data || []).map((property: any) => [
      property.slug,
      property,
    ]),
  );
  for (const source of DEFAULT_REAL_ESTATE_PROPERTIES) {
    const isAgency = source.seller.type === "agency";
    const existing = existingBySlug.get(source.slug);
    const property: PropertyPrivate = {
      ...structuredClone(source),
      id: existing?.id || localSeedUuid("real-estate-property", source.id),
      listingId: existing?.listing_id || listingId(source.listingId),
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

async function seedTrendingCache(): Promise<number> {
  const response = await trendingService.getSection(
    { marketCode: "FR", locale: "fr-FR", limit: 4 },
    { bypassCache: true },
  );
  if (!response.topics.length) {
    throw new Error("The local trending cache has no topics after seeding.");
  }
  return response.topics.length;
}

export interface LocalDevelopmentSeedSummary {
  profiles: number;
  genericListings: number;
  vehicles: number;
  properties: number;
  tutors: number;
  courseOffers: number;
  jobs: number;
  conversations: number;
  messages: number;
  transactions: number;
  notifications: number;
  savedSearches: number;
  reviews: number;
  trendingTopics: number;
  publicStorageObjects: number;
}

export async function seedLocalDevelopmentData(): Promise<LocalDevelopmentSeedSummary> {
  if (
    process.env.APP_ENV !== "local" ||
    process.env.ALLOW_DEMO_SEED !== "true"
  ) {
    throw new Error(
      "Local development data requires APP_ENV=local and ALLOW_DEMO_SEED=true.",
    );
  }

  await importBaselineCommercialCatalog();
  const media = await seedPublicMedia();
  await seedProfiles(media.avatarUrls);
  const organizations = await seedOrganizations();
  await seedGenericListings(
    media.listingUrls,
    organizations.marketplace.organizationId,
  );
  await seedAutomotive(organizations.auto, media.vehicleUrls);
  await seedRealEstate(organizations.realEstate, media.propertyUrls);
  await seedCourses(organizations.course.organizationId, media.avatarUrls);
  await seedEmployment(media.employerLogoUrl);
  await seedMarketplaceAccountScenario(media.demoMediaUrls);
  const trendingTopics = await seedTrendingCache();

  const profileCount = allSeedProfiles().length;
  const messageCount = Object.values(marketplaceFixture.messages).reduce(
    (count, messages) => count + messages.length,
    0,
  );
  const genericPhotoCount = marketplaceFixture.listings.reduce(
    (count, listing) => count + (listing.photos?.length || 0),
    0,
  );
  const categoryImageCount = fs
    .readdirSync(path.join(publicAssetRoot, "images/categories"))
    .filter((fileName) => /\.(?:jpe?g|png|webp)$/i.test(fileName)).length;

  return {
    profiles: profileCount,
    genericListings: marketplaceFixture.listings.length,
    vehicles: DEMO_AUTO_VEHICLES.length,
    properties: DEFAULT_REAL_ESTATE_PROPERTIES.length,
    tutors: DEMO_TUTOR_PROFILES.length,
    courseOffers: DEMO_COURSE_OFFERS.length,
    jobs: EMPLOYMENT_DEMO_JOBS.length,
    conversations: marketplaceFixture.conversations.length,
    messages: messageCount,
    transactions: marketplaceFixture.transactions.length,
    notifications: marketplaceFixture.notifications.length,
    savedSearches: marketplaceFixture.savedSearches.length,
    reviews: marketplaceFixture.reviews.length,
    trendingTopics,
    publicStorageObjects:
      demoMediaManifest.media.length +
      profileCount +
      genericPhotoCount +
      categoryImageCount +
      DEMO_AUTO_VEHICLES.length +
      DEFAULT_REAL_ESTATE_PROPERTIES.length +
      1,
  };
}
