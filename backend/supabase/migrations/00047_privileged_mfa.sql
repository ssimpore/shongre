-- Server-owned TOTP MFA with encrypted secrets, one-time recovery codes,
-- replay protection and short-lived login challenges. Staff sessions without
-- an MFA proof are intentionally limited to enrollment/security endpoints.

ALTER TABLE public.auth_sessions
  ADD COLUMN IF NOT EXISTS mfa_verified_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.auth_mfa_credentials (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  secret_ciphertext TEXT NOT NULL,
  secret_iv TEXT NOT NULL,
  secret_auth_tag TEXT NOT NULL,
  backup_code_hashes JSONB NOT NULL DEFAULT '[]'::jsonb,
  enabled_at TIMESTAMPTZ,
  disabled_at TIMESTAMPTZ,
  last_used_counter BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (jsonb_typeof(backup_code_hashes) = 'array')
);

CREATE TABLE IF NOT EXISTS public.auth_mfa_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE CHECK (char_length(token_hash) = 64),
  purpose TEXT NOT NULL CHECK (purpose IN ('login')),
  attempts SMALLINT NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS auth_mfa_challenges_active_idx
  ON public.auth_mfa_challenges (token_hash, expires_at)
  WHERE consumed_at IS NULL;
CREATE INDEX IF NOT EXISTS auth_mfa_challenges_user_idx
  ON public.auth_mfa_challenges (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.accept_auth_mfa_counter(
  p_user_id UUID,
  p_counter BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.auth_mfa_credentials
  SET last_used_counter = p_counter, updated_at = NOW()
  WHERE user_id = p_user_id
    AND enabled_at IS NOT NULL
    AND disabled_at IS NULL
    AND (last_used_counter IS NULL OR last_used_counter < p_counter);
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_auth_mfa_backup_code(
  p_user_id UUID,
  p_code_hash TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_hashes JSONB;
BEGIN
  SELECT backup_code_hashes INTO current_hashes
  FROM public.auth_mfa_credentials
  WHERE user_id = p_user_id AND enabled_at IS NOT NULL AND disabled_at IS NULL
  FOR UPDATE;
  IF NOT FOUND OR NOT current_hashes ? p_code_hash THEN RETURN FALSE; END IF;
  UPDATE public.auth_mfa_credentials
  SET backup_code_hashes = current_hashes - p_code_hash, updated_at = NOW()
  WHERE user_id = p_user_id;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_auth_mfa_challenge_attempts(
  p_challenge_id UUID
)
RETURNS SMALLINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  next_attempts SMALLINT;
BEGIN
  UPDATE public.auth_mfa_challenges
  SET attempts = LEAST(5, attempts + 1)
  WHERE id = p_challenge_id
    AND consumed_at IS NULL
    AND expires_at > NOW()
  RETURNING attempts INTO next_attempts;
  RETURN next_attempts;
END;
$$;

ALTER TABLE public.auth_audit_events
  DROP CONSTRAINT IF EXISTS auth_audit_events_event_type_check;
ALTER TABLE public.auth_audit_events
  ADD CONSTRAINT auth_audit_events_event_type_check CHECK (event_type IN (
    'login_succeeded', 'login_failed', 'logout', 'logout_all',
    'session_refreshed', 'session_reuse_detected', 'session_revoked',
    'registered', 'email_verification_sent', 'email_verified',
    'password_reset_requested', 'password_reset_completed', 'password_changed',
    'email_change_requested', 'email_changed',
    'identity_linked', 'identity_unlinked', 'identity_link_rejected',
    'oauth_started', 'oauth_callback_failed', 'oauth_cancelled',
    'account_recovery_requested', 'account_suspended', 'account_banned',
    'account_deletion_requested', 'account_deleted', 'rate_limit_tripped',
    'reauthentication_required', 'reauthenticated',
    'mfa_challenge_created', 'mfa_challenge_failed', 'mfa_login_succeeded',
    'mfa_enrollment_started', 'mfa_enabled', 'mfa_disabled',
    'mfa_recovery_code_used'
  ));

ALTER TABLE public.auth_mfa_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_mfa_challenges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.auth_mfa_credentials FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.auth_mfa_challenges FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.auth_mfa_credentials TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.auth_mfa_challenges TO service_role;
REVOKE ALL ON FUNCTION public.accept_auth_mfa_counter(UUID, BIGINT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_auth_mfa_backup_code(UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_auth_mfa_challenge_attempts(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_auth_mfa_counter(UUID, BIGINT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_auth_mfa_backup_code(UUID, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_auth_mfa_challenge_attempts(UUID)
  TO service_role;
