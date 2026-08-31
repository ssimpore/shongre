import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00070_shared_product_organization_provisioning.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("shared product organization provisioning migration", () => {
  it("creates shared, country-aware business identifiers with private RLS", () => {
    expect(migration).toContain("organization_business_identifiers");
    expect(migration).toContain("country_code VARCHAR(2)");
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("FORCE ROW LEVEL SECURITY");
    expect(migration).toContain(
      "organization_business_identifiers_member_read",
    );
    expect(migration).not.toContain(
      "organization_business_identifiers_owner_manage",
    );
  });

  it("provisions organization, owner membership and market atomically", () => {
    expect(migration).toContain("ensure_owned_organization");
    expect(migration).toContain("INSERT INTO public.organizations");
    expect(migration).toContain("INSERT INTO public.organization_members");
    expect(migration).toContain("INSERT INTO public.organization_markets");
    expect(migration).toContain("TO service_role");
  });

  it("does not grant Facturation or any other product entitlement", () => {
    expect(migration).not.toContain(
      "INSERT INTO public.monetization_entitlements",
    );
  });

  it("bootstraps invoicing identity from shared organization facts behind the entitlement", () => {
    expect(migration).toContain(
      "bootstrap_invoicing_legal_entity_from_organization",
    );
    expect(migration).toContain("organization_has_active_product_entitlement");
    expect(migration).toContain("'invoicing.enabled'");
    expect(migration).toContain("'shared_organization'");
  });
});
