-- Market-scoped, revisioned homepage composition. Public application code reads
-- this through the backend service; no browser role receives direct table access.

ALTER TABLE public.trending_section_configs
  ADD COLUMN IF NOT EXISTS selection_mode TEXT NOT NULL DEFAULT 'hybrid'
    CHECK (selection_mode IN ('automatic', 'manual', 'hybrid')),
  ADD COLUMN IF NOT EXISTS listings_per_topic INTEGER NOT NULL DEFAULT 8
    CHECK (listings_per_topic BETWEEN 4 AND 8);

CREATE TABLE IF NOT EXISTS public.homepage_configuration_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  locale VARCHAR(32) NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0),
  state TEXT NOT NULL CHECK (state IN ('draft', 'published', 'archived')),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  change_reason TEXT NOT NULL CHECK (length(trim(change_reason)) BETWEEN 3 AND 500),
  configuration_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  UNIQUE (market_code, locale, revision)
);

CREATE UNIQUE INDEX IF NOT EXISTS homepage_one_draft_per_scope_idx
  ON public.homepage_configuration_revisions (market_code, locale)
  WHERE state = 'draft';
CREATE UNIQUE INDEX IF NOT EXISTS homepage_one_published_per_scope_idx
  ON public.homepage_configuration_revisions (market_code, locale)
  WHERE state = 'published';
CREATE INDEX IF NOT EXISTS homepage_revision_history_idx
  ON public.homepage_configuration_revisions (market_code, locale, revision DESC);

CREATE TABLE IF NOT EXISTS public.homepage_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_id UUID NOT NULL REFERENCES public.homepage_configuration_revisions(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL CHECK (section_key IN (
    'hero', 'recent_searches', 'trending', 'deals',
    'recent_listings', 'collections', 'pro_cta'
  )),
  section_type TEXT NOT NULL CHECK (section_type = section_key),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL CHECK (sort_order BETWEEN 0 AND 20),
  title_by_locale JSONB NOT NULL CHECK (jsonb_typeof(title_by_locale) = 'object'),
  subtitle_by_locale JSONB NOT NULL CHECK (jsonb_typeof(subtitle_by_locale) = 'object'),
  max_items INTEGER NOT NULL CHECK (max_items BETWEEN 1 AND 24),
  mobile_visible BOOLEAN NOT NULL DEFAULT TRUE,
  desktop_visible BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(settings) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at < ends_at),
  UNIQUE (revision_id, section_key),
  UNIQUE (revision_id, sort_order)
);

CREATE TABLE IF NOT EXISTS public.homepage_offer_rules (
  section_id UUID PRIMARY KEY REFERENCES public.homepage_sections(id) ON DELETE CASCADE,
  selection_mode TEXT NOT NULL DEFAULT 'hybrid'
    CHECK (selection_mode IN ('automatic', 'manual', 'hybrid')),
  eligible_offer_types TEXT[] NOT NULL DEFAULT '{}',
  allowed_markets TEXT[] NOT NULL DEFAULT '{}',
  taxonomy_branches TEXT[] NOT NULL DEFAULT '{}',
  minimum_discount_bps INTEGER NOT NULL DEFAULT 500
    CHECK (minimum_discount_bps BETWEEN 0 AND 9000),
  include_professional_sellers BOOLEAN NOT NULL DEFAULT TRUE,
  preview_empty_state BOOLEAN NOT NULL DEFAULT FALSE,
  CHECK (eligible_offer_types <@ ARRAY[
    'verified_price_reduction', 'marketplace_deal',
    'time_limited_promotion', 'professional_discount'
  ]::TEXT[])
);

CREATE TABLE IF NOT EXISTS public.homepage_offer_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.homepage_sections(id) ON DELETE CASCADE,
  listing_id TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  sort_order INTEGER CHECK (sort_order BETWEEN 0 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at < ends_at),
  UNIQUE (section_id, listing_id)
);

CREATE TABLE IF NOT EXISTS public.homepage_configuration_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_id UUID NOT NULL REFERENCES public.homepage_configuration_revisions(id) ON DELETE RESTRICT,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  locale VARCHAR(32) NOT NULL,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('draft_saved', 'published')),
  change_reason TEXT NOT NULL,
  configuration_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS homepage_audit_scope_idx
  ON public.homepage_configuration_audit_events (market_code, locale, created_at DESC);

ALTER TABLE public.homepage_configuration_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_offer_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_offer_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_configuration_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_configuration_revisions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_sections FORCE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_offer_rules FORCE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_offer_overrides FORCE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_configuration_audit_events FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.homepage_configuration_revisions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.homepage_sections FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.homepage_offer_rules FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.homepage_offer_overrides FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.homepage_configuration_audit_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.homepage_configuration_revisions TO service_role;
GRANT SELECT, INSERT ON public.homepage_sections TO service_role;
GRANT SELECT, INSERT ON public.homepage_offer_rules TO service_role;
GRANT SELECT, INSERT ON public.homepage_offer_overrides TO service_role;
GRANT SELECT, INSERT ON public.homepage_configuration_audit_events TO service_role;

CREATE POLICY "Homepage revisions are service managed"
  ON public.homepage_configuration_revisions FOR ALL TO service_role
  USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Homepage sections are service managed"
  ON public.homepage_sections FOR ALL TO service_role
  USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Homepage offer rules are service managed"
  ON public.homepage_offer_rules FOR ALL TO service_role
  USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Homepage offer overrides are service managed"
  ON public.homepage_offer_overrides FOR ALL TO service_role
  USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Homepage audit is service readable"
  ON public.homepage_configuration_audit_events FOR SELECT TO service_role
  USING (TRUE);
CREATE POLICY "Homepage audit is service append only"
  ON public.homepage_configuration_audit_events FOR INSERT TO service_role
  WITH CHECK (TRUE);

CREATE OR REPLACE FUNCTION public.save_homepage_configuration_revision(
  p_configuration JSONB,
  p_actor_id UUID,
  p_change_reason TEXT,
  p_publish BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_market_code TEXT := upper(trim(p_configuration->>'marketCode'));
  v_locale TEXT := trim(p_configuration->>'locale');
  v_revision INTEGER;
  v_revision_id UUID;
  v_section JSONB;
  v_section_id UUID;
  v_offer JSONB;
  v_settings JSONB;
  v_state TEXT := CASE WHEN p_publish THEN 'published' ELSE 'draft' END;
  v_hash TEXT := md5(p_configuration::TEXT);
BEGIN
  IF v_market_code !~ '^[A-Z]{2}$' OR length(v_locale) < 2 THEN
    RAISE EXCEPTION 'invalid homepage market or locale' USING ERRCODE = '22023';
  END IF;
  IF length(trim(p_change_reason)) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'homepage change reason is required' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_configuration->'sections') <> 'array'
     OR jsonb_array_length(p_configuration->'sections') > 7 THEN
    RAISE EXCEPTION 'invalid homepage section list' USING ERRCODE = '22023';
  END IF;

  PERFORM 1 FROM public.markets market WHERE market.code = v_market_code FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'homepage market not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.homepage_configuration_revisions
  SET state = 'archived', updated_at = NOW()
  WHERE market_code = v_market_code
    AND locale = v_locale
    AND state = v_state;

  SELECT COALESCE(MAX(revision), 0) + 1 INTO v_revision
  FROM public.homepage_configuration_revisions
  WHERE market_code = v_market_code AND locale = v_locale;

  INSERT INTO public.homepage_configuration_revisions (
    market_code, locale, revision, state, actor_id, change_reason,
    configuration_hash, published_at
  ) VALUES (
    v_market_code, v_locale, v_revision, v_state, p_actor_id,
    trim(p_change_reason), v_hash, CASE WHEN p_publish THEN NOW() END
  ) RETURNING id INTO v_revision_id;

  FOR v_section IN SELECT value FROM jsonb_array_elements(p_configuration->'sections')
  LOOP
    v_settings := COALESCE(v_section->'settings', '{}'::jsonb) - 'offerOverrides';
    IF v_section->>'type' = 'deals' THEN
      v_settings := v_settings
        - 'selectionMode' - 'eligibleOfferTypes' - 'allowedMarkets'
        - 'taxonomyBranches' - 'minimumDiscountBps'
        - 'includeProfessionalSellers' - 'previewEmptyState';
    END IF;
    INSERT INTO public.homepage_sections (
      revision_id, section_key, section_type, enabled, sort_order,
      title_by_locale, subtitle_by_locale, max_items, mobile_visible,
      desktop_visible, starts_at, ends_at, settings
    ) VALUES (
      v_revision_id, v_section->>'key', v_section->>'type',
      COALESCE((v_section->>'enabled')::BOOLEAN, TRUE),
      (v_section->>'order')::INTEGER,
      COALESCE(v_section->'titleByLocale', '{}'::jsonb),
      COALESCE(v_section->'subtitleByLocale', '{}'::jsonb),
      (v_section->>'maxItems')::INTEGER,
      COALESCE((v_section->>'mobileVisible')::BOOLEAN, TRUE),
      COALESCE((v_section->>'desktopVisible')::BOOLEAN, TRUE),
      NULLIF(v_section->>'startsAt', '')::TIMESTAMPTZ,
      NULLIF(v_section->>'endsAt', '')::TIMESTAMPTZ,
      v_settings
    ) RETURNING id INTO v_section_id;

    IF v_section->>'type' = 'deals' THEN
      INSERT INTO public.homepage_offer_rules (
        section_id, selection_mode, eligible_offer_types, allowed_markets,
        taxonomy_branches, minimum_discount_bps,
        include_professional_sellers, preview_empty_state
      ) VALUES (
        v_section_id,
        COALESCE(v_section#>>'{settings,selectionMode}', 'hybrid'),
        ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_section#>'{settings,eligibleOfferTypes}', '[]'::jsonb))),
        ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_section#>'{settings,allowedMarkets}', '[]'::jsonb))),
        ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_section#>'{settings,taxonomyBranches}', '[]'::jsonb))),
        COALESCE((v_section#>>'{settings,minimumDiscountBps}')::INTEGER, 500),
        COALESCE((v_section#>>'{settings,includeProfessionalSellers}')::BOOLEAN, TRUE),
        COALESCE((v_section#>>'{settings,previewEmptyState}')::BOOLEAN, FALSE)
      );
      FOR v_offer IN SELECT value FROM jsonb_array_elements(
        COALESCE(v_section#>'{settings,offerOverrides}', '[]'::jsonb)
      )
      LOOP
        INSERT INTO public.homepage_offer_overrides (
          section_id, listing_id, is_pinned, is_hidden,
          starts_at, ends_at, sort_order
        ) VALUES (
          v_section_id, v_offer->>'listingId',
          COALESCE((v_offer->>'isPinned')::BOOLEAN, FALSE),
          COALESCE((v_offer->>'isHidden')::BOOLEAN, FALSE),
          NULLIF(v_offer->>'startsAt', '')::TIMESTAMPTZ,
          NULLIF(v_offer->>'endsAt', '')::TIMESTAMPTZ,
          NULLIF(v_offer->>'sortOrder', '')::INTEGER
        );
      END LOOP;
    END IF;
  END LOOP;

  INSERT INTO public.homepage_configuration_audit_events (
    revision_id, market_code, locale, actor_id, action,
    change_reason, configuration_hash
  ) VALUES (
    v_revision_id, v_market_code, v_locale, p_actor_id,
    CASE WHEN p_publish THEN 'published' ELSE 'draft_saved' END,
    trim(p_change_reason), v_hash
  );
  RETURN v_revision_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_homepage_configuration_revision(JSONB,UUID,TEXT,BOOLEAN)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_homepage_configuration_revision(JSONB,UUID,TEXT,BOOLEAN)
  TO service_role;

COMMENT ON TABLE public.homepage_configuration_revisions IS
  'Immutable market and locale scoped homepage revisions with one active draft and published revision.';
COMMENT ON TABLE public.homepage_offer_rules IS
  'Validated automatic/manual/hybrid offer eligibility rules; pricing truth remains owned by listing and promotion data.';
COMMENT ON TABLE public.homepage_configuration_audit_events IS
  'Append-only actor, reason, revision and configuration hash history for homepage publication.';
