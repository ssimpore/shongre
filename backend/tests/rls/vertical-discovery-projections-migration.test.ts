import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(
  path.resolve(
    process.cwd(),
    "supabase/migrations/00022_vertical_discovery_projections.sql",
  ),
  "utf8",
);

describe("vertical discovery projections migration", () => {
  it("routes all specialized verticals through the canonical listing writer", () => {
    expect(migration).toContain("upsert_vertical_discovery_listing");
    expect(
      migration.match(/:= public\.upsert_vertical_discovery_listing\(/g),
    ).toHaveLength(4);

    for (const vertical of [
      "'automotive'",
      "'employment'",
      "'tutoring'",
      "'real_estate'",
    ]) {
      expect(migration).toContain(vertical);
    }
  });

  it("projects lifecycle updates and archives deleted source offers", () => {
    for (const table of [
      "public.auto_vehicles",
      "public.course_offers",
      "public.employment_jobs",
      "public.real_estate_properties",
    ]) {
      expect(migration).toContain(
        `UPDATE ${table} SET updated_at = updated_at`,
      );
    }

    expect(migration).toContain("archive_vertical_discovery_listing");
    expect(migration.match(/AFTER DELETE/g)?.length).toBeGreaterThanOrEqual(4);
    expect(migration).toContain("SET status = 'archived'");
  });

  it("serializes slug upserts and emits dedicated canonical routes", () => {
    expect(migration.match(/pg_advisory_xact_lock/g)).toHaveLength(4);
    expect(migration).toContain("'/auto/vehicule/'");
    expect(migration).toContain("'/emploi/offre/'");
    expect(migration).toContain("'/cours/professeur/'");
    expect(migration).toContain("'/immo/bien/'");
  });

  it("keeps organic freshness independent from paid bump dates", () => {
    expect(migration).toContain("COALESCE(p_published_at, p_created_at)");
    expect(migration).not.toContain(
      "organic_freshness_at = EXCLUDED.bumped_at",
    );
  });

  it("does not expose privileged projection functions to public roles", () => {
    for (const routine of [
      "resolve_vertical_publisher_user",
      "resolve_vertical_publisher_verification",
      "upsert_vertical_discovery_listing",
      "archive_vertical_discovery_listing",
    ]) {
      expect(migration).toContain(`REVOKE ALL ON FUNCTION public.${routine}`);
    }
  });
});
