-- Account-owned vertical favorites and non-sensitive Education workflow drafts.
-- Business data remains in the vertical tables; the JSON payload is limited to
-- interruptible form criteria whose shape evolves with the public contract.

CREATE TABLE IF NOT EXISTS public.auto_vehicle_favorites (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.auto_vehicles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, vehicle_id)
);
CREATE INDEX IF NOT EXISTS auto_vehicle_favorites_vehicle_idx
  ON public.auto_vehicle_favorites (vehicle_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.course_tutor_favorites (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tutor_profile_id UUID NOT NULL REFERENCES public.course_tutor_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, tutor_profile_id)
);
CREATE INDEX IF NOT EXISTS course_tutor_favorites_tutor_idx
  ON public.course_tutor_favorites (tutor_profile_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.course_workflow_drafts (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  draft_kind TEXT NOT NULL CHECK (
    draft_kind IN ('tutor_onboarding', 'learner_request')
  ),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, market_code, draft_kind),
  CHECK (jsonb_typeof(payload) = 'object')
);
CREATE INDEX IF NOT EXISTS course_workflow_drafts_expiry_idx
  ON public.course_workflow_drafts (expires_at);

CREATE OR REPLACE FUNCTION public.toggle_auto_vehicle_favorite(
  p_user_id UUID,
  p_vehicle_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.auto_vehicle_favorites
  WHERE user_id = p_user_id AND vehicle_id = p_vehicle_id;
  IF FOUND THEN RETURN FALSE; END IF;
  INSERT INTO public.auto_vehicle_favorites (user_id, vehicle_id)
  VALUES (p_user_id, p_vehicle_id)
  ON CONFLICT DO NOTHING;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_course_tutor_favorite(
  p_user_id UUID,
  p_tutor_profile_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.course_tutor_favorites
  WHERE user_id = p_user_id AND tutor_profile_id = p_tutor_profile_id;
  IF FOUND THEN RETURN FALSE; END IF;
  INSERT INTO public.course_tutor_favorites (user_id, tutor_profile_id)
  VALUES (p_user_id, p_tutor_profile_id)
  ON CONFLICT DO NOTHING;
  RETURN TRUE;
END;
$$;

ALTER TABLE public.auto_vehicle_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_tutor_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_workflow_drafts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.auto_vehicle_favorites FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.course_tutor_favorites FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.course_workflow_drafts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.auto_vehicle_favorites TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_tutor_favorites TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_workflow_drafts TO service_role;

REVOKE ALL ON FUNCTION public.toggle_auto_vehicle_favorite(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.toggle_course_tutor_favorite(UUID, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_auto_vehicle_favorite(UUID, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.toggle_course_tutor_favorite(UUID, UUID)
  TO service_role;
