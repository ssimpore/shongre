import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSupabaseAdminClient: vi.fn(),
}));

vi.mock("../../src/infrastructure/supabase/supabase-client.js", () => ({
  getSupabaseAdminClient: mocks.getSupabaseAdminClient,
}));

import { PostgresHomepageRepository } from "../../src/infrastructure/database/repositories/homepage.repository.js";

function queryResult(data: unknown) {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.order = vi.fn(() => query);
  query.limit = vi.fn(() => query);
  query.in = vi.fn(() => Promise.resolve({ data, error: null }));
  query.maybeSingle = vi.fn(() => Promise.resolve({ data, error: null }));
  query.then = vi.fn((resolve, reject) =>
    Promise.resolve({ data, error: null }).then(resolve, reject),
  );
  return query;
}

describe("PostgresHomepageRepository", () => {
  beforeEach(() => vi.clearAllMocks());

  it("normalizes Postgres offset timestamps at the contract boundary", async () => {
    const revision = queryResult({
      id: "homepage-revision",
      market_code: "FR",
      locale: "fr-FR",
      revision: 1,
      state: "published",
      updated_at: "2026-09-06T21:33:49.493887+00:00",
      published_at: "2026-09-06T21:33:49.493887+00:00",
      change_reason: "Correction éditoriale locale",
    });
    const sections = queryResult([
      {
        id: "deals-section",
        section_key: "deals",
        section_type: "deals",
        enabled: true,
        sort_order: 0,
        title_by_locale: { "fr-FR": "Meilleures offres" },
        subtitle_by_locale: { "fr-FR": "Offres du moment" },
        max_items: 6,
        mobile_visible: true,
        desktop_visible: true,
        starts_at: "2026-09-06T20:00:00+00:00",
        ends_at: "2026-09-07T20:00:00+00:00",
        settings: {},
      },
    ]);
    const overrides = queryResult([
      {
        section_id: "deals-section",
        listing_id: "listing-1",
        is_pinned: true,
        is_hidden: false,
        starts_at: "2026-09-06T20:00:00+00:00",
        ends_at: "2026-09-07T20:00:00+00:00",
        sort_order: 0,
      },
    ]);
    const rules = queryResult([
      {
        section_id: "deals-section",
        selection_mode: "manual",
        eligible_offer_types: [],
        allowed_markets: ["FR"],
        taxonomy_branches: [],
        minimum_discount_bps: 0,
        include_professional_sellers: true,
        preview_empty_state: false,
      },
    ]);
    mocks.getSupabaseAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "homepage_configuration_revisions") return revision;
        if (table === "homepage_sections") return sections;
        if (table === "homepage_offer_overrides") return overrides;
        if (table === "homepage_offer_rules") return rules;
        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    const configuration = await new PostgresHomepageRepository().getPublished(
      "FR",
      "fr-FR",
    );

    expect(configuration.updatedAt).toBe("2026-09-06T21:33:49.493Z");
    expect(configuration.publishedAt).toBe("2026-09-06T21:33:49.493Z");
    expect(configuration.sections[0]?.startsAt).toBe(
      "2026-09-06T20:00:00.000Z",
    );
    expect(configuration.sections[0]?.endsAt).toBe("2026-09-07T20:00:00.000Z");
    expect(
      configuration.sections[0]?.settings.offerOverrides?.[0],
    ).toMatchObject({
      startsAt: "2026-09-06T20:00:00.000Z",
      endsAt: "2026-09-07T20:00:00.000Z",
    });
  });
});
