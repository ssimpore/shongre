-- Canonical Platform Commission Engine
-- Extends the versioned commercial catalogue and immutable finance ledger.

CREATE TABLE IF NOT EXISTS public.commission_policy_versions (
  configuration_version_id VARCHAR(160) NOT NULL
    REFERENCES public.commercial_configuration_versions(id) ON DELETE CASCADE,
  id VARCHAR(160) NOT NULL,
  code VARCHAR(160) NOT NULL,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  name TEXT NOT NULL CHECK (length(name) > 0),
  description TEXT NOT NULL DEFAULT '',
  policy_type VARCHAR(20) NOT NULL CHECK (policy_type IN ('base','adjustment')),
  status VARCHAR(30) NOT NULL CHECK (status IN (
    'draft','pending_approval','approved','scheduled','active','disabled','archived'
  )),
  effective_from TIMESTAMPTZ,
  effective_until TIMESTAMPTZ,
  rollout_bps INTEGER NOT NULL DEFAULT 10000 CHECK (rollout_bps BETWEEN 0 AND 10000),
  snapshot JSONB NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (configuration_version_id, id),
  UNIQUE (configuration_version_id, code),
  CHECK (effective_until IS NULL OR effective_from IS NULL OR effective_until > effective_from)
);
CREATE INDEX IF NOT EXISTS commission_policy_resolution_idx
  ON public.commission_policy_versions
  (configuration_version_id, status, effective_from DESC, effective_until);

CREATE TABLE IF NOT EXISTS public.commission_rule_versions (
  configuration_version_id VARCHAR(160) NOT NULL,
  id VARCHAR(180) NOT NULL,
  policy_id VARCHAR(160) NOT NULL,
  name TEXT NOT NULL CHECK (length(name) > 0),
  description TEXT NOT NULL DEFAULT '',
  priority INTEGER NOT NULL DEFAULT 0 CHECK (priority BETWEEN 0 AND 100000),
  scope JSONB NOT NULL CHECK (jsonb_typeof(scope) = 'object'),
  effect JSONB NOT NULL CHECK (jsonb_typeof(effect) = 'object'),
  effective_from TIMESTAMPTZ,
  effective_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (configuration_version_id, id),
  FOREIGN KEY (configuration_version_id, policy_id)
    REFERENCES public.commission_policy_versions(configuration_version_id, id)
    ON DELETE CASCADE,
  CHECK (effective_until IS NULL OR effective_from IS NULL OR effective_until > effective_from)
);
CREATE INDEX IF NOT EXISTS commission_rule_resolution_idx
  ON public.commission_rule_versions
  (configuration_version_id, priority DESC, effective_from DESC, effective_until);
CREATE INDEX IF NOT EXISTS commission_rule_scope_gin_idx
  ON public.commission_rule_versions USING GIN (scope jsonb_path_ops);

CREATE OR REPLACE FUNCTION public.sync_commission_catalog_snapshot()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  policy JSONB;
  rule JSONB;
BEGIN
  DELETE FROM public.commission_rule_versions
  WHERE configuration_version_id = NEW.id;
  DELETE FROM public.commission_policy_versions
  WHERE configuration_version_id = NEW.id;

  FOR policy IN
    SELECT value FROM jsonb_array_elements(
      COALESCE(NEW.snapshot->'commissionPolicies', '[]'::JSONB)
    )
  LOOP
    INSERT INTO public.commission_policy_versions (
      configuration_version_id, id, code, version_number, name, description,
      policy_type, status, effective_from, effective_until, rollout_bps, snapshot
    ) VALUES (
      NEW.id, policy->>'id', policy->>'code',
      COALESCE((policy->>'versionNumber')::INTEGER, NEW.version_number),
      policy->>'name', COALESCE(policy->>'description',''),
      policy->>'policyType', policy->>'status',
      NULLIF(policy->>'effectiveFrom','')::TIMESTAMPTZ,
      NULLIF(policy->>'effectiveUntil','')::TIMESTAMPTZ,
      COALESCE((policy->>'rolloutBps')::INTEGER, 10000), policy
    );

    FOR rule IN SELECT value FROM jsonb_array_elements(policy->'rules')
    LOOP
      INSERT INTO public.commission_rule_versions (
        configuration_version_id, id, policy_id, name, description, priority,
        scope, effect, effective_from, effective_until
      ) VALUES (
        NEW.id, rule->>'id', policy->>'id', rule->>'name',
        COALESCE(rule->>'description',''), COALESCE((rule->>'priority')::INTEGER,0),
        rule->'scope', rule->'effect',
        NULLIF(rule->>'effectiveFrom','')::TIMESTAMPTZ,
        NULLIF(rule->>'effectiveUntil','')::TIMESTAMPTZ
      );
    END LOOP;
  END LOOP;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS commercial_configuration_sync_commissions
  ON public.commercial_configuration_versions;
CREATE CONSTRAINT TRIGGER commercial_configuration_sync_commissions
AFTER INSERT OR UPDATE OF snapshot ON public.commercial_configuration_versions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.sync_commission_catalog_snapshot();

CREATE TABLE IF NOT EXISTS public.commission_calculations (
  id VARCHAR(100) PRIMARY KEY,
  idempotency_key VARCHAR(240) UNIQUE,
  configuration_version_id VARCHAR(160) NOT NULL
    REFERENCES public.commercial_configuration_versions(id) ON DELETE RESTRICT,
  transaction_id VARCHAR(160),
  order_id VARCHAR(160),
  account_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE RESTRICT,
  policy_id VARCHAR(160),
  policy_version_id VARCHAR(160),
  rule_id VARCHAR(180),
  state VARCHAR(30) NOT NULL CHECK (state IN (
    'quoted','earned','partially_reversed','reversed','cancelled'
  )),
  eligible BOOLEAN NOT NULL,
  reason_code VARCHAR(100) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  base_amount_minor BIGINT NOT NULL CHECK (base_amount_minor >= 0),
  gross_commission_minor BIGINT NOT NULL CHECK (gross_commission_minor >= 0),
  adjustment_minor BIGINT NOT NULL CHECK (adjustment_minor >= 0),
  net_commission_excluding_tax_minor BIGINT NOT NULL CHECK (net_commission_excluding_tax_minor >= 0),
  commission_tax_minor BIGINT NOT NULL CHECK (commission_tax_minor >= 0),
  total_commission_minor BIGINT NOT NULL CHECK (total_commission_minor >= 0),
  seller_charge_minor BIGINT NOT NULL CHECK (seller_charge_minor >= 0),
  buyer_charge_minor BIGINT NOT NULL CHECK (buyer_charge_minor >= 0),
  platform_absorbed_minor BIGINT NOT NULL CHECK (platform_absorbed_minor >= 0),
  platform_revenue_minor BIGINT NOT NULL CHECK (platform_revenue_minor >= 0),
  seller_payable_minor BIGINT NOT NULL CHECK (seller_payable_minor >= 0),
  buyer_total_minor BIGINT NOT NULL CHECK (buyer_total_minor >= 0),
  applied_adjustment_rule_ids JSONB NOT NULL DEFAULT '[]'::JSONB
    CHECK (jsonb_typeof(applied_adjustment_rule_ids) = 'array'),
  snapshot JSONB NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  snapshot_hash VARCHAR(128) NOT NULL,
  calculated_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (seller_charge_minor + buyer_charge_minor + platform_absorbed_minor = total_commission_minor),
  CHECK (expires_at IS NULL OR expires_at > calculated_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS commission_calculation_transaction_idx
  ON public.commission_calculations (transaction_id)
  WHERE transaction_id IS NOT NULL AND state <> 'cancelled';
CREATE INDEX IF NOT EXISTS commission_calculation_order_idx
  ON public.commission_calculations (order_id, calculated_at DESC)
  WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS commission_calculation_policy_period_idx
  ON public.commission_calculations
  (policy_id, currency, calculated_at DESC, id DESC)
  WHERE eligible;
CREATE INDEX IF NOT EXISTS commission_calculation_account_period_idx
  ON public.commission_calculations (account_id, calculated_at DESC, id DESC)
  WHERE account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS commission_calculation_organization_period_idx
  ON public.commission_calculations (organization_id, calculated_at DESC, id DESC)
  WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS commission_calculation_snapshot_gin_idx
  ON public.commission_calculations USING GIN (snapshot jsonb_path_ops);

CREATE TABLE IF NOT EXISTS public.commission_reversals (
  id VARCHAR(120) PRIMARY KEY,
  calculation_id VARCHAR(100) NOT NULL
    REFERENCES public.commission_calculations(id) ON DELETE RESTRICT,
  idempotency_key VARCHAR(240) NOT NULL UNIQUE,
  reversed_base_minor BIGINT NOT NULL CHECK (reversed_base_minor >= 0),
  reversed_commission_minor BIGINT NOT NULL CHECK (reversed_commission_minor >= 0),
  reversed_tax_minor BIGINT NOT NULL CHECK (reversed_tax_minor >= 0),
  seller_credit_minor BIGINT NOT NULL CHECK (seller_credit_minor >= 0),
  buyer_credit_minor BIGINT NOT NULL CHECK (buyer_credit_minor >= 0),
  platform_revenue_reversal_minor BIGINT NOT NULL CHECK (platform_revenue_reversal_minor >= 0),
  state VARCHAR(30) NOT NULL CHECK (state IN (
    'partially_reversed','reversed','retained','manual_review'
  )),
  snapshot JSONB NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  snapshot_hash VARCHAR(128) NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS commission_reversal_calculation_idx
  ON public.commission_reversals (calculation_id, occurred_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS commission_reversal_review_idx
  ON public.commission_reversals (occurred_at, id)
  WHERE state = 'manual_review';

CREATE OR REPLACE FUNCTION public.enforce_commission_reversal_balance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  original_base BIGINT;
  already_reversed BIGINT;
BEGIN
  IF NEW.state = 'manual_review' THEN RETURN NEW; END IF;
  SELECT base_amount_minor INTO original_base
  FROM public.commission_calculations
  WHERE id = NEW.calculation_id
  FOR UPDATE;
  SELECT COALESCE(SUM(reversed_base_minor), 0) INTO already_reversed
  FROM public.commission_reversals
  WHERE calculation_id = NEW.calculation_id
    AND state <> 'manual_review';
  IF already_reversed + NEW.reversed_base_minor > original_base THEN
    RAISE EXCEPTION 'cumulative commission reversal exceeds original base'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS validate_commission_reversal_balance
  ON public.commission_reversals;
CREATE TRIGGER validate_commission_reversal_balance
BEFORE INSERT ON public.commission_reversals
FOR EACH ROW EXECUTE FUNCTION public.enforce_commission_reversal_balance();

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS commission_calculation_id VARCHAR(100)
    REFERENCES public.commission_calculations(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS platform_commission_minor BIGINT
    CHECK (platform_commission_minor IS NULL OR platform_commission_minor >= 0),
  ADD COLUMN IF NOT EXISTS seller_payable_minor BIGINT
    CHECK (seller_payable_minor IS NULL OR seller_payable_minor >= 0),
  ADD COLUMN IF NOT EXISTS commission_snapshot_hash VARCHAR(128);
CREATE INDEX IF NOT EXISTS orders_commission_calculation_idx
  ON public.orders (commission_calculation_id)
  WHERE commission_calculation_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.prevent_commission_history_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'commission financial history is immutable; append a reversal instead'
    USING ERRCODE = '55000';
END;
$$;

DROP TRIGGER IF EXISTS immutable_commission_calculations ON public.commission_calculations;
CREATE TRIGGER immutable_commission_calculations
BEFORE UPDATE OR DELETE ON public.commission_calculations
FOR EACH ROW EXECUTE FUNCTION public.prevent_commission_history_mutation();
DROP TRIGGER IF EXISTS immutable_commission_reversals ON public.commission_reversals;
CREATE TRIGGER immutable_commission_reversals
BEFORE UPDATE OR DELETE ON public.commission_reversals
FOR EACH ROW EXECUTE FUNCTION public.prevent_commission_history_mutation();

CREATE OR REPLACE FUNCTION public.post_commission_calculation_to_ledger(
  p_calculation_id VARCHAR
) RETURNS public.finance_transactions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target public.commission_calculations%ROWTYPE;
  entries JSONB := '[]'::JSONB;
  billed_minor BIGINT;
  billed_tax_minor BIGINT;
  market_code VARCHAR(2);
BEGIN
  SELECT * INTO target FROM public.commission_calculations
  WHERE id = p_calculation_id;
  IF NOT FOUND OR NOT target.eligible OR target.state <> 'earned' THEN RETURN NULL; END IF;

  billed_minor := target.seller_charge_minor + target.buyer_charge_minor;
  IF billed_minor <= 0 THEN RETURN NULL; END IF;
  billed_tax_minor := billed_minor - target.platform_revenue_minor;
  market_code := target.snapshot->'inputSnapshot'->>'marketCode';

  IF target.seller_charge_minor > 0 THEN
    entries := entries || jsonb_build_array(jsonb_build_object(
      'accountCode','4670','side','debit','amountMinor',target.seller_charge_minor,
      'currency',target.currency
    ));
  END IF;
  IF target.buyer_charge_minor > 0 THEN
    entries := entries || jsonb_build_array(jsonb_build_object(
      'accountCode','1100','side','debit','amountMinor',target.buyer_charge_minor,
      'currency',target.currency
    ));
  END IF;
  IF target.platform_revenue_minor > 0 THEN
    entries := entries || jsonb_build_array(jsonb_build_object(
      'accountCode','7064','side','credit','amountMinor',target.platform_revenue_minor,
      'currency',target.currency
    ));
  END IF;
  IF billed_tax_minor > 0 THEN
    entries := entries || jsonb_build_array(jsonb_build_object(
      'accountCode','4457','side','credit','amountMinor',billed_tax_minor,
      'currency',target.currency
    ));
  END IF;

  RETURN public.post_finance_transaction(
    'COM-' || upper(substring(md5(target.id), 1, 16)), 'commission',
    target.account_id, target.organization_id, market_code, target.currency,
    billed_minor, target.platform_revenue_minor,
    'Commission plateforme — ' || COALESCE(target.policy_id, 'politique inconnue'),
    NULL, NULL, target.order_id, NULL, 'commission_calculations', target.id,
    'commission-ledger:' || target.id, target.calculated_at, entries, NULL, NULL,
    jsonb_build_object(
      'calculationId', target.id,
      'policyId', target.policy_id,
      'ruleId', target.rule_id,
      'snapshotHash', target.snapshot_hash,
      'gmvMinor', (target.snapshot->'inputSnapshot'->>'itemSubtotalMinor')::BIGINT
    ), 'posted'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.project_earned_commission_to_finance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.post_commission_calculation_to_ledger(NEW.id);
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS commission_finance_projection ON public.commission_calculations;
CREATE TRIGGER commission_finance_projection
AFTER INSERT ON public.commission_calculations
FOR EACH ROW WHEN (NEW.state = 'earned' AND NEW.eligible)
EXECUTE FUNCTION public.project_earned_commission_to_finance();

CREATE OR REPLACE FUNCTION public.post_commission_reversal_to_ledger(
  p_reversal_id VARCHAR
) RETURNS public.finance_transactions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  reversal public.commission_reversals%ROWTYPE;
  target public.commission_calculations%ROWTYPE;
  source_finance public.finance_transactions%ROWTYPE;
  entries JSONB := '[]'::JSONB;
  credited_minor BIGINT;
  tax_reversal_minor BIGINT;
  market_code VARCHAR(2);
BEGIN
  SELECT * INTO reversal FROM public.commission_reversals WHERE id = p_reversal_id;
  IF NOT FOUND OR reversal.state = 'manual_review' THEN RETURN NULL; END IF;
  SELECT * INTO target FROM public.commission_calculations WHERE id = reversal.calculation_id;
  SELECT * INTO source_finance FROM public.finance_transactions
    WHERE source_table = 'commission_calculations' AND source_id = target.id;

  credited_minor := reversal.seller_credit_minor + reversal.buyer_credit_minor;
  IF credited_minor <= 0 THEN RETURN NULL; END IF;
  tax_reversal_minor := credited_minor - reversal.platform_revenue_reversal_minor;
  market_code := target.snapshot->'inputSnapshot'->>'marketCode';

  IF reversal.platform_revenue_reversal_minor > 0 THEN
    entries := entries || jsonb_build_array(jsonb_build_object(
      'accountCode','7091','side','debit','amountMinor',reversal.platform_revenue_reversal_minor,
      'currency',target.currency
    ));
  END IF;
  IF tax_reversal_minor > 0 THEN
    entries := entries || jsonb_build_array(jsonb_build_object(
      'accountCode','4457','side','debit','amountMinor',tax_reversal_minor,
      'currency',target.currency
    ));
  END IF;
  IF reversal.seller_credit_minor > 0 THEN
    entries := entries || jsonb_build_array(jsonb_build_object(
      'accountCode','4670','side','credit','amountMinor',reversal.seller_credit_minor,
      'currency',target.currency
    ));
  END IF;
  IF reversal.buyer_credit_minor > 0 THEN
    entries := entries || jsonb_build_array(jsonb_build_object(
      'accountCode','1100','side','credit','amountMinor',reversal.buyer_credit_minor,
      'currency',target.currency
    ));
  END IF;

  RETURN public.post_finance_transaction(
    'COM-REV-' || upper(substring(md5(reversal.id), 1, 12)), 'refund',
    target.account_id, target.organization_id, market_code, target.currency,
    credited_minor, reversal.platform_revenue_reversal_minor,
    'Annulation de commission plateforme', NULL, NULL, target.order_id, NULL,
    'commission_reversals', reversal.id, 'commission-reversal-ledger:' || reversal.id,
    reversal.occurred_at, entries, NULL, source_finance.id,
    jsonb_build_object(
      'calculationId', target.id,
      'reversalId', reversal.id,
      'snapshotHash', reversal.snapshot_hash
    ), 'posted'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.project_commission_reversal_to_finance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.post_commission_reversal_to_ledger(NEW.id);
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS commission_reversal_finance_projection ON public.commission_reversals;
CREATE TRIGGER commission_reversal_finance_projection
AFTER INSERT ON public.commission_reversals
FOR EACH ROW WHEN (NEW.state <> 'manual_review')
EXECUTE FUNCTION public.project_commission_reversal_to_finance();

CREATE OR REPLACE VIEW public.commission_analytics_daily
WITH (security_invoker = true) AS
SELECT
  date_trunc('day', calculation.calculated_at)::DATE AS date,
  calculation.snapshot->'inputSnapshot'->>'marketCode' AS market_code,
  calculation.snapshot->'inputSnapshot'->>'verticalId' AS vertical_id,
  calculation.snapshot->'inputSnapshot'->>'categoryId' AS category_id,
  calculation.snapshot->'inputSnapshot'->>'planId' AS plan_id,
  calculation.currency,
  COUNT(*)::BIGINT AS transaction_count,
  COALESCE(SUM((calculation.snapshot->'inputSnapshot'->>'itemSubtotalMinor')::BIGINT),0)::BIGINT AS gmv_minor,
  COALESCE(SUM(calculation.gross_commission_minor),0)::BIGINT AS gross_commission_minor,
  COALESCE(SUM(calculation.adjustment_minor),0)::BIGINT AS commission_discount_minor,
  COALESCE(SUM(calculation.platform_revenue_minor),0)::BIGINT AS commission_revenue_minor,
  COALESCE(SUM(reversal.platform_revenue_reversal_minor),0)::BIGINT AS commission_refund_minor,
  CASE
    WHEN SUM((calculation.snapshot->'inputSnapshot'->>'itemSubtotalMinor')::BIGINT) = 0 THEN 0
    ELSE ROUND(
      10000.0 *
      (SUM(calculation.platform_revenue_minor) - COALESCE(SUM(reversal.platform_revenue_reversal_minor),0)) /
      SUM((calculation.snapshot->'inputSnapshot'->>'itemSubtotalMinor')::BIGINT)
    )::INTEGER
  END AS effective_take_rate_bps
FROM public.commission_calculations calculation
LEFT JOIN (
  SELECT calculation_id,
    SUM(platform_revenue_reversal_minor)::BIGINT AS platform_revenue_reversal_minor
  FROM public.commission_reversals
  WHERE state <> 'manual_review'
  GROUP BY calculation_id
) reversal ON reversal.calculation_id = calculation.id
WHERE calculation.eligible AND calculation.state <> 'cancelled'
GROUP BY 1,2,3,4,5,6;

ALTER TABLE public.commission_policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_rule_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_reversals ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.commission_policy_versions FROM anon, authenticated;
REVOKE ALL ON public.commission_rule_versions FROM anon, authenticated;
REVOKE ALL ON public.commission_calculations FROM anon, authenticated;
REVOKE ALL ON public.commission_reversals FROM anon, authenticated;
REVOKE ALL ON public.commission_analytics_daily FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_commission_catalog_snapshot() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_commission_reversal_balance() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_commission_history_mutation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.project_earned_commission_to_finance() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.project_commission_reversal_to_finance() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.post_commission_calculation_to_ledger(VARCHAR) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.post_commission_reversal_to_ledger(VARCHAR) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.post_commission_calculation_to_ledger(VARCHAR) TO service_role;
GRANT EXECUTE ON FUNCTION public.post_commission_reversal_to_ledger(VARCHAR) TO service_role;

-- Expand/backfill: convert the three legacy generic commission-rate rules into
-- rich policies before contracting the old Courses configuration column.
UPDATE public.commercial_configuration_versions configuration
SET snapshot = jsonb_set(
  jsonb_set(
    configuration.snapshot,
    '{rules}',
    COALESCE((
      SELECT jsonb_agg(rule)
      FROM jsonb_array_elements(COALESCE(configuration.snapshot->'rules','[]'::JSONB)) rule
      WHERE rule->>'key' NOT IN (
        'commission.seller.individual',
        'commission.seller.professional',
        'commission.courses.fr'
      )
    ), '[]'::JSONB)
  ),
  '{commissionPolicies}',
  jsonb_build_array(
    jsonb_build_object(
      'id','commission-policy-marketplace-pro-fr',
      'code','marketplace.professional.fr',
      'versionId',configuration.id,
      'versionNumber',configuration.version_number,
      'name','Transactions marketplace professionnelles — France',
      'description','Taux professionnel migré vers le moteur canonique.',
      'policyType','base',
      'status',CASE WHEN configuration.status = 'active' THEN 'active' ELSE configuration.status END,
      'effectiveFrom',COALESCE(configuration.effective_from, configuration.created_at),
      'rolloutBps',10000,
      'rules',jsonb_build_array(jsonb_build_object(
        'id','commission-rule-marketplace-pro-fr',
        'policyId','commission-policy-marketplace-pro-fr',
        'versionId',configuration.id,
        'name','Professionnel marketplace France',
        'description','Commission historique migrée sans changement du montant vendeur.',
        'priority',400,
        'scope',jsonb_build_object(
          'countryCodes',jsonb_build_array('FR'),'marketCodes',jsonb_build_array('FR'),
          'currencies',jsonb_build_array('EUR'),'verticalIds','[]'::JSONB,
          'categoryIds','[]'::JSONB,'subcategoryIds','[]'::JSONB,
          'transactionTypes',jsonb_build_array('marketplace_order'),
          'sellerTypes',jsonb_build_array('professional','organization'),
          'sellerSegments','[]'::JSONB,'planIds','[]'::JSONB,
          'organizationIds','[]'::JSONB,'accountIds','[]'::JSONB,
          'campaignIds','[]'::JSONB,'paymentMethods','[]'::JSONB
        ),
        'effect',jsonb_build_object(
          'kind','commission','base','item_subtotal',
          'model',jsonb_build_object(
            'type','percentage','rateBps',COALESCE((
              SELECT (rule->'outcome'->>'commissionRateBps')::INTEGER
              FROM jsonb_array_elements(COALESCE(configuration.snapshot->'rules','[]'::JSONB)) rule
              WHERE rule->>'key' = 'commission.seller.professional' LIMIT 1
            ),0)
          ),
          'allocation',jsonb_build_object('sellerBps',10000,'buyerBps',0,'platformAbsorbedBps',0),
          'tax',jsonb_build_object('mode','inclusive','rateBps',2000),
          'roundingMode','half_up','earningEvent','payment_succeeded',
          'refundPolicy','proportional'
        ),
        'effectiveFrom',COALESCE(configuration.effective_from, configuration.created_at)
      ))
    ),
    jsonb_build_object(
      'id','commission-policy-courses-fr','code','courses.booking.fr',
      'versionId',configuration.id,'versionNumber',configuration.version_number,
      'name','Réservations Cours — France',
      'description','Taux Cours migré et conservé désactivé tant que la chaîne financière est indisponible.',
      'policyType','base','status','disabled',
      'effectiveFrom',COALESCE(configuration.effective_from, configuration.created_at),
      'rolloutBps',0,
      'rules',jsonb_build_array(jsonb_build_object(
        'id','commission-rule-courses-fr','policyId','commission-policy-courses-fr',
        'versionId',configuration.id,'name','Réservation Cours France',
        'description','Commission historique de réservation Cours.',
        'priority',650,
        'scope',jsonb_build_object(
          'countryCodes',jsonb_build_array('FR'),'marketCodes',jsonb_build_array('FR'),
          'currencies',jsonb_build_array('EUR'),'verticalIds',jsonb_build_array('cours'),
          'categoryIds',jsonb_build_array('services.tutoring'),'subcategoryIds','[]'::JSONB,
          'transactionTypes',jsonb_build_array('course_booking'),
          'sellerTypes','[]'::JSONB,'sellerSegments','[]'::JSONB,'planIds','[]'::JSONB,
          'organizationIds','[]'::JSONB,'accountIds','[]'::JSONB,
          'campaignIds','[]'::JSONB,'paymentMethods','[]'::JSONB
        ),
        'effect',jsonb_build_object(
          'kind','commission','base','subtotal_after_discount',
          'model',jsonb_build_object(
            'type','percentage','rateBps',COALESCE((
              SELECT (rule->'outcome'->>'commissionRateBps')::INTEGER
              FROM jsonb_array_elements(COALESCE(configuration.snapshot->'rules','[]'::JSONB)) rule
              WHERE rule->>'key' = 'commission.courses.fr' LIMIT 1
            ),COALESCE((SELECT commission_rate_bps FROM public.course_market_configs WHERE market_code = 'FR'),0))
          ),
          'allocation',jsonb_build_object('sellerBps',10000,'buyerBps',0,'platformAbsorbedBps',0),
          'tax',jsonb_build_object('mode','inclusive','rateBps',2000),
          'roundingMode','half_up','earningEvent','service_completed',
          'refundPolicy','proportional'
        ),
        'effectiveFrom',COALESCE(configuration.effective_from, configuration.created_at)
      ))
    )
  )
)
WHERE NOT (configuration.snapshot ? 'commissionPolicies');

-- Populate normalized policies for every retained immutable catalogue snapshot.
UPDATE public.commercial_configuration_versions SET snapshot = snapshot;

ALTER TABLE public.course_market_configs
  DROP COLUMN IF EXISTS commission_rate_bps;

COMMENT ON TABLE public.commission_calculations IS
  'Append-only authoritative commission snapshots. Historical amounts are reversed, never recomputed or mutated.';
COMMENT ON VIEW public.commission_analytics_daily IS
  'GMV, commission revenue, discounts, refunds and effective take rate without treating GMV as platform revenue.';
