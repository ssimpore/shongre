-- ==============================================================================
-- SHONGRE AUTHENTICATION IDENTITIES, SESSIONS AND SECURITY AUDIT
-- Migration: 00012_auth_identities_and_sessions.sql
--
-- Adds the three pieces the current password-only design has no place for:
--
--   1. public.user_identities  — one row per (provider, provider subject).
--      Social sign-in must key off the provider's immutable subject id, never
--      off an email address. Emails change hands; `sub` does not.
--
--   2. public.auth_sessions    — refresh-token family per device, so that
--      "log out everywhere", session listings and refresh-reuse detection are
--      possible. Today's JWT mints a `jti` "so individual sessions can be
--      revoked later" but nothing records it, so nothing can be revoked.
--
--   3. public.auth_audit_events — security-sensitive events, deliberately
--      free of credentials, tokens and authorization codes.
--
-- Existing profile ids are untouched: social identities attach to the profile
-- a user already has, so listings, messages, favourites and reviews follow the
-- account rather than the login method.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- Providers we actually support. An enum rather than free text so that a typo
-- in application code fails at the database boundary instead of silently
-- creating an unreachable identity row that no lookup will ever match.
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'auth_provider') THEN
        CREATE TYPE auth_provider AS ENUM ('password', 'google', 'apple', 'facebook');
    END IF;
END$$;

-- ==============================================================================
-- 1. IDENTITIES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.user_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    provider auth_provider NOT NULL,

    -- The provider's stable subject identifier (Google `sub`, Apple `sub`,
    -- Facebook app-scoped id). Never an email.
    provider_subject TEXT NOT NULL CHECK (char_length(provider_subject) BETWEEN 1 AND 255),

    -- Email as the provider asserted it at link time, kept for support and for
    -- showing the user which account they connected. Not an identity key, and
    -- not trusted for matching unless provider_email_verified is true.
    provider_email VARCHAR(255),
    provider_email_verified BOOLEAN NOT NULL DEFAULT FALSE,

    -- Apple returns the human name only on the very first authorization. When
    -- we get it, we keep it here so a later "name is missing" response cannot
    -- erase what we already learned.
    provider_display_name VARCHAR(255),

    -- True when the address is an Apple private-relay address. Such a user must
    -- never be asked to reveal a personal address just to keep using Shongre.
    is_private_relay BOOLEAN NOT NULL DEFAULT FALSE,

    linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_authenticated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Rule 6: one provider identity can belong to exactly one Shongre account.
    -- This is the constraint that makes silent account takeover by re-linking
    -- impossible; it is enforced here rather than in application code because
    -- two concurrent callbacks would otherwise both pass an application check.
    CONSTRAINT user_identities_provider_subject_unique UNIQUE (provider, provider_subject),

    -- A user may hold at most one identity per provider. Without this, a second
    -- Google account could be attached to the same profile and "unlink Google"
    -- becomes ambiguous.
    CONSTRAINT user_identities_user_provider_unique UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_user_identities_user ON public.user_identities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_identities_lookup ON public.user_identities(provider, provider_subject);

COMMENT ON TABLE public.user_identities IS
    'Authentication identities. One row per (provider, provider subject). Matching keys off provider_subject only; provider_email is informational.';
COMMENT ON COLUMN public.user_identities.provider_subject IS
    'Provider-stable subject id (Google/Apple sub, Facebook app-scoped id). Never an email address.';

-- Identities are credentials-adjacent: knowing which providers an address is
-- linked to is itself an enumeration vector. Same posture as user_credentials —
-- RLS on, no policies, service-role only.
ALTER TABLE public.user_identities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_identities FROM anon, authenticated;

-- ==============================================================================
-- 2. SESSIONS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.auth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Refresh tokens are stored hashed. A leaked database backup must not be a
    -- pile of usable sessions, exactly as with password hashes.
    refresh_token_hash TEXT NOT NULL UNIQUE CHECK (char_length(refresh_token_hash) BETWEEN 32 AND 512),

    -- Rotation lineage. Every refresh mints a new row pointing at the one it
    -- replaced; presenting a token whose row is already `rotated` means the
    -- token was replayed, which revokes the whole family.
    family_id UUID NOT NULL,
    rotated_from UUID REFERENCES public.auth_sessions(id) ON DELETE SET NULL,

    -- Which login method opened this session, so a password reset can revoke
    -- password sessions without signing the user out of a trusted device.
    provider auth_provider NOT NULL DEFAULT 'password',

    -- Coarse device description for the "your sessions" screen. Deliberately
    -- coarse: a full user-agent string is a fingerprint we do not need.
    device_label VARCHAR(120),
    ip_prefix VARCHAR(64),

    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Sensitive account changes (link/unlink, password changes, deletion) use
    -- this timestamp rather than treating any still-valid session as recent
    -- proof of identity.
    last_reauthenticated_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,

    revoked_at TIMESTAMPTZ,
    revoked_reason VARCHAR(60) CHECK (
        revoked_reason IS NULL OR revoked_reason IN (
            'logout', 'logout_all', 'rotated', 'reuse_detected',
            'password_changed', 'password_reset', 'email_changed',
            'provider_unlinked', 'account_suspended', 'account_banned',
            'account_deleted', 'expired', 'admin_revoked'
        )
    ),

    CONSTRAINT auth_sessions_expiry_after_issue CHECK (expires_at > issued_at)
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_active
    ON public.auth_sessions(user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_auth_sessions_family ON public.auth_sessions(family_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expiry ON public.auth_sessions(expires_at) WHERE revoked_at IS NULL;

COMMENT ON TABLE public.auth_sessions IS
    'Refresh-token families. Tokens stored hashed; rotation lineage enables replay detection.';

ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.auth_sessions FROM anon, authenticated;

-- ==============================================================================
-- 2b. TRANSIENT OAUTH STATE
--
-- OAuth state is an opaque random value. Only its SHA-256 digest is persisted;
-- the browser receives the raw value. The PKCE verifier must be available for
-- the token exchange, so it is stored service-role-only for at most ten
-- minutes. It is deleted by routine cleanup after consumption/expiry.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.oauth_authorization_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_hash TEXT NOT NULL UNIQUE CHECK (char_length(state_hash) = 64),
    provider auth_provider NOT NULL CHECK (provider <> 'password'),
    intent VARCHAR(12) NOT NULL CHECK (intent IN ('sign_in', 'link')),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.auth_sessions(id) ON DELETE CASCADE,
    return_to TEXT NOT NULL DEFAULT '/compte',
    client_kind VARCHAR(12) NOT NULL DEFAULT 'web' CHECK (client_kind IN ('web', 'native')),
    requested_account_type account_type CHECK (requested_account_type IN ('individual', 'professional')),
    nonce_hash TEXT NOT NULL CHECK (char_length(nonce_hash) = 64),
    code_verifier TEXT NOT NULL CHECK (char_length(code_verifier) BETWEEN 43 AND 128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    CONSTRAINT oauth_flow_expiry_after_creation CHECK (expires_at > created_at),
    CONSTRAINT oauth_link_requires_user CHECK (intent <> 'link' OR (user_id IS NOT NULL AND session_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_oauth_flows_expiry
    ON public.oauth_authorization_flows(expires_at) WHERE consumed_at IS NULL;

ALTER TABLE public.oauth_authorization_flows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.oauth_authorization_flows FROM anon, authenticated;

-- Native apps cannot receive an HttpOnly browser cookie. The provider callback
-- therefore redirects to the fixed Shongre app scheme with a one-time opaque
-- handle in the URL fragment. The app exchanges it once for a normal session.
CREATE TABLE IF NOT EXISTS public.oauth_native_exchanges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_hash TEXT NOT NULL UNIQUE CHECK (char_length(code_hash) = 64),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    provider auth_provider NOT NULL CHECK (provider <> 'password'),
    return_to TEXT NOT NULL DEFAULT '/(tabs)/account',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    CONSTRAINT oauth_exchange_expiry_after_creation CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_oauth_native_exchanges_expiry
    ON public.oauth_native_exchanges(expires_at) WHERE consumed_at IS NULL;

ALTER TABLE public.oauth_native_exchanges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.oauth_native_exchanges FROM anon, authenticated;

-- A provider (most commonly Facebook) may not assert a verified email. Keep
-- the validated provider subject behind an opaque, one-time handle while the
-- user supplies and verifies an address; do not create a placeholder account.
CREATE TABLE IF NOT EXISTS public.oauth_pending_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    handle_hash TEXT NOT NULL UNIQUE CHECK (char_length(handle_hash) = 64),
    provider auth_provider NOT NULL CHECK (provider <> 'password'),
    provider_subject TEXT NOT NULL CHECK (char_length(provider_subject) BETWEEN 1 AND 255),
    provider_email VARCHAR(255),
    provider_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    provider_display_name VARCHAR(255),
    provider_avatar_url TEXT,
    requested_account_type account_type CHECK (requested_account_type IN ('individual', 'professional')),
    client_kind VARCHAR(12) NOT NULL CHECK (client_kind IN ('web', 'native')),
    return_to TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    CONSTRAINT oauth_pending_expiry_after_creation CHECK (expires_at > created_at),
    CONSTRAINT oauth_pending_provider_subject_unique UNIQUE(provider, provider_subject)
);

CREATE INDEX IF NOT EXISTS idx_oauth_pending_expiry
    ON public.oauth_pending_registrations(expires_at) WHERE consumed_at IS NULL;
ALTER TABLE public.oauth_pending_registrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.oauth_pending_registrations FROM anon, authenticated;

-- Signed provider data-deletion requests enter the same deletion workflow as
-- user-originated requests. The opaque confirmation handle is stored only as a
-- digest; the provider subject is retained solely to locate/unlink the identity.
CREATE TABLE IF NOT EXISTS public.oauth_provider_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider auth_provider NOT NULL CHECK (provider <> 'password'),
    provider_subject TEXT NOT NULL CHECK (char_length(provider_subject) BETWEEN 1 AND 255),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    confirmation_code_hash TEXT NOT NULL UNIQUE CHECK (char_length(confirmation_code_hash) = 64),
    status VARCHAR(16) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'completed', 'rejected')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT provider_deletion_completion_consistent CHECK (
        (status = 'completed' AND completed_at IS NOT NULL) OR
        (status <> 'completed' AND completed_at IS NULL)
    )
);
CREATE INDEX IF NOT EXISTS idx_provider_deletion_queue
    ON public.oauth_provider_deletion_requests(status, requested_at)
    WHERE status = 'queued';
ALTER TABLE public.oauth_provider_deletion_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.oauth_provider_deletion_requests FROM anon, authenticated;

-- Shared, atomic rate-limit buckets. This avoids the common multi-instance bug
-- where each API process independently allows five attempts.
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
    key_hash TEXT NOT NULL CHECK (char_length(key_hash) = 64),
    action VARCHAR(40) NOT NULL,
    attempts INT NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reset_at TIMESTAMPTZ NOT NULL,
    locked_until TIMESTAMPTZ,
    PRIMARY KEY (key_hash, action)
);

CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_cleanup ON public.auth_rate_limits(reset_at);
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.auth_rate_limits FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.auth_action_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    purpose VARCHAR(32) NOT NULL CHECK (purpose IN ('verify_email', 'password_reset', 'account_recovery')),
    token_hash TEXT NOT NULL UNIQUE CHECK (char_length(token_hash) = 64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    CONSTRAINT auth_action_expiry_after_creation CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS idx_auth_action_tokens_expiry
    ON public.auth_action_tokens(expires_at) WHERE consumed_at IS NULL;
ALTER TABLE public.auth_action_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.auth_action_tokens FROM anon, authenticated;

-- Atomic one-time consumption. SELECT-then-UPDATE in application code would
-- let two callback requests redeem the same state concurrently.
CREATE OR REPLACE FUNCTION public.consume_oauth_authorization_flow(p_state_hash TEXT)
RETURNS SETOF public.oauth_authorization_flows
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    UPDATE public.oauth_authorization_flows
       SET consumed_at = NOW()
     WHERE state_hash = p_state_hash
       AND consumed_at IS NULL
       AND expires_at > NOW()
    RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_oauth_native_exchange(p_code_hash TEXT)
RETURNS SETOF public.oauth_native_exchanges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    UPDATE public.oauth_native_exchanges
       SET consumed_at = NOW()
     WHERE code_hash = p_code_hash
       AND consumed_at IS NULL
       AND expires_at > NOW()
    RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_oauth_pending_registration(p_handle_hash TEXT)
RETURNS SETOF public.oauth_pending_registrations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    UPDATE public.oauth_pending_registrations
       SET consumed_at = NOW()
     WHERE handle_hash = p_handle_hash
       AND consumed_at IS NULL
       AND expires_at > NOW()
    RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_auth_action_token(p_token_hash TEXT, p_purpose VARCHAR)
RETURNS SETOF public.auth_action_tokens
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    UPDATE public.auth_action_tokens
       SET consumed_at = NOW()
     WHERE token_hash = p_token_hash
       AND purpose = p_purpose
       AND consumed_at IS NULL
       AND expires_at > NOW()
    RETURNING *;
END;
$$;

-- New-account provisioning is one database transaction. If the identity
-- uniqueness constraint loses a race, PostgreSQL rolls the profile insert back
-- as well, so no orphan account can survive a concurrent OAuth callback.
CREATE OR REPLACE FUNCTION public.provision_oauth_profile(
    p_user_id UUID,
    p_slug TEXT,
    p_email TEXT,
    p_name TEXT,
    p_status account_status,
    p_avatar_url TEXT,
    p_email_verified BOOLEAN,
    p_provider auth_provider,
    p_provider_subject TEXT,
    p_provider_email TEXT,
    p_provider_email_verified BOOLEAN,
    p_provider_display_name TEXT,
    p_is_private_relay BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_provider = 'password' OR p_status NOT IN ('active', 'pending_verification') THEN
        RAISE EXCEPTION 'Invalid OAuth profile provisioning request' USING ERRCODE = 'check_violation';
    END IF;

    INSERT INTO public.profiles (
        id, slug, email, name, account_type, primary_role, status,
        avatar_url, country, is_verified, is_identity_verified,
        is_phone_verified, is_email_verified, is_business_verified
    ) VALUES (
        p_user_id, p_slug, lower(trim(p_email)), p_name,
        'individual', 'individual_buyer', p_status,
        p_avatar_url, 'FR', FALSE, FALSE, FALSE,
        p_email_verified, FALSE
    );

    INSERT INTO public.user_identities (
        user_id, provider, provider_subject, provider_email,
        provider_email_verified, provider_display_name,
        is_private_relay, last_authenticated_at
    ) VALUES (
        p_user_id, p_provider, p_provider_subject, p_provider_email,
        p_provider_email_verified, p_provider_display_name,
        p_is_private_relay, NOW()
    );

    RETURN p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_auth_rate_limit(
    p_key_hash TEXT,
    p_action VARCHAR,
    p_limit INT,
    p_window_seconds INT,
    p_lock_seconds INT
)
RETURNS TABLE(allowed BOOLEAN, retry_after_seconds INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_row public.auth_rate_limits%ROWTYPE;
    next_attempts INT;
BEGIN
    SELECT * INTO current_row
      FROM public.auth_rate_limits
     WHERE key_hash = p_key_hash AND action = p_action
     FOR UPDATE;

    IF NOT FOUND OR current_row.reset_at <= NOW() THEN
        INSERT INTO public.auth_rate_limits(key_hash, action, attempts, window_started_at, reset_at, locked_until)
        VALUES (p_key_hash, p_action, 1, NOW(), NOW() + make_interval(secs => p_window_seconds), NULL)
        ON CONFLICT (key_hash, action) DO UPDATE SET
            attempts = 1,
            window_started_at = NOW(),
            reset_at = NOW() + make_interval(secs => p_window_seconds),
            locked_until = NULL;
        RETURN QUERY SELECT TRUE, 0;
        RETURN;
    END IF;

    IF current_row.locked_until IS NOT NULL AND current_row.locked_until > NOW() THEN
        RETURN QUERY SELECT FALSE, GREATEST(1, CEIL(EXTRACT(EPOCH FROM (current_row.locked_until - NOW())))::INT);
        RETURN;
    END IF;

    next_attempts := current_row.attempts + 1;
    UPDATE public.auth_rate_limits
       SET attempts = next_attempts,
           locked_until = CASE
               WHEN next_attempts > p_limit THEN NOW() + make_interval(secs => p_lock_seconds)
               ELSE NULL
           END
     WHERE key_hash = p_key_hash AND action = p_action;

    IF next_attempts > p_limit THEN
        RETURN QUERY SELECT FALSE, p_lock_seconds;
    ELSE
        RETURN QUERY SELECT TRUE, 0;
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_oauth_authorization_flow(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_oauth_native_exchange(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_oauth_pending_registration(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_auth_action_token(TEXT, VARCHAR) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.provision_oauth_profile(UUID, TEXT, TEXT, TEXT, account_status, TEXT, BOOLEAN, auth_provider, TEXT, TEXT, BOOLEAN, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_auth_rate_limit(TEXT, VARCHAR, INT, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_oauth_authorization_flow(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_oauth_native_exchange(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_oauth_pending_registration(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_auth_action_token(TEXT, VARCHAR) TO service_role;
GRANT EXECUTE ON FUNCTION public.provision_oauth_profile(UUID, TEXT, TEXT, TEXT, account_status, TEXT, BOOLEAN, auth_provider, TEXT, TEXT, BOOLEAN, TEXT, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_auth_rate_limit(TEXT, VARCHAR, INT, INT, INT) TO service_role;

-- ==============================================================================
-- 3. SECURITY AUDIT EVENTS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.auth_audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Nullable: a failed login for an address that does not exist still deserves
    -- a rate-limiting record, and there is no user to attribute it to.
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'login_succeeded', 'login_failed', 'logout', 'logout_all',
        'session_refreshed', 'session_reuse_detected', 'session_revoked',
        'registered', 'email_verification_sent', 'email_verified',
        'password_reset_requested', 'password_reset_completed', 'password_changed',
        'email_change_requested', 'email_changed',
        'identity_linked', 'identity_unlinked', 'identity_link_rejected',
        'oauth_started', 'oauth_callback_failed', 'oauth_cancelled',
        'account_recovery_requested',
        'account_suspended', 'account_banned', 'account_deletion_requested', 'account_deleted',
        'rate_limit_tripped', 'reauthentication_required', 'reauthenticated'
    )),

    provider auth_provider,

    -- Why a login failed, as a category only. Never the submitted password, the
    -- authorization code, or the token.
    failure_reason VARCHAR(60),

    -- Truncated network origin. A /24 (or /48 for v6) is enough to spot
    -- credential stuffing without retaining a precise location per event.
    ip_prefix VARCHAR(64),
    user_agent_family VARCHAR(80),

    -- Free-form, non-sensitive context (e.g. which provider was unlinked).
    -- Application code must never place tokens or codes here; see the CHECK.
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Defence in depth against a careless caller: reject payloads carrying
    -- anything that looks like a credential field.
    CONSTRAINT auth_audit_metadata_has_no_secrets CHECK (
        NOT (metadata ?| ARRAY[
            'password', 'token', 'access_token', 'refresh_token',
            'id_token', 'code', 'client_secret', 'private_key', 'authorization'
        ])
    )
);

CREATE INDEX IF NOT EXISTS idx_auth_audit_user_time ON public.auth_audit_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_audit_type_time ON public.auth_audit_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_audit_ip_time ON public.auth_audit_events(ip_prefix, created_at DESC);

COMMENT ON TABLE public.auth_audit_events IS
    'Security-sensitive authentication events. Never stores passwords, tokens, authorization codes or provider secrets.';

ALTER TABLE public.auth_audit_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.auth_audit_events FROM anon, authenticated;

-- ==============================================================================
-- 4. TRIGGERS
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.touch_user_identities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_identities_updated_at ON public.user_identities;
CREATE TRIGGER trg_user_identities_updated_at
    BEFORE UPDATE ON public.user_identities
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_user_identities_updated_at();

-- ==============================================================================
-- 5. LOCKOUT GUARD
--
-- Rule: an account must always retain at least one usable login method. A
-- profile with a password row may unlink every provider; a profile without one
-- must keep its last identity. Enforced in the database because the check is a
-- read-modify-write that two concurrent unlink requests would both pass in
-- application code.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.prevent_last_login_method_removal()
RETURNS TRIGGER AS $$
DECLARE
    remaining_identities INT;
    has_password BOOLEAN;
    account_state account_status;
BEGIN
    -- Account deletion cascades through here; it is not an unlink.
    SELECT status INTO account_state FROM public.profiles WHERE id = OLD.user_id;
    IF NOT FOUND OR account_state = 'deleted' THEN
        RETURN OLD;
    END IF;

    SELECT COUNT(*) INTO remaining_identities
    FROM public.user_identities
    WHERE user_id = OLD.user_id AND id <> OLD.id;

    SELECT EXISTS (
        SELECT 1 FROM public.user_credentials WHERE user_id = OLD.user_id
    ) INTO has_password;

    IF remaining_identities = 0 AND NOT has_password THEN
        RAISE EXCEPTION
            'Cannot unlink the last remaining sign-in method for profile %', OLD.user_id
            USING ERRCODE = 'check_violation',
                  HINT = 'Set a password or link another provider before unlinking this one.';
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_last_login_method_removal ON public.user_identities;
CREATE TRIGGER trg_prevent_last_login_method_removal
    BEFORE DELETE ON public.user_identities
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_last_login_method_removal();

-- ==============================================================================
-- 6. BACKFILL
--
-- Every existing account authenticates with a password today. Give each one an
-- explicit `password` identity row so that "which methods can this account use"
-- is answered by one query rather than by special-casing the absence of a row.
-- Internal ids are preserved; nothing about existing sessions changes.
-- ==============================================================================

INSERT INTO public.user_identities (user_id, provider, provider_subject, provider_email, provider_email_verified)
SELECT
    p.id,
    'password'::auth_provider,
    p.id::text,          -- the account is its own subject for local credentials
    p.email,
    p.is_email_verified
FROM public.profiles p
WHERE EXISTS (SELECT 1 FROM public.user_credentials c WHERE c.user_id = p.id)
ON CONFLICT (provider, provider_subject) DO NOTHING;
