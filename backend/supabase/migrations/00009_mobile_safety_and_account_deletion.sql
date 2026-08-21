-- Mobile/store safety primitives: account erasure audit, authoritative blocks,
-- and per-account push device registration.

CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL CHECK (status IN ('requested', 'blocked', 'completed')),
    reason TEXT CHECK (reason IS NULL OR char_length(reason) <= 500),
    blocked_reason VARCHAR(100),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.blocked_users (
    blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (blocker_id, blocked_id),
    CONSTRAINT cannot_block_self CHECK (blocker_id <> blocked_id)
);

CREATE TABLE IF NOT EXISTS public.push_device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('ios', 'android')),
    app_version VARCHAR(30),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON public.blocked_users(blocked_id);
CREATE INDEX IF NOT EXISTS idx_push_device_tokens_user ON public.push_device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_account_deletion_status ON public.account_deletion_requests(status, requested_at);

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_device_tokens ENABLE ROW LEVEL SECURITY;

-- User-facing reads/writes can only concern the authenticated profile. Backend
-- domain services use the service role and still enforce the same ownership.
CREATE POLICY "blocked_users_select_own" ON public.blocked_users
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = blocker_id AND p.auth_user_id = auth.uid())
    );
CREATE POLICY "blocked_users_insert_own" ON public.blocked_users
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = blocker_id AND p.auth_user_id = auth.uid())
    );
CREATE POLICY "blocked_users_delete_own" ON public.blocked_users
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = blocker_id AND p.auth_user_id = auth.uid())
    );

CREATE POLICY "push_tokens_manage_own" ON public.push_device_tokens
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_id AND p.auth_user_id = auth.uid())
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_id AND p.auth_user_id = auth.uid())
    );

-- Deletion audit records may contain a user-supplied reason and are therefore
-- service-role only. No anon/authenticated policy is granted.

-- The destructive database mutations are atomic. Password reauthentication
-- and active-order checks happen in the domain service before this service-role
-- only function is called.
CREATE OR REPLACE FUNCTION public.complete_account_deletion(
    p_user_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF p_reason IS NOT NULL AND char_length(p_reason) > 500 THEN
        RAISE EXCEPTION 'Deletion reason exceeds 500 characters';
    END IF;

    INSERT INTO public.account_deletion_requests (
        user_id, status, reason, requested_at, completed_at
    ) VALUES (
        p_user_id, 'completed', NULLIF(btrim(p_reason), ''), NOW(), NOW()
    );

    DELETE FROM public.push_device_tokens WHERE user_id = p_user_id;
    DELETE FROM public.user_credentials WHERE user_id = p_user_id;

    RETURN QUERY
    UPDATE public.profiles
    SET
        slug = 'deleted-' || p_user_id::TEXT,
        email = 'deleted+' || p_user_id::TEXT || '@anonymized.invalid',
        name = 'Utilisateur supprimé',
        status = 'deleted',
        avatar_url = NULL,
        phone = NULL,
        city = NULL,
        postal_code = NULL,
        department = NULL,
        region = NULL,
        bio = NULL,
        is_verified = FALSE,
        is_identity_verified = FALSE,
        is_phone_verified = FALSE,
        is_email_verified = FALSE,
        is_business_verified = FALSE,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING public.profiles.*;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Account not found';
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_account_deletion(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_account_deletion(UUID, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_account_deletion(UUID, TEXT) TO service_role;
