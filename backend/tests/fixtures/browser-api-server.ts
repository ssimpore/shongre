import { TaxonomyV1Service } from "../../src/modules/taxonomy/taxonomy.v1.service.js";
import "./install-taxonomy.js";
import { writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createBackendApplication } from "../../src/app/server/index.js";
import { config } from "../../src/app/config/index.js";
import { seedDemoCredentials } from "../../src/app/bootstrap/seed-demo-credentials.js";
import {
  repositories,
  DemoListingRepository,
  CANONICAL_DEMO_LISTINGS,
  authRepository,
} from "../../src/infrastructure/database/repositories/index.js";
import { hashPassword } from "../../src/shared/auth/password.js";
import { DEMO_ACCOUNT_PASSWORD } from "../../src/app/bootstrap/demo-account-password.js";
import {
  createMfaSecret,
  encryptMfaSecret,
  hashMfaBackupCode,
} from "../../src/modules/auth/mfa.service.js";
import {
  createSeedListing,
  marketplaceFixture,
} from "../../scripts/seed/local-development-data.js";
import { TAXONOMY_V1_PRIVATE_BUNDLE } from "../../taxonomy/generated/taxonomy-v1.private.js";
import { localSeedUuid } from "../../scripts/seed/local-seed-identity.js";
import type { UserProfile } from "../../src/shared/types/index.js";

if (
  config.environment.environment !== "test" ||
  !process.env.E2E_API_PORT_FILE ||
  !process.env.E2E_ACCOUNTS_FILE
) {
  throw new Error(
    "The browser API fixture requires the isolated test profile.",
  );
}

interface BrowserAccount {
  /** Backend identity the persona resolves to; a UUID in database mode. */
  id: string;
  email: string;
  recoveryCodes: string[];
}

// Unique recovery codes exercise real MFA without cross-worker TOTP replay.
// This expanded bank belongs only to this ephemeral test API.
async function installStaffRecoveryCodes(user: UserProfile): Promise<string[]> {
  if (user.staffStatus !== "active") return [];
  const recoveryCodes = Array.from({ length: 1024 }, () =>
    randomBytes(8).toString("hex"),
  );
  await authRepository.saveMfaCredential({
    userId: user.id,
    ...encryptMfaSecret(createMfaSecret()),
    backupCodeHashes: recoveryCodes.map(hashMfaBackupCode),
    enabledAt: new Date().toISOString(),
    disabledAt: null,
    lastUsedCounter: null,
  });
  return recoveryCodes;
}

const accounts: Record<string, BrowserAccount> = {};
// The same backend-owned marketplace scenario powers local PostgreSQL and the
// browser API, so listing identities are the seed's deterministic UUIDs in
// both modes. Neither identities nor inventory are injected into the client.
const listingIds: Record<string, string> = {};
for (const source of marketplaceFixture.listings) {
  listingIds[source.id] = localSeedUuid("listing", source.id);
}

if (config.dataMode === "demo") {
  await seedDemoCredentials();
  const passwordHash = await hashPassword(DEMO_ACCOUNT_PASSWORD);
  for (const source of marketplaceFixture.users) {
    const primaryRole =
      source.accountType === "professional"
        ? "pro_seller"
        : source.primaryRole === "seller"
          ? "individual_seller"
          : "individual_buyer";
    const user: UserProfile = {
      ...source,
      id: source.id,
      slug: source.slug,
      email: source.email,
      name: source.name,
      country: source.country,
      accountType: source.accountType,
      primaryRole,
      role: primaryRole,
      status: source.status === "limited" ? "restricted" : source.status,
      isVerified: Boolean(source.isVerified),
      isIdentityVerified: Boolean(source.isIdentityVerified),
      isPhoneVerified: Boolean(source.isPhoneVerified),
      isEmailVerified: Boolean(source.isEmailVerified),
      rating: Number(source.rating || 0),
      reviewCount: Number(source.reviewCount || 0),
      responseRatePercent: Number(source.responseRatePercent || 0),
    };
    await repositories.users.save(user);
    await repositories.users.saveCredential({ userId: user.id, passwordHash });
    accounts[source.id] = {
      id: user.id,
      email: user.email,
      recoveryCodes: await installStaffRecoveryCodes(user),
    };
  }
  if (!(repositories.listings instanceof DemoListingRepository)) {
    throw new Error("Browser scenario cannot replace a database repository.");
  }
  // Existing transaction and messaging scenarios reference these listings. Keep
  // those relationships intact while adding the shared marketplace inventory.
  repositories.listings.reset(CANONICAL_DEMO_LISTINGS);
  for (const source of marketplaceFixture.listings) {
    const listing = createSeedListing(source, {
      listingId: listingIds[source.id],
      profileId: (id) => id,
      taxonomy: new TaxonomyV1Service(TAXONOMY_V1_PRIVATE_BUNDLE, 1),
      images: (source.photos || []).map((photo: { url: string }) => photo.url),
    });
    listing.seller =
      (await repositories.users.findById(listing.sellerId)) ?? undefined;
    await repositories.listings.save(listing);
  }
  const reviewOrder = await repositories.orders.findById("ord_sample_1");
  if (!reviewOrder) throw new Error("Missing canonical review order fixture");
  for (const engine of ["chromium", "firefox", "webkit"]) {
    await repositories.orders.create({
      ...reviewOrder,
      id: `browser-review-${engine}`,
      orderNumber: `BROWSER-REVIEW-${engine}`,
      status: "completed",
    });
  }
} else {
  // Database mode serves the PostgreSQL repositories production uses. The
  // personas are the profiles `make db-seed` provisioned through Supabase
  // Auth with DEMO_ACCOUNT_PASSWORD; only the Staff recovery banks are
  // (re)issued here so every run authenticates with private single-use codes.
  for (const source of marketplaceFixture.users) {
    const user = await repositories.users.findByEmail(source.email);
    if (!user) {
      throw new Error(
        `Persona ${source.id} (${source.email}) is missing from the local database. ` +
          "Run make db-migrate && make db-seed before the database-mode browser suite.",
      );
    }
    accounts[source.id] = {
      id: user.id,
      email: user.email,
      recoveryCodes: await installStaffRecoveryCodes(user),
    };
  }
  // The search vocabulary is a worker-maintained projection; the browser
  // suite must not depend on the scheduled worker having run.
  for (const market of await repositories.markets.getAll()) {
    if (market.isActive) {
      await repositories.listings.refreshSearchVocabulary(market.code);
    }
  }
}

writeFileSync(
  process.env.E2E_ACCOUNTS_FILE,
  JSON.stringify({ dataMode: config.dataMode, accounts, listingIds }),
  {
    mode: 0o600,
  },
);
const app = await createBackendApplication();
await app.listen(0, "127.0.0.1");
const address = app.getHttpServer().address();
if (!address || typeof address === "string")
  throw new Error("Missing test listener");
writeFileSync(process.env.E2E_API_PORT_FILE!, String(address.port), {
  mode: 0o600,
});
process.once("SIGTERM", () => {
  void app.close();
});
