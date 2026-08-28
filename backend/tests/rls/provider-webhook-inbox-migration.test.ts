import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/00074_provider_webhook_inbox.sql",
  ),
  "utf8",
);

describe("provider webhook inbox migration", () => {
  it("uses an idempotent durable inbox with leased SKIP LOCKED claims", () => {
    expect(migration).toContain("provider_webhook_inbox");
    expect(migration).toContain("FOR UPDATE SKIP LOCKED");
    expect(migration).toContain(
      "provider event id reused with different payload",
    );
    expect(migration).toContain("dead_letter");
  });

  it("keeps payloads service-only and provides bounded retention", () => {
    expect(migration).toContain("FORCE ROW LEVEL SECURITY");
    expect(migration).toContain("REVOKE ALL ON public.provider_webhook_inbox");
    expect(migration).toContain("purge_processed_provider_webhooks");
    expect(migration).toContain("octet_length(raw_body) <= 1048576");
  });
});
