-- ==============================================================================
-- SHONGRE USER CREDENTIALS
-- Migration: 00006_user_credentials.sql
--
-- Password hashes live in their own table rather than as a column on
-- public.profiles. profiles is read by ordinary product queries (seller cards,
-- admin user lists, /auth/me) and several of those do `select('*')`; a hash
-- column there is one forgotten projection away from being served to a client.
-- A separate table with its own RLS makes that mistake impossible to make by
-- accident.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.user_credentials (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    -- Self-describing hash: scrypt$<keylen>$<salt-hex>$<hash-hex>.
    -- Length is bounded to reject anything that is not one of our hashes.
    password_hash TEXT NOT NULL CHECK (length(password_hash) BETWEEN 32 AND 512),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;

-- No policies are defined, and that is deliberate.
--
-- With RLS enabled and zero policies, every anon/authenticated request through
-- PostgREST reads and writes nothing — including a request that has somehow
-- obtained another user's JWT. Credential verification runs in the backend
-- through the service-role client, which bypasses RLS by design. There is no
-- legitimate reason for a browser to read this table, so there is no policy
-- that would let it.
--
-- Explicitly revoke from the PostgREST-facing roles so this holds even if a
-- future migration adds a permissive policy elsewhere.
REVOKE ALL ON public.user_credentials FROM anon, authenticated;

COMMENT ON TABLE public.user_credentials IS
    'Password hashes (scrypt). Service-role access only; never exposed to clients.';

CREATE OR REPLACE FUNCTION public.touch_user_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_credentials_updated_at ON public.user_credentials;
CREATE TRIGGER trg_user_credentials_updated_at
    BEFORE UPDATE ON public.user_credentials
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_user_credentials_updated_at();
