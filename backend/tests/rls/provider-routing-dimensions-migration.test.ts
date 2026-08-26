import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00064_provider_routing_dimensions.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("provider routing dimensions migration", () => {
  it("stores every dimension required for deterministic routing", () => {
    for (const dimension of [
      "capability",
      "operation",
      "market_code",
      "currency",
      "environment",
      "enabled",
    ]) {
      expect(migration).toContain(dimension);
    }
    expect(migration).toContain("provider_routing_rules_dimensions_unique_idx");
  });

  it("distinguishes global routes from explicit market assignments", () => {
    expect(migration).toContain("PLATFORM_GLOBAL");
    expect(migration).toContain("MARKET_SCOPED");
    expect(migration).toContain("validate_provider_routing_market");
    expect(migration).toContain("AND enabled = TRUE");
  });

  it("keeps automatic failover as an explicit approval gate", () => {
    expect(migration).toContain("automatic_failover");
    expect(migration).toContain("never activated when false");
  });
});
