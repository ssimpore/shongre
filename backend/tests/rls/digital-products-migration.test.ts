import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const foundation = readFileSync(
  new URL(
    "../../supabase/migrations/00090_digital_products.sql",
    import.meta.url,
  ),
  "utf8",
);
const governance = readFileSync(
  new URL(
    "../../supabase/migrations/00091_digital_policy_governance.sql",
    import.meta.url,
  ),
  "utf8",
);
const workers = readFileSync(
  new URL(
    "../../supabase/migrations/00092_digital_fulfillment_workers.sql",
    import.meta.url,
  ),
  "utf8",
);
const migration = `${foundation}\n${governance}\n${workers}`;

describe("digital product database boundary", () => {
  it("stores immutable product, asset, commercial and entitlement evidence", () => {
    for (const table of [
      "digital_market_policies",
      "digital_assets",
      "digital_access_secret_versions",
      "digital_credential_batches",
      "digital_credentials",
      "digital_fulfillment_versions",
      "digital_order_items",
      "digital_entitlements",
      "digital_provisioning_tasks",
      "digital_access_grants",
      "digital_access_audit_events",
      "digital_fulfillment_outbox",
    ])
      expect(migration).toContain(`CREATE TABLE public.${table}`);
    expect(migration).toContain("commercial_evidence_id TEXT NOT NULL");
    expect(migration).toContain("fulfillment_version_id UUID NOT NULL");
    expect(migration).toContain("product_access_class TEXT");
  });

  it("reserves unique credentials and access limits under row locks", () => {
    expect(foundation).toContain("FOR UPDATE SKIP LOCKED");
    expect(foundation).toContain("credential_id UUID NOT NULL UNIQUE");
    expect(foundation).toContain("order_item_id UUID NOT NULL UNIQUE");
    expect(foundation).toContain("WHERE id = p_entitlement_id\n  FOR UPDATE");
    expect(foundation).toContain(
      "download_count >= entitlement.download_limit",
    );
    expect(foundation).toContain("reveal_count >= entitlement.reveal_limit");
  });

  it("grants exactly one entitlement only from an authoritative paid order", () => {
    expect(foundation).toContain("paid_order.status <> 'escrow_funded'");
    expect(foundation).toContain(
      "paid_order.payment_intent_id IS DISTINCT FROM p_payment_intent_id",
    );
    expect(foundation).toContain("ON CONFLICT (order_item_id)");
    expect(foundation).toContain("ON CONFLICT (idempotency_key) DO NOTHING");
  });

  it("serializes refunds, disputes, grant consumption and seller provisioning", () => {
    expect(workers).toContain("apply_digital_order_access_state");
    expect(workers).toContain("FOR entitlement IN");
    expect(workers).toContain("attach_provisioned_digital_secret");
    expect(workers).toContain(
      "CREATE OR REPLACE FUNCTION public.consume_digital_access_grant",
    );
    expect(workers).toContain("entitlement.payment_status <> 'CONFIRMED'");
    expect(workers).toContain("access_grant.revoked_at IS NOT NULL");
  });

  it("queues private-file scanning durably without putting storage data in the event", () => {
    expect(workers).toContain(
      "CREATE OR REPLACE FUNCTION public.enqueue_digital_asset_scan",
    );
    expect(workers).toContain("'DIGITAL_ASSET_SCAN_REQUESTED'");
    expect(workers).toContain("'digital_asset'");
    expect(workers).toContain("jsonb_build_object('assetId', asset.id)");
    expect(workers).toContain(
      "REVOKE ALL ON FUNCTION public.enqueue_digital_asset_scan",
    );
    expect(workers).toContain(
      "GRANT EXECUTE ON FUNCTION public.enqueue_digital_asset_scan",
    );
  });

  it("keeps policy activation fail closed and market scoped", () => {
    expect(foundation).toContain(
      "Installed policies are deliberately disabled",
    );
    expect(foundation).toContain("'DISABLED'");
    expect(governance).toContain("DIGITAL_POLICY_EVIDENCE_INCOMPLETE");
    expect(governance).toContain("REACCEPTANCE_REQUIRED");
    expect(governance).toContain("market_code VARCHAR(2)");
  });

  it("denies browser table access and prevents secret-shaped audit payloads", () => {
    expect(
      migration.match(/ENABLE ROW LEVEL SECURITY/g)?.length,
    ).toBeGreaterThanOrEqual(15);
    expect(migration).toContain("FROM anon, authenticated");
    expect(migration).toContain("TO service_role");
    expect(migration).toContain(
      "ARRAY['secret','credential','password','token','url','storage_key','file_name']",
    );
  });
});
