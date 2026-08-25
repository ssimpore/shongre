-- Generic, tenant-scoped Marketing bounded domain. CRM and Shongre integrations
-- link through explicit references; Provider Platform remains authoritative for
-- credentials, health, routing and provider-specific webhook normalization.

CREATE TABLE IF NOT EXISTS public.marketing_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  market_code CHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  default_locale TEXT NOT NULL DEFAULT 'fr-FR',
  timezone TEXT NOT NULL DEFAULT 'Europe/Paris',
  default_provider_connection_id UUID REFERENCES public.provider_connections(id) ON DELETE SET NULL,
  approval_required BOOLEAN NOT NULL DEFAULT FALSE,
  double_opt_in BOOLEAN NOT NULL DEFAULT TRUE,
  frequency_cap_day INTEGER NOT NULL DEFAULT 3 CHECK (frequency_cap_day BETWEEN 1 AND 100),
  frequency_cap_week INTEGER NOT NULL DEFAULT 7 CHECK (frequency_cap_week BETWEEN 1 AND 500),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(settings) = 'object'),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);
CREATE UNIQUE INDEX IF NOT EXISTS marketing_workspaces_one_default_idx
  ON public.marketing_workspaces (tenant_id) WHERE (settings->>'isDefault')::boolean IS TRUE;

-- Canonical purpose/channel consent ledger for marketing and CRM projections.
-- It is append-oriented so consent evidence cannot be silently rewritten.
CREATE TABLE IF NOT EXISTS public.communication_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('MARKETING_PROFILE','CRM_CONTACT','USER')),
  subject_id UUID,
  normalized_email TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('EMAIL','SMS','PHONE','PUSH','MARKETPLACE')),
  purpose TEXT NOT NULL CHECK (purpose IN ('MARKETING','TRANSACTIONAL','CRM_CORRESPONDENCE','SECURITY','SYSTEM')),
  status TEXT NOT NULL CHECK (status IN ('GRANTED','REFUSED','WITHDRAWN','NOT_ASKED')),
  legal_basis TEXT NOT NULL,
  source TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(evidence) = 'object'),
  consent_version TEXT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (subject_id IS NOT NULL OR normalized_email IS NOT NULL),
  CHECK (normalized_email IS NULL OR normalized_email = lower(trim(normalized_email)))
);
CREATE INDEX IF NOT EXISTS communication_consents_subject_idx
  ON public.communication_consents (tenant_id, subject_type, subject_id, channel, purpose, captured_at DESC);
CREATE INDEX IF NOT EXISTS communication_consents_email_idx
  ON public.communication_consents (tenant_id, normalized_email, channel, purpose, captured_at DESC)
  WHERE normalized_email IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.marketing_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  workspace_id UUID NOT NULL REFERENCES public.marketing_workspaces(id) ON DELETE RESTRICT,
  account_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  crm_contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  normalized_email TEXT GENERATED ALWAYS AS (lower(trim(email))) STORED,
  first_name TEXT,
  last_name TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING','SUBSCRIBED','UNSUBSCRIBED','SUPPRESSED','BOUNCED','COMPLAINED','INVALID'
  )),
  locale TEXT NOT NULL DEFAULT 'fr-FR',
  timezone TEXT NOT NULL DEFAULT 'Europe/Paris',
  country CHAR(2) NOT NULL DEFAULT 'FR',
  source TEXT NOT NULL CHECK (source IN (
    'HOMEPAGE','FOOTER','REGISTRATION','ACCOUNT','PRO_WORKSPACE','NEWSLETTER_PAGE',
    'CRM','IMPORT','FORM','API','AUTOMATION'
  )),
  source_detail TEXT,
  topics TEXT[] NOT NULL DEFAULT '{}',
  custom_values JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(custom_values) = 'object'),
  subscribed_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  last_engaged_at TIMESTAMPTZ,
  soft_bounce_count INTEGER NOT NULL DEFAULT 0 CHECK (soft_bounce_count >= 0),
  last_soft_bounce_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, normalized_email),
  UNIQUE (tenant_id, account_user_id),
  UNIQUE (tenant_id, crm_contact_id),
  CHECK (crm_contact_id IS NULL OR source = 'CRM')
);
CREATE INDEX IF NOT EXISTS marketing_profiles_tenant_status_updated_idx
  ON public.marketing_profiles (tenant_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS marketing_profiles_workspace_locale_idx
  ON public.marketing_profiles (workspace_id, locale, status);
CREATE INDEX IF NOT EXISTS marketing_profiles_topics_gin_idx
  ON public.marketing_profiles USING gin (topics);

CREATE TABLE IF NOT EXISTS public.marketing_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  workspace_id UUID NOT NULL REFERENCES public.marketing_workspaces(id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ARCHIVED')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, name)
);
CREATE INDEX IF NOT EXISTS marketing_lists_tenant_status_idx
  ON public.marketing_lists (tenant_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.marketing_list_memberships (
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  list_id UUID NOT NULL REFERENCES public.marketing_lists(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.marketing_profiles(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'MANUAL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (list_id, profile_id)
);
CREATE INDEX IF NOT EXISTS marketing_list_memberships_profile_idx
  ON public.marketing_list_memberships (tenant_id, profile_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.marketing_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  workspace_id UUID NOT NULL REFERENCES public.marketing_workspaces(id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  description TEXT,
  definition JSONB NOT NULL CHECK (jsonb_typeof(definition) = 'object'),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ARCHIVED')),
  estimated_count INTEGER NOT NULL DEFAULT 0 CHECK (estimated_count >= 0),
  last_estimated_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, name)
);
CREATE INDEX IF NOT EXISTS marketing_segments_tenant_status_idx
  ON public.marketing_segments (tenant_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.marketing_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  workspace_id UUID NOT NULL REFERENCES public.marketing_workspaces(id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  category TEXT NOT NULL CHECK (category IN (
    'NEWSLETTER','PROMOTION','ANNOUNCEMENT','PRODUCT_UPDATE','WELCOME','EVENT',
    'RE_ENGAGEMENT','PROFESSIONAL_INSIGHTS','CUSTOM'
  )),
  locale TEXT NOT NULL DEFAULT 'fr-FR',
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ARCHIVED')),
  current_version INTEGER NOT NULL DEFAULT 1 CHECK (current_version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, name)
);

CREATE TABLE IF NOT EXISTS public.marketing_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  template_id UUID NOT NULL REFERENCES public.marketing_templates(id) ON DELETE RESTRICT,
  version INTEGER NOT NULL CHECK (version > 0),
  subject TEXT NOT NULL,
  preview_text TEXT,
  content JSONB NOT NULL CHECK (jsonb_typeof(content) = 'object'),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_id, version)
);
CREATE INDEX IF NOT EXISTS marketing_template_versions_tenant_template_idx
  ON public.marketing_template_versions (tenant_id, template_id, version DESC);

CREATE TABLE IF NOT EXISTS public.marketing_sender_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  workspace_id UUID NOT NULL REFERENCES public.marketing_workspaces(id) ON DELETE RESTRICT,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  reply_to TEXT,
  provider_connection_id UUID NOT NULL REFERENCES public.provider_connections(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','VERIFIED','FAILED','DISABLED')),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, provider_connection_id, email)
);

CREATE TABLE IF NOT EXISTS public.marketing_sending_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  workspace_id UUID NOT NULL REFERENCES public.marketing_workspaces(id) ON DELETE RESTRICT,
  domain TEXT NOT NULL,
  provider_connection_id UUID NOT NULL REFERENCES public.provider_connections(id) ON DELETE RESTRICT,
  ownership_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (ownership_status IN ('PENDING','VERIFIED','FAILED')),
  spf_status TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK (spf_status IN ('UNKNOWN','VALID','INVALID')),
  dkim_status TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK (dkim_status IN ('UNKNOWN','VALID','INVALID')),
  dmarc_status TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK (dmarc_status IN ('UNKNOWN','VALID','INVALID')),
  provider_evidence JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(provider_evidence) = 'object'),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, provider_connection_id, domain)
);

CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  workspace_id UUID NOT NULL REFERENCES public.marketing_workspaces(id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 255),
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('NEWSLETTER','PROMOTION','LIFECYCLE','ANNOUNCEMENT')),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
    'DRAFT','REVIEW','APPROVED','SCHEDULED','QUEUED','SENDING','PAUSED','COMPLETED','CANCELLED','FAILED'
  )),
  locale TEXT NOT NULL DEFAULT 'fr-FR',
  timezone TEXT NOT NULL DEFAULT 'Europe/Paris',
  audience_definition JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(audience_definition) = 'object'),
  template_id UUID REFERENCES public.marketing_templates(id) ON DELETE SET NULL,
  template_version INTEGER,
  sender_identity_id UUID REFERENCES public.marketing_sender_identities(id) ON DELETE RESTRICT,
  provider_connection_id UUID REFERENCES public.provider_connections(id) ON DELETE RESTRICT,
  reply_to TEXT,
  current_version INTEGER NOT NULL DEFAULT 1 CHECK (current_version > 0),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status <> 'SCHEDULED' OR scheduled_at IS NOT NULL),
  CHECK (approved_by IS NULL OR status NOT IN ('DRAFT','REVIEW'))
);
CREATE INDEX IF NOT EXISTS marketing_campaigns_tenant_status_schedule_idx
  ON public.marketing_campaigns (tenant_id, status, scheduled_at, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.marketing_campaign_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE RESTRICT,
  version INTEGER NOT NULL CHECK (version > 0),
  subject TEXT NOT NULL,
  preview_text TEXT,
  content JSONB NOT NULL CHECK (jsonb_typeof(content) = 'object'),
  audience_definition JSONB NOT NULL CHECK (jsonb_typeof(audience_definition) = 'object'),
  sender_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(sender_snapshot) = 'object'),
  provider_connection_id UUID REFERENCES public.provider_connections(id) ON DELETE RESTRICT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, version)
);

CREATE TABLE IF NOT EXISTS public.marketing_suppressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  normalized_email TEXT NOT NULL CHECK (normalized_email = lower(trim(normalized_email))),
  profile_id UUID REFERENCES public.marketing_profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK (reason IN (
    'UNSUBSCRIBED','HARD_BOUNCE','COMPLAINT','INVALID','MANUAL','LEGAL','PROVIDER_SUPPRESSION'
  )),
  source TEXT NOT NULL,
  provider_connection_id UUID REFERENCES public.provider_connections(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at TIMESTAMPTZ,
  release_reason TEXT,
  released_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS marketing_suppressions_active_email_reason_idx
  ON public.marketing_suppressions (tenant_id, normalized_email, reason) WHERE released_at IS NULL;
CREATE INDEX IF NOT EXISTS marketing_suppressions_active_email_idx
  ON public.marketing_suppressions (tenant_id, normalized_email) WHERE released_at IS NULL;

CREATE TABLE IF NOT EXISTS public.marketing_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE RESTRICT,
  campaign_version_id UUID NOT NULL REFERENCES public.marketing_campaign_versions(id) ON DELETE RESTRICT,
  profile_id UUID NOT NULL REFERENCES public.marketing_profiles(id) ON DELETE RESTRICT,
  variant_id TEXT NOT NULL DEFAULT 'default',
  eligibility_status TEXT NOT NULL CHECK (eligibility_status IN ('ELIGIBLE','EXCLUDED')),
  exclusion_reason TEXT,
  send_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (send_status IN (
    'PENDING','QUEUED','ACCEPTED','DELIVERED','DEFERRED','BOUNCED','COMPLAINED','FAILED','CANCELLED'
  )),
  provider_connection_id UUID REFERENCES public.provider_connections(id) ON DELETE RESTRICT,
  provider_message_id TEXT,
  idempotency_key TEXT NOT NULL,
  queued_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, idempotency_key),
  UNIQUE (campaign_version_id, profile_id, variant_id)
);
CREATE INDEX IF NOT EXISTS marketing_recipients_campaign_status_idx
  ON public.marketing_campaign_recipients (tenant_id, campaign_id, send_status, created_at);
CREATE INDEX IF NOT EXISTS marketing_recipients_provider_message_idx
  ON public.marketing_campaign_recipients (provider_connection_id, provider_message_id)
  WHERE provider_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS marketing_recipients_profile_time_idx
  ON public.marketing_campaign_recipients (tenant_id, profile_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.marketing_delivery_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  recipient_id UUID REFERENCES public.marketing_campaign_recipients(id) ON DELETE SET NULL,
  provider_connection_id UUID NOT NULL REFERENCES public.provider_connections(id) ON DELETE RESTRICT,
  provider_event_id TEXT NOT NULL,
  provider_message_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'QUEUED','ACCEPTED','DELIVERED','DEFERRED','BOUNCED_SOFT','BOUNCED_HARD',
    'COMPLAINT','OPENED','CLICKED','UNSUBSCRIBED'
  )),
  occurred_at TIMESTAMPTZ NOT NULL,
  safe_reason TEXT,
  safe_metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(safe_metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_connection_id, provider_event_id)
);
CREATE INDEX IF NOT EXISTS marketing_delivery_events_tenant_type_time_idx
  ON public.marketing_delivery_events (tenant_id, event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS marketing_delivery_events_recipient_idx
  ON public.marketing_delivery_events (recipient_id, occurred_at) WHERE recipient_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.marketing_action_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  profile_id UUID NOT NULL REFERENCES public.marketing_profiles(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK (purpose IN ('CONFIRM','PREFERENCES','UNSUBSCRIBE')),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS marketing_action_tokens_profile_idx
  ON public.marketing_action_tokens (tenant_id, profile_id, purpose, expires_at DESC);

CREATE TABLE IF NOT EXISTS public.marketing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  campaign_id UUID REFERENCES public.marketing_campaigns(id) ON DELETE RESTRICT,
  job_type TEXT NOT NULL CHECK (job_type IN ('AUDIENCE_SNAPSHOT','CAMPAIGN_SEND','IMPORT','EXPORT','ANALYTICS_ROLLUP')),
  status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED','RUNNING','COMPLETED','FAILED','CANCELLED','DEAD_LETTER')),
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 20),
  idempotency_key TEXT NOT NULL,
  safe_payload JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(safe_payload) = 'object'),
  safe_error_code TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS marketing_jobs_queue_idx
  ON public.marketing_jobs (status, available_at, created_at) WHERE status IN ('QUEUED','FAILED');

CREATE OR REPLACE FUNCTION public.claim_marketing_job()
RETURNS SETOF public.marketing_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH candidate AS (
    SELECT id
    FROM public.marketing_jobs
    WHERE status IN ('QUEUED','FAILED')
      AND available_at <= now()
      AND attempt_count < max_attempts
    ORDER BY available_at, created_at
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  UPDATE public.marketing_jobs job
  SET status = 'RUNNING', started_at = now(), attempt_count = job.attempt_count + 1, updated_at = now()
  FROM candidate
  WHERE job.id = candidate.id
  RETURNING job.*;
END;
$$;

CREATE TABLE IF NOT EXISTS public.marketing_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  changed_fields TEXT[] NOT NULL DEFAULT '{}',
  safe_context JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(safe_context) = 'object'),
  correlation_id TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS marketing_audit_events_tenant_time_idx
  ON public.marketing_audit_events (tenant_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION public.is_marketing_tenant_member(requested_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members member
    WHERE member.organization_id = requested_tenant_id
      AND member.user_id = (SELECT public.current_profile_id())
      AND member.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.touch_marketing_record()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_versioned_marketing_record()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_marketing_provider_tenant()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE connection_tenant UUID;
BEGIN
  IF NEW.provider_connection_id IS NULL THEN RETURN NEW; END IF;
  SELECT tenant_id INTO connection_tenant FROM public.provider_connections WHERE id = NEW.provider_connection_id;
  IF connection_tenant IS NULL OR connection_tenant <> NEW.tenant_id THEN
    RAISE EXCEPTION 'Marketing provider connection must belong to the same tenant';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'marketing_sender_identities','marketing_sending_domains','marketing_campaigns',
    'marketing_campaign_versions','marketing_suppressions','marketing_campaign_recipients',
    'marketing_delivery_events'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_validate_provider ON public.%I', table_name, table_name);
    EXECUTE format('CREATE TRIGGER %I_validate_provider BEFORE INSERT OR UPDATE OF provider_connection_id ON public.%I FOR EACH ROW EXECUTE FUNCTION public.validate_marketing_provider_tenant()', table_name, table_name);
  END LOOP;
END $$;

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'marketing_workspaces','marketing_profiles','marketing_lists','marketing_segments','marketing_templates',
    'marketing_campaigns'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_touch ON public.%I', table_name, table_name);
    EXECUTE format('CREATE TRIGGER %I_touch BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.touch_versioned_marketing_record()', table_name, table_name);
  END LOOP;
  FOREACH table_name IN ARRAY ARRAY[
    'marketing_sender_identities','marketing_sending_domains','marketing_suppressions',
    'marketing_campaign_recipients','marketing_jobs'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_touch ON public.%I', table_name, table_name);
    EXECUTE format('CREATE TRIGGER %I_touch BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.touch_marketing_record()', table_name, table_name);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.prevent_marketing_history_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Marketing history is immutable';
END;
$$;
DROP TRIGGER IF EXISTS communication_consents_immutable ON public.communication_consents;
CREATE TRIGGER communication_consents_immutable BEFORE UPDATE OR DELETE ON public.communication_consents
  FOR EACH ROW EXECUTE FUNCTION public.prevent_marketing_history_mutation();
DROP TRIGGER IF EXISTS marketing_delivery_events_immutable ON public.marketing_delivery_events;
CREATE TRIGGER marketing_delivery_events_immutable BEFORE UPDATE OR DELETE ON public.marketing_delivery_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_marketing_history_mutation();
DROP TRIGGER IF EXISTS marketing_audit_events_immutable ON public.marketing_audit_events;
CREATE TRIGGER marketing_audit_events_immutable BEFORE UPDATE OR DELETE ON public.marketing_audit_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_marketing_history_mutation();

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'marketing_workspaces','communication_consents','marketing_profiles','marketing_lists',
    'marketing_list_memberships','marketing_segments','marketing_templates','marketing_template_versions',
    'marketing_sender_identities','marketing_sending_domains','marketing_campaigns','marketing_campaign_versions',
    'marketing_suppressions','marketing_campaign_recipients','marketing_delivery_events','marketing_action_tokens',
    'marketing_jobs','marketing_audit_events'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY %I_tenant_isolation ON public.%I FOR ALL TO authenticated USING ((SELECT public.is_marketing_tenant_member(tenant_id))) WITH CHECK ((SELECT public.is_marketing_tenant_member(tenant_id)))',
      table_name, table_name
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', table_name);
  END LOOP;
END $$;

-- Marketing writes are backend-authoritative. Tenant RLS protects optional
-- direct reads, while authenticated browser roles cannot mutate business state.
REVOKE ALL PRIVILEGES ON
  public.marketing_workspaces, public.communication_consents, public.marketing_profiles,
  public.marketing_lists, public.marketing_list_memberships, public.marketing_segments,
  public.marketing_templates, public.marketing_template_versions,
  public.marketing_sender_identities, public.marketing_sending_domains,
  public.marketing_campaigns, public.marketing_campaign_versions, public.marketing_suppressions,
  public.marketing_campaign_recipients, public.marketing_delivery_events,
  public.marketing_action_tokens, public.marketing_jobs, public.marketing_audit_events
FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.is_marketing_tenant_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_marketing_tenant_member(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.claim_marketing_job() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_marketing_job() TO service_role;
