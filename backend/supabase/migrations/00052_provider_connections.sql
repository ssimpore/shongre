-- Shared tenant/user provider connections. This extends the canonical provider
-- control plane from migration 00032; CRM, Newsletter and Notifications all
-- consume these rows through typed capability gateways.

CREATE TABLE IF NOT EXISTS public.provider_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('PLATFORM','TENANT','USER')),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  provider_id TEXT NOT NULL,
  provider_family TEXT NOT NULL CHECK (
    provider_family IN ('AI','MAILBOX','EMAIL_DELIVERY','CALENDAR','SMS','CALLING','PAYMENT','OTHER')
  ),
  display_name TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 160),
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','ACTIVE','DISABLED','ERROR','REVOKED')),
  configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
  capabilities TEXT[] NOT NULL DEFAULT '{}',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  last_validated_at TIMESTAMPTZ,
  last_error_code TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(configuration) = 'object'),
  CHECK (cardinality(capabilities) > 0),
  CHECK (
    configuration::text !~* '"(api[_-]?key|secret|password|refresh[_-]?token|access[_-]?token)"[[:space:]]*:'
  ),
  CHECK (
    (owner_type = 'PLATFORM' AND tenant_id IS NULL AND owner_id IS NULL)
    OR (owner_type = 'TENANT' AND tenant_id IS NOT NULL AND owner_id IS NULL)
    OR (owner_type = 'USER' AND tenant_id IS NOT NULL AND owner_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS provider_connections_default_owner_capability_idx
  ON public.provider_connections (
    COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
    owner_type,
    COALESCE(owner_id, '00000000-0000-0000-0000-000000000000'::uuid),
    provider_family
  )
  WHERE is_default AND status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS provider_connections_tenant_family_idx
  ON public.provider_connections (tenant_id, provider_family, status);
CREATE INDEX IF NOT EXISTS provider_connections_owner_idx
  ON public.provider_connections (owner_id, status) WHERE owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS provider_connections_capabilities_gin_idx
  ON public.provider_connections USING gin (capabilities);

CREATE TABLE IF NOT EXISTS public.provider_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_connection_id UUID NOT NULL REFERENCES public.provider_connections(id) ON DELETE CASCADE,
  secret_reference TEXT,
  encrypted_secret BYTEA,
  encryption_iv BYTEA,
  encryption_tag BYTEA,
  key_version TEXT,
  credential_hint TEXT CHECK (credential_hint IS NULL OR char_length(credential_hint) <= 32),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rotated_at TIMESTAMPTZ,
  last_validated_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  CHECK (
    (secret_reference IS NOT NULL AND encrypted_secret IS NULL AND encryption_iv IS NULL AND encryption_tag IS NULL)
    OR (secret_reference IS NULL AND encrypted_secret IS NOT NULL AND encryption_iv IS NOT NULL AND encryption_tag IS NOT NULL AND key_version IS NOT NULL)
  ),
  CHECK (secret_reference IS NULL OR secret_reference !~* '(sk-|sk_|password=|secret=|token=)')
);

CREATE UNIQUE INDEX IF NOT EXISTS provider_credentials_active_connection_idx
  ON public.provider_credentials (provider_connection_id) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.provider_tenant_policies (
  tenant_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  allow_personal_connections BOOLEAN NOT NULL DEFAULT FALSE,
  allow_platform_fallback BOOLEAN NOT NULL DEFAULT FALSE,
  allowed_provider_ids TEXT[] NOT NULL DEFAULT '{}',
  allowed_capabilities TEXT[] NOT NULL DEFAULT '{}',
  ai_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  allow_ai_personal_data BOOLEAN NOT NULL DEFAULT FALSE,
  allow_ai_sensitive_data BOOLEAN NOT NULL DEFAULT FALSE,
  allow_custom_endpoints BOOLEAN NOT NULL DEFAULT FALSE,
  ai_feature_allow_list TEXT[] NOT NULL DEFAULT '{}',
  monthly_usage_limit_minor BIGINT CHECK (monthly_usage_limit_minor IS NULL OR monthly_usage_limit_minor >= 0),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.provider_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  provider_connection_id UUID NOT NULL REFERENCES public.provider_connections(id) ON DELETE RESTRICT,
  provider_id TEXT NOT NULL,
  capability TEXT NOT NULL,
  feature TEXT NOT NULL,
  model TEXT,
  request_id TEXT,
  correlation_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('SUCCEEDED','FAILED','REJECTED','CANCELLED')),
  input_units BIGINT CHECK (input_units IS NULL OR input_units >= 0),
  output_units BIGINT CHECK (output_units IS NULL OR output_units >= 0),
  latency_ms INTEGER CHECK (latency_ms IS NULL OR latency_ms >= 0),
  estimated_cost_minor BIGINT CHECK (estimated_cost_minor IS NULL OR estimated_cost_minor >= 0),
  currency CHAR(3),
  safe_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(safe_metadata) = 'object')
);
CREATE INDEX IF NOT EXISTS provider_usage_events_tenant_time_idx
  ON public.provider_usage_events (tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS provider_usage_events_connection_time_idx
  ON public.provider_usage_events (provider_connection_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.provider_connection_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT,
  provider_connection_id UUID REFERENCES public.provider_connections(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  changed_fields TEXT[] NOT NULL DEFAULT '{}',
  reason TEXT,
  correlation_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS provider_connection_audit_tenant_time_idx
  ON public.provider_connection_audit (tenant_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.is_provider_tenant_member(requested_tenant_id UUID)
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

CREATE OR REPLACE FUNCTION public.touch_provider_connection()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS provider_connections_touch ON public.provider_connections;
CREATE TRIGGER provider_connections_touch BEFORE UPDATE ON public.provider_connections
  FOR EACH ROW EXECUTE FUNCTION public.touch_provider_connection();
DROP TRIGGER IF EXISTS provider_tenant_policies_touch ON public.provider_tenant_policies;
CREATE TRIGGER provider_tenant_policies_touch BEFORE UPDATE ON public.provider_tenant_policies
  FOR EACH ROW EXECUTE FUNCTION public.touch_provider_connection();

CREATE OR REPLACE FUNCTION public.prevent_provider_history_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'provider usage and audit history is immutable';
END;
$$;
DROP TRIGGER IF EXISTS provider_usage_events_immutable ON public.provider_usage_events;
CREATE TRIGGER provider_usage_events_immutable BEFORE UPDATE OR DELETE ON public.provider_usage_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_provider_history_mutation();
DROP TRIGGER IF EXISTS provider_connection_audit_immutable ON public.provider_connection_audit;
CREATE TRIGGER provider_connection_audit_immutable BEFORE UPDATE OR DELETE ON public.provider_connection_audit
  FOR EACH ROW EXECUTE FUNCTION public.prevent_provider_history_mutation();

ALTER TABLE public.provider_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_connections FORCE ROW LEVEL SECURITY;
ALTER TABLE public.provider_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_credentials FORCE ROW LEVEL SECURITY;
ALTER TABLE public.provider_tenant_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_tenant_policies FORCE ROW LEVEL SECURITY;
ALTER TABLE public.provider_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_usage_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.provider_connection_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_connection_audit FORCE ROW LEVEL SECURITY;

CREATE POLICY provider_connections_tenant_isolation ON public.provider_connections
  FOR ALL TO authenticated
  USING (
    tenant_id IS NOT NULL
    AND (SELECT public.is_provider_tenant_member(tenant_id))
    AND (owner_type <> 'USER' OR owner_id = (SELECT public.current_profile_id()) OR (SELECT public.has_capability('provider.configuration.manage')))
  )
  WITH CHECK (
    tenant_id IS NOT NULL
    AND (SELECT public.is_provider_tenant_member(tenant_id))
    AND (owner_type <> 'USER' OR owner_id = (SELECT public.current_profile_id()) OR (SELECT public.has_capability('provider.configuration.manage')))
  );
CREATE POLICY provider_tenant_policies_member_read ON public.provider_tenant_policies
  FOR SELECT TO authenticated
  USING ((SELECT public.is_provider_tenant_member(tenant_id)));
CREATE POLICY provider_tenant_policies_admin_write ON public.provider_tenant_policies
  FOR ALL TO authenticated
  USING ((SELECT public.is_provider_tenant_member(tenant_id)) AND (SELECT public.has_capability('provider.configuration.manage')))
  WITH CHECK ((SELECT public.is_provider_tenant_member(tenant_id)) AND (SELECT public.has_capability('provider.configuration.manage')));
CREATE POLICY provider_usage_tenant_read ON public.provider_usage_events
  FOR SELECT TO authenticated
  USING ((SELECT public.is_provider_tenant_member(tenant_id)) AND (SELECT public.has_capability('provider.configuration.read')));
CREATE POLICY provider_audit_tenant_read ON public.provider_connection_audit
  FOR SELECT TO authenticated
  USING ((SELECT public.is_provider_tenant_member(tenant_id)) AND (SELECT public.has_capability('provider.configuration.read')));

REVOKE ALL ON public.provider_credentials FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.provider_usage_events FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.provider_connection_audit FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.provider_connections TO authenticated;
GRANT SELECT ON public.provider_tenant_policies, public.provider_usage_events, public.provider_connection_audit TO authenticated;
GRANT INSERT, UPDATE ON public.provider_tenant_policies TO authenticated;

REVOKE ALL ON FUNCTION public.is_provider_tenant_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_provider_tenant_member(UUID) TO authenticated;
