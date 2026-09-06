import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSupabaseAdminClient: vi.fn(),
}));

vi.mock("../../src/infrastructure/supabase/supabase-client.js", () => ({
  getSupabaseAdminClient: mocks.getSupabaseAdminClient,
}));

import {
  DemoCoursesRepository,
  PostgresCoursesRepository,
} from "../../src/infrastructure/database/repositories/courses.repository.js";

function chain(finalMethod: string, result: unknown) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of [
    "select",
    "contains",
    "eq",
    "overlaps",
    "ilike",
    "gte",
    "lte",
    "gt",
    "textSearch",
    "order",
    "range",
    "in",
  ]) {
    builder[method] = vi.fn(() => builder);
  }
  builder[finalMethod] = vi.fn(() => Promise.resolve(result));
  return builder;
}

describe("Postgres course promotion search projection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads one authoritative mapping batch and one exact-market proof batch", async () => {
    const demo = new DemoCoursesRepository();
    const tutor = await demo.getTutorProfile("tutor_thomas");
    const [offer] = await demo.getCourseOffers("tutor_thomas");
    const listingId = "5efe2140-911d-47db-9715-cb91653bf974";
    const searchRow = {
      offer_id: offer.id,
      market_code: "FR",
      market_codes: ["FR"],
      offer_status: "published",
      tutor_payload: tutor,
      offer_payload: {
        ...offer,
        listingId: "a3f725a2-aea0-4a64-8385-d87317f229c0",
      },
      subject_label: "Mathématiques",
      level_labels: ["Collège"],
      from_price_minor: 2_800,
      currency: "EUR",
      distance_km: null,
      relevance_reasons: ["Matière et niveau compatibles"],
    };
    const search = chain("range", {
      data: [searchRow],
      count: 1,
      error: null,
    });
    const mappings = chain("in", {
      data: [{ id: offer.id, listing_id: listingId, market_code: "FR" }],
      error: null,
    });
    const promotions = chain("gt", {
      data: [
        {
          listing_id: listingId,
          market_code: "FR",
          promotion_state: "active",
          promotion_type: "sponsored_search",
          promotion_source: "purchase",
          promotion_source_id: "private-order-id",
          promotion_label: "Sponsorisé",
          promotion_start_at: "2020-01-01T00:00:00.000Z",
          promotion_end_at: "2099-01-01T00:00:00.000Z",
          promoted_at: "2026-09-01T00:00:00.000Z",
        },
      ],
      error: null,
    });
    const client = {
      from: vi.fn((table: string) => {
        if (table === "course_tutor_search_view") return search;
        if (table === "course_offers") return mappings;
        if (table === "listing_market_publications") return promotions;
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    mocks.getSupabaseAdminClient.mockReturnValue(client);

    const result = await new PostgresCoursesRepository().searchTutors({
      marketCode: "FR",
      limit: 20,
    });

    expect(client.from).toHaveBeenCalledTimes(3);
    expect(mappings.in).toHaveBeenCalledOnce();
    expect(promotions.in).toHaveBeenCalledTimes(2);
    expect(result.items[0].offer.listingId).toBe(listingId);
    expect(result.items[0].resolvedPromotion).toMatchObject({
      state: "active",
      marketCode: "FR",
      source: "purchase",
      startsAt: "2020-01-01T00:00:00.000Z",
      endsAt: "2099-01-01T00:00:00.000Z",
    });
    expect(result.items[0].resolvedPromotion?.sourceId).toMatch(
      /^promotion_[a-f0-9]{64}$/,
    );
    expect(result.items[0].resolvedPromotion?.sourceId).not.toContain(
      "private-order-id",
    );
  });

  it("fails closed when the offer mapping belongs to another market", async () => {
    const demo = new DemoCoursesRepository();
    const tutor = await demo.getTutorProfile("tutor_thomas");
    const [offer] = await demo.getCourseOffers("tutor_thomas");
    const search = chain("range", {
      data: [
        {
          offer_id: offer.id,
          market_code: "FR",
          market_codes: ["FR"],
          offer_status: "published",
          tutor_payload: tutor,
          offer_payload: offer,
          subject_label: "Mathématiques",
          level_labels: ["Collège"],
          from_price_minor: 2_800,
          currency: "EUR",
          distance_km: null,
          relevance_reasons: [],
        },
      ],
      count: 1,
      error: null,
    });
    const mappings = chain("in", {
      data: [
        {
          id: offer.id,
          listing_id: offer.listingId,
          market_code: "BE",
        },
      ],
      error: null,
    });
    const client = {
      from: vi.fn((table: string) => {
        if (table === "course_tutor_search_view") return search;
        if (table === "course_offers") return mappings;
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    mocks.getSupabaseAdminClient.mockReturnValue(client);

    const result = await new PostgresCoursesRepository().searchTutors({
      marketCode: "FR",
    });

    expect(client.from).toHaveBeenCalledTimes(2);
    expect(result.items[0].offer.listingId).toBeUndefined();
    expect(result.items[0].resolvedPromotion).toBeUndefined();
  });
});
