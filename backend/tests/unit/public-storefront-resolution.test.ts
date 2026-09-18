import { describe, expect, it } from "vitest";
import {
  CANONICAL_DEMO_USERS,
  DemoUserRepository,
} from "../../src/infrastructure/database/repositories/index.js";
import type { UserProfile } from "../../src/shared/types/index.js";

const owner = Object.values(CANONICAL_DEMO_USERS).find(
  (user) => user.accountType === "professional" && user.status === "active",
);

describe("public storefront resolution", () => {
  it("resolves a storefront slug to its professional owner under the business name", async () => {
    expect(owner).toBeDefined();
    const dealer: UserProfile = {
      ...owner!,
      id: "user_dealer_test",
      email: "dealer@example.test",
      slug: "michel-girard-dealer",
      name: "Michel Girard",
      storeSlug: "auto-select-test",
      companyName: "Auto Select Test",
    };
    const users = new DemoUserRepository({
      ...CANONICAL_DEMO_USERS,
      [dealer.email]: dealer,
    });

    const storefront = await users.findPublicById("auto-select-test");
    expect(storefront).toMatchObject({
      id: "user_dealer_test",
      name: "Michel Girard",
      storeName: "Auto Select Test",
      storeSlug: "auto-select-test",
      accountType: "professional",
    });
    // The person's own slug answers the same storefront: one canonical
    // address, the store's, whichever way the profile was reached.
    const profile = await users.findPublicById("michel-girard-dealer");
    expect(profile).toMatchObject({
      name: "Michel Girard",
      storeName: "Auto Select Test",
      storeSlug: "auto-select-test",
    });
    // Nothing private leaks through the projection.
    expect(storefront).not.toHaveProperty("email");
    expect(storefront).not.toHaveProperty("companyName");
  });

  it("does not resolve a suspended or individual account's storefront", async () => {
    const suspended: UserProfile = {
      ...owner!,
      id: "user_suspended_dealer",
      email: "suspended@example.test",
      slug: "suspended-dealer",
      storeSlug: "suspended-store",
      status: "suspended",
    };
    const individual: UserProfile = {
      ...owner!,
      id: "user_individual_store",
      email: "individual@example.test",
      slug: "individual-store-owner",
      accountType: "individual",
      storeSlug: "individual-store",
    };
    const users = new DemoUserRepository({
      ...CANONICAL_DEMO_USERS,
      [suspended.email]: suspended,
      [individual.email]: individual,
    });
    expect(await users.findPublicById("suspended-store")).toBeNull();
    expect(await users.findPublicById("individual-store")).toBeNull();
    expect(await users.findPublicById("unknown-store")).toBeNull();
  });
});
