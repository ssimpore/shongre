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
import { TAXONOMY_V4_PRIVATE_BUNDLE } from "../../src/modules/taxonomy/generated/taxonomy-v4.private.js";
import { localSeedUuid } from "../../scripts/seed/local-seed-identity.js";
import type { UserProfile } from "../../src/shared/types/index.js";

if (
  config.environment.environment !== "test" ||
  config.dataMode !== "demo" ||
  !process.env.E2E_API_PORT_FILE ||
  !process.env.E2E_ACCOUNTS_FILE
) {
  throw new Error(
    "The browser API fixture requires the isolated test/demo profile.",
  );
}
await seedDemoCredentials();
// The same backend-owned marketplace scenario powers local PostgreSQL and the
// browser API. Neither identities nor inventory are injected into the client.
const passwordHash = await hashPassword(DEMO_ACCOUNT_PASSWORD);
const accounts: Record<string, { email: string; recoveryCodes: string[] }> = {};
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
  // Unique recovery codes exercise real MFA without cross-worker TOTP replay.
  // This expanded bank belongs only to this ephemeral test API.
  const recoveryCodes =
    user.staffStatus === "active"
      ? Array.from({ length: 1024 }, () => randomBytes(8).toString("hex"))
      : [];
  if (recoveryCodes.length) {
    await authRepository.saveMfaCredential({
      userId: user.id,
      ...encryptMfaSecret(createMfaSecret()),
      backupCodeHashes: recoveryCodes.map(hashMfaBackupCode),
      enabledAt: new Date().toISOString(),
      disabledAt: null,
      lastUsedCounter: null,
    });
  }
  accounts[user.id] = { email: user.email, recoveryCodes };
}
const categoryIds = new Set(
  TAXONOMY_V4_PRIVATE_BUNDLE.categories.map(({ id }) => id),
);
if (!(repositories.listings instanceof DemoListingRepository)) {
  throw new Error("Browser scenario cannot replace a database repository.");
}
// Existing transaction and messaging scenarios reference these listings. Keep
// those relationships intact while adding the shared marketplace inventory.
repositories.listings.reset(CANONICAL_DEMO_LISTINGS);
const listingIds: Record<string, string> = {};
for (const source of marketplaceFixture.listings) {
  listingIds[source.id] = localSeedUuid("listing", source.id);
  const listing = createSeedListing(source, {
    listingId: listingIds[source.id],
    profileId: (id) => id,
    availableCategoryIds: categoryIds,
    images: (source.photos || []).map((photo: { url: string }) => photo.url),
  });
  listing.seller =
    (await repositories.users.findById(listing.sellerId)) ?? undefined;
  await repositories.listings.save(listing);
}
writeFileSync(
  process.env.E2E_ACCOUNTS_FILE,
  JSON.stringify({ accounts, listingIds }),
  {
    mode: 0o600,
  },
);
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
