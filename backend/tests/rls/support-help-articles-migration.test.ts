import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00141_support_help_articles.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("support help article migration safeguards", () => {
  it("stores localized, optionally market-scoped published content", () => {
    expect(migration).toContain("CREATE TABLE public.support_help_articles");
    expect(migration).toContain("market_code TEXT REFERENCES public.markets");
    expect(migration).toContain("locale TEXT NOT NULL");
    expect(migration).toContain("support_help_articles_publication_idx");
  });

  it("keeps direct client access denied and seeds both supported locales", () => {
    expect(migration).toContain(
      "ALTER TABLE public.support_help_articles ENABLE ROW LEVEL SECURITY",
    );
    expect(migration).toContain(
      "REVOKE ALL ON public.support_help_articles FROM PUBLIC, anon, authenticated",
    );
    expect(migration).toContain("'faq-fr-payment', 'fr-FR'");
    expect(migration).toContain("'faq-en-payment', 'en-US'");
  });
});
