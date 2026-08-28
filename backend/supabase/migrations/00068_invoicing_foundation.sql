-- =============================================================================
-- Shongre Invoice Phase 1 foundation
--
-- Scope:
--   MULTI_MARKET_SHARED: organizations, legal entities, parties
--   MARKET_SCOPED: invoices, number series, documents, outbox, audit
--
-- This is an additive foundation. Existing monetization invoice writers remain
-- active until a separately verified compatibility cutover.
-- =============================================================================

-- France-specific identifiers are no longer globally mandatory on the tenant.
-- Existing values and uniqueness remain intact; typed identifiers live below.
ALTER TABLE public.organizations
  ALTER COLUMN siren DROP NOT NULL,
  ALTER COLUMN siret DROP NOT NULL;

CREATE TABLE public.invoicing_legal_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  legal_name TEXT NOT NULL CHECK (char_length(legal_name) BETWEEN 1 AND 240),
  trading_name TEXT,
  legal_form TEXT,
  country_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  default_market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  default_currency VARCHAR(3) NOT NULL CHECK (default_currency ~ '^[A-Z]{3}$'),
  default_locale TEXT NOT NULL CHECK (char_length(default_locale) BETWEEN 2 AND 32),
  timezone TEXT NOT NULL CHECK (char_length(timezone) BETWEEN 3 AND 80),
  address_line_1 TEXT NOT NULL,
  address_line_2 TEXT,
  postal_code TEXT NOT NULL,
  city TEXT NOT NULL,
  address_country_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified','pending','verified','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, id)
);

CREATE INDEX invoicing_legal_entities_organization_idx
  ON public.invoicing_legal_entities (organization_id, created_at DESC);
CREATE INDEX invoicing_legal_entities_market_idx
  ON public.invoicing_legal_entities (default_market_code, country_code);

CREATE TABLE public.invoicing_legal_identifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_entity_id UUID NOT NULL REFERENCES public.invoicing_legal_entities(id) ON DELETE RESTRICT,
  identifier_type TEXT NOT NULL CHECK (char_length(identifier_type) BETWEEN 1 AND 80),
  country_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  identifier_value TEXT NOT NULL CHECK (char_length(identifier_value) BETWEEN 1 AND 180),
  issuing_authority TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified','pending','verified','rejected','expired')),
  verified_at TIMESTAMPTZ,
  verification_source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (legal_entity_id, identifier_type, country_code, identifier_value)
);

CREATE INDEX invoicing_legal_identifiers_entity_idx
  ON public.invoicing_legal_identifiers (legal_entity_id);

CREATE TABLE public.invoicing_parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  party_kind TEXT NOT NULL
    CHECK (party_kind IN ('company','association','sole_proprietor','public_body','individual','foreign_entity')),
  roles TEXT[] NOT NULL CHECK (cardinality(roles) > 0 AND roles <@ ARRAY['customer','supplier']::TEXT[]),
  legal_name TEXT NOT NULL CHECK (char_length(legal_name) BETWEEN 1 AND 240),
  trading_name TEXT,
  billing_address_line_1 TEXT NOT NULL,
  billing_address_line_2 TEXT,
  billing_postal_code TEXT NOT NULL,
  billing_city TEXT NOT NULL,
  billing_country_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  email TEXT,
  phone TEXT,
  locale TEXT NOT NULL CHECK (char_length(locale) BETWEEN 2 AND 32),
  preferred_currency VARCHAR(3) NOT NULL CHECK (preferred_currency ~ '^[A-Z]{3}$'),
  payment_terms_days INTEGER NOT NULL DEFAULT 30 CHECK (payment_terms_days BETWEEN 0 AND 365),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, id)
);

CREATE INDEX invoicing_parties_organization_name_idx
  ON public.invoicing_parties (organization_id, legal_name, id);
CREATE INDEX invoicing_parties_customer_idx
  ON public.invoicing_parties (organization_id, updated_at DESC)
  WHERE roles @> ARRAY['customer']::TEXT[];
CREATE INDEX invoicing_parties_supplier_idx
  ON public.invoicing_parties (organization_id, updated_at DESC)
  WHERE roles @> ARRAY['supplier']::TEXT[];

CREATE TABLE public.invoicing_party_identifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES public.invoicing_parties(id) ON DELETE RESTRICT,
  identifier_type TEXT NOT NULL CHECK (char_length(identifier_type) BETWEEN 1 AND 80),
  country_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  identifier_value TEXT NOT NULL CHECK (char_length(identifier_value) BETWEEN 1 AND 180),
  issuing_authority TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified','pending','verified','rejected','expired')),
  verified_at TIMESTAMPTZ,
  verification_source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (party_id, identifier_type, country_code, identifier_value)
);

CREATE INDEX invoicing_party_identifiers_party_idx
  ON public.invoicing_party_identifiers (party_id);

CREATE TABLE public.invoicing_number_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  legal_entity_id UUID NOT NULL REFERENCES public.invoicing_legal_entities(id) ON DELETE RESTRICT,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  environment_id TEXT NOT NULL CHECK (char_length(environment_id) BETWEEN 2 AND 80),
  document_type TEXT NOT NULL
    CHECK (document_type IN ('standard_invoice','deposit_invoice','final_invoice','recurring_invoice','credit_note','supplier_invoice')),
  fiscal_year INTEGER NOT NULL CHECK (fiscal_year BETWEEN 2000 AND 9999),
  prefix TEXT NOT NULL CHECK (char_length(prefix) BETWEEN 1 AND 40),
  next_value BIGINT NOT NULL DEFAULT 1 CHECK (next_value > 0),
  review_status TEXT NOT NULL DEFAULT 'unreviewed'
    CHECK (review_status IN ('unreviewed','approved','retired')),
  approved_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, legal_entity_id, market_code, environment_id, document_type, fiscal_year)
);

CREATE INDEX invoicing_number_series_entity_idx
  ON public.invoicing_number_series (legal_entity_id, market_code, environment_id);

CREATE TABLE public.invoicing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  legal_entity_id UUID NOT NULL REFERENCES public.invoicing_legal_entities(id) ON DELETE RESTRICT,
  customer_party_id UUID NOT NULL REFERENCES public.invoicing_parties(id) ON DELETE RESTRICT,
  related_invoice_id UUID REFERENCES public.invoicing_invoices(id) ON DELETE RESTRICT,
  document_type TEXT NOT NULL
    CHECK (document_type IN ('standard_invoice','deposit_invoice','final_invoice','recurring_invoice','credit_note','supplier_invoice')),
  document_origin TEXT NOT NULL
    CHECK (document_origin IN ('MANUAL','SHONGRE_SUBSCRIPTION','MARKETPLACE_COMMISSION','API','RECURRING','IMPORT','EXTERNAL_INTEGRATION')),
  legal_number TEXT,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  country_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  locale TEXT NOT NULL CHECK (char_length(locale) BETWEEN 2 AND 32),
  timezone TEXT NOT NULL CHECK (char_length(timezone) BETWEEN 3 AND 80),
  environment_id TEXT NOT NULL CHECK (char_length(environment_id) BETWEEN 2 AND 80),
  currency VARCHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL CHECK (due_date >= issue_date),
  service_period_start DATE,
  service_period_end DATE,
  purchase_order_reference TEXT,
  customer_reference TEXT,
  notes TEXT,
  commercial_state TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (commercial_state IN ('DRAFT','VALIDATION_REQUIRED','READY_TO_FINALIZE','FINALIZED','FINALIZATION_FAILED','CREDITED')),
  electronic_state TEXT NOT NULL DEFAULT 'NOT_REQUESTED'
    CHECK (electronic_state IN ('NOT_APPLICABLE','NOT_REQUESTED','CONFIGURATION_REQUIRED','VALIDATION_PENDING','VALIDATION_FAILED','READY_TO_SUBMIT','SUBMISSION_PENDING','SUBMITTED_UNCONFIRMED','ACCEPTED','REJECTED','REFUSED','MANUAL_RECONCILIATION')),
  payment_state TEXT NOT NULL DEFAULT 'UNPAID'
    CHECK (payment_state IN ('UNPAID','PARTIALLY_PAID','PAID','OVERPAID','PARTIALLY_REFUNDED','REFUNDED')),
  accounting_export_state TEXT NOT NULL DEFAULT 'NOT_EXPORTED'
    CHECK (accounting_export_state IN ('NOT_EXPORTED','EXPORT_PENDING','EXPORTED')),
  customer_review_state TEXT NOT NULL DEFAULT 'NOT_REQUESTED'
    CHECK (customer_review_state IN ('NOT_REQUESTED','PENDING','ACCEPTED','DISPUTED')),
  subtotal_minor BIGINT NOT NULL DEFAULT 0,
  tax_total_minor BIGINT NOT NULL DEFAULT 0,
  total_minor BIGINT NOT NULL DEFAULT 0,
  outstanding_minor BIGINT NOT NULL DEFAULT 0,
  issuer_snapshot JSONB,
  recipient_snapshot JSONB,
  canonical_snapshot JSONB,
  snapshot_digest TEXT CHECK (snapshot_digest IS NULL OR snapshot_digest ~ '^[a-f0-9]{64}$'),
  version BIGINT NOT NULL DEFAULT 1 CHECK (version > 0),
  draft_idempotency_key TEXT NOT NULL CHECK (char_length(draft_idempotency_key) BETWEEN 8 AND 255),
  finalization_idempotency_key TEXT,
  finalized_at TIMESTAMPTZ,
  finalized_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((service_period_start IS NULL AND service_period_end IS NULL) OR
         (service_period_start IS NOT NULL AND service_period_end IS NOT NULL AND service_period_end >= service_period_start)),
  CHECK (document_type <> 'credit_note' OR related_invoice_id IS NOT NULL),
  CHECK (total_minor = subtotal_minor + tax_total_minor),
  UNIQUE (organization_id, market_code, environment_id, draft_idempotency_key),
  UNIQUE (legal_entity_id, market_code, environment_id, legal_number)
);

CREATE INDEX invoicing_invoices_tenant_state_date_idx
  ON public.invoicing_invoices (organization_id, market_code, commercial_state, issue_date DESC, id DESC);
CREATE INDEX invoicing_invoices_entity_number_idx
  ON public.invoicing_invoices (legal_entity_id, market_code, environment_id, legal_number)
  WHERE legal_number IS NOT NULL;
CREATE INDEX invoicing_invoices_customer_idx
  ON public.invoicing_invoices (organization_id, customer_party_id, issue_date DESC);
CREATE INDEX invoicing_invoices_due_idx
  ON public.invoicing_invoices (organization_id, market_code, due_date, id)
  WHERE commercial_state = 'FINALIZED' AND payment_state IN ('UNPAID','PARTIALLY_PAID');
CREATE INDEX invoicing_invoices_related_idx
  ON public.invoicing_invoices (related_invoice_id)
  WHERE related_invoice_id IS NOT NULL;

CREATE TABLE public.invoicing_invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoicing_invoices(id) ON DELETE RESTRICT,
  position INTEGER NOT NULL CHECK (position > 0),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 1000),
  quantity_decimal NUMERIC(24,6) NOT NULL CHECK (quantity_decimal > 0),
  unit TEXT NOT NULL CHECK (char_length(unit) BETWEEN 1 AND 40),
  unit_price_minor_decimal NUMERIC(24,6) NOT NULL CHECK (unit_price_minor_decimal >= 0),
  tax_rate_bps INTEGER NOT NULL CHECK (tax_rate_bps BETWEEN 0 AND 100000),
  tax_category TEXT NOT NULL
    CHECK (tax_category IN ('STANDARD','REDUCED','ZERO','EXEMPT','REVERSE_CHARGE','OUT_OF_SCOPE')),
  exemption_reason_code TEXT,
  exemption_reason TEXT,
  net_amount_minor BIGINT NOT NULL,
  tax_amount_minor BIGINT NOT NULL,
  gross_amount_minor BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (gross_amount_minor = net_amount_minor + tax_amount_minor),
  CHECK (tax_category NOT IN ('EXEMPT','REVERSE_CHARGE') OR exemption_reason IS NOT NULL),
  UNIQUE (invoice_id, position)
);

CREATE INDEX invoicing_invoice_lines_invoice_idx
  ON public.invoicing_invoice_lines (invoice_id, position);

CREATE TABLE public.invoicing_tax_breakdowns (
  invoice_id UUID NOT NULL REFERENCES public.invoicing_invoices(id) ON DELETE RESTRICT,
  tax_rate_bps INTEGER NOT NULL CHECK (tax_rate_bps BETWEEN 0 AND 100000),
  tax_category TEXT NOT NULL
    CHECK (tax_category IN ('STANDARD','REDUCED','ZERO','EXEMPT','REVERSE_CHARGE','OUT_OF_SCOPE')),
  taxable_amount_minor BIGINT NOT NULL,
  tax_amount_minor BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (invoice_id, tax_rate_bps, tax_category)
);

CREATE INDEX invoicing_tax_breakdowns_invoice_idx
  ON public.invoicing_tax_breakdowns (invoice_id);

CREATE TABLE public.invoicing_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  legal_entity_id UUID NOT NULL REFERENCES public.invoicing_legal_entities(id) ON DELETE RESTRICT,
  invoice_id UUID NOT NULL REFERENCES public.invoicing_invoices(id) ON DELETE RESTRICT,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  environment_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  media_type TEXT NOT NULL,
  document_format TEXT NOT NULL CHECK (document_format IN ('TEXT_V1','PDF','FACTUR_X','UBL','CII')),
  legal_original BOOLEAN NOT NULL DEFAULT FALSE,
  content_text TEXT,
  storage_reference TEXT,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  digest_algorithm TEXT NOT NULL DEFAULT 'SHA-256' CHECK (digest_algorithm = 'SHA-256'),
  digest TEXT NOT NULL CHECK (digest ~ '^[a-f0-9]{64}$'),
  generator_version TEXT NOT NULL,
  template_version TEXT NOT NULL,
  compliance_ruleset_version TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  CHECK ((content_text IS NULL) <> (storage_reference IS NULL)),
  UNIQUE (invoice_id, document_format, digest)
);

CREATE INDEX invoicing_documents_invoice_idx
  ON public.invoicing_documents (invoice_id, generated_at DESC);
CREATE INDEX invoicing_documents_tenant_idx
  ON public.invoicing_documents (organization_id, market_code, environment_id);

CREATE TABLE public.invoicing_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  legal_entity_id UUID NOT NULL REFERENCES public.invoicing_legal_entities(id) ON DELETE RESTRICT,
  invoice_id UUID REFERENCES public.invoicing_invoices(id) ON DELETE RESTRICT,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  country_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  environment_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1 CHECK (schema_version > 0),
  idempotency_key TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','completed','failed','dead_letter')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  claimed_at TIMESTAMPTZ,
  claimed_by TEXT,
  completed_at TIMESTAMPTZ,
  last_error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, market_code, environment_id, event_type, idempotency_key)
);

CREATE INDEX invoicing_outbox_claim_idx
  ON public.invoicing_outbox (available_at, created_at, id)
  WHERE status IN ('pending','failed');
CREATE INDEX invoicing_outbox_tenant_idx
  ON public.invoicing_outbox (organization_id, market_code, environment_id, created_at DESC);

CREATE TABLE public.invoicing_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  legal_entity_id UUID REFERENCES public.invoicing_legal_entities(id) ON DELETE RESTRICT,
  invoice_id UUID REFERENCES public.invoicing_invoices(id) ON DELETE RESTRICT,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  country_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  environment_id TEXT NOT NULL,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  request_id TEXT,
  correlation_id TEXT NOT NULL,
  reason_code TEXT,
  safe_metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX invoicing_audit_tenant_time_idx
  ON public.invoicing_audit_events (organization_id, market_code, environment_id, occurred_at DESC);
CREATE INDEX invoicing_audit_resource_idx
  ON public.invoicing_audit_events (resource_type, resource_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION public.is_invoicing_tenant_member(p_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members member
    JOIN public.profiles profile ON profile.id = member.user_id
    WHERE member.organization_id = p_organization_id
      AND member.status = 'active'
      AND profile.auth_user_id = (SELECT public.auth_uid())
  ) OR (SELECT public.is_admin());
$$;

CREATE OR REPLACE FUNCTION public.prevent_invoicing_immutable_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'immutable_invoicing_record' USING ERRCODE = '55000';
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_finalized_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.commercial_state IN ('FINALIZED','CREDITED') THEN
    RAISE EXCEPTION 'finalized_invoice_is_immutable' USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.commercial_state IN ('FINALIZED','CREDITED') AND (
    NEW.organization_id IS DISTINCT FROM OLD.organization_id OR
    NEW.legal_entity_id IS DISTINCT FROM OLD.legal_entity_id OR
    NEW.customer_party_id IS DISTINCT FROM OLD.customer_party_id OR
    NEW.related_invoice_id IS DISTINCT FROM OLD.related_invoice_id OR
    NEW.document_type IS DISTINCT FROM OLD.document_type OR
    NEW.document_origin IS DISTINCT FROM OLD.document_origin OR
    NEW.legal_number IS DISTINCT FROM OLD.legal_number OR
    NEW.market_code IS DISTINCT FROM OLD.market_code OR
    NEW.country_code IS DISTINCT FROM OLD.country_code OR
    NEW.locale IS DISTINCT FROM OLD.locale OR
    NEW.timezone IS DISTINCT FROM OLD.timezone OR
    NEW.environment_id IS DISTINCT FROM OLD.environment_id OR
    NEW.currency IS DISTINCT FROM OLD.currency OR
    NEW.issue_date IS DISTINCT FROM OLD.issue_date OR
    NEW.due_date IS DISTINCT FROM OLD.due_date OR
    NEW.service_period_start IS DISTINCT FROM OLD.service_period_start OR
    NEW.service_period_end IS DISTINCT FROM OLD.service_period_end OR
    NEW.purchase_order_reference IS DISTINCT FROM OLD.purchase_order_reference OR
    NEW.customer_reference IS DISTINCT FROM OLD.customer_reference OR
    NEW.notes IS DISTINCT FROM OLD.notes OR
    NEW.subtotal_minor IS DISTINCT FROM OLD.subtotal_minor OR
    NEW.tax_total_minor IS DISTINCT FROM OLD.tax_total_minor OR
    NEW.total_minor IS DISTINCT FROM OLD.total_minor OR
    NEW.issuer_snapshot IS DISTINCT FROM OLD.issuer_snapshot OR
    NEW.recipient_snapshot IS DISTINCT FROM OLD.recipient_snapshot OR
    NEW.canonical_snapshot IS DISTINCT FROM OLD.canonical_snapshot OR
    NEW.snapshot_digest IS DISTINCT FROM OLD.snapshot_digest OR
    NEW.finalized_at IS DISTINCT FROM OLD.finalized_at OR
    NEW.finalized_by IS DISTINCT FROM OLD.finalized_by
  ) THEN
    RAISE EXCEPTION 'finalized_invoice_legal_fields_are_immutable' USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_finalized_invoice
BEFORE UPDATE OR DELETE ON public.invoicing_invoices
FOR EACH ROW EXECUTE FUNCTION public.protect_finalized_invoice();

CREATE OR REPLACE FUNCTION public.protect_finalized_invoice_child()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  target_invoice_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_invoice_id := OLD.invoice_id;
  ELSE
    target_invoice_id := NEW.invoice_id;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.invoicing_invoices invoice
    WHERE invoice.id = target_invoice_id AND invoice.commercial_state IN ('FINALIZED','CREDITED')
  ) THEN
    RAISE EXCEPTION 'finalized_invoice_children_are_immutable' USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_finalized_invoice_lines
BEFORE INSERT OR UPDATE OR DELETE ON public.invoicing_invoice_lines
FOR EACH ROW EXECUTE FUNCTION public.protect_finalized_invoice_child();
CREATE TRIGGER protect_finalized_tax_breakdowns
BEFORE INSERT OR UPDATE OR DELETE ON public.invoicing_tax_breakdowns
FOR EACH ROW EXECUTE FUNCTION public.protect_finalized_invoice_child();

CREATE TRIGGER invoicing_documents_immutable
BEFORE UPDATE OR DELETE ON public.invoicing_documents
FOR EACH ROW EXECUTE FUNCTION public.prevent_invoicing_immutable_change();
CREATE TRIGGER invoicing_audit_immutable
BEFORE UPDATE OR DELETE ON public.invoicing_audit_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_invoicing_immutable_change();

CREATE OR REPLACE FUNCTION public.finalize_invoicing_invoice(
  p_invoice_id UUID,
  p_actor_id UUID,
  p_expected_version BIGINT,
  p_idempotency_key TEXT,
  p_request_id TEXT DEFAULT NULL
)
RETURNS public.invoicing_invoices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target public.invoicing_invoices%ROWTYPE;
  original public.invoicing_invoices%ROWTYPE;
  issuer public.invoicing_legal_entities%ROWTYPE;
  recipient public.invoicing_parties%ROWTYPE;
  series public.invoicing_number_series%ROWTYPE;
  line_count INTEGER;
  lines_subtotal BIGINT;
  lines_tax BIGINT;
  lines_total BIGINT;
  already_credited_total BIGINT := 0;
  fiscal_year INTEGER;
  assigned_number TEXT;
  v_invoice_snapshot JSONB;
  v_issuer_snapshot JSONB;
  v_recipient_snapshot JSONB;
  v_snapshot_digest TEXT;
  v_human_text TEXT;
  v_human_digest TEXT;
  correlation_id TEXT := gen_random_uuid()::TEXT;
BEGIN
  IF char_length(p_idempotency_key) < 8 THEN
    RAISE EXCEPTION 'invalid_idempotency_key' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO target
  FROM public.invoicing_invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invoice_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF target.commercial_state IN ('FINALIZED','CREDITED') THEN
    IF target.finalization_idempotency_key = p_idempotency_key THEN
      RETURN target;
    END IF;
    RAISE EXCEPTION 'invoice_already_finalized' USING ERRCODE = '23505';
  END IF;

  IF target.version <> p_expected_version THEN
    RAISE EXCEPTION 'invoice_version_conflict' USING ERRCODE = '40001';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_members member
    WHERE member.organization_id = target.organization_id
      AND member.user_id = p_actor_id
      AND member.status = 'active'
      AND (member.role IN ('owner','admin','manager') OR member.permissions @> ARRAY['invoice.finalize']::TEXT[])
  ) THEN
    RAISE EXCEPTION 'invoice_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO issuer
  FROM public.invoicing_legal_entities
  WHERE id = target.legal_entity_id AND organization_id = target.organization_id;
  SELECT * INTO recipient
  FROM public.invoicing_parties
  WHERE id = target.customer_party_id AND organization_id = target.organization_id;
  IF issuer.id IS NULL OR recipient.id IS NULL THEN
    RAISE EXCEPTION 'invoice_scope_mismatch' USING ERRCODE = 'P0002';
  END IF;
  IF target.currency <> issuer.default_currency OR target.market_code <> issuer.default_market_code THEN
    RAISE EXCEPTION 'invoice_market_or_currency_mismatch' USING ERRCODE = '22023';
  END IF;

  SELECT COUNT(*), COALESCE(SUM(net_amount_minor), 0),
         COALESCE(SUM(tax_amount_minor), 0), COALESCE(SUM(gross_amount_minor), 0)
    INTO line_count, lines_subtotal, lines_tax, lines_total
  FROM public.invoicing_invoice_lines
  WHERE invoice_id = target.id;
  IF line_count = 0 OR lines_total <> lines_subtotal + lines_tax THEN
    RAISE EXCEPTION 'invoice_totals_invalid' USING ERRCODE = '22023';
  END IF;

  IF target.document_type = 'credit_note' THEN
    SELECT * INTO original
    FROM public.invoicing_invoices
    WHERE id = target.related_invoice_id
    FOR UPDATE;
    IF NOT FOUND OR original.commercial_state NOT IN ('FINALIZED','CREDITED') OR
       original.document_type = 'credit_note' OR
       original.organization_id <> target.organization_id OR
       original.legal_entity_id <> target.legal_entity_id OR
       original.customer_party_id <> target.customer_party_id OR
       original.market_code <> target.market_code OR
       original.environment_id <> target.environment_id OR
       original.currency <> target.currency THEN
      RAISE EXCEPTION 'credit_note_original_scope_mismatch' USING ERRCODE = 'P0002';
    END IF;
    SELECT COALESCE(SUM(total_minor), 0) INTO already_credited_total
    FROM public.invoicing_invoices
    WHERE related_invoice_id = original.id
      AND document_type = 'credit_note'
      AND commercial_state = 'FINALIZED';
    IF already_credited_total + lines_total > original.total_minor THEN
      RAISE EXCEPTION 'credit_note_exceeds_original' USING ERRCODE = '23514';
    END IF;
  END IF;

  fiscal_year := EXTRACT(YEAR FROM target.issue_date)::INTEGER;
  SELECT * INTO series
  FROM public.invoicing_number_series candidate
  WHERE candidate.organization_id = target.organization_id
    AND candidate.legal_entity_id = target.legal_entity_id
    AND candidate.market_code = target.market_code
    AND candidate.environment_id = target.environment_id
    AND candidate.document_type = target.document_type
    AND candidate.fiscal_year = fiscal_year
  FOR UPDATE;
  IF NOT FOUND OR series.review_status = 'retired' THEN
    RAISE EXCEPTION 'number_series_not_configured' USING ERRCODE = '55000';
  END IF;
  IF target.environment_id = 'production' AND series.review_status <> 'approved' THEN
    RAISE EXCEPTION 'production_number_series_not_approved' USING ERRCODE = '55000';
  END IF;

  assigned_number := series.prefix || '-' || fiscal_year::TEXT || '-' || LPAD(series.next_value::TEXT, 8, '0');
  UPDATE public.invoicing_number_series
  SET next_value = next_value + 1, updated_at = NOW()
  WHERE id = series.id;

  v_issuer_snapshot := jsonb_build_object(
    'id', issuer.id, 'legalName', issuer.legal_name, 'tradingName', issuer.trading_name,
    'legalForm', issuer.legal_form, 'countryCode', issuer.country_code,
    'address', jsonb_build_object('line1', issuer.address_line_1, 'line2', issuer.address_line_2,
      'postalCode', issuer.postal_code, 'city', issuer.city, 'countryCode', issuer.address_country_code),
    'identifiers', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'type', identifier_type, 'countryCode', country_code, 'value', identifier_value,
      'issuingAuthority', issuing_authority, 'verificationStatus', verification_status
    ) ORDER BY identifier_type, country_code, identifier_value)
      FROM public.invoicing_legal_identifiers WHERE legal_entity_id = issuer.id), '[]'::JSONB)
  );
  v_recipient_snapshot := jsonb_build_object(
    'id', recipient.id, 'kind', recipient.party_kind, 'legalName', recipient.legal_name,
    'tradingName', recipient.trading_name, 'email', recipient.email, 'phone', recipient.phone,
    'address', jsonb_build_object('line1', recipient.billing_address_line_1,
      'line2', recipient.billing_address_line_2, 'postalCode', recipient.billing_postal_code,
      'city', recipient.billing_city, 'countryCode', recipient.billing_country_code),
    'identifiers', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'type', identifier_type, 'countryCode', country_code, 'value', identifier_value,
      'issuingAuthority', issuing_authority, 'verificationStatus', verification_status
    ) ORDER BY identifier_type, country_code, identifier_value)
      FROM public.invoicing_party_identifiers WHERE party_id = recipient.id), '[]'::JSONB)
  );
  v_invoice_snapshot := jsonb_build_object(
    'schemaVersion', 1, 'id', target.id, 'number', assigned_number,
    'documentType', target.document_type, 'origin', target.document_origin,
    'tenantId', target.organization_id, 'legalEntityId', target.legal_entity_id,
    'marketCode', target.market_code, 'countryCode', target.country_code,
    'locale', target.locale, 'timezone', target.timezone,
    'environmentId', target.environment_id, 'currency', target.currency,
    'issueDate', target.issue_date, 'dueDate', target.due_date,
    'servicePeriodStart', target.service_period_start, 'servicePeriodEnd', target.service_period_end,
    'purchaseOrderReference', target.purchase_order_reference,
    'customerReference', target.customer_reference, 'notes', target.notes,
    'issuer', v_issuer_snapshot, 'recipient', v_recipient_snapshot,
    'lines', (SELECT jsonb_agg(jsonb_build_object(
      'id', id, 'position', position, 'description', description,
      'quantity', quantity_decimal::TEXT, 'unit', unit,
      'unitPriceMinorDecimal', unit_price_minor_decimal::TEXT,
      'taxRateBps', tax_rate_bps, 'taxCategory', tax_category,
      'exemptionReasonCode', exemption_reason_code, 'exemptionReason', exemption_reason,
      'netAmountMinor', net_amount_minor, 'taxAmountMinor', tax_amount_minor,
      'grossAmountMinor', gross_amount_minor
    ) ORDER BY position) FROM public.invoicing_invoice_lines WHERE invoice_id = target.id),
    'taxBreakdowns', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'taxRateBps', tax_rate_bps, 'taxCategory', tax_category,
      'taxableAmountMinor', taxable_amount_minor, 'taxAmountMinor', tax_amount_minor
    ) ORDER BY tax_category, tax_rate_bps), '[]'::JSONB)
      FROM public.invoicing_tax_breakdowns WHERE invoice_id = target.id),
    'subtotalMinor', lines_subtotal, 'taxTotalMinor', lines_tax, 'totalMinor', lines_total
  );
  v_snapshot_digest := encode(public.digest(v_invoice_snapshot::TEXT, 'sha256'), 'hex');

  UPDATE public.invoicing_invoices
  SET legal_number = assigned_number,
      commercial_state = 'FINALIZED',
      electronic_state = 'CONFIGURATION_REQUIRED',
      subtotal_minor = lines_subtotal,
      tax_total_minor = lines_tax,
      total_minor = lines_total,
      outstanding_minor = lines_total,
      issuer_snapshot = v_issuer_snapshot,
      recipient_snapshot = v_recipient_snapshot,
      canonical_snapshot = v_invoice_snapshot,
      snapshot_digest = v_snapshot_digest,
      finalization_idempotency_key = p_idempotency_key,
      finalized_at = NOW(),
      finalized_by = p_actor_id,
      version = version + 1,
      updated_at = NOW()
  WHERE id = target.id
  RETURNING * INTO target;

  v_human_text := 'SHONGRE INVOICE CORE FOUNDATION' || E'\n' ||
    'Number: ' || assigned_number || E'\n' ||
    'Issuer: ' || issuer.legal_name || E'\n' ||
    'Recipient: ' || recipient.legal_name || E'\n' ||
    'Issue date: ' || target.issue_date::TEXT || E'\n' ||
    'Due date: ' || target.due_date::TEXT || E'\n' ||
    'Currency: ' || target.currency || E'\n' ||
    'Subtotal (minor): ' || lines_subtotal::TEXT || E'\n' ||
    'Tax (minor): ' || lines_tax::TEXT || E'\n' ||
    'Total (minor): ' || lines_total::TEXT || E'\n' ||
    'Snapshot SHA-256: ' || v_snapshot_digest || E'\n' ||
    'Electronic transport: CONFIGURATION_REQUIRED' || E'\n';
  v_human_digest := encode(public.digest(v_human_text, 'sha256'), 'hex');

  INSERT INTO public.invoicing_documents (
    organization_id, legal_entity_id, invoice_id, market_code, environment_id,
    file_name, media_type, document_format, legal_original, content_text,
    size_bytes, digest, generator_version, template_version,
    compliance_ruleset_version, created_by
  ) VALUES (
    target.organization_id, target.legal_entity_id, target.id, target.market_code,
    target.environment_id, assigned_number || '.txt', 'text/plain;charset=utf-8',
    'TEXT_V1', FALSE, v_human_text, octet_length(v_human_text), v_human_digest,
    'invoicing-core-1', 'human-readable-text-1', 'GENERIC-UNREVIEWED-1', p_actor_id
  );

  INSERT INTO public.invoicing_outbox (
    organization_id, legal_entity_id, invoice_id, market_code, country_code,
    environment_id, event_type, idempotency_key, correlation_id, payload
  ) VALUES (
    target.organization_id, target.legal_entity_id, target.id, target.market_code,
    target.country_code, target.environment_id,
    CASE WHEN target.document_type = 'credit_note' THEN 'CreditNoteFinalized' ELSE 'InvoiceFinalized' END,
    p_idempotency_key, correlation_id, jsonb_build_object(
      'invoiceId', target.id, 'number', assigned_number, 'snapshotDigest', v_snapshot_digest,
      'marketCode', target.market_code, 'countryCode', target.country_code,
      'currency', target.currency, 'environmentId', target.environment_id
    )
  );

  INSERT INTO public.invoicing_audit_events (
    organization_id, legal_entity_id, invoice_id, market_code, country_code,
    environment_id, actor_id, action, resource_type, resource_id, request_id,
    correlation_id, reason_code, safe_metadata
  ) VALUES (
    target.organization_id, target.legal_entity_id, target.id, target.market_code,
    target.country_code, target.environment_id, p_actor_id,
    CASE WHEN target.document_type = 'credit_note' THEN 'credit_note.finalized' ELSE 'invoice.finalized' END,
    'invoice', target.id, p_request_id, correlation_id, 'user_requested',
    jsonb_build_object('number', assigned_number, 'snapshotDigest', v_snapshot_digest,
      'documentType', target.document_type, 'currency', target.currency)
  );

  IF target.document_type = 'credit_note' AND
     already_credited_total + lines_total = original.total_minor THEN
    UPDATE public.invoicing_invoices
    SET commercial_state = 'CREDITED', version = version + 1, updated_at = NOW()
    WHERE id = original.id;
  END IF;

  RETURN target;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_invoicing_invoice(UUID,UUID,BIGINT,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_invoicing_invoice(UUID,UUID,BIGINT,TEXT,TEXT) TO service_role;

ALTER TABLE public.invoicing_legal_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoicing_legal_identifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoicing_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoicing_party_identifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoicing_number_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoicing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoicing_invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoicing_tax_breakdowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoicing_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoicing_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoicing_audit_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.invoicing_legal_entities FORCE ROW LEVEL SECURITY;
ALTER TABLE public.invoicing_legal_identifiers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.invoicing_parties FORCE ROW LEVEL SECURITY;
ALTER TABLE public.invoicing_party_identifiers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.invoicing_number_series FORCE ROW LEVEL SECURITY;
ALTER TABLE public.invoicing_invoices FORCE ROW LEVEL SECURITY;
ALTER TABLE public.invoicing_invoice_lines FORCE ROW LEVEL SECURITY;
ALTER TABLE public.invoicing_tax_breakdowns FORCE ROW LEVEL SECURITY;
ALTER TABLE public.invoicing_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.invoicing_outbox FORCE ROW LEVEL SECURITY;
ALTER TABLE public.invoicing_audit_events FORCE ROW LEVEL SECURITY;

CREATE POLICY invoicing_legal_entities_read ON public.invoicing_legal_entities
  FOR SELECT USING ((SELECT public.is_invoicing_tenant_member(organization_id)));
CREATE POLICY invoicing_legal_identifiers_read ON public.invoicing_legal_identifiers
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.invoicing_legal_entities entity
    WHERE entity.id = legal_entity_id
      AND (SELECT public.is_invoicing_tenant_member(entity.organization_id))
  ));
CREATE POLICY invoicing_parties_read ON public.invoicing_parties
  FOR SELECT USING ((SELECT public.is_invoicing_tenant_member(organization_id)));
CREATE POLICY invoicing_party_identifiers_read ON public.invoicing_party_identifiers
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.invoicing_parties party
    WHERE party.id = party_id
      AND (SELECT public.is_invoicing_tenant_member(party.organization_id))
  ));
CREATE POLICY invoicing_number_series_read ON public.invoicing_number_series
  FOR SELECT USING ((SELECT public.is_invoicing_tenant_member(organization_id)));
CREATE POLICY invoicing_invoices_read ON public.invoicing_invoices
  FOR SELECT USING ((SELECT public.is_invoicing_tenant_member(organization_id)));
CREATE POLICY invoicing_invoice_lines_read ON public.invoicing_invoice_lines
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.invoicing_invoices invoice
    WHERE invoice.id = invoice_id
      AND (SELECT public.is_invoicing_tenant_member(invoice.organization_id))
  ));
CREATE POLICY invoicing_tax_breakdowns_read ON public.invoicing_tax_breakdowns
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.invoicing_invoices invoice
    WHERE invoice.id = invoice_id
      AND (SELECT public.is_invoicing_tenant_member(invoice.organization_id))
  ));
CREATE POLICY invoicing_documents_read ON public.invoicing_documents
  FOR SELECT USING ((SELECT public.is_invoicing_tenant_member(organization_id)));
CREATE POLICY invoicing_outbox_read ON public.invoicing_outbox
  FOR SELECT USING ((SELECT public.is_invoicing_tenant_member(organization_id)));
CREATE POLICY invoicing_audit_read ON public.invoicing_audit_events
  FOR SELECT USING ((SELECT public.is_invoicing_tenant_member(organization_id)));

COMMENT ON TABLE public.invoicing_invoices IS
  'MARKET_SCOPED canonical invoices. Existing monetization invoices remain a compatibility writer until cutover.';
COMMENT ON TABLE public.invoicing_documents IS
  'Immutable document artifacts. TEXT_V1 is a human-readable Phase 1 derivative, not a legal PDF or electronic original.';
COMMENT ON FUNCTION public.finalize_invoicing_invoice(UUID,UUID,BIGINT,TEXT,TEXT) IS
  'Short transaction that locks invoice then number series, validates totals/scope, assigns the number, snapshots, and appends outbox/audit.';
