import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(
  path.resolve(
    process.cwd(),
    "supabase/migrations/00021_real_estate_publisher_compatibility.sql",
  ),
  "utf8",
);

describe("real-estate publisher compatibility migration", () => {
  it("writes every canonical publisher identity field", () => {
    expect(migration).toContain("publisher_type");
    expect(migration).toContain("publisher_user_id");
    expect(migration).toContain("publisher_organization_id");
    expect(migration).toContain("publisher_verification_status");
    expect(migration).toContain("publication_offer_id");
  });

  it("keeps private and professional publication offers explicit", () => {
    expect(migration).toContain("listing.standard.professional");
    expect(migration).toContain("listing.standard.individual");
  });

  it("serializes slug upserts and reuses their generic listing projection", () => {
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("WHERE property.slug = NEW.slug");
    expect(migration).toContain("property.listing_id");
  });
});
