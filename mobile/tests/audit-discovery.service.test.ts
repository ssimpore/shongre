import { describe, expect, it, vi, beforeEach } from "vitest";
const apiOperation = vi.hoisted(() => vi.fn());
vi.mock("@/api/generated-api-operation", () => ({ apiOperation }));
import { HttpListingsService } from "@/features/listings/listings.service";
import { HttpOrdersService } from "@/features/orders/orders.service";
import { mobileSavedSearchTargetId } from "@/features/listings/search-input";

describe("audit market and discovery transport", () => {
  beforeEach(() => vi.clearAllMocks());
  it("keeps city and sorting on subsequent search pages", async () => {
    vi.mocked(apiOperation).mockResolvedValue({
      items: [],
      total: 0,
      totalRelation: "lower_bound",
      pageInfo: { hasNextPage: false },
    });
    const result = await new HttpListingsService().search({
      marketCode: "BE",
      city: " Bruxelles ",
      sortBy: "date_desc",
      cursor: "next-page",
    });
    expect(result.totalRelation).toBe("lower_bound");
    expect(apiOperation).toHaveBeenCalledWith(
      "postListingsSearch",
      {
        body: {
          marketCode: "BE",
          city: "Bruxelles",
          sortBy: "date_desc",
          cursor: "next-page",
        },
      },
      "BE",
    );
  });
  it("keeps alerts for different cities separate and normalizes their identity", () => {
    const base = { marketCode: "FR", query: "vélo", locale: "fr-FR" };
    // Existing alerts without a city retain their persisted target identity.
    expect(mobileSavedSearchTargetId(base)).toBe(
      "mobile-00639258-7875-45f7-8c12-70faddbafe01",
    );
    expect(mobileSavedSearchTargetId({ ...base, city: " " })).toBe(
      mobileSavedSearchTargetId(base),
    );
    expect(mobileSavedSearchTargetId({ ...base, city: " Paris " })).toBe(
      mobileSavedSearchTargetId({ ...base, city: "paris" }),
    );
    expect(mobileSavedSearchTargetId({ ...base, city: "Paris" })).not.toBe(
      mobileSavedSearchTargetId({ ...base, city: "Lyon" }),
    );
  });
  it("binds both order projections to the requested market", async () => {
    vi.mocked(apiOperation).mockResolvedValue([]);
    const service = new HttpOrdersService();
    await service.purchases("CH");
    await service.sales("CH");
    expect(apiOperation).toHaveBeenCalledWith("getOrdersPurchases", {}, "CH");
    expect(apiOperation).toHaveBeenCalledWith("getOrdersSales", {}, "CH");
  });
});
