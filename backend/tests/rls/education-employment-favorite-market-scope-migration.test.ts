import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00101_education_employment_favorite_market_scope.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("Education and Employment favorite market scope migration", () => {
  it("publishes both locked compatibility transitions atomically", () => {
    expect(migration).toContain("BEGIN;");
    expect(migration).toContain(
      "LOCK TABLE public.course_tutor_favorites IN SHARE MODE;",
    );
    expect(migration).toContain(
      "LOCK TABLE public.employment_saved_jobs IN SHARE MODE;",
    );
    expect(migration).toContain("COMMIT;");
  });

  it("partitions both resources by account and market", () => {
    expect(migration).toContain(
      "PRIMARY KEY (user_id, tutor_profile_id, market_code)",
    );
    expect(migration).toContain("PRIMARY KEY (user_id, job_id, market_code)");
    expect(migration).toContain(
      "AND favorite.market_code = UPPER(BTRIM(p_market_code))",
    );
  });

  it("quarantines every legacy row without inventing scoped provenance", () => {
    expect(migration).toContain("'course_tutor'");
    expect(migration).toContain("'employment_job'");
    expect(
      migration.match(/FROM legacy_candidates\nON CONFLICT/g),
    ).toHaveLength(2);
    expect(migration).not.toContain("CARDINALITY(market_codes)");
    expect(migration).not.toContain(
      "INSERT INTO public.course_tutor_market_favorites (\n  user_id,\n  tutor_profile_id,\n  market_code,\n  created_at",
    );
    expect(migration).not.toContain(
      "INSERT INTO public.employment_job_market_favorites (\n  user_id,\n  job_id,\n  market_code,\n  created_at",
    );
    expect(migration).toContain(
      "REVOKE ALL ON TABLE public.course_tutor_favorites",
    );
    expect(migration).toContain(
      "REVOKE ALL ON TABLE public.employment_saved_jobs",
    );
  });

  it("purges polymorphic quarantine records before taking the legacy snapshot", () => {
    const coursePurgeIndex = migration.indexOf(
      "CREATE OR REPLACE FUNCTION public.purge_course_tutor_favorite_scope_review()",
    );
    const employmentPurgeIndex = migration.indexOf(
      "CREATE OR REPLACE FUNCTION public.purge_employment_job_favorite_scope_review()",
    );
    const snapshotLockIndex = migration.indexOf(
      "LOCK TABLE public.course_tutor_favorites IN SHARE MODE",
    );

    expect(coursePurgeIndex).toBeGreaterThan(-1);
    expect(employmentPurgeIndex).toBeGreaterThan(-1);
    expect(coursePurgeIndex).toBeLessThan(snapshotLockIndex);
    expect(employmentPurgeIndex).toBeLessThan(snapshotLockIndex);
    expect(migration).toContain("AFTER DELETE ON public.course_tutor_profiles");
    expect(migration).toContain("AFTER DELETE ON public.employment_jobs");
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.purge_course_tutor_favorite_scope_review()",
    );
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.purge_employment_job_favorite_scope_review()",
    );
  });

  it("uses backend-only idempotent setters and exact active-market validation", () => {
    expect(migration).toContain("public.set_course_tutor_favorite(");
    expect(migration).toContain("public.set_employment_job_favorite(");
    expect(migration).toContain("p_is_favorite BOOLEAN");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("profile.market_code = normalized_market_code");
    expect(migration).toContain("job.market_code = normalized_market_code");
    expect(migration).toContain("job.lifecycle = 'published'");
    expect(migration).toContain("job.moderation_status = 'approved'");
    expect(migration).toContain("job.expires_at > NOW()");
    expect(migration).toContain("SET search_path = pg_catalog");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
  });

  it("mirrors legacy callers without allowing ambiguous unscoped deletion", () => {
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.toggle_course_tutor_favorite(",
    );
    expect(migration).toContain(
      "CREATE TRIGGER employment_saved_jobs_market_insert_mirror",
    );
    expect(migration).toContain(
      "CREATE TRIGGER employment_saved_jobs_market_delete_mirror",
    );
    expect(migration).toContain("IF scoped_market_count > 1 THEN");
    expect(migration).toContain("RETURN NULL;");
  });
});
