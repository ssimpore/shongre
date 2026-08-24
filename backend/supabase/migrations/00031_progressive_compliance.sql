-- Progressive, action-specific compliance architecture.
-- Raw documents and bank/tax identifiers are deliberately absent from the
-- general verification record. Provider references and decisions are enough
-- for capability resolution; any processor-retained evidence stays external.

INSERT INTO public.access_capabilities (id, is_sensitive) VALUES
  ('compliance.sensitive.read', TRUE),
  ('compliance.policy.read', TRUE),
  ('compliance.policy.manage', TRUE),
  ('compliance.retention.manage', TRUE),
  ('compliance.audit.read', TRUE)
ON CONFLICT (id) DO UPDATE SET is_sensitive = EXCLUDED.is_sensitive;

INSERT INTO public.access_role_grants (role_kind, role_key, capability_id) VALUES
  ('staff_role','trust_safety','compliance.audit.read'),
  ('staff_role','compliance','compliance.sensitive.read'),
  ('staff_role','compliance','compliance.policy.read'),
  ('staff_role','compliance','compliance.policy.manage'),
  ('staff_role','compliance','compliance.retention.manage'),
  ('staff_role','compliance','compliance.audit.read'),
  ('staff_role','owner','compliance.policy.read'),
  ('staff_role','owner','compliance.policy.manage'),
  ('staff_role','owner','compliance.retention.manage'),
  ('staff_role','owner','compliance.audit.read')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.compliance_rules (
  id TEXT PRIMARY KEY,
  jurisdiction TEXT NOT NULL CHECK (char_length(jurisdiction) BETWEEN 1 AND 2),
  regulation TEXT NOT NULL,
  rule_code TEXT NOT NULL,
  description TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN (
    'browse','create_account','save_favorite','message_seller','publish_listing',
    'publish_professional_listing','promote_listing','create_organization',
    'accept_online_payment','receive_payout','complete_tax_due_diligence'
  )),
  conditions JSONB NOT NULL DEFAULT '{}'::JSONB,
  required_checks TEXT[] NOT NULL DEFAULT '{}',
  recommended_checks TEXT[] NOT NULL DEFAULT '{}',
  reason_codes TEXT[] NOT NULL DEFAULT '{}',
  legal_basis TEXT[] NOT NULL DEFAULT '{}',
  source_references TEXT[] NOT NULL DEFAULT '{}',
  policy_version TEXT NOT NULL,
  governance TEXT NOT NULL CHECK (governance IN ('LEGAL_MANDATE','BUSINESS_POLICY','RISK_CONTROL')),
  status TEXT NOT NULL CHECK (status IN ('DRAFT','SCHEDULED','ACTIVE','RETIRED','LEGAL_REVIEW_REQUIRED')),
  effective_from TIMESTAMPTZ NOT NULL,
  effective_until TIMESTAMPTZ,
  priority INTEGER NOT NULL DEFAULT 0,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  reviewed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (effective_until IS NULL OR effective_until > effective_from),
  UNIQUE (jurisdiction, rule_code, policy_version)
);
CREATE INDEX IF NOT EXISTS compliance_rules_active_lookup_idx
  ON public.compliance_rules (jurisdiction, action, status, effective_from, priority DESC)
  WHERE status IN ('SCHEDULED','ACTIVE','LEGAL_REVIEW_REQUIRED');

CREATE TABLE IF NOT EXISTS public.compliance_rule_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id TEXT NOT NULL REFERENCES public.compliance_rules(id) ON DELETE RESTRICT,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL CHECK (char_length(reason) >= 10),
  previous_value JSONB,
  new_value JSONB NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS compliance_rule_changes_rule_idx
  ON public.compliance_rule_changes (rule_id, changed_at DESC);

CREATE TABLE IF NOT EXISTS public.compliance_verification_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  dimension TEXT NOT NULL CHECK (dimension IN (
    'email','phone','identity','age','address','business','business_representative',
    'beneficial_owner','tax','vat','bank_account','payout','payment',
    'professional_status','document','risk','enhanced_review','mfa'
  )),
  state TEXT NOT NULL CHECK (state IN (
    'not_required','required','pending','processing','verified','failed','expired',
    'needs_update','manual_review','rejected'
  )),
  provider TEXT,
  provider_reference TEXT,
  method TEXT,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  last_checked_at TIMESTAMPTZ,
  refresh_required_at TIMESTAMPTZ,
  reason_code TEXT,
  visibility TEXT NOT NULL CHECK (visibility IN (
    'PUBLIC','ACCOUNT_OWNER_ONLY','TEAM_ADMIN_ONLY','COMPLIANCE_ONLY',
    'PROVIDER_ONLY','LEGAL_DISCLOSURE_ONLY'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, dimension),
  CHECK (expires_at IS NULL OR verified_at IS NULL OR expires_at > verified_at)
);
CREATE INDEX IF NOT EXISTS compliance_verification_user_state_idx
  ON public.compliance_verification_records (user_id, state, dimension);
CREATE INDEX IF NOT EXISTS compliance_verification_refresh_idx
  ON public.compliance_verification_records (refresh_required_at)
  WHERE refresh_required_at IS NOT NULL AND state = 'verified';

CREATE TABLE IF NOT EXISTS public.compliance_requirement_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  requested_action TEXT NOT NULL,
  capability TEXT NOT NULL,
  allowed BOOLEAN NOT NULL,
  required_checks TEXT[] NOT NULL DEFAULT '{}',
  missing_checks TEXT[] NOT NULL DEFAULT '{}',
  reason_codes TEXT[] NOT NULL DEFAULT '{}',
  applicable_rule_ids TEXT[] NOT NULL DEFAULT '{}',
  policy_versions TEXT[] NOT NULL DEFAULT '{}',
  legal_review_required BOOLEAN NOT NULL DEFAULT FALSE,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS compliance_decisions_user_action_idx
  ON public.compliance_requirement_decisions (user_id, requested_action, evaluated_at DESC);

CREATE TABLE IF NOT EXISTS public.compliance_provider_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  payload_hash TEXT NOT NULL CHECK (char_length(payload_hash) = 64),
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processing_started_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  UNIQUE (provider, provider_event_id)
);

CREATE OR REPLACE FUNCTION public.claim_compliance_provider_event(
  p_provider TEXT,
  p_event_id TEXT,
  p_payload_hash TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event public.compliance_provider_events%ROWTYPE;
BEGIN
  INSERT INTO public.compliance_provider_events (
    provider, provider_event_id, payload_hash, processing_started_at, attempt_count
  ) VALUES (
    p_provider, p_event_id, p_payload_hash, NOW(), 1
  )
  ON CONFLICT (provider, provider_event_id) DO NOTHING;
  IF FOUND THEN
    RETURN 'CLAIMED';
  END IF;

  SELECT * INTO v_event
    FROM public.compliance_provider_events
   WHERE provider = p_provider AND provider_event_id = p_event_id
   FOR UPDATE;
  IF v_event.payload_hash <> p_payload_hash THEN
    RETURN 'HASH_MISMATCH';
  END IF;
  IF v_event.processed_at IS NOT NULL THEN
    RETURN 'PROCESSED';
  END IF;
  IF v_event.processing_started_at IS NULL
     OR v_event.processing_started_at < NOW() - INTERVAL '5 minutes' THEN
    UPDATE public.compliance_provider_events
       SET processing_started_at = NOW(), attempt_count = attempt_count + 1
     WHERE id = v_event.id;
    RETURN 'CLAIMED';
  END IF;
  RETURN 'IN_PROGRESS';
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_compliance_provider_event(
  p_provider TEXT,
  p_event_id TEXT,
  p_payload_hash TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.compliance_provider_events
     SET processed_at = NOW()
   WHERE provider = p_provider
     AND provider_event_id = p_event_id
     AND payload_hash = p_payload_hash;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'provider event completion does not match its claim';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_compliance_provider_event(TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_compliance_provider_event(TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_compliance_provider_event(TEXT, TEXT, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_compliance_provider_event(TEXT, TEXT, TEXT)
  TO service_role;

CREATE TABLE IF NOT EXISTS public.compliance_manual_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  dimension TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN (
    'OPEN','ASSIGNED','WAITING_FOR_USER','UNDER_REVIEW','APPROVED','REJECTED',
    'ESCALATED','CLOSED'
  )),
  reason_code TEXT NOT NULL,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  decision_reason TEXT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS compliance_manual_review_queue_idx
  ON public.compliance_manual_reviews (state, opened_at)
  WHERE state IN ('OPEN','ASSIGNED','WAITING_FOR_USER','UNDER_REVIEW','ESCALATED');
CREATE INDEX IF NOT EXISTS compliance_manual_review_user_idx
  ON public.compliance_manual_reviews (user_id, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS compliance_manual_review_one_active_idx
  ON public.compliance_manual_reviews (user_id, dimension)
  WHERE state IN ('OPEN','ASSIGNED','WAITING_FOR_USER','UNDER_REVIEW','ESCALATED');

CREATE TABLE IF NOT EXISTS public.compliance_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL,
  dimension TEXT,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('USER','STAFF','PROVIDER','SYSTEM')),
  actor_id TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  policy_version TEXT,
  reason_code TEXT,
  previous_state TEXT,
  new_state TEXT,
  provider_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS compliance_audit_user_idx
  ON public.compliance_audit_events (user_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.compliance_retention_policies (
  data_class TEXT PRIMARY KEY,
  purpose TEXT NOT NULL,
  legal_basis TEXT NOT NULL,
  active_retention_days INTEGER NOT NULL CHECK (active_retention_days >= 0),
  archive_retention_days INTEGER NOT NULL CHECK (archive_retention_days >= 0),
  terminal_action TEXT NOT NULL CHECK (terminal_action IN ('DELETE','ANONYMIZE','RESTRICTED_ARCHIVE')),
  visibility TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  legal_review_required BOOLEAN NOT NULL DEFAULT TRUE,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  reviewed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.compliance_retention_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('RUNNING','COMPLETED','FAILED')),
  result JSONB NOT NULL DEFAULT '{}'::JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.compliance_tax_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE RESTRICT,
  residence_country TEXT NOT NULL CHECK (char_length(residence_country) = 2),
  tax_identifier_ciphertext TEXT,
  tax_identifier_last4 TEXT,
  vat_identifier_ciphertext TEXT,
  status TEXT NOT NULL CHECK (status IN ('not_required','required','pending','verified','needs_update','rejected')),
  provider_reference TEXT,
  verified_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (tax_identifier_ciphertext IS NULL OR tax_identifier_last4 IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.compliance_dac7_activity_aggregates (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  reporting_year INTEGER NOT NULL CHECK (reporting_year >= 2023),
  jurisdiction TEXT NOT NULL CHECK (char_length(jurisdiction) = 2),
  activity_type TEXT NOT NULL CHECK (activity_type IN ('SALE_OF_GOODS','PERSONAL_SERVICE','IMMOVABLE_PROPERTY_RENTAL','TRANSPORT_RENTAL')),
  transaction_count INTEGER NOT NULL DEFAULT 0 CHECK (transaction_count >= 0),
  consideration_minor BIGINT NOT NULL DEFAULT 0 CHECK (consideration_minor >= 0),
  currency TEXT NOT NULL CHECK (char_length(currency) = 3),
  platform_fees_minor BIGINT NOT NULL DEFAULT 0 CHECK (platform_fees_minor >= 0),
  applicability TEXT NOT NULL CHECK (applicability IN ('OUT_OF_SCOPE','POTENTIALLY_REPORTABLE','REPORTABLE','EXCLUDED','LEGAL_REVIEW_REQUIRED')),
  evaluated_rule_id TEXT REFERENCES public.compliance_rules(id) ON DELETE RESTRICT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, reporting_year, jurisdiction, activity_type)
);
CREATE INDEX IF NOT EXISTS compliance_dac7_reporting_idx
  ON public.compliance_dac7_activity_aggregates (reporting_year, jurisdiction, applicability);

-- Compatibility backfill: no account is forced through KYC at login. Existing
-- positive checks become provider-safe projections; false booleans remain absent
-- until an action actually requires the corresponding dimension.
INSERT INTO public.compliance_verification_records
  (user_id, dimension, state, method, visibility, verified_at)
SELECT id, candidate.dimension, 'verified', 'legacy_profile_migration', 'ACCOUNT_OWNER_ONLY', updated_at
FROM public.profiles
CROSS JOIN LATERAL unnest(ARRAY[
  CASE WHEN is_email_verified THEN 'email' END,
  CASE WHEN is_phone_verified THEN 'phone' END,
  CASE WHEN is_identity_verified THEN 'identity' END,
  CASE WHEN is_business_verified THEN 'business' END,
  CASE WHEN is_business_verified THEN 'business_representative' END,
  CASE WHEN account_family IN ('individual','professional') THEN 'professional_status' END
]) AS candidate(dimension)
WHERE candidate.dimension IS NOT NULL
ON CONFLICT (user_id, dimension) DO NOTHING;

INSERT INTO public.compliance_retention_policies
  (data_class, purpose, legal_basis, active_retention_days, archive_retention_days,
   terminal_action, visibility, policy_version, legal_review_required)
VALUES
  ('provider_verification_metadata','Evidence of verification result','LEGAL_REVIEW_REQUIRED',365,1825,'ANONYMIZE','COMPLIANCE_ONLY','retention-2026.1',TRUE),
  ('provider_event_deduplication','Webhook replay protection','LEGITIMATE_INTEREST_SECURITY',90,0,'DELETE','PROVIDER_ONLY','retention-2026.1',FALSE),
  ('compliance_decisions','Demonstrate policy applied to an action','LEGAL_REVIEW_REQUIRED',365,1825,'ANONYMIZE','COMPLIANCE_ONLY','retention-2026.1',TRUE),
  ('manual_review','Review and appeal trail','LEGAL_REVIEW_REQUIRED',730,1825,'RESTRICTED_ARCHIVE','COMPLIANCE_ONLY','retention-2026.1',TRUE),
  ('legacy_verification_requests','Migration quarantine for historical raw uploads','LEGAL_REVIEW_REQUIRED',0,0,'DELETE','COMPLIANCE_ONLY','retention-2026.1',TRUE)
ON CONFLICT (data_class) DO NOTHING;

-- Legacy verification_requests may contain document URLs and IBANs. Quarantine
-- them immediately from browser roles; a reviewed retention job must purge or
-- migrate them rather than copying them into the new domain.
REVOKE ALL ON public.verification_requests FROM anon, authenticated;

ALTER TABLE public.compliance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_rule_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_verification_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_requirement_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_provider_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_manual_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_retention_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_tax_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_dac7_activity_aggregates ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.compliance_rules FORCE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_rule_changes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_verification_records FORCE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_requirement_decisions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_provider_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_manual_reviews FORCE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_audit_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_retention_policies FORCE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_retention_runs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_tax_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_dac7_activity_aggregates FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.compliance_rules, public.compliance_rule_changes,
  public.compliance_verification_records, public.compliance_requirement_decisions,
  public.compliance_provider_events, public.compliance_manual_reviews,
  public.compliance_audit_events, public.compliance_retention_policies,
  public.compliance_retention_runs,
  public.compliance_tax_profiles, public.compliance_dac7_activity_aggregates
FROM anon, authenticated;

CREATE POLICY "Compliance staff read rules"
  ON public.compliance_rules FOR SELECT
  USING (public.has_capability('compliance.policy.read'));
CREATE POLICY "Governed compliance staff manage rules"
  ON public.compliance_rules FOR ALL
  USING (public.has_capability('compliance.policy.manage'))
  WITH CHECK (public.has_capability('compliance.policy.manage'));
CREATE POLICY "Rule change history is compliance-auditable"
  ON public.compliance_rule_changes FOR SELECT
  USING (public.has_capability('compliance.audit.read'));
CREATE POLICY "Compliance staff read verification records"
  ON public.compliance_verification_records FOR SELECT
  USING (public.has_capability('compliance.sensitive.read'));
CREATE POLICY "Compliance reviewers access manual reviews"
  ON public.compliance_manual_reviews FOR ALL
  USING (public.has_capability('compliance.review'))
  WITH CHECK (public.has_capability('compliance.review'));
CREATE POLICY "Compliance audit requires explicit access"
  ON public.compliance_audit_events FOR SELECT
  USING (public.has_capability('compliance.audit.read'));
CREATE POLICY "Retention policy requires governance access"
  ON public.compliance_retention_policies FOR ALL
  USING (public.has_capability('compliance.retention.manage'))
  WITH CHECK (public.has_capability('compliance.retention.manage'));
CREATE POLICY "Retention execution history requires governance access"
  ON public.compliance_retention_runs FOR SELECT
  USING (public.has_capability('compliance.retention.manage'));
CREATE POLICY "Tax profiles require sensitive access"
  ON public.compliance_tax_profiles FOR SELECT
  USING (public.has_capability('compliance.sensitive.read'));
CREATE POLICY "DAC7 aggregates require compliance access"
  ON public.compliance_dac7_activity_aggregates FOR SELECT
  USING (public.has_capability('compliance.sensitive.read'));

-- Requirement decisions and provider events intentionally have no browser-role
-- policies. They are backend/service-role data, not direct client resources.

CREATE OR REPLACE FUNCTION public.prevent_compliance_audit_mutation()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'compliance audit events are immutable';
END;
$$;
DROP TRIGGER IF EXISTS compliance_audit_immutable ON public.compliance_audit_events;
CREATE TRIGGER compliance_audit_immutable
BEFORE UPDATE OR DELETE ON public.compliance_audit_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_compliance_audit_mutation();
DROP TRIGGER IF EXISTS compliance_rule_changes_immutable
  ON public.compliance_rule_changes;
CREATE TRIGGER compliance_rule_changes_immutable
BEFORE UPDATE OR DELETE ON public.compliance_rule_changes
FOR EACH ROW EXECUTE FUNCTION public.prevent_compliance_audit_mutation();

-- One atomic mutation boundary owns both the rule and its immutable change
-- record. It is callable only by the backend service role; HTTP authorization
-- still requires compliance.policy.manage before reaching it.
CREATE OR REPLACE FUNCTION public.admin_upsert_compliance_rule(
  p_rule JSONB,
  p_reason TEXT,
  p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_previous JSONB;
  v_saved public.compliance_rules%ROWTYPE;
BEGIN
  IF char_length(trim(COALESCE(p_reason, ''))) < 10 THEN
    RAISE EXCEPTION 'compliance rule change reason must contain at least 10 characters';
  END IF;
  IF p_rule->>'governance' = 'LEGAL_MANDATE'
     AND p_rule->>'status' = 'ACTIVE'
     AND (
       NULLIF(p_rule->>'reviewedBy', '') IS NULL
       OR NULLIF(p_rule->>'reviewedAt', '') IS NULL
       OR jsonb_array_length(COALESCE(p_rule->'sourceReferences', '[]'::JSONB)) = 0
     ) THEN
    RAISE EXCEPTION 'active legal rules require source, reviewer and review date';
  END IF;

  SELECT to_jsonb(rule_row)
    INTO v_previous
    FROM public.compliance_rules AS rule_row
   WHERE rule_row.id = p_rule->>'id'
   FOR UPDATE;

  INSERT INTO public.compliance_rules (
    id, jurisdiction, regulation, rule_code, description, action, conditions,
    required_checks, recommended_checks, reason_codes, legal_basis,
    source_references, policy_version, governance, status, effective_from,
    effective_until, priority, reviewed_by, reviewed_at, created_by, updated_at
  ) VALUES (
    p_rule->>'id', p_rule->>'jurisdiction', p_rule->>'regulation',
    p_rule->>'ruleCode', p_rule->>'description', p_rule->>'action',
    COALESCE(p_rule->'conditions', '{}'::JSONB),
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_rule->'requiredChecks', '[]'::JSONB))),
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_rule->'recommendedChecks', '[]'::JSONB))),
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_rule->'reasonCodes', '[]'::JSONB))),
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_rule->'legalBasis', '[]'::JSONB))),
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_rule->'sourceReferences', '[]'::JSONB))),
    p_rule->>'policyVersion', p_rule->>'governance', p_rule->>'status',
    (p_rule->>'effectiveFrom')::TIMESTAMPTZ,
    NULLIF(p_rule->>'effectiveUntil', '')::TIMESTAMPTZ,
    (p_rule->>'priority')::INTEGER,
    NULLIF(p_rule->>'reviewedBy', '')::UUID,
    NULLIF(p_rule->>'reviewedAt', '')::TIMESTAMPTZ,
    p_actor_id,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    jurisdiction = EXCLUDED.jurisdiction,
    regulation = EXCLUDED.regulation,
    rule_code = EXCLUDED.rule_code,
    description = EXCLUDED.description,
    action = EXCLUDED.action,
    conditions = EXCLUDED.conditions,
    required_checks = EXCLUDED.required_checks,
    recommended_checks = EXCLUDED.recommended_checks,
    reason_codes = EXCLUDED.reason_codes,
    legal_basis = EXCLUDED.legal_basis,
    source_references = EXCLUDED.source_references,
    policy_version = EXCLUDED.policy_version,
    governance = EXCLUDED.governance,
    status = EXCLUDED.status,
    effective_from = EXCLUDED.effective_from,
    effective_until = EXCLUDED.effective_until,
    priority = EXCLUDED.priority,
    reviewed_by = EXCLUDED.reviewed_by,
    reviewed_at = EXCLUDED.reviewed_at,
    updated_at = NOW()
  RETURNING * INTO v_saved;

  INSERT INTO public.compliance_rule_changes (
    rule_id, actor_id, reason, previous_value, new_value
  ) VALUES (
    v_saved.id, p_actor_id, trim(p_reason), v_previous, to_jsonb(v_saved)
  );

  RETURN to_jsonb(v_saved);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_upsert_compliance_rule(JSONB, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_compliance_rule(JSONB, TEXT, UUID)
  TO service_role;

-- Executes only terminal actions whose periods have already been approved.
-- Legal-review policies are reported as skipped and can never be purged by
-- this routine until governance explicitly clears the flag.
CREATE OR REPLACE FUNCTION public.run_approved_compliance_retention(
  p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id UUID;
  v_provider_event_days INTEGER;
  v_provider_events_deleted INTEGER := 0;
  v_skipped TEXT[];
  v_result JSONB;
BEGIN
  INSERT INTO public.compliance_retention_runs (actor_id, status)
  VALUES (p_actor_id, 'RUNNING')
  RETURNING id INTO v_run_id;

  SELECT active_retention_days
    INTO v_provider_event_days
    FROM public.compliance_retention_policies
   WHERE data_class = 'provider_event_deduplication'
     AND terminal_action = 'DELETE'
     AND legal_review_required = FALSE;

  IF v_provider_event_days IS NOT NULL THEN
    DELETE FROM public.compliance_provider_events
     WHERE processed_at IS NOT NULL
       AND processed_at < NOW() - make_interval(days => v_provider_event_days);
    GET DIAGNOSTICS v_provider_events_deleted = ROW_COUNT;
  END IF;

  SELECT COALESCE(array_agg(data_class ORDER BY data_class), '{}'::TEXT[])
    INTO v_skipped
    FROM public.compliance_retention_policies
   WHERE legal_review_required = TRUE;

  v_result := jsonb_build_object(
    'providerEventsDeleted', v_provider_events_deleted,
    'skippedLegalReview', to_jsonb(v_skipped)
  );

  UPDATE public.compliance_retention_runs
     SET status = 'COMPLETED', result = v_result, completed_at = NOW()
   WHERE id = v_run_id;
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  IF v_run_id IS NOT NULL THEN
    UPDATE public.compliance_retention_runs
       SET status = 'FAILED',
           result = jsonb_build_object('errorCode', SQLSTATE),
           completed_at = NOW()
     WHERE id = v_run_id;
  END IF;
  RAISE;
END;
$$;
REVOKE ALL ON FUNCTION public.run_approved_compliance_retention(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_approved_compliance_retention(UUID)
  TO service_role;

COMMENT ON TABLE public.compliance_tax_profiles IS
  'Field-level encrypted tax identifiers only; decryption is restricted to a dedicated backend key boundary.';
COMMENT ON TABLE public.compliance_provider_events IS
  'Stores only event identity and payload hash for replay protection, never provider payloads.';
COMMENT ON TABLE public.verification_requests IS
  'Legacy quarantine. New writes use compliance_verification_records and provider-hosted evidence.';
