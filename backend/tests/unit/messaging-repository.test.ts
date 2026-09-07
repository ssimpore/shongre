import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSupabaseAdminClient: vi.fn(),
}));

vi.mock("../../src/infrastructure/supabase/supabase-client.js", () => ({
  getSupabaseAdminClient: mocks.getSupabaseAdminClient,
}));

import { PostgresMessagingRepository } from "../../src/infrastructure/database/repositories/messaging.repository.js";

describe("PostgresMessagingRepository", () => {
  beforeEach(() => {
    mocks.getSupabaseAdminClient.mockReset();
  });

  it("projects canonical listing media and maps it in primary-first order", async () => {
    const select = vi.fn();
    const query = {
      or: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
    };
    query.or.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.limit.mockResolvedValue({
      data: [
        {
          id: "conversation-id",
          listing_id: "listing-id",
          buyer_id: "buyer-id",
          seller_id: "seller-id",
          last_message_text: "Bonjour",
          last_message_at: "2026-09-07T08:00:00.000Z",
          created_at: "2026-09-07T07:00:00.000Z",
          listings: {
            id: "listing-id",
            title: "Annonce",
            price: "42.00",
            currency: "EUR",
            status: "published",
            listing_media: [
              { url: "https://cdn.example/second.jpg", sort_order: 2 },
              {
                url: "https://cdn.example/primary.jpg",
                sort_order: 5,
                is_primary: true,
              },
              { url: "https://cdn.example/first.jpg", sort_order: 1 },
            ],
          },
          buyer: null,
          seller: null,
        },
      ],
      error: null,
    });
    select.mockReturnValue(query);
    mocks.getSupabaseAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ select }),
    });

    const result = await new PostgresMessagingRepository().getUserConversations(
      "buyer-id",
    );

    const projection = select.mock.calls[0]?.[0] as string;
    expect(projection).toContain("listing_media(url,sort_order,is_primary)");
    expect(projection).not.toContain("status,images");
    expect(result.items[0]?.listing?.images).toEqual([
      "https://cdn.example/primary.jpg",
      "https://cdn.example/first.jpg",
      "https://cdn.example/second.jpg",
    ]);
  });
});
