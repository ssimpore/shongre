import { describe, expect, it } from "vitest";
import { DemoAutoRepository } from "../../src/infrastructure/database/repositories/auto.repository.js";
import { DemoRealEstateRepository } from "../../src/infrastructure/database/repositories/real-estate.repository.js";
import { DemoEmploymentRepository } from "../../src/infrastructure/database/repositories/employment.repository.js";

/**
 * "What else does this seller have" is a question every detail page asks, and
 * every vertical answered it by fetching a page of results and matching ids in
 * the browser — which quietly stops working the moment the market outgrows one
 * page. Each vertical now filters where the data is, and this pins that the
 * filter narrows to exactly one seller rather than being silently ignored.
 */

const marketCode = "FR";

describe("seller-scoped search", () => {
  it("narrows vehicles to one dealer", async () => {
    const repository = new DemoAutoRepository();
    const all = await repository.search({ marketCode, limit: 50 } as never);
    const sellerId = all.items[0]?.seller.id;
    expect(sellerId).toBeTruthy();

    const mine = await repository.search({
      marketCode,
      sellerId,
      limit: 50,
    } as never);
    expect(mine.items.length).toBeGreaterThan(0);
    expect(mine.items.every((row) => row.seller.id === sellerId)).toBe(true);

    const none = await repository.search({
      marketCode,
      sellerId: "dealer-that-does-not-exist",
      limit: 50,
    } as never);
    expect(none.items).toEqual([]);
  });

  it("narrows properties to one agency or owner", async () => {
    const repository = new DemoRealEstateRepository();
    const all = await repository.search({
      marketCode,
      sort: "newest",
      limit: 50,
    } as never);
    const sellerId = all.items[0]?.seller.id;
    expect(sellerId).toBeTruthy();

    const mine = await repository.search({
      marketCode,
      sellerId,
      sort: "newest",
      limit: 50,
    } as never);
    expect(mine.items.length).toBeGreaterThan(0);
    expect(mine.items.every((row) => row.seller.id === sellerId)).toBe(true);

    const none = await repository.search({
      marketCode,
      sellerId: "agency-that-does-not-exist",
      sort: "newest",
      limit: 50,
    } as never);
    expect(none.items).toEqual([]);
  });

  it("narrows job postings to one employer", async () => {
    const repository = new DemoEmploymentRepository();
    const all = await repository.search({
      marketCode,
      sort: "newest",
      limit: 50,
    } as never);
    const employerId = all.items[0]?.employer.id;
    expect(employerId).toBeTruthy();

    const theirs = await repository.search({
      marketCode,
      employerId,
      sort: "newest",
      limit: 50,
    } as never);
    expect(theirs.items.length).toBeGreaterThan(0);
    expect(theirs.items.every((row) => row.employer.id === employerId)).toBe(
      true,
    );

    const none = await repository.search({
      marketCode,
      employerId: "employer-that-does-not-exist",
      sort: "newest",
      limit: 50,
    } as never);
    expect(none.items).toEqual([]);
  });
});
