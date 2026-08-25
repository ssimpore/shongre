-- Durable, tenant-aware Shongre -> CRM integration inbox.
-- Canonical marketplace/billing rows remain the source of truth. The CRM only
-- stores external references, commercial projections and immutable activities.

CREATE TABLE IF NOT EXISTS public.crm_shongre_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  event_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'professional.created','professional.verified','organization.updated',
    'subscription.started','subscription.upgraded','subscription.cancelled',
    'subscription.payment_failed','listing.published','lead.created',
    'message.received','advertising.purchased'
  )),
  occurred_at TIMESTAMPTZ NOT NULL,
  payload_version SMALLINT NOT NULL DEFAULT 1 CHECK (payload_version BETWEEN 1 AND 100),
  source TEXT NOT NULL DEFAULT 'shongre' CHECK (source = 'shongre'),
  idempotency_key TEXT NOT NULL CHECK (char_length(idempotency_key) BETWEEN 1 AND 240),
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending','leased','retry','succeeded','dead_letter')
  ),
  attempts SMALLINT NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 10),
  max_attempts SMALLINT NOT NULL DEFAULT 7 CHECK (max_attempts BETWEEN 1 AND 10),
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lease_owner TEXT,
  lease_expires_at TIMESTAMPTZ,
  last_error_code TEXT,
  last_error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source, event_id),
  UNIQUE (tenant_id, idempotency_key),
  CHECK (
    (status = 'leased' AND lease_owner IS NOT NULL AND lease_expires_at IS NOT NULL)
    OR status <> 'leased'
  )
);
CREATE INDEX IF NOT EXISTS crm_shongre_events_claim_idx
  ON public.crm_shongre_events (available_at, created_at)
  WHERE status IN ('pending','retry','leased');
CREATE INDEX IF NOT EXISTS crm_shongre_events_tenant_time_idx
  ON public.crm_shongre_events (tenant_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.crm_shongre_event_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.crm_shongre_events(id) ON DELETE CASCADE,
  attempt_number SMALLINT NOT NULL,
  worker_id TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('succeeded','retry','dead_letter')),
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, attempt_number)
);

-- External events use the existing provider-safe external message field. This
-- partial key makes an event application idempotent across commit/ack crashes.
CREATE UNIQUE INDEX IF NOT EXISTS crm_activities_external_event_once_idx
  ON public.crm_activities (tenant_id, external_message_id)
  WHERE activity_type = 'EXTERNAL_EVENT' AND external_message_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS crm_audit_shongre_event_once_idx
  ON public.crm_audit_events (tenant_id, correlation_id, action)
  WHERE action = 'crm.shongre_event.applied';

CREATE OR REPLACE FUNCTION public.enqueue_crm_shongre_event(
  p_tenant_id UUID,
  p_event_id UUID,
  p_event_type TEXT,
  p_occurred_at TIMESTAMPTZ,
  p_payload_version SMALLINT,
  p_source TEXT,
  p_idempotency_key TEXT,
  p_payload JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE queued_id UUID;
BEGIN
  IF p_source <> 'shongre'
     OR p_payload IS NULL
     OR jsonb_typeof(p_payload) <> 'object'
     OR p_payload_version NOT BETWEEN 1 AND 100
     OR char_length(btrim(p_idempotency_key)) NOT BETWEEN 1 AND 240 THEN
    RAISE EXCEPTION 'invalid CRM Shongre event envelope' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.crm_shongre_events (
    tenant_id, event_id, event_type, occurred_at, payload_version,
    source, idempotency_key, payload
  ) VALUES (
    p_tenant_id, p_event_id, p_event_type, p_occurred_at, p_payload_version,
    p_source, btrim(p_idempotency_key), p_payload
  )
  ON CONFLICT (tenant_id, idempotency_key) DO UPDATE
    SET idempotency_key = EXCLUDED.idempotency_key
  RETURNING id INTO queued_id;
  RETURN queued_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_crm_shongre_events(
  p_worker_id TEXT,
  p_limit INTEGER DEFAULT 50,
  p_lease_seconds INTEGER DEFAULT 120
)
RETURNS TABLE (
  id UUID,
  tenant_id UUID,
  event_id UUID,
  event_type TEXT,
  occurred_at TIMESTAMPTZ,
  payload_version SMALLINT,
  source TEXT,
  idempotency_key TEXT,
  payload JSONB,
  attempt_number SMALLINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF char_length(btrim(p_worker_id)) NOT BETWEEN 1 AND 200
     OR p_limit NOT BETWEEN 1 AND 200
     OR p_lease_seconds NOT BETWEEN 10 AND 900 THEN
    RAISE EXCEPTION 'invalid CRM integration lease request' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY
  WITH candidates AS (
    SELECT candidate.id
    FROM public.crm_shongre_events candidate
    WHERE (candidate.status IN ('pending','retry') AND candidate.available_at <= now())
       OR (candidate.status = 'leased' AND candidate.lease_expires_at <= now())
    ORDER BY candidate.available_at, candidate.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  ), claimed AS (
    UPDATE public.crm_shongre_events target
    SET status = 'leased',
        attempts = target.attempts + 1,
        lease_owner = p_worker_id,
        lease_expires_at = now() + make_interval(secs => p_lease_seconds),
        updated_at = now()
    FROM candidates
    WHERE target.id = candidates.id
    RETURNING target.*
  )
  SELECT claimed.id, claimed.tenant_id, claimed.event_id,
         claimed.event_type, claimed.occurred_at, claimed.payload_version,
         claimed.source, claimed.idempotency_key, claimed.payload,
         claimed.attempts
  FROM claimed;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_crm_shongre_event(
  p_event_id UUID,
  p_worker_id TEXT,
  p_success BOOLEAN,
  p_permanent_failure BOOLEAN,
  p_error_code TEXT,
  p_error_message TEXT,
  p_retry_at TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE target public.crm_shongre_events%ROWTYPE;
DECLARE next_status TEXT;
BEGIN
  SELECT * INTO target
  FROM public.crm_shongre_events
  WHERE id = p_event_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CRM integration event not found' USING ERRCODE = 'P0002';
  END IF;
  IF target.status <> 'leased' OR target.lease_owner <> p_worker_id THEN
    RAISE EXCEPTION 'CRM integration lease ownership mismatch' USING ERRCODE = '42501';
  END IF;
  next_status := CASE
    WHEN p_success THEN 'succeeded'
    WHEN p_permanent_failure OR target.attempts >= target.max_attempts THEN 'dead_letter'
    ELSE 'retry'
  END;
  IF next_status = 'retry' AND (p_retry_at IS NULL OR p_retry_at <= now()) THEN
    RAISE EXCEPTION 'future retry time required' USING ERRCODE = '22023';
  END IF;
  UPDATE public.crm_shongre_events
  SET status = next_status,
      available_at = CASE WHEN next_status = 'retry' THEN p_retry_at ELSE available_at END,
      lease_owner = NULL,
      lease_expires_at = NULL,
      last_error_code = CASE WHEN p_success THEN NULL ELSE left(p_error_code, 100) END,
      last_error_message = CASE WHEN p_success THEN NULL ELSE left(p_error_message, 1000) END,
      processed_at = CASE WHEN next_status IN ('succeeded','dead_letter') THEN now() ELSE NULL END,
      updated_at = now()
  WHERE id = p_event_id;
  INSERT INTO public.crm_shongre_event_attempts (
    event_id, attempt_number, worker_id, outcome, error_code, error_message
  ) VALUES (
    p_event_id, target.attempts, p_worker_id, next_status,
    CASE WHEN p_success THEN NULL ELSE left(p_error_code, 100) END,
    CASE WHEN p_success THEN NULL ELSE left(p_error_message, 1000) END
  );
END;
$$;

-- Apply one already-leased event as an atomic CRM projection. This function
-- only copies marketplace-owned fields and never mutates Billing records.
CREATE OR REPLACE FUNCTION public.apply_crm_shongre_event(
  p_inbox_id UUID,
  p_workspace_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE event_row public.crm_shongre_events%ROWTYPE;
DECLARE account_reference public.crm_external_references%ROWTYPE;
DECLARE contact_reference public.crm_external_references%ROWTYPE;
DECLARE account_projection_id UUID;
DECLARE contact_projection_id UUID;
DECLARE organization_id UUID;
DECLARE owner_user_id UUID;
DECLARE owner_name TEXT;
DECLARE contact_first_name TEXT;
DECLARE contact_last_name TEXT;
DECLARE activity_title TEXT;
BEGIN
  SELECT * INTO event_row
  FROM public.crm_shongre_events
  WHERE id = p_inbox_id
  FOR UPDATE;
  IF NOT FOUND OR event_row.status <> 'leased' THEN
    RAISE EXCEPTION 'CRM integration event must be leased before application' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.crm_workspaces workspace
    WHERE workspace.id = p_workspace_id AND workspace.tenant_id = event_row.tenant_id
  ) THEN
    RAISE EXCEPTION 'CRM workspace does not belong to event tenant' USING ERRCODE = '42501';
  END IF;

  organization_id := NULLIF(event_row.payload->>'organizationId', '')::UUID;
  owner_user_id := NULLIF(event_row.payload->>'ownerUserId', '')::UUID;

  IF event_row.event_type IN (
    'professional.created','professional.verified','organization.updated'
  ) THEN
    IF organization_id IS NULL OR owner_user_id IS NULL THEN
      RAISE EXCEPTION 'professional event requires organizationId and ownerUserId' USING ERRCODE = '22023';
    END IF;
    SELECT * INTO account_reference
    FROM public.crm_external_references reference
    WHERE reference.tenant_id = event_row.tenant_id
      AND reference.source_system = 'shongre'
      AND reference.source_entity_type = 'organization'
      AND reference.source_entity_id = organization_id::TEXT;

    IF account_reference.id IS NULL THEN
      INSERT INTO public.crm_accounts (
        tenant_id, workspace_id, owner_id, name, legal_name, email, phone,
        country, region, city, postal_code, address, market_code, lifecycle,
        source, source_detail, custom_values
      ) VALUES (
        event_row.tenant_id, p_workspace_id, owner_user_id,
        COALESCE(NULLIF(event_row.payload->>'name',''), event_row.payload->>'legalName'),
        NULLIF(event_row.payload->>'legalName',''),
        NULLIF(event_row.payload->>'email',''), NULLIF(event_row.payload->>'phone',''),
        COALESCE(NULLIF(event_row.payload->>'country',''), 'FR'),
        NULLIF(event_row.payload->>'region',''), NULLIF(event_row.payload->>'city',''),
        NULLIF(event_row.payload->>'postalCode',''), NULLIF(event_row.payload->>'address',''),
        COALESCE(NULLIF(event_row.payload->>'marketCode',''), 'FR'),
        CASE WHEN COALESCE((event_row.payload->>'verified')::BOOLEAN, FALSE)
             THEN 'qualified' ELSE 'prospect' END,
        'shongre_adapter', event_row.event_type,
        jsonb_build_object('shongre', jsonb_build_object(
          'organizationId', organization_id, 'verified',
          COALESCE((event_row.payload->>'verified')::BOOLEAN, FALSE)
        ))
      ) RETURNING id INTO account_projection_id;
      INSERT INTO public.crm_external_references (
        tenant_id, crm_entity_type, crm_entity_id, source_system,
        source_entity_type, source_entity_id, metadata
      ) VALUES (
        event_row.tenant_id, 'account', account_projection_id, 'shongre',
        'organization', organization_id::TEXT,
        jsonb_build_object('lastEventId', event_row.event_id)
      );
    ELSE
      account_projection_id := account_reference.crm_entity_id;
      UPDATE public.crm_accounts
      SET owner_id = owner_user_id,
          name = COALESCE(NULLIF(event_row.payload->>'name',''), name),
          legal_name = COALESCE(NULLIF(event_row.payload->>'legalName',''), legal_name),
          email = NULLIF(event_row.payload->>'email',''),
          phone = NULLIF(event_row.payload->>'phone',''),
          country = COALESCE(NULLIF(event_row.payload->>'country',''), country),
          region = NULLIF(event_row.payload->>'region',''),
          city = NULLIF(event_row.payload->>'city',''),
          postal_code = NULLIF(event_row.payload->>'postalCode',''),
          address = NULLIF(event_row.payload->>'address',''),
          market_code = COALESCE(NULLIF(event_row.payload->>'marketCode',''), market_code),
          lifecycle = CASE
            WHEN lifecycle = 'customer' THEN lifecycle
            WHEN COALESCE((event_row.payload->>'verified')::BOOLEAN, FALSE) THEN 'qualified'
            ELSE lifecycle
          END,
          source_detail = event_row.event_type,
          custom_values = jsonb_set(
            custom_values, '{shongre}',
            jsonb_build_object('organizationId', organization_id, 'verified',
              COALESCE((event_row.payload->>'verified')::BOOLEAN, FALSE)), TRUE
          )
      WHERE tenant_id = event_row.tenant_id AND id = account_projection_id;
      UPDATE public.crm_external_references
      SET metadata = metadata || jsonb_build_object('lastEventId', event_row.event_id)
      WHERE id = account_reference.id;
    END IF;

    SELECT * INTO contact_reference
    FROM public.crm_external_references reference
    WHERE reference.tenant_id = event_row.tenant_id
      AND reference.source_system = 'shongre'
      AND reference.source_entity_type = 'user'
      AND reference.source_entity_id = owner_user_id::TEXT;
    owner_name := COALESCE(NULLIF(event_row.payload->>'ownerName',''), 'Contact Shongre');
    contact_first_name := split_part(owner_name, ' ', 1);
    contact_last_name := NULLIF(
      btrim(substring(owner_name FROM char_length(contact_first_name) + 1)), ''
    );
    IF contact_last_name IS NULL THEN contact_last_name := '—'; END IF;

    IF contact_reference.id IS NULL THEN
      INSERT INTO public.crm_contacts (
        tenant_id, workspace_id, owner_id, first_name, last_name, email, phone,
        country, lifecycle, source, source_detail
      ) VALUES (
        event_row.tenant_id, p_workspace_id, owner_user_id,
        contact_first_name, contact_last_name,
        NULLIF(event_row.payload->>'email',''), NULLIF(event_row.payload->>'phone',''),
        COALESCE(NULLIF(event_row.payload->>'country',''), 'FR'),
        CASE WHEN COALESCE((event_row.payload->>'verified')::BOOLEAN, FALSE)
             THEN 'qualified' ELSE 'prospect' END,
        'shongre_adapter', event_row.event_type
      ) RETURNING id INTO contact_projection_id;
      INSERT INTO public.crm_external_references (
        tenant_id, crm_entity_type, crm_entity_id, source_system,
        source_entity_type, source_entity_id, metadata
      ) VALUES (
        event_row.tenant_id, 'contact', contact_projection_id, 'shongre', 'user',
        owner_user_id::TEXT, jsonb_build_object('lastEventId', event_row.event_id)
      );
    ELSE
      contact_projection_id := contact_reference.crm_entity_id;
      UPDATE public.crm_contacts
      SET first_name = contact_first_name,
          last_name = contact_last_name,
          email = NULLIF(event_row.payload->>'email',''),
          phone = NULLIF(event_row.payload->>'phone',''),
          country = COALESCE(NULLIF(event_row.payload->>'country',''), country),
          lifecycle = CASE
            WHEN lifecycle = 'customer' THEN lifecycle
            WHEN COALESCE((event_row.payload->>'verified')::BOOLEAN, FALSE) THEN 'qualified'
            ELSE lifecycle
          END,
          source_detail = event_row.event_type
      WHERE tenant_id = event_row.tenant_id AND id = contact_projection_id;
    END IF;
    INSERT INTO public.crm_contact_accounts (
      tenant_id, contact_id, account_id, relationship_role, is_primary,
      metadata
    ) VALUES (
      event_row.tenant_id, contact_projection_id, account_projection_id, 'Owner', TRUE,
      jsonb_build_object('source', 'shongre')
    ) ON CONFLICT (contact_id, account_id, relationship_role) DO UPDATE
      SET is_primary = TRUE;
    activity_title := CASE event_row.event_type
      WHEN 'professional.created' THEN 'Professionnel Shongre synchronisé'
      WHEN 'professional.verified' THEN 'Professionnel Shongre vérifié'
      ELSE 'Organisation Shongre mise à jour'
    END;
  ELSIF event_row.event_type IN (
    'subscription.started','subscription.upgraded','subscription.cancelled',
    'subscription.payment_failed'
  ) THEN
    IF organization_id IS NULL THEN
      RAISE EXCEPTION 'subscription event requires organizationId' USING ERRCODE = '22023';
    END IF;
    SELECT * INTO account_reference
    FROM public.crm_external_references reference
    WHERE reference.tenant_id = event_row.tenant_id
      AND reference.source_system = 'shongre'
      AND reference.source_entity_type = 'organization'
      AND reference.source_entity_id = organization_id::TEXT;
    IF account_reference.id IS NULL THEN
      RAISE EXCEPTION 'CRM account projection is not ready' USING ERRCODE = '40001';
    END IF;
    account_projection_id := account_reference.crm_entity_id;
    UPDATE public.crm_external_references
    SET metadata = jsonb_set(
      metadata, '{subscription}', event_row.payload - 'ownerUserId', TRUE
    ) || jsonb_build_object('lastEventId', event_row.event_id)
    WHERE id = account_reference.id;
    IF event_row.event_type IN ('subscription.started','subscription.upgraded') THEN
      UPDATE public.crm_accounts SET lifecycle = 'customer'
      WHERE tenant_id = event_row.tenant_id AND id = account_projection_id;
    END IF;
    activity_title := CASE event_row.event_type
      WHEN 'subscription.started' THEN 'Abonnement Shongre activé'
      WHEN 'subscription.upgraded' THEN 'Abonnement Shongre mis à niveau'
      WHEN 'subscription.cancelled' THEN 'Abonnement Shongre résilié'
      ELSE 'Paiement d’abonnement Shongre échoué'
    END;
  ELSE
    RAISE EXCEPTION 'unsupported CRM Shongre event type' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.crm_activities (
    tenant_id, workspace_id, actor_user_id, entity_type, entity_id,
    activity_type, title, description, occurred_at, external_message_id,
    is_ai_generated
  ) VALUES (
    event_row.tenant_id, p_workspace_id, owner_user_id, 'account', account_projection_id,
    'EXTERNAL_EVENT', activity_title,
    'Événement canonique ' || event_row.event_type || ' reçu via l’adaptateur Shongre.',
    event_row.occurred_at, event_row.event_id::TEXT, FALSE
  ) ON CONFLICT (tenant_id, external_message_id)
    WHERE activity_type = 'EXTERNAL_EVENT' AND external_message_id IS NOT NULL
    DO NOTHING;
  INSERT INTO public.crm_audit_events (
    tenant_id, actor_id, action, entity_type, entity_id, changed_fields,
    safe_context, correlation_id, occurred_at
  ) VALUES (
    event_row.tenant_id, NULL, 'crm.shongre_event.applied', 'account', account_projection_id,
    ARRAY['external_reference','activity'],
    jsonb_build_object('eventType', event_row.event_type, 'payloadVersion', event_row.payload_version),
    event_row.event_id::TEXT, now()
  ) ON CONFLICT (tenant_id, correlation_id, action)
    WHERE action = 'crm.shongre_event.applied' DO NOTHING;
  RETURN jsonb_build_object(
    'accountId', account_projection_id, 'contactId', contact_projection_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_crm_organization_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE owner_profile public.profiles%ROWTYPE;
DECLARE emitted_type TEXT;
BEGIN
  SELECT * INTO owner_profile FROM public.profiles WHERE id = NEW.owner_id;
  emitted_type := CASE
    WHEN TG_OP = 'INSERT' THEN 'professional.created'
    WHEN NEW.is_verified AND NOT OLD.is_verified THEN 'professional.verified'
    ELSE 'organization.updated'
  END;
  INSERT INTO public.crm_shongre_events (
    tenant_id, event_id, event_type, occurred_at, payload_version,
    source, idempotency_key, payload
  ) VALUES (
    NEW.id, gen_random_uuid(), emitted_type, now(), 1, 'shongre',
    'organization:' || NEW.id::TEXT || ':' || emitted_type || ':' || extract(epoch FROM NEW.updated_at)::TEXT,
    jsonb_build_object(
      'organizationId', NEW.id, 'ownerUserId', NEW.owner_id,
      'ownerName', owner_profile.name, 'name', COALESCE(NEW.trade_name, NEW.legal_name),
      'legalName', NEW.legal_name, 'email', owner_profile.email,
      'phone', owner_profile.phone, 'country', NEW.country, 'marketCode', NEW.country,
      'region', owner_profile.region, 'city', NEW.city, 'postalCode', NEW.postal_code,
      'address', NEW.registered_address, 'verified', NEW.is_verified
    )
  ) ON CONFLICT (tenant_id, idempotency_key) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS organizations_publish_crm_event ON public.organizations;
CREATE TRIGGER organizations_publish_crm_event
AFTER INSERT OR UPDATE OF legal_name, trade_name, owner_id, registered_address,
  city, postal_code, country, is_verified
ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.publish_crm_organization_event();

CREATE OR REPLACE FUNCTION public.publish_crm_subscription_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE tenant UUID;
DECLARE mapped_type TEXT;
BEGIN
  mapped_type := CASE NEW.event_type
    WHEN 'activated' THEN 'subscription.started'
    WHEN 'changed' THEN 'subscription.upgraded'
    WHEN 'cancelled' THEN 'subscription.cancelled'
    WHEN 'payment_failed' THEN 'subscription.payment_failed'
    ELSE NULL
  END;
  IF mapped_type IS NULL THEN RETURN NEW; END IF;
  SELECT organization.id INTO tenant
  FROM public.organizations organization
  WHERE organization.owner_id = NEW.account_id
  ORDER BY organization.created_at
  LIMIT 1;
  IF tenant IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.crm_shongre_events (
    tenant_id, event_id, event_type, occurred_at, payload_version,
    source, idempotency_key, payload
  ) VALUES (
    tenant, gen_random_uuid(), mapped_type, NEW.occurred_at, 1, 'shongre',
    'subscription-event:' || NEW.id::TEXT,
    jsonb_build_object(
      'organizationId', tenant, 'ownerUserId', NEW.account_id,
      'subscriptionId', NEW.subscription_id, 'subscriptionEventId', NEW.id,
      'fromStatus', NEW.from_status, 'toStatus', NEW.to_status,
      'billingMetadata', NEW.metadata
    )
  ) ON CONFLICT (tenant_id, idempotency_key) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS monetization_subscription_events_publish_crm_event
  ON public.monetization_subscription_events;
CREATE TRIGGER monetization_subscription_events_publish_crm_event
AFTER INSERT ON public.monetization_subscription_events
FOR EACH ROW EXECUTE FUNCTION public.publish_crm_subscription_event();

-- Existing organizations are queued once so enabling the worker does not only
-- synchronize records created after this migration.
INSERT INTO public.crm_shongre_events (
  tenant_id, event_id, event_type, occurred_at, payload_version,
  source, idempotency_key, payload
)
SELECT organization.id, gen_random_uuid(), 'professional.created',
       organization.created_at, 1, 'shongre',
       'backfill:organization:' || organization.id::TEXT,
       jsonb_build_object(
         'organizationId', organization.id, 'ownerUserId', organization.owner_id,
         'ownerName', profile.name, 'name', COALESCE(organization.trade_name, organization.legal_name),
         'legalName', organization.legal_name, 'email', profile.email,
         'phone', profile.phone, 'country', organization.country,
         'marketCode', organization.country, 'region', profile.region,
         'city', organization.city, 'postalCode', organization.postal_code,
         'address', organization.registered_address, 'verified', organization.is_verified
       )
FROM public.organizations organization
JOIN public.profiles profile ON profile.id = organization.owner_id
ON CONFLICT (tenant_id, idempotency_key) DO NOTHING;

ALTER TABLE public.crm_shongre_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_shongre_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.crm_shongre_event_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_shongre_event_attempts FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.crm_shongre_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.crm_shongre_event_attempts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_shongre_events TO service_role;
GRANT SELECT, INSERT ON public.crm_shongre_event_attempts TO service_role;

REVOKE ALL ON FUNCTION public.enqueue_crm_shongre_event(UUID, UUID, TEXT, TIMESTAMPTZ, SMALLINT, TEXT, TEXT, JSONB)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_crm_shongre_events(TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_crm_shongre_event(UUID, TEXT, BOOLEAN, BOOLEAN, TEXT, TEXT, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_crm_shongre_event(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.publish_crm_organization_event()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.publish_crm_subscription_event()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_crm_shongre_event(UUID, UUID, TEXT, TIMESTAMPTZ, SMALLINT, TEXT, TEXT, JSONB)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_crm_shongre_events(TEXT, INTEGER, INTEGER)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_crm_shongre_event(UUID, TEXT, BOOLEAN, BOOLEAN, TEXT, TEXT, TIMESTAMPTZ)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_crm_shongre_event(UUID, UUID)
  TO service_role;
