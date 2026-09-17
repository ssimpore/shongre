-- Reviews were write-once: a seller could not answer one, a reader could not
-- say one helped, a report of one was filed against its author's account with
-- the review identifier pasted into the free text, and nobody was reminded to
-- leave one. This migration gives each of those a home in the existing
-- tables rather than a parallel review system.

-- ---------------------------------------------------------------------------
-- 1. Seller reply and moderation removal live on the review itself
-- ---------------------------------------------------------------------------

ALTER TABLE public.reviews
  ADD COLUMN reply_comment TEXT
    CHECK (reply_comment IS NULL OR char_length(reply_comment) BETWEEN 10 AND 2000),
  ADD COLUMN reply_created_at TIMESTAMPTZ,
  ADD COLUMN reply_updated_at TIMESTAMPTZ,
  ADD COLUMN helpful_count INTEGER NOT NULL DEFAULT 0 CHECK (helpful_count >= 0),
  -- Soft removal keeps the evidence a moderation appeal needs; a removed
  -- review is invisible everywhere and no longer counts towards the rating.
  ADD COLUMN removed_at TIMESTAMPTZ,
  ADD COLUMN removed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT reviews_reply_timestamps_check CHECK (
    (reply_comment IS NULL) = (reply_created_at IS NULL)
  );

-- The public read grants list columns explicitly (00114); the new public
-- facts join them, the moderation columns stay backend-only.
GRANT SELECT (reply_comment, reply_created_at, reply_updated_at, helpful_count)
  ON public.reviews TO anon, authenticated;

CREATE INDEX reviews_target_visible_idx
  ON public.reviews (target_user_id, created_at DESC)
  WHERE removed_at IS NULL;

-- Removed reviews must not shape a profile's rating.
CREATE OR REPLACE FUNCTION public.update_seller_rating_summary()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  target_user uuid;
BEGIN
  FOR target_user IN
    SELECT DISTINCT id FROM unnest(ARRAY[
      CASE WHEN TG_OP <> 'DELETE' THEN NEW.target_user_id END,
      CASE WHEN TG_OP <> 'INSERT' THEN OLD.target_user_id END
    ]) AS targets(id) WHERE id IS NOT NULL ORDER BY id
  LOOP
    PERFORM 1 FROM public.profiles WHERE id = target_user FOR UPDATE;
    UPDATE public.profiles p SET
      rating = (
        SELECT coalesce(round(avg(rating)::numeric, 2), 0)
          FROM public.reviews
         WHERE target_user_id = p.id AND removed_at IS NULL
      ),
      review_count = (
        SELECT count(*) FROM public.reviews
         WHERE target_user_id = p.id AND removed_at IS NULL
      ),
      updated_at = now()
    WHERE p.id = target_user;
  END LOOP;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Helpful votes: one per reader, counted by trigger
-- ---------------------------------------------------------------------------

CREATE TABLE public.review_helpful_votes (
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (review_id, user_id)
);

ALTER TABLE public.review_helpful_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_helpful_votes FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.review_helpful_votes FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.review_helpful_votes TO service_role;

CREATE OR REPLACE FUNCTION public.sync_review_helpful_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.reviews SET helpful_count = helpful_count + 1
     WHERE id = NEW.review_id;
    RETURN NEW;
  END IF;
  UPDATE public.reviews SET helpful_count = GREATEST(helpful_count - 1, 0)
   WHERE id = OLD.review_id;
  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_review_helpful_count() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER review_helpful_votes_maintain_count
  AFTER INSERT OR DELETE ON public.review_helpful_votes
  FOR EACH ROW EXECUTE FUNCTION public.sync_review_helpful_count();

-- Idempotent set: the caller states the vote it wants, retries are safe, and
-- the review's author and recipient are refused so nobody rates their own
-- exchange. Returns the resulting count.
CREATE OR REPLACE FUNCTION public.set_review_helpful_vote(
  p_review_id UUID,
  p_user_id UUID,
  p_helpful BOOLEAN
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_review public.reviews%ROWTYPE;
BEGIN
  SELECT * INTO v_review FROM public.reviews
   WHERE id = p_review_id AND removed_at IS NULL
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'REVIEW_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF p_user_id IN (v_review.author_id, v_review.target_user_id) THEN
    RAISE EXCEPTION 'REVIEW_VOTE_PARTICIPANT' USING ERRCODE = '23514';
  END IF;
  IF p_helpful THEN
    INSERT INTO public.review_helpful_votes (review_id, user_id)
    VALUES (p_review_id, p_user_id)
    ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.review_helpful_votes
     WHERE review_id = p_review_id AND user_id = p_user_id;
  END IF;
  SELECT helpful_count INTO STRICT v_review.helpful_count
    FROM public.reviews WHERE id = p_review_id;
  RETURN v_review.helpful_count;
END;
$$;

REVOKE ALL ON FUNCTION public.set_review_helpful_vote(UUID, UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_review_helpful_vote(UUID, UUID, BOOLEAN) TO service_role;

-- ---------------------------------------------------------------------------
-- 3. A review is a report target of its own, in the canonical casework
-- ---------------------------------------------------------------------------

ALTER TABLE public.reports
  ADD COLUMN review_id UUID REFERENCES public.reviews(id) ON DELETE RESTRICT;
CREATE INDEX reports_review_idx
  ON public.reports (review_id, created_at DESC)
  WHERE review_id IS NOT NULL;

ALTER TABLE public.moderation_cases
  ADD COLUMN review_id UUID REFERENCES public.reviews(id) ON DELETE RESTRICT;
ALTER TABLE public.moderation_cases
  DROP CONSTRAINT IF EXISTS moderation_cases_target_type_check;
ALTER TABLE public.moderation_cases
  DROP CONSTRAINT IF EXISTS moderation_cases_target_check;
ALTER TABLE public.moderation_cases
  DROP CONSTRAINT IF EXISTS moderation_cases_resolution_action_check;
ALTER TABLE public.moderation_cases
  ADD CONSTRAINT moderation_cases_target_type_check
  CHECK (target_type IN ('listing', 'user', 'delivery_request', 'review'));
ALTER TABLE public.moderation_cases
  ADD CONSTRAINT moderation_cases_target_check CHECK (
    (target_type = 'listing' AND listing_id IS NOT NULL
      AND reported_user_id IS NULL AND delivery_request_id IS NULL AND review_id IS NULL)
    OR (target_type = 'user' AND reported_user_id IS NOT NULL
      AND listing_id IS NULL AND delivery_request_id IS NULL AND review_id IS NULL)
    OR (target_type = 'delivery_request' AND delivery_request_id IS NOT NULL
      AND listing_id IS NULL AND reported_user_id IS NULL AND review_id IS NULL)
    OR (target_type = 'review' AND review_id IS NOT NULL
      AND listing_id IS NULL AND reported_user_id IS NULL AND delivery_request_id IS NULL)
  );
ALTER TABLE public.moderation_cases
  ADD CONSTRAINT moderation_cases_resolution_action_check
  CHECK (resolution_action IN ('dismiss', 'remove_listing', 'ban_user', 'remove_review'));
CREATE INDEX moderation_cases_target_review_idx
  ON public.moderation_cases (review_id, created_at DESC)
  WHERE review_id IS NOT NULL;

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
    delivery_request_id, review_id, category, severity, created_at, updated_at
  ) VALUES (
    NEW.id,
    NEW.reporter_id,
    CASE
      WHEN NEW.listing_id IS NOT NULL THEN 'listing'
      WHEN NEW.delivery_request_id IS NOT NULL THEN 'delivery_request'
      WHEN NEW.review_id IS NOT NULL THEN 'review'
      ELSE 'user'
    END,
    NEW.listing_id,
    NEW.reported_user_id,
    NEW.delivery_request_id,
    NEW.review_id,
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

-- Moderators may remove a reported review; the removal is a soft state the
-- appeal path can reverse, like a listing removal or a ban.
CREATE OR REPLACE FUNCTION public.resolve_moderation_case(
  p_report_id UUID, p_actor_id UUID, p_action TEXT, p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE target_case public.moderation_cases%ROWTYPE;
DECLARE before_state JSONB := '{}'::jsonb;
BEGIN
  IF p_action NOT IN ('dismiss', 'remove_listing', 'ban_user', 'remove_review')
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
  ELSIF p_action = 'remove_review' THEN
    IF target_case.review_id IS NULL THEN
      RAISE EXCEPTION 'case does not target a review' USING ERRCODE = '22023';
    END IF;
    SELECT jsonb_build_object('removedAt', removed_at) INTO before_state
    FROM public.reviews WHERE id = target_case.review_id FOR UPDATE;
    IF before_state IS NULL THEN RAISE EXCEPTION 'review not found' USING ERRCODE = 'P0002'; END IF;
    UPDATE public.reviews SET removed_at = NOW(), removed_by = p_actor_id
    WHERE id = target_case.review_id;
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

-- The review's author is the affected account: only they may appeal.
CREATE OR REPLACE FUNCTION public.submit_moderation_appeal(
  p_case_id UUID, p_appellant_id UUID, p_reason TEXT
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
     OR target_case.resolution_action NOT IN ('remove_listing', 'ban_user', 'remove_review')
     OR target_case.resolved_at < NOW() - INTERVAL '30 days' THEN
    RAISE EXCEPTION 'case is not appealable' USING ERRCODE = '23514';
  END IF;
  IF target_case.target_type = 'listing' THEN
    SELECT seller_id INTO owner_id FROM public.listings WHERE id = target_case.listing_id;
  ELSIF target_case.target_type = 'review' THEN
    SELECT author_id INTO owner_id FROM public.reviews WHERE id = target_case.review_id;
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

-- An overturned removal restores the review.
CREATE OR REPLACE FUNCTION public.decide_moderation_appeal(
  p_appeal_id UUID, p_reviewer_id UUID, p_decision TEXT, p_reason TEXT
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
    ELSIF target_case.resolution_action = 'remove_review' THEN
      UPDATE public.reviews
      SET removed_at = NULL, removed_by = NULL
      WHERE id = target_case.review_id;
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

-- The review's author sees the case about their review in their own list.
CREATE OR REPLACE FUNCTION public.list_own_moderation_cases(p_user_id UUID)
RETURNS TABLE (
  id UUID, target_type TEXT, category TEXT, status TEXT, resolution_action TEXT,
  resolution_reason TEXT, resolved_at TIMESTAMPTZ, created_at TIMESTAMPTZ
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
  LEFT JOIN public.reviews r ON r.id = c.review_id
  WHERE c.reported_user_id = p_user_id
     OR l.seller_id = p_user_id
     OR d.requester_id = p_user_id
     OR r.author_id = p_user_id
  ORDER BY c.created_at DESC;
$$;

-- ---------------------------------------------------------------------------
-- 4. Review reminders after a completed exchange
-- ---------------------------------------------------------------------------

-- Completion had no timestamp of its own; `updated_at` moves again on payout
-- events. The trigger stamps the transition wherever it is made.
ALTER TABLE public.orders ADD COLUMN completed_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.stamp_order_completed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'completed'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
    NEW.completed_at := COALESCE(NEW.completed_at, NOW());
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.stamp_order_completed_at() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER orders_stamp_completed_at
  BEFORE INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.stamp_order_completed_at();

-- Orders completed before this migration: the last change is the best fact
-- available, and it only decides when a reminder may go out.
UPDATE public.orders SET completed_at = updated_at
 WHERE status = 'completed' AND completed_at IS NULL;

CREATE INDEX orders_completed_at_idx
  ON public.orders (completed_at)
  WHERE status = 'completed';

-- One reminder per participant and order, ever. The row is the idempotency
-- record: the worker inserts it before notifying, so two workers reading the
-- same due order cannot both send.
CREATE TABLE public.order_review_reminders (
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (order_id, user_id)
);

ALTER TABLE public.order_review_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_review_reminders FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_review_reminders FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.order_review_reminders TO service_role;
