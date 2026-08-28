import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00069_invoicing_product_access.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("invoicing product access migration", () => {
  it("registers Facturation as a shared monetization product without inventing a price", () => {
    expect(migration).toContain("'product.facturation'");
    expect(migration).toContain("'shongre.facturation'");
    expect(migration).not.toContain("INSERT INTO public.monetization_prices");
  });

  it("requires active organization entitlements in the RLS membership boundary", () => {
    expect(migration).toContain("organization_has_active_product_entitlement");
    expect(migration).toContain("'invoicing.enabled'");
    expect(migration).toContain(
      "entitlement.product_id = 'product.facturation'",
    );
    expect(migration).toContain("entitlement.status = 'active'");
    expect(migration).toContain("entitlement.ends_at > NOW()");
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.is_invoicing_tenant_member",
    );
  });

  it("updates drafts atomically with optimistic locking and preserves finalized immutability", () => {
    expect(migration).toContain("update_invoicing_invoice_draft");
    expect(migration).toContain("FOR UPDATE");
    expect(migration).toContain("version_conflict");
    expect(migration).toContain("invoice_not_editable");
    expect(migration).toContain("InvoiceDraftUpdated");
    expect(migration).toContain("invoice.draft_updated");
    expect(migration).toContain("TO service_role");
  });
});
