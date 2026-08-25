import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00058_crm_tag_persistence.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("CRM tag persistence migration", () => {
  it("consolidates case-insensitive duplicates before enforcing uniqueness", () => {
    expect(migration).toContain("first_value(id) OVER");
    expect(migration).toContain("crm_tags_tenant_lower_name_uidx");
    expect(migration).toContain("ON CONFLICT DO NOTHING");
  });

  it("validates tenant-owned targets and bounded tag sets", () => {
    expect(migration).toContain("FUNCTION public.replace_crm_entity_tags");
    expect(migration).toContain("CRM_TAG_ENTITY_NOT_FOUND");
    expect(migration).toContain("CRM_TAG_LIMIT_EXCEEDED");
    expect(migration).toContain("cardinality(normalized_names) > 50");
  });

  it("keeps tag mutation behind the backend service role", () => {
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain(
      "REVOKE ALL ON TABLE public.crm_tags, public.crm_entity_tags",
    );
    expect(migration).toContain("TO service_role");
  });
});
