-- BullMQ owns retry timing while PostgreSQL remains the authoritative lease and
-- idempotency boundary. A retry releases only the current owner's lease and
-- makes the same responsibility immediately claimable by its next attempt.
CREATE OR REPLACE FUNCTION public.release_scheduled_job_for_retry(
  p_job_name TEXT,
  p_owner_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.scheduled_jobs
  SET owner_id = NULL,
      leased_until = '-infinity',
      next_run_at = NOW(),
      updated_at = NOW()
  WHERE job_name = p_job_name AND owner_id = p_owner_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Scheduled job lease ownership mismatch'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.release_scheduled_job_for_retry(TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_scheduled_job_for_retry(TEXT, UUID)
  TO service_role;
