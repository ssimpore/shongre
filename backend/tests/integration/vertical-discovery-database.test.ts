import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { runPsql } from "../../scripts/database/psql.js";

const enabled = process.env.VERTICAL_DISCOVERY_DATABASE_TEST === "local";
const migration = readFileSync(
  new URL(
    "../../supabase/migrations/00139_vertical_search_publications.sql",
    import.meta.url,
  ),
  "utf8",
);

function verify(sql: string) {
  expect(process.env.APP_ENV).toBe("local");
  const databaseUrl = process.env.DATABASE_URL!;
  expect(["localhost", "127.0.0.1", "[::1]"]).toContain(
    new URL(databaseUrl).hostname,
  );
  // Exercise the real projection triggers and migration replay without retaining
  // source, publication, media or outbox changes in the developer's database.
  runPsql(
    databaseUrl,
    `BEGIN; ${migration}\n DO $test$\n${sql}\n$test$; ROLLBACK;`,
  );
}

describe.skipIf(!enabled)("vertical discovery database projections", () => {
  it("publishes field icons from database authoring and rejects unsupported glyphs", () => {
    verify(`
    DECLARE payload jsonb; icon text;
    BEGIN
      SELECT p.snapshot INTO STRICT payload FROM public.taxonomy_configuration c
        JOIN public.taxonomy_publications p ON p.revision=c.published_revision WHERE c.singleton;
      IF EXISTS (SELECT 1 FROM jsonb_array_elements(payload->'attributes') a
        WHERE NOT a ? 'iconName') THEN RAISE EXCEPTION 'Published fields lack authored icons'; END IF;
      SELECT a->>'iconName' INTO STRICT icon FROM jsonb_array_elements(payload->'attributes') a WHERE a->>'code'='model_year';
      IF icon <> 'calendar' THEN RAISE EXCEPTION 'Model year has the wrong published icon'; END IF;
      SELECT a->>'iconName' INTO STRICT icon FROM jsonb_array_elements(public.get_taxonomy_draft()->'bundle'->'attributes') a WHERE a->>'code'='doors';
      IF icon <> 'door' THEN RAISE EXCEPTION 'Draft lost its door icon'; END IF;
      BEGIN
        UPDATE public.taxonomy_attributes SET icon_name='unsupported-glyph' WHERE code='model_year';
        RAISE EXCEPTION 'Unsupported glyph was accepted';
      EXCEPTION WHEN check_violation THEN NULL;
      END;
    END`);
  }, 60_000);
  it("repairs all four verticals and keeps publisher types and public vehicle photos", () => {
    verify(`
    DECLARE kind text; vehicle public.auto_vehicles%ROWTYPE;
    BEGIN
      FOREACH kind IN ARRAY ARRAY['automotive','real_estate','employment','tutoring'] LOOP
        IF NOT EXISTS (SELECT 1 FROM public.listings WHERE vertical_type = kind AND status = 'published') THEN
          RAISE EXCEPTION 'Local seed is missing published % inventory', kind;
        END IF;
        IF EXISTS (
          SELECT 1 FROM public.listings l
          LEFT JOIN public.listing_market_publications p ON p.listing_id=l.id AND p.market_code=l.market_code
          WHERE l.vertical_type=kind AND l.status='published' AND p.listing_id IS NULL
        ) THEN RAISE EXCEPTION 'Missing % market publication', kind; END IF;
      END LOOP;
      IF EXISTS (
        SELECT 1 FROM public.listings l
        WHERE l.vertical_type IS NOT NULL AND l.publisher_type <> CASE
          WHEN l.publisher_organization_id IS NOT NULL
            THEN 'professional' ELSE 'private' END
      ) THEN RAISE EXCEPTION 'Publisher type does not match authoritative account state'; END IF;
      SELECT * INTO STRICT vehicle FROM public.auto_vehicles WHERE lifecycle='published' AND moderation_status='approved' LIMIT 1;
      IF NOT EXISTS (
        SELECT 1 FROM public.listing_media WHERE listing_id=vehicle.listing_id
          AND url=vehicle.public_payload->'mediaUrls'->>0 AND is_primary
      ) THEN RAISE EXCEPTION 'The professional vehicle lost its public photo'; END IF;
      IF EXISTS (
        SELECT 1 FROM public.listing_market_publications WHERE listing_id=vehicle.listing_id
          AND market_code <> ALL(vehicle.market_codes)
      ) THEN RAISE EXCEPTION 'A publication leaked into another market'; END IF;
    END`);
  }, 60_000);

  it("updates price, moves a draft through approval, and preserves market restrictions on refresh", () => {
    verify(`
    DECLARE vehicle public.auto_vehicles%ROWTYPE; photo_id uuid; publication_count int;
    BEGIN
      SELECT * INTO STRICT vehicle FROM public.auto_vehicles WHERE lifecycle='published' AND moderation_status='approved' LIMIT 1;
      SELECT id INTO photo_id FROM public.listing_media WHERE listing_id=vehicle.listing_id AND is_primary;
      SELECT count(*) INTO publication_count FROM public.listing_market_publications WHERE listing_id=vehicle.listing_id;
      UPDATE public.auto_vehicles SET price_minor=price_minor+100 WHERE id=vehicle.id;
      IF NOT EXISTS (
        SELECT 1 FROM public.listing_market_publications WHERE listing_id=vehicle.listing_id
          AND market_code=vehicle.market_codes[1] AND price_minor=vehicle.price_minor+100
          AND status='active' AND compliance_state='approved'
      ) THEN RAISE EXCEPTION 'Price refresh lost the approved publication'; END IF;
      IF (SELECT count(*) FROM public.listing_market_publications WHERE listing_id=vehicle.listing_id) <> publication_count
        OR NOT EXISTS (SELECT 1 FROM public.listing_media WHERE id=photo_id) THEN
        RAISE EXCEPTION 'Projection replay duplicated publications or changed media identity';
      END IF;
      UPDATE public.auto_vehicles SET lifecycle='draft', moderation_status='pending_review' WHERE id=vehicle.id;
      IF EXISTS (SELECT 1 FROM public.listing_market_publications WHERE listing_id=vehicle.listing_id AND status='active') THEN
        RAISE EXCEPTION 'An unapproved draft remains active';
      END IF;
      UPDATE public.auto_vehicles SET lifecycle='published', moderation_status='approved' WHERE id=vehicle.id;
      IF NOT EXISTS (SELECT 1 FROM public.listing_market_publications WHERE listing_id=vehicle.listing_id AND status='active' AND compliance_state='approved') THEN
        RAISE EXCEPTION 'Source approval did not publish the vehicle';
      END IF;
      UPDATE public.listing_market_publications SET status='suspended', compliance_state='restricted'
        WHERE listing_id=vehicle.listing_id AND market_code=vehicle.market_codes[1];
      UPDATE public.auto_vehicles SET price_minor=price_minor+100 WHERE id=vehicle.id;
      IF NOT EXISTS (SELECT 1 FROM public.listing_market_publications WHERE listing_id=vehicle.listing_id AND status='suspended' AND compliance_state='restricted') THEN
        RAISE EXCEPTION 'A content refresh bypassed market moderation';
      END IF;
      UPDATE public.listing_market_publications SET status='pending_review', compliance_state='pending'
        WHERE listing_id=vehicle.listing_id AND market_code=vehicle.market_codes[1];
      UPDATE public.auto_vehicles SET price_minor=price_minor+100 WHERE id=vehicle.id;
      IF NOT EXISTS (SELECT 1 FROM public.listing_market_publications WHERE listing_id=vehicle.listing_id AND status='pending_review' AND compliance_state='pending') THEN
        RAISE EXCEPTION 'A content refresh approved pending market review';
      END IF;
    END`);
  }, 60_000);

  it("retains the privileged-only writer and currency precision", () => {
    verify(`
    DECLARE routine oid; actor uuid; owner_organization uuid; projected uuid; currency_code text; amount bigint; digits int;
    BEGIN
      SELECT p.oid INTO STRICT routine FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname='upsert_vertical_discovery_listing';
      IF has_function_privilege('anon', routine, 'EXECUTE') OR has_function_privilege('authenticated', routine, 'EXECUTE') THEN
        RAISE EXCEPTION 'Public callers can write discovery publications';
      END IF;
      SELECT seller_id, publisher_organization_id INTO STRICT actor, owner_organization FROM public.listings WHERE vertical_type='automotive' LIMIT 1;
      INSERT INTO public.currency_definitions(code, display_name, symbol, minor_unit_digits)
        VALUES ('BHD', 'Test three-decimal currency', 'BHD', 3) ON CONFLICT DO NOTHING;
      FOREACH currency_code IN ARRAY ARRAY['EUR','XOF','BHD'] LOOP
        amount := 12345;
        SELECT minor_unit_digits INTO STRICT digits FROM public.currency_definitions WHERE code=currency_code;
        projected := public.upsert_vertical_discovery_listing(
          NULL, 'automotive', gen_random_uuid(), 1, 'FR', 'vehicles', actor, owner_organization,
          'Projection test', 'Controlled transactional projection test', amount, currency_code,
          'draft', 'bon-etat', 'Lyon', '69002', 'FR', NULL, NULL, '{}'::jsonb,
          now(), now(), NULL
        );
        IF NOT EXISTS (SELECT 1 FROM public.listing_market_publications WHERE listing_id=projected AND price_minor=amount AND currency=currency_code) THEN
          RAISE EXCEPTION 'Minor units changed for %', currency_code;
        END IF;
        IF (SELECT price FROM public.listings WHERE id=projected) <> round(amount::numeric / power(10::numeric,digits), 2) THEN
          RAISE EXCEPTION 'Legacy display amount changed for %', currency_code;
        END IF;
      END LOOP;
    END`);
  }, 60_000);
});
