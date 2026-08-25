-- Shared automation runtime plus Marketing-specific analytics, tracking and
-- webhook resources. The runtime is domain-neutral so CRM and future modules
-- can reuse the same execution, retry and history model.

ALTER TABLE public.marketing_campaign_versions
  ADD COLUMN IF NOT EXISTS experiment JSONB NOT NULL DEFAULT '{"enabled":false}'::jsonb
  CHECK (jsonb_typeof(experiment) = 'object');

ALTER TABLE public.marketing_campaigns
  ADD COLUMN IF NOT EXISTS winning_variant_id TEXT,
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS quota_reserved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS quota_reserved_amount BIGINT CHECK (quota_reserved_amount IS NULL OR quota_reserved_amount >= 0);

CREATE OR REPLACE FUNCTION public.reserve_marketing_campaign_quota(
  p_tenant_id UUID,
  p_campaign_id UUID,
  p_market_code VARCHAR,
  p_limit BIGINT
) RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target public.marketing_campaigns%ROWTYPE;
  account_id UUID;
  reservation BIGINT;
  observed BIGINT;
  period_start TIMESTAMPTZ;
  period_end TIMESTAMPTZ;
BEGIN
  SELECT * INTO target FROM public.marketing_campaigns
    WHERE tenant_id = p_tenant_id AND id = p_campaign_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'marketing campaign not found'; END IF;
  IF target.quota_reserved_at IS NOT NULL THEN RETURN COALESCE(target.quota_reserved_amount, 0); END IF;
  SELECT owner_id INTO account_id FROM public.organizations WHERE id = p_tenant_id;
  IF account_id IS NULL THEN RAISE EXCEPTION 'marketing quota account not found'; END IF;
  SELECT count(*) INTO reservation FROM public.marketing_campaign_recipients
    WHERE tenant_id = p_tenant_id AND campaign_id = p_campaign_id
      AND eligibility_status = 'ELIGIBLE' AND send_status = 'QUEUED';
  period_start := date_trunc('month', now());
  period_end := period_start + interval '1 month';
  SELECT count(*) INTO observed FROM public.marketing_campaign_recipients
    WHERE tenant_id = p_tenant_id AND created_at >= period_start
      AND send_status IN ('ACCEPTED','DELIVERED','DEFERRED','BOUNCED','COMPLAINED');
  IF reservation > 0 THEN
    PERFORM public.consume_monetization_quota(account_id, 'marketing.monthly_sends', p_market_code, period_start, period_end, p_limit, observed, reservation);
  END IF;
  UPDATE public.marketing_campaigns SET quota_reserved_at = now(), quota_reserved_amount = reservation
    WHERE id = p_campaign_id;
  RETURN reservation;
END;
$$;

CREATE TABLE IF NOT EXISTS public.marketing_provider_webhook_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  provider_connection_id UUID NOT NULL REFERENCES public.provider_connections(id) ON DELETE RESTRICT,
  request_id TEXT NOT NULL,
  payload_sha256 TEXT NOT NULL CHECK (payload_sha256 ~ '^[a-f0-9]{64}$'),
  signature_verified BOOLEAN NOT NULL CHECK (signature_verified),
  event_count INTEGER NOT NULL DEFAULT 0 CHECK (event_count >= 0),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_connection_id, request_id)
);
CREATE INDEX IF NOT EXISTS marketing_provider_webhook_receipts_time_idx
  ON public.marketing_provider_webhook_receipts (tenant_id, received_at DESC);

CREATE TABLE IF NOT EXISTS public.marketing_tracking_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  recipient_id UUID NOT NULL REFERENCES public.marketing_campaign_recipients(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  kind TEXT NOT NULL CHECK (kind IN ('OPEN','CLICK')),
  target_url TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((kind = 'OPEN' AND target_url IS NULL) OR (kind = 'CLICK' AND target_url IS NOT NULL)),
  CHECK (target_url IS NULL OR target_url ~ '^https://')
);
CREATE INDEX IF NOT EXISTS marketing_tracking_tokens_recipient_idx
  ON public.marketing_tracking_tokens (tenant_id, recipient_id, kind);

CREATE TABLE IF NOT EXISTS public.marketing_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  recipient_id UUID REFERENCES public.marketing_campaign_recipients(id) ON DELETE SET NULL,
  profile_id UUID REFERENCES public.marketing_profiles(id) ON DELETE SET NULL,
  conversion_type TEXT NOT NULL CHECK (char_length(conversion_type) BETWEEN 2 AND 120),
  external_subject_id TEXT,
  amount_minor BIGINT CHECK (amount_minor IS NULL OR amount_minor >= 0),
  currency CHAR(3),
  idempotency_key TEXT NOT NULL,
  safe_metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(safe_metadata) = 'object'),
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, idempotency_key),
  CHECK ((amount_minor IS NULL AND currency IS NULL) OR (amount_minor IS NOT NULL AND currency IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS marketing_conversions_tenant_time_idx
  ON public.marketing_conversions (tenant_id, conversion_type, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.automation_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  workspace_id UUID,
  domain TEXT NOT NULL CHECK (domain IN ('CRM','MARKETING')),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ACTIVE','PAUSED','ARCHIVED')),
  current_version INTEGER NOT NULL DEFAULT 1 CHECK (current_version > 0),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  UNIQUE (tenant_id, domain, name)
);
CREATE INDEX IF NOT EXISTS automation_definitions_tenant_domain_idx
  ON public.automation_definitions (tenant_id, domain, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.automation_definition_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  definition_id UUID NOT NULL REFERENCES public.automation_definitions(id) ON DELETE RESTRICT,
  version INTEGER NOT NULL CHECK (version > 0),
  definition JSONB NOT NULL CHECK (jsonb_typeof(definition) = 'object'),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (definition_id, version)
);

CREATE TABLE IF NOT EXISTS public.automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  definition_id UUID NOT NULL REFERENCES public.automation_definitions(id) ON DELETE RESTRICT,
  definition_version INTEGER NOT NULL CHECK (definition_version > 0),
  subject_type TEXT NOT NULL CHECK (subject_type IN ('MARKETING_PROFILE','CRM_CONTACT','ACCOUNT','EXTERNAL')),
  subject_id TEXT,
  event_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED','RUNNING','WAITING','COMPLETED','FAILED','STOPPED')),
  current_node_id TEXT,
  depth INTEGER NOT NULL DEFAULT 0 CHECK (depth BETWEEN 0 AND 100),
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 20),
  idempotency_key TEXT NOT NULL,
  safe_context JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(safe_context) = 'object'),
  last_error_code TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS automation_executions_queue_idx
  ON public.automation_executions (status, available_at, created_at)
  WHERE status IN ('QUEUED','WAITING','FAILED');

CREATE TABLE IF NOT EXISTS public.marketing_automation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  execution_id UUID NOT NULL REFERENCES public.automation_executions(id) ON DELETE RESTRICT,
  profile_id UUID NOT NULL REFERENCES public.marketing_profiles(id) ON DELETE RESTRICT,
  provider_connection_id UUID NOT NULL REFERENCES public.provider_connections(id) ON DELETE RESTRICT,
  provider_message_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACCEPTED' CHECK (status IN ('ACCEPTED','DELIVERED','DEFERRED','BOUNCED','COMPLAINED')),
  accepted_at TIMESTAMPTZ NOT NULL,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, idempotency_key),
  UNIQUE (provider_connection_id, provider_message_id)
);
CREATE INDEX IF NOT EXISTS marketing_automation_messages_profile_time_idx
  ON public.marketing_automation_messages (tenant_id, profile_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.automation_execution_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  execution_id UUID NOT NULL REFERENCES public.automation_executions(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('STARTED','COMPLETED','WAITING','FAILED','SKIPPED')),
  attempt INTEGER NOT NULL DEFAULT 1 CHECK (attempt > 0),
  safe_result JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(safe_result) = 'object'),
  error_code TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (execution_id, node_id, attempt, status)
);
CREATE INDEX IF NOT EXISTS automation_execution_steps_history_idx
  ON public.automation_execution_steps (tenant_id, execution_id, occurred_at);

CREATE OR REPLACE FUNCTION public.claim_automation_execution()
RETURNS SETOF public.automation_executions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH candidate AS (
    SELECT execution.id
    FROM public.automation_executions execution
    JOIN public.automation_definitions definition ON definition.id = execution.definition_id
    WHERE execution.status IN ('QUEUED','WAITING','FAILED')
      AND execution.available_at <= now()
      AND execution.attempt_count < execution.max_attempts
      AND definition.status = 'ACTIVE'
    ORDER BY execution.available_at, execution.created_at
    FOR UPDATE OF execution SKIP LOCKED
    LIMIT 1
  )
  UPDATE public.automation_executions execution
  SET status = 'RUNNING', started_at = COALESCE(execution.started_at, now()),
      attempt_count = execution.attempt_count + 1, updated_at = now()
  FROM candidate
  WHERE execution.id = candidate.id
  RETURNING execution.*;
END;
$$;

CREATE TABLE IF NOT EXISTS public.marketing_webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  workspace_id UUID NOT NULL REFERENCES public.marketing_workspaces(id) ON DELETE RESTRICT,
  url TEXT NOT NULL CHECK (url ~ '^https://'),
  event_types TEXT[] NOT NULL CHECK (cardinality(event_types) > 0),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','PAUSED','DISABLED')),
  signing_secret_ciphertext BYTEA NOT NULL,
  signing_secret_iv BYTEA NOT NULL,
  signing_secret_tag BYTEA NOT NULL,
  signing_secret_hint TEXT NOT NULL,
  key_version TEXT NOT NULL CHECK (char_length(key_version) > 0),
  last_delivered_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, url)
);

CREATE TABLE IF NOT EXISTS public.marketing_webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  subscription_id UUID NOT NULL REFERENCES public.marketing_webhook_subscriptions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED','RUNNING','DELIVERED','FAILED','DEAD_LETTER','CANCELLED')),
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 8 CHECK (max_attempts BETWEEN 1 AND 20),
  safe_payload JSONB NOT NULL CHECK (jsonb_typeof(safe_payload) = 'object'),
  response_status INTEGER,
  last_error_code TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, event_id)
);
CREATE INDEX IF NOT EXISTS marketing_webhook_deliveries_queue_idx
  ON public.marketing_webhook_deliveries (status, available_at, created_at)
  WHERE status IN ('QUEUED','FAILED');

CREATE OR REPLACE FUNCTION public.claim_marketing_webhook_delivery()
RETURNS SETOF public.marketing_webhook_deliveries
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH candidate AS (
    SELECT delivery.id
    FROM public.marketing_webhook_deliveries delivery
    JOIN public.marketing_webhook_subscriptions subscription ON subscription.id = delivery.subscription_id
    WHERE delivery.status IN ('QUEUED','FAILED')
      AND delivery.available_at <= now()
      AND delivery.attempt_count < delivery.max_attempts
      AND subscription.status = 'ACTIVE'
    ORDER BY delivery.available_at, delivery.created_at
    FOR UPDATE OF delivery SKIP LOCKED
    LIMIT 1
  )
  UPDATE public.marketing_webhook_deliveries delivery
  SET status = 'RUNNING', attempt_count = delivery.attempt_count + 1, updated_at = now()
  FROM candidate
  WHERE delivery.id = candidate.id
  RETURNING delivery.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_automation_history_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Automation and marketing event history is immutable';
END;
$$;

DROP TRIGGER IF EXISTS marketing_provider_webhook_receipts_immutable ON public.marketing_provider_webhook_receipts;
CREATE TRIGGER marketing_provider_webhook_receipts_immutable BEFORE UPDATE OR DELETE ON public.marketing_provider_webhook_receipts
  FOR EACH ROW EXECUTE FUNCTION public.prevent_automation_history_mutation();
DROP TRIGGER IF EXISTS marketing_conversions_immutable ON public.marketing_conversions;
CREATE TRIGGER marketing_conversions_immutable BEFORE UPDATE OR DELETE ON public.marketing_conversions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_automation_history_mutation();
DROP TRIGGER IF EXISTS automation_execution_steps_immutable ON public.automation_execution_steps;
CREATE TRIGGER automation_execution_steps_immutable BEFORE UPDATE OR DELETE ON public.automation_execution_steps
  FOR EACH ROW EXECUTE FUNCTION public.prevent_automation_history_mutation();

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['automation_definitions'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_touch ON public.%I', table_name, table_name);
    EXECUTE format('CREATE TRIGGER %I_touch BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.touch_versioned_marketing_record()', table_name, table_name);
  END LOOP;
  FOREACH table_name IN ARRAY ARRAY[
    'automation_executions','marketing_webhook_subscriptions','marketing_webhook_deliveries'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_touch ON public.%I', table_name, table_name);
    EXECUTE format('CREATE TRIGGER %I_touch BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.touch_marketing_record()', table_name, table_name);
  END LOOP;
END $$;

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'marketing_provider_webhook_receipts','marketing_tracking_tokens','marketing_conversions',
    'automation_definitions','automation_definition_versions','automation_executions','marketing_automation_messages',
    'automation_execution_steps','marketing_webhook_subscriptions','marketing_webhook_deliveries'
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

REVOKE ALL PRIVILEGES ON
  public.marketing_provider_webhook_receipts, public.marketing_tracking_tokens,
  public.marketing_conversions, public.automation_definitions,
  public.automation_definition_versions, public.automation_executions,
  public.marketing_automation_messages, public.automation_execution_steps,
  public.marketing_webhook_subscriptions, public.marketing_webhook_deliveries
FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_automation_execution() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_marketing_webhook_delivery() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reserve_marketing_campaign_quota(UUID,UUID,VARCHAR,BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_automation_execution() TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_marketing_webhook_delivery() TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_marketing_campaign_quota(UUID,UUID,VARCHAR,BIGINT) TO service_role;
