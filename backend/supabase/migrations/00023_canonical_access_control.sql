-- =============================================================================
-- Canonical account families, capabilities and least-privilege RLS helpers
-- Migration: 00023_canonical_access_control.sql
--
-- Expand/backfill first. Legacy primary_role values remain readable while all
-- new authorization resolves account family + staff role + vertical + direct
-- grants. The application no longer treats a customer plan or role label as a
-- security permission.
-- =============================================================================

ALTER TYPE account_type ADD VALUE IF NOT EXISTS 'staff';
ALTER TYPE account_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE account_status ADD VALUE IF NOT EXISTS 'restricted';
ALTER TYPE account_status ADD VALUE IF NOT EXISTS 'closed';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_family VARCHAR(20),
  ADD COLUMN IF NOT EXISTS professional_vertical VARCHAR(30),
  ADD COLUMN IF NOT EXISTS staff_role VARCHAR(30),
  ADD COLUMN IF NOT EXISTS custom_permissions TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS revoked_permissions TEXT[] NOT NULL DEFAULT '{}';

UPDATE public.profiles
SET account_family = CASE
  WHEN account_type::TEXT IN ('internal', 'staff') THEN 'staff'
  ELSE account_type::TEXT
END
WHERE account_family IS NULL;

UPDATE public.profiles
SET staff_role = CASE primary_role::TEXT
  WHEN 'support' THEN 'support_agent'
  WHEN 'moderator' THEN 'moderator'
  WHEN 'operations' THEN 'operations'
  WHEN 'finance' THEN 'finance'
  WHEN 'commercial' THEN 'commercial'
  WHEN 'content_manager' THEN 'content_manager'
  WHEN 'market_manager' THEN 'market_manager'
  WHEN 'admin' THEN 'admin'
  WHEN 'super_admin' THEN 'owner'
  ELSE NULL
END
WHERE account_family = 'staff' AND staff_role IS NULL;

UPDATE public.profiles
SET professional_vertical = 'generic'
WHERE account_family = 'professional' AND professional_vertical IS NULL;

UPDATE public.profiles
SET staff_role = NULL
WHERE account_family <> 'staff';

UPDATE public.profiles
SET professional_vertical = NULL
WHERE account_family <> 'professional';

ALTER TABLE public.profiles
  ALTER COLUMN account_family SET DEFAULT 'individual',
  ALTER COLUMN account_family SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_account_family_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_account_family_check
      CHECK (account_family IN ('individual','professional','staff'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_professional_vertical_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_professional_vertical_check
      CHECK (professional_vertical IS NULL OR professional_vertical IN (
        'generic','real_estate','automotive','education','employment'
      ));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_staff_role_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_staff_role_check
      CHECK (staff_role IS NULL OR staff_role IN (
        'support_agent','moderator','trust_safety','compliance','finance',
        'operations','commercial','content_manager','market_manager','admin','owner'
      ));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_access_dimensions_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_access_dimensions_check
      CHECK (
        (account_family = 'individual' AND staff_role IS NULL AND professional_vertical IS NULL)
        OR (account_family = 'professional' AND staff_role IS NULL AND professional_vertical IS NOT NULL)
        OR (account_family = 'staff' AND staff_role IS NOT NULL AND professional_vertical IS NULL)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS profiles_access_dimensions_idx
  ON public.profiles (account_family, staff_role, professional_vertical, status);

CREATE OR REPLACE FUNCTION public.sync_profile_access_dimensions()
RETURNS TRIGGER AS $$
BEGIN
  NEW.account_family := CASE
    WHEN NEW.account_type::TEXT IN ('internal', 'staff') THEN 'staff'
    ELSE NEW.account_type::TEXT
  END;
  IF NEW.account_family <> 'staff' THEN NEW.staff_role := NULL; END IF;
  IF NEW.account_family <> 'professional' THEN NEW.professional_vertical := NULL; END IF;
  IF NEW.account_family = 'professional' AND NEW.professional_vertical IS NULL THEN
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

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS professional_vertical VARCHAR(30) NOT NULL DEFAULT 'generic';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'organizations_professional_vertical_check'
      AND conrelid = 'public.organizations'::regclass
  ) THEN
    ALTER TABLE public.organizations ADD CONSTRAINT organizations_professional_vertical_check
      CHECK (professional_vertical IN (
        'generic','real_estate','automotive','education','employment'
      ));
  END IF;
END $$;

UPDATE public.organizations organization
SET professional_vertical = CASE
  WHEN EXISTS (SELECT 1 FROM public.real_estate_agencies x WHERE x.organization_id = organization.id) THEN 'real_estate'
  WHEN EXISTS (SELECT 1 FROM public.auto_dealer_organizations x WHERE x.id = organization.id) THEN 'automotive'
  WHEN EXISTS (SELECT 1 FROM public.course_organizations x WHERE x.id = organization.id) THEN 'education'
  WHEN EXISTS (SELECT 1 FROM public.employment_employer_profiles x WHERE x.organization_id = organization.id) THEN 'employment'
  ELSE organization.professional_vertical
END;

UPDATE public.profiles profile
SET professional_vertical = organization.professional_vertical
FROM public.organizations organization
WHERE organization.owner_id = profile.id
  AND profile.account_family = 'professional'
  AND organization.professional_vertical <> 'generic';

CREATE TABLE IF NOT EXISTS public.access_capabilities (
  id TEXT PRIMARY KEY,
  is_sensitive BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.access_role_grants (
  role_kind VARCHAR(30) NOT NULL CHECK (role_kind IN ('account_family','staff_role','professional_vertical')),
  role_key VARCHAR(40) NOT NULL,
  capability_id TEXT NOT NULL REFERENCES public.access_capabilities(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role_kind, role_key, capability_id)
);
CREATE INDEX IF NOT EXISTS access_role_grants_capability_idx
  ON public.access_role_grants (capability_id, role_kind, role_key);

INSERT INTO public.access_capabilities (id, is_sensitive)
SELECT capability, capability ~ '(admin|manage|moderate|refund|audit|credentials|suspend|verify)'
FROM unnest(ARRAY[
  'profile.read','profile.update.own','seller.profile.read','seller.profile.update.own',
  'listing.read','listing.create','listing.update.own','listing.delete.own','listing.publish',
  'listing.mark_reserved','listing.mark_sold','listing.promote','listing.moderate','listing.feature','listing.bulk_import',
  'message.read.own','message.send','message.block','conversation.manage.own','conversation.audit.privileged',
  'favorite.manage.own','saved_search.manage.own','order.create','order.read.own','order.manage.seller','order.refund',
  'transaction.audit.finance','payment.initiate','payment.refund','review.create','review.update.own','review.moderate',
  'store.manage.own','store.analytics.read.own','store.customization.manage','subscription.manage.own','subscription.upgrade',
  'monetization.manage','monetization.pricing.update','monetization.orders.read','user.read','user.manage','user.suspend',
  'user.reactivate','user.verify','staff.support.access','staff.operations.access','staff.finance.access','staff.commercial.access',
  'support.case.read','support.case.manage','compliance.review','compliance.restrict_account','report.create','report.review',
  'moderation.review','moderation.action','market.manage','market.configure','taxonomy.manage','course.read','course.request.create',
  'course.profile.manage.own','course.offer.manage.own','course.lead.read.own','course.lead.respond.own',
  'course.organization.manage.own','course.booking.create','course.admin.manage','auto.read','auto.vehicle.manage.own',
  'auto.dealer.manage.own','auto.lead.manage.own','auto.inventory.import.own','auto.admin.manage','immo.read',
  'immo.property.manage.own','immo.agency.manage.own','immo.lead.manage.own','immo.inventory.import.own','immo.admin.manage',
  'employment.read','employment.candidate.manage.own','employment.job.manage.own','employment.recruiter.manage.own',
  'employment.application.manage.own','employment.import.own','employment.admin.manage','provider.read','provider.manage',
  'provider.configuration.read','provider.configuration.manage','provider.routing.manage','provider.credentials.status.read',
  'provider.credentials.manage','provider.health.read','provider.test','admin.access','admin.configuration.manage',
  'admin.staff.manage','admin.permissions.manage','role.manage','permission.manage','audit.read','crm.access','crm.contact.read',
  'crm.contact.manage','crm.company.read','crm.company.manage','crm.opportunity.read','crm.opportunity.manage',
  'crm.ai_prospecting.use','commercial_rules.read','commercial_rules.edit','commercial_rules.approve','commercial_rules.publish'
]::TEXT[]) AS capability
ON CONFLICT (id) DO UPDATE SET is_sensitive = EXCLUDED.is_sensitive;

-- Customer capabilities shared by individual and professional accounts.
INSERT INTO public.access_role_grants (role_kind, role_key, capability_id)
SELECT 'account_family', family, capability
FROM unnest(ARRAY['individual','professional']) family
CROSS JOIN unnest(ARRAY[
  'profile.read','profile.update.own','seller.profile.read','seller.profile.update.own',
  'listing.read','message.read.own','message.send','message.block',
  'conversation.manage.own','favorite.manage.own','saved_search.manage.own','order.create','order.read.own',
  'payment.initiate','review.create','review.update.own','report.create','course.read',
  'auto.read','immo.read','employment.read'
]::TEXT[]) capability
ON CONFLICT DO NOTHING;

-- Buying and selling are contextual activities of one individual identity, not
-- durable buyer/seller security roles.
INSERT INTO public.access_role_grants (role_kind, role_key, capability_id)
SELECT 'account_family', 'individual', capability
FROM unnest(ARRAY[
  'listing.create','listing.update.own','listing.delete.own','listing.publish',
  'listing.mark_reserved','listing.mark_sold','listing.promote','order.manage.seller',
  'course.request.create','course.booking.create','course.profile.manage.own','course.offer.manage.own',
  'course.lead.read.own','course.lead.respond.own','auto.vehicle.manage.own',
  'immo.property.manage.own','employment.candidate.manage.own','employment.job.manage.own'
]::TEXT[]) capability
ON CONFLICT DO NOTHING;

INSERT INTO public.access_role_grants (role_kind, role_key, capability_id)
SELECT 'account_family', 'professional', capability
FROM unnest(ARRAY['subscription.manage.own','subscription.upgrade']::TEXT[]) capability
ON CONFLICT DO NOTHING;

INSERT INTO public.access_role_grants (role_kind, role_key, capability_id) VALUES
  ('professional_vertical','generic','listing.create'),
  ('professional_vertical','generic','listing.update.own'),
  ('professional_vertical','generic','listing.delete.own'),
  ('professional_vertical','generic','listing.publish'),
  ('professional_vertical','generic','listing.mark_reserved'),
  ('professional_vertical','generic','listing.mark_sold'),
  ('professional_vertical','generic','listing.promote'),
  ('professional_vertical','generic','listing.bulk_import'),
  ('professional_vertical','generic','order.manage.seller'),
  ('professional_vertical','generic','store.manage.own'),
  ('professional_vertical','generic','store.analytics.read.own'),
  ('professional_vertical','generic','store.customization.manage'),
  ('professional_vertical','real_estate','immo.property.manage.own'),
  ('professional_vertical','real_estate','immo.agency.manage.own'),
  ('professional_vertical','real_estate','immo.lead.manage.own'),
  ('professional_vertical','real_estate','immo.inventory.import.own'),
  ('professional_vertical','automotive','auto.vehicle.manage.own'),
  ('professional_vertical','automotive','auto.dealer.manage.own'),
  ('professional_vertical','automotive','auto.lead.manage.own'),
  ('professional_vertical','automotive','auto.inventory.import.own'),
  ('professional_vertical','education','course.offer.manage.own'),
  ('professional_vertical','education','course.lead.read.own'),
  ('professional_vertical','education','course.lead.respond.own'),
  ('professional_vertical','education','course.organization.manage.own'),
  ('professional_vertical','employment','employment.job.manage.own'),
  ('professional_vertical','employment','employment.recruiter.manage.own'),
  ('professional_vertical','employment','employment.application.manage.own'),
  ('professional_vertical','employment','employment.import.own')
ON CONFLICT DO NOTHING;

INSERT INTO public.access_role_grants (role_kind, role_key, capability_id) VALUES
  ('staff_role','support_agent','admin.access'),('staff_role','support_agent','staff.support.access'),
  ('staff_role','support_agent','support.case.read'),('staff_role','support_agent','support.case.manage'),
  ('staff_role','support_agent','user.read'),('staff_role','support_agent','provider.read'),
  ('staff_role','support_agent','provider.health.read'),
  ('staff_role','moderator','admin.access'),('staff_role','moderator','listing.read'),
  ('staff_role','moderator','listing.moderate'),('staff_role','moderator','report.review'),
  ('staff_role','moderator','moderation.review'),('staff_role','moderator','moderation.action'),
  ('staff_role','moderator','review.moderate'),('staff_role','moderator','user.read'),
  ('staff_role','trust_safety','admin.access'),('staff_role','trust_safety','user.read'),
  ('staff_role','trust_safety','user.verify'),('staff_role','trust_safety','user.suspend'),
  ('staff_role','trust_safety','user.reactivate'),('staff_role','trust_safety','compliance.review'),
  ('staff_role','trust_safety','compliance.restrict_account'),('staff_role','trust_safety','report.review'),
  ('staff_role','trust_safety','audit.read'),
  ('staff_role','compliance','admin.access'),('staff_role','compliance','user.read'),
  ('staff_role','compliance','user.verify'),('staff_role','compliance','compliance.review'),
  ('staff_role','compliance','compliance.restrict_account'),('staff_role','compliance','audit.read'),
  ('staff_role','finance','admin.access'),('staff_role','finance','staff.finance.access'),
  ('staff_role','finance','transaction.audit.finance'),('staff_role','finance','payment.refund'),
  ('staff_role','finance','order.refund'),('staff_role','finance','monetization.orders.read'),
  ('staff_role','finance','commercial_rules.read'),('staff_role','finance','commercial_rules.approve'),
  ('staff_role','finance','audit.read'),
  ('staff_role','operations','admin.access'),('staff_role','operations','staff.operations.access'),
  ('staff_role','operations','user.read'),('staff_role','operations','provider.read'),
  ('staff_role','operations','provider.configuration.read'),('staff_role','operations','provider.health.read'),
  ('staff_role','commercial','admin.access'),('staff_role','commercial','staff.commercial.access'),
  ('staff_role','commercial','user.read'),('staff_role','commercial','crm.access'),
  ('staff_role','commercial','crm.contact.read'),
  ('staff_role','commercial','crm.contact.manage'),('staff_role','commercial','crm.company.read'),
  ('staff_role','commercial','crm.company.manage'),('staff_role','commercial','crm.opportunity.read'),
  ('staff_role','commercial','crm.opportunity.manage'),('staff_role','commercial','crm.ai_prospecting.use'),
  ('staff_role','commercial','commercial_rules.read'),('staff_role','commercial','commercial_rules.edit'),
  ('staff_role','content_manager','admin.access'),('staff_role','content_manager','taxonomy.manage'),
  ('staff_role','content_manager','listing.feature'),
  ('staff_role','market_manager','admin.access'),('staff_role','market_manager','market.manage'),
  ('staff_role','market_manager','market.configure'),('staff_role','market_manager','taxonomy.manage'),
  ('staff_role','market_manager','listing.feature'),('staff_role','market_manager','provider.read'),
  ('staff_role','market_manager','provider.configuration.read'),
  ('staff_role','market_manager','provider.configuration.manage'),('staff_role','market_manager','provider.health.read'),
  ('staff_role','market_manager','course.admin.manage'),('staff_role','market_manager','auto.admin.manage'),
  ('staff_role','market_manager','immo.admin.manage'),('staff_role','market_manager','employment.admin.manage'),
  ('staff_role','admin','admin.access'),('staff_role','admin','admin.configuration.manage'),
  ('staff_role','admin','admin.staff.manage'),('staff_role','admin','user.read'),
  ('staff_role','admin','user.manage'),('staff_role','admin','market.manage'),
  ('staff_role','admin','market.configure'),('staff_role','admin','taxonomy.manage'),
  ('staff_role','admin','monetization.manage'),('staff_role','admin','monetization.pricing.update'),
  ('staff_role','admin','provider.read'),('staff_role','admin','provider.manage'),
  ('staff_role','admin','provider.configuration.read'),('staff_role','admin','provider.configuration.manage'),
  ('staff_role','admin','provider.routing.manage'),('staff_role','admin','provider.credentials.status.read'),
  ('staff_role','admin','provider.health.read'),('staff_role','admin','provider.test'),
  ('staff_role','admin','course.admin.manage'),('staff_role','admin','auto.admin.manage'),
  ('staff_role','admin','immo.admin.manage'),('staff_role','admin','employment.admin.manage'),
  ('staff_role','admin','role.manage'),('staff_role','admin','audit.read'),
  ('staff_role','admin','commercial_rules.read'),('staff_role','admin','commercial_rules.edit'),
  ('staff_role','admin','commercial_rules.approve'),('staff_role','admin','commercial_rules.publish'),
  ('staff_role','owner','admin.access'),('staff_role','owner','admin.configuration.manage'),
  ('staff_role','owner','admin.staff.manage'),('staff_role','owner','admin.permissions.manage'),
  ('staff_role','owner','user.read'),('staff_role','owner','user.manage'),
  ('staff_role','owner','market.manage'),('staff_role','owner','market.configure'),
  ('staff_role','owner','taxonomy.manage'),('staff_role','owner','monetization.manage'),
  ('staff_role','owner','monetization.pricing.update'),('staff_role','owner','provider.read'),
  ('staff_role','owner','provider.manage'),('staff_role','owner','provider.configuration.read'),
  ('staff_role','owner','provider.configuration.manage'),('staff_role','owner','provider.routing.manage'),
  ('staff_role','owner','provider.credentials.status.read'),('staff_role','owner','provider.credentials.manage'),
  ('staff_role','owner','provider.health.read'),('staff_role','owner','provider.test'),
  ('staff_role','owner','role.manage'),('staff_role','owner','permission.manage'),
  ('staff_role','owner','audit.read'),('staff_role','owner','commercial_rules.read'),
  ('staff_role','owner','commercial_rules.edit'),('staff_role','owner','commercial_rules.approve'),
  ('staff_role','owner','commercial_rules.publish')
ON CONFLICT DO NOTHING;

ALTER TABLE public.access_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_role_grants ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID AS $$
  SELECT profile.id
  FROM public.profiles profile
  WHERE profile.id = public.auth_uid()
     OR profile.auth_user_id = public.auth_uid()
  ORDER BY CASE WHEN profile.id = public.auth_uid() THEN 0 ELSE 1 END
  LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.has_capability(required_capability TEXT)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(EXISTS (
    SELECT 1
    FROM public.profiles profile
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
        required_capability = ANY(profile.custom_permissions)
        OR EXISTS (
          SELECT 1 FROM public.access_role_grants grant_row
          WHERE grant_row.capability_id = required_capability
            AND (
              (grant_row.role_kind = 'account_family' AND grant_row.role_key = profile.account_family)
              OR (grant_row.role_kind = 'staff_role' AND grant_row.role_key = profile.staff_role)
              OR (grant_row.role_kind = 'professional_vertical' AND grant_row.role_key = profile.professional_vertical)
            )
        )
      )
  ), FALSE);
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

-- Retire the historical broad helper. Domain traffic runs through the backend;
-- any remaining direct-table policy that still calls is_admin() must deny until
-- it is replaced with the exact capability for that table.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT FALSE;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION public.is_moderator_or_admin()
RETURNS BOOLEAN AS $$
  SELECT public.has_capability('listing.moderate');
$$ LANGUAGE SQL STABLE;

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (
    id = public.current_profile_id()
    OR public.has_capability('user.manage')
  )
  WITH CHECK (
    id = public.current_profile_id()
    OR public.has_capability('user.manage')
  );

DROP POLICY IF EXISTS "Sellers can create listings" ON public.listings;
CREATE POLICY "Authorized publishers can create listings"
  ON public.listings FOR INSERT
  WITH CHECK (
    public.has_capability('listing.create')
    AND seller_id = public.current_profile_id()
  );

DROP POLICY IF EXISTS "Sellers can update own listings" ON public.listings;
CREATE POLICY "Owners or moderators can update listings"
  ON public.listings FOR UPDATE
  USING (
    (public.has_capability('listing.update.own') AND seller_id = public.current_profile_id())
    OR public.has_capability('listing.moderate')
  );

DROP POLICY IF EXISTS "Sellers can delete own listings" ON public.listings;
CREATE POLICY "Owners can delete their listings"
  ON public.listings FOR DELETE
  USING (
    public.has_capability('listing.delete.own')
    AND seller_id = public.current_profile_id()
  );

DROP POLICY IF EXISTS "Markets are manageable by admins" ON public.markets;
CREATE POLICY "Markets are capability managed"
  ON public.markets FOR ALL
  USING (public.has_capability('market.manage'))
  WITH CHECK (public.has_capability('market.manage'));

DROP POLICY IF EXISTS "Categories are manageable by admins" ON public.categories;
CREATE POLICY "Categories are capability managed"
  ON public.categories FOR ALL
  USING (public.has_capability('taxonomy.manage'))
  WITH CHECK (public.has_capability('taxonomy.manage'));

DROP POLICY IF EXISTS "Audit logs are admin readable" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can read audit logs" ON public.audit_logs;
CREATE POLICY "Audit logs require explicit capability"
  ON public.audit_logs FOR SELECT
  USING (public.has_capability('audit.read'));

CREATE POLICY "Capability registry requires governance access"
  ON public.access_capabilities FOR SELECT
  USING (public.has_capability('admin.permissions.manage'));
CREATE POLICY "Capability grants require governance access"
  ON public.access_role_grants FOR SELECT
  USING (public.has_capability('admin.permissions.manage'));

-- Public profile projection prevents RLS from returning private columns such as
-- email and phone merely because a profile itself is public.
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT id, slug, name, avatar_url, city, country, bio, account_family,
       professional_vertical, is_verified, is_business_verified,
       rating, review_count, response_rate_percent, response_time_text, created_at
FROM public.profiles
WHERE status::TEXT = 'active' AND account_family <> 'staff';

GRANT SELECT ON public.public_profiles TO anon, authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (name, avatar_url, phone, city, postal_code, department, region, country, bio)
  ON public.profiles TO authenticated;

COMMENT ON COLUMN public.profiles.primary_role IS
  'Legacy compatibility label. Authorization uses account_family, staff_role, professional_vertical and capability grants.';
COMMENT ON TABLE public.access_role_grants IS
  'Canonical coarse-grained RBAC/ABAC grants. Ownership, organization and market scope are enforced separately.';
