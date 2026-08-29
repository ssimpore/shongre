import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00082_staff_capability_management.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("Staff capability-management migration", () => {
  it("adds the shared Staff gate and limits override administration to admin and owner", () => {
    expect(migration).toContain("VALUES ('staff.internal.access', TRUE)");
    expect(migration).toContain("'support_agent','moderator','trust_safety'");
    expect(migration).toContain(
      "('staff_role', 'admin', 'admin.permissions.manage')",
    );
    expect(migration).toContain(
      "('staff_role', 'owner', 'admin.permissions.manage')",
    );
    expect(migration).toContain("membership.status = 'active'");
    expect(migration).toContain("actor_profile.status::TEXT = 'active'");
  });

  it("uses a service-role-only transactional mutation with optimistic concurrency", () => {
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.update_profile_capability_overrides",
    );
    expect(migration).toContain("FOR UPDATE");
    expect(migration).toContain("previous_version <> p_expected_version");
    expect(migration).toContain("USING ERRCODE = '40001'");
    expect(migration).toContain("SECURITY DEFINER SET search_path = public");
    expect(migration).toContain(") FROM PUBLIC, anon, authenticated;");
    expect(migration).toContain(") TO service_role;");
  });

  it("blocks self-management and owner escalation while auditing and revoking sessions atomically", () => {
    expect(migration).toContain("Capability overrides cannot be self-managed");
    expect(migration).toContain("Only an owner can modify an owner");
    expect(migration).toContain(
      "Only an owner can grant owner-only capabilities",
    );
    expect(migration).toContain("'permission.manage'");
    expect(migration).toContain("'provider.credentials.manage'");
    expect(migration).toContain("'capability_overrides_changed'");
    expect(migration).toContain("INSERT INTO public.audit_logs");
    expect(migration).toContain("'previousCustomPermissions'");
    expect(migration).toContain("'requestId'");
  });
});
