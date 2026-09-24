-- Limiter rows are rewritten in place while their window is live and carry no
-- information once both the window and any lock have lapsed. Nothing deleted
-- them, so the table gained a row for every network address and account the
-- API ever throttled. The scheduled worker drains them in bounded batches;
-- SKIP LOCKED leaves any row a concurrent limiter decision holds.
CREATE OR REPLACE FUNCTION public.purge_expired_auth_rate_limits(p_limit INT)
RETURNS INT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH expired AS (
    SELECT key_hash, action
      FROM public.auth_rate_limits
     WHERE reset_at < NOW()
       AND (locked_until IS NULL OR locked_until < NOW())
     ORDER BY reset_at
     LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 1000), 10000))
       FOR UPDATE SKIP LOCKED
  ), deleted AS (
    DELETE FROM public.auth_rate_limits target
     USING expired
     WHERE target.key_hash = expired.key_hash
       AND target.action = expired.action
    RETURNING 1
  )
  SELECT COUNT(*)::INT FROM deleted;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_auth_rate_limits(INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_auth_rate_limits(INT) TO service_role;
