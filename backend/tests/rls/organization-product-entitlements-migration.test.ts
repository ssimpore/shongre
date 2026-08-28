import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00071_organization_product_entitlements.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("organization product entitlement migration", () => {
  it("keeps the payer separate from the explicit organization access subject", () => {
    expect(migration).toContain("ALTER TABLE public.monetization_entitlements");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS organization_id");
    expect(migration).toContain(
      "entitlement.organization_id = organization.id",
    );
    expect(migration).not.toContain(
      "entitlement.account_id = organization.owner_id",
    );
  });

  it("fails closed for ambiguous organization-scoped product writes", () => {
    expect(migration).toContain(
      "monetization_organization_product_scope_required",
    );
    expect(migration).toContain(
      "HAVING count(DISTINCT member.organization_id) = 1",
    );
    expect(migration).toContain(
      "organization_subscription_management_required",
    );
  });
});
