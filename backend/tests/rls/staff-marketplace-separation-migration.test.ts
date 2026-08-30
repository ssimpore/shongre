import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CUSTOMER_MARKETPLACE_CAPABILITIES } from "@shongre/contracts/access-control";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00083_staff_marketplace_separation.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("Staff/customer marketplace separation migration", () => {
  it("keeps the database deny-list in parity with the canonical contract", () => {
    const functionBody = migration.match(
      /CREATE OR REPLACE FUNCTION public\.is_customer_marketplace_capability[\s\S]+?\]::TEXT\[\]\);/,
    )?.[0];
    expect(functionBody).toBeDefined();
    const databaseCapabilities = Array.from(
      functionBody?.matchAll(/'([^']+)'/g) ?? [],
      (match) => match[1],
    );
    expect([...new Set(databaseCapabilities)].sort()).toEqual(
      [...CUSTOMER_MARKETPLACE_CAPABILITIES].sort(),
    );
    expect(migration).toContain(
      "VALUES ('marketplace.customer.access', FALSE)",
    );
    expect(migration).toContain("role_kind = 'staff_role'");
    expect(migration).toContain("guard_staff_role_customer_grants");
    expect(migration).toContain(
      "public.is_customer_marketplace_capability(capability_id)",
    );
  });

  it("contracts overrides, revokes sessions, and blocks future direct grants", () => {
    expect(migration).toContain("guard_staff_marketplace_overrides");
    expect(migration).toContain("enforce_staff_marketplace_separation");
    expect(migration).toContain("capability_override_version + 1");
    expect(migration).toContain("'staff_access_changed'");
    expect(migration).toContain("'capability_overrides_changed'");
    expect(migration).toContain("USING ERRCODE = '42501'");
    expect(migration).toContain("retire_staff_marketplace_inventory");
    expect(migration).toContain("guard_staff_listing_lifecycle");
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.retire_staff_marketplace_inventory(UUID)",
    );
  });

  it("denies every retained Staff state through capability checks and restrictive RLS", () => {
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.has_capability",
    );
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.is_customer_marketplace_actor",
    );
    expect(migration).toContain("FROM public.staff_memberships retained_staff");
    expect(migration).toContain("AS RESTRICTIVE FOR ALL TO authenticated");
    expect(migration).toContain("'listings'");
    expect(migration).toContain("'messages'");
    expect(migration).toContain("'notifications'");
    expect(migration).toContain("'push_device_tokens'");
    expect(migration).toContain("'orders'");
    expect(migration).toContain("'vertical_checkouts'");
    expect(migration).toContain("'monetization_payments'");
    expect(migration).toContain("'monetization_invoices'");
    expect(migration).toContain("'invoicing_invoices'");
    expect(migration).toContain("'crm_opportunities'");
    expect(migration).toContain("'crm_teams'");
    expect(migration).toContain("'marketing_sender_identities'");
    expect(migration).toContain("staff_customer_profile_update_separation");
  });
});
