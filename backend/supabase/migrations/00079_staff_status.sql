-- =============================================================================
-- Orthogonal, server-managed Staff status
-- Migration: 00079_staff_status.sql
--
-- Individual and Professional remain the only customer account types. Staff
-- access is a separately granted, revocable membership whose writes are
-- service-role only, validated in PostgreSQL and audited in the same
-- transaction.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'staff_membership_status') THEN
    CREATE TYPE staff_membership_status AS ENUM ('active', 'suspended', 'revoked');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.staff_memberships (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  status staff_membership_status NOT NULL,
  staff_role VARCHAR(30) NOT NULL CHECK (staff_role IN (
    'support_agent','moderator','trust_safety','compliance','finance',
    'operations','commercial','content_manager','market_manager','admin','owner'
  )),
  granted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  suspended_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  change_reason TEXT NOT NULL DEFAULT 'Migration du statut Staff historique',
  version BIGINT NOT NULL DEFAULT 1 CHECK (version > 0),
  CHECK (char_length(btrim(change_reason)) >= 10),
  CHECK ((status = 'suspended') = (suspended_at IS NOT NULL)),
  CHECK ((status = 'revoked') = (revoked_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS staff_memberships_active_role_idx
  ON public.staff_memberships (staff_role, user_id)
  WHERE status = 'active';

ALTER TABLE public.staff_memberships ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.staff_memberships FROM PUBLIC, anon, authenticated;

-- Backfill before installing the mutation guard. These rows already passed the
-- canonical v23 staff-role constraint.
INSERT INTO public.staff_memberships (
  user_id, status, staff_role, granted_by, updated_by, change_reason
)
SELECT
  profile.id,
  'active'::staff_membership_status,
  profile.staff_role,
  NULL,
  NULL,
  'Migration du statut Staff historique'
FROM public.profiles profile
WHERE profile.account_family = 'staff'
  AND profile.staff_role IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- Convert historical Staff profiles to an underlying Individual account. Staff
-- authority now comes exclusively from staff_memberships.
UPDATE public.profiles
SET account_type = 'individual',
    account_family = 'individual',
    staff_role = NULL,
    professional_vertical = NULL,
    primary_role = 'individual_buyer',
    updated_at = NOW()
WHERE account_family = 'staff'
   OR account_type::TEXT IN ('staff', 'internal');

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_access_dimensions_check,
  DROP CONSTRAINT IF EXISTS profiles_account_family_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_account_family_check
    CHECK (account_family IN ('individual','professional')),
  ADD CONSTRAINT profiles_access_dimensions_check
    CHECK (
      staff_role IS NULL
      AND (
        (account_family = 'individual' AND professional_vertical IS NULL)
        OR (account_family = 'professional' AND professional_vertical IS NOT NULL)
      )
    );

CREATE OR REPLACE FUNCTION public.sync_profile_access_dimensions()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.account_type::TEXT IN ('internal', 'staff') THEN
    RAISE EXCEPTION 'Staff is a status, not an account type' USING ERRCODE = '23514';
  END IF;
  IF NEW.staff_role IS NOT NULL THEN
    RAISE EXCEPTION 'Staff roles must be managed through staff_memberships' USING ERRCODE = '23514';
  END IF;
  NEW.account_family := NEW.account_type::TEXT;
  IF NEW.account_family <> 'professional' THEN
    NEW.professional_vertical := NULL;
  ELSIF NEW.professional_vertical IS NULL THEN
    NEW.professional_vertical := 'generic';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_sync_access_dimensions ON public.profiles;
CREATE TRIGGER profiles_sync_access_dimensions
BEFORE INSERT OR UPDATE OF account_type, professional_vertical, staff_role
ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_access_dimensions();

CREATE OR REPLACE FUNCTION public.validate_staff_membership_change()
RETURNS TRIGGER AS $$
DECLARE
  actor_role TEXT;
  previous_role TEXT;
  previous_status TEXT;
BEGIN
  IF NEW.updated_by IS NULL THEN
    RAISE EXCEPTION 'A Staff change requires an actor' USING ERRCODE = '23514';
  END IF;
  IF NEW.updated_by = NEW.user_id THEN
    RAISE EXCEPTION 'Staff access cannot be self-managed' USING ERRCODE = '42501';
  END IF;
  IF char_length(btrim(NEW.change_reason)) < 10 THEN
    RAISE EXCEPTION 'A Staff change requires a reason' USING ERRCODE = '23514';
  END IF;

  SELECT membership.staff_role
  INTO actor_role
  FROM public.staff_memberships membership
  JOIN public.profiles actor_profile ON actor_profile.id = membership.user_id
  WHERE membership.user_id = NEW.updated_by
    AND membership.status = 'active'
    AND actor_profile.status::TEXT = 'active';

  IF actor_role IS NULL OR actor_role NOT IN ('admin', 'owner') THEN
    RAISE EXCEPTION 'Actor cannot manage Staff access' USING ERRCODE = '42501';
  END IF;

  previous_role := CASE WHEN TG_OP = 'UPDATE' THEN OLD.staff_role ELSE NULL END;
  previous_status := CASE WHEN TG_OP = 'UPDATE' THEN OLD.status::TEXT ELSE NULL END;

  -- Serialize owner lifecycle changes so concurrent revocations cannot both
  -- observe another active owner and remove the platform's final owner.
  IF NEW.staff_role = 'owner' OR previous_role = 'owner' THEN
    PERFORM pg_advisory_xact_lock(hashtext('shongre_staff_active_owner_guard'));
  END IF;

  IF (NEW.staff_role = 'owner' OR previous_role = 'owner') AND actor_role <> 'owner' THEN
    RAISE EXCEPTION 'Only an owner can manage owner access' USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'UPDATE'
     AND previous_role = 'owner'
     AND previous_status = 'active'
     AND (NEW.staff_role <> 'owner' OR NEW.status <> 'active')
     AND NOT EXISTS (
       SELECT 1
       FROM public.staff_memberships other_owner
       WHERE other_owner.user_id <> OLD.user_id
         AND other_owner.staff_role = 'owner'
         AND other_owner.status = 'active'
     ) THEN
    RAISE EXCEPTION 'The last active Staff owner cannot be removed' USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.granted_by := NEW.updated_by;
    NEW.granted_at := NOW();
    NEW.version := 1;
  ELSE
    NEW.granted_by := OLD.granted_by;
    NEW.granted_at := OLD.granted_at;
    NEW.version := OLD.version + 1;
  END IF;
  NEW.updated_at := NOW();
  NEW.suspended_at := CASE WHEN NEW.status = 'suspended' THEN NOW() ELSE NULL END;
  NEW.revoked_at := CASE WHEN NEW.status = 'revoked' THEN NOW() ELSE NULL END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.audit_staff_membership_change()
RETURNS TRIGGER AS $$
DECLARE
  actor_profile public.profiles%ROWTYPE;
  target_profile public.profiles%ROWTYPE;
  actor_staff_role TEXT;
  audit_action TEXT;
BEGIN
  SELECT * INTO actor_profile FROM public.profiles WHERE id = NEW.updated_by;
  SELECT * INTO target_profile FROM public.profiles WHERE id = NEW.user_id;
  SELECT staff_role INTO actor_staff_role
  FROM public.staff_memberships
  WHERE user_id = NEW.updated_by;

  audit_action := CASE
    WHEN TG_OP = 'INSERT' THEN 'staff_access_granted'
    WHEN NEW.status = 'revoked' AND OLD.status <> 'revoked' THEN 'staff_access_revoked'
    WHEN NEW.status = 'suspended' AND OLD.status <> 'suspended' THEN 'staff_access_suspended'
    WHEN NEW.status = 'active' AND OLD.status <> 'active' THEN 'staff_access_reactivated'
    WHEN NEW.staff_role <> OLD.staff_role THEN 'staff_role_changed'
    ELSE 'staff_access_updated'
  END;

  INSERT INTO public.audit_logs (
    actor_id, actor_name, actor_role, target_id, target_name,
    action, details, metadata
  ) VALUES (
    NEW.updated_by,
    actor_profile.email,
    actor_staff_role,
    NEW.user_id::TEXT,
    target_profile.name,
    audit_action,
    btrim(NEW.change_reason),
    jsonb_build_object(
      'previousStatus', CASE WHEN TG_OP = 'UPDATE' THEN OLD.status::TEXT ELSE 'none' END,
      'newStatus', NEW.status::TEXT,
      'previousRole', CASE WHEN TG_OP = 'UPDATE' THEN OLD.staff_role ELSE NULL END,
      'newRole', NEW.staff_role,
      'membershipVersion', NEW.version
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS staff_memberships_validate_change ON public.staff_memberships;
CREATE TRIGGER staff_memberships_validate_change
BEFORE INSERT OR UPDATE ON public.staff_memberships
FOR EACH ROW EXECUTE FUNCTION public.validate_staff_membership_change();

DROP TRIGGER IF EXISTS staff_memberships_audit_change ON public.staff_memberships;
CREATE TRIGGER staff_memberships_audit_change
AFTER INSERT OR UPDATE ON public.staff_memberships
FOR EACH ROW EXECUTE FUNCTION public.audit_staff_membership_change();

-- RLS and database-side capability checks use only active Staff memberships.
CREATE OR REPLACE FUNCTION public.has_capability(required_capability TEXT)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(EXISTS (
    SELECT 1
    FROM public.profiles profile
    LEFT JOIN public.staff_memberships staff
      ON staff.user_id = profile.id AND staff.status = 'active'
    WHERE profile.id = public.current_profile_id()
      AND required_capability <> ALL(profile.revoked_permissions)
      AND CASE profile.status::TEXT
        WHEN 'active' THEN TRUE
        WHEN 'pending' THEN required_capability IN ('profile.read','profile.update.own','report.create')
        WHEN 'pending_verification' THEN required_capability IN ('profile.read','profile.update.own','report.create')
        WHEN 'restricted' THEN required_capability IN ('profile.read','profile.update.own','message.read.own','order.read.own','report.create')
        WHEN 'suspended' THEN required_capability IN ('profile.read','message.read.own','order.read.own','report.create')
        ELSE FALSE
      END
      AND (
        (
          required_capability = ANY(profile.custom_permissions)
          AND (
            staff.user_id IS NOT NULL
            OR NOT EXISTS (
              SELECT 1
              FROM public.access_role_grants staff_grant
              WHERE staff_grant.capability_id = required_capability
                AND staff_grant.role_kind = 'staff_role'
                AND NOT EXISTS (
                  SELECT 1
                  FROM public.access_role_grants customer_grant
                  WHERE customer_grant.capability_id = required_capability
                    AND customer_grant.role_kind IN ('account_family','professional_vertical')
                )
            )
          )
        )
        OR EXISTS (
          SELECT 1 FROM public.access_role_grants grant_row
          WHERE grant_row.capability_id = required_capability
            AND (
              (grant_row.role_kind = 'account_family' AND grant_row.role_key = profile.account_family)
              OR (grant_row.role_kind = 'staff_role' AND grant_row.role_key = staff.staff_role)
              OR (grant_row.role_kind = 'professional_vertical' AND grant_row.role_key = profile.professional_vertical)
            )
        )
      )
  ), FALSE);
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE VIEW public.public_profiles AS
SELECT id, slug, name, avatar_url, city, country, bio, account_family,
       professional_vertical, is_verified, is_business_verified,
       rating, review_count, response_rate_percent, response_time_text, created_at
FROM public.profiles
WHERE status::TEXT = 'active';

GRANT SELECT ON public.public_profiles TO anon, authenticated;

COMMENT ON TABLE public.staff_memberships IS
  'Server-managed Staff status and role. Absence means no Staff status; only active rows grant Staff capabilities.';
COMMENT ON COLUMN public.profiles.staff_role IS
  'Deprecated compatibility column. Must remain NULL; Staff roles live in staff_memberships.';
COMMENT ON COLUMN public.profiles.primary_role IS
  'Legacy customer activity label. Staff authority comes only from staff_memberships.';
