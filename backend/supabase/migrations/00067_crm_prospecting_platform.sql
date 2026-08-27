-- Shongre Prospects extends CRM Core. It does not create another identity,
-- organization, campaign, suppression, provider, entitlement, or audit system.
-- Country scope:
--   source catalogue: PLATFORM_GLOBAL with explicit market availability;
--   profiles/lists: MULTI_MARKET_SHARED through relational associations;
--   discovery, evidence, scores, usage and attribution: MARKET_SCOPED.

CREATE TABLE IF NOT EXISTS public.crm_prospecting_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  workspace_id UUID NOT NULL REFERENCES public.crm_workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 2000),
  operating_context TEXT NOT NULL CHECK (operating_context IN ('INTERNAL_SHONGRE','SUBSCRIBER','AGGREGATED_OPPORTUNITY')),
  locale TEXT NOT NULL CHECK (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  currency CHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  timezone TEXT NOT NULL CHECK (char_length(timezone) BETWEEN 1 AND 80),
  geographic_areas TEXT[] NOT NULL DEFAULT '{}',
  radius_km INTEGER CHECK (radius_km BETWEEN 1 AND 1000),
  industries TEXT[] NOT NULL DEFAULT '{}',
  taxonomy_slugs TEXT[] NOT NULL DEFAULT '{}',
  company_types TEXT[] NOT NULL DEFAULT '{}',
  estimated_size_min INTEGER CHECK (estimated_size_min >= 0),
  estimated_size_max INTEGER CHECK (estimated_size_max > 0),
  business_maturity TEXT[] NOT NULL DEFAULT '{}',
  online_presence TEXT[] NOT NULL DEFAULT '{}',
  target_roles TEXT[] NOT NULL DEFAULT '{}',
  fit_rules JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(fit_rules) = 'array'),
  exclusion_rules JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(exclusion_rules) = 'array'),
  required_signals TEXT[] NOT NULL DEFAULT '{}',
  optional_signals TEXT[] NOT NULL DEFAULT '{}',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  CHECK (estimated_size_min IS NULL OR estimated_size_max IS NULL OR estimated_size_min <= estimated_size_max)
);
CREATE UNIQUE INDEX IF NOT EXISTS crm_prospecting_profiles_one_default_idx
  ON public.crm_prospecting_profiles (workspace_id)
  WHERE is_default AND archived_at IS NULL;
CREATE INDEX IF NOT EXISTS crm_prospecting_profiles_tenant_updated_idx
  ON public.crm_prospecting_profiles (tenant_id, updated_at DESC)
  WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.crm_prospecting_profile_markets (
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  profile_id UUID NOT NULL REFERENCES public.crm_prospecting_profiles(id) ON DELETE CASCADE,
  market_code CHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, market_code)
);
CREATE INDEX IF NOT EXISTS crm_prospecting_profile_markets_scope_idx
  ON public.crm_prospecting_profile_markets (tenant_id, market_code, profile_id);

CREATE TABLE IF NOT EXISTS public.crm_prospect_source_catalog (
  id TEXT PRIMARY KEY CHECK (id ~ '^[a-z0-9][a-z0-9_.-]+$'),
  provider_id TEXT NOT NULL CHECK (provider_id ~ '^[a-z0-9][a-z0-9_.-]+$'),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  category TEXT NOT NULL CHECK (category IN ('USER_PROVIDED','FIRST_PARTY_AUTHORIZED','OFFICIAL_REGISTRY','OPEN_DATA','PUBLIC_PROFESSIONAL_WEB','LICENSED_PROVIDER','PARTNER','INBOUND_ATTRIBUTION','AGGREGATED_MARKET_SIGNAL')),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 1000),
  operations TEXT[] NOT NULL CHECK (cardinality(operations) > 0),
  permitted_contexts TEXT[] NOT NULL CHECK (cardinality(permitted_contexts) > 0),
  permitted_uses TEXT[] NOT NULL CHECK (cardinality(permitted_uses) > 0),
  prohibited_uses TEXT[] NOT NULL DEFAULT '{}',
  may_store_professional_contacts BOOLEAN NOT NULL DEFAULT FALSE,
  requires_attribution BOOLEAN NOT NULL DEFAULT FALSE,
  attribution_text TEXT,
  terms_reference TEXT,
  license_reference TEXT,
  retention_days INTEGER CHECK (retention_days > 0),
  refresh_after_days INTEGER CHECK (refresh_after_days > 0),
  deletion_mode TEXT NOT NULL CHECK (deletion_mode IN ('DELETE','ANONYMIZE','PROVIDER_MANAGED')),
  rate_limit_per_minute INTEGER CHECK (rate_limit_per_minute > 0),
  requires_legal_approval BOOLEAN NOT NULL DEFAULT TRUE,
  requires_commercial_approval BOOLEAN NOT NULL DEFAULT TRUE,
  lifecycle TEXT NOT NULL CHECK (lifecycle IN ('ACTIVE','DEGRADED','INACTIVE_REVIEW_REQUIRED','DISCONNECTED')),
  health_message TEXT NOT NULL CHECK (char_length(health_message) BETWEEN 1 AND 500),
  data_freshness_label TEXT NOT NULL CHECK (char_length(data_freshness_label) BETWEEN 1 AND 120),
  last_health_check_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_prospect_source_markets (
  source_id TEXT NOT NULL REFERENCES public.crm_prospect_source_catalog(id) ON DELETE CASCADE,
  market_code CHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  availability TEXT NOT NULL CHECK (availability IN ('ACTIVE','INACTIVE_REVIEW_REQUIRED','UNSUPPORTED')),
  legal_review_status TEXT NOT NULL CHECK (legal_review_status IN ('APPROVED','PENDING','REJECTED','NOT_REQUIRED')),
  commercial_review_status TEXT NOT NULL CHECK (commercial_review_status IN ('APPROVED','PENDING','REJECTED','NOT_REQUIRED')),
  reviewed_at TIMESTAMPTZ,
  review_reference TEXT,
  PRIMARY KEY (source_id, market_code)
);
CREATE INDEX IF NOT EXISTS crm_prospect_source_markets_availability_idx
  ON public.crm_prospect_source_markets (market_code, availability, source_id);

CREATE TABLE IF NOT EXISTS public.crm_prospect_source_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  workspace_id UUID NOT NULL REFERENCES public.crm_workspaces(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES public.crm_prospect_source_catalog(id) ON DELETE RESTRICT,
  provider_connection_id UUID REFERENCES public.provider_connections(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('DRAFT','ACTIVE','PAUSED','DISCONNECTED','REVOKED')),
  operating_context TEXT NOT NULL CHECK (operating_context IN ('INTERNAL_SHONGRE','SUBSCRIBER','AGGREGATED_OPPORTUNITY')),
  professional_purpose TEXT NOT NULL CHECK (char_length(professional_purpose) BETWEEN 8 AND 1000),
  lawful_basis TEXT NOT NULL CHECK (char_length(lawful_basis) BETWEEN 2 AND 160),
  retention_days INTEGER NOT NULL CHECK (retention_days > 0),
  configuration JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(configuration) = 'object'),
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, source_id, operating_context)
);
CREATE INDEX IF NOT EXISTS crm_prospect_source_connections_tenant_status_idx
  ON public.crm_prospect_source_connections (tenant_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.crm_prospect_discovery_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  workspace_id UUID NOT NULL REFERENCES public.crm_workspaces(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.crm_prospecting_profiles(id) ON DELETE SET NULL,
  requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  market_code CHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  locale TEXT NOT NULL CHECK (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  currency CHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  timezone TEXT NOT NULL,
  operating_context TEXT NOT NULL CHECK (operating_context IN ('INTERNAL_SHONGRE','SUBSCRIBER','AGGREGATED_OPPORTUNITY')),
  filters JSONB NOT NULL CHECK (jsonb_typeof(filters) = 'object'),
  source_ids TEXT[] NOT NULL CHECK (cardinality(source_ids) > 0),
  status TEXT NOT NULL CHECK (status IN ('QUEUED','RUNNING','COMPLETED','PARTIAL','FAILED','CANCELLED')),
  result_count INTEGER NOT NULL DEFAULT 0 CHECK (result_count >= 0),
  failure_code TEXT,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE (tenant_id, market_code, idempotency_key)
);
CREATE INDEX IF NOT EXISTS crm_prospect_discovery_runs_queue_idx
  ON public.crm_prospect_discovery_runs (status, created_at)
  WHERE status IN ('QUEUED','RUNNING');
CREATE INDEX IF NOT EXISTS crm_prospect_discovery_runs_tenant_market_idx
  ON public.crm_prospect_discovery_runs (tenant_id, market_code, created_at DESC);

CREATE TABLE IF NOT EXISTS public.crm_prospect_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  workspace_id UUID NOT NULL REFERENCES public.crm_workspaces(id) ON DELETE CASCADE,
  discovery_run_id UUID NOT NULL REFERENCES public.crm_prospect_discovery_runs(id) ON DELETE CASCADE,
  crm_account_id UUID REFERENCES public.crm_accounts(id) ON DELETE SET NULL,
  canonical_name TEXT NOT NULL CHECK (char_length(canonical_name) BETWEEN 1 AND 255),
  legal_name TEXT,
  trading_name TEXT,
  official_identifier_scheme TEXT,
  official_identifier_value TEXT,
  normalized_domain TEXT,
  website TEXT,
  description TEXT,
  industry TEXT,
  company_type TEXT,
  estimated_size TEXT,
  market_code CHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  country_code CHAR(2) NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
  region TEXT,
  city TEXT,
  postal_code TEXT,
  review_state TEXT NOT NULL DEFAULT 'UNREVIEWED' CHECK (review_state IN ('UNREVIEWED','APPROVED','DISMISSED','DUPLICATE_REVIEW','SUPPRESSED')),
  duplicate_crm_account_id UUID REFERENCES public.crm_accounts(id) ON DELETE SET NULL,
  source_fingerprint CHAR(64) NOT NULL CHECK (source_fingerprint ~ '^[0-9a-f]{64}$'),
  discovered_at TIMESTAMPTZ NOT NULL,
  refreshed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, market_code, source_fingerprint),
  CHECK ((official_identifier_scheme IS NULL) = (official_identifier_value IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS crm_prospect_candidates_official_id_idx
  ON public.crm_prospect_candidates (tenant_id, market_code, official_identifier_scheme, official_identifier_value)
  WHERE official_identifier_value IS NOT NULL;
CREATE INDEX IF NOT EXISTS crm_prospect_candidates_tenant_review_idx
  ON public.crm_prospect_candidates (tenant_id, market_code, review_state, discovered_at DESC);
CREATE INDEX IF NOT EXISTS crm_prospect_candidates_domain_idx
  ON public.crm_prospect_candidates (tenant_id, market_code, normalized_domain)
  WHERE normalized_domain IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.crm_prospect_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  candidate_id UUID NOT NULL REFERENCES public.crm_prospect_candidates(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES public.crm_prospect_source_catalog(id) ON DELETE RESTRICT,
  market_code CHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  source_record_id TEXT NOT NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 255),
  source_url TEXT,
  excerpt TEXT CHECK (excerpt IS NULL OR char_length(excerpt) <= 1000),
  observed_at TIMESTAMPTZ NOT NULL,
  freshness TEXT NOT NULL CHECK (freshness IN ('CURRENT','AGING','STALE','UNKNOWN')),
  confidence NUMERIC(5,4) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  attribution_required BOOLEAN NOT NULL DEFAULT FALSE,
  content_hash CHAR(64) NOT NULL CHECK (content_hash ~ '^[0-9a-f]{64}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, source_id, source_record_id, content_hash)
);
CREATE INDEX IF NOT EXISTS crm_prospect_evidence_candidate_idx
  ON public.crm_prospect_evidence (tenant_id, candidate_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS public.crm_field_provenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('account','contact')),
  entity_id UUID NOT NULL,
  field_path TEXT NOT NULL CHECK (char_length(field_path) BETWEEN 1 AND 255),
  evidence_id UUID REFERENCES public.crm_prospect_evidence(id) ON DELETE SET NULL,
  source_id TEXT NOT NULL REFERENCES public.crm_prospect_source_catalog(id) ON DELETE RESTRICT,
  value_hash CHAR(64) NOT NULL CHECK (value_hash ~ '^[0-9a-f]{64}$'),
  verification_state TEXT NOT NULL CHECK (verification_state IN ('VERIFIED','OBSERVED','INFERRED','CONFLICTING','STALE')),
  observed_at TIMESTAMPTZ NOT NULL,
  superseded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, entity_type, entity_id, field_path, source_id, value_hash)
);
CREATE INDEX IF NOT EXISTS crm_field_provenance_entity_idx
  ON public.crm_field_provenance (tenant_id, entity_type, entity_id, field_path, observed_at DESC);

CREATE TABLE IF NOT EXISTS public.crm_prospect_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  candidate_id UUID NOT NULL REFERENCES public.crm_prospect_candidates(id) ON DELETE CASCADE,
  market_code CHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  total_score SMALLINT NOT NULL CHECK (total_score BETWEEN 0 AND 100),
  fit_score SMALLINT NOT NULL CHECK (fit_score BETWEEN 0 AND 100),
  opportunity_score SMALLINT NOT NULL CHECK (opportunity_score BETWEEN 0 AND 100),
  data_confidence SMALLINT NOT NULL CHECK (data_confidence BETWEEN 0 AND 100),
  positive_factors JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(positive_factors) = 'array'),
  negative_factors JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(negative_factors) = 'array'),
  missing_information TEXT[] NOT NULL DEFAULT '{}',
  evidence_ids UUID[] NOT NULL DEFAULT '{}',
  rule_version TEXT NOT NULL,
  model TEXT,
  prompt_version TEXT,
  confidence NUMERIC(5,4) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  recommended_next_action TEXT NOT NULL,
  evaluated_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crm_prospect_scores_tenant_ranking_idx
  ON public.crm_prospect_scores (tenant_id, market_code, total_score DESC, evaluated_at DESC);
CREATE INDEX IF NOT EXISTS crm_prospect_scores_candidate_idx
  ON public.crm_prospect_scores (candidate_id, evaluated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS crm_prospect_scores_idempotency_idx
  ON public.crm_prospect_scores (tenant_id, candidate_id, rule_version, evaluated_at);

-- AI output is versioned evidence-bound metadata, never an authority for
-- permissions, legal basis, entitlements, billing, suppression, or sending.
CREATE TABLE IF NOT EXISTS public.crm_prospect_ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  candidate_id UUID NOT NULL REFERENCES public.crm_prospect_candidates(id) ON DELETE CASCADE,
  market_code CHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  task TEXT NOT NULL CHECK (task IN ('OPPORTUNITY_BRIEF','SCORING_EXPLANATION','OUTREACH_DRAFT')),
  provider_connection_id UUID REFERENCES public.provider_connections(id) ON DELETE SET NULL,
  provider_id TEXT,
  model TEXT NOT NULL CHECK (char_length(model) BETWEEN 1 AND 160),
  prompt_version TEXT NOT NULL CHECK (char_length(prompt_version) BETWEEN 1 AND 80),
  rule_version TEXT NOT NULL CHECK (char_length(rule_version) BETWEEN 1 AND 80),
  summary TEXT NOT NULL CHECK (char_length(summary) BETWEEN 1 AND 2000),
  confidence NUMERIC(5,4) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  evidence_ids UUID[] NOT NULL CHECK (cardinality(evidence_ids) > 0),
  missing_information TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL CHECK (status IN ('SUCCEEDED','RULE_FALLBACK')),
  correlation_id UUID NOT NULL,
  input_units INTEGER CHECK (input_units IS NULL OR input_units >= 0),
  output_units INTEGER CHECK (output_units IS NULL OR output_units >= 0),
  generated_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, correlation_id)
);
CREATE INDEX IF NOT EXISTS crm_prospect_ai_insights_candidate_idx
  ON public.crm_prospect_ai_insights (tenant_id, candidate_id, generated_at DESC);

CREATE TABLE IF NOT EXISTS public.crm_prospect_import_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  data_job_id UUID NOT NULL REFERENCES public.crm_data_jobs(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL CHECK (row_number > 0),
  source_id TEXT NOT NULL REFERENCES public.crm_prospect_source_catalog(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('PENDING','VALID','DUPLICATE','IMPORTED','REJECTED','FAILED')),
  normalized_record JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(normalized_record) = 'object'),
  validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(validation_errors) = 'array'),
  candidate_id UUID REFERENCES public.crm_prospect_candidates(id) ON DELETE SET NULL,
  crm_account_id UUID REFERENCES public.crm_accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (data_job_id, row_number)
);
CREATE INDEX IF NOT EXISTS crm_prospect_import_rows_job_status_idx
  ON public.crm_prospect_import_rows (tenant_id, data_job_id, status, row_number);

-- A reviewed single-candidate import is a command, not another company copy.
-- The command record makes retries idempotent while keeping evidence immutable.
CREATE TABLE IF NOT EXISTS public.crm_prospect_import_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  candidate_id UUID NOT NULL REFERENCES public.crm_prospect_candidates(id) ON DELETE RESTRICT,
  crm_account_id UUID NOT NULL REFERENCES public.crm_accounts(id) ON DELETE RESTRICT,
  idempotency_key UUID NOT NULL,
  review_decision TEXT NOT NULL CHECK (review_decision = 'APPROVED'),
  evidence_ids UUID[] NOT NULL CHECK (cardinality(evidence_ids) > 0),
  imported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, idempotency_key),
  UNIQUE (tenant_id, candidate_id)
);
CREATE INDEX IF NOT EXISTS crm_prospect_import_commands_account_idx
  ON public.crm_prospect_import_commands (tenant_id, crm_account_id, imported_at DESC);

CREATE TABLE IF NOT EXISTS public.crm_prospect_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  workspace_id UUID NOT NULL REFERENCES public.crm_workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 2000),
  kind TEXT NOT NULL CHECK (kind IN ('MANUAL','DYNAMIC','SUPPRESSION')),
  visibility TEXT NOT NULL CHECK (visibility IN ('PRIVATE','TEAM','WORKSPACE')),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  team_id UUID REFERENCES public.crm_teams(id) ON DELETE SET NULL,
  filter_definition JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(filter_definition) = 'object'),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  UNIQUE (tenant_id, workspace_id, name)
);
CREATE INDEX IF NOT EXISTS crm_prospect_lists_tenant_kind_idx
  ON public.crm_prospect_lists (tenant_id, kind, updated_at DESC)
  WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS public.crm_prospect_list_members (
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  list_id UUID NOT NULL REFERENCES public.crm_prospect_lists(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.crm_accounts(id) ON DELETE CASCADE,
  added_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (list_id, account_id)
);
CREATE INDEX IF NOT EXISTS crm_prospect_list_members_account_idx
  ON public.crm_prospect_list_members (tenant_id, account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.crm_prospect_conversion_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  account_id UUID NOT NULL REFERENCES public.crm_accounts(id) ON DELETE CASCADE,
  market_code CHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  campaign_id UUID REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
  token_hash CHAR(64) NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  canonical_route TEXT NOT NULL CHECK (canonical_route LIKE '/%'),
  promotion_code TEXT,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE','CLAIMED','EXPIRED','REVOKED')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_at TIMESTAMPTZ,
  CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS crm_prospect_conversion_links_tenant_account_idx
  ON public.crm_prospect_conversion_links (tenant_id, market_code, account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.crm_prospect_attribution_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  conversion_link_id UUID REFERENCES public.crm_prospect_conversion_links(id) ON DELETE SET NULL,
  account_id UUID NOT NULL REFERENCES public.crm_accounts(id) ON DELETE RESTRICT,
  market_code CHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  event_type TEXT NOT NULL CHECK (event_type IN ('LINK_OPENED','ONBOARDING_STARTED','ORGANIZATION_LINKED','STORE_CREATED','ORGANIZATION_VERIFIED','LISTING_PUBLISHED','TRIAL_STARTED','SUBSCRIPTION_ACTIVATED')),
  external_event_id TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  safe_metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(safe_metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, market_code, external_event_id)
);
CREATE INDEX IF NOT EXISTS crm_prospect_attribution_events_account_idx
  ON public.crm_prospect_attribution_events (tenant_id, market_code, account_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.crm_prospect_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  account_id UUID NOT NULL REFERENCES public.crm_accounts(id) ON DELETE RESTRICT,
  market_code CHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  target_organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT,
  target_profile_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  conversion_type TEXT NOT NULL CHECK (conversion_type IN ('SHONGRE_PRO','SHONGRE_PARTNER','STANDALONE_CUSTOMER')),
  milestone TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ATTRIBUTED','VERIFIED','REJECTED')),
  attributed_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, account_id, conversion_type, target_organization_id),
  CHECK (target_organization_id IS NOT NULL OR target_profile_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.crm_prospect_usage_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  account_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  market_code CHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  usage_type TEXT NOT NULL CHECK (usage_type IN ('DISCOVERY','ENRICHMENT','AI_INPUT','AI_OUTPUT','OUTREACH','EXPORT','API_REQUEST')),
  units BIGINT NOT NULL CHECK (units > 0),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  idempotency_key TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  safe_metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(safe_metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, market_code, usage_type, idempotency_key),
  CHECK (period_end > period_start)
);
CREATE INDEX IF NOT EXISTS crm_prospect_usage_ledger_period_idx
  ON public.crm_prospect_usage_ledger (tenant_id, account_id, market_code, usage_type, period_start, created_at);

CREATE OR REPLACE FUNCTION public.touch_crm_prospect_record()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.version := OLD.version + 1;
  RETURN NEW;
END;
$$;

CREATE TRIGGER crm_prospecting_profiles_touch
BEFORE UPDATE ON public.crm_prospecting_profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_crm_prospect_record();
CREATE TRIGGER crm_prospect_source_connections_touch
BEFORE UPDATE ON public.crm_prospect_source_connections
FOR EACH ROW EXECUTE FUNCTION public.touch_crm_prospect_record();
CREATE TRIGGER crm_prospect_lists_touch
BEFORE UPDATE ON public.crm_prospect_lists
FOR EACH ROW EXECUTE FUNCTION public.touch_crm_prospect_record();

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'crm_prospecting_profiles','crm_prospecting_profile_markets','crm_prospect_source_connections',
    'crm_prospect_discovery_runs','crm_prospect_candidates','crm_prospect_evidence',
    'crm_field_provenance','crm_prospect_scores','crm_prospect_ai_insights','crm_prospect_import_rows','crm_prospect_import_commands',
    'crm_prospect_lists','crm_prospect_list_members','crm_prospect_conversion_links',
    'crm_prospect_attribution_events','crm_prospect_conversions','crm_prospect_usage_ledger'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY %I_tenant_isolation ON public.%I FOR ALL TO authenticated USING ((SELECT public.is_crm_tenant_member(tenant_id))) WITH CHECK ((SELECT public.is_crm_tenant_member(tenant_id)))',
      table_name,
      table_name
    );
  END LOOP;
END $$;

ALTER TABLE public.crm_prospect_source_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_prospect_source_catalog FORCE ROW LEVEL SECURITY;
ALTER TABLE public.crm_prospect_source_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_prospect_source_markets FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.crm_prospect_source_catalog, public.crm_prospect_source_markets FROM anon, authenticated;
REVOKE UPDATE, DELETE ON public.crm_prospect_evidence, public.crm_field_provenance,
  public.crm_prospect_scores, public.crm_prospect_ai_insights, public.crm_prospect_attribution_events,
  public.crm_prospect_usage_ledger FROM anon, authenticated;

CREATE TRIGGER crm_prospect_evidence_immutable
BEFORE UPDATE OR DELETE ON public.crm_prospect_evidence
FOR EACH ROW EXECUTE FUNCTION public.prevent_crm_history_mutation();
CREATE TRIGGER crm_field_provenance_immutable
BEFORE UPDATE OR DELETE ON public.crm_field_provenance
FOR EACH ROW EXECUTE FUNCTION public.prevent_crm_history_mutation();
CREATE TRIGGER crm_prospect_scores_immutable
BEFORE UPDATE OR DELETE ON public.crm_prospect_scores
FOR EACH ROW EXECUTE FUNCTION public.prevent_crm_history_mutation();
CREATE TRIGGER crm_prospect_ai_insights_immutable
BEFORE UPDATE OR DELETE ON public.crm_prospect_ai_insights
FOR EACH ROW EXECUTE FUNCTION public.prevent_crm_history_mutation();
CREATE TRIGGER crm_prospect_attribution_events_immutable
BEFORE UPDATE OR DELETE ON public.crm_prospect_attribution_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_crm_history_mutation();
CREATE TRIGGER crm_prospect_usage_ledger_immutable
BEFORE UPDATE OR DELETE ON public.crm_prospect_usage_ledger
FOR EACH ROW EXECUTE FUNCTION public.prevent_crm_history_mutation();

INSERT INTO public.crm_prospect_source_catalog (
  id, provider_id, name, category, description, operations, permitted_contexts,
  permitted_uses, prohibited_uses, may_store_professional_contacts,
  requires_attribution, retention_days, refresh_after_days, deletion_mode,
  requires_legal_approval, requires_commercial_approval, lifecycle,
  health_message, data_freshness_label
) VALUES
  (
    'manual_entry', 'shongre_internal', 'Saisie manuelle', 'USER_PROVIDED',
    'Informations professionnelles saisies et vérifiées par le tenant.',
    ARRAY['IMPORT','REFRESH','DELETE'], ARRAY['INTERNAL_SHONGRE','SUBSCRIBER'],
    ARRAY['Gestion de prospects professionnels fournis par le tenant'],
    ARRAY['Import de données sans provenance'], TRUE, FALSE, 1095, 180, 'DELETE',
    FALSE, FALSE, 'ACTIVE', 'Source interne sans appel externe.', 'Selon la dernière validation utilisateur'
  ),
  (
    'csv_import', 'shongre_internal', 'Import CSV ou tableur', 'USER_PROVIDED',
    'Fichiers appartenant au tenant, analysés sans exécuter de formule.',
    ARRAY['IMPORT','REFRESH','DELETE'], ARRAY['INTERNAL_SHONGRE','SUBSCRIBER'],
    ARRAY['Import de données professionnelles avec provenance déclarée'],
    ARRAY['Listes achetées sans preuve contractuelle','Formules de tableur exécutables'], TRUE, FALSE, 1095, 180, 'DELETE',
    FALSE, FALSE, 'ACTIVE', 'Import local disponible; les connecteurs cloud restent séparés.', 'Selon la date d’import'
  ),
  (
    'official_registry_contract', 'official_registry', 'Registre officiel par marché', 'OFFICIAL_REGISTRY',
    'Contrat d’adaptateur réservé aux API et jeux de données officiels approuvés par marché.',
    ARRAY['SEARCH','ENRICHMENT','REFRESH','DELETE'], ARRAY['INTERNAL_SHONGRE','SUBSCRIBER'],
    ARRAY['Recherche et enrichissement d’entreprises selon la licence du marché'],
    ARRAY['Activation sans validation juridique et commerciale','Données personnelles hors périmètre professionnel'], FALSE, TRUE, 365, 30, 'DELETE',
    TRUE, TRUE, 'INACTIVE_REVIEW_REQUIRED', 'Aucun fournisseur de registre n’est activé par cette migration.', 'À déclarer par l’adaptateur de marché'
  ),
  (
    'public_company_website_contract', 'public_web', 'Site officiel de l’entreprise', 'PUBLIC_PROFESSIONAL_WEB',
    'Contrat réservé à la consultation autorisée de pages professionnelles publiques.',
    ARRAY['ENRICHMENT','REFRESH','DELETE'], ARRAY['INTERNAL_SHONGRE','SUBSCRIBER'],
    ARRAY['Preuves issues du site officiel quand les conditions et robots le permettent'],
    ARRAY['Contournement de robots, CAPTCHA, authentification ou limite','Collecte de contacts privés'], FALSE, TRUE, 180, 30, 'DELETE',
    TRUE, TRUE, 'INACTIVE_REVIEW_REQUIRED', 'Aucun robot d’exploration Web n’est activé.', 'À confirmer pour chaque page'
  ),
  (
    'shongre_internal_first_party', 'shongre_internal', 'Données Shongre autorisées', 'FIRST_PARTY_AUTHORIZED',
    'Adaptateur interne réservé aux équipes Shongre et à une finalité approuvée.',
    ARRAY['SEARCH','ENRICHMENT','REFRESH','DELETE'], ARRAY['INTERNAL_SHONGRE'],
    ARRAY['Acquisition interne de vendeurs et partenaires professionnels autorisée'],
    ARRAY['Accès subscriber','Export de données privées Shongre','Déanonymisation de signaux agrégés'], FALSE, FALSE, 365, 30, 'ANONYMIZE',
    TRUE, TRUE, 'INACTIVE_REVIEW_REQUIRED', 'Capacité interne désactivée sans permission et validation explicites.', 'Selon la politique interne approuvée'
  ),
  (
    'aggregated_market_opportunity', 'shongre_analytics', 'Opportunités de marché agrégées', 'AGGREGATED_MARKET_SIGNAL',
    'Signaux anonymisés et agrégés sans identité ni comportement individuel.',
    ARRAY['SEARCH','REFRESH','DELETE'], ARRAY['INTERNAL_SHONGRE','AGGREGATED_OPPORTUNITY'],
    ARRAY['Identification de lacunes d’offre par marché et catégorie'],
    ARRAY['Déanonymisation','Révélation de recherches ou coordonnées individuelles'], FALSE, FALSE, 180, 7, 'ANONYMIZE',
    TRUE, TRUE, 'INACTIVE_REVIEW_REQUIRED', 'Projection agrégée non activée tant que les seuils de confidentialité ne sont pas certifiés.', 'Selon la dernière agrégation certifiée'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  operations = EXCLUDED.operations,
  permitted_contexts = EXCLUDED.permitted_contexts,
  permitted_uses = EXCLUDED.permitted_uses,
  prohibited_uses = EXCLUDED.prohibited_uses,
  lifecycle = EXCLUDED.lifecycle,
  health_message = EXCLUDED.health_message,
  updated_at = now();

-- Availability is explicit per market. User-provided sources need no external
-- contract; all others stay fail-closed pending a reviewed market policy.
INSERT INTO public.crm_prospect_source_markets (
  source_id, market_code, availability, legal_review_status,
  commercial_review_status, reviewed_at, review_reference
)
SELECT
  source.id,
  market.code,
  CASE
    WHEN source.id IN ('manual_entry', 'csv_import') THEN 'ACTIVE'
    ELSE 'INACTIVE_REVIEW_REQUIRED'
  END,
  CASE
    WHEN source.id IN ('manual_entry', 'csv_import') THEN 'NOT_REQUIRED'
    ELSE 'PENDING'
  END,
  CASE
    WHEN source.id IN ('manual_entry', 'csv_import') THEN 'NOT_REQUIRED'
    ELSE 'PENDING'
  END,
  CASE
    WHEN source.id IN ('manual_entry', 'csv_import') THEN now()
    ELSE NULL
  END,
  CASE
    WHEN source.id IN ('manual_entry', 'csv_import') THEN 'shongre-prospects-v1'
    ELSE 'approval-required'
  END
FROM public.crm_prospect_source_catalog source
CROSS JOIN public.markets market
ON CONFLICT (source_id, market_code) DO NOTHING;

COMMENT ON TABLE public.crm_prospect_source_catalog IS
  'Global lawful-source metadata only. Credentials remain in Provider Platform and tenant activation remains in crm_prospect_source_connections.';
COMMENT ON TABLE public.crm_prospect_candidates IS
  'Market-scoped discovery candidates. Approved companies are imported through CRM account commands rather than becoming a second account model.';
COMMENT ON TABLE public.crm_prospect_conversion_links IS
  'Stores only hashes of single-use conversion tokens; workers build public URLs from explicit market context.';
