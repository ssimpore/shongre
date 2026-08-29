-- =============================================================================
-- Staff capability-management workflow
-- Migration: 00082_staff_capability_management.sql
--
-- Direct capability overrides remain account data, while employee authority is
-- derived only from an active staff_memberships row. This migration adds the
-- canonical shared Staff capability, optimistic concurrency, an allowlisted
-- transactional mutation, audit evidence, and immediate session revocation.
-- =============================================================================

INSERT INTO public.access_capabilities (id, is_sensitive)
VALUES ('staff.internal.access', TRUE)
ON CONFLICT (id) DO UPDATE SET is_sensitive = EXCLUDED.is_sensitive;

INSERT INTO public.access_role_grants (role_kind, role_key, capability_id)
SELECT 'staff_role', role_key, 'staff.internal.access'
FROM unnest(ARRAY[
  'support_agent','moderator','trust_safety','compliance','finance',
  'operations','commercial','content_manager','market_manager','admin','owner'
]::TEXT[]) AS role_key
ON CONFLICT DO NOTHING;

INSERT INTO public.access_role_grants (role_kind, role_key, capability_id)
VALUES
  ('staff_role', 'admin', 'admin.permissions.manage'),
  ('staff_role', 'owner', 'admin.permissions.manage')
ON CONFLICT DO NOTHING;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS capability_override_version BIGINT NOT NULL DEFAULT 1;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_capability_override_version_check,
  ADD CONSTRAINT profiles_capability_override_version_check
    CHECK (capability_override_version > 0);

-- Capability and Staff lifecycle changes force every device to establish a new
-- session. Keep these reasons explicit so the session ledger remains bounded.
ALTER TABLE public.auth_sessions
  DROP CONSTRAINT IF EXISTS auth_sessions_revoked_reason_check;
ALTER TABLE public.auth_sessions
  ADD CONSTRAINT auth_sessions_revoked_reason_check CHECK (
    revoked_reason IS NULL OR revoked_reason IN (
      'logout', 'logout_all', 'rotated', 'reuse_detected',
      'password_changed', 'password_reset', 'email_changed',
      'provider_unlinked', 'account_suspended', 'account_banned',
      'account_deleted', 'expired', 'admin_revoked',
      'staff_access_changed', 'capability_overrides_changed'
    )
  );

CREATE OR REPLACE FUNCTION public.update_profile_capability_overrides(
  p_target_user_id UUID,
  p_actor_id UUID,
  p_custom_permissions TEXT[],
  p_revoked_permissions TEXT[],
  p_reason TEXT,
  p_expected_version BIGINT,
  p_request_id TEXT DEFAULT NULL
)
RETURNS TABLE(capability_override_version BIGINT) AS $$
DECLARE
  actor_role TEXT;
  target_role TEXT;
  target_name TEXT;
  previous_custom TEXT[];
  previous_revoked TEXT[];
  previous_version BIGINT;
  next_custom TEXT[];
  next_revoked TEXT[];
BEGIN
  IF p_actor_id IS NULL OR p_target_user_id IS NULL THEN
    RAISE EXCEPTION 'Capability changes require an actor and target' USING ERRCODE = '23514';
  END IF;
  IF p_actor_id = p_target_user_id THEN
    RAISE EXCEPTION 'Capability overrides cannot be self-managed' USING ERRCODE = '42501';
  END IF;
  IF char_length(btrim(COALESCE(p_reason, ''))) NOT BETWEEN 10 AND 1000 THEN
    RAISE EXCEPTION 'Capability changes require a reason of 10 to 1000 characters' USING ERRCODE = '23514';
  END IF;
  IF p_expected_version IS NULL OR p_expected_version < 1 THEN
    RAISE EXCEPTION 'Capability changes require a valid expected version' USING ERRCODE = '23514';
  END IF;

  next_custom := COALESCE(p_custom_permissions, ARRAY[]::TEXT[]);
  next_revoked := COALESCE(p_revoked_permissions, ARRAY[]::TEXT[]);

  IF cardinality(next_custom) <> (
    SELECT COUNT(DISTINCT capability) FROM unnest(next_custom) AS capability
  ) OR cardinality(next_revoked) <> (
    SELECT COUNT(DISTINCT capability) FROM unnest(next_revoked) AS capability
  ) THEN
    RAISE EXCEPTION 'Capability collections must not contain duplicates' USING ERRCODE = '23514';
  END IF;

  IF next_custom && next_revoked THEN
    RAISE EXCEPTION 'A capability cannot be both granted and revoked' USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(next_custom || next_revoked) AS requested(capability_id)
    LEFT JOIN public.access_capabilities known
      ON known.id = requested.capability_id
    WHERE known.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Unknown capability identifier' USING ERRCODE = '23514';
  END IF;

  SELECT membership.staff_role
  INTO actor_role
  FROM public.staff_memberships membership
  JOIN public.profiles actor_profile ON actor_profile.id = membership.user_id
  WHERE membership.user_id = p_actor_id
    AND membership.status = 'active'
    AND actor_profile.status::TEXT = 'active'
    AND 'admin.permissions.manage' <> ALL(actor_profile.revoked_permissions)
    AND (
      'admin.permissions.manage' = ANY(actor_profile.custom_permissions)
      OR EXISTS (
        SELECT 1
        FROM public.access_role_grants grant_row
        WHERE grant_row.role_kind = 'staff_role'
          AND grant_row.role_key = membership.staff_role
          AND grant_row.capability_id = 'admin.permissions.manage'
      )
    );

  IF actor_role IS NULL THEN
    RAISE EXCEPTION 'Actor cannot manage capability overrides' USING ERRCODE = '42501';
  END IF;

  SELECT profile.name, profile.custom_permissions, profile.revoked_permissions,
         profile.capability_override_version
  INTO target_name, previous_custom, previous_revoked, previous_version
  FROM public.profiles profile
  WHERE profile.id = p_target_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Capability target not found' USING ERRCODE = 'P0002';
  END IF;
  IF previous_version <> p_expected_version THEN
    RAISE EXCEPTION 'Capability overrides changed concurrently' USING ERRCODE = '40001';
  END IF;

  SELECT membership.staff_role
  INTO target_role
  FROM public.staff_memberships membership
  WHERE membership.user_id = p_target_user_id;

  IF actor_role <> 'owner' AND target_role = 'owner' THEN
    RAISE EXCEPTION 'Only an owner can modify an owner' USING ERRCODE = '42501';
  END IF;
  IF actor_role <> 'owner' AND next_custom && ARRAY[
    'permission.manage',
    'provider.credentials.manage',
    'monetization.complimentary_grants.create'
  ]::TEXT[] THEN
    RAISE EXCEPTION 'Only an owner can grant owner-only capabilities' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(array_agg(capability ORDER BY capability), ARRAY[]::TEXT[])
  INTO next_custom
  FROM unnest(next_custom) AS capability;
  SELECT COALESCE(array_agg(capability ORDER BY capability), ARRAY[]::TEXT[])
  INTO next_revoked
  FROM unnest(next_revoked) AS capability;

  UPDATE public.profiles
  SET custom_permissions = next_custom,
      revoked_permissions = next_revoked,
      capability_override_version = previous_version + 1,
      updated_at = NOW()
  WHERE id = p_target_user_id;

  UPDATE public.auth_sessions
  SET revoked_at = NOW(), revoked_reason = 'capability_overrides_changed'
  WHERE user_id = p_target_user_id AND revoked_at IS NULL;

  INSERT INTO public.audit_logs (
    actor_id, actor_name, actor_role, target_id, target_name,
    action, details, metadata
  )
  SELECT
    p_actor_id,
    actor_profile.email,
    actor_role,
    p_target_user_id::TEXT,
    target_name,
    'capability_overrides_updated',
    btrim(p_reason),
    jsonb_build_object(
      'previousCustomPermissions', previous_custom,
      'newCustomPermissions', next_custom,
      'previousRevokedPermissions', previous_revoked,
      'newRevokedPermissions', next_revoked,
      'previousVersion', previous_version,
      'newVersion', previous_version + 1,
      'requestId', NULLIF(btrim(COALESCE(p_request_id, '')), '')
    )
  FROM public.profiles actor_profile
  WHERE actor_profile.id = p_actor_id;

  RETURN QUERY SELECT previous_version + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.update_profile_capability_overrides(
  UUID, UUID, TEXT[], TEXT[], TEXT, BIGINT, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_profile_capability_overrides(
  UUID, UUID, TEXT[], TEXT[], TEXT, BIGINT, TEXT
) TO service_role;

COMMENT ON FUNCTION public.update_profile_capability_overrides(
  UUID, UUID, TEXT[], TEXT[], TEXT, BIGINT, TEXT
) IS 'Allowlisted, optimistic, audited Staff capability-override update. Revokes target sessions atomically.';
COMMENT ON COLUMN public.profiles.capability_override_version IS
  'Optimistic concurrency version for direct capability grant and revocation collections.';
