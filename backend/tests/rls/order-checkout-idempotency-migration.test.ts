import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sql = fs.readFileSync(
  path.resolve(
    process.cwd(),
    "supabase/migrations/00042_order_checkout_idempotency.sql",
  ),
  "utf8",
);

describe("order checkout idempotency migration", () => {
  it("enforces one persisted order per client checkout key", () => {
    expect(sql).toContain("checkout_idempotency_key VARCHAR(200)");
    expect(sql).toContain("orders_checkout_idempotency_unique_idx");
    expect(sql).toContain(
      "char_length(checkout_idempotency_key) BETWEEN 8 AND 200",
    );
  });
});
