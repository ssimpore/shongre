-- Provider control-plane operational state.
-- Static provider/capability definitions remain in @shongre/contracts; these
-- tables store environment-specific configuration and evidence only.

CREATE TABLE IF NOT EXISTS public.provider_runtime_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id TEXT NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  credential_reference TEXT,
  credential_status TEXT NOT NULL DEFAULT 'NOT_CONFIGURED'
    CHECK (credential_status IN ('NOT_REQUIRED', 'NOT_CONFIGURED', 'CONFIGURED', 'INVALID', 'EXPIRED')),
  credential_expires_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_id, environment),
  CHECK (jsonb_typeof(settings) = 'object'),
  CHECK (credential_reference IS NULL OR credential_reference !~ '(sk_|secret|token=)')
);

COMMENT ON COLUMN public.provider_runtime_configurations.credential_reference IS
  'Opaque secret-manager reference only. Never store a credential value here.';

CREATE TABLE IF NOT EXISTS public.provider_routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capability TEXT NOT NULL,
  market_code TEXT NOT NULL CHECK (market_code ~ '^(\*|[A-Z]{2})$'),
  environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
  primary_provider_id TEXT NOT NULL,
  fallback_provider_id TEXT,
  automatic_failover BOOLEAN NOT NULL DEFAULT FALSE,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (capability, market_code, environment),
  CHECK (fallback_provider_id IS NULL OR fallback_provider_id <> primary_provider_id)
);

CREATE TABLE IF NOT EXISTS public.provider_health_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id TEXT NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
  health TEXT NOT NULL CHECK (health IN ('HEALTHY', 'DEGRADED', 'PARTIAL_OUTAGE', 'OUTAGE', 'MISCONFIGURED', 'DISABLED', 'UNKNOWN')),
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('LIVE_PROBE', 'RUNTIME_SIGNAL')),
  source TEXT NOT NULL,
  latency_ms INTEGER CHECK (latency_ms IS NULL OR latency_ms >= 0),
  error_rate_percent NUMERIC(5,2) CHECK (error_rate_percent IS NULL OR error_rate_percent BETWEEN 0 AND 100),
  detail_code TEXT,
  message TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS provider_health_observations_lookup_idx
  ON public.provider_health_observations (provider_id, environment, observed_at DESC);

CREATE TABLE IF NOT EXISTS public.provider_diagnostic_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id TEXT NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
  requested_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  supported BOOLEAN NOT NULL,
  success BOOLEAN NOT NULL,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('NONE', 'CONFIGURATION', 'LIVE_PROBE', 'RUNTIME_SIGNAL')),
  result_code TEXT NOT NULL,
  latency_ms INTEGER NOT NULL CHECK (latency_ms >= 0),
  safe_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(safe_details) = 'object')
);

CREATE TABLE IF NOT EXISTS public.provider_webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id TEXT NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
  endpoint_code TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  secret_reference TEXT NOT NULL,
  secret_version INTEGER NOT NULL DEFAULT 1 CHECK (secret_version > 0),
  last_received_at TIMESTAMPTZ,
  last_verified_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_id, environment, endpoint_code),
  CHECK (secret_reference !~ '(whsec_|secret=|token=)')
);

CREATE TABLE IF NOT EXISTS public.provider_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id TEXT NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
  provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_hash TEXT NOT NULL CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
  signature_verified BOOLEAN NOT NULL DEFAULT FALSE,
  processing_status TEXT NOT NULL DEFAULT 'RECEIVED'
    CHECK (processing_status IN ('RECEIVED', 'PROCESSING', 'PROCESSED', 'RETRY_PENDING', 'DEAD_LETTER')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at TIMESTAMPTZ,
  processing_started_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  last_error_code TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_id, environment, provider_event_id)
);

CREATE INDEX IF NOT EXISTS provider_events_retry_idx
  ON public.provider_events (processing_status, next_attempt_at)
  WHERE processing_status = 'RETRY_PENDING';

CREATE TABLE IF NOT EXISTS public.provider_circuit_states (
  provider_id TEXT NOT NULL,
  capability TEXT NOT NULL,
  market_code TEXT NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
  state TEXT NOT NULL CHECK (state IN ('CLOSED', 'OPEN', 'HALF_OPEN')),
  consecutive_failures INTEGER NOT NULL DEFAULT 0 CHECK (consecutive_failures >= 0),
  opened_at TIMESTAMPTZ,
  retry_after TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (provider_id, capability, market_code, environment)
);

CREATE TABLE IF NOT EXISTS public.provider_reconciliation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id TEXT NOT NULL,
  capability TEXT NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
  status TEXT NOT NULL CHECK (status IN ('STARTED', 'SUCCEEDED', 'PARTIAL', 'FAILED')),
  checked_count INTEGER NOT NULL DEFAULT 0 CHECK (checked_count >= 0),
  mismatch_count INTEGER NOT NULL DEFAULT 0 CHECK (mismatch_count >= 0),
  safe_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  CHECK (jsonb_typeof(safe_summary) = 'object')
);

CREATE TABLE IF NOT EXISTS public.provider_configuration_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id TEXT NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  reason TEXT NOT NULL,
  previous_version INTEGER,
  new_version INTEGER,
  changed_fields TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.prevent_provider_evidence_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'provider operational evidence and audit records are immutable';
END;
$$;

DROP TRIGGER IF EXISTS provider_health_observations_immutable ON public.provider_health_observations;
CREATE TRIGGER provider_health_observations_immutable
  BEFORE UPDATE OR DELETE ON public.provider_health_observations
  FOR EACH ROW EXECUTE FUNCTION public.prevent_provider_evidence_mutation();

DROP TRIGGER IF EXISTS provider_diagnostic_runs_immutable ON public.provider_diagnostic_runs;
CREATE TRIGGER provider_diagnostic_runs_immutable
  BEFORE UPDATE OR DELETE ON public.provider_diagnostic_runs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_provider_evidence_mutation();

DROP TRIGGER IF EXISTS provider_configuration_audit_immutable ON public.provider_configuration_audit;
CREATE TRIGGER provider_configuration_audit_immutable
  BEFORE UPDATE OR DELETE ON public.provider_configuration_audit
  FOR EACH ROW EXECUTE FUNCTION public.prevent_provider_evidence_mutation();

ALTER TABLE public.provider_runtime_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_runtime_configurations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.provider_routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_routing_rules FORCE ROW LEVEL SECURITY;
ALTER TABLE public.provider_health_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_health_observations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.provider_diagnostic_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_diagnostic_runs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.provider_webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_webhook_endpoints FORCE ROW LEVEL SECURITY;
ALTER TABLE public.provider_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.provider_circuit_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_circuit_states FORCE ROW LEVEL SECURITY;
ALTER TABLE public.provider_reconciliation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_reconciliation_runs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.provider_configuration_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_configuration_audit FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.provider_runtime_configurations FROM anon, authenticated;
REVOKE ALL ON public.provider_routing_rules FROM anon, authenticated;
REVOKE ALL ON public.provider_health_observations FROM anon, authenticated;
REVOKE ALL ON public.provider_diagnostic_runs FROM anon, authenticated;
REVOKE ALL ON public.provider_webhook_endpoints FROM anon, authenticated;
REVOKE ALL ON public.provider_events FROM anon, authenticated;
REVOKE ALL ON public.provider_circuit_states FROM anon, authenticated;
REVOKE ALL ON public.provider_reconciliation_runs FROM anon, authenticated;
REVOKE ALL ON public.provider_configuration_audit FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.prevent_provider_evidence_mutation() FROM PUBLIC;
