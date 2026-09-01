-- Digital product policy governance and direct market identity for support and
-- provisioning records. Policies remain disabled until an authorized staff
-- member activates a complete, evidence-backed version.

ALTER TABLE public.digital_access_reports
  ADD COLUMN market_code VARCHAR(2) REFERENCES public.markets(code) ON DELETE RESTRICT;

UPDATE public.digital_access_reports AS report
SET market_code = entitlement.market_code
FROM public.digital_entitlements AS entitlement
WHERE entitlement.id = report.entitlement_id
  AND report.market_code IS NULL;

ALTER TABLE public.digital_access_reports
  ALTER COLUMN market_code SET NOT NULL;

CREATE INDEX digital_access_reports_market_status_idx
  ON public.digital_access_reports (market_code, status, created_at DESC);

ALTER TABLE public.digital_provisioning_tasks
  ADD COLUMN market_code VARCHAR(2) REFERENCES public.markets(code) ON DELETE RESTRICT;

UPDATE public.digital_provisioning_tasks AS task
SET market_code = entitlement.market_code
FROM public.digital_entitlements AS entitlement
WHERE entitlement.id = task.entitlement_id
  AND task.market_code IS NULL;

ALTER TABLE public.digital_provisioning_tasks
  ALTER COLUMN market_code SET NOT NULL;

CREATE INDEX digital_provisioning_market_due_idx
  ON public.digital_provisioning_tasks (market_code, deadline_at, next_attempt_at)
  WHERE status IN ('PENDING','IN_PROGRESS','RETRY_PENDING');

CREATE OR REPLACE FUNCTION public.set_digital_child_market()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  SELECT entitlement.market_code
    INTO NEW.market_code
  FROM public.digital_entitlements AS entitlement
  WHERE entitlement.id = NEW.entitlement_id;
  IF NEW.market_code IS NULL THEN
    RAISE EXCEPTION 'DIGITAL_ENTITLEMENT_NOT_FOUND';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER digital_access_reports_market_trigger
  BEFORE INSERT OR UPDATE OF entitlement_id
  ON public.digital_access_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_digital_child_market();

CREATE TRIGGER digital_provisioning_tasks_market_trigger
  BEFORE INSERT OR UPDATE OF entitlement_id
  ON public.digital_provisioning_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_digital_child_market();

CREATE OR REPLACE FUNCTION public.create_digital_policy_draft(
  p_staff_id UUID,
  p_policy JSONB,
  p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_market_code TEXT := UPPER(p_policy ->> 'marketCode');
  next_version INTEGER;
  policy_id UUID;
BEGIN
  IF p_staff_id IS NULL OR v_market_code !~ '^[A-Z]{2}$' THEN
    RAISE EXCEPTION 'INVALID_DIGITAL_POLICY_ACTOR_OR_MARKET';
  END IF;
  IF LENGTH(TRIM(COALESCE(p_reason, ''))) < 10 THEN
    RAISE EXCEPTION 'DIGITAL_POLICY_REASON_REQUIRED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.markets WHERE code = v_market_code) THEN
    RAISE EXCEPTION 'DIGITAL_POLICY_MARKET_NOT_FOUND';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('digital-policy:' || v_market_code, 0));
  SELECT COALESCE(MAX(version), 0) + 1
    INTO next_version
  FROM public.digital_market_policies
  WHERE digital_market_policies.market_code = v_market_code;

  INSERT INTO public.digital_market_policies (
    market_code, version, status, enabled, allowed_account_types,
    allowed_seller_types, allowed_category_ids, allowed_fulfillment_types,
    allowed_fulfillment_combinations, required_verification_dimensions,
    moderation_required, allowed_mime_types, allowed_file_extensions,
    max_file_count, max_file_size_bytes, max_total_file_size_bytes,
    credential_inventory_policy, external_link_policy,
    provisioning_deadline_hours, default_entitlement_duration_days,
    default_download_limit, default_reveal_limit, currency,
    minimum_price_minor, maximum_price_minor, tax_policy_version,
    refund_policy_version, withdrawal_presentation_version,
    payment_provider_configuration_id, legal_approval_id, capabilities,
    refund_access_behavior, dispute_access_behavior,
    listing_removal_access_behavior, seller_restriction_access_behavior,
    requirements, effective_at, created_by
  ) VALUES (
    v_market_code,
    next_version,
    'DRAFT',
    FALSE,
    ARRAY(SELECT jsonb_array_elements_text(p_policy -> 'allowedAccountTypes')),
    ARRAY(SELECT jsonb_array_elements_text(p_policy -> 'allowedSellerTypes')),
    ARRAY(SELECT jsonb_array_elements_text(p_policy -> 'allowedCategoryIds')),
    ARRAY(SELECT jsonb_array_elements_text(p_policy -> 'allowedFulfillmentTypes')),
    p_policy -> 'allowedFulfillmentCombinations',
    ARRAY(SELECT jsonb_array_elements_text(p_policy -> 'requiredVerificationDimensions')),
    (p_policy ->> 'moderationRequired')::BOOLEAN,
    ARRAY(SELECT jsonb_array_elements_text(p_policy -> 'allowedMimeTypes')),
    ARRAY(SELECT jsonb_array_elements_text(p_policy -> 'allowedFileExtensions')),
    (p_policy ->> 'maxFileCount')::INTEGER,
    (p_policy ->> 'maxFileSizeBytes')::BIGINT,
    (p_policy ->> 'maxTotalFileSizeBytes')::BIGINT,
    p_policy -> 'credentialInventory',
    p_policy -> 'externalLinks',
    (p_policy ->> 'provisioningDeadlineHours')::INTEGER,
    (p_policy ->> 'defaultEntitlementDurationDays')::INTEGER,
    (p_policy ->> 'defaultDownloadLimit')::INTEGER,
    (p_policy ->> 'defaultRevealLimit')::INTEGER,
    p_policy ->> 'currency',
    (p_policy -> 'minimumPrice' ->> 'amountMinor')::BIGINT,
    (p_policy -> 'maximumPrice' ->> 'amountMinor')::BIGINT,
    NULLIF(p_policy ->> 'taxPolicyVersion', ''),
    NULLIF(p_policy ->> 'refundPolicyVersion', ''),
    NULLIF(p_policy ->> 'withdrawalPresentationVersion', ''),
    NULLIF(p_policy ->> 'paymentProviderConfigurationId', ''),
    NULLIF(p_policy ->> 'legalApprovalId', ''),
    p_policy -> 'capabilities',
    p_policy ->> 'refundAccessBehavior',
    p_policy ->> 'disputeAccessBehavior',
    p_policy ->> 'listingRemovalAccessBehavior',
    p_policy ->> 'sellerRestrictionAccessBehavior',
    p_policy -> 'requirements',
    NULLIF(p_policy ->> 'effectiveAt', '')::TIMESTAMPTZ,
    p_staff_id
  )
  RETURNING id INTO policy_id;

  INSERT INTO public.digital_access_audit_events (
    actor_id, market_code, action, result, safe_metadata
  ) VALUES (
    p_staff_id,
    v_market_code,
    'DIGITAL_POLICY_DRAFT_CREATED',
    'ALLOWED',
    jsonb_build_object(
      'policyId', policy_id,
      'version', next_version,
      'reason', LEFT(TRIM(p_reason), 240)
    )
  );

  RETURN policy_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_digital_policy(
  p_staff_id UUID,
  p_policy_id UUID,
  p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  policy public.digital_market_policies%ROWTYPE;
BEGIN
  IF p_staff_id IS NULL OR LENGTH(TRIM(COALESCE(p_reason, ''))) < 10 THEN
    RAISE EXCEPTION 'DIGITAL_POLICY_ACTIVATION_REASON_REQUIRED';
  END IF;

  SELECT * INTO policy
  FROM public.digital_market_policies
  WHERE id = p_policy_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'DIGITAL_POLICY_NOT_FOUND'; END IF;
  IF policy.status <> 'DRAFT' THEN
    RAISE EXCEPTION 'DIGITAL_POLICY_NOT_DRAFT';
  END IF;
  IF policy.tax_policy_version IS NULL
    OR policy.refund_policy_version IS NULL
    OR policy.withdrawal_presentation_version IS NULL
    OR policy.payment_provider_configuration_id IS NULL
    OR policy.legal_approval_id IS NULL THEN
    RAISE EXCEPTION 'DIGITAL_POLICY_EVIDENCE_INCOMPLETE';
  END IF;

  UPDATE public.digital_market_policies
  SET status = 'RETIRED', enabled = FALSE, updated_at = NOW()
  WHERE market_code = policy.market_code
    AND status = 'ACTIVE'
    AND enabled
    AND id <> policy.id;

  UPDATE public.digital_market_policies
  SET status = 'ACTIVE', enabled = TRUE, approved_at = NOW(),
      approved_by = p_staff_id, effective_at = COALESCE(effective_at, NOW()),
      updated_at = NOW()
  WHERE id = policy.id;

  UPDATE public.digital_seller_profiles
  SET status = 'REACCEPTANCE_REQUIRED', updated_at = NOW()
  WHERE market_code = policy.market_code
    AND policy_version <> policy.version
    AND status = 'ACTIVE';

  INSERT INTO public.digital_access_audit_events (
    actor_id, market_code, action, result, safe_metadata
  ) VALUES (
    p_staff_id,
    policy.market_code,
    'DIGITAL_POLICY_ACTIVATED',
    'ALLOWED',
    jsonb_build_object(
      'policyId', policy.id,
      'version', policy.version,
      'reason', LEFT(TRIM(p_reason), 240)
    )
  );

  INSERT INTO public.digital_fulfillment_outbox (
    market_code, event_type, aggregate_type, aggregate_id,
    idempotency_key, payload
  ) VALUES (
    policy.market_code,
    'DIGITAL_POLICY_ACTIVATED',
    'digital_policy',
    policy.id,
    'digital-policy:' || policy.id::TEXT || ':activated',
    jsonb_build_object('policyId', policy.id, 'version', policy.version)
  ) ON CONFLICT (idempotency_key) DO NOTHING;

  RETURN policy.id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_digital_policy_draft(UUID, JSONB, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.activate_digital_policy(UUID, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_digital_policy_draft(UUID, JSONB, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.activate_digital_policy(UUID, UUID, TEXT)
  TO service_role;
