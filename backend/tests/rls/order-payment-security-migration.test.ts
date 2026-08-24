import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const readMigration = (name: string) =>
  readFileSync(
    fileURLToPath(
      new URL(`../../supabase/migrations/${name}`, import.meta.url),
    ),
    "utf8",
  );

const statuses = readMigration("00033_order_payment_statuses.sql");
const expand = readMigration("00034_order_payment_security_expand.sql");
const contract = readMigration("00035_order_payment_security_contract.sql");
const transfers = readMigration("00039_order_seller_transfers.sql");

describe("provider-authoritative order migrations", () => {
  it("persists asynchronous provider states and minor-unit amounts", () => {
    expect(statuses).toContain("payment_pending");
    expect(statuses).toContain("refund_pending");
    expect(expand).toContain("total_charged_minor");
    expect(expand).toContain("orders_total_minor_consistency_check");
    expect(expand).toContain("orders_checkout_session_unique_idx");
    expect(expand).toContain("orders_payment_intent_unique_idx");
  });

  it("persists an idempotent post-completion seller-transfer lifecycle", () => {
    expect(transfers).toContain("seller_transfer_id");
    expect(transfers).toContain("seller_transfer_amount_minor");
    expect(transfers).toContain("seller_transfer_status");
    expect(transfers).toContain("orders_seller_transfer_unique_idx");
    expect(transfers).toContain("partially_reversed");
  });

  it("moves reservation deposits into market configuration", () => {
    expect(expand).toContain("reservation_deposit_rate_bps");
    expect(expand).toContain("reservation_deposit_minimum_minor");
    expect(expand).toContain("reservation_deposit_maximum_minor");
  });

  it("removes plaintext handover secrets and direct participant writes", () => {
    expect(contract).toContain("DROP COLUMN IF EXISTS handover_pin");
    expect(contract).toContain(
      'DROP POLICY IF EXISTS "Order participants can update orders"',
    );
    expect(contract).toContain(
      "REVOKE INSERT, UPDATE, DELETE ON public.orders FROM anon, authenticated",
    );
    expect(contract).toContain("record_order_handover_pin_failure");
    expect(contract).toContain("SET search_path = ''");
    expect(contract).toContain("TO service_role");
  });
});
