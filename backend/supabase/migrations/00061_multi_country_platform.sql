-- =============================================================================
-- Shongre multi-country platform foundation
-- One identity, taxonomy and marketplace engine; country behavior is policy.
-- =============================================================================

ALTER TABLE public.markets
  ADD COLUMN IF NOT EXISTS slug VARCHAR(32),
  ADD COLUMN IF NOT EXISTS native_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS launch_status VARCHAR(24) NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS primary_domain VARCHAR(255),
  ADD COLUMN IF NOT EXISTS base_path VARCHAR(64),
  ADD COLUMN IF NOT EXISTS default_locale VARCHAR(16),
  ADD COLUMN IF NOT EXISTS supported_locales TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(80),
  ADD COLUMN IF NOT EXISTS phone_country_code VARCHAR(8),
  ADD COLUMN IF NOT EXISTS address_format TEXT,
  ADD COLUMN IF NOT EXISTS legal_entity VARCHAR(160),
  ADD COLUMN IF NOT EXISTS seo_policy JSONB NOT NULL DEFAULT '{"indexable":false,"hreflang":"fr"}'::jsonb,
  ADD COLUMN IF NOT EXISTS marketplace_policy JSONB NOT NULL DEFAULT '{"enabled":false,"crossBorderSearch":false}'::jsonb,
  ADD COLUMN IF NOT EXISTS payment_policy JSONB NOT NULL DEFAULT '{"enabled":false,"providerIds":[]}'::jsonb,
  ADD COLUMN IF NOT EXISTS tax_policy JSONB NOT NULL DEFAULT '{"mode":"legal_review_required","pricingIncludesTax":true,"defaultVatRateBps":null}'::jsonb,
  ADD COLUMN IF NOT EXISTS monetization_policy JSONB NOT NULL DEFAULT '{"enabled":false,"catalogMarketCode":"FR"}'::jsonb,
  ADD COLUMN IF NOT EXISTS compliance_policy JSONB NOT NULL DEFAULT '{"legalReviewRequired":true,"legalReviewStatus":"pending","minimumAge":18,"kycPolicy":"restricted"}'::jsonb,
  ADD COLUMN IF NOT EXISTS launch_content JSONB NOT NULL DEFAULT '{"title":"Shongre arrive bientôt","description":"Ce marché est en cours de préparation.","earlyAccessEnabled":false}'::jsonb,
  ADD COLUMN IF NOT EXISTS gateway_visible BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

UPDATE public.markets
SET slug = COALESCE(slug, LOWER(code)),
    native_name = COALESCE(native_name, name),
    default_locale = COALESCE(default_locale, locale),
    supported_locales = CASE
      WHEN cardinality(supported_locales) = 0 THEN ARRAY[COALESCE(default_locale, locale)]
      ELSE supported_locales
    END,
    timezone = COALESCE(timezone, 'Europe/Paris'),
    phone_country_code = COALESCE(phone_country_code, '+33'),
    primary_domain = COALESCE(primary_domain, CASE WHEN code = 'FR' THEN 'shongre.fr' ELSE 'shongre.com' END),
    base_path = COALESCE(base_path, CASE WHEN code = 'FR' THEN '/' ELSE '/' || LOWER(code) END),
    marketplace_policy = jsonb_build_object('enabled', is_active, 'crossBorderSearch', false),
    launch_status = CASE WHEN is_active THEN 'active' ELSE 'coming_soon' END,
    monetization_policy = jsonb_build_object('enabled', is_active, 'catalogMarketCode', code)
WHERE slug IS NULL
   OR native_name IS NULL
   OR default_locale IS NULL
   OR timezone IS NULL
   OR phone_country_code IS NULL
   OR primary_domain IS NULL
   OR base_path IS NULL;

ALTER TABLE public.markets
  ALTER COLUMN slug SET NOT NULL,
  ALTER COLUMN native_name SET NOT NULL,
  ALTER COLUMN primary_domain SET NOT NULL,
  ALTER COLUMN base_path SET NOT NULL,
  ALTER COLUMN default_locale SET NOT NULL,
  ALTER COLUMN timezone SET NOT NULL,
  ALTER COLUMN phone_country_code SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'markets_launch_status_check') THEN
    ALTER TABLE public.markets ADD CONSTRAINT markets_launch_status_check
      CHECK (launch_status IN ('disabled','coming_soon','private_beta','beta','active','paused'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'markets_slug_format_check') THEN
    ALTER TABLE public.markets ADD CONSTRAINT markets_slug_format_check
      CHECK (slug ~ '^[a-z0-9-]+$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'markets_base_path_check') THEN
    ALTER TABLE public.markets ADD CONSTRAINT markets_base_path_check
      CHECK (base_path = '/' OR base_path ~ '^/[a-z0-9-]+$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'markets_default_locale_supported_check') THEN
    ALTER TABLE public.markets ADD CONSTRAINT markets_default_locale_supported_check
      CHECK (default_locale = ANY(supported_locales));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS markets_slug_unique_idx
  ON public.markets (LOWER(slug));
CREATE UNIQUE INDEX IF NOT EXISTS markets_domain_path_unique_idx
  ON public.markets (LOWER(primary_domain), base_path);
CREATE INDEX IF NOT EXISTS markets_launch_directory_idx
  ON public.markets (enabled, launch_status, display_order);

INSERT INTO public.markets (
  code, slug, name, native_name, currency, currency_symbol, locale,
  default_locale, supported_locales, timezone, phone_country_code,
  enabled, launch_status, primary_domain, base_path, is_active, is_base_market,
  seo_policy, marketplace_policy, payment_policy, tax_policy,
  monetization_policy, compliance_policy, launch_content,
  gateway_visible, display_order
) VALUES
  ('FR','fr','France','France','EUR','€','fr-FR','fr-FR',ARRAY['fr-FR','en-US'],'Europe/Paris','+33',TRUE,'active','shongre.fr','/',TRUE,TRUE,
   '{"indexable":true,"hreflang":"fr-FR"}','{"enabled":true,"crossBorderSearch":false}','{"enabled":true,"providerIds":["stripe"]}','{"mode":"legal_review_required","pricingIncludesTax":true,"defaultVatRateBps":null}',
   '{"enabled":true,"catalogMarketCode":"FR"}','{"legalReviewRequired":false,"legalReviewStatus":"approved","minimumAge":18,"kycPolicy":"progressive"}','{"title":"Shongre France","description":"Les annonces et professionnels près de chez vous.","earlyAccessEnabled":false}',TRUE,10),
  ('BE','be','Belgique','België · Belgique','EUR','€','fr-BE','fr-BE',ARRAY['fr-BE','nl-BE','en-US'],'Europe/Brussels','+32',TRUE,'active','shongre.com','/be',TRUE,FALSE,
   '{"indexable":true,"hreflang":"fr-BE"}','{"enabled":true,"crossBorderSearch":false}','{"enabled":true,"providerIds":["stripe"]}','{"mode":"legal_review_required","pricingIncludesTax":true,"defaultVatRateBps":null}',
   '{"enabled":true,"catalogMarketCode":"BE"}','{"legalReviewRequired":true,"legalReviewStatus":"approved","minimumAge":18,"kycPolicy":"progressive"}','{"title":"Shongre Belgique","description":"Le marché local belge de Shongre.","earlyAccessEnabled":false}',TRUE,20),
  ('CH','ch','Suisse','Schweiz · Suisse · Svizzera','CHF','CHF','fr-CH','fr-CH',ARRAY['fr-CH','de-CH','it-CH','en-US'],'Europe/Zurich','+41',TRUE,'active','shongre.com','/ch',TRUE,FALSE,
   '{"indexable":true,"hreflang":"fr-CH"}','{"enabled":true,"crossBorderSearch":false}','{"enabled":true,"providerIds":["stripe"]}','{"mode":"legal_review_required","pricingIncludesTax":true,"defaultVatRateBps":null}',
   '{"enabled":true,"catalogMarketCode":"CH"}','{"legalReviewRequired":true,"legalReviewStatus":"approved","minimumAge":18,"kycPolicy":"progressive"}','{"title":"Shongre Suisse","description":"Le marché local suisse de Shongre.","earlyAccessEnabled":false}',TRUE,30),
  ('SN','sn','Sénégal','Sénégal','XOF','F CFA','fr-SN','fr-SN',ARRAY['fr-SN'],'Africa/Dakar','+221',TRUE,'coming_soon','shongre.com','/sn',FALSE,FALSE,
   '{"indexable":false,"hreflang":"fr-SN"}','{"enabled":false,"crossBorderSearch":false}','{"enabled":false,"providerIds":[]}','{"mode":"legal_review_required","pricingIncludesTax":true,"defaultVatRateBps":null}',
   '{"enabled":false,"catalogMarketCode":"SN"}','{"legalReviewRequired":true,"legalReviewStatus":"pending","minimumAge":18,"kycPolicy":"restricted"}','{"title":"Shongre arrive bientôt au Sénégal","description":"Les inscriptions anticipées seront ouvertes lorsque les vérifications locales seront terminées.","earlyAccessEnabled":true}',TRUE,40),
  ('BF','bf','Burkina Faso','Burkina Faso','XOF','F CFA','fr-BF','fr-BF',ARRAY['fr-BF'],'Africa/Ouagadougou','+226',TRUE,'coming_soon','shongre.com','/bf',FALSE,FALSE,
   '{"indexable":false,"hreflang":"fr-BF"}','{"enabled":false,"crossBorderSearch":false}','{"enabled":false,"providerIds":[]}','{"mode":"legal_review_required","pricingIncludesTax":true,"defaultVatRateBps":null}',
   '{"enabled":false,"catalogMarketCode":"BF"}','{"legalReviewRequired":true,"legalReviewStatus":"pending","minimumAge":18,"kycPolicy":"restricted"}','{"title":"Shongre arrive bientôt au Burkina Faso","description":"Les inscriptions anticipées seront ouvertes lorsque les vérifications locales seront terminées.","earlyAccessEnabled":true}',TRUE,50)
ON CONFLICT (code) DO UPDATE SET
  slug = EXCLUDED.slug,
  native_name = EXCLUDED.native_name,
  default_locale = EXCLUDED.default_locale,
  supported_locales = EXCLUDED.supported_locales,
  timezone = EXCLUDED.timezone,
  phone_country_code = EXCLUDED.phone_country_code,
  primary_domain = EXCLUDED.primary_domain,
  base_path = EXCLUDED.base_path,
  enabled = EXCLUDED.enabled,
  launch_status = EXCLUDED.launch_status,
  is_active = EXCLUDED.is_active,
  seo_policy = EXCLUDED.seo_policy,
  marketplace_policy = EXCLUDED.marketplace_policy,
  payment_policy = EXCLUDED.payment_policy,
  tax_policy = EXCLUDED.tax_policy,
  monetization_policy = EXCLUDED.monetization_policy,
  compliance_policy = EXCLUDED.compliance_policy,
  launch_content = EXCLUDED.launch_content,
  gateway_visible = EXCLUDED.gateway_visible,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- Shared taxonomy, country-level availability and local attribute extensions.
CREATE TABLE IF NOT EXISTS public.category_market_availability (
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE CASCADE,
  category_id VARCHAR(100) NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  local_attribute_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  compliance_state VARCHAR(20) NOT NULL DEFAULT 'approved'
    CHECK (compliance_state IN ('pending','approved','restricted')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (market_code, category_id)
);
CREATE INDEX IF NOT EXISTS category_market_enabled_idx
  ON public.category_market_availability (market_code, enabled, category_id);
ALTER TABLE public.category_market_availability ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Category market availability is public" ON public.category_market_availability;
CREATE POLICY "Category market availability is public"
  ON public.category_market_availability FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage category market availability" ON public.category_market_availability;
CREATE POLICY "Admins manage category market availability"
  ON public.category_market_availability FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Organizations and stores may operate in multiple markets without duplication.
CREATE TABLE IF NOT EXISTS public.organization_markets (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','paused','rejected')),
  verification_state VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (verification_state IN ('pending','verified','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, market_code)
);
CREATE TABLE IF NOT EXISTS public.store_markets (
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (store_id, market_code)
);
ALTER TABLE public.organization_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_markets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Organization members view organization markets" ON public.organization_markets;
CREATE POLICY "Organization members view organization markets" ON public.organization_markets
  FOR SELECT USING (public.is_admin() OR organization_id IN (
    SELECT id FROM public.organizations WHERE owner_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = public.auth_uid()
    )
  ));
DROP POLICY IF EXISTS "Admins manage organization markets" ON public.organization_markets;
CREATE POLICY "Admins manage organization markets" ON public.organization_markets
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Store markets are publicly readable" ON public.store_markets;
CREATE POLICY "Store markets are publicly readable" ON public.store_markets
  FOR SELECT USING (is_active OR public.is_admin());
DROP POLICY IF EXISTS "Admins manage store markets" ON public.store_markets;
CREATE POLICY "Admins manage store markets" ON public.store_markets
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_market_code VARCHAR(2) REFERENCES public.markets(code) ON DELETE SET NULL;
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS market_code VARCHAR(2) REFERENCES public.markets(code) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS link_route TEXT;
UPDATE public.notifications SET market_code = 'FR' WHERE market_code IS NULL;
ALTER TABLE public.notifications
  ALTER COLUMN market_code SET DEFAULT 'FR',
  ALTER COLUMN market_code SET NOT NULL;
CREATE INDEX IF NOT EXISTS notifications_user_market_unread_idx
  ON public.notifications (user_id, market_code, created_at DESC) WHERE is_read = FALSE;

-- New writes carry an explicit market and an internal route. The legacy RPC
-- overload remains valid for pre-deployment workers and falls back to FR via
-- the column default; current application code calls this market-aware form.
CREATE OR REPLACE FUNCTION public.create_notification_with_deliveries(
  p_id UUID,
  p_user_id UUID,
  p_type TEXT,
  p_category TEXT,
  p_title TEXT,
  p_body TEXT,
  p_link_url TEXT,
  p_market_code TEXT,
  p_link_route TEXT,
  p_in_app_visible BOOLEAN,
  p_channels TEXT[],
  p_created_at TIMESTAMPTZ
)
RETURNS SETOF public.notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  requested_channel TEXT;
BEGIN
  IF p_category NOT IN (
    'messages', 'transactions', 'listings', 'delivery', 'reviews',
    'promotions', 'security', 'marketing'
  ) THEN
    RAISE EXCEPTION 'invalid notification category' USING ERRCODE = '22023';
  END IF;
  IF char_length(btrim(p_title)) NOT BETWEEN 1 AND 255
     OR char_length(btrim(p_body)) NOT BETWEEN 1 AND 5000 THEN
    RAISE EXCEPTION 'invalid notification content' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.markets
    WHERE code = upper(btrim(p_market_code)) AND enabled = TRUE
  ) THEN
    RAISE EXCEPTION 'invalid notification market' USING ERRCODE = '22023';
  END IF;
  IF btrim(COALESCE(p_link_route, '')) <> '' AND (
    left(btrim(p_link_route), 1) <> '/'
    OR left(btrim(p_link_route), 2) = '//'
  ) THEN
    RAISE EXCEPTION 'invalid notification route' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(COALESCE(p_channels, ARRAY[]::TEXT[])) AS channel
    WHERE channel NOT IN ('email', 'push')
  ) THEN
    RAISE EXCEPTION 'invalid notification channel' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.notifications (
    id, user_id, type, category, title, body, link_url, market_code,
    link_route, in_app_visible, is_read, created_at
  ) VALUES (
    p_id, p_user_id, p_type, p_category, btrim(p_title), btrim(p_body),
    NULLIF(btrim(p_link_url), ''), upper(btrim(p_market_code)),
    NULLIF(btrim(p_link_route), ''), p_in_app_visible, FALSE, p_created_at
  );

  FOREACH requested_channel IN ARRAY COALESCE(p_channels, ARRAY[]::TEXT[])
  LOOP
    INSERT INTO public.notification_deliveries (
      notification_id, user_id, channel, idempotency_key
    ) VALUES (
      p_id, p_user_id, requested_channel, p_id::TEXT || ':' || requested_channel
    ) ON CONFLICT (notification_id, channel) DO NOTHING;
  END LOOP;

  RETURN QUERY SELECT * FROM public.notifications WHERE id = p_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_notification_with_deliveries(
  UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT[], TIMESTAMPTZ
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification_with_deliveries(
  UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT[], TIMESTAMPTZ
) TO service_role;

-- Delivery workers receive a canonicalizable {market, route} pair rather than
-- an ambiguous relative link. Public URL construction remains in application
-- code and therefore uses the shared country registry.
DROP FUNCTION IF EXISTS public.claim_notification_deliveries(TEXT, INTEGER, INTEGER);
CREATE FUNCTION public.claim_notification_deliveries(
  p_worker_id TEXT,
  p_limit INTEGER DEFAULT 50,
  p_lease_seconds INTEGER DEFAULT 60
)
RETURNS TABLE (
  id UUID,
  notification_id UUID,
  user_id UUID,
  channel TEXT,
  idempotency_key TEXT,
  attempt_number SMALLINT,
  title TEXT,
  body TEXT,
  link_url TEXT,
  link_route TEXT,
  market_code TEXT,
  category TEXT,
  type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF char_length(btrim(p_worker_id)) NOT BETWEEN 1 AND 200
     OR p_limit NOT BETWEEN 1 AND 200
     OR p_lease_seconds NOT BETWEEN 10 AND 900 THEN
    RAISE EXCEPTION 'invalid delivery lease request' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY
  WITH candidates AS (
    SELECT d.id
    FROM public.notification_deliveries d
    WHERE (
      d.status IN ('pending', 'retry') AND d.available_at <= NOW()
    ) OR (
      d.status = 'leased' AND d.lease_expires_at <= NOW()
    )
    ORDER BY d.available_at, d.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  ), claimed AS (
    UPDATE public.notification_deliveries d
    SET status = 'leased',
        attempts = d.attempts + 1,
        lease_owner = p_worker_id,
        lease_expires_at = NOW() + make_interval(secs => p_lease_seconds),
        updated_at = NOW()
    FROM candidates c
    WHERE d.id = c.id
    RETURNING d.*
  )
  SELECT
    c.id, c.notification_id, c.user_id, c.channel, c.idempotency_key,
    c.attempts, n.title, n.body, n.link_url, n.link_route,
    n.market_code::TEXT, n.category, n.type
  FROM claimed c
  JOIN public.notifications n ON n.id = c.notification_id;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_notification_deliveries(TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notification_deliveries(TEXT, INTEGER, INTEGER)
  TO service_role;

-- Short-lived, one-use authorization-code exchange between shongre.fr and
-- shongre.com. Cookies remain host-only; no credential is shared cross-domain.
CREATE TABLE IF NOT EXISTS public.auth_domain_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash TEXT NOT NULL UNIQUE CHECK (char_length(code_hash) = 64),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_session_id UUID NOT NULL REFERENCES public.auth_sessions(id) ON DELETE CASCADE,
  source_country VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  target_country VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  return_to TEXT NOT NULL DEFAULT '/',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  CONSTRAINT auth_domain_handoff_distinct_markets CHECK (source_country <> target_country),
  CONSTRAINT auth_domain_handoff_expiry_check CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS auth_domain_handoffs_expiry_idx
  ON public.auth_domain_handoffs (expires_at) WHERE consumed_at IS NULL;
ALTER TABLE public.auth_domain_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_domain_handoffs FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.auth_domain_handoffs FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_auth_domain_handoff(p_code_hash TEXT)
RETURNS SETOF public.auth_domain_handoffs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.auth_domain_handoffs
     SET consumed_at = NOW()
   WHERE code_hash = p_code_hash
     AND consumed_at IS NULL
     AND expires_at > NOW()
  RETURNING *;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_auth_domain_handoff(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_auth_domain_handoff(TEXT) TO service_role;

-- Admin evidence and market-resolution metrics contain no visitor PII.
CREATE TABLE IF NOT EXISTS public.market_configuration_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_fields TEXT[] NOT NULL DEFAULT '{}',
  previous_version INTEGER,
  new_version INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.market_resolution_metrics (
  bucket_start TIMESTAMPTZ NOT NULL,
  metric VARCHAR(40) NOT NULL CHECK (metric IN ('unknown_country','redirect','redirect_loop','invalid_host','resolution_error','canonical_mismatch')),
  market_code VARCHAR(8) NOT NULL DEFAULT 'GLOBAL',
  hostname VARCHAR(255) NOT NULL DEFAULT 'unknown',
  count BIGINT NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (bucket_start, metric, market_code, hostname)
);
ALTER TABLE public.market_configuration_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_configuration_audit FORCE ROW LEVEL SECURITY;
ALTER TABLE public.market_resolution_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_resolution_metrics FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.market_configuration_audit FROM anon, authenticated;
REVOKE ALL ON public.market_resolution_metrics FROM anon, authenticated;
