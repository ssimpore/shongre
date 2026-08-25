-- Canonical moderation cases, atomic enforcement, and independent appeals.

CREATE TABLE IF NOT EXISTS public.moderation_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL UNIQUE REFERENCES public.reports(id) ON DELETE RESTRICT,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  target_type TEXT NOT NULL CHECK (target_type IN ('listing', 'user')),
  listing_id UUID REFERENCES public.listings(id) ON DELETE RESTRICT,
  reported_user_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  category TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'triaged', 'under_review', 'actioned', 'dismissed', 'appealed', 'closed')
  ),
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolution_action TEXT CHECK (resolution_action IN ('dismiss', 'remove_listing', 'ban_user')),
  resolution_reason TEXT,
  target_state_before JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(target_state_before) = 'object'),
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  CHECK (
    (target_type = 'listing' AND listing_id IS NOT NULL)
    OR (target_type = 'user' AND reported_user_id IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS moderation_cases_queue_idx
  ON public.moderation_cases (status, severity, created_at);
CREATE INDEX IF NOT EXISTS moderation_cases_target_listing_idx
  ON public.moderation_cases (listing_id, created_at DESC)
  WHERE listing_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS moderation_cases_target_user_idx
  ON public.moderation_cases (reported_user_id, created_at DESC)
  WHERE reported_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.moderation_case_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.moderation_cases(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL CHECK (
    event_type IN ('reported', 'assigned', 'review_started', 'resolved',
                   'appeal_submitted', 'appeal_decided')
  ),
  from_status TEXT,
  to_status TEXT NOT NULL,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS moderation_case_events_case_idx
  ON public.moderation_case_events (case_id, created_at, id);

CREATE TABLE IF NOT EXISTS public.moderation_appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.moderation_cases(id) ON DELETE RESTRICT,
  appellant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 20 AND 5000),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (
    status IN ('submitted', 'under_review', 'upheld', 'overturned', 'rejected', 'withdrawn')
  ),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  decision_reason TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS moderation_appeals_one_active_per_case_idx
  ON public.moderation_appeals (case_id)
  WHERE status IN ('submitted', 'under_review');
CREATE INDEX IF NOT EXISTS moderation_appeals_appellant_idx
  ON public.moderation_appeals (appellant_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS moderation_appeals_queue_idx
  ON public.moderation_appeals (status, submitted_at);

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
    category, severity, created_at, updated_at
  ) VALUES (
    NEW.id,
    NEW.reporter_id,
    CASE WHEN NEW.listing_id IS NOT NULL THEN 'listing' ELSE 'user' END,
    NEW.listing_id,
    NEW.reported_user_id,
    NEW.reason,
    CASE WHEN NEW.reason IN ('fraud', 'counterfeit', 'prohibited') THEN 'high' ELSE 'medium' END,
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

DROP TRIGGER IF EXISTS create_moderation_case_after_report ON public.reports;
CREATE TRIGGER create_moderation_case_after_report
AFTER INSERT ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.create_moderation_case_from_report();

-- Adopt existing reports before all future inserts are handled by the trigger.
INSERT INTO public.moderation_cases (
  report_id, reporter_id, target_type, listing_id, reported_user_id,
  category, severity, status, resolution_action, resolved_by, resolved_at,
  created_at, updated_at
)
SELECT
  r.id,
  r.reporter_id,
  CASE WHEN r.listing_id IS NOT NULL THEN 'listing' ELSE 'user' END,
  r.listing_id,
  r.reported_user_id,
  r.reason,
  CASE WHEN r.reason IN ('fraud', 'counterfeit', 'prohibited') THEN 'high' ELSE 'medium' END,
  CASE
    WHEN r.status = 'dismissed' THEN 'dismissed'
    WHEN r.status = 'resolved' THEN 'actioned'
    WHEN r.status = 'investigating' THEN 'under_review'
    ELSE 'open'
  END,
  CASE
    WHEN r.resolution_action IN ('dismiss', 'remove_listing', 'ban_user') THEN r.resolution_action
    ELSE NULL
  END,
  r.resolved_by,
  r.resolved_at,
  r.created_at,
  r.updated_at
FROM public.reports r
WHERE r.listing_id IS NOT NULL OR r.reported_user_id IS NOT NULL
ON CONFLICT (report_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.resolve_moderation_case(
  p_report_id UUID,
  p_actor_id UUID,
  p_action TEXT,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE target_case public.moderation_cases%ROWTYPE;
DECLARE before_state JSONB := '{}'::jsonb;
BEGIN
  IF p_action NOT IN ('dismiss', 'remove_listing', 'ban_user')
     OR char_length(btrim(p_reason)) NOT BETWEEN 10 AND 5000 THEN
    RAISE EXCEPTION 'invalid moderation decision' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO target_case
  FROM public.moderation_cases
  WHERE report_id = p_report_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'moderation case not found' USING ERRCODE = 'P0002'; END IF;
  IF target_case.status NOT IN ('open', 'triaged', 'under_review') THEN
    RAISE EXCEPTION 'moderation case is already resolved' USING ERRCODE = '23514';
  END IF;

  IF p_action = 'remove_listing' THEN
    IF target_case.listing_id IS NULL THEN
      RAISE EXCEPTION 'case does not target a listing' USING ERRCODE = '22023';
    END IF;
    SELECT jsonb_build_object('status', status::TEXT) INTO before_state
    FROM public.listings WHERE id = target_case.listing_id FOR UPDATE;
    IF before_state IS NULL THEN RAISE EXCEPTION 'listing not found' USING ERRCODE = 'P0002'; END IF;
    UPDATE public.listings SET status = 'archived', updated_at = NOW()
    WHERE id = target_case.listing_id;
  ELSIF p_action = 'ban_user' THEN
    IF target_case.reported_user_id IS NULL THEN
      RAISE EXCEPTION 'case does not target a user' USING ERRCODE = '22023';
    END IF;
    SELECT jsonb_build_object('status', status::TEXT) INTO before_state
    FROM public.profiles WHERE id = target_case.reported_user_id FOR UPDATE;
    IF before_state IS NULL THEN RAISE EXCEPTION 'profile not found' USING ERRCODE = 'P0002'; END IF;
    UPDATE public.profiles SET status = 'banned', updated_at = NOW()
    WHERE id = target_case.reported_user_id;
  END IF;

  UPDATE public.moderation_cases
  SET status = CASE WHEN p_action = 'dismiss' THEN 'dismissed' ELSE 'actioned' END,
      resolution_action = p_action,
      resolution_reason = btrim(p_reason),
      target_state_before = before_state,
      resolved_by = p_actor_id,
      resolved_at = NOW(),
      updated_at = NOW(),
      version = version + 1
  WHERE id = target_case.id;
  UPDATE public.reports
  SET status = CASE WHEN p_action = 'dismiss' THEN 'dismissed'::public.report_status ELSE 'resolved'::public.report_status END,
      resolution_action = p_action,
      resolved_by = p_actor_id,
      resolved_at = NOW(),
      updated_at = NOW()
  WHERE id = p_report_id;
  INSERT INTO public.moderation_case_events (
    case_id, actor_id, event_type, from_status, to_status, reason,
    metadata
  ) VALUES (
    target_case.id, p_actor_id, 'resolved', target_case.status,
    CASE WHEN p_action = 'dismiss' THEN 'dismissed' ELSE 'actioned' END,
    btrim(p_reason), jsonb_build_object('action', p_action)
  );
  RETURN (SELECT to_jsonb(c) FROM public.moderation_cases c WHERE c.id = target_case.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_moderation_appeal(
  p_case_id UUID,
  p_appellant_id UUID,
  p_reason TEXT
)
RETURNS SETOF public.moderation_appeals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE target_case public.moderation_cases%ROWTYPE;
DECLARE owner_id UUID;
DECLARE created_appeal public.moderation_appeals%ROWTYPE;
BEGIN
  IF char_length(btrim(p_reason)) NOT BETWEEN 20 AND 5000 THEN
    RAISE EXCEPTION 'invalid appeal reason' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO target_case FROM public.moderation_cases
  WHERE id = p_case_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'moderation case not found' USING ERRCODE = 'P0002'; END IF;
  IF target_case.status <> 'actioned'
     OR target_case.resolution_action NOT IN ('remove_listing', 'ban_user')
     OR target_case.resolved_at < NOW() - INTERVAL '30 days' THEN
    RAISE EXCEPTION 'case is not appealable' USING ERRCODE = '23514';
  END IF;
  IF target_case.target_type = 'listing' THEN
    SELECT seller_id INTO owner_id FROM public.listings WHERE id = target_case.listing_id;
  ELSE
    owner_id := target_case.reported_user_id;
  END IF;
  IF owner_id IS DISTINCT FROM p_appellant_id THEN
    RAISE EXCEPTION 'only the affected account may appeal' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.moderation_appeals (case_id, appellant_id, reason)
  VALUES (p_case_id, p_appellant_id, btrim(p_reason))
  RETURNING * INTO created_appeal;
  UPDATE public.moderation_cases
  SET status = 'appealed', updated_at = NOW(), version = version + 1
  WHERE id = p_case_id;
  INSERT INTO public.moderation_case_events (
    case_id, actor_id, event_type, from_status, to_status, reason,
    metadata
  ) VALUES (
    p_case_id, p_appellant_id, 'appeal_submitted', 'actioned', 'appealed',
    btrim(p_reason), jsonb_build_object('appealId', created_appeal.id)
  );
  RETURN NEXT created_appeal;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_own_moderation_cases(
  p_user_id UUID
)
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
  WHERE c.reported_user_id = p_user_id OR l.seller_id = p_user_id
  ORDER BY c.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.decide_moderation_appeal(
  p_appeal_id UUID,
  p_reviewer_id UUID,
  p_decision TEXT,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE target_appeal public.moderation_appeals%ROWTYPE;
DECLARE target_case public.moderation_cases%ROWTYPE;
BEGIN
  IF p_decision NOT IN ('upheld', 'overturned', 'rejected')
     OR char_length(btrim(p_reason)) NOT BETWEEN 10 AND 5000 THEN
    RAISE EXCEPTION 'invalid appeal decision' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO target_appeal FROM public.moderation_appeals
  WHERE id = p_appeal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'appeal not found' USING ERRCODE = 'P0002'; END IF;
  IF target_appeal.status NOT IN ('submitted', 'under_review') THEN
    RAISE EXCEPTION 'appeal is already decided' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO target_case FROM public.moderation_cases
  WHERE id = target_appeal.case_id FOR UPDATE;
  IF target_case.resolved_by = p_reviewer_id THEN
    RAISE EXCEPTION 'appeal reviewer must be independent' USING ERRCODE = '42501';
  END IF;

  IF p_decision = 'overturned' THEN
    IF target_case.resolution_action = 'remove_listing' THEN
      UPDATE public.listings
      SET status = (target_case.target_state_before->>'status')::public.listing_status,
          updated_at = NOW()
      WHERE id = target_case.listing_id;
    ELSIF target_case.resolution_action = 'ban_user' THEN
      UPDATE public.profiles
      SET status = (target_case.target_state_before->>'status')::public.account_status,
          updated_at = NOW()
      WHERE id = target_case.reported_user_id;
    END IF;
  END IF;

  UPDATE public.moderation_appeals
  SET status = p_decision,
      reviewed_by = p_reviewer_id,
      decision_reason = btrim(p_reason),
      reviewed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_appeal_id;
  UPDATE public.moderation_cases
  SET status = 'closed', updated_at = NOW(), version = version + 1
  WHERE id = target_case.id;
  IF p_decision = 'overturned' THEN
    UPDATE public.reports SET status = 'dismissed', updated_at = NOW()
    WHERE id = target_case.report_id;
  END IF;
  INSERT INTO public.moderation_case_events (
    case_id, actor_id, event_type, from_status, to_status, reason,
    metadata
  ) VALUES (
    target_case.id, p_reviewer_id, 'appeal_decided', 'appealed', 'closed',
    btrim(p_reason), jsonb_build_object('appealId', p_appeal_id, 'decision', p_decision)
  );
  RETURN jsonb_build_object(
    'appeal', (SELECT to_jsonb(a) FROM public.moderation_appeals a WHERE a.id = p_appeal_id),
    'case', (SELECT to_jsonb(c) FROM public.moderation_cases c WHERE c.id = target_case.id)
  );
END;
$$;

ALTER TABLE public.moderation_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_case_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_appeals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.moderation_cases FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.moderation_case_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.moderation_appeals FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.moderation_cases TO service_role;
GRANT SELECT, INSERT ON public.moderation_case_events TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.moderation_appeals TO service_role;

REVOKE ALL ON FUNCTION public.create_moderation_case_from_report()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resolve_moderation_case(UUID, UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_moderation_appeal(UUID, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_own_moderation_cases(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.decide_moderation_appeal(UUID, UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_moderation_case(UUID, UUID, TEXT, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_moderation_appeal(UUID, UUID, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.list_own_moderation_cases(UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.decide_moderation_appeal(UUID, UUID, TEXT, TEXT)
  TO service_role;
