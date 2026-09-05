import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00096_delivery_marketplace.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("delivery marketplace migration", () => {
  it("keeps delivery disabled until an exact market rule is approved", () => {
    expect(migration).toMatch(/'delivery\.marketplace'[\s\S]*FALSE/);
    expect(migration).not.toMatch(
      /INSERT INTO public\.feature_flag_rules[\s\S]*delivery\.marketplace/,
    );
  });

  it("isolates public requests from private stops and enforces tenant columns", () => {
    expect(migration).toContain("CREATE TABLE public.delivery_requests");
    expect(migration).toContain("CREATE TABLE public.delivery_request_stops");
    expect(migration).toMatch(
      /delivery_request_stops[\s\S]*street TEXT NOT NULL/,
    );
    for (const table of [
      "delivery_courier_profiles",
      "delivery_courier_areas",
      "delivery_requests",
      "delivery_request_stops",
      "delivery_applications",
      "delivery_events",
      "delivery_domain_outbox",
    ]) {
      expect(migration).toMatch(
        new RegExp(`${table}[\\s\\S]*market_code`, "m"),
      );
    }
  });

  it("forces RLS, revokes client access and makes events immutable", () => {
    expect(migration).toContain("FORCE ROW LEVEL SECURITY");
    expect(migration).toContain(
      "REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated",
    );
    expect(migration).toContain("delivery_events_immutable");
    expect(migration).toContain(
      "REVOKE UPDATE, DELETE ON public.delivery_events FROM service_role",
    );
  });

  it("accepts exactly one application under a row lock", () => {
    expect(migration).toContain("accept_delivery_application");
    expect(migration).toMatch(/WHERE id = p_request_id FOR UPDATE/);
    expect(migration).toContain(
      "CREATE UNIQUE INDEX delivery_applications_accepted_request_idx",
    );
    expect(migration).toContain("DELIVERY_ASSIGNMENT_CONFLICT");
    expect(migration).toContain("delivery.assignment.created");
  });

  it("submits applications and updates the public count transactionally", () => {
    expect(migration).toContain("submit_delivery_application");
    expect(migration).toMatch(/submit_delivery_application[\s\S]*FOR UPDATE/);
    expect(migration).toMatch(
      /submit_delivery_application[\s\S]*compliance_status <> 'eligible'/,
    );
    expect(migration).toMatch(
      /submit_delivery_application[\s\S]*application_count = application_count \+ 1/,
    );
  });

  it("replaces courier areas atomically without exposing compliance writes", () => {
    expect(migration).toContain("save_delivery_courier_profile");
    expect(migration).toMatch(
      /save_delivery_courier_profile[\s\S]*DELETE FROM public\.delivery_courier_areas[\s\S]*INSERT INTO public\.delivery_courier_areas/,
    );
    expect(migration).not.toMatch(
      /save_delivery_courier_profile\([\s\S]{0,500}p_compliance_status/,
    );
  });

  it("publishes and transitions lifecycle state transactionally", () => {
    expect(migration).toContain("publish_delivery_request");
    expect(migration).toContain("transition_delivery_request");
    expect(migration).toContain("prepare_delivery_account_deletion");
    expect(migration).toMatch(
      /prepare_delivery_account_deletion[\s\S]*DELIVERY_ACTIVE_ASSIGNMENT[\s\S]*DELETE FROM public\.delivery_request_stops/,
    );
    expect(migration).toMatch(/transition_delivery_request[\s\S]*FOR UPDATE/);
    expect(migration).toMatch(
      /transition_delivery_request[\s\S]*delivery_domain_outbox/,
    );
    expect(migration).toContain("locked_request.version <> p_expected_version");
    expect(migration).toContain("withdraw_delivery_application");
  });

  it("gives scoped moderators an evidence-preserving suspension command", () => {
    expect(migration).toContain("'delivery.moderate', TRUE");
    expect(migration).toMatch(
      /'delivery\.moderate'[\s\S]*\['moderator','trust_safety'\]/,
    );
    expect(migration).toMatch(
      /suspend_unsafe_delivery_request[\s\S]*FOR UPDATE[\s\S]*status = 'suspended'[\s\S]*delivery\.request\.suspended/,
    );
    expect(migration).toContain(
      "REVOKE EXECUTE ON FUNCTION public.suspend_unsafe_delivery_request",
    );
    expect(migration).toMatch(
      /ALTER TABLE public\.reports[\s\S]*delivery_request_id[\s\S]*CREATE OR REPLACE FUNCTION public\.create_moderation_case_from_report/,
    );
    expect(migration).toMatch(
      /target_type IN \('listing', 'user', 'delivery_request'\)/,
    );
  });

  it("keeps opportunity notifications optional and deduplicated", () => {
    expect(migration).toContain("delivery_opportunities");
    expect(migration).toContain(
      "UNIQUE (request_id, courier_profile_id, request_version)",
    );
    expect(migration).not.toMatch(
      /category NOT IN \('transactions', 'delivery', 'delivery_opportunities'/,
    );
  });

  it("claims durable work with leases, retries and skip-locked concurrency", () => {
    expect(migration).toContain("claim_delivery_domain_outbox");
    expect(migration).toContain("complete_delivery_domain_outbox");
    expect(migration).toContain("FOR UPDATE SKIP LOCKED");
    expect(migration).toContain("'dead_letter'");
  });
});
