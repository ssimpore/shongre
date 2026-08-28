import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00068_invoicing_foundation.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("invoicing foundation migration", () => {
  it("models typed legal identities without globally requiring French identifiers", () => {
    expect(migration).toContain("ALTER COLUMN siren DROP NOT NULL");
    expect(migration).toContain("ALTER COLUMN siret DROP NOT NULL");
    expect(migration).toContain(
      "CREATE TABLE public.invoicing_legal_identifiers",
    );
    expect(migration).toContain("country_code VARCHAR(2) NOT NULL");
    expect(migration).not.toContain("DEFAULT 'FR'");
  });

  it("locks finalization and number assignment into one short transaction", () => {
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.finalize_invoicing_invoice",
    );
    const invoiceLock = migration.indexOf(
      "WHERE id = p_invoice_id\n  FOR UPDATE",
    );
    const seriesLock = migration.indexOf(
      "FROM public.invoicing_number_series candidate",
    );
    expect(invoiceLock).toBeGreaterThan(0);
    expect(seriesLock).toBeGreaterThan(invoiceLock);
    expect(migration).toContain("commercial_state = 'FINALIZED'");
    expect(migration).toContain("InvoiceFinalized");
    expect(migration).toContain("snapshot_digest := encode(public.digest");
    expect(migration).toContain("production_number_series_not_approved");
    expect(migration).toContain("credit_note_exceeds_original");
    expect(migration).toContain("CreditNoteFinalized");
    expect(migration).toContain(
      "target.commercial_state IN ('FINALIZED','CREDITED')",
    );
    expect(migration).not.toContain("snapshot_digest = snapshot_digest");
    expect(migration).toContain("TO service_role");
  });

  it("makes finalized records immutable and keeps workflow states separate", () => {
    expect(migration).toContain("finalized_invoice_legal_fields_are_immutable");
    expect(migration).toContain("finalized_invoice_children_are_immutable");
    expect(migration).toContain("invoicing_documents_immutable");
    expect(migration).toContain("invoicing_audit_immutable");
    expect(migration).toContain("electronic_state TEXT NOT NULL");
    expect(migration).toContain("payment_state TEXT NOT NULL");
    expect(migration).toContain("accounting_export_state TEXT NOT NULL");
    expect(migration).toContain("customer_review_state TEXT NOT NULL");
  });

  it("enforces deny-by-default tenant isolation and index-backed RLS", () => {
    expect(migration).toContain("is_invoicing_tenant_member");
    expect(migration).toContain("FORCE ROW LEVEL SECURITY");
    expect(migration).toContain("invoicing_invoices_tenant_state_date_idx");
    expect(migration).toContain("invoicing_invoice_lines_invoice_idx");
    expect(migration).toContain("invoicing_documents_tenant_idx");
    expect(migration).toContain("invoicing_outbox_claim_idx");
    expect(migration).toContain("WHERE status IN ('pending','failed')");
  });
});
