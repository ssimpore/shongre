import { TaxonomyV1Service } from "../../src/modules/taxonomy/taxonomy.v1.service.js";
import "./install-taxonomy.js";
import { writeFileSync } from "node:fs";
import { createGeocodingStub } from "./geocoding-stub.js";
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
  createSeedConversations,
  createSeedDeliveryRequest,
  createSeedOrder,
  createSeedReview,
  seedTransactionListing,
  SEED_DELIVERY_REQUEST,
  createSeedListing,
  marketplaceFixture,
} from "../../scripts/seed/local-development-data.js";
import { DemoMessagingRepository } from "../../src/infrastructure/database/repositories/messaging.repository.js";
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
// Orders keep the fixture's ids in demo mode and the seed's UUIDs in database
// mode; the journeys read whichever this run answers with.
const orderIds: Record<string, string> = {};

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
  if (!(repositories.messaging instanceof DemoMessagingRepository)) {
    throw new Error("Browser scenario cannot replace a database repository.");
  }
  // The same threads the database seed writes, keyed by the fixture's own ids
  // so the journeys open `conv-02` in either mode.
  const { conversations, messages } = createSeedConversations({
    conversationId: (id) => id,
    messageId: (id) => id,
    listingId: (id) => listingIds[id] ?? id,
    profileId: (id) => id,
  });
  repositories.messaging.seedConversations(conversations, messages);
  // The fixture's transactions, projected exactly as the database seed
  // projects them, under the fixture's own ids: the purchase and review
  // journeys open `tx-901` and `SHG-771920` in either mode.
  for (const source of marketplaceFixture.transactions) {
    // The canonical in-memory orders (the delivery order among them) keep
    // their own state; the fixture only adds the transactions they lack.
    if (await repositories.orders.findById(source.id)) {
      orderIds[source.id] = source.id;
      continue;
    }
    const { order, targetStatus, terminalStatus } = createSeedOrder(source, {
      orderId: source.id,
      listingId:
        listingIds[seedTransactionListing(source).id] ?? source.listingId,
      profileId: (id) => id,
    });
    orderIds[source.id] = order.id;
    await repositories.orders.create(order);
    if (terminalStatus)
      await repositories.orders.update(order.id, { status: targetStatus });
  }
  for (const source of marketplaceFixture.reviews) {
    await repositories.reviews.save(
      createSeedReview(source, {
        reviewId: source.id,
        orderId: orderIds[source.orderId] ?? source.orderId,
        profileId: (id) => id,
      }),
    );
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
  for (const source of marketplaceFixture.transactions) {
    orderIds[source.id] = localSeedUuid("order", source.id);
  }
  // The search vocabulary is a worker-maintained projection; the browser
  // suite must not depend on the scheduled worker having run.
  for (const market of await repositories.markets.getAll()) {
    if (market.isActive) {
      await repositories.listings.refreshSearchVocabulary(market.code);
    }
  }
}

// The open delivery request of the scenario exists in both modes under the
// same requester and key: the database seed already published it, and the
// demo repositories receive it here through the same draft-and-publish path
// so its public projection is the backend's in either family.
const deliveryRequester = accounts[SEED_DELIVERY_REQUEST.requesterSourceId];
if (!deliveryRequester)
  throw new Error("Missing the delivery scenario's requester account.");
const deliveryDraft = createSeedDeliveryRequest();
const existingDeliveryRequest = (
  await repositories.delivery.listOwnRequests(
    deliveryRequester.id,
    deliveryDraft.marketCode,
  )
).find((request) => request.idempotencyKey === deliveryDraft.idempotencyKey);
const deliveryRequest =
  existingDeliveryRequest ??
  (await repositories.delivery.createDraft(
    deliveryRequester.id,
    SEED_DELIVERY_REQUEST.requesterName,
    true,
    deliveryDraft,
  ));
if (
  deliveryRequest.status === "draft" ||
  deliveryRequest.status === "pending_review"
) {
  await repositories.delivery.publish(deliveryRequest.id, deliveryRequester.id);
}
const deliveryRequestIds: Record<string, string> = {
  [SEED_DELIVERY_REQUEST.fixtureId]: deliveryRequest.id,
};

writeFileSync(
  process.env.E2E_ACCOUNTS_FILE,
  JSON.stringify({
    dataMode: config.dataMode,
    accounts,
    listingIds,
    orderIds,
    deliveryRequestIds,
  }),
  {
    mode: 0o600,
  },
);
// The geocoder the isolated API was configured with (see scripts/e2e.sh):
// listening before the first request, on the port the configuration names.
const geocodingPort = Number(process.env.E2E_GEOCODING_PORT);
const geocodingStub = Number.isInteger(geocodingPort)
  ? createGeocodingStub()
  : null;
if (geocodingStub) {
  await new Promise<void>((resolve, reject) => {
    geocodingStub.once("error", reject);
    geocodingStub.listen(geocodingPort, "127.0.0.1", resolve);
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
  geocodingStub?.close();
  void app.close();
});
