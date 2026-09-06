import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00104_public_profiles_security_invoker.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("public profile invoker-security migration", () => {
  it("makes the public projection use caller privileges and RLS", () => {
    expect(migration).toContain("security_invoker = true");
    expect(migration).toContain("security_barrier = true");
    expect(migration).toContain("public_marketplace_profiles_are_readable");
    expect(migration).toContain("public.is_customer_marketplace_actor()");
  });

  it("keeps private profile and Staff membership columns unavailable", () => {
    expect(migration).toContain(
      "REVOKE SELECT ON public.profiles FROM anon, authenticated",
    );
    expect(migration).toMatch(
      /GRANT SELECT \([\s\S]+status[\s\S]+\) ON public\.profiles/,
    );
    expect(migration).not.toMatch(/GRANT SELECT \([\s\S]+email/);
    expect(migration).not.toMatch(/GRANT SELECT ON public\.staff_memberships/);
  });

  it("hardens the Staff-filter helper and limits its callers", () => {
    expect(migration).toContain("SECURITY DEFINER");
    expect(migration).toContain("SET search_path = ''");
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("TO anon, authenticated, service_role");
  });
});
