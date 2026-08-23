-- =============================================================================
-- PLATFORM FINANCE LEDGER, REVENUE RECOGNITION & RECONCILIATION
-- Migration 00025 — expand-first, immutable, balanced and multi-market.
--
-- Operational payment/invoice tables remain the document lifecycle. This
-- migration adds the canonical accounting record from which platform revenue,
-- seller liabilities, taxes, provider costs and account balances are derived.
-- All values are integer minor units. Corrections are new reversal/adjustment
-- transactions; posted evidence is never updated or deleted.
-- =============================================================================

-- Canonical finance capabilities. Application and database vocabulary stay in
-- lockstep; platform visibility is deliberately separate from pricing control.
INSERT INTO public.access_capabilities (id, is_sensitive) VALUES
  ('finance.account.read.own', FALSE),
  ('finance.organization.read.own', FALSE),
  ('finance.platform.read', TRUE),
  ('finance.transactions.read', TRUE),
  ('finance.reconciliation.manage', TRUE),
  ('finance.payouts.manage', TRUE),
  ('finance.adjustments.create', TRUE),
  ('finance.exports.read', TRUE)
ON CONFLICT (id) DO UPDATE SET is_sensitive = EXCLUDED.is_sensitive;

INSERT INTO public.access_role_grants (role_kind, role_key, capability_id)
SELECT 'account_family', family, 'finance.account.read.own'
FROM unnest(ARRAY['individual','professional']) family
ON CONFLICT DO NOTHING;

-- Financial periods close in the market's civil timezone, never in the
-- database session timezone. Existing known markets receive their canonical
-- IANA zone; future markets must set this explicitly instead of inheriting a
-- country assumption throughout reporting code.
ALTER TABLE public.markets
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(80) NOT NULL DEFAULT 'UTC';
UPDATE public.markets SET timezone = CASE code
  WHEN 'FR' THEN 'Europe/Paris'
  WHEN 'BE' THEN 'Europe/Brussels'
  WHEN 'CH' THEN 'Europe/Zurich'
  WHEN 'LU' THEN 'Europe/Luxembourg'
  WHEN 'DE' THEN 'Europe/Berlin'
  WHEN 'ES' THEN 'Europe/Madrid'
  ELSE timezone
END;

INSERT INTO public.access_role_grants (role_kind, role_key, capability_id)
VALUES ('account_family','professional','finance.organization.read.own')
ON CONFLICT DO NOTHING;

INSERT INTO public.access_role_grants (role_kind, role_key, capability_id)
SELECT 'staff_role', role_key, capability
FROM unnest(ARRAY['finance','owner']) role_key
CROSS JOIN unnest(ARRAY[
  'finance.platform.read','finance.transactions.read',
  'finance.reconciliation.manage','finance.payouts.manage',
  'finance.adjustments.create','finance.exports.read'
]::TEXT[]) capability
ON CONFLICT DO NOTHING;

INSERT INTO public.access_role_grants (role_kind, role_key, capability_id)
SELECT 'staff_role', 'admin', capability
FROM unnest(ARRAY[
  'finance.platform.read','finance.transactions.read','finance.exports.read'
]::TEXT[]) capability
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.finance_accounts (
  code VARCHAR(20) PRIMARY KEY,
  label VARCHAR(180) NOT NULL,
  account_class VARCHAR(20) NOT NULL CHECK (account_class IN (
    'asset','liability','equity','revenue','expense','contra_revenue'
  )),
  normal_side VARCHAR(6) NOT NULL CHECK (normal_side IN ('debit','credit')),
  system_managed BOOLEAN NOT NULL DEFAULT TRUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.finance_accounts (code, label, account_class, normal_side) VALUES
  ('1100','Liquidités fournisseur','asset','debit'),
  ('1200','Créances clients','asset','debit'),
  ('5120','Banque — virements en transit','asset','debit'),
  ('4457','TVA collectée','liability','credit'),
  ('4670','Dettes envers vendeurs','liability','credit'),
  ('4680','Virements vendeurs à payer','liability','credit'),
  ('4870','Revenus différés','liability','credit'),
  ('7061','Revenus promotions','revenue','credit'),
  ('7062','Revenus abonnements','revenue','credit'),
  ('7063','Revenus publicitaires','revenue','credit'),
  ('7064','Revenus commissions','revenue','credit'),
  ('7065','Revenus frais de service','revenue','credit'),
  ('7091','Remboursements et avoirs','contra_revenue','debit'),
  ('6270','Frais fournisseurs de paiement','expense','debit'),
  ('6710','Pertes de rétrofacturation','expense','debit')
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  account_class = EXCLUDED.account_class,
  normal_side = EXCLUDED.normal_side;

CREATE TABLE IF NOT EXISTS public.finance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference VARCHAR(80) NOT NULL UNIQUE,
  transaction_type VARCHAR(40) NOT NULL CHECK (transaction_type IN (
    'subscription','promotion','advertising','commission','service_fee',
    'marketplace_sale','refund','credit_note','provider_fee','seller_payout',
    'chargeback','revenue_recognition','adjustment'
  )),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending','posted','reconciled','needs_review','refunded','failed','reversed'
  )),
  account_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  currency VARCHAR(3) NOT NULL,
  gross_amount_minor BIGINT NOT NULL,
  net_amount_minor BIGINT NOT NULL,
  description TEXT NOT NULL CHECK (length(description) >= 3),
  provider VARCHAR(30),
  provider_reference VARCHAR(255),
  order_reference VARCHAR(100),
  invoice_reference VARCHAR(100),
  source_table VARCHAR(80) NOT NULL,
  source_id VARCHAR(255) NOT NULL,
  reversal_of_transaction_id UUID REFERENCES public.finance_transactions(id) ON DELETE RESTRICT,
  idempotency_key VARCHAR(240) NOT NULL UNIQUE,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(metadata) = 'object'),
  occurred_at TIMESTAMPTZ NOT NULL,
  posted_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((status = 'pending') = (posted_at IS NULL)),
  CHECK (reversal_of_transaction_id IS NULL OR transaction_type IN ('refund','credit_note','chargeback','adjustment')),
  UNIQUE (source_table, source_id)
);
CREATE INDEX IF NOT EXISTS finance_transactions_period_idx
  ON public.finance_transactions (currency, occurred_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS finance_transactions_market_period_idx
  ON public.finance_transactions (market_code, currency, occurred_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS finance_transactions_account_period_idx
  ON public.finance_transactions (account_id, occurred_at DESC, id DESC)
  WHERE account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS finance_transactions_organization_period_idx
  ON public.finance_transactions (organization_id, occurred_at DESC, id DESC)
  WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS finance_transactions_review_idx
  ON public.finance_transactions (occurred_at, id)
  WHERE status = 'needs_review';
CREATE UNIQUE INDEX IF NOT EXISTS finance_transactions_provider_reference_idx
  ON public.finance_transactions (provider, provider_reference)
  WHERE provider IS NOT NULL AND provider_reference IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.finance_ledger_entries (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.finance_transactions(id) ON DELETE RESTRICT,
  account_code VARCHAR(20) NOT NULL REFERENCES public.finance_accounts(code) ON DELETE RESTRICT,
  side VARCHAR(6) NOT NULL CHECK (side IN ('debit','credit')),
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency VARCHAR(3) NOT NULL,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  account_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS finance_ledger_entries_transaction_idx
  ON public.finance_ledger_entries (transaction_id, id);
CREATE INDEX IF NOT EXISTS finance_ledger_entries_account_period_idx
  ON public.finance_ledger_entries (account_code, currency, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS finance_ledger_entries_market_account_period_idx
  ON public.finance_ledger_entries (market_code, account_code, currency, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS finance_ledger_entries_profile_idx
  ON public.finance_ledger_entries (account_id, created_at DESC, id DESC)
  WHERE account_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.finance_revenue_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_transaction_id UUID NOT NULL REFERENCES public.finance_transactions(id) ON DELETE RESTRICT,
  account_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  currency VARCHAR(3) NOT NULL,
  total_amount_minor BIGINT NOT NULL CHECK (total_amount_minor > 0),
  recognized_amount_minor BIGINT NOT NULL DEFAULT 0 CHECK (recognized_amount_minor >= 0),
  recognition_start DATE NOT NULL,
  recognition_end DATE NOT NULL,
  cadence VARCHAR(20) NOT NULL DEFAULT 'daily' CHECK (cadence IN ('daily','monthly','on_delivery')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (recognition_end >= recognition_start),
  CHECK (recognized_amount_minor <= total_amount_minor),
  UNIQUE (source_transaction_id)
);
CREATE INDEX IF NOT EXISTS finance_revenue_schedules_due_idx
  ON public.finance_revenue_schedules (status, recognition_end, id)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS public.finance_reconciliation_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES public.finance_transactions(id) ON DELETE RESTRICT,
  source_table VARCHAR(80) NOT NULL,
  source_id VARCHAR(255) NOT NULL,
  provider VARCHAR(30),
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','ignored')),
  currency VARCHAR(3) NOT NULL,
  expected_amount_minor BIGINT NOT NULL,
  actual_amount_minor BIGINT NOT NULL,
  difference_minor BIGINT GENERATED ALWAYS AS (expected_amount_minor - actual_amount_minor) STORED,
  reason TEXT NOT NULL CHECK (length(reason) >= 3),
  evidence JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(evidence) = 'object'),
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  UNIQUE (source_table, source_id),
  CHECK ((status IN ('resolved','ignored')) = (resolved_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS finance_reconciliation_open_idx
  ON public.finance_reconciliation_cases (status, opened_at, id)
  WHERE status IN ('open','investigating');
CREATE INDEX IF NOT EXISTS finance_reconciliation_transaction_idx
  ON public.finance_reconciliation_cases (transaction_id)
  WHERE transaction_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.finance_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_account_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency VARCHAR(3) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('requested','approved','processing','paid','failed','cancelled')),
  provider VARCHAR(30),
  provider_payout_id VARCHAR(255),
  idempotency_key VARCHAR(240) NOT NULL UNIQUE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  failure_code VARCHAR(120),
  failure_message TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS finance_payouts_seller_status_idx
  ON public.finance_payouts (seller_account_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS finance_payouts_processing_idx
  ON public.finance_payouts (requested_at, id)
  WHERE status IN ('approved','processing');
CREATE UNIQUE INDEX IF NOT EXISTS finance_payouts_provider_idx
  ON public.finance_payouts (provider, provider_payout_id)
  WHERE provider IS NOT NULL AND provider_payout_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.finance_credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_number VARCHAR(80) NOT NULL UNIQUE,
  invoice_id VARCHAR(80) REFERENCES public.monetization_invoices(id) ON DELETE RESTRICT,
  account_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  transaction_id UUID NOT NULL REFERENCES public.finance_transactions(id) ON DELETE RESTRICT,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  tax_amount_minor BIGINT NOT NULL DEFAULT 0 CHECK (tax_amount_minor >= 0),
  currency VARCHAR(3) NOT NULL,
  reason TEXT NOT NULL CHECK (length(reason) >= 3),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  issued_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS finance_credit_notes_account_idx
  ON public.finance_credit_notes (account_id, issued_at DESC);

-- -----------------------------------------------------------------------------
-- Ledger invariants and posting boundary
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_posted_finance_mutation()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' OR OLD.status <> 'pending' THEN
    RAISE EXCEPTION 'posted finance transactions are immutable; create a reversal or adjustment'
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS immutable_finance_transactions ON public.finance_transactions;
CREATE TRIGGER immutable_finance_transactions
BEFORE UPDATE OR DELETE ON public.finance_transactions
FOR EACH ROW EXECUTE FUNCTION public.reject_posted_finance_mutation();

DROP TRIGGER IF EXISTS immutable_finance_ledger_entries ON public.finance_ledger_entries;
CREATE TRIGGER immutable_finance_ledger_entries
BEFORE UPDATE OR DELETE ON public.finance_ledger_entries
FOR EACH ROW EXECUTE FUNCTION public.reject_immutable_mutation();

DROP TRIGGER IF EXISTS immutable_finance_credit_notes ON public.finance_credit_notes;
CREATE TRIGGER immutable_finance_credit_notes
BEFORE UPDATE OR DELETE ON public.finance_credit_notes
FOR EACH ROW EXECUTE FUNCTION public.reject_immutable_mutation();

CREATE OR REPLACE FUNCTION public.assert_finance_transaction_balanced(p_transaction_id UUID)
RETURNS VOID LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  invalid_currency RECORD;
  entry_count INT;
BEGIN
  SELECT COUNT(*) INTO entry_count
  FROM public.finance_ledger_entries WHERE transaction_id = p_transaction_id;
  IF entry_count < 2 THEN
    RAISE EXCEPTION 'finance transaction % requires at least two entries', p_transaction_id
      USING ERRCODE = '23514';
  END IF;
  SELECT currency,
         SUM(CASE WHEN side = 'debit' THEN amount_minor ELSE 0 END) AS debit_minor,
         SUM(CASE WHEN side = 'credit' THEN amount_minor ELSE 0 END) AS credit_minor
  INTO invalid_currency
  FROM public.finance_ledger_entries
  WHERE transaction_id = p_transaction_id
  GROUP BY currency
  HAVING SUM(CASE WHEN side = 'debit' THEN amount_minor ELSE 0 END)
      <> SUM(CASE WHEN side = 'credit' THEN amount_minor ELSE 0 END)
  LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'finance transaction % is unbalanced in % (% debit, % credit)',
      p_transaction_id, invalid_currency.currency,
      invalid_currency.debit_minor, invalid_currency.credit_minor
      USING ERRCODE = '23514';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_posted_finance_transaction_header()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.finance_transactions
    WHERE id = NEW.id AND status <> 'pending'
  ) THEN
    PERFORM public.assert_finance_transaction_balanced(NEW.id);
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_posted_finance_transaction_entry()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.finance_transactions
    WHERE id = NEW.transaction_id AND status <> 'pending'
  ) THEN
    PERFORM public.assert_finance_transaction_balanced(NEW.transaction_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS finance_transaction_balance_on_post ON public.finance_transactions;
CREATE CONSTRAINT TRIGGER finance_transaction_balance_on_post
AFTER INSERT OR UPDATE OF status ON public.finance_transactions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.validate_posted_finance_transaction_header();

DROP TRIGGER IF EXISTS finance_transaction_balance_on_entry ON public.finance_ledger_entries;
CREATE CONSTRAINT TRIGGER finance_transaction_balance_on_entry
AFTER INSERT ON public.finance_ledger_entries
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.validate_posted_finance_transaction_entry();

CREATE OR REPLACE FUNCTION public.post_finance_transaction(
  p_reference VARCHAR,
  p_transaction_type VARCHAR,
  p_account_id UUID,
  p_organization_id UUID,
  p_market_code VARCHAR,
  p_currency VARCHAR,
  p_gross_amount_minor BIGINT,
  p_net_amount_minor BIGINT,
  p_description TEXT,
  p_provider VARCHAR,
  p_provider_reference VARCHAR,
  p_order_reference VARCHAR,
  p_invoice_reference VARCHAR,
  p_source_table VARCHAR,
  p_source_id VARCHAR,
  p_idempotency_key VARCHAR,
  p_occurred_at TIMESTAMPTZ,
  p_entries JSONB,
  p_created_by UUID DEFAULT NULL,
  p_reversal_of_transaction_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB,
  p_status VARCHAR DEFAULT 'posted'
) RETURNS public.finance_transactions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  existing public.finance_transactions%ROWTYPE;
  created public.finance_transactions%ROWTYPE;
  item JSONB;
BEGIN
  SELECT * INTO existing FROM public.finance_transactions
  WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN RETURN existing; END IF;
  IF jsonb_typeof(p_entries) <> 'array' OR jsonb_array_length(p_entries) < 2 THEN
    RAISE EXCEPTION 'at least two ledger entries are required' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.finance_transactions (
    reference, transaction_type, status, account_id, organization_id,
    market_code, currency, gross_amount_minor, net_amount_minor, description,
    provider, provider_reference, order_reference, invoice_reference,
    source_table, source_id, reversal_of_transaction_id, idempotency_key,
    metadata, occurred_at, created_by
  ) VALUES (
    p_reference, p_transaction_type, 'pending', p_account_id, p_organization_id,
    p_market_code, p_currency, p_gross_amount_minor, p_net_amount_minor, p_description,
    p_provider, p_provider_reference, p_order_reference, p_invoice_reference,
    p_source_table, p_source_id, p_reversal_of_transaction_id, p_idempotency_key,
    COALESCE(p_metadata, '{}'::JSONB), p_occurred_at, p_created_by
  ) RETURNING * INTO created;

  FOR item IN SELECT value FROM jsonb_array_elements(p_entries)
  LOOP
    INSERT INTO public.finance_ledger_entries (
      transaction_id, account_code, side, amount_minor, currency, market_code,
      account_id, organization_id
    ) VALUES (
      created.id, item->>'accountCode', item->>'side',
      (item->>'amountMinor')::BIGINT, COALESCE(item->>'currency', p_currency),
      p_market_code, p_account_id, p_organization_id
    );
  END LOOP;

  PERFORM public.assert_finance_transaction_balanced(created.id);
  UPDATE public.finance_transactions
  SET status = p_status, posted_at = CASE WHEN p_status = 'pending' THEN NULL ELSE NOW() END
  WHERE id = created.id
  RETURNING * INTO created;
  RETURN created;
END;
$$;

-- -----------------------------------------------------------------------------
-- Reliable monetization projection and backfill
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_monetization_order_finance(p_order_id VARCHAR)
RETURNS public.finance_transactions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target public.monetization_orders%ROWTYPE;
  quote_row public.monetization_quotes%ROWTYPE;
  payment_id VARCHAR(80);
  invoice_id VARCHAR(80);
  invoice_number VARCHAR(80);
  subtotal_minor BIGINT;
  discount_minor BIGINT;
  tax_minor BIGINT;
  transaction_kind VARCHAR(40);
  revenue_account VARCHAR(20);
  entries JSONB;
  created public.finance_transactions%ROWTYPE;
BEGIN
  SELECT * INTO target FROM public.monetization_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR target.status NOT IN ('paid','partially_refunded','refunded') THEN
    RETURN NULL;
  END IF;
  SELECT * INTO quote_row FROM public.monetization_quotes WHERE id = target.quote_id;
  SELECT COALESCE(SUM(subtotal_minor),0), COALESCE(SUM(discount_minor),0), COALESCE(SUM(tax_minor),0)
    INTO subtotal_minor, discount_minor, tax_minor
  FROM public.monetization_quote_items WHERE quote_id = target.quote_id;

  payment_id := 'finpay_' || substring(md5(target.id), 1, 32);
  invoice_id := 'fininv_' || substring(md5(target.id), 1, 32);
  invoice_number := 'SHG-' || to_char(COALESCE(target.paid_at, target.created_at), 'YYYY') || '-' || upper(substring(md5(target.id), 1, 10));

  INSERT INTO public.monetization_payments (
    id, account_id, order_id, status, amount_minor, currency, provider,
    provider_payment_id, idempotency_key, paid_at, created_at, updated_at
  ) VALUES (
    payment_id, target.account_id, target.id, 'succeeded', target.total_minor,
    target.currency, target.provider, target.provider_payment_id,
    'finance-projection:payment:' || target.id,
    COALESCE(target.paid_at, target.updated_at), target.created_at, target.updated_at
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.monetization_invoices (
    id, account_id, order_id, invoice_number, status, currency, subtotal_minor,
    discount_minor, tax_minor, total_minor, amount_paid_minor, amount_due_minor,
    provider, provider_invoice_id, issued_at, paid_at, created_at, updated_at
  ) VALUES (
    invoice_id, target.account_id, target.id, invoice_number, 'paid', target.currency,
    subtotal_minor, discount_minor, tax_minor, target.total_minor, target.total_minor, 0,
    target.provider, target.invoice_id, COALESCE(target.paid_at, target.created_at),
    COALESCE(target.paid_at, target.updated_at), target.created_at, target.updated_at
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.monetization_invoice_lines (
    invoice_id, line_number, product_id, description, quantity,
    unit_amount_minor, subtotal_minor, tax_rate_bps, tax_minor, total_minor,
    period_start, period_end
  )
  SELECT invoice_id, item.line_number, item.product_id, item.label, item.quantity,
    item.unit_amount_minor, item.subtotal_minor - item.discount_minor,
    item.tax_rate_bps, item.tax_minor, item.total_minor,
    CASE WHEN item.billing_period IN ('month','year') THEN COALESCE(target.paid_at, target.updated_at) ELSE NULL END,
    CASE item.billing_period
      WHEN 'month' THEN COALESCE(target.paid_at, target.updated_at) + INTERVAL '1 month'
      WHEN 'year' THEN COALESCE(target.paid_at, target.updated_at) + INTERVAL '1 year'
      ELSE NULL END
  FROM public.monetization_quote_items item WHERE item.quote_id = target.quote_id
  ON CONFLICT DO NOTHING;

  SELECT CASE product.kind
      WHEN 'subscription' THEN 'subscription'
      WHEN 'premium_option' THEN 'promotion'
      WHEN 'sponsored_placement' THEN 'advertising'
      WHEN 'commission' THEN 'commission'
      ELSE 'service_fee' END,
    CASE product.kind
      WHEN 'subscription' THEN '4870'
      WHEN 'premium_option' THEN '7061'
      WHEN 'sponsored_placement' THEN '7063'
      WHEN 'commission' THEN '7064'
      ELSE '7065' END
    INTO transaction_kind, revenue_account
  FROM public.monetization_quote_items item
  JOIN public.monetization_product_versions version ON version.id = item.product_version_id
  JOIN public.monetization_products product ON product.id = version.product_id
  WHERE item.quote_id = target.quote_id ORDER BY item.line_number LIMIT 1;

  entries := jsonb_build_array(
    jsonb_build_object('accountCode','1100','side','debit','amountMinor',target.total_minor,'currency',target.currency),
    jsonb_build_object('accountCode',COALESCE(revenue_account,'7065'),'side','credit','amountMinor',subtotal_minor - discount_minor,'currency',target.currency)
  );
  IF tax_minor > 0 THEN
    entries := entries || jsonb_build_array(
      jsonb_build_object('accountCode','4457','side','credit','amountMinor',tax_minor,'currency',target.currency)
    );
  END IF;

  created := public.post_finance_transaction(
    'TX-' || upper(substring(md5(target.id), 1, 16)), COALESCE(transaction_kind,'service_fee'),
    target.account_id, NULL, quote_row.market_code, target.currency,
    target.total_minor, subtotal_minor - discount_minor,
    'Achat Shongre issu du catalogue commercial versionné', target.provider,
    target.provider_payment_id, target.id, invoice_number,
    'monetization_orders', target.id, 'finance-projection:order:' || target.id,
    COALESCE(target.paid_at, target.updated_at), entries, NULL, NULL,
    jsonb_build_object('quoteId', target.quote_id, 'snapshotHash', target.snapshot_hash)
  );

  IF transaction_kind = 'subscription' AND NOT EXISTS (
    SELECT 1 FROM public.finance_revenue_schedules WHERE source_transaction_id = created.id
  ) THEN
    INSERT INTO public.finance_revenue_schedules (
      source_transaction_id, account_id, market_code, currency,
      total_amount_minor, recognition_start, recognition_end, cadence
    ) VALUES (
      created.id, target.account_id, quote_row.market_code, target.currency,
      subtotal_minor - discount_minor,
      COALESCE(target.paid_at, target.updated_at)::DATE,
      (COALESCE(target.paid_at, target.updated_at) +
        CASE WHEN EXISTS (SELECT 1 FROM public.monetization_quote_items WHERE quote_id = target.quote_id AND billing_period = 'year')
          THEN INTERVAL '1 year' ELSE INTERVAL '1 month' END)::DATE,
      'daily'
    );
  END IF;
  RETURN created;
END;
$$;

CREATE OR REPLACE FUNCTION public.project_paid_monetization_order_to_finance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('paid','partially_refunded','refunded')
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.sync_monetization_order_finance(NEW.id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS monetization_order_finance_projection ON public.monetization_orders;
CREATE TRIGGER monetization_order_finance_projection
AFTER INSERT OR UPDATE OF status ON public.monetization_orders
FOR EACH ROW EXECUTE FUNCTION public.project_paid_monetization_order_to_finance();

-- Recognize deferred subscription revenue as it is earned. The schedule uses
-- an exclusive end date (for example 1 August → 1 September). Each execution
-- posts only the delta between the amount earned through p_as_of and the amount
-- already recognized. The schedule row lock plus the posting idempotency key
-- make concurrent cron executions safe.
CREATE OR REPLACE FUNCTION public.recognize_due_finance_revenue(
  p_as_of DATE DEFAULT CURRENT_DATE,
  p_batch_size INTEGER DEFAULT 500
) RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  schedule RECORD;
  total_days INTEGER;
  earned_days INTEGER;
  target_minor BIGINT;
  delta_minor BIGINT;
  processed INTEGER := 0;
BEGIN
  IF p_batch_size < 1 OR p_batch_size > 5000 THEN
    RAISE EXCEPTION 'finance recognition batch size must be between 1 and 5000'
      USING ERRCODE = '22023';
  END IF;

  FOR schedule IN
    SELECT revenue_schedule.*, source.organization_id, source.invoice_reference,
      market.timezone AS market_timezone
    FROM public.finance_revenue_schedules revenue_schedule
    JOIN public.finance_transactions source
      ON source.id = revenue_schedule.source_transaction_id
    JOIN public.markets market ON market.code = revenue_schedule.market_code
    WHERE revenue_schedule.status = 'active'
      AND revenue_schedule.recognition_start <= p_as_of
    ORDER BY revenue_schedule.recognition_end, revenue_schedule.id
    LIMIT p_batch_size
    FOR UPDATE OF revenue_schedule SKIP LOCKED
  LOOP
    total_days := GREATEST(1, schedule.recognition_end - schedule.recognition_start);
    earned_days := LEAST(
      total_days,
      GREATEST(0, p_as_of - schedule.recognition_start + 1)
    );
    target_minor := CASE
      WHEN earned_days >= total_days THEN schedule.total_amount_minor
      ELSE (schedule.total_amount_minor * earned_days) / total_days
    END;
    delta_minor := target_minor - schedule.recognized_amount_minor;

    IF delta_minor > 0 THEN
      PERFORM public.post_finance_transaction(
        'REV-' || upper(substring(md5(schedule.id::TEXT || ':' || p_as_of::TEXT), 1, 16)),
        'revenue_recognition', schedule.account_id, schedule.organization_id,
        schedule.market_code, schedule.currency, delta_minor, delta_minor,
        'Reconnaissance du revenu d’abonnement acquis', 'internal', NULL, NULL,
        schedule.invoice_reference, 'finance_revenue_schedules',
        schedule.id::TEXT || ':' || p_as_of::TEXT,
        'finance-recognition:' || schedule.id::TEXT || ':' || p_as_of::TEXT,
        make_timestamptz(
          extract(year FROM p_as_of)::INTEGER,
          extract(month FROM p_as_of)::INTEGER,
          extract(day FROM p_as_of)::INTEGER,
          23, 59, 59, schedule.market_timezone
        ),
        jsonb_build_array(
          jsonb_build_object('accountCode','4870','side','debit','amountMinor',delta_minor,'currency',schedule.currency),
          jsonb_build_object('accountCode','7062','side','credit','amountMinor',delta_minor,'currency',schedule.currency)
        ),
        NULL, NULL,
        jsonb_build_object(
          'scheduleId', schedule.id,
          'sourceTransactionId', schedule.source_transaction_id,
          'recognizedThrough', p_as_of
        )
      );
      processed := processed + 1;
    END IF;

    UPDATE public.finance_revenue_schedules
    SET recognized_amount_minor = target_minor,
        status = CASE WHEN target_minor >= total_amount_minor THEN 'completed' ELSE 'active' END
    WHERE id = schedule.id;
  END LOOP;

  RETURN processed;
END;
$$;

-- Reliable backfill: paid versioned monetization orders carry a locked quote,
-- integer totals and a snapshot hash. Ambiguous legacy orders are intentionally
-- excluded and exposed through the reconciliation queue below.
DO $$
DECLARE candidate RECORD;
BEGIN
  FOR candidate IN
    SELECT id FROM public.monetization_orders
    WHERE status IN ('paid','partially_refunded','refunded')
    ORDER BY created_at, id
  LOOP
    PERFORM public.sync_monetization_order_finance(candidate.id);
  END LOOP;
END $$;

-- Legacy numeric-major-unit rows cannot be silently converted into canonical
-- revenue. Queue them for evidence-backed review instead of inventing cents,
-- taxes or recognition dates.
INSERT INTO public.finance_reconciliation_cases (
  source_table, source_id, provider, status, currency,
  expected_amount_minor, actual_amount_minor, reason, evidence
)
SELECT 'orders', legacy.id::TEXT, 'legacy', 'open', listing.currency,
  ROUND(legacy.total_charged * 100)::BIGINT, 0,
  'Commande historique sans ventilation fiable des taxes, commissions et fonds vendeur.',
  jsonb_build_object('legacyStatus', legacy.status::TEXT, 'createdAt', legacy.created_at)
FROM public.orders legacy
JOIN public.listings listing ON listing.id = legacy.listing_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.finance_transactions transaction
  WHERE transaction.source_table = 'orders' AND transaction.source_id = legacy.id::TEXT
)
ON CONFLICT (source_table, source_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Reporting views and server-side aggregation
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.finance_platform_daily AS
SELECT
  (transaction.occurred_at AT TIME ZONE market.timezone)::DATE AS report_date,
  transaction.market_code,
  transaction.currency,
  COALESCE(SUM(CASE
    WHEN account.account_class = 'revenue' AND entry.side = 'credit' THEN entry.amount_minor
    WHEN account.account_class = 'revenue' AND entry.side = 'debit' THEN -entry.amount_minor
    ELSE 0 END), 0)::BIGINT AS platform_revenue_minor,
  COALESCE(SUM(CASE WHEN entry.account_code = '7062' AND entry.side = 'credit' THEN entry.amount_minor ELSE 0 END), 0)::BIGINT AS subscriptions_revenue_minor,
  COALESCE(SUM(CASE WHEN entry.account_code = '7061' AND entry.side = 'credit' THEN entry.amount_minor ELSE 0 END), 0)::BIGINT AS promotions_revenue_minor,
  COALESCE(SUM(CASE WHEN entry.account_code = '7063' AND entry.side = 'credit' THEN entry.amount_minor ELSE 0 END), 0)::BIGINT AS advertising_revenue_minor,
  COALESCE(SUM(CASE WHEN entry.account_code IN ('7064','7065') AND entry.side = 'credit' THEN entry.amount_minor ELSE 0 END), 0)::BIGINT AS commissions_revenue_minor,
  COALESCE(SUM(CASE
    WHEN account.account_class = 'contra_revenue' AND entry.side = 'debit' THEN entry.amount_minor
    ELSE 0 END), 0)::BIGINT AS refunds_minor,
  COALESCE(SUM(CASE
    WHEN entry.account_code = '6270' AND entry.side = 'debit' THEN entry.amount_minor
    ELSE 0 END), 0)::BIGINT AS provider_fees_minor,
  COALESCE(SUM(CASE
    WHEN entry.account_code = '4457' AND entry.side = 'credit' THEN entry.amount_minor
    WHEN entry.account_code = '4457' AND entry.side = 'debit' THEN -entry.amount_minor
    ELSE 0 END), 0)::BIGINT AS tax_collected_minor,
  COALESCE(SUM(CASE
    WHEN entry.account_code = '4670' AND entry.side = 'credit' THEN entry.amount_minor
    WHEN entry.account_code = '4670' AND entry.side = 'debit' THEN -entry.amount_minor
    ELSE 0 END), 0)::BIGINT AS seller_payable_minor,
  COALESCE(SUM(CASE
    WHEN entry.account_code = '1100' AND entry.side = 'debit' THEN entry.amount_minor
    WHEN entry.account_code = '1100' AND entry.side = 'credit' THEN -entry.amount_minor
    ELSE 0 END), 0)::BIGINT AS gross_collected_minor,
  COALESCE(SUM(CASE WHEN transaction.transaction_type = 'marketplace_sale'
    THEN ABS(transaction.gross_amount_minor) ELSE 0 END), 0)::BIGINT AS gmv_minor
FROM public.finance_transactions transaction
JOIN public.finance_ledger_entries entry ON entry.transaction_id = transaction.id
JOIN public.finance_accounts account ON account.code = entry.account_code
JOIN public.markets market ON market.code = transaction.market_code
WHERE transaction.status IN ('posted','reconciled','needs_review','refunded','reversed')
GROUP BY (transaction.occurred_at AT TIME ZONE market.timezone)::DATE,
  transaction.market_code, transaction.currency;

CREATE OR REPLACE FUNCTION public.finance_platform_overview(
  p_period_start DATE,
  p_period_end DATE,
  p_market_code VARCHAR DEFAULT NULL,
  p_currency VARCHAR DEFAULT 'EUR'
) RETURNS JSONB
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH daily AS (
    SELECT * FROM public.finance_platform_daily
    WHERE report_date BETWEEN p_period_start AND p_period_end
      AND currency = p_currency
      AND (p_market_code IS NULL OR market_code = p_market_code)
  ), totals AS (
    SELECT
      COALESCE(SUM(platform_revenue_minor),0)::BIGINT AS revenue,
      COALESCE(SUM(subscriptions_revenue_minor),0)::BIGINT AS subscriptions,
      COALESCE(SUM(promotions_revenue_minor),0)::BIGINT AS promotions,
      COALESCE(SUM(advertising_revenue_minor),0)::BIGINT AS advertising,
      COALESCE(SUM(commissions_revenue_minor),0)::BIGINT AS commissions,
      COALESCE(SUM(refunds_minor),0)::BIGINT AS refunds,
      COALESCE(SUM(provider_fees_minor),0)::BIGINT AS provider_fees,
      COALESCE(SUM(tax_collected_minor),0)::BIGINT AS tax,
      COALESCE(SUM(seller_payable_minor),0)::BIGINT AS seller_payable,
      COALESCE(SUM(gross_collected_minor),0)::BIGINT AS gross_collected,
      COALESCE(SUM(gmv_minor),0)::BIGINT AS gmv
    FROM daily
  )
  SELECT jsonb_build_object(
    'currency', p_currency,
    'periodStart', p_period_start,
    'periodEnd', p_period_end,
    'platformRevenueMinor', revenue,
    'netRevenueMinor', revenue - provider_fees - refunds,
    'refundsMinor', refunds,
    'providerFeesMinor', provider_fees,
    'taxCollectedMinor', tax,
    'sellerPayableMinor', seller_payable,
    'grossCollectedMinor', gross_collected,
    'gmvMinor', gmv,
    'revenueSources', jsonb_build_object(
      'subscriptionsMinor', subscriptions,
      'promotionsMinor', promotions,
      'advertisingMinor', advertising,
      'commissionsMinor', commissions
    ),
    'outstandingMinor', COALESCE((
      SELECT SUM(invoice.amount_due_minor)
      FROM public.monetization_invoices invoice
      LEFT JOIN public.monetization_orders order_row ON order_row.id = invoice.order_id
      LEFT JOIN public.monetization_quotes quote ON quote.id = order_row.quote_id
      LEFT JOIN public.markets market ON market.code = quote.market_code
      WHERE invoice.status = 'open' AND invoice.currency = p_currency
        AND (invoice.issued_at AT TIME ZONE COALESCE(market.timezone, 'UTC'))::DATE <= p_period_end
        AND (p_market_code IS NULL OR quote.market_code = p_market_code)
    ), 0),
    'deferredRevenueMinor', COALESCE((
      SELECT SUM(CASE
        WHEN entry.side = 'credit' THEN entry.amount_minor
        ELSE -entry.amount_minor END)
      FROM public.finance_ledger_entries entry
      JOIN public.finance_transactions transaction ON transaction.id = entry.transaction_id
      JOIN public.markets market ON market.code = transaction.market_code
      WHERE entry.account_code = '4870'
        AND entry.currency = p_currency
        AND (transaction.occurred_at AT TIME ZONE market.timezone)::DATE <= p_period_end
        AND transaction.status IN ('posted','reconciled','needs_review','refunded','reversed')
        AND (p_market_code IS NULL OR entry.market_code = p_market_code)
    ), 0),
    'mrrMinor', COALESCE((
      SELECT SUM(CASE price.billing_period
        WHEN 'month' THEN price.amount_minor
        WHEN 'year' THEN ROUND(price.amount_minor / 12.0)::BIGINT
        ELSE 0 END)
      FROM public.monetization_subscriptions subscription
      JOIN public.monetization_prices price ON price.id = subscription.price_id
      JOIN public.monetization_orders order_row ON order_row.id = subscription.source_order_id
      JOIN public.monetization_quotes quote ON quote.id = order_row.quote_id
      WHERE subscription.status IN ('active','trialing') AND price.currency = p_currency
        AND (p_market_code IS NULL OR quote.market_code = p_market_code)
    ), 0),
    'subscriptionHealth', jsonb_build_object(
      'paidAccounts', (
        SELECT COUNT(DISTINCT subscription.account_id)
        FROM public.monetization_subscriptions subscription
        JOIN public.monetization_orders order_row ON order_row.id = subscription.source_order_id
        JOIN public.monetization_quotes quote ON quote.id = order_row.quote_id
        WHERE subscription.status = 'active'
          AND (p_market_code IS NULL OR quote.market_code = p_market_code)
      ),
      'newSubscriptions', (
        SELECT COUNT(*)
        FROM public.monetization_subscriptions subscription
        JOIN public.monetization_orders order_row ON order_row.id = subscription.source_order_id
        JOIN public.monetization_quotes quote ON quote.id = order_row.quote_id
        JOIN public.markets market ON market.code = quote.market_code
        WHERE (subscription.created_at AT TIME ZONE market.timezone)::DATE BETWEEN p_period_start AND p_period_end
          AND (p_market_code IS NULL OR quote.market_code = p_market_code)
      ),
      'cancelledSubscriptions', (
        SELECT COUNT(*)
        FROM public.monetization_subscriptions subscription
        JOIN public.monetization_orders order_row ON order_row.id = subscription.source_order_id
        JOIN public.monetization_quotes quote ON quote.id = order_row.quote_id
        JOIN public.markets market ON market.code = quote.market_code
        WHERE subscription.status IN ('cancelled','expired')
          AND (subscription.updated_at AT TIME ZONE market.timezone)::DATE BETWEEN p_period_start AND p_period_end
          AND (p_market_code IS NULL OR quote.market_code = p_market_code)
      )
    ),
    'exceptions', jsonb_build_object(
      'failedPayments', (
        SELECT COUNT(*)
        FROM public.monetization_payments payment
        JOIN public.monetization_orders order_row ON order_row.id = payment.order_id
        JOIN public.monetization_quotes quote ON quote.id = order_row.quote_id
        JOIN public.markets market ON market.code = quote.market_code
        WHERE payment.status = 'failed'
          AND (payment.created_at AT TIME ZONE market.timezone)::DATE BETWEEN p_period_start AND p_period_end
          AND (p_market_code IS NULL OR quote.market_code = p_market_code)
      ),
      'reconciliationGaps', (
        SELECT COUNT(*)
        FROM public.finance_reconciliation_cases reconciliation
        LEFT JOIN public.finance_transactions transaction ON transaction.id = reconciliation.transaction_id
        WHERE reconciliation.status IN ('open','investigating')
          AND (p_market_code IS NULL OR transaction.market_code = p_market_code)
      ),
      'failedPayouts', (
        SELECT COUNT(*)
        FROM public.finance_payouts payout
        JOIN public.markets market ON market.code = payout.market_code
        WHERE payout.status = 'failed'
          AND (payout.requested_at AT TIME ZONE market.timezone)::DATE BETWEEN p_period_start AND p_period_end
          AND (p_market_code IS NULL OR payout.market_code = p_market_code)
      )
    ),
    'markets', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'marketCode', market_code,
        'platformRevenueMinor', market_revenue,
        'netRevenueMinor', market_revenue - market_fees - market_refunds,
        'gmvMinor', market_gmv
      ) ORDER BY market_code)
      FROM (
        SELECT market_code, SUM(platform_revenue_minor)::BIGINT AS market_revenue,
          SUM(provider_fees_minor)::BIGINT AS market_fees,
          SUM(refunds_minor)::BIGINT AS market_refunds,
          SUM(gmv_minor)::BIGINT AS market_gmv
        FROM daily GROUP BY market_code
      ) market_totals
    ), '[]'::JSONB),
    'timeSeries', COALESCE((SELECT jsonb_agg(to_jsonb(daily) ORDER BY report_date, market_code) FROM daily), '[]'::JSONB)
  ) FROM totals;
$$;

-- Deny direct browser access. Public APIs call backend services using a scoped
-- service credential and enforce account/organization ownership there.
ALTER TABLE public.finance_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_revenue_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_reconciliation_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_credit_notes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.finance_accounts FROM anon, authenticated;
REVOKE ALL ON public.finance_transactions FROM anon, authenticated;
REVOKE ALL ON public.finance_ledger_entries FROM anon, authenticated;
REVOKE ALL ON public.finance_revenue_schedules FROM anon, authenticated;
REVOKE ALL ON public.finance_reconciliation_cases FROM anon, authenticated;
REVOKE ALL ON public.finance_payouts FROM anon, authenticated;
REVOKE ALL ON public.finance_credit_notes FROM anon, authenticated;
REVOKE ALL ON public.finance_platform_daily FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.assert_finance_transaction_balanced(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.post_finance_transaction(VARCHAR,VARCHAR,UUID,UUID,VARCHAR,VARCHAR,BIGINT,BIGINT,TEXT,VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,TIMESTAMPTZ,JSONB,UUID,UUID,JSONB,VARCHAR) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_monetization_order_finance(VARCHAR) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recognize_due_finance_revenue(DATE,INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finance_platform_overview(DATE,DATE,VARCHAR,VARCHAR) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assert_finance_transaction_balanced(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.post_finance_transaction(VARCHAR,VARCHAR,UUID,UUID,VARCHAR,VARCHAR,BIGINT,BIGINT,TEXT,VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,VARCHAR,TIMESTAMPTZ,JSONB,UUID,UUID,JSONB,VARCHAR) TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_monetization_order_finance(VARCHAR) TO service_role;
GRANT EXECUTE ON FUNCTION public.recognize_due_finance_revenue(DATE,INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.finance_platform_overview(DATE,DATE,VARCHAR,VARCHAR) TO service_role;
