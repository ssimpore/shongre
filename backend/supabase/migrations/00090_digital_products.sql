-- =============================================================================
-- DIGITAL PRODUCTS: MARKET POLICY, VERSIONED FULFILLMENT, PRIVATE ASSETS,
-- ENCRYPTED CREDENTIAL INVENTORY, ENTITLEMENTS, ACCESS GRANTS AND OUTBOX
-- =============================================================================

CREATE TABLE public.digital_market_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  version INTEGER NOT NULL CHECK (version > 0),
  status TEXT NOT NULL CHECK (status IN ('DRAFT','ACTIVE','DISABLED','RETIRED')),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  allowed_account_types TEXT[] NOT NULL DEFAULT '{}',
  allowed_seller_types TEXT[] NOT NULL DEFAULT '{}',
  allowed_category_ids TEXT[] NOT NULL DEFAULT '{}',
  allowed_fulfillment_types TEXT[] NOT NULL DEFAULT '{}',
  allowed_fulfillment_combinations JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_verification_dimensions TEXT[] NOT NULL DEFAULT '{}',
  moderation_required BOOLEAN NOT NULL DEFAULT TRUE,
  allowed_mime_types TEXT[] NOT NULL DEFAULT '{}',
  allowed_file_extensions TEXT[] NOT NULL DEFAULT '{}',
  max_file_count INTEGER NOT NULL CHECK (max_file_count BETWEEN 1 AND 100),
  max_file_size_bytes BIGINT NOT NULL CHECK (max_file_size_bytes > 0),
  max_total_file_size_bytes BIGINT NOT NULL CHECK (max_total_file_size_bytes > 0),
  credential_inventory_policy JSONB NOT NULL,
  external_link_policy JSONB NOT NULL,
  provisioning_deadline_hours INTEGER NOT NULL CHECK (provisioning_deadline_hours BETWEEN 1 AND 2160),
  default_entitlement_duration_days INTEGER NOT NULL CHECK (default_entitlement_duration_days BETWEEN 1 AND 3650),
  default_download_limit INTEGER NOT NULL CHECK (default_download_limit BETWEEN 1 AND 10000),
  default_reveal_limit INTEGER NOT NULL CHECK (default_reveal_limit BETWEEN 1 AND 1000),
  currency VARCHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  minimum_price_minor BIGINT NOT NULL CHECK (minimum_price_minor >= 0),
  maximum_price_minor BIGINT NOT NULL CHECK (maximum_price_minor >= minimum_price_minor),
  tax_policy_version TEXT,
  refund_policy_version TEXT,
  withdrawal_presentation_version TEXT,
  payment_provider_configuration_id TEXT,
  legal_approval_id TEXT,
  capabilities JSONB NOT NULL,
  refund_access_behavior TEXT NOT NULL CHECK (refund_access_behavior IN ('REVOKE_ON_REQUEST','REVOKE_ON_REFUND','CONTINUE_UNTIL_REVIEW')),
  dispute_access_behavior TEXT NOT NULL CHECK (dispute_access_behavior IN ('REVOKE','SUSPEND','CONTINUE_UNTIL_REVIEW')),
  listing_removal_access_behavior TEXT NOT NULL CHECK (listing_removal_access_behavior IN ('REVOKE','SUSPEND','PRESERVE_EXISTING_PURCHASES')),
  seller_restriction_access_behavior TEXT NOT NULL CHECK (seller_restriction_access_behavior IN ('REVOKE','SUSPEND','PRESERVE_EXISTING_PURCHASES')),
  requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  effective_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (market_code, version),
  CONSTRAINT digital_market_policy_activation_evidence CHECK (
    status <> 'ACTIVE'
    OR (
      enabled
      AND approved_at IS NOT NULL
      AND approved_by IS NOT NULL
      AND tax_policy_version IS NOT NULL
      AND refund_policy_version IS NOT NULL
      AND withdrawal_presentation_version IS NOT NULL
      AND payment_provider_configuration_id IS NOT NULL
      AND legal_approval_id IS NOT NULL
      AND jsonb_typeof(capabilities) = 'object'
    )
  ),
  CONSTRAINT digital_market_policy_fulfillment_values CHECK (
    allowed_fulfillment_types <@ ARRAY['FILE_DOWNLOAD','ACCESS_LINK','ACCESS_CREDENTIALS','SELLER_PROVISIONED']::TEXT[]
  ),
  CONSTRAINT digital_market_policy_account_values CHECK (
    allowed_account_types <@ ARRAY['individual','professional']::TEXT[]
    AND allowed_seller_types <@ ARRAY['individual','professional']::TEXT[]
  )
);

CREATE UNIQUE INDEX digital_market_policy_one_active_idx
  ON public.digital_market_policies (market_code)
  WHERE status = 'ACTIVE' AND enabled;

CREATE TABLE public.digital_seller_profiles (
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  policy_id UUID NOT NULL REFERENCES public.digital_market_policies(id) ON DELETE RESTRICT,
  policy_version INTEGER NOT NULL CHECK (policy_version > 0),
  fulfillment_types TEXT[] NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','REACCEPTANCE_REQUIRED','SUSPENDED')),
  accepted_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (seller_id, market_code),
  CONSTRAINT digital_seller_fulfillment_values CHECK (
    fulfillment_types <@ ARRAY['PHYSICAL','FILE_DOWNLOAD','ACCESS_LINK','ACCESS_CREDENTIALS','SELLER_PROVISIONED']::TEXT[]
    AND cardinality(fulfillment_types) > 0
  )
);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('digital-products-staging', 'digital-products-staging', FALSE, 52428800, NULL),
  ('digital-products', 'digital-products', FALSE, 52428800, NULL)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = NULL;

CREATE TABLE public.digital_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  listing_id UUID REFERENCES public.listings(id) ON DELETE RESTRICT,
  version INTEGER NOT NULL CHECK (version > 0),
  replaces_asset_id UUID REFERENCES public.digital_assets(id) ON DELETE RESTRICT,
  staging_path TEXT NOT NULL UNIQUE,
  private_path TEXT UNIQUE,
  original_file_name TEXT NOT NULL,
  safe_file_name TEXT NOT NULL,
  declared_extension TEXT NOT NULL,
  declared_content_type TEXT NOT NULL,
  detected_content_type TEXT,
  declared_size_bytes BIGINT NOT NULL CHECK (declared_size_bytes > 0),
  actual_size_bytes BIGINT CHECK (actual_size_bytes > 0),
  sha256_digest TEXT CHECK (sha256_digest IS NULL OR sha256_digest ~ '^[a-f0-9]{64}$'),
  status TEXT NOT NULL DEFAULT 'UPLOAD_PENDING' CHECK (status IN ('UPLOAD_PENDING','PROCESSING','SCANNING','READY','QUARANTINED','REJECTED','REMOVED','UNAVAILABLE')),
  malware_scan_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (malware_scan_status IN ('PENDING','SCANNING','CLEAN','MALICIOUS','FAILED')),
  malware_scan_provider TEXT,
  malware_scan_signature TEXT,
  malware_scanned_at TIMESTAMPTZ,
  moderation_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (moderation_status IN ('PENDING','APPROVED','REJECTED','NOT_REQUIRED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ready_at TIMESTAMPTZ,
  removed_at TIMESTAMPTZ,
  UNIQUE (listing_id, version, id),
  CONSTRAINT digital_asset_ready_check CHECK (
    status <> 'READY'
    OR (
      private_path IS NOT NULL
      AND actual_size_bytes IS NOT NULL
      AND sha256_digest IS NOT NULL
      AND malware_scan_status = 'CLEAN'
      AND moderation_status IN ('APPROVED','NOT_REQUIRED')
      AND ready_at IS NOT NULL
    )
  )
);

CREATE INDEX digital_assets_owner_status_idx
  ON public.digital_assets (owner_user_id, market_code, status, created_at DESC);
CREATE INDEX digital_assets_listing_version_idx
  ON public.digital_assets (listing_id, version DESC);
CREATE INDEX digital_assets_scan_retry_idx
  ON public.digital_assets (created_at)
  WHERE status IN ('UPLOAD_PENDING','PROCESSING','SCANNING')
    AND malware_scan_status IN ('PENDING','FAILED');

CREATE TABLE public.digital_access_secret_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  listing_id UUID REFERENCES public.listings(id) ON DELETE RESTRICT,
  version INTEGER NOT NULL CHECK (version > 0),
  target_domain TEXT,
  encrypted_payload BYTEA NOT NULL,
  encryption_iv BYTEA NOT NULL,
  encryption_tag BYTEA NOT NULL,
  key_version TEXT NOT NULL,
  credential_hint TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ROTATED','REVOKED','COMPROMISED')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rotated_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  UNIQUE (listing_id, version)
);

CREATE TABLE public.digital_credential_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  listing_id UUID REFERENCES public.listings(id) ON DELETE RESTRICT,
  allocation_mode TEXT NOT NULL CHECK (allocation_mode IN ('REUSABLE','UNIQUE_INVENTORY','APPROVED_PROVIDER','SELLER_AFTER_PAYMENT')),
  credential_kinds TEXT[] NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('IMPORTING','ACTIVE','DEPLETED','SUSPENDED','REVOKED')),
  imported_count INTEGER NOT NULL DEFAULT 0 CHECK (imported_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT digital_credential_kinds_check CHECK (
    credential_kinds <@ ARRAY['LICENSE_KEY','ACTIVATION_CODE','USERNAME','PASSWORD','PIN','TOKEN','STRUCTURED_INSTRUCTIONS']::TEXT[]
    AND cardinality(credential_kinds) > 0
  )
);

CREATE TABLE public.digital_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.digital_credential_batches(id) ON DELETE RESTRICT,
  fingerprint TEXT NOT NULL CHECK (fingerprint ~ '^[a-f0-9]{64}$'),
  encrypted_payload BYTEA NOT NULL,
  encryption_iv BYTEA NOT NULL,
  encryption_tag BYTEA NOT NULL,
  key_version TEXT NOT NULL,
  credential_hint TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE','RESERVED','CONSUMED','REVOKED','COMPROMISED','INVALID')),
  reserved_at TIMESTAMPTZ,
  consumed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (batch_id, fingerprint)
);

CREATE INDEX digital_credentials_available_idx
  ON public.digital_credentials (batch_id, created_at, id)
  WHERE status = 'AVAILABLE';

CREATE TABLE public.digital_fulfillment_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  policy_id UUID NOT NULL REFERENCES public.digital_market_policies(id) ON DELETE RESTRICT,
  policy_version INTEGER NOT NULL CHECK (policy_version > 0),
  version INTEGER NOT NULL CHECK (version > 0),
  product_version TEXT NOT NULL,
  fulfillment_types TEXT[] NOT NULL,
  primary_fulfillment_type TEXT NOT NULL,
  buyer_facing_description TEXT NOT NULL,
  compatibility TEXT[] NOT NULL DEFAULT '{}',
  requirements TEXT[] NOT NULL DEFAULT '{}',
  public_terms_label TEXT,
  access_secret_version_id UUID REFERENCES public.digital_access_secret_versions(id) ON DELETE RESTRICT,
  credential_allocation_mode TEXT,
  credential_kinds TEXT[] NOT NULL DEFAULT '{}',
  provisioning_time_hours INTEGER,
  entitlement_duration_days INTEGER NOT NULL CHECK (entitlement_duration_days BETWEEN 1 AND 3650),
  download_limit INTEGER CHECK (download_limit BETWEEN 1 AND 10000),
  reveal_limit INTEGER CHECK (reveal_limit BETWEEN 1 AND 1000),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PROCESSING','READY','PUBLISHED','RETIRED','SUSPENDED')),
  moderation_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (moderation_status IN ('PENDING','APPROVED','REJECTED','NOT_REQUIRED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  retired_at TIMESTAMPTZ,
  UNIQUE (listing_id, version),
  CONSTRAINT digital_fulfillment_values_check CHECK (
    fulfillment_types <@ ARRAY['FILE_DOWNLOAD','ACCESS_LINK','ACCESS_CREDENTIALS','SELLER_PROVISIONED']::TEXT[]
    AND cardinality(fulfillment_types) > 0
    AND primary_fulfillment_type = ANY (fulfillment_types)
  )
);

CREATE TABLE public.digital_fulfillment_assets (
  fulfillment_version_id UUID NOT NULL REFERENCES public.digital_fulfillment_versions(id) ON DELETE RESTRICT,
  asset_id UUID NOT NULL REFERENCES public.digital_assets(id) ON DELETE RESTRICT,
  position INTEGER NOT NULL CHECK (position >= 0),
  PRIMARY KEY (fulfillment_version_id, asset_id),
  UNIQUE (fulfillment_version_id, position)
);

CREATE TABLE public.digital_fulfillment_credential_batches (
  fulfillment_version_id UUID NOT NULL REFERENCES public.digital_fulfillment_versions(id) ON DELETE RESTRICT,
  batch_id UUID NOT NULL REFERENCES public.digital_credential_batches(id) ON DELETE RESTRICT,
  PRIMARY KEY (fulfillment_version_id, batch_id)
);

ALTER TABLE public.listings
  ADD COLUMN fulfillment_model TEXT NOT NULL DEFAULT 'PHYSICAL'
    CHECK (fulfillment_model IN ('PHYSICAL','FILE_DOWNLOAD','ACCESS_LINK','ACCESS_CREDENTIALS','SELLER_PROVISIONED')),
  ADD COLUMN digital_fulfillment_version_id UUID REFERENCES public.digital_fulfillment_versions(id) ON DELETE RESTRICT,
  ADD COLUMN product_version TEXT;

ALTER TABLE public.listings
  ADD CONSTRAINT listings_digital_version_required CHECK (
    fulfillment_model = 'PHYSICAL'
    OR (digital_fulfillment_version_id IS NOT NULL AND product_version IS NOT NULL)
  ) NOT VALID;

ALTER TABLE public.orders
  ADD COLUMN fulfillment_model TEXT NOT NULL DEFAULT 'PHYSICAL'
    CHECK (fulfillment_model IN ('PHYSICAL','FILE_DOWNLOAD','ACCESS_LINK','ACCESS_CREDENTIALS','SELLER_PROVISIONED')),
  ADD COLUMN digital_fulfillment_version_id UUID REFERENCES public.digital_fulfillment_versions(id) ON DELETE RESTRICT,
  ADD COLUMN product_version TEXT;

DROP INDEX IF EXISTS public.orders_one_active_per_listing_idx;
CREATE UNIQUE INDEX orders_one_active_physical_per_listing_idx
  ON public.orders (listing_id)
  WHERE fulfillment_model = 'PHYSICAL'
    AND status IN ('initiated','payment_pending','escrow_funded','shipped','pin_pending','disputed','refund_pending');

CREATE TABLE public.digital_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE RESTRICT,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE RESTRICT,
  fulfillment_version_id UUID NOT NULL REFERENCES public.digital_fulfillment_versions(id) ON DELETE RESTRICT,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  product_version TEXT NOT NULL,
  fulfillment_types TEXT[] NOT NULL,
  primary_fulfillment_type TEXT NOT NULL,
  price_minor BIGINT NOT NULL CHECK (price_minor >= 0),
  currency VARCHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  commercial_evidence_id TEXT NOT NULL,
  payment_intent_id TEXT NOT NULL UNIQUE,
  payment_confirmed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.digital_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  order_item_id UUID NOT NULL UNIQUE REFERENCES public.digital_order_items(id) ON DELETE RESTRICT,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE RESTRICT,
  fulfillment_version_id UUID NOT NULL REFERENCES public.digital_fulfillment_versions(id) ON DELETE RESTRICT,
  assigned_credential_id UUID UNIQUE REFERENCES public.digital_credentials(id) ON DELETE RESTRICT,
  provisioned_secret_version_id UUID UNIQUE REFERENCES public.digital_access_secret_versions(id) ON DELETE RESTRICT,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  product_version TEXT NOT NULL,
  fulfillment_types TEXT[] NOT NULL,
  primary_fulfillment_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PAYMENT_PENDING','PAYMENT_FAILED','PAYMENT_CANCELLED','FULFILLMENT_PROCESSING','PROVISIONING','PROVISIONING_FAILED','ACCESS_AVAILABLE','DELIVERED','INVALID_ACCESS','QUARANTINED','LIMIT_REACHED','RESET_REQUESTED','REPLACEMENT_REQUESTED','EXPIRED','REFUND_REQUESTED','PARTIALLY_REFUNDED','REFUNDED','DISPUTED','REVOKED','UNAVAILABLE')),
  payment_status TEXT NOT NULL CHECK (payment_status IN ('PENDING','CONFIRMED','FAILED','CANCELLED','REFUND_PENDING','PARTIALLY_REFUNDED','REFUNDED','DISPUTED','REVERSED')),
  price_minor BIGINT NOT NULL CHECK (price_minor >= 0),
  currency VARCHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  commercial_evidence_id TEXT NOT NULL,
  available_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  download_limit INTEGER CHECK (download_limit > 0),
  download_count INTEGER NOT NULL DEFAULT 0 CHECK (download_count >= 0),
  reveal_limit INTEGER CHECK (reveal_limit > 0),
  reveal_count INTEGER NOT NULL DEFAULT 0 CHECK (reveal_count >= 0),
  credential_revealed_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  disputed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  compromised_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (order_id, listing_id)
);

CREATE INDEX digital_entitlements_buyer_market_idx
  ON public.digital_entitlements (buyer_id, market_code, created_at DESC);
CREATE INDEX digital_entitlements_seller_status_idx
  ON public.digital_entitlements (seller_id, status, created_at DESC);

CREATE TABLE public.digital_credential_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entitlement_id UUID NOT NULL UNIQUE REFERENCES public.digital_entitlements(id) ON DELETE RESTRICT,
  credential_id UUID NOT NULL UNIQUE REFERENCES public.digital_credentials(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consumed_at TIMESTAMPTZ
);

CREATE TABLE public.digital_provisioning_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entitlement_id UUID NOT NULL UNIQUE REFERENCES public.digital_entitlements(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','IN_PROGRESS','RETRY_PENDING','COMPLETED','FAILED','ESCALATED','CANCELLED')),
  deadline_at TIMESTAMPTZ NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failure_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX digital_provisioning_due_idx
  ON public.digital_provisioning_tasks (deadline_at, next_attempt_at)
  WHERE status IN ('PENDING','IN_PROGRESS','RETRY_PENDING');

CREATE TABLE public.digital_access_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entitlement_id UUID NOT NULL REFERENCES public.digital_entitlements(id) ON DELETE RESTRICT,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  asset_id UUID REFERENCES public.digital_assets(id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK (action IN ('DOWNLOAD','OPEN_LINK','REVEAL_SECRET')),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (expires_at > created_at)
);

CREATE INDEX digital_access_grants_active_idx
  ON public.digital_access_grants (buyer_id, expires_at)
  WHERE consumed_at IS NULL AND revoked_at IS NULL;

CREATE TABLE public.digital_access_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entitlement_id UUID REFERENCES public.digital_entitlements(id) ON DELETE RESTRICT,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  result TEXT NOT NULL,
  request_id TEXT,
  safe_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT digital_access_audit_safe_metadata CHECK (
    NOT (safe_metadata ?| ARRAY['secret','credential','password','token','url','storage_key','file_name'])
  )
);

CREATE INDEX digital_access_audit_entitlement_idx
  ON public.digital_access_audit_events (entitlement_id, occurred_at DESC);

CREATE TABLE public.digital_access_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entitlement_id UUID NOT NULL REFERENCES public.digital_entitlements(id) ON DELETE RESTRICT,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  report_type TEXT NOT NULL CHECK (report_type IN ('INVALID_LINK','INVALID_CREDENTIALS','UNAVAILABLE_FILE','COMPROMISED_ACCESS','RESET_REQUEST','REPLACEMENT_REQUEST','PROVISIONING_FAILURE')),
  safe_description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_REVIEW','RESOLVED','REJECTED')),
  resolution_code TEXT,
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE public.digital_fulfillment_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  event_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id UUID NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PROCESSING','COMPLETED','FAILED','DEAD_LETTER')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  claimed_at TIMESTAMPTZ,
  claimed_by TEXT,
  completed_at TIMESTAMPTZ,
  last_error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT digital_fulfillment_outbox_safe_payload CHECK (
    NOT (payload ?| ARRAY['secret','credential','password','token','url','storage_key','file_name'])
  )
);

CREATE INDEX digital_fulfillment_outbox_pending_idx
  ON public.digital_fulfillment_outbox (available_at, created_at)
  WHERE status IN ('PENDING','FAILED');

CREATE OR REPLACE FUNCTION public.reserve_digital_credential(
  p_entitlement_id UUID,
  p_batch_ids UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  selected_credential UUID;
BEGIN
  PERFORM 1 FROM public.digital_entitlements
  WHERE id = p_entitlement_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entitlement not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT assignment.credential_id
  INTO selected_credential
  FROM public.digital_credential_assignments AS assignment
  WHERE assignment.entitlement_id = p_entitlement_id;
  IF selected_credential IS NOT NULL THEN
    RETURN selected_credential;
  END IF;

  SELECT credentials.id
  INTO selected_credential
  FROM public.digital_credentials AS credentials
  WHERE credentials.batch_id = ANY (p_batch_ids)
    AND credentials.status = 'AVAILABLE'
    AND (credentials.expires_at IS NULL OR credentials.expires_at > NOW())
  ORDER BY credentials.created_at, credentials.id
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF selected_credential IS NULL THEN
    RAISE EXCEPTION 'Unique credential inventory depleted' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.digital_credentials
  SET status = 'RESERVED', reserved_at = NOW()
  WHERE id = selected_credential AND status = 'AVAILABLE';

  INSERT INTO public.digital_credential_assignments (entitlement_id, credential_id)
  VALUES (p_entitlement_id, selected_credential)
  ON CONFLICT (entitlement_id) DO NOTHING;

  UPDATE public.digital_entitlements
  SET assigned_credential_id = selected_credential, updated_at = NOW()
  WHERE id = p_entitlement_id AND assigned_credential_id IS NULL;

  RETURN selected_credential;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_paid_digital_entitlement(
  p_order_id UUID,
  p_payment_intent_id TEXT,
  p_request_id TEXT
)
RETURNS SETOF public.digital_entitlements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  paid_order public.orders%ROWTYPE;
  fulfillment public.digital_fulfillment_versions%ROWTYPE;
  item public.digital_order_items%ROWTYPE;
  entitlement public.digital_entitlements%ROWTYPE;
  entitlement_status TEXT;
  batch_ids UUID[];
BEGIN
  SELECT * INTO paid_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;
  IF NOT FOUND
    OR paid_order.status <> 'escrow_funded'
    OR paid_order.payment_intent_id IS DISTINCT FROM p_payment_intent_id
    OR paid_order.fulfillment_model = 'PHYSICAL'
    OR paid_order.digital_fulfillment_version_id IS NULL THEN
    RAISE EXCEPTION 'Confirmed digital order not found' USING ERRCODE = 'P0002';
  END IF;
  IF paid_order.commission_snapshot_hash IS NULL THEN
    RAISE EXCEPTION 'Commercial evidence is missing' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO fulfillment
  FROM public.digital_fulfillment_versions
  WHERE id = paid_order.digital_fulfillment_version_id
    AND listing_id = paid_order.listing_id
    AND seller_id = paid_order.seller_id
    AND market_code = (SELECT market_code FROM public.listings WHERE id = paid_order.listing_id)
    AND status = 'PUBLISHED'
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Digital fulfillment version unavailable' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.digital_order_items (
    order_id, listing_id, fulfillment_version_id, buyer_id, seller_id,
    market_code, product_version, fulfillment_types, primary_fulfillment_type,
    price_minor, currency, commercial_evidence_id, payment_intent_id,
    payment_confirmed_at
  ) VALUES (
    paid_order.id, paid_order.listing_id, fulfillment.id, paid_order.buyer_id,
    paid_order.seller_id, fulfillment.market_code, fulfillment.product_version,
    fulfillment.fulfillment_types, fulfillment.primary_fulfillment_type,
    paid_order.item_amount_minor, paid_order.currency,
    paid_order.commission_snapshot_hash, p_payment_intent_id, NOW()
  )
  ON CONFLICT (order_id) DO UPDATE SET order_id = EXCLUDED.order_id
  RETURNING * INTO item;

  entitlement_status := CASE
    WHEN 'SELLER_PROVISIONED' = ANY (fulfillment.fulfillment_types)
      OR fulfillment.credential_allocation_mode IN ('APPROVED_PROVIDER','SELLER_AFTER_PAYMENT')
      THEN 'PROVISIONING'
    ELSE 'ACCESS_AVAILABLE'
  END;

  INSERT INTO public.digital_entitlements (
    buyer_id, seller_id, order_id, order_item_id, listing_id,
    fulfillment_version_id, market_code, product_version, fulfillment_types,
    primary_fulfillment_type, status, payment_status, price_minor, currency,
    commercial_evidence_id, available_at, expires_at, download_limit,
    reveal_limit
  ) VALUES (
    item.buyer_id, item.seller_id, item.order_id, item.id, item.listing_id,
    item.fulfillment_version_id, item.market_code, item.product_version,
    item.fulfillment_types, item.primary_fulfillment_type, entitlement_status,
    'CONFIRMED', item.price_minor, item.currency, item.commercial_evidence_id,
    CASE WHEN entitlement_status = 'ACCESS_AVAILABLE' THEN NOW() ELSE NULL END,
    NOW() + make_interval(days => fulfillment.entitlement_duration_days),
    fulfillment.download_limit, fulfillment.reveal_limit
  )
  ON CONFLICT (order_item_id) DO UPDATE SET order_item_id = EXCLUDED.order_item_id
  RETURNING * INTO entitlement;

  IF fulfillment.credential_allocation_mode = 'UNIQUE_INVENTORY'
    AND entitlement.assigned_credential_id IS NULL THEN
    SELECT array_agg(link.batch_id ORDER BY link.batch_id)
    INTO batch_ids
    FROM public.digital_fulfillment_credential_batches AS link
    WHERE link.fulfillment_version_id = fulfillment.id;
    IF batch_ids IS NULL OR cardinality(batch_ids) = 0 THEN
      RAISE EXCEPTION 'Credential inventory is missing' USING ERRCODE = 'P0001';
    END IF;
    PERFORM public.reserve_digital_credential(entitlement.id, batch_ids);
    SELECT * INTO entitlement FROM public.digital_entitlements WHERE id = entitlement.id;
  END IF;

  IF entitlement_status = 'PROVISIONING' THEN
    INSERT INTO public.digital_provisioning_tasks (
      entitlement_id, seller_id, deadline_at
    ) VALUES (
      entitlement.id, entitlement.seller_id,
      NOW() + make_interval(hours => COALESCE(fulfillment.provisioning_time_hours, 72))
    ) ON CONFLICT (entitlement_id) DO NOTHING;
  END IF;

  INSERT INTO public.digital_fulfillment_outbox (
    market_code, event_type, aggregate_type, aggregate_id, idempotency_key,
    payload
  ) VALUES (
    entitlement.market_code,
    CASE WHEN entitlement_status = 'PROVISIONING'
      THEN 'DIGITAL_PROVISIONING_REQUESTED'
      ELSE 'DIGITAL_ACCESS_READY' END,
    'digital_entitlement', entitlement.id,
    'digital-entitlement:' || entitlement.id::TEXT || ':payment-confirmed',
    jsonb_build_object('entitlementId', entitlement.id, 'orderId', entitlement.order_id)
  ) ON CONFLICT (idempotency_key) DO NOTHING;

  INSERT INTO public.digital_access_audit_events (
    entitlement_id, actor_id, market_code, action, result, request_id
  ) VALUES (
    entitlement.id, NULL, entitlement.market_code,
    'PAYMENT_CONFIRMED_ENTITLEMENT_CREATED', 'ALLOWED', p_request_id
  );
  RETURN NEXT entitlement;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_digital_secret_reveal(
  p_entitlement_id UUID,
  p_buyer_id UUID,
  p_market_code TEXT,
  p_request_id TEXT
)
RETURNS SETOF public.digital_entitlements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  entitlement public.digital_entitlements%ROWTYPE;
BEGIN
  SELECT * INTO entitlement FROM public.digital_entitlements
  WHERE id = p_entitlement_id FOR UPDATE;
  IF NOT FOUND OR entitlement.buyer_id <> p_buyer_id OR entitlement.market_code <> p_market_code THEN
    RAISE EXCEPTION 'Entitlement not found' USING ERRCODE = 'P0002';
  END IF;
  IF entitlement.payment_status <> 'CONFIRMED'
    OR entitlement.status NOT IN ('ACCESS_AVAILABLE','DELIVERED')
    OR (entitlement.expires_at IS NOT NULL AND entitlement.expires_at <= NOW())
    OR (entitlement.reveal_limit IS NOT NULL AND entitlement.reveal_count >= entitlement.reveal_limit) THEN
    RAISE EXCEPTION 'Entitlement unavailable' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.digital_entitlements SET
    reveal_count = reveal_count + 1,
    credential_revealed_at = COALESCE(credential_revealed_at, NOW()),
    status = 'DELIVERED',
    delivered_at = COALESCE(delivered_at, NOW()),
    updated_at = NOW()
  WHERE id = entitlement.id
  RETURNING * INTO entitlement;
  INSERT INTO public.digital_access_audit_events (
    entitlement_id, actor_id, market_code, action, result, request_id
  ) VALUES (
    entitlement.id, p_buyer_id, entitlement.market_code,
    'SECRET_REVEALED', 'ALLOWED', p_request_id
  );
  RETURN NEXT entitlement;
END;
$$;

CREATE OR REPLACE FUNCTION public.issue_digital_access_grant(
  p_entitlement_id UUID,
  p_buyer_id UUID,
  p_market_code TEXT,
  p_action TEXT,
  p_asset_id UUID,
  p_request_id TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  entitlement public.digital_entitlements%ROWTYPE;
  buyer_status public.account_status;
  seller_status public.account_status;
  listing_state public.listing_status;
  removal_behavior TEXT;
  seller_behavior TEXT;
  selected_asset_status TEXT;
  grant_id UUID := gen_random_uuid();
BEGIN
  SELECT * INTO entitlement
  FROM public.digital_entitlements
  WHERE id = p_entitlement_id
  FOR UPDATE;

  IF NOT FOUND OR entitlement.buyer_id <> p_buyer_id OR entitlement.market_code <> p_market_code THEN
    RAISE EXCEPTION 'Entitlement not found' USING ERRCODE = 'P0002';
  END IF;
  IF entitlement.payment_status <> 'CONFIRMED'
    OR entitlement.status NOT IN ('ACCESS_AVAILABLE','DELIVERED')
    OR (entitlement.expires_at IS NOT NULL AND entitlement.expires_at <= NOW()) THEN
    RAISE EXCEPTION 'Entitlement unavailable' USING ERRCODE = 'P0001';
  END IF;

  SELECT buyer.status, seller.status, listing.status,
    policy.listing_removal_access_behavior,
    policy.seller_restriction_access_behavior
  INTO buyer_status, seller_status, listing_state, removal_behavior, seller_behavior
  FROM public.profiles AS buyer
  JOIN public.profiles AS seller ON seller.id = entitlement.seller_id
  JOIN public.listings AS listing ON listing.id = entitlement.listing_id
  JOIN public.digital_fulfillment_versions AS fulfillment ON fulfillment.id = entitlement.fulfillment_version_id
  JOIN public.digital_market_policies AS policy ON policy.id = fulfillment.policy_id
  WHERE buyer.id = entitlement.buyer_id;

  IF buyer_status <> 'active' THEN
    RAISE EXCEPTION 'Entitlement unavailable' USING ERRCODE = 'P0001';
  END IF;
  IF seller_status <> 'active' AND seller_behavior <> 'PRESERVE_EXISTING_PURCHASES' THEN
    RAISE EXCEPTION 'Entitlement unavailable' USING ERRCODE = 'P0001';
  END IF;
  IF listing_state IN ('archived','rejected','flagged')
    AND removal_behavior <> 'PRESERVE_EXISTING_PURCHASES' THEN
    RAISE EXCEPTION 'Entitlement unavailable' USING ERRCODE = 'P0001';
  END IF;
  IF p_action = 'DOWNLOAD' THEN
    SELECT asset.status INTO selected_asset_status
    FROM public.digital_fulfillment_assets AS linked_asset
    JOIN public.digital_assets AS asset ON asset.id = linked_asset.asset_id
    WHERE linked_asset.fulfillment_version_id = entitlement.fulfillment_version_id
      AND asset.id = p_asset_id;
    IF selected_asset_status IS DISTINCT FROM 'READY' THEN
      RAISE EXCEPTION 'Digital asset unavailable' USING ERRCODE = 'P0001';
    END IF;
    IF entitlement.download_limit IS NOT NULL AND entitlement.download_count >= entitlement.download_limit THEN
      RAISE EXCEPTION 'Download limit reached' USING ERRCODE = 'P0001';
    END IF;
    UPDATE public.digital_entitlements
    SET download_count = download_count + 1, updated_at = NOW()
    WHERE id = entitlement.id;
  ELSIF p_action IN ('OPEN_LINK','REVEAL_SECRET') THEN
    IF entitlement.reveal_limit IS NOT NULL AND entitlement.reveal_count >= entitlement.reveal_limit THEN
      RAISE EXCEPTION 'Reveal limit reached' USING ERRCODE = 'P0001';
    END IF;
    UPDATE public.digital_entitlements
    SET reveal_count = reveal_count + 1, updated_at = NOW()
    WHERE id = entitlement.id;
  ELSE
    RAISE EXCEPTION 'Invalid grant action' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.digital_access_grants (
    id, entitlement_id, buyer_id, asset_id, action, expires_at
  ) VALUES (
    grant_id, entitlement.id, p_buyer_id, p_asset_id, p_action, NOW() + INTERVAL '5 minutes'
  );
  INSERT INTO public.digital_access_audit_events (
    entitlement_id, actor_id, market_code, action, result, request_id
  ) VALUES (
    entitlement.id, p_buyer_id, entitlement.market_code, p_action || '_GRANT', 'ALLOWED', p_request_id
  );
  RETURN grant_id;
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
BEGIN
  RETURN QUERY
  UPDATE public.digital_access_grants
  SET consumed_at = NOW()
  WHERE id = p_grant_id
    AND buyer_id = p_buyer_id
    AND consumed_at IS NULL
    AND revoked_at IS NULL
    AND expires_at > NOW()
  RETURNING *;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_digital_credential(UUID, UUID[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_paid_digital_entitlement(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_digital_secret_reveal(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.issue_digital_access_grant(UUID, UUID, TEXT, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_digital_access_grant(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_digital_credential(UUID, UUID[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_paid_digital_entitlement(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_digital_secret_reveal(UUID, UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.issue_digital_access_grant(UUID, UUID, TEXT, TEXT, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_digital_access_grant(UUID, UUID) TO service_role;

-- The API/service role is the only mutation boundary. Clients receive only
-- explicit projections after application authorization.
ALTER TABLE public.digital_market_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_seller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_access_secret_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_credential_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_fulfillment_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_fulfillment_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_fulfillment_credential_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_credential_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_provisioning_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_access_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_access_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_fulfillment_outbox ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON
  public.digital_market_policies,
  public.digital_seller_profiles,
  public.digital_assets,
  public.digital_access_secret_versions,
  public.digital_credential_batches,
  public.digital_credentials,
  public.digital_fulfillment_versions,
  public.digital_fulfillment_assets,
  public.digital_fulfillment_credential_batches,
  public.digital_order_items,
  public.digital_entitlements,
  public.digital_credential_assignments,
  public.digital_provisioning_tasks,
  public.digital_access_grants,
  public.digital_access_audit_events,
  public.digital_access_reports,
  public.digital_fulfillment_outbox
FROM anon, authenticated;

-- Installed policies are deliberately disabled. Product/legal/finance owners
-- must create and approve a version with real evidence before publication,
-- checkout, fulfillment, or indexing can become available.
INSERT INTO public.digital_market_policies (
  market_code, version, status, enabled, allowed_account_types,
  allowed_seller_types, allowed_category_ids, allowed_fulfillment_types,
  allowed_fulfillment_combinations, required_verification_dimensions,
  moderation_required, allowed_mime_types, allowed_file_extensions,
  max_file_count, max_file_size_bytes, max_total_file_size_bytes,
  credential_inventory_policy, external_link_policy,
  provisioning_deadline_hours, default_entitlement_duration_days,
  default_download_limit, default_reveal_limit, currency,
  minimum_price_minor, maximum_price_minor, capabilities,
  refund_access_behavior, dispute_access_behavior,
  listing_removal_access_behavior, seller_restriction_access_behavior,
  requirements
)
SELECT
  market.code,
  1,
  'DISABLED',
  FALSE,
  ARRAY['professional'],
  ARRAY['professional'],
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[],
  '[]'::jsonb,
  ARRAY['identity','payment','payout'],
  TRUE,
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[],
  1,
  1,
  1,
  '{"reusableAllowed":false,"uniqueAllowed":false,"providerGeneratedAllowed":false,"sellerEnteredAfterPaymentAllowed":false,"minimumAvailableBeforePurchase":1,"allowedKinds":[],"allowedClasses":[],"prohibitedClasses":["PERSONAL_ACCOUNT","SHARED_THIRD_PARTY_ACCOUNT","PAYMENT_CREDENTIAL","IDENTITY_CREDENTIAL","STOLEN_ACCESS","PROVIDER_TERMS_VIOLATION"]}'::jsonb,
  '{"allowedSchemes":["https"],"acceptedDomains":[],"allowSubdomains":false,"allowQuery":false,"allowFragment":false}'::jsonb,
  72,
  365,
  1,
  1,
  market.currency,
  0,
  0,
  '{"onboarding":false,"listingDrafts":false,"publication":false,"checkout":false,"fulfillment":false,"nativeCheckout":false}'::jsonb,
  'REVOKE_ON_REFUND',
  'SUSPEND',
  'SUSPEND',
  'SUSPEND',
  '[{"id":"activation_pending","label":{"fr-FR":"Activation en attente"},"description":{"fr-FR":"La publication et la vente restent désactivées jusqu’à validation des règles de marché, fiscales, de paiement et de remboursement."}}]'::jsonb
FROM public.markets AS market
WHERE market.code IN ('FR','BE','CH','SN','BF')
ON CONFLICT (market_code, version) DO NOTHING;
