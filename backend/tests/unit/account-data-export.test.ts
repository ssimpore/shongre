import { beforeEach, describe, expect, it } from "vitest";
import { repositories } from "../../src/infrastructure/database/repositories/index.js";
import { authRepository } from "../../src/infrastructure/database/repositories/auth.repository.js";
import { UsersService } from "../../src/modules/users/users.service.js";

/**
 * Data portability is the account's own right, so the copy must contain the
 * requester's records and nothing that widens their access.
 */
describe("account data export", () => {
  let service: UsersService;

  beforeEach(() => {
    // The demo auth repository keeps rate-limit buckets in memory between
    // tests; a fresh key per run keeps one test from throttling the next.
    service = new UsersService(
      repositories.users,
      repositories.orders,
      repositories.admin,
      authRepository,
      repositories.delivery,
      undefined,
      repositories.listings,
      repositories.messaging,
      repositories.reviews,
      repositories.watchSubscriptions,
      repositories.verification,
      repositories.notifications,
    );
  });

  it("returns a versioned copy of the account's own sections", async () => {
    const seller = (await repositories.users.findById("user_camille"))!;
    expect(seller).toBeTruthy();

    const copy = await service.exportAccountData(seller.id, "FR");

    expect(copy.format).toBe("shongre.account-export.v1");
    expect(copy.subject.userId).toBe(seller.id);
    expect(Date.parse(copy.generatedAt)).toBeGreaterThan(0);
    expect(copy.profile).toMatchObject({ id: seller.id });
    for (const section of [
      "listings",
      "orders",
      "conversations",
      "reviews",
      "favorites",
      "savedSearches",
      "verification",
      "consents",
    ] as const) {
      expect(Array.isArray(copy[section])).toBe(true);
    }
  });

  it("only ever contains the requester's own listings", async () => {
    const copy = await service.exportAccountData("user_pro_atelier", "FR");
    for (const listing of copy.listings as Array<Record<string, unknown>>) {
      expect(listing.sellerId).toBe("user_pro_atelier");
    }
  });

  it("is JSON-serialisable with no undefined holes", async () => {
    const copy = await service.exportAccountData("user_thomas", "FR");
    expect(JSON.parse(JSON.stringify(copy))).toEqual(copy);
  });

  it("refuses a second copy inside the same day", async () => {
    const userId = "user_employment_recruiter";
    await service.exportAccountData(userId, "FR");
    await expect(service.exportAccountData(userId, "FR")).rejects.toMatchObject(
      { code: "RATE_LIMITED" },
    );
  });

  it("refuses to export an account that does not exist", async () => {
    await expect(
      service.exportAccountData("user_missing_export", "FR"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
