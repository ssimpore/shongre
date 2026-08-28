-- Renewable leases prevent long-running scheduled jobs from being reclaimed
-- while their original owner is still healthy. Completion remains fenced by
-- owner_id, so a worker that loses its lease cannot acknowledge another run.

CREATE OR REPLACE FUNCTION public.renew_scheduled_job_lease(
  p_job_name TEXT,
  p_owner_id UUID,
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
  IF length(trim(p_job_name)) = 0 OR p_lease_seconds < 1 THEN
    RAISE EXCEPTION 'Invalid scheduled job lease renewal'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.scheduled_jobs
  SET leased_until = NOW() + make_interval(secs => p_lease_seconds),
      updated_at = NOW()
  WHERE job_name = p_job_name
    AND owner_id = p_owner_id
    AND leased_until > NOW();

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.renew_scheduled_job_lease(TEXT,UUID,INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.renew_scheduled_job_lease(TEXT,UUID,INTEGER)
  TO service_role;
