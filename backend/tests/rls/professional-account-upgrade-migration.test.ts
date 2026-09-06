import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00108_professional_account_upgrade.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("professional account upgrade migration", () => {
  it("locks the account and upgrades it in the organization transaction", () => {
    expect(migration).toMatch(/WHERE profile\.id = p_user_id\s+FOR UPDATE/);
    const accountUpdate = migration.indexOf("UPDATE public.profiles");
    const organizationProvisioning = migration.indexOf(
      "public.ensure_owned_organization",
    );
    expect(accountUpdate).toBeGreaterThan(0);
    expect(organizationProvisioning).toBeGreaterThan(accountUpdate);
    expect(migration).toContain("is_business_verified = FALSE");
  });

  it("rejects retained Staff membership and exposes no client execution grant", () => {
    expect(migration).toMatch(/public\.staff_memberships[\s\S]*42501/);
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("TO service_role");
    expect(migration).not.toMatch(/TO (anon|authenticated)/);
  });
});
