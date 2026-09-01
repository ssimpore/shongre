-- Durable claiming, retry, deadline and expiry operations for digital
-- fulfillment. All functions are service-role only and return privacy-safe
-- records; secret payloads and storage paths never enter the outbox.

ALTER TABLE public.digital_fulfillment_versions
  ADD COLUMN product_access_class TEXT;

ALTER TABLE public.digital_fulfillment_versions
  ADD CONSTRAINT digital_fulfillment_access_class_required CHECK (
    NOT (fulfillment_types && ARRAY['ACCESS_LINK','ACCESS_CREDENTIALS','SELLER_PROVISIONED']::TEXT[])
    OR product_access_class IS NOT NULL
  ) NOT VALID;

CREATE OR REPLACE FUNCTION public.claim_digital_fulfillment_outbox(
  p_worker_id TEXT,
  p_limit INTEGER DEFAULT 50,
  p_lease_seconds INTEGER DEFAULT 120
)
RETURNS SETOF public.digital_fulfillment_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF LENGTH(TRIM(COALESCE(p_worker_id, ''))) < 3 THEN
    RAISE EXCEPTION 'DIGITAL_WORKER_ID_REQUIRED';
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT outbox.id
    FROM public.digital_fulfillment_outbox AS outbox
    WHERE outbox.available_at <= NOW()
      AND (
        outbox.status IN ('PENDING', 'FAILED')
        OR (
          outbox.status = 'PROCESSING'
          AND outbox.claimed_at < NOW() - make_interval(secs => GREATEST(30, p_lease_seconds))
        )
      )
    ORDER BY outbox.available_at, outbox.created_at, outbox.id
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(p_limit, 1), 200)
  )
  UPDATE public.digital_fulfillment_outbox AS outbox
  SET status = 'PROCESSING',
      attempt_count = outbox.attempt_count + 1,
      claimed_at = NOW(),
      claimed_by = p_worker_id,
      last_error_code = NULL
  FROM candidates
  WHERE outbox.id = candidates.id
  RETURNING outbox.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_digital_fulfillment_outbox(
  p_event_id UUID,
  p_worker_id TEXT,
  p_success BOOLEAN,
  p_error_code TEXT DEFAULT NULL,
  p_retry_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.digital_fulfillment_outbox AS outbox
  SET status = CASE
        WHEN p_success THEN 'COMPLETED'
        WHEN outbox.attempt_count >= 10 THEN 'DEAD_LETTER'
        ELSE 'FAILED'
      END,
      completed_at = CASE WHEN p_success THEN NOW() ELSE NULL END,
      available_at = CASE
        WHEN p_success OR outbox.attempt_count >= 10 THEN outbox.available_at
        ELSE COALESCE(p_retry_at, NOW() + make_interval(secs => LEAST(21600, 30 * (2 ^ LEAST(outbox.attempt_count, 9))::INTEGER)))
      END,
      last_error_code = CASE WHEN p_success THEN NULL ELSE LEFT(COALESCE(p_error_code, 'DIGITAL_DELIVERY_FAILED'), 120) END,
      claimed_at = NULL,
      claimed_by = NULL
  WHERE outbox.id = p_event_id
    AND outbox.status = 'PROCESSING'
    AND outbox.claimed_by = p_worker_id;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_digital_asset_scan(
  p_owner_user_id UUID,
  p_market_code TEXT,
  p_asset_id UUID
)
RETURNS SETOF public.digital_assets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  asset public.digital_assets%ROWTYPE;
BEGIN
  SELECT * INTO asset
  FROM public.digital_assets
  WHERE id = p_asset_id
    AND owner_user_id = p_owner_user_id
    AND market_code = p_market_code
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'DIGITAL_ASSET_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF asset.status = 'READY' THEN
    RETURN NEXT asset;
    RETURN;
  END IF;
  IF asset.status NOT IN ('UPLOAD_PENDING', 'PROCESSING', 'SCANNING', 'QUARANTINED')
    OR (asset.status = 'QUARANTINED' AND asset.malware_scan_status <> 'FAILED') THEN
    RAISE EXCEPTION 'DIGITAL_ASSET_SCAN_UNAVAILABLE' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.digital_assets
  SET status = 'PROCESSING', malware_scan_status = 'PENDING'
  WHERE id = asset.id
  RETURNING * INTO asset;

  INSERT INTO public.digital_fulfillment_outbox (
    market_code, event_type, aggregate_type, aggregate_id,
    idempotency_key, payload
  ) VALUES (
    asset.market_code, 'DIGITAL_ASSET_SCAN_REQUESTED', 'digital_asset',
    asset.id,
    'digital-asset:' || asset.id::TEXT || ':scan:v' || asset.version::TEXT,
    jsonb_build_object('assetId', asset.id)
  )
  ON CONFLICT (idempotency_key) DO UPDATE
  SET status = 'PENDING', attempt_count = 0, available_at = NOW(),
      claimed_at = NULL, claimed_by = NULL, completed_at = NULL,
      last_error_code = NULL
  WHERE public.digital_fulfillment_outbox.status IN ('FAILED', 'DEAD_LETTER');

  RETURN NEXT asset;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_digital_fulfillment_lifecycle(
  p_limit INTEGER DEFAULT 200
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  reminder_count INTEGER := 0;
  escalation_count INTEGER := 0;
  expiry_count INTEGER := 0;
BEGIN
  WITH due AS (
    SELECT task.id, task.entitlement_id, task.market_code
    FROM public.digital_provisioning_tasks AS task
    WHERE task.status IN ('PENDING', 'IN_PROGRESS', 'RETRY_PENDING')
      AND task.deadline_at > NOW()
      AND task.deadline_at <= NOW() + INTERVAL '24 hours'
    ORDER BY task.deadline_at, task.id
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(p_limit, 1), 1000)
  ), inserted AS (
    INSERT INTO public.digital_fulfillment_outbox (
      market_code, event_type, aggregate_type, aggregate_id,
      idempotency_key, payload
    )
    SELECT due.market_code, 'DIGITAL_PROVISIONING_DEADLINE_REMINDER',
      'digital_entitlement', due.entitlement_id,
      'digital-entitlement:' || due.entitlement_id::TEXT || ':deadline-reminder',
      jsonb_build_object('entitlementId', due.entitlement_id)
    FROM due
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id
  )
  SELECT COUNT(*) INTO reminder_count FROM inserted;

  WITH overdue AS (
    SELECT task.id, task.entitlement_id, task.market_code
    FROM public.digital_provisioning_tasks AS task
    WHERE task.status IN ('PENDING', 'IN_PROGRESS', 'RETRY_PENDING')
      AND task.deadline_at <= NOW()
    ORDER BY task.deadline_at, task.id
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(p_limit, 1), 1000)
  ), updated_tasks AS (
    UPDATE public.digital_provisioning_tasks AS task
    SET status = 'ESCALATED', failure_code = 'PROVISIONING_DEADLINE_EXCEEDED',
        updated_at = NOW()
    FROM overdue
    WHERE task.id = overdue.id
    RETURNING task.entitlement_id, task.market_code
  ), updated_entitlements AS (
    UPDATE public.digital_entitlements AS entitlement
    SET status = 'PROVISIONING_FAILED', updated_at = NOW()
    FROM updated_tasks
    WHERE entitlement.id = updated_tasks.entitlement_id
      AND entitlement.status = 'PROVISIONING'
    RETURNING entitlement.id, entitlement.market_code
  ), inserted AS (
    INSERT INTO public.digital_fulfillment_outbox (
      market_code, event_type, aggregate_type, aggregate_id,
      idempotency_key, payload
    )
    SELECT updated_entitlements.market_code, 'DIGITAL_PROVISIONING_ESCALATED',
      'digital_entitlement', updated_entitlements.id,
      'digital-entitlement:' || updated_entitlements.id::TEXT || ':provisioning-escalated',
      jsonb_build_object('entitlementId', updated_entitlements.id)
    FROM updated_entitlements
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id
  )
  SELECT COUNT(*) INTO escalation_count FROM inserted;

  WITH expired AS (
    SELECT entitlement.id, entitlement.market_code
    FROM public.digital_entitlements AS entitlement
    WHERE entitlement.expires_at <= NOW()
      AND entitlement.status IN ('ACCESS_AVAILABLE', 'DELIVERED', 'INVALID_ACCESS', 'LIMIT_REACHED')
    ORDER BY entitlement.expires_at, entitlement.id
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(p_limit, 1), 1000)
  ), updated_entitlements AS (
    UPDATE public.digital_entitlements AS entitlement
    SET status = 'EXPIRED', updated_at = NOW()
    FROM expired
    WHERE entitlement.id = expired.id
    RETURNING entitlement.id, entitlement.market_code
  ), revoked_grants AS (
    UPDATE public.digital_access_grants AS access_grant
    SET revoked_at = NOW()
    FROM updated_entitlements
    WHERE access_grant.entitlement_id = updated_entitlements.id
      AND access_grant.consumed_at IS NULL
      AND access_grant.revoked_at IS NULL
    RETURNING access_grant.id
  ), inserted AS (
    INSERT INTO public.digital_fulfillment_outbox (
      market_code, event_type, aggregate_type, aggregate_id,
      idempotency_key, payload
    )
    SELECT updated_entitlements.market_code, 'DIGITAL_ENTITLEMENT_EXPIRED',
      'digital_entitlement', updated_entitlements.id,
      'digital-entitlement:' || updated_entitlements.id::TEXT || ':expired',
      jsonb_build_object('entitlementId', updated_entitlements.id)
    FROM updated_entitlements
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id
  )
  SELECT COUNT(*) INTO expiry_count FROM inserted;

  RETURN jsonb_build_object(
    'remindersCreated', reminder_count,
    'provisioningEscalations', escalation_count,
    'entitlementsExpired', expiry_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_digital_order_access_state(
  p_order_id UUID,
  p_state TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  entitlement public.digital_entitlements%ROWTYPE;
  policy public.digital_market_policies%ROWTYPE;
  next_status TEXT;
  changed_count INTEGER := 0;
BEGIN
  IF p_state NOT IN ('DISPUTED', 'REFUND_REQUESTED', 'REFUNDED', 'REVERSED') THEN
    RAISE EXCEPTION 'DIGITAL_FINANCIAL_STATE_INVALID';
  END IF;

  FOR entitlement IN
    SELECT current_entitlement.*
    FROM public.digital_entitlements AS current_entitlement
    WHERE current_entitlement.order_id = p_order_id
    ORDER BY current_entitlement.id
    FOR UPDATE
  LOOP
    SELECT market_policy.* INTO policy
    FROM public.digital_fulfillment_versions AS fulfillment
    JOIN public.digital_market_policies AS market_policy
      ON market_policy.id = fulfillment.policy_id
    WHERE fulfillment.id = entitlement.fulfillment_version_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'DIGITAL_HISTORICAL_POLICY_NOT_FOUND'; END IF;

    next_status := entitlement.status;
    IF p_state = 'REVERSED' THEN
      next_status := 'REVOKED';
    ELSIF p_state = 'DISPUTED' THEN
      next_status := CASE policy.dispute_access_behavior
        WHEN 'REVOKE' THEN 'REVOKED'
        WHEN 'SUSPEND' THEN 'DISPUTED'
        ELSE entitlement.status
      END;
    ELSIF p_state = 'REFUNDED' THEN
      next_status := CASE
        WHEN policy.refund_access_behavior = 'CONTINUE_UNTIL_REVIEW' THEN entitlement.status
        ELSE 'REFUNDED'
      END;
    ELSIF p_state = 'REFUND_REQUESTED'
      AND policy.refund_access_behavior = 'REVOKE_ON_REQUEST' THEN
      next_status := 'REFUND_REQUESTED';
    END IF;

    UPDATE public.digital_entitlements
    SET status = next_status,
        payment_status = CASE WHEN p_state = 'REFUND_REQUESTED' THEN 'REFUND_PENDING' ELSE p_state END,
        disputed_at = CASE WHEN p_state = 'DISPUTED' THEN NOW() ELSE disputed_at END,
        refunded_at = CASE WHEN p_state = 'REFUNDED' THEN NOW() ELSE refunded_at END,
        revoked_at = CASE WHEN next_status = 'REVOKED' THEN NOW() ELSE revoked_at END,
        updated_at = NOW()
    WHERE id = entitlement.id;

    IF next_status IN ('REVOKED', 'REFUNDED', 'DISPUTED', 'REFUND_REQUESTED') THEN
      UPDATE public.digital_access_grants
      SET revoked_at = NOW()
      WHERE entitlement_id = entitlement.id
        AND consumed_at IS NULL
        AND revoked_at IS NULL;
    END IF;
    changed_count := changed_count + 1;
  END LOOP;
  RETURN changed_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.attach_provisioned_digital_secret(
  p_entitlement_id UUID,
  p_seller_id UUID,
  p_secret_version_id UUID,
  p_request_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  entitlement public.digital_entitlements%ROWTYPE;
BEGIN
  SELECT * INTO entitlement
  FROM public.digital_entitlements
  WHERE id = p_entitlement_id
  FOR UPDATE;
  IF NOT FOUND OR entitlement.seller_id <> p_seller_id THEN
    RAISE EXCEPTION 'DIGITAL_PROVISIONING_TASK_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF entitlement.payment_status <> 'CONFIRMED'
    OR entitlement.status <> 'PROVISIONING'
    OR NOT ('SELLER_PROVISIONED' = ANY (entitlement.fulfillment_types)) THEN
    RAISE EXCEPTION 'DIGITAL_PROVISIONING_TASK_UNAVAILABLE' USING ERRCODE = 'P0001';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.digital_access_secret_versions AS secret_version
    WHERE secret_version.id = p_secret_version_id
      AND secret_version.owner_user_id = p_seller_id
      AND secret_version.market_code = entitlement.market_code
      AND secret_version.listing_id = entitlement.listing_id
      AND secret_version.status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'DIGITAL_PROVISIONING_SECRET_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.digital_entitlements
  SET provisioned_secret_version_id = p_secret_version_id,
      status = 'ACCESS_AVAILABLE', available_at = NOW(), updated_at = NOW()
  WHERE id = entitlement.id;
  UPDATE public.digital_provisioning_tasks
  SET status = 'COMPLETED', completed_at = NOW(), updated_at = NOW()
  WHERE entitlement_id = entitlement.id AND seller_id = p_seller_id;
  INSERT INTO public.digital_fulfillment_outbox (
    market_code, event_type, aggregate_type, aggregate_id,
    idempotency_key, payload
  ) VALUES (
    entitlement.market_code, 'DIGITAL_ACCESS_READY', 'digital_entitlement',
    entitlement.id, 'digital-entitlement:' || entitlement.id::TEXT || ':provisioned',
    jsonb_build_object('entitlementId', entitlement.id)
  ) ON CONFLICT (idempotency_key) DO NOTHING;
  INSERT INTO public.digital_access_audit_events (
    entitlement_id, actor_id, market_code, action, result, request_id
  ) VALUES (
    entitlement.id, p_seller_id, entitlement.market_code,
    'SELLER_PROVISIONING_COMPLETED', 'ALLOWED', p_request_id
  );
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_digital_access_grant(
  p_grant_id UUID,
  p_buyer_id UUID
)
RETURNS SETOF public.digital_access_grants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  access_grant public.digital_access_grants%ROWTYPE;
  entitlement public.digital_entitlements%ROWTYPE;
  buyer_status public.account_status;
  seller_status public.account_status;
  listing_state public.listing_status;
  removal_behavior TEXT;
  seller_behavior TEXT;
BEGIN
  SELECT * INTO access_grant
  FROM public.digital_access_grants
  WHERE id = p_grant_id
  FOR UPDATE;
  IF NOT FOUND OR access_grant.buyer_id <> p_buyer_id
    OR access_grant.consumed_at IS NOT NULL
    OR access_grant.revoked_at IS NOT NULL
    OR access_grant.expires_at <= NOW() THEN
    RETURN;
  END IF;

  SELECT * INTO entitlement
  FROM public.digital_entitlements
  WHERE id = access_grant.entitlement_id
  FOR SHARE;
  IF NOT FOUND OR entitlement.buyer_id <> p_buyer_id
    OR entitlement.payment_status <> 'CONFIRMED'
    OR entitlement.status NOT IN ('ACCESS_AVAILABLE', 'DELIVERED')
    OR (entitlement.expires_at IS NOT NULL AND entitlement.expires_at <= NOW()) THEN
    RETURN;
  END IF;

  SELECT buyer.status, seller.status, listing.status,
    policy.listing_removal_access_behavior,
    policy.seller_restriction_access_behavior
  INTO buyer_status, seller_status, listing_state, removal_behavior, seller_behavior
  FROM public.profiles AS buyer
  JOIN public.profiles AS seller ON seller.id = entitlement.seller_id
  JOIN public.listings AS listing ON listing.id = entitlement.listing_id
  JOIN public.digital_fulfillment_versions AS fulfillment
    ON fulfillment.id = entitlement.fulfillment_version_id
  JOIN public.digital_market_policies AS policy ON policy.id = fulfillment.policy_id
  WHERE buyer.id = entitlement.buyer_id;

  IF buyer_status <> 'active'
    OR (seller_status <> 'active' AND seller_behavior <> 'PRESERVE_EXISTING_PURCHASES')
    OR (listing_state IN ('archived', 'rejected', 'flagged') AND removal_behavior <> 'PRESERVE_EXISTING_PURCHASES') THEN
    RETURN;
  END IF;
  IF access_grant.action = 'DOWNLOAD' AND NOT EXISTS (
    SELECT 1
    FROM public.digital_fulfillment_assets AS linked_asset
    JOIN public.digital_assets AS asset ON asset.id = linked_asset.asset_id
    WHERE linked_asset.fulfillment_version_id = entitlement.fulfillment_version_id
      AND asset.id = access_grant.asset_id
      AND asset.status = 'READY'
      AND asset.malware_scan_status = 'CLEAN'
  ) THEN
    RETURN;
  END IF;

  UPDATE public.digital_access_grants
  SET consumed_at = NOW()
  WHERE id = access_grant.id
  RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_digital_asset_upload_record(
  p_asset_id UUID,
  p_owner_user_id UUID,
  p_market_code TEXT,
  p_listing_id UUID,
  p_replaces_asset_id UUID,
  p_staging_path TEXT,
  p_file_name TEXT,
  p_extension TEXT,
  p_content_type TEXT,
  p_size_bytes BIGINT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  policy public.digital_market_policies%ROWTYPE;
  replaced public.digital_assets%ROWTYPE;
  active_count INTEGER;
  active_total BIGINT;
  next_version INTEGER;
BEGIN
  SELECT * INTO policy
  FROM public.digital_market_policies
  WHERE market_code = p_market_code AND status = 'ACTIVE' AND enabled
  FOR SHARE;
  IF NOT FOUND OR COALESCE((policy.capabilities ->> 'listingDrafts')::BOOLEAN, FALSE) = FALSE THEN
    RAISE EXCEPTION 'DIGITAL_UPLOAD_POLICY_DISABLED';
  END IF;
  IF p_content_type <> ALL (policy.allowed_mime_types)
    OR p_extension <> ALL (policy.allowed_file_extensions)
    OR p_size_bytes <= 0 OR p_size_bytes > policy.max_file_size_bytes THEN
    RAISE EXCEPTION 'DIGITAL_UPLOAD_POLICY_REJECTED';
  END IF;
  IF p_listing_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.listings
    WHERE id = p_listing_id AND seller_id = p_owner_user_id
      AND market_code = p_market_code AND status IN ('draft', 'published')
  ) THEN
    RAISE EXCEPTION 'DIGITAL_UPLOAD_LISTING_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    'digital-upload:' || p_owner_user_id::TEXT || ':' || p_market_code || ':' || COALESCE(p_listing_id::TEXT, 'unbound'),
    0
  ));
  IF p_replaces_asset_id IS NOT NULL THEN
    SELECT * INTO replaced FROM public.digital_assets
    WHERE id = p_replaces_asset_id AND owner_user_id = p_owner_user_id
      AND market_code = p_market_code
      AND listing_id IS NOT DISTINCT FROM p_listing_id
    FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'DIGITAL_REPLACED_ASSET_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  END IF;

  SELECT COUNT(*), COALESCE(SUM(COALESCE(asset.actual_size_bytes, asset.declared_size_bytes)), 0)
    INTO active_count, active_total
  FROM public.digital_assets AS asset
  WHERE asset.owner_user_id = p_owner_user_id
    AND asset.market_code = p_market_code
    AND asset.listing_id IS NOT DISTINCT FROM p_listing_id
    AND asset.status NOT IN ('REMOVED', 'REJECTED');
  IF p_replaces_asset_id IS NOT NULL AND replaced.status NOT IN ('REMOVED', 'REJECTED') THEN
    active_count := active_count - 1;
    active_total := active_total - COALESCE(replaced.actual_size_bytes, replaced.declared_size_bytes);
  END IF;
  IF active_count >= policy.max_file_count
    OR active_total + p_size_bytes > policy.max_total_file_size_bytes THEN
    RAISE EXCEPTION 'DIGITAL_UPLOAD_LIMIT_REACHED';
  END IF;

  SELECT COALESCE(MAX(asset.version), 0) + 1 INTO next_version
  FROM public.digital_assets AS asset
  WHERE asset.owner_user_id = p_owner_user_id
    AND asset.market_code = p_market_code
    AND asset.listing_id IS NOT DISTINCT FROM p_listing_id;

  INSERT INTO public.digital_assets (
    id, owner_user_id, market_code, listing_id, version, replaces_asset_id,
    staging_path, original_file_name, safe_file_name, declared_extension,
    declared_content_type, declared_size_bytes, moderation_status
  ) VALUES (
    p_asset_id, p_owner_user_id, p_market_code, p_listing_id, next_version,
    p_replaces_asset_id, p_staging_path, p_file_name, p_file_name, p_extension,
    p_content_type, p_size_bytes,
    CASE WHEN policy.moderation_required THEN 'PENDING' ELSE 'NOT_REQUIRED' END
  );
  RETURN p_asset_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_digital_fulfillment_outbox(TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_digital_fulfillment_outbox(UUID, TEXT, BOOLEAN, TEXT, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_digital_asset_scan(UUID, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_digital_fulfillment_lifecycle(INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_digital_fulfillment_outbox(TEXT, INTEGER, INTEGER)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_digital_fulfillment_outbox(UUID, TEXT, BOOLEAN, TEXT, TIMESTAMPTZ)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_digital_asset_scan(UUID, TEXT, UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_digital_fulfillment_lifecycle(INTEGER)
  TO service_role;
REVOKE ALL ON FUNCTION public.apply_digital_order_access_state(UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.attach_provisioned_digital_secret(UUID, UUID, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_digital_order_access_state(UUID, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.attach_provisioned_digital_secret(UUID, UUID, UUID, TEXT)
  TO service_role;
REVOKE ALL ON FUNCTION public.create_digital_asset_upload_record(UUID, UUID, TEXT, UUID, UUID, TEXT, TEXT, TEXT, TEXT, BIGINT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_digital_asset_upload_record(UUID, UUID, TEXT, UUID, UUID, TEXT, TEXT, TEXT, TEXT, BIGINT)
  TO service_role;
