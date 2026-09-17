import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function migration(name: string): string {
  return readFileSync(
    new URL(`../../supabase/migrations/${name}.sql`, import.meta.url),
    "utf8",
  );
}

const SECURITY_DEFINER_HEADER = /SECURITY DEFINER\s+SET search_path = ''/;

describe("search vocabulary migration safeguards", () => {
  const sql = migration("00142_listing_search_vocabulary");

  it("keeps the vocabulary table private and trigram-indexed", () => {
    expect(sql).toContain("CREATE TABLE public.listing_search_terms");
    expect(sql).toContain(
      "ALTER TABLE public.listing_search_terms ENABLE ROW LEVEL SECURITY",
    );
    expect(sql).toContain(
      "REVOKE ALL ON public.listing_search_terms FROM PUBLIC, anon, authenticated",
    );
    expect(sql).toContain("listing_search_terms_trgm_idx");
    expect(sql).toContain("gin_trgm_ops");
  });

  it("exposes suggestions and corrections to the service role only", () => {
    for (const signature of [
      "refresh_listing_search_terms(VARCHAR)",
      "suggest_listing_search_terms(VARCHAR, TEXT, INTEGER)",
      "correct_listing_search_query(VARCHAR, TEXT)",
    ]) {
      expect(sql).toContain(
        `REVOKE ALL ON FUNCTION public.${signature} FROM PUBLIC, anon, authenticated`,
      );
      expect(sql).toContain(
        `GRANT EXECUTE ON FUNCTION public.${signature} TO service_role`,
      );
    }
    expect(sql).toMatch(SECURITY_DEFINER_HEADER);
  });
});

describe("review interactions migration safeguards", () => {
  const sql = migration("00143_review_replies_votes_reports");

  it("keeps helpful votes and reminders private and trigger-maintained", () => {
    for (const table of ["review_helpful_votes", "order_review_reminders"]) {
      expect(sql).toContain(`CREATE TABLE public.${table}`);
      expect(sql).toContain(
        `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`,
      );
      expect(sql).toContain(
        `REVOKE ALL ON public.${table} FROM PUBLIC, anon, authenticated`,
      );
    }
    expect(sql).toContain("CREATE TRIGGER review_helpful_votes_maintain_count");
    expect(sql).toContain("CREATE TRIGGER orders_stamp_completed_at");
  });

  it("makes a review a first-class moderation target without deleting it", () => {
    expect(sql).toContain("review_id");
    expect(sql).toContain("remove_review");
    expect(sql).toContain("reviews_target_visible_idx");
    expect(sql).not.toMatch(/DELETE FROM public\.reviews/);
    expect(sql).toContain(
      "GRANT EXECUTE ON FUNCTION public.set_review_helpful_vote(UUID, UUID, BOOLEAN) TO service_role",
    );
  });
});

describe("seller automation migration safeguards", () => {
  const sql = migration("00144_seller_automation");

  it("runs every automation through service-role functions", () => {
    for (const signature of [
      "renew_expiring_listings(INTEGER, INTEGER)",
      "publish_scheduled_listings(INTEGER)",
      "set_seller_away(UUID, TIMESTAMPTZ, TEXT)",
      "clear_seller_away(UUID)",
      "resume_returned_sellers(INTEGER)",
    ]) {
      expect(sql).toContain(
        `REVOKE ALL ON FUNCTION public.${signature} FROM PUBLIC, anon, authenticated`,
      );
      expect(sql).toContain(
        `GRANT EXECUTE ON FUNCTION public.${signature} TO service_role`,
      );
    }
  });

  it("publishes the absence, not the seller's private settings", () => {
    expect(sql).toContain("CREATE OR REPLACE VIEW public.public_profiles");
    expect(sql).toContain("away_until");
    expect(sql).toContain("away_message");
    expect(sql).toContain("paused_reason");
    expect(sql).not.toMatch(/public_profiles[\s\S]*auto_renew/);
  });
});

describe("price comparables and message safety migration safeguards", () => {
  const sql = migration("00145_price_comparables_and_message_safety");

  it("stamps sales once and keeps the estimate service-role only", () => {
    expect(sql).toContain("ADD COLUMN sold_at TIMESTAMPTZ");
    expect(sql).toContain("CREATE TRIGGER listings_stamp_sold_at");
    expect(sql).toContain(
      "GRANT EXECUTE ON FUNCTION public.estimate_listing_price(VARCHAR, TEXT[], TEXT, TEXT, TEXT, INTEGER, INTEGER) TO service_role",
    );
    expect(sql).toMatch(SECURITY_DEFINER_HEADER);
  });

  it("records advisory safety flags with a safe default", () => {
    expect(sql).toContain(
      "ADD COLUMN safety_flags TEXT[] NOT NULL DEFAULT '{}'",
    );
  });
});

describe("web push devices migration safeguards", () => {
  const sql = migration("00146_web_push_devices");

  it("admits browsers as a push platform without new grants", () => {
    expect(sql).toContain("CHECK (platform IN ('ios', 'android', 'web'))");
    expect(sql).not.toMatch(/GRANT/);
  });
});
