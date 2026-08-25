-- Audited feature-flag control plane. Product code evaluates definitions and
-- scoped rules through the backend; browser roles cannot inspect or mutate the
-- underlying rollout configuration.

CREATE TABLE IF NOT EXISTS public.feature_flags (
  key TEXT PRIMARY KEY CHECK (key ~ '^[a-z][a-z0-9_.-]{2,99}$'),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 10 AND 500),
  owner TEXT NOT NULL CHECK (char_length(owner) BETWEEN 2 AND 120),
  default_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  exposure TEXT NOT NULL CHECK (exposure IN ('public','server')),
  lifecycle TEXT NOT NULL DEFAULT 'active' CHECK (lifecycle IN ('active','archived')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS public.feature_flag_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key TEXT NOT NULL REFERENCES public.feature_flags(key) ON DELETE CASCADE,
  market_code TEXT CHECK (market_code IS NULL OR market_code ~ '^[A-Z]{2}$'),
  account_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL,
  rollout_percentage SMALLINT NOT NULL DEFAULT 100
    CHECK (rollout_percentage BETWEEN 0 AND 100),
  priority INTEGER NOT NULL DEFAULT 100 CHECK (priority BETWEEN 0 AND 10000),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 10 AND 2000),
  created_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at < ends_at)
);
CREATE INDEX IF NOT EXISTS feature_flag_rules_evaluation_idx
  ON public.feature_flag_rules (flag_key, priority DESC, market_code, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS feature_flag_rules_account_idx
  ON public.feature_flag_rules (account_id, flag_key) WHERE account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS feature_flag_rules_organization_idx
  ON public.feature_flag_rules (organization_id, flag_key)
  WHERE organization_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.feature_flag_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key TEXT NOT NULL REFERENCES public.feature_flags(key) ON DELETE RESTRICT,
  rule_id UUID REFERENCES public.feature_flag_rules(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL CHECK (event_type IN ('definition_upserted','rule_upserted')),
  reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 10 AND 2000),
  previous_value JSONB,
  new_value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS feature_flag_events_flag_idx
  ON public.feature_flag_events (flag_key, created_at DESC);

CREATE OR REPLACE FUNCTION public.upsert_feature_flag(
  p_key TEXT,
  p_description TEXT,
  p_owner TEXT,
  p_default_enabled BOOLEAN,
  p_exposure TEXT,
  p_lifecycle TEXT,
  p_expires_at TIMESTAMPTZ,
  p_actor_id UUID,
  p_reason TEXT
)
RETURNS SETOF public.feature_flags
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  previous_row public.feature_flags%ROWTYPE;
  updated_row public.feature_flags%ROWTYPE;
BEGIN
  IF char_length(trim(p_reason)) < 10 THEN
    RAISE EXCEPTION 'A feature flag change reason is required' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO previous_row FROM public.feature_flags WHERE key = p_key FOR UPDATE;

  INSERT INTO public.feature_flags
    (key, description, owner, default_enabled, exposure, lifecycle, expires_at, updated_by)
  VALUES
    (p_key, trim(p_description), trim(p_owner), p_default_enabled, p_exposure,
     p_lifecycle, p_expires_at, p_actor_id)
  ON CONFLICT (key) DO UPDATE SET
    description = EXCLUDED.description,
    owner = EXCLUDED.owner,
    default_enabled = EXCLUDED.default_enabled,
    exposure = EXCLUDED.exposure,
    lifecycle = EXCLUDED.lifecycle,
    expires_at = EXCLUDED.expires_at,
    updated_by = EXCLUDED.updated_by,
    updated_at = NOW()
  RETURNING * INTO updated_row;

  INSERT INTO public.feature_flag_events
    (flag_key, actor_id, event_type, reason, previous_value, new_value)
  VALUES
    (p_key, p_actor_id, 'definition_upserted', trim(p_reason),
     CASE WHEN previous_row.key IS NULL THEN NULL ELSE to_jsonb(previous_row) END,
     to_jsonb(updated_row));
  RETURN NEXT updated_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_feature_flag_rule(
  p_id UUID,
  p_flag_key TEXT,
  p_market_code TEXT,
  p_account_id UUID,
  p_organization_id UUID,
  p_enabled BOOLEAN,
  p_rollout_percentage SMALLINT,
  p_priority INTEGER,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ,
  p_actor_id UUID,
  p_reason TEXT
)
RETURNS SETOF public.feature_flag_rules
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  resolved_id UUID := COALESCE(p_id, gen_random_uuid());
  previous_row public.feature_flag_rules%ROWTYPE;
  updated_row public.feature_flag_rules%ROWTYPE;
BEGIN
  IF char_length(trim(p_reason)) < 10 THEN
    RAISE EXCEPTION 'A feature flag rule reason is required' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO previous_row FROM public.feature_flag_rules WHERE id = resolved_id FOR UPDATE;

  INSERT INTO public.feature_flag_rules
    (id, flag_key, market_code, account_id, organization_id, enabled,
     rollout_percentage, priority, starts_at, ends_at, reason, created_by, updated_by)
  VALUES
    (resolved_id, p_flag_key, upper(p_market_code), p_account_id, p_organization_id,
     p_enabled, p_rollout_percentage, p_priority, p_starts_at, p_ends_at,
     trim(p_reason), p_actor_id, p_actor_id)
  ON CONFLICT (id) DO UPDATE SET
    market_code = EXCLUDED.market_code,
    account_id = EXCLUDED.account_id,
    organization_id = EXCLUDED.organization_id,
    enabled = EXCLUDED.enabled,
    rollout_percentage = EXCLUDED.rollout_percentage,
    priority = EXCLUDED.priority,
    starts_at = EXCLUDED.starts_at,
    ends_at = EXCLUDED.ends_at,
    reason = EXCLUDED.reason,
    updated_by = EXCLUDED.updated_by,
    updated_at = NOW()
  WHERE public.feature_flag_rules.flag_key = EXCLUDED.flag_key
  RETURNING * INTO updated_row;

  IF updated_row.id IS NULL THEN
    RAISE EXCEPTION 'Feature flag rule not found for this flag' USING ERRCODE = 'P0002';
  END IF;
  INSERT INTO public.feature_flag_events
    (flag_key, rule_id, actor_id, event_type, reason, previous_value, new_value)
  VALUES
    (p_flag_key, resolved_id, p_actor_id, 'rule_upserted', trim(p_reason),
     CASE WHEN previous_row.id IS NULL THEN NULL ELSE to_jsonb(previous_row) END,
     to_jsonb(updated_row));
  RETURN NEXT updated_row;
END;
$$;

INSERT INTO public.feature_flags
  (key, description, owner, default_enabled, exposure, lifecycle)
VALUES
  ('support.workspace', 'Expose the canonical support workspace to authorized staff.',
   'Customer Operations', TRUE, 'public', 'active'),
  ('search.ranking_v2', 'Enables the second-generation marketplace ranking pipeline.',
   'Discovery', FALSE, 'server', 'active'),
  ('publication.draft_recovery_v2', 'Enables resilient publication draft recovery in the web client.',
   'Marketplace Experience', TRUE, 'public', 'active')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flag_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flag_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.feature_flags FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.feature_flag_rules FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.feature_flag_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.feature_flags TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_flag_rules TO service_role;
GRANT SELECT, INSERT ON public.feature_flag_events TO service_role;
REVOKE ALL ON FUNCTION public.upsert_feature_flag(
  TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, TIMESTAMPTZ, UUID, TEXT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.upsert_feature_flag_rule(
  UUID, TEXT, TEXT, UUID, UUID, BOOLEAN, SMALLINT, INTEGER,
  TIMESTAMPTZ, TIMESTAMPTZ, UUID, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_feature_flag(
  TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, TIMESTAMPTZ, UUID, TEXT
) TO service_role;
GRANT EXECUTE ON FUNCTION public.upsert_feature_flag_rule(
  UUID, TEXT, TEXT, UUID, UUID, BOOLEAN, SMALLINT, INTEGER,
  TIMESTAMPTZ, TIMESTAMPTZ, UUID, TEXT
) TO service_role;
