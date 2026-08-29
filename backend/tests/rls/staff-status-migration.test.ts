import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../supabase/migrations/00079_staff_status.sql", import.meta.url),
  "utf8",
);

describe("orthogonal Staff status migration", () => {
  it("keeps Staff separate from Individual and Professional account types", () => {
    expect(migration).toContain(
      "CREATE TABLE IF NOT EXISTS public.staff_memberships",
    );
    expect(migration).toContain(
      "account_family IN ('individual','professional')",
    );
    expect(migration).toContain("Staff is a status, not an account type");
    expect(migration).toContain("SET account_type = 'individual'");
  });

  it("denies direct browser access and grants authority only to active memberships", () => {
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain(
      "REVOKE ALL ON public.staff_memberships FROM PUBLIC, anon, authenticated",
    );
    expect(migration).toContain(
      "ON staff.user_id = profile.id AND staff.status = 'active'",
    );
    expect(migration).toContain(
      "grant_row.role_kind = 'staff_role' AND grant_row.role_key = staff.staff_role",
    );
    expect(migration).toContain("staff.user_id IS NOT NULL");
  });

  it("blocks self-elevation, protects owners, and audits every mutation", () => {
    expect(migration).toContain("Staff access cannot be self-managed");
    expect(migration).toContain("Only an owner can manage owner access");
    expect(migration).toContain(
      "The last active Staff owner cannot be removed",
    );
    expect(migration).toContain("shongre_staff_active_owner_guard");
    expect(migration).toContain("staff_memberships_validate_change");
    expect(migration).toContain("staff_memberships_audit_change");
    expect(migration).toContain("INSERT INTO public.audit_logs");
    expect(migration).toContain("'previousStatus'");
    expect(migration).toContain("'newRole'");
  });
});
