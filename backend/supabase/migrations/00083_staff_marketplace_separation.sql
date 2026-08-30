-- =============================================================================
-- Strict Staff/customer marketplace separation of duties
-- Migration: 00083_staff_marketplace_separation.sql
--
-- A retained Staff membership (active, suspended, or revoked) makes the same
-- identity ineligible for customer marketplace authority. Internal work keeps
-- using narrowly scoped Staff capabilities through backend services. Direct
-- authenticated access to customer-owned tables is denied as a second layer.
-- =============================================================================

INSERT INTO public.access_capabilities (id, is_sensitive)
VALUES ('marketplace.customer.access', FALSE)
ON CONFLICT (id) DO UPDATE SET is_sensitive = EXCLUDED.is_sensitive;

INSERT INTO public.access_role_grants (role_kind, role_key, capability_id)
SELECT 'account_family', account_family, 'marketplace.customer.access'
FROM unnest(ARRAY['individual', 'professional']::TEXT[]) AS account_family
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_customer_marketplace_capability(
  required_capability TEXT
)
RETURNS BOOLEAN AS $$
  SELECT required_capability = ANY(ARRAY[
    'marketplace.customer.access',
    'profile.read', 'profile.update.own',
    'seller.profile.read', 'seller.profile.update.own',
    'listing.read', 'listing.create', 'listing.update.own',
    'listing.delete.own', 'listing.publish', 'listing.mark_reserved',
    'listing.mark_sold', 'listing.promote', 'listing.bulk_import',
    'listing.feature',
    'message.read.own', 'message.send', 'message.block',
    'conversation.manage.own', 'favorite.manage.own',
    'saved_search.manage.own', 'order.create', 'order.read.own',
    'order.manage.seller', 'finance.account.read.own',
    'finance.organization.read.own', 'payment.initiate',
    'review.create', 'review.update.own', 'store.manage.own',
    'store.analytics.read.own', 'store.customization.manage',
    'subscription.manage.own', 'subscription.upgrade', 'report.create',
    'course.read', 'course.request.create', 'course.profile.manage.own',
    'course.offer.manage.own', 'course.lead.read.own',
    'course.lead.respond.own', 'course.organization.manage.own',
    'course.booking.create', 'auto.read', 'auto.vehicle.manage.own',
    'auto.dealer.manage.own', 'auto.lead.manage.own',
    'auto.inventory.import.own', 'immo.read',
    'immo.property.manage.own', 'immo.agency.manage.own',
    'immo.lead.manage.own', 'immo.inventory.import.own',
    'employment.read', 'employment.candidate.manage.own',
    'employment.job.manage.own', 'employment.recruiter.manage.own',
    'employment.application.manage.own', 'employment.import.own'
  ]::TEXT[]);
$$ LANGUAGE SQL IMMUTABLE PARALLEL SAFE;

COMMENT ON FUNCTION public.is_customer_marketplace_capability(TEXT) IS
  'Canonical database predicate for capabilities forbidden to every retained Staff identity.';

-- Historical role grants must not reintroduce customer authority. In
-- particular, the moderator role previously inherited listing.read.
DELETE FROM public.access_role_grants
WHERE role_kind = 'staff_role'
  AND public.is_customer_marketplace_capability(capability_id);

CREATE OR REPLACE FUNCTION public.guard_staff_role_customer_grants()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role_kind = 'staff_role'
     AND public.is_customer_marketplace_capability(NEW.capability_id) THEN
    RAISE EXCEPTION 'Staff roles cannot receive customer marketplace capabilities'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS access_role_grants_guard_staff_customer
  ON public.access_role_grants;
CREATE TRIGGER access_role_grants_guard_staff_customer
BEFORE INSERT OR UPDATE OF role_kind, role_key, capability_id
ON public.access_role_grants
FOR EACH ROW EXECUTE FUNCTION public.guard_staff_role_customer_grants();

-- Existing direct grants are contracted before the invariant is enforced.
WITH staff_profiles AS (
  SELECT profile.id
  FROM public.profiles profile
  JOIN public.staff_memberships membership ON membership.user_id = profile.id
  WHERE EXISTS (
    SELECT 1
    FROM unnest(profile.custom_permissions) AS granted(capability_id)
    WHERE public.is_customer_marketplace_capability(granted.capability_id)
  )
)
UPDATE public.profiles profile
SET custom_permissions = ARRAY(
      SELECT capability_id
      FROM unnest(profile.custom_permissions) AS granted(capability_id)
      WHERE NOT public.is_customer_marketplace_capability(capability_id)
      ORDER BY capability_id
    ),
    capability_override_version = profile.capability_override_version + 1,
    updated_at = NOW()
FROM staff_profiles
WHERE profile.id = staff_profiles.id;

UPDATE public.auth_sessions session
SET revoked_at = NOW(), revoked_reason = 'capability_overrides_changed'
WHERE session.revoked_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.staff_memberships membership
    WHERE membership.user_id = session.user_id
  );

CREATE OR REPLACE FUNCTION public.retire_staff_marketplace_inventory(
  p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.listing_promotions promotion
  SET status = 'cancelled', updated_at = NOW()
  FROM public.listings listing
  WHERE promotion.listing_id = listing.id
    AND listing.seller_id = p_user_id
    AND promotion.status IN ('scheduled', 'active');

  UPDATE public.listing_boost_orders boost
  SET is_active = FALSE
  WHERE boost.seller_id = p_user_id AND boost.is_active = TRUE;

  UPDATE public.listing_market_publications publication
  SET status = 'suspended', updated_at = NOW()
  FROM public.listings listing
  WHERE publication.listing_id = listing.id
    AND listing.seller_id = p_user_id
    AND publication.status IN ('draft', 'pending_review', 'active', 'paused');

  -- Preserve sold as historical transaction evidence; its market publication
  -- is suspended above and the Staff owner cannot operate on it.
  UPDATE public.listings
  SET status = 'archived', updated_at = NOW()
  WHERE seller_id = p_user_id
    AND status IN ('draft', 'published', 'reserved');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$
DECLARE
  staff_user_id UUID;
BEGIN
  FOR staff_user_id IN SELECT user_id FROM public.staff_memberships LOOP
    PERFORM public.retire_staff_marketplace_inventory(staff_user_id);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.guard_staff_listing_lifecycle()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('draft', 'published', 'reserved', 'sold')
     AND EXISTS (
       SELECT 1
       FROM public.staff_memberships membership
       WHERE membership.user_id = NEW.seller_id
     ) THEN
    RAISE EXCEPTION 'Staff identities cannot own marketplace listings'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS listings_guard_staff_lifecycle ON public.listings;
CREATE TRIGGER listings_guard_staff_lifecycle
BEFORE INSERT OR UPDATE OF seller_id, status ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.guard_staff_listing_lifecycle();

-- Prevent direct profile writes and the capability-override RPC from granting
-- a customer capability to any retained Staff identity.
CREATE OR REPLACE FUNCTION public.guard_staff_marketplace_overrides()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.staff_memberships membership
    WHERE membership.user_id = NEW.id
  ) AND EXISTS (
    SELECT 1
    FROM unnest(NEW.custom_permissions) AS granted(capability_id)
    WHERE public.is_customer_marketplace_capability(granted.capability_id)
  ) THEN
    RAISE EXCEPTION 'Staff identities cannot receive customer marketplace capabilities'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS profiles_guard_staff_marketplace_overrides ON public.profiles;
CREATE TRIGGER profiles_guard_staff_marketplace_overrides
BEFORE INSERT OR UPDATE OF custom_permissions ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_staff_marketplace_overrides();

-- Creating, suspending, or revoking a Staff membership immediately contracts
-- stale customer grants and revokes all sessions. The lifecycle state remains
-- separated even when it no longer grants an internal role.
CREATE OR REPLACE FUNCTION public.enforce_staff_marketplace_separation()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles profile
  SET custom_permissions = ARRAY(
        SELECT capability_id
        FROM unnest(profile.custom_permissions) AS granted(capability_id)
        WHERE NOT public.is_customer_marketplace_capability(capability_id)
        ORDER BY capability_id
      ),
      capability_override_version = profile.capability_override_version + 1,
      updated_at = NOW()
  WHERE profile.id = NEW.user_id
    AND EXISTS (
      SELECT 1
      FROM unnest(profile.custom_permissions) AS granted(capability_id)
      WHERE public.is_customer_marketplace_capability(granted.capability_id)
    );

  UPDATE public.auth_sessions
  SET revoked_at = NOW(), revoked_reason = 'staff_access_changed'
  WHERE user_id = NEW.user_id AND revoked_at IS NULL;

  PERFORM public.retire_staff_marketplace_inventory(NEW.user_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS staff_memberships_enforce_marketplace_separation
  ON public.staff_memberships;
CREATE TRIGGER staff_memberships_enforce_marketplace_separation
AFTER INSERT OR UPDATE ON public.staff_memberships
FOR EACH ROW EXECUTE FUNCTION public.enforce_staff_marketplace_separation();

-- RLS and database-side checks deny the customer plane before evaluating any
-- account-family, vertical, role, or direct grant. Only an active membership
-- can contribute a Staff role capability.
CREATE OR REPLACE FUNCTION public.has_capability(required_capability TEXT)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(EXISTS (
    SELECT 1
    FROM public.profiles profile
    LEFT JOIN public.staff_memberships active_staff
      ON active_staff.user_id = profile.id
     AND active_staff.status = 'active'
    WHERE profile.id = public.current_profile_id()
      AND required_capability <> ALL(profile.revoked_permissions)
      AND NOT (
        public.is_customer_marketplace_capability(required_capability)
        AND EXISTS (
          SELECT 1
          FROM public.staff_memberships retained_staff
          WHERE retained_staff.user_id = profile.id
        )
      )
      AND CASE profile.status::TEXT
        WHEN 'active' THEN TRUE
        WHEN 'pending' THEN required_capability IN (
          'profile.read', 'profile.update.own', 'report.create'
        )
        WHEN 'pending_verification' THEN required_capability IN (
          'profile.read', 'profile.update.own', 'report.create'
        )
        WHEN 'restricted' THEN required_capability IN (
          'profile.read', 'profile.update.own', 'message.read.own',
          'order.read.own', 'report.create'
        )
        WHEN 'suspended' THEN required_capability IN (
          'profile.read', 'message.read.own', 'order.read.own', 'report.create'
        )
        ELSE FALSE
      END
      AND (
        (
          required_capability = ANY(profile.custom_permissions)
          AND (
            active_staff.user_id IS NOT NULL
            OR NOT EXISTS (
              SELECT 1
              FROM public.staff_memberships retained_staff
              WHERE retained_staff.user_id = profile.id
            )
          )
          AND (
            active_staff.user_id IS NOT NULL
            OR NOT EXISTS (
              SELECT 1
              FROM public.access_role_grants staff_only_grant
              WHERE staff_only_grant.capability_id = required_capability
                AND staff_only_grant.role_kind = 'staff_role'
                AND NOT EXISTS (
                  SELECT 1
                  FROM public.access_role_grants customer_grant
                  WHERE customer_grant.capability_id = required_capability
                    AND customer_grant.role_kind IN (
                      'account_family', 'professional_vertical'
                    )
                )
            )
          )
        )
        OR EXISTS (
          SELECT 1
          FROM public.access_role_grants grant_row
          WHERE grant_row.capability_id = required_capability
            AND (
              (
                active_staff.user_id IS NULL
                AND NOT EXISTS (
                  SELECT 1
                  FROM public.staff_memberships retained_staff
                  WHERE retained_staff.user_id = profile.id
                )
                AND (
                  (
                    grant_row.role_kind = 'account_family'
                    AND grant_row.role_key = profile.account_family
                  )
                  OR (
                    grant_row.role_kind = 'professional_vertical'
                    AND grant_row.role_key = profile.professional_vertical
                  )
                )
              )
              OR (
                grant_row.role_kind = 'staff_role'
                AND grant_row.role_key = active_staff.staff_role
              )
            )
        )
      )
  ), FALSE);
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_customer_marketplace_actor()
RETURNS BOOLEAN AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.staff_memberships membership
    WHERE membership.user_id = public.current_profile_id()
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.is_customer_marketplace_actor() IS
  'True for anonymous/customer identities and false for every retained Staff lifecycle state.';

REVOKE ALL ON FUNCTION public.retire_staff_marketplace_inventory(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.retire_staff_marketplace_inventory(UUID)
  TO service_role;
REVOKE ALL ON FUNCTION public.guard_staff_listing_lifecycle()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_staff_marketplace_overrides()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_staff_marketplace_separation()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_staff_role_customer_grants()
  FROM PUBLIC, anon, authenticated;

-- Public profile discovery remains anonymous/customer-facing and must not be
-- usable through an authenticated Staff session.
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT id, slug, name, avatar_url, city, country, bio, account_family,
       professional_vertical, is_verified, is_business_verified,
       rating, review_count, response_rate_percent, response_time_text, created_at
FROM public.profiles
WHERE status::TEXT = 'active'
  AND NOT EXISTS (
    SELECT 1
    FROM public.staff_memberships subject_staff
    WHERE subject_staff.user_id = profiles.id
  )
  AND public.is_customer_marketplace_actor();

GRANT SELECT ON public.public_profiles TO anon, authenticated;

DROP POLICY IF EXISTS staff_customer_profile_update_separation
  ON public.profiles;
CREATE POLICY staff_customer_profile_update_separation
ON public.profiles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.is_customer_marketplace_actor())
WITH CHECK (public.is_customer_marketplace_actor());

-- These restrictive policies never grant access. They intersect with the
-- existing ownership/public policies for authenticated callers, while anon
-- discovery and backend service-role operations keep their existing behavior.
DO $$
DECLARE
  table_name TEXT;
  customer_tables CONSTANT TEXT[] := ARRAY[
    'organizations', 'organization_members', 'organization_markets',
    'organization_branches', 'organization_business_identifiers',
    'stores', 'store_markets',
    'listings', 'listing_media', 'listing_media_assets', 'listing_drafts',
    'listing_market_publications', 'listing_promotions',
    'marketplace_activity_events', 'marketplace_offers',
    'marketplace_offer_events', 'promotion_impressions',
    'favorites', 'saved_searches', 'blocked_users',
    'notifications', 'notification_preferences', 'push_device_tokens',
    'notification_deliveries', 'notification_delivery_attempts',
    'notification_delivery_receipts',
    'account_deletion_requests', 'communication_consents',
    'conversations', 'messages', 'orders', 'payouts', 'subscriptions',
    'finance_accounts', 'finance_ledger_entries', 'finance_payouts',
    'finance_transactions', 'private_document_assets',
    'listing_boost_orders', 'reviews', 'reports',
    'moderation_appeals', 'verification_requests',
    'compliance_requirement_decisions', 'compliance_tax_profiles',
    'compliance_verification_records',
    'vertical_checkouts', 'vertical_offer_entitlements',
    'monetization_billing_customers', 'monetization_credit_transactions',
    'monetization_complimentary_grant_requests',
    'monetization_complimentary_grant_approvals',
    'monetization_complimentary_grants',
    'monetization_entitlements', 'monetization_orders',
    'monetization_invoices', 'monetization_invoice_lines',
    'monetization_payment_events', 'monetization_payments',
    'monetization_plan_transitions', 'monetization_promotion_redemptions',
    'monetization_quotes', 'monetization_quote_items',
    'monetization_refunds', 'monetization_subscription_events',
    'monetization_subscription_items', 'monetization_subscriptions',
    'monetization_trial_consumptions', 'monetization_usage_counters',
    'monetization_usage_records',
    'course_tutor_profiles', 'course_tutor_qualifications',
    'course_tutor_subjects', 'course_tutor_languages', 'course_tutor_levels',
    'course_tutor_delivery_modes', 'course_offers',
    'course_offer_delivery_modes', 'course_offer_languages',
    'course_offer_levels', 'course_pricing_options', 'course_service_areas',
    'course_availability_rules', 'course_availability_exceptions',
    'course_packages', 'course_learner_requests', 'course_leads',
    'course_lead_credit_ledger', 'course_qualification_evidence',
    'course_bookings', 'course_lesson_sessions', 'course_tutor_favorites',
    'course_reviews', 'course_workflow_drafts', 'course_organizations',
    'course_organization_members', 'course_payment_events',
    'course_analytics_events',
    'auto_dealer_organizations', 'auto_dealer_locations',
    'auto_dealer_members', 'auto_vehicles', 'auto_vehicle_drafts',
    'auto_vehicle_documents', 'auto_vehicle_favorites', 'auto_leads',
    'auto_lead_actions', 'auto_appointments', 'auto_inventory_imports',
    'auto_inventory_import_errors', 'auto_subscriptions',
    'auto_add_on_purchases', 'auto_api_credentials',
    'auto_partner_referrals', 'auto_stock_transfers',
    'auto_price_estimates', 'auto_analytics_events',
    'real_estate_agencies', 'real_estate_agency_members',
    'real_estate_branches', 'real_estate_properties', 'real_estate_media',
    'real_estate_private_documents', 'real_estate_drafts',
    'real_estate_leads', 'real_estate_lead_notes',
    'real_estate_appointments', 'real_estate_recently_viewed',
    'real_estate_imports', 'real_estate_analytics_events',
    'employment_employer_profiles', 'employment_employer_branches',
    'employment_recruiter_memberships',
    'employment_recruiter_assignments', 'employment_recruiter_notes',
    'employment_pipelines', 'employment_pipeline_stages',
    'employment_jobs', 'employment_job_drafts',
    'employment_job_locations', 'employment_job_languages',
    'employment_job_skills', 'employment_screening_questions',
    'employment_screening_answers', 'employment_candidate_profiles',
    'employment_candidate_documents', 'employment_applications',
    'employment_application_events', 'employment_saved_jobs',
    'employment_job_alerts', 'employment_interviews',
    'employment_import_sources', 'employment_sync_logs',
    'employment_job_reports', 'employment_consent_records',
    'employment_data_subject_requests', 'employment_analytics_events',
    'invoicing_legal_entities', 'invoicing_legal_identifiers',
    'invoicing_parties', 'invoicing_party_identifiers',
    'invoicing_number_series', 'invoicing_invoices',
    'invoicing_invoice_lines', 'invoicing_tax_breakdowns',
    'invoicing_documents', 'invoicing_outbox',
    'crm_workspaces', 'crm_teams', 'crm_team_members', 'crm_accounts',
    'crm_account_relationships', 'crm_contacts', 'crm_contact_accounts',
    'crm_contact_opportunities', 'crm_opportunities',
    'crm_opportunity_line_items', 'crm_pipelines', 'crm_pipeline_stages',
    'crm_tasks', 'crm_activities', 'crm_attachments', 'crm_notes',
    'crm_products', 'crm_price_books', 'crm_prices', 'crm_quotes',
    'crm_quote_line_items', 'crm_custom_field_definitions',
    'crm_saved_views', 'crm_tags', 'crm_entity_tags',
    'crm_external_references', 'crm_field_provenance', 'crm_consents',
    'crm_data_jobs', 'crm_duplicate_decisions', 'crm_workflows',
    'crm_workflow_runs', 'crm_sequences', 'crm_sequence_steps',
    'crm_sequence_enrollments', 'crm_prospect_candidates',
    'crm_prospect_ai_insights', 'crm_prospect_attribution_events',
    'crm_prospect_conversion_links', 'crm_prospect_conversions',
    'crm_prospect_discovery_runs', 'crm_prospect_evidence',
    'crm_prospect_import_commands', 'crm_prospect_import_rows',
    'crm_prospect_lists', 'crm_prospect_list_members', 'crm_prospect_scores',
    'crm_prospect_usage_ledger', 'crm_prospecting_profiles',
    'crm_prospecting_profile_markets',
    'crm_prospect_source_connections', 'crm_prospect_source_markets',
    'marketing_workspaces', 'marketing_profiles', 'marketing_lists',
    'marketing_list_memberships', 'marketing_segments',
    'marketing_campaigns', 'marketing_campaign_versions',
    'marketing_campaign_recipients', 'marketing_conversions',
    'marketing_delivery_events', 'marketing_jobs',
    'marketing_templates', 'marketing_template_versions',
    'marketing_automation_messages', 'marketing_suppressions',
    'marketing_sender_identities', 'marketing_sending_domains'
  ]::TEXT[];
BEGIN
  FOREACH table_name IN ARRAY customer_tables LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      EXECUTE format(
        'DROP POLICY IF EXISTS staff_customer_marketplace_separation ON public.%I',
        table_name
      );
      EXECUTE format(
        'CREATE POLICY staff_customer_marketplace_separation ON public.%I '
        'AS RESTRICTIVE FOR ALL TO authenticated '
        'USING (public.is_customer_marketplace_actor()) '
        'WITH CHECK (public.is_customer_marketplace_actor())',
        table_name
      );
    END IF;
  END LOOP;
END $$;

COMMENT ON TABLE public.staff_memberships IS
  'Server-managed Staff lifecycle. Any retained row separates the identity from customer marketplace capabilities; only active rows grant an internal role.';
