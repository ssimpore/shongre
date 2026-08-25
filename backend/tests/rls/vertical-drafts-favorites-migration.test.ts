import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00048_vertical_drafts_and_favorites.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("vertical drafts and favorites migration", () => {
  it("scopes favorites to an account and real vertical target", () => {
    expect(migration).toContain("PRIMARY KEY (user_id, vehicle_id)");
    expect(migration).toContain("PRIMARY KEY (user_id, tutor_profile_id)");
    expect(migration).toContain("REFERENCES public.auto_vehicles(id)");
    expect(migration).toContain("REFERENCES public.course_tutor_profiles(id)");
  });

  it("persists only bounded Education workflow kinds with expiry", () => {
    expect(migration).toContain("course_workflow_drafts");
    expect(migration).toContain("'tutor_onboarding', 'learner_request'");
    expect(migration).toContain("INTERVAL '30 days'");
  });

  it("keeps writes server-owned and toggles atomically", () => {
    expect(migration).toContain("toggle_auto_vehicle_favorite");
    expect(migration).toContain("toggle_course_tutor_favorite");
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("SET search_path = ''");
  });
});
