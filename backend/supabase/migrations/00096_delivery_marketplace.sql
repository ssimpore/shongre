-- Market-scoped Delivery & courier marketplace. Disabled until an exact
-- delivery.marketplace market rule is approved through the control plane.

INSERT INTO public.feature_flags (
  key, description, owner, default_enabled, exposure, lifecycle
) VALUES (
  'delivery.marketplace',
  'Activates the delivery and courier marketplace in one operationally ready market.',
  'Marketplace Operations',
  FALSE,
  'public',
  'active'
) ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  owner = EXCLUDED.owner,
  default_enabled = FALSE,
  exposure = EXCLUDED.exposure,
  lifecycle = EXCLUDED.lifecycle,
  updated_at = NOW();

INSERT INTO public.access_capabilities (id, is_sensitive)
VALUES
  ('delivery.read', FALSE),
  ('delivery.request.manage.own', FALSE),
  ('delivery.courier.manage.own', FALSE),
  ('delivery.application.manage.own', FALSE),
  ('delivery.admin.manage', TRUE),
  ('delivery.moderate', TRUE)
ON CONFLICT (id) DO UPDATE SET is_sensitive = EXCLUDED.is_sensitive;

INSERT INTO public.access_role_grants (role_kind, role_key, capability_id)
SELECT 'account_family', family, capability
FROM unnest(ARRAY['individual','professional']::TEXT[]) AS family
CROSS JOIN unnest(ARRAY[
  'delivery.read', 'delivery.request.manage.own',
  'delivery.courier.manage.own', 'delivery.application.manage.own'
]::TEXT[]) AS capability
ON CONFLICT DO NOTHING;

INSERT INTO public.access_role_grants (role_kind, role_key, capability_id)
SELECT 'staff_role', staff_role, 'delivery.admin.manage'
FROM unnest(ARRAY['operations','market_manager','admin','owner']::TEXT[]) AS staff_role
ON CONFLICT DO NOTHING;

INSERT INTO public.access_role_grants (role_kind, role_key, capability_id)
SELECT 'staff_role', staff_role, 'delivery.moderate'
FROM unnest(ARRAY['moderator','trust_safety']::TEXT[]) AS staff_role
ON CONFLICT DO NOTHING;

-- Keep the database Staff/customer separation predicate in lockstep with the
-- canonical capability registry. This migration extends the immutable 00083
-- baseline instead of rewriting migration history.
CREATE OR REPLACE FUNCTION public.is_customer_marketplace_capability(
  required_capability TEXT
)
RETURNS BOOLEAN AS $$
  SELECT required_capability = ANY(ARRAY[
    'marketplace.customer.access',
    'profile.read', 'profile.update.own',
    'seller.profile.read', 'seller.profile.update.own',
    'listing.read', 'listing.create', 'listing.update.own',
    'listing.delete.own', 'listing.publish', 'listing.mark_reserved',
    'listing.mark_sold', 'listing.promote', 'listing.bulk_import',
    'listing.feature',
    'message.read.own', 'message.send', 'message.block',
    'conversation.manage.own', 'favorite.manage.own',
    'saved_search.manage.own', 'order.create', 'order.read.own',
    'order.manage.seller', 'finance.account.read.own',
    'finance.organization.read.own', 'payment.initiate',
    'review.create', 'review.update.own', 'store.manage.own',
    'store.analytics.read.own', 'store.customization.manage',
    'subscription.manage.own', 'subscription.upgrade', 'report.create',
    'course.read', 'course.request.create', 'course.profile.manage.own',
    'course.offer.manage.own', 'course.lead.read.own',
    'course.lead.respond.own', 'course.organization.manage.own',
    'course.booking.create', 'auto.read', 'auto.vehicle.manage.own',
    'auto.dealer.manage.own', 'auto.lead.manage.own',
    'auto.inventory.import.own', 'immo.read',
    'immo.property.manage.own', 'immo.agency.manage.own',
    'immo.lead.manage.own', 'immo.inventory.import.own',
    'employment.read', 'employment.candidate.manage.own',
    'employment.job.manage.own', 'employment.recruiter.manage.own',
    'employment.application.manage.own', 'employment.import.own',
    'delivery.read', 'delivery.request.manage.own',
    'delivery.courier.manage.own', 'delivery.application.manage.own'
  ]::TEXT[]);
$$ LANGUAGE SQL IMMUTABLE PARALLEL SAFE;

CREATE TABLE public.delivery_courier_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (
    status IN ('inactive', 'active', 'paused', 'suspended')
  ),
  vehicle_types TEXT[] NOT NULL CHECK (
    cardinality(vehicle_types) BETWEEN 1 AND 5
    AND vehicle_types <@ ARRAY['bicycle','cargo_bicycle','scooter','car','van']::TEXT[]
  ),
  max_weight_grams BIGINT NOT NULL CHECK (max_weight_grams BETWEEN 1 AND 2000000),
  availability_note TEXT CHECK (char_length(availability_note) <= 500),
  opportunity_notifications BOOLEAN NOT NULL DEFAULT FALSE,
  compliance_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    compliance_status IN ('pending', 'eligible', 'rejected', 'suspended')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, market_code)
);
CREATE INDEX delivery_courier_profiles_matching_idx
  ON public.delivery_courier_profiles (market_code, status, opportunity_notifications)
  WHERE status = 'active' AND opportunity_notifications;

CREATE TABLE public.delivery_courier_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_profile_id UUID NOT NULL REFERENCES public.delivery_courier_profiles(id) ON DELETE CASCADE,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  city TEXT NOT NULL CHECK (char_length(btrim(city)) BETWEEN 1 AND 120),
  postal_code TEXT NOT NULL CHECK (char_length(btrim(postal_code)) BETWEEN 2 AND 20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (courier_profile_id, postal_code)
);
CREATE INDEX delivery_courier_areas_market_postal_idx
  ON public.delivery_courier_areas (market_code, postal_code, courier_profile_id);

CREATE TABLE public.delivery_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  origin TEXT NOT NULL CHECK (origin IN ('standalone', 'order')),
  source_order_id UUID REFERENCES public.orders(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft','pending_review','open','assigned','picked_up','in_transit',
    'delivered','completed','cancelled','expired','suspended','disputed'
  )),
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 5 AND 120),
  description TEXT NOT NULL CHECK (char_length(btrim(description)) BETWEEN 10 AND 2000),
  pickup_city TEXT NOT NULL CHECK (char_length(btrim(pickup_city)) BETWEEN 1 AND 120),
  pickup_postal_code TEXT NOT NULL CHECK (char_length(btrim(pickup_postal_code)) BETWEEN 2 AND 20),
  dropoff_city TEXT NOT NULL CHECK (char_length(btrim(dropoff_city)) BETWEEN 1 AND 120),
  dropoff_postal_code TEXT NOT NULL CHECK (char_length(btrim(dropoff_postal_code)) BETWEEN 2 AND 20),
  pickup_starts_at TIMESTAMPTZ NOT NULL,
  pickup_ends_at TIMESTAMPTZ NOT NULL,
  delivery_starts_at TIMESTAMPTZ NOT NULL,
  delivery_ends_at TIMESTAMPTZ NOT NULL,
  package_type TEXT NOT NULL CHECK (char_length(btrim(package_type)) BETWEEN 1 AND 80),
  package_count SMALLINT NOT NULL CHECK (package_count BETWEEN 1 AND 100),
  approximate_weight_grams BIGINT NOT NULL CHECK (approximate_weight_grams BETWEEN 1 AND 2000000),
  dimensions_cm JSONB CHECK (dimensions_cm IS NULL OR jsonb_typeof(dimensions_cm) = 'object'),
  handling_requirements TEXT[] NOT NULL DEFAULT '{}',
  required_vehicle_type TEXT CHECK (
    required_vehicle_type IS NULL OR required_vehicle_type IN ('bicycle','cargo_bicycle','scooter','car','van')
  ),
  loading_assistance_required BOOLEAN NOT NULL DEFAULT FALSE,
  budget_amount_minor BIGINT CHECK (budget_amount_minor IS NULL OR budget_amount_minor >= 0),
  budget_currency VARCHAR(3),
  public_instructions TEXT CHECK (char_length(public_instructions) <= 1000),
  selected_application_id UUID,
  application_count INTEGER NOT NULL DEFAULT 0 CHECK (application_count >= 0),
  idempotency_key TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  expires_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (pickup_starts_at < pickup_ends_at),
  CHECK (delivery_starts_at < delivery_ends_at),
  CHECK ((budget_amount_minor IS NULL) = (budget_currency IS NULL)),
  CHECK ((origin = 'order') = (source_order_id IS NOT NULL)),
  UNIQUE (requester_id, market_code, idempotency_key)
);
CREATE INDEX delivery_requests_public_search_idx
  ON public.delivery_requests (market_code, pickup_postal_code, created_at DESC, id)
  WHERE status = 'open';
CREATE INDEX delivery_requests_requester_idx
  ON public.delivery_requests (requester_id, market_code, updated_at DESC);
CREATE UNIQUE INDEX delivery_requests_active_order_idx
  ON public.delivery_requests (source_order_id)
  WHERE source_order_id IS NOT NULL
    AND status IN ('draft','pending_review','open','assigned','picked_up','in_transit','delivered','disputed');

CREATE TABLE public.delivery_request_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.delivery_requests(id) ON DELETE CASCADE,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  kind TEXT NOT NULL CHECK (kind IN ('pickup', 'dropoff')),
  street TEXT NOT NULL CHECK (char_length(btrim(street)) BETWEEN 1 AND 240),
  complement TEXT CHECK (char_length(complement) <= 240),
  city TEXT NOT NULL CHECK (char_length(btrim(city)) BETWEEN 1 AND 120),
  postal_code TEXT NOT NULL CHECK (char_length(btrim(postal_code)) BETWEEN 2 AND 20),
  contact_name TEXT NOT NULL CHECK (char_length(btrim(contact_name)) BETWEEN 1 AND 120),
  contact_phone TEXT NOT NULL CHECK (char_length(btrim(contact_phone)) BETWEEN 6 AND 40),
  access_instructions TEXT CHECK (char_length(access_instructions) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (request_id, kind)
);
CREATE INDEX delivery_request_stops_market_request_idx
  ON public.delivery_request_stops (market_code, request_id);

CREATE TABLE public.delivery_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.delivery_requests(id) ON DELETE CASCADE,
  courier_profile_id UUID NOT NULL REFERENCES public.delivery_courier_profiles(id) ON DELETE RESTRICT,
  courier_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (
    status IN ('submitted','withdrawn','accepted','rejected','expired')
  ),
  availability_note TEXT NOT NULL CHECK (char_length(btrim(availability_note)) BETWEEN 1 AND 500),
  message TEXT NOT NULL CHECK (char_length(btrim(message)) BETWEEN 1 AND 1000),
  quote_amount_minor BIGINT CHECK (quote_amount_minor IS NULL OR quote_amount_minor >= 0),
  quote_currency VARCHAR(3),
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((quote_amount_minor IS NULL) = (quote_currency IS NULL)),
  UNIQUE (courier_user_id, request_id, idempotency_key)
);
CREATE UNIQUE INDEX delivery_applications_active_courier_request_idx
  ON public.delivery_applications (request_id, courier_user_id)
  WHERE status IN ('submitted', 'accepted');
CREATE UNIQUE INDEX delivery_applications_accepted_request_idx
  ON public.delivery_applications (request_id)
  WHERE status = 'accepted';
CREATE INDEX delivery_applications_courier_idx
  ON public.delivery_applications (courier_user_id, market_code, updated_at DESC);

ALTER TABLE public.delivery_requests
  ADD CONSTRAINT delivery_requests_selected_application_fkey
  FOREIGN KEY (selected_application_id) REFERENCES public.delivery_applications(id) ON DELETE RESTRICT;

CREATE TABLE public.delivery_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.delivery_requests(id) ON DELETE RESTRICT,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload) = 'object'),
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX delivery_events_request_idx
  ON public.delivery_events (request_id, created_at, id);

CREATE TABLE public.delivery_match_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.delivery_requests(id) ON DELETE CASCADE,
  courier_profile_id UUID NOT NULL REFERENCES public.delivery_courier_profiles(id) ON DELETE CASCADE,
  request_version INTEGER NOT NULL CHECK (request_version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (request_id, courier_profile_id, request_version)
);

CREATE TABLE public.delivery_domain_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.delivery_requests(id) ON DELETE CASCADE,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload) = 'object'),
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','leased','processed','retry','dead_letter')),
  attempts SMALLINT NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 10),
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lease_owner TEXT,
  lease_expires_at TIMESTAMPTZ,
  last_error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX delivery_domain_outbox_claim_idx
  ON public.delivery_domain_outbox (available_at, created_at)
  WHERE status IN ('pending','retry','leased');

-- Delivery UGC enters the canonical report/moderation casework boundary.
ALTER TABLE public.reports
  ADD COLUMN delivery_request_id UUID
  REFERENCES public.delivery_requests(id) ON DELETE RESTRICT;
CREATE INDEX reports_delivery_request_idx
  ON public.reports (delivery_request_id, created_at DESC)
  WHERE delivery_request_id IS NOT NULL;

ALTER TABLE public.moderation_cases
  ADD COLUMN delivery_request_id UUID
  REFERENCES public.delivery_requests(id) ON DELETE RESTRICT;
ALTER TABLE public.moderation_cases
  DROP CONSTRAINT IF EXISTS moderation_cases_target_type_check;
ALTER TABLE public.moderation_cases
  DROP CONSTRAINT IF EXISTS moderation_cases_check;
ALTER TABLE public.moderation_cases
  ADD CONSTRAINT moderation_cases_target_type_check
  CHECK (target_type IN ('listing', 'user', 'delivery_request'));
ALTER TABLE public.moderation_cases
  ADD CONSTRAINT moderation_cases_target_check CHECK (
    (target_type = 'listing' AND listing_id IS NOT NULL
      AND reported_user_id IS NULL AND delivery_request_id IS NULL)
    OR (target_type = 'user' AND reported_user_id IS NOT NULL
      AND listing_id IS NULL AND delivery_request_id IS NULL)
    OR (target_type = 'delivery_request' AND delivery_request_id IS NOT NULL
      AND listing_id IS NULL AND reported_user_id IS NULL)
  );
CREATE INDEX moderation_cases_target_delivery_idx
  ON public.moderation_cases (delivery_request_id, created_at DESC)
  WHERE delivery_request_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_moderation_case_from_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE created_case UUID;
BEGIN
  INSERT INTO public.moderation_cases (
    report_id, reporter_id, target_type, listing_id, reported_user_id,
    delivery_request_id, category, severity, created_at, updated_at
  ) VALUES (
    NEW.id,
    NEW.reporter_id,
    CASE
      WHEN NEW.listing_id IS NOT NULL THEN 'listing'
      WHEN NEW.delivery_request_id IS NOT NULL THEN 'delivery_request'
      ELSE 'user'
    END,
    NEW.listing_id,
    NEW.reported_user_id,
    NEW.delivery_request_id,
    NEW.reason,
    CASE WHEN NEW.reason IN ('fraud', 'counterfeit', 'prohibited')
      THEN 'high' ELSE 'medium' END,
    NEW.created_at,
    NEW.created_at
  )
  ON CONFLICT (report_id) DO NOTHING
  RETURNING id INTO created_case;
  IF created_case IS NOT NULL THEN
    INSERT INTO public.moderation_case_events (
      case_id, actor_id, event_type, from_status, to_status, reason
    ) VALUES (created_case, NEW.reporter_id, 'reported', NULL, 'open', NEW.details);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_own_moderation_cases(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  target_type TEXT,
  category TEXT,
  status TEXT,
  resolution_action TEXT,
  resolution_reason TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    c.id, c.target_type, c.category, c.status, c.resolution_action,
    c.resolution_reason, c.resolved_at, c.created_at
  FROM public.moderation_cases c
  LEFT JOIN public.listings l ON l.id = c.listing_id
  LEFT JOIN public.delivery_requests d ON d.id = c.delivery_request_id
  WHERE c.reported_user_id = p_user_id
     OR l.seller_id = p_user_id
     OR d.requester_id = p_user_id
  ORDER BY c.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.claim_delivery_domain_outbox(
  p_worker_id TEXT,
  p_limit INTEGER,
  p_lease_seconds INTEGER
) RETURNS SETOF public.delivery_domain_outbox
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  RETURN QUERY
  WITH claimable AS (
    SELECT outbox.id
    FROM public.delivery_domain_outbox AS outbox
    WHERE outbox.available_at <= NOW()
      AND (
        outbox.status IN ('pending', 'retry')
        OR (outbox.status = 'leased' AND outbox.lease_expires_at <= NOW())
      )
      AND outbox.attempts < 10
    ORDER BY outbox.available_at, outbox.created_at, outbox.id
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(p_limit, 1), 200)
  )
  UPDATE public.delivery_domain_outbox AS outbox
  SET status = 'leased', attempts = outbox.attempts + 1,
      lease_owner = p_worker_id,
      lease_expires_at = NOW() + make_interval(secs => LEAST(GREATEST(p_lease_seconds, 30), 900)),
      updated_at = NOW()
  FROM claimable
  WHERE outbox.id = claimable.id
  RETURNING outbox.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_delivery_domain_outbox(
  p_event_id UUID,
  p_worker_id TEXT,
  p_success BOOLEAN,
  p_error_code TEXT DEFAULT NULL,
  p_retry_at TIMESTAMPTZ DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  changed INTEGER;
BEGIN
  UPDATE public.delivery_domain_outbox
  SET status = CASE
        WHEN p_success THEN 'processed'
        WHEN attempts >= 10 THEN 'dead_letter'
        ELSE 'retry'
      END,
      available_at = CASE
        WHEN p_success OR attempts >= 10 THEN available_at
        ELSE COALESCE(p_retry_at, NOW() + INTERVAL '30 seconds')
      END,
      last_error_code = CASE WHEN p_success THEN NULL ELSE LEFT(p_error_code, 120) END,
      lease_owner = NULL,
      lease_expires_at = NULL,
      updated_at = NOW()
  WHERE id = p_event_id AND status = 'leased' AND lease_owner = p_worker_id;
  GET DIAGNOSTICS changed = ROW_COUNT;
  RETURN changed = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_delivery_courier_profile(
  p_user_id UUID,
  p_market_code VARCHAR(2),
  p_status TEXT,
  p_vehicle_types TEXT[],
  p_max_weight_grams BIGINT,
  p_availability_note TEXT,
  p_opportunity_notifications BOOLEAN,
  p_service_localities JSONB
) RETURNS SETOF public.delivery_courier_profiles
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  saved_profile public.delivery_courier_profiles%ROWTYPE;
BEGIN
  IF jsonb_typeof(p_service_localities) <> 'array'
     OR jsonb_array_length(p_service_localities) NOT BETWEEN 1 AND 20 THEN
    RAISE EXCEPTION 'DELIVERY_NOT_ELIGIBLE' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.delivery_courier_profiles (
    user_id, market_code, status, vehicle_types, max_weight_grams,
    availability_note, opportunity_notifications, updated_at
  ) VALUES (
    p_user_id, p_market_code, p_status, p_vehicle_types, p_max_weight_grams,
    p_availability_note, p_opportunity_notifications, NOW()
  )
  ON CONFLICT (user_id, market_code) DO UPDATE SET
    status = EXCLUDED.status,
    vehicle_types = EXCLUDED.vehicle_types,
    max_weight_grams = EXCLUDED.max_weight_grams,
    availability_note = EXCLUDED.availability_note,
    opportunity_notifications = EXCLUDED.opportunity_notifications,
    updated_at = NOW()
  RETURNING * INTO saved_profile;

  DELETE FROM public.delivery_courier_areas
  WHERE courier_profile_id = saved_profile.id;
  INSERT INTO public.delivery_courier_areas (
    courier_profile_id, market_code, city, postal_code
  )
  SELECT
    saved_profile.id, p_market_code, locality.city, locality.postal_code
  FROM jsonb_to_recordset(p_service_localities)
    AS locality(city TEXT, postal_code TEXT);
  RETURN NEXT saved_profile;
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_delivery_request(
  p_request_id UUID,
  p_requester_id UUID
) RETURNS SETOF public.delivery_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  locked_request public.delivery_requests%ROWTYPE;
BEGIN
  SELECT * INTO locked_request FROM public.delivery_requests
  WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR locked_request.requester_id <> p_requester_id THEN
    RAISE EXCEPTION 'DELIVERY_NOT_ELIGIBLE' USING ERRCODE = 'P0001';
  END IF;
  IF locked_request.status = 'open' THEN
    RETURN NEXT locked_request;
    RETURN;
  END IF;
  IF locked_request.status NOT IN ('draft', 'pending_review') THEN
    RAISE EXCEPTION 'DELIVERY_REQUEST_NOT_OPEN' USING ERRCODE = 'P0001';
  END IF;
  IF locked_request.expires_at <= NOW() THEN
    RAISE EXCEPTION 'DELIVERY_REQUEST_EXPIRED' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.delivery_requests
  SET status = 'open', published_at = COALESCE(published_at, NOW()),
      version = version + 1, updated_at = NOW()
  WHERE id = p_request_id RETURNING * INTO locked_request;
  INSERT INTO public.delivery_events (
    request_id, market_code, actor_id, event_type, payload, idempotency_key
  ) VALUES (
    p_request_id, locked_request.market_code, p_requester_id,
    'delivery.request.opened', '{}'::jsonb,
    p_request_id::TEXT || ':opened:' || locked_request.version::TEXT
  );
  INSERT INTO public.delivery_domain_outbox (
    request_id, market_code, event_type, payload, idempotency_key
  ) VALUES (
    p_request_id, locked_request.market_code, 'delivery.request.opened',
    jsonb_build_object('requestId', p_request_id),
    p_request_id::TEXT || ':opened:' || locked_request.version::TEXT
  );
  RETURN NEXT locked_request;
END;
$$;

CREATE OR REPLACE FUNCTION public.withdraw_delivery_application(
  p_application_id UUID,
  p_courier_user_id UUID
) RETURNS SETOF public.delivery_applications
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  locked_application public.delivery_applications%ROWTYPE;
BEGIN
  SELECT * INTO locked_application FROM public.delivery_applications
  WHERE id = p_application_id AND courier_user_id = p_courier_user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'DELIVERY_NOT_ELIGIBLE' USING ERRCODE = 'P0001';
  END IF;
  IF locked_application.status = 'withdrawn' THEN
    RETURN NEXT locked_application;
    RETURN;
  END IF;
  IF locked_application.status <> 'submitted' THEN
    RAISE EXCEPTION 'DELIVERY_APPLICATION_CONFLICT' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.delivery_applications
  SET status = 'withdrawn', updated_at = NOW()
  WHERE id = p_application_id RETURNING * INTO locked_application;
  INSERT INTO public.delivery_events (
    request_id, market_code, actor_id, event_type, payload, idempotency_key
  ) VALUES (
    locked_application.request_id, locked_application.market_code,
    p_courier_user_id, 'delivery.application.withdrawn',
    jsonb_build_object('applicationId', p_application_id),
    p_application_id::TEXT || ':withdrawn'
  ) ON CONFLICT (idempotency_key) DO NOTHING;
  INSERT INTO public.delivery_domain_outbox (
    request_id, market_code, event_type, payload, idempotency_key
  ) VALUES (
    locked_application.request_id, locked_application.market_code,
    'delivery.application.withdrawn',
    jsonb_build_object('applicationId', p_application_id),
    p_application_id::TEXT || ':withdrawn'
  ) ON CONFLICT (idempotency_key) DO NOTHING;
  RETURN NEXT locked_application;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_delivery_application(
  p_request_id UUID,
  p_courier_profile_id UUID,
  p_courier_user_id UUID,
  p_market_code VARCHAR(2),
  p_availability_note TEXT,
  p_message TEXT,
  p_quote_amount_minor BIGINT,
  p_quote_currency VARCHAR(3),
  p_idempotency_key TEXT
) RETURNS SETOF public.delivery_applications
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  locked_request public.delivery_requests%ROWTYPE;
  locked_profile public.delivery_courier_profiles%ROWTYPE;
  existing_application public.delivery_applications%ROWTYPE;
  saved_application public.delivery_applications%ROWTYPE;
BEGIN
  SELECT * INTO locked_request FROM public.delivery_requests
  WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR locked_request.market_code <> p_market_code THEN
    RAISE EXCEPTION 'DELIVERY_NOT_ELIGIBLE' USING ERRCODE = 'P0001';
  END IF;
  IF locked_request.requester_id = p_courier_user_id THEN
    RAISE EXCEPTION 'DELIVERY_NOT_ELIGIBLE' USING ERRCODE = 'P0001';
  END IF;
  IF locked_request.status <> 'open' THEN
    RAISE EXCEPTION 'DELIVERY_REQUEST_NOT_OPEN' USING ERRCODE = 'P0001';
  END IF;
  IF locked_request.expires_at <= NOW() THEN
    RAISE EXCEPTION 'DELIVERY_REQUEST_EXPIRED' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE (blocker_id = locked_request.requester_id AND blocked_id = p_courier_user_id)
       OR (blocker_id = p_courier_user_id AND blocked_id = locked_request.requester_id)
  ) THEN
    RAISE EXCEPTION 'DELIVERY_NOT_ELIGIBLE' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO locked_profile FROM public.delivery_courier_profiles
  WHERE id = p_courier_profile_id
    AND user_id = p_courier_user_id
    AND market_code = p_market_code
  FOR UPDATE;
  IF NOT FOUND
     OR locked_profile.status <> 'active'
     OR locked_profile.compliance_status <> 'eligible'
     OR locked_profile.max_weight_grams < locked_request.approximate_weight_grams
     OR (
       locked_request.required_vehicle_type IS NOT NULL
       AND NOT locked_request.required_vehicle_type = ANY(locked_profile.vehicle_types)
     )
     OR NOT EXISTS (
       SELECT 1 FROM public.delivery_courier_areas AS area
       WHERE area.courier_profile_id = locked_profile.id
         AND area.market_code = p_market_code
         AND area.postal_code = locked_request.pickup_postal_code
     )
     OR NOT EXISTS (
       SELECT 1 FROM public.delivery_courier_areas AS area
       WHERE area.courier_profile_id = locked_profile.id
         AND area.market_code = p_market_code
         AND area.postal_code = locked_request.dropoff_postal_code
     ) THEN
    RAISE EXCEPTION 'DELIVERY_NOT_ELIGIBLE' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO existing_application FROM public.delivery_applications
  WHERE courier_user_id = p_courier_user_id
    AND request_id = p_request_id
    AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN NEXT existing_application;
    RETURN;
  END IF;

  INSERT INTO public.delivery_applications (
    request_id, courier_profile_id, courier_user_id, market_code,
    availability_note, message, quote_amount_minor, quote_currency,
    idempotency_key
  ) VALUES (
    p_request_id, p_courier_profile_id, p_courier_user_id, p_market_code,
    p_availability_note, p_message, p_quote_amount_minor, p_quote_currency,
    p_idempotency_key
  ) RETURNING * INTO saved_application;
  UPDATE public.delivery_requests
  SET application_count = application_count + 1, updated_at = NOW()
  WHERE id = p_request_id;
  INSERT INTO public.delivery_events (
    request_id, market_code, actor_id, event_type, payload, idempotency_key
  ) VALUES (
    p_request_id, p_market_code, p_courier_user_id,
    'delivery.application.submitted',
    jsonb_build_object('applicationId', saved_application.id),
    saved_application.id::TEXT || ':submitted'
  );
  INSERT INTO public.delivery_domain_outbox (
    request_id, market_code, event_type, payload, idempotency_key
  ) VALUES (
    p_request_id, p_market_code, 'delivery.application.submitted',
    jsonb_build_object('requestId', p_request_id, 'applicationId', saved_application.id),
    saved_application.id::TEXT || ':submitted'
  );
  RETURN NEXT saved_application;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_delivery_application(
  p_request_id UUID,
  p_application_id UUID,
  p_requester_id UUID,
  p_expected_version INTEGER
) RETURNS SETOF public.delivery_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  locked_request public.delivery_requests%ROWTYPE;
  locked_application public.delivery_applications%ROWTYPE;
BEGIN
  SELECT * INTO locked_request FROM public.delivery_requests
  WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR locked_request.requester_id <> p_requester_id THEN
    RAISE EXCEPTION 'DELIVERY_NOT_ELIGIBLE' USING ERRCODE = 'P0001';
  END IF;
  IF locked_request.status <> 'open' OR locked_request.expires_at <= NOW() THEN
    RAISE EXCEPTION 'DELIVERY_REQUEST_NOT_OPEN' USING ERRCODE = 'P0001';
  END IF;
  IF locked_request.version <> p_expected_version THEN
    RAISE EXCEPTION 'DELIVERY_ASSIGNMENT_CONFLICT' USING ERRCODE = '40001';
  END IF;
  SELECT application.* INTO locked_application
  FROM public.delivery_applications AS application
  JOIN public.delivery_courier_profiles AS courier
    ON courier.id = application.courier_profile_id
  WHERE application.id = p_application_id
    AND application.request_id = p_request_id
    AND application.status = 'submitted'
    AND application.market_code = locked_request.market_code
    AND courier.status = 'active'
    AND courier.compliance_status = 'eligible'
  FOR UPDATE OF application, courier;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'DELIVERY_APPLICATION_CONFLICT' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.delivery_applications
  SET status = CASE WHEN id = p_application_id THEN 'accepted' ELSE 'rejected' END,
      updated_at = NOW()
  WHERE request_id = p_request_id AND status = 'submitted';
  UPDATE public.delivery_requests
  SET status = 'assigned', selected_application_id = p_application_id,
      version = version + 1, updated_at = NOW()
  WHERE id = p_request_id RETURNING * INTO locked_request;
  INSERT INTO public.delivery_events (
    request_id, market_code, actor_id, event_type, payload, idempotency_key
  ) VALUES (
    p_request_id, locked_request.market_code, p_requester_id,
    'delivery.application.accepted',
    jsonb_build_object('applicationId', p_application_id),
    p_request_id::TEXT || ':application-accepted'
  ) ON CONFLICT (idempotency_key) DO NOTHING;
  INSERT INTO public.delivery_domain_outbox (
    request_id, market_code, event_type, payload, idempotency_key
  ) VALUES (
    p_request_id, locked_request.market_code, 'delivery.assignment.created',
    jsonb_build_object('applicationId', p_application_id),
    p_request_id::TEXT || ':assignment-created'
  ) ON CONFLICT (idempotency_key) DO NOTHING;
  RETURN NEXT locked_request;
END;
$$;

CREATE OR REPLACE FUNCTION public.transition_delivery_request(
  p_request_id UUID,
  p_actor_id UUID,
  p_expected_version INTEGER,
  p_status TEXT,
  p_note TEXT DEFAULT NULL
) RETURNS SETOF public.delivery_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  locked_request public.delivery_requests%ROWTYPE;
  selected_courier_id UUID;
  transition_allowed BOOLEAN := FALSE;
  actor_is_requester BOOLEAN := FALSE;
BEGIN
  SELECT * INTO locked_request FROM public.delivery_requests
  WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'DELIVERY_NOT_ELIGIBLE' USING ERRCODE = 'P0001';
  END IF;
  IF locked_request.selected_application_id IS NOT NULL THEN
    SELECT courier_user_id INTO selected_courier_id
    FROM public.delivery_applications
    WHERE id = locked_request.selected_application_id
    FOR SHARE;
  END IF;
  IF locked_request.requester_id <> p_actor_id
     AND selected_courier_id IS DISTINCT FROM p_actor_id THEN
    RAISE EXCEPTION 'DELIVERY_NOT_ELIGIBLE' USING ERRCODE = 'P0001';
  END IF;
  actor_is_requester := locked_request.requester_id = p_actor_id;
  IF locked_request.version <> p_expected_version THEN
    RAISE EXCEPTION 'DELIVERY_ASSIGNMENT_CONFLICT' USING ERRCODE = '40001';
  END IF;
  transition_allowed := CASE
    WHEN actor_is_requester THEN CASE locked_request.status
      WHEN 'draft' THEN p_status = 'cancelled'
      WHEN 'pending_review' THEN p_status = 'cancelled'
      WHEN 'open' THEN p_status = 'cancelled'
      WHEN 'assigned' THEN p_status IN ('cancelled','disputed')
      WHEN 'picked_up' THEN p_status IN ('cancelled','disputed')
      WHEN 'in_transit' THEN p_status = 'disputed'
      WHEN 'delivered' THEN p_status IN ('completed','disputed')
      WHEN 'suspended' THEN p_status = 'cancelled'
      WHEN 'disputed' THEN p_status IN ('completed','cancelled')
      ELSE FALSE
    END
    ELSE CASE locked_request.status
      WHEN 'assigned' THEN p_status IN ('picked_up','cancelled','disputed')
      WHEN 'picked_up' THEN p_status IN ('in_transit','cancelled','disputed')
      WHEN 'in_transit' THEN p_status IN ('delivered','disputed')
      WHEN 'delivered' THEN p_status = 'disputed'
      ELSE FALSE
    END
  END;
  IF NOT transition_allowed THEN
    RAISE EXCEPTION 'DELIVERY_APPLICATION_CONFLICT' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.delivery_requests
  SET status = p_status, version = version + 1, updated_at = NOW()
  WHERE id = p_request_id RETURNING * INTO locked_request;
  INSERT INTO public.delivery_events (
    request_id, market_code, actor_id, event_type, payload, idempotency_key
  ) VALUES (
    p_request_id, locked_request.market_code, p_actor_id,
    'delivery.request.' || p_status,
    CASE WHEN p_note IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('note', p_note) END,
    p_request_id::TEXT || ':' || p_status || ':' || locked_request.version::TEXT
  );
  INSERT INTO public.delivery_domain_outbox (
    request_id, market_code, event_type, payload, idempotency_key
  ) VALUES (
    p_request_id, locked_request.market_code,
    'delivery.request.' || p_status,
    jsonb_build_object('requestId', p_request_id, 'status', p_status),
    p_request_id::TEXT || ':' || p_status || ':' || locked_request.version::TEXT
  );
  RETURN NEXT locked_request;
END;
$$;

CREATE OR REPLACE FUNCTION public.suspend_unsafe_delivery_request(
  p_request_id UUID,
  p_actor_id UUID,
  p_expected_version INTEGER,
  p_reason TEXT
) RETURNS SETOF public.delivery_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE locked_request public.delivery_requests%ROWTYPE;
BEGIN
  IF char_length(btrim(p_reason)) NOT BETWEEN 10 AND 2000 THEN
    RAISE EXCEPTION 'invalid delivery moderation reason' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO locked_request FROM public.delivery_requests
  WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'DELIVERY_NOT_ELIGIBLE' USING ERRCODE = 'P0001';
  END IF;
  IF locked_request.version <> p_expected_version THEN
    RAISE EXCEPTION 'DELIVERY_ASSIGNMENT_CONFLICT' USING ERRCODE = '40001';
  END IF;
  IF locked_request.status IN ('completed','cancelled','expired') THEN
    RAISE EXCEPTION 'DELIVERY_APPLICATION_CONFLICT' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.delivery_requests
  SET status = 'suspended', version = version + 1, updated_at = NOW()
  WHERE id = p_request_id RETURNING * INTO locked_request;
  INSERT INTO public.delivery_events (
    request_id, market_code, actor_id, event_type, payload, idempotency_key
  ) VALUES (
    p_request_id, locked_request.market_code, p_actor_id,
    'delivery.request.suspended', jsonb_build_object('reason', btrim(p_reason)),
    p_request_id::TEXT || ':moderation:suspended:' || locked_request.version::TEXT
  );
  INSERT INTO public.delivery_domain_outbox (
    request_id, market_code, event_type, payload, idempotency_key
  ) VALUES (
    p_request_id, locked_request.market_code, 'delivery.request.suspended',
    jsonb_build_object('requestId', p_request_id, 'status', 'suspended'),
    p_request_id::TEXT || ':moderation:suspended:' || locked_request.version::TEXT
  );
  RETURN NEXT locked_request;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_delivery_event_mutation()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'delivery events are immutable' USING ERRCODE = '55000';
END;
$$;
CREATE TRIGGER delivery_events_immutable
  BEFORE UPDATE OR DELETE ON public.delivery_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_delivery_event_mutation();

CREATE OR REPLACE FUNCTION public.prepare_delivery_account_deletion(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.delivery_requests request
    LEFT JOIN public.delivery_applications application
      ON application.id = request.selected_application_id
    WHERE (request.requester_id = p_user_id OR application.courier_user_id = p_user_id)
      AND request.status NOT IN ('completed', 'cancelled', 'expired')
  ) THEN
    RAISE EXCEPTION 'DELIVERY_ACTIVE_ASSIGNMENT' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.delivery_courier_profiles
  SET status = 'inactive', opportunity_notifications = FALSE,
      availability_note = NULL, updated_at = NOW()
  WHERE user_id = p_user_id;

  UPDATE public.delivery_applications
  SET status = CASE WHEN status = 'submitted' THEN 'withdrawn' ELSE status END,
      availability_note = 'Indisponible', message = 'Candidature anonymisée',
      updated_at = NOW()
  WHERE courier_user_id = p_user_id;

  DELETE FROM public.delivery_request_stops stop
  USING public.delivery_requests request
  LEFT JOIN public.delivery_applications application
    ON application.id = request.selected_application_id
  WHERE stop.request_id = request.id
    AND request.status IN ('completed', 'cancelled', 'expired')
    AND (request.requester_id = p_user_id OR application.courier_user_id = p_user_id);
END;
$$;

ALTER TABLE public.notification_preferences
  DROP CONSTRAINT IF EXISTS notification_preferences_category_check;
ALTER TABLE public.notification_preferences
  ADD CONSTRAINT notification_preferences_category_check CHECK (
    category IN ('messages','transactions','listings','delivery',
      'delivery_opportunities','reviews','promotions','security','marketing')
  );

CREATE OR REPLACE FUNCTION public.create_notification_with_deliveries(
  p_id UUID,
  p_user_id UUID,
  p_type TEXT,
  p_category TEXT,
  p_title TEXT,
  p_body TEXT,
  p_link_url TEXT,
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
    'messages', 'transactions', 'listings', 'delivery',
    'delivery_opportunities', 'reviews', 'promotions', 'security', 'marketing'
  ) THEN
    RAISE EXCEPTION 'invalid notification category' USING ERRCODE = '22023';
  END IF;
  IF char_length(btrim(p_title)) NOT BETWEEN 1 AND 255
     OR char_length(btrim(p_body)) NOT BETWEEN 1 AND 5000 THEN
    RAISE EXCEPTION 'invalid notification content' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(COALESCE(p_channels, ARRAY[]::TEXT[])) AS channel
    WHERE channel NOT IN ('email', 'push')
  ) THEN
    RAISE EXCEPTION 'invalid notification channel' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.notifications (
    id, user_id, type, category, title, body, link_url,
    in_app_visible, is_read, created_at
  ) VALUES (
    p_id, p_user_id, p_type, p_category, btrim(p_title), btrim(p_body),
    NULLIF(btrim(p_link_url), ''), p_in_app_visible, FALSE, p_created_at
  ) ON CONFLICT (id) DO NOTHING;
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

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'delivery_courier_profiles','delivery_courier_areas','delivery_requests',
    'delivery_request_stops','delivery_applications','delivery_events',
    'delivery_match_notifications','delivery_domain_outbox'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', table_name);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO service_role', table_name);
  END LOOP;
END $$;
REVOKE UPDATE, DELETE ON public.delivery_events FROM service_role;
REVOKE EXECUTE ON FUNCTION public.claim_delivery_domain_outbox(TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_delivery_domain_outbox(TEXT, INTEGER, INTEGER)
  TO service_role;
REVOKE EXECUTE ON FUNCTION public.complete_delivery_domain_outbox(
  UUID, TEXT, BOOLEAN, TEXT, TIMESTAMPTZ
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_delivery_domain_outbox(
  UUID, TEXT, BOOLEAN, TEXT, TIMESTAMPTZ
) TO service_role;
REVOKE EXECUTE ON FUNCTION public.save_delivery_courier_profile(
  UUID, VARCHAR, TEXT, TEXT[], BIGINT, TEXT, BOOLEAN, JSONB
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_delivery_courier_profile(
  UUID, VARCHAR, TEXT, TEXT[], BIGINT, TEXT, BOOLEAN, JSONB
) TO service_role;
REVOKE EXECUTE ON FUNCTION public.submit_delivery_application(
  UUID, UUID, UUID, VARCHAR, TEXT, TEXT, BIGINT, VARCHAR, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_delivery_application(
  UUID, UUID, UUID, VARCHAR, TEXT, TEXT, BIGINT, VARCHAR, TEXT
) TO service_role;
REVOKE EXECUTE ON FUNCTION public.withdraw_delivery_application(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_delivery_application(UUID, UUID)
  TO service_role;
REVOKE EXECUTE ON FUNCTION public.accept_delivery_application(UUID, UUID, UUID, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_delivery_application(UUID, UUID, UUID, INTEGER)
  TO service_role;
REVOKE EXECUTE ON FUNCTION public.publish_delivery_request(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_delivery_request(UUID, UUID)
  TO service_role;
REVOKE EXECUTE ON FUNCTION public.transition_delivery_request(UUID, UUID, INTEGER, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.transition_delivery_request(UUID, UUID, INTEGER, TEXT, TEXT)
  TO service_role;
REVOKE EXECUTE ON FUNCTION public.suspend_unsafe_delivery_request(UUID, UUID, INTEGER, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.suspend_unsafe_delivery_request(UUID, UUID, INTEGER, TEXT)
  TO service_role;
REVOKE EXECUTE ON FUNCTION public.prepare_delivery_account_deletion(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_delivery_account_deletion(UUID)
  TO service_role;
