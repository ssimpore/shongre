-- Scheduled work runs in a dedicated process. These leases coordinate any
-- number of worker replicas and survive process restarts without relying on
-- in-memory timers for exclusivity.
CREATE TABLE IF NOT EXISTS public.scheduled_jobs (
  job_name TEXT PRIMARY KEY,
  owner_id UUID,
  leased_until TIMESTAMPTZ NOT NULL DEFAULT '-infinity',
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_started_at TIMESTAMPTZ,
  last_succeeded_at TIMESTAMPTZ,
  last_failed_at TIMESTAMPTZ,
  last_error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.scheduled_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.scheduled_jobs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.scheduled_jobs TO service_role;

CREATE OR REPLACE FUNCTION public.claim_scheduled_job(
  p_job_name TEXT,
  p_owner_id UUID,
  p_interval_seconds INTEGER,
  p_lease_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  affected_rows INTEGER := 0;
BEGIN
  IF length(trim(p_job_name)) = 0
     OR p_interval_seconds < 1
     OR p_lease_seconds < 1 THEN
    RAISE EXCEPTION 'Invalid scheduled job claim' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.scheduled_jobs (
    job_name, owner_id, leased_until, next_run_at, last_started_at, updated_at
  ) VALUES (
    p_job_name,
    p_owner_id,
    NOW() + make_interval(secs => p_lease_seconds),
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (job_name) DO UPDATE SET
    owner_id = EXCLUDED.owner_id,
    leased_until = EXCLUDED.leased_until,
    last_started_at = NOW(),
    updated_at = NOW()
  WHERE public.scheduled_jobs.next_run_at <= NOW()
    AND public.scheduled_jobs.leased_until <= NOW();

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_scheduled_job(
  p_job_name TEXT,
  p_owner_id UUID,
  p_interval_seconds INTEGER,
  p_error TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.scheduled_jobs
  SET
    owner_id = NULL,
    leased_until = '-infinity',
    next_run_at = NOW() + make_interval(
      secs => CASE WHEN p_error IS NULL THEN p_interval_seconds
                   ELSE LEAST(p_interval_seconds, 60) END
    ),
    last_succeeded_at = CASE WHEN p_error IS NULL THEN NOW() ELSE last_succeeded_at END,
    last_failed_at = CASE WHEN p_error IS NULL THEN last_failed_at ELSE NOW() END,
    last_error = left(p_error, 1000),
    updated_at = NOW()
  WHERE job_name = p_job_name AND owner_id = p_owner_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Scheduled job lease ownership mismatch'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_scheduled_job(TEXT, UUID, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_scheduled_job(TEXT, UUID, INTEGER, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_scheduled_job(TEXT, UUID, INTEGER, INTEGER)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_scheduled_job(TEXT, UUID, INTEGER, TEXT)
  TO service_role;
