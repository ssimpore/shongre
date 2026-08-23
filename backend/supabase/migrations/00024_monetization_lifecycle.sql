-- =============================================================================
-- MONETIZATION LIFECYCLE, BILLING LEDGERS & RECONCILIATION
-- Migration 00024 — expand-first. Completes the operational model introduced
-- by 00015 without replacing the versioned catalog, quote or order tables.
-- All authoritative money remains integer minor units and all evidence ledgers
-- are append-only. Browser roles keep deny-by-default access.
-- =============================================================================

ALTER TABLE public.monetization_prices
  ADD COLUMN IF NOT EXISTS provider_price_id VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS monetization_prices_provider_price_idx
  ON public.monetization_prices (provider_price_id)
  WHERE provider_price_id IS NOT NULL;

UPDATE public.monetization_prices stored_price
SET provider_price_id = NULLIF(price->>'providerPriceId', '')
FROM public.commercial_configuration_versions version,
     LATERAL jsonb_array_elements(version.snapshot->'products') product,
     LATERAL jsonb_array_elements(product->'prices') price
WHERE stored_price.id = price->>'id'
  AND NULLIF(price->>'providerPriceId', '') IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_monetization_provider_price_ids()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.monetization_prices stored_price
  SET provider_price_id = NULLIF(price->>'providerPriceId', '')
  FROM LATERAL jsonb_array_elements(NEW.snapshot->'products') product,
       LATERAL jsonb_array_elements(product->'prices') price
  WHERE stored_price.id = price->>'id'
    AND NULLIF(price->>'providerPriceId', '') IS NOT NULL;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS commercial_configuration_sync_provider_prices
  ON public.commercial_configuration_versions;
CREATE CONSTRAINT TRIGGER commercial_configuration_sync_provider_prices
AFTER INSERT OR UPDATE OF snapshot ON public.commercial_configuration_versions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.sync_monetization_provider_price_ids();

ALTER TABLE public.monetization_subscriptions
  ADD COLUMN IF NOT EXISTS product_version_id VARCHAR(240)
    REFERENCES public.monetization_product_versions(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS price_id VARCHAR(260)
    REFERENCES public.monetization_prices(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS billing_period VARCHAR(20),
  ADD COLUMN IF NOT EXISTS trial_starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_effective_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_product_id VARCHAR(180)
    REFERENCES public.monetization_products(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS scheduled_price_id VARCHAR(260)
    REFERENCES public.monetization_prices(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS scheduled_change_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provider_state JSONB NOT NULL DEFAULT '{}'::JSONB;

ALTER TABLE public.monetization_subscriptions
  DROP CONSTRAINT IF EXISTS monetization_subscriptions_status_check,
  ADD CONSTRAINT monetization_subscriptions_status_check CHECK (status IN (
    'incomplete','trialing','active','past_due','paused',
    'cancellation_pending','cancelled','expired','suspended'
  ));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'monetization_subscriptions_billing_period_check'
      AND conrelid = 'public.monetization_subscriptions'::REGCLASS
  ) THEN
    ALTER TABLE public.monetization_subscriptions
      ADD CONSTRAINT monetization_subscriptions_billing_period_check
      CHECK (billing_period IS NULL OR billing_period IN ('month','year'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'monetization_subscriptions_trial_window_check'
      AND conrelid = 'public.monetization_subscriptions'::REGCLASS
  ) THEN
    ALTER TABLE public.monetization_subscriptions
      ADD CONSTRAINT monetization_subscriptions_trial_window_check
      CHECK (trial_ends_at IS NULL OR trial_starts_at IS NULL OR trial_ends_at > trial_starts_at);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'monetization_subscriptions_scheduled_change_check'
      AND conrelid = 'public.monetization_subscriptions'::REGCLASS
  ) THEN
    ALTER TABLE public.monetization_subscriptions
      ADD CONSTRAINT monetization_subscriptions_scheduled_change_check
      CHECK (
        (scheduled_product_id IS NULL AND scheduled_price_id IS NULL AND scheduled_change_at IS NULL)
        OR (scheduled_product_id IS NOT NULL AND scheduled_price_id IS NOT NULL AND scheduled_change_at IS NOT NULL)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS monetization_subscriptions_account_state_idx
  ON public.monetization_subscriptions (account_id, status, current_period_end DESC);
CREATE INDEX IF NOT EXISTS monetization_subscriptions_scheduled_idx
  ON public.monetization_subscriptions (scheduled_change_at, status)
  WHERE scheduled_change_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS monetization_subscriptions_grace_idx
  ON public.monetization_subscriptions (grace_period_ends_at, status)
  WHERE status = 'past_due';

CREATE TABLE IF NOT EXISTS public.monetization_billing_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE RESTRICT,
  legal_name VARCHAR(240) NOT NULL,
  email VARCHAR(320) NOT NULL,
  tax_id VARCHAR(80),
  tax_exempt BOOLEAN NOT NULL DEFAULT FALSE,
  billing_address JSONB CHECK (billing_address IS NULL OR jsonb_typeof(billing_address) = 'object'),
  provider VARCHAR(30) NOT NULL DEFAULT 'stripe' CHECK (provider IN ('demo','stripe')),
  provider_customer_id VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS monetization_billing_customer_provider_idx
  ON public.monetization_billing_customers (provider, provider_customer_id)
  WHERE provider_customer_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.monetization_subscription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.monetization_subscriptions(id) ON DELETE RESTRICT,
  product_id VARCHAR(180) NOT NULL REFERENCES public.monetization_products(id) ON DELETE RESTRICT,
  product_version_id VARCHAR(240) NOT NULL REFERENCES public.monetization_product_versions(id) ON DELETE RESTRICT,
  price_id VARCHAR(260) NOT NULL REFERENCES public.monetization_prices(id) ON DELETE RESTRICT,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('scheduled','active','cancelled','expired')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at IS NULL OR ends_at > starts_at),
  UNIQUE (subscription_id, product_id, starts_at)
);
CREATE INDEX IF NOT EXISTS monetization_subscription_items_subscription_idx
  ON public.monetization_subscription_items (subscription_id, status, ends_at);
CREATE INDEX IF NOT EXISTS monetization_subscription_items_price_idx
  ON public.monetization_subscription_items (price_id);

CREATE TABLE IF NOT EXISTS public.monetization_payments (
  id VARCHAR(80) PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  order_id VARCHAR(80) NOT NULL REFERENCES public.monetization_orders(id) ON DELETE RESTRICT,
  status VARCHAR(30) NOT NULL CHECK (status IN (
    'pending','requires_action','succeeded','failed','cancelled',
    'partially_refunded','refunded'
  )),
  amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0),
  currency VARCHAR(3) NOT NULL,
  provider VARCHAR(30) NOT NULL CHECK (provider IN ('demo','stripe')),
  provider_payment_id VARCHAR(255),
  failure_code VARCHAR(120),
  failure_message TEXT,
  idempotency_key VARCHAR(200) NOT NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS monetization_payments_account_status_idx
  ON public.monetization_payments (account_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS monetization_payments_order_idx
  ON public.monetization_payments (order_id);
CREATE UNIQUE INDEX IF NOT EXISTS monetization_payments_provider_idx
  ON public.monetization_payments (provider, provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.monetization_invoices (
  id VARCHAR(80) PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  order_id VARCHAR(80) REFERENCES public.monetization_orders(id) ON DELETE RESTRICT,
  subscription_id UUID REFERENCES public.monetization_subscriptions(id) ON DELETE RESTRICT,
  invoice_number VARCHAR(80) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('draft','open','paid','void','uncollectible')),
  currency VARCHAR(3) NOT NULL,
  subtotal_minor BIGINT NOT NULL CHECK (subtotal_minor >= 0),
  discount_minor BIGINT NOT NULL DEFAULT 0 CHECK (discount_minor >= 0 AND discount_minor <= subtotal_minor),
  tax_minor BIGINT NOT NULL DEFAULT 0 CHECK (tax_minor >= 0),
  total_minor BIGINT NOT NULL CHECK (total_minor >= 0),
  amount_paid_minor BIGINT NOT NULL DEFAULT 0 CHECK (amount_paid_minor >= 0),
  amount_due_minor BIGINT NOT NULL DEFAULT 0 CHECK (amount_due_minor >= 0),
  provider VARCHAR(30) NOT NULL CHECK (provider IN ('demo','stripe')),
  provider_invoice_id VARCHAR(255),
  receipt_url TEXT,
  issued_at TIMESTAMPTZ NOT NULL,
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (total_minor = subtotal_minor - discount_minor + tax_minor),
  CHECK (amount_paid_minor + amount_due_minor = total_minor)
);
CREATE INDEX IF NOT EXISTS monetization_invoices_account_issued_idx
  ON public.monetization_invoices (account_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS monetization_invoices_order_idx
  ON public.monetization_invoices (order_id);
CREATE INDEX IF NOT EXISTS monetization_invoices_subscription_idx
  ON public.monetization_invoices (subscription_id, issued_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS monetization_invoices_provider_idx
  ON public.monetization_invoices (provider, provider_invoice_id)
  WHERE provider_invoice_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.monetization_invoice_lines (
  invoice_id VARCHAR(80) NOT NULL REFERENCES public.monetization_invoices(id) ON DELETE RESTRICT,
  line_number SMALLINT NOT NULL CHECK (line_number > 0),
  product_id VARCHAR(180) REFERENCES public.monetization_products(id) ON DELETE RESTRICT,
  description TEXT NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_amount_minor BIGINT NOT NULL CHECK (unit_amount_minor >= 0),
  subtotal_minor BIGINT NOT NULL CHECK (subtotal_minor >= 0),
  tax_rate_bps INT NOT NULL CHECK (tax_rate_bps BETWEEN 0 AND 10000),
  tax_minor BIGINT NOT NULL CHECK (tax_minor >= 0),
  total_minor BIGINT NOT NULL CHECK (total_minor = subtotal_minor + tax_minor),
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (invoice_id, line_number),
  CHECK (period_end IS NULL OR period_start IS NULL OR period_end > period_start)
);

CREATE TABLE IF NOT EXISTS public.monetization_refunds (
  id VARCHAR(80) PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  order_id VARCHAR(80) NOT NULL REFERENCES public.monetization_orders(id) ON DELETE RESTRICT,
  payment_id VARCHAR(80) NOT NULL REFERENCES public.monetization_payments(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending','succeeded','failed','cancelled')),
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency VARCHAR(3) NOT NULL,
  reason TEXT NOT NULL CHECK (length(reason) >= 3),
  provider VARCHAR(30) NOT NULL CHECK (provider IN ('demo','stripe')),
  provider_refund_id VARCHAR(255),
  requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  idempotency_key VARCHAR(200) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, idempotency_key),
  CHECK (approved_by IS NULL OR approved_by <> requested_by)
);
CREATE INDEX IF NOT EXISTS monetization_refunds_payment_idx
  ON public.monetization_refunds (payment_id, status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS monetization_refunds_provider_idx
  ON public.monetization_refunds (provider, provider_refund_id)
  WHERE provider_refund_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.monetization_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  credit_type VARCHAR(120) NOT NULL,
  quantity BIGINT NOT NULL CHECK (quantity <> 0),
  reason TEXT NOT NULL,
  source_type VARCHAR(30) NOT NULL CHECK (source_type IN (
    'subscription','purchase','promotion','usage','refund','admin_adjustment','expiry'
  )),
  source_id VARCHAR(180),
  expires_at TIMESTAMPTZ,
  idempotency_key VARCHAR(200) NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS monetization_credits_balance_idx
  ON public.monetization_credit_transactions (account_id, credit_type, created_at);
CREATE INDEX IF NOT EXISTS monetization_credits_expiry_idx
  ON public.monetization_credit_transactions (expires_at, account_id, credit_type)
  WHERE expires_at IS NOT NULL AND quantity > 0;

CREATE OR REPLACE VIEW public.monetization_credit_balances AS
SELECT
  account_id,
  credit_type,
  COALESCE(SUM(quantity), 0)::BIGINT AS available,
  MIN(expires_at) FILTER (WHERE expires_at > NOW() AND quantity > 0) AS next_expiry_at
FROM public.monetization_credit_transactions
GROUP BY account_id, credit_type;

CREATE TABLE IF NOT EXISTS public.monetization_usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  subscription_id UUID REFERENCES public.monetization_subscriptions(id) ON DELETE RESTRICT,
  usage_key VARCHAR(160) NOT NULL,
  quantity BIGINT NOT NULL CHECK (quantity > 0),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  source_type VARCHAR(80) NOT NULL,
  source_id VARCHAR(180),
  idempotency_key VARCHAR(200) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, idempotency_key),
  CHECK (period_end > period_start)
);
CREATE INDEX IF NOT EXISTS monetization_usage_account_period_idx
  ON public.monetization_usage_records (account_id, usage_key, period_start, period_end);
CREATE INDEX IF NOT EXISTS monetization_usage_subscription_idx
  ON public.monetization_usage_records (subscription_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS public.monetization_subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.monetization_subscriptions(id) ON DELETE RESTRICT,
  account_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  event_type VARCHAR(40) NOT NULL CHECK (event_type IN (
    'created','trial_started','trial_ending','activated','renewal_upcoming','renewed',
    'payment_failed','past_due','change_scheduled','changed',
    'cancellation_scheduled','reactivated','cancelled','paused','resumed','expired'
  )),
  from_status VARCHAR(30),
  to_status VARCHAR(30),
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(metadata) = 'object'),
  idempotency_key VARCHAR(200) NOT NULL,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (subscription_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS monetization_subscription_events_account_idx
  ON public.monetization_subscription_events (account_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS monetization_subscription_events_type_idx
  ON public.monetization_subscription_events (event_type, occurred_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS notifications_subscription_event_once_idx
  ON public.notifications (user_id, type, ((metadata->>'subscriptionEventId')))
  WHERE metadata ? 'subscriptionEventId';

CREATE OR REPLACE FUNCTION public.notify_monetization_subscription_event()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  notification_type VARCHAR(50);
  notification_title VARCHAR(255);
  notification_body TEXT;
  plan_name TEXT;
  effective_date TEXT;
BEGIN
  SELECT COALESCE(product_version.name, subscription.product_id),
         to_char(COALESCE(subscription.scheduled_change_at,
                          subscription.cancellation_effective_at,
                          subscription.trial_ends_at,
                          subscription.current_period_end), 'DD/MM/YYYY')
  INTO plan_name, effective_date
  FROM public.monetization_subscriptions subscription
  LEFT JOIN public.monetization_product_versions product_version
    ON product_version.id = subscription.product_version_id
  WHERE subscription.id = NEW.subscription_id;

  CASE NEW.event_type
    WHEN 'activated' THEN
      notification_type := 'subscription.started';
      notification_title := 'Forfait Pro activé';
      notification_body := 'Votre abonnement ' || COALESCE(plan_name, 'Pro') || ' est actif.';
    WHEN 'trial_ending' THEN
      notification_type := 'subscription.trial_ending';
      notification_title := 'Votre essai se termine bientôt';
      notification_body := 'Votre période d’essai se termine le ' || effective_date || '.';
    WHEN 'renewal_upcoming' THEN
      notification_type := 'subscription.renewal_upcoming';
      notification_title := 'Renouvellement à venir';
      notification_body := 'Votre forfait sera renouvelé le ' || effective_date || '.';
    WHEN 'renewed' THEN
      notification_type := 'subscription.renewed';
      notification_title := 'Forfait renouvelé';
      notification_body := 'Votre forfait ' || COALESCE(plan_name, 'Pro') || ' a été renouvelé.';
    WHEN 'payment_failed' THEN
      notification_type := 'subscription.payment_failed';
      notification_title := 'Paiement à régulariser';
      notification_body := 'Le paiement de votre forfait a échoué. Mettez à jour votre moyen de paiement.';
    WHEN 'change_scheduled' THEN
      notification_type := 'subscription.changed';
      notification_title := 'Changement de forfait programmé';
      notification_body := 'Votre nouveau forfait prendra effet le ' || effective_date || '.';
    WHEN 'changed' THEN
      notification_type := 'subscription.changed';
      notification_title := 'Forfait mis à jour';
      notification_body := 'Votre changement de forfait est maintenant effectif.';
    WHEN 'cancellation_scheduled' THEN
      notification_type := 'subscription.cancellation_scheduled';
      notification_title := 'Résiliation programmée';
      notification_body := 'Votre forfait restera actif jusqu’au ' || effective_date || '. Vous pouvez encore le réactiver.';
    WHEN 'cancelled' THEN
      notification_type := 'subscription.cancelled';
      notification_title := 'Abonnement terminé';
      notification_body := 'Votre abonnement Pro est arrivé à son terme.';
    WHEN 'expired' THEN
      notification_type := 'subscription.expired';
      notification_title := 'Abonnement expiré';
      notification_body := 'Votre abonnement Pro a expiré.';
    ELSE
      RETURN NEW;
  END CASE;

  INSERT INTO public.notifications
    (user_id, type, title, body, link_url, metadata)
  VALUES
    (NEW.account_id, notification_type, notification_title, notification_body,
     '/solutions-pro', jsonb_build_object(
       'subscriptionEventId', NEW.id,
       'subscriptionId', NEW.subscription_id,
       'eventType', NEW.event_type
     ))
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS monetization_subscription_event_notification
  ON public.monetization_subscription_events;
CREATE TRIGGER monetization_subscription_event_notification
AFTER INSERT ON public.monetization_subscription_events
FOR EACH ROW EXECUTE FUNCTION public.notify_monetization_subscription_event();

CREATE TABLE IF NOT EXISTS public.monetization_tax_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  configuration_version_id VARCHAR(160) NOT NULL REFERENCES public.commercial_configuration_versions(id) ON DELETE CASCADE,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  country_code VARCHAR(2) NOT NULL,
  audience VARCHAR(30) NOT NULL CHECK (audience IN ('individual','professional','organization','all')),
  tax_code VARCHAR(80) NOT NULL,
  rate_bps INT NOT NULL CHECK (rate_bps BETWEEN 0 AND 10000),
  prices_include_tax BOOLEAN NOT NULL DEFAULT FALSE,
  reverse_charge_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  effective_from TIMESTAMPTZ NOT NULL,
  effective_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (configuration_version_id, market_code, country_code, audience, tax_code),
  CHECK (effective_until IS NULL OR effective_until > effective_from)
);
CREATE INDEX IF NOT EXISTS monetization_tax_rules_resolution_idx
  ON public.monetization_tax_rules (market_code, country_code, audience, effective_from DESC);

CREATE TABLE IF NOT EXISTS public.monetization_usage_limits (
  product_version_id VARCHAR(240) NOT NULL REFERENCES public.monetization_product_versions(id) ON DELETE CASCADE,
  usage_key VARCHAR(160) NOT NULL,
  limit_value BIGINT CHECK (limit_value IS NULL OR limit_value >= 0),
  reset_period VARCHAR(20) NOT NULL CHECK (reset_period IN ('none','day','month','year','billing_period')),
  enforcement VARCHAR(20) NOT NULL DEFAULT 'hard' CHECK (enforcement IN ('soft','hard')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (product_version_id, usage_key)
);

-- Evidence tables are append-only. Status-bearing operational headers remain
-- mutable only through backend services and the transition function below.
DROP TRIGGER IF EXISTS immutable_monetization_invoice_lines ON public.monetization_invoice_lines;
CREATE TRIGGER immutable_monetization_invoice_lines
BEFORE UPDATE OR DELETE ON public.monetization_invoice_lines
FOR EACH ROW EXECUTE FUNCTION public.reject_immutable_mutation();

DROP TRIGGER IF EXISTS immutable_monetization_credit_transactions ON public.monetization_credit_transactions;
CREATE TRIGGER immutable_monetization_credit_transactions
BEFORE UPDATE OR DELETE ON public.monetization_credit_transactions
FOR EACH ROW EXECUTE FUNCTION public.reject_immutable_mutation();

DROP TRIGGER IF EXISTS immutable_monetization_usage_records ON public.monetization_usage_records;
CREATE TRIGGER immutable_monetization_usage_records
BEFORE UPDATE OR DELETE ON public.monetization_usage_records
FOR EACH ROW EXECUTE FUNCTION public.reject_immutable_mutation();

DROP TRIGGER IF EXISTS immutable_monetization_subscription_events ON public.monetization_subscription_events;
CREATE TRIGGER immutable_monetization_subscription_events
BEFORE UPDATE OR DELETE ON public.monetization_subscription_events
FOR EACH ROW EXECUTE FUNCTION public.reject_immutable_mutation();

CREATE OR REPLACE FUNCTION public.record_monetization_credit_transaction(
  p_account_id UUID,
  p_credit_type VARCHAR,
  p_quantity BIGINT,
  p_reason TEXT,
  p_source_type VARCHAR,
  p_source_id VARCHAR,
  p_expires_at TIMESTAMPTZ,
  p_idempotency_key VARCHAR,
  p_actor_id UUID DEFAULT NULL
) RETURNS public.monetization_credit_transactions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  existing public.monetization_credit_transactions%ROWTYPE;
  current_balance BIGINT;
  created public.monetization_credit_transactions%ROWTYPE;
BEGIN
  IF p_quantity = 0 THEN RAISE EXCEPTION 'credit quantity cannot be zero'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(p_account_id::TEXT || ':' || p_credit_type));
  SELECT * INTO existing FROM public.monetization_credit_transactions
    WHERE account_id = p_account_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN RETURN existing; END IF;
  SELECT COALESCE(SUM(quantity), 0) INTO current_balance
    FROM public.monetization_credit_transactions
    WHERE account_id = p_account_id AND credit_type = p_credit_type;
  IF current_balance + p_quantity < 0 THEN
    RAISE EXCEPTION 'insufficient % credits', p_credit_type USING ERRCODE = '23514';
  END IF;
  INSERT INTO public.monetization_credit_transactions
    (account_id, credit_type, quantity, reason, source_type, source_id,
     expires_at, idempotency_key, created_by)
  VALUES
    (p_account_id, p_credit_type, p_quantity, p_reason, p_source_type, p_source_id,
     p_expires_at, p_idempotency_key, p_actor_id)
  RETURNING * INTO created;
  RETURN created;
END;
$$;

CREATE OR REPLACE FUNCTION public.transition_monetization_subscription(
  p_subscription_id UUID,
  p_target_status VARCHAR,
  p_event_type VARCHAR,
  p_idempotency_key VARCHAR,
  p_metadata JSONB DEFAULT '{}'::JSONB,
  p_actor_id UUID DEFAULT NULL
) RETURNS public.monetization_subscriptions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_row public.monetization_subscriptions%ROWTYPE;
  existing_event UUID;
BEGIN
  SELECT id INTO existing_event FROM public.monetization_subscription_events
    WHERE subscription_id = p_subscription_id AND idempotency_key = p_idempotency_key;
  IF existing_event IS NOT NULL THEN
    SELECT * INTO current_row FROM public.monetization_subscriptions WHERE id = p_subscription_id;
    RETURN current_row;
  END IF;
  SELECT * INTO current_row FROM public.monetization_subscriptions
    WHERE id = p_subscription_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'subscription not found'; END IF;
  IF NOT (
    (current_row.status = 'incomplete' AND p_target_status IN ('trialing','active','cancelled')) OR
    (current_row.status = 'trialing' AND p_target_status IN ('active','past_due','cancellation_pending','cancelled','expired')) OR
    (current_row.status = 'active' AND p_target_status IN ('past_due','paused','cancellation_pending','cancelled','expired','suspended')) OR
    (current_row.status = 'past_due' AND p_target_status IN ('active','cancellation_pending','cancelled','suspended')) OR
    (current_row.status = 'paused' AND p_target_status IN ('active','cancelled','expired')) OR
    (current_row.status = 'cancellation_pending' AND p_target_status IN ('active','cancelled')) OR
    (current_row.status = 'suspended' AND p_target_status IN ('active','cancelled','expired')) OR
    (current_row.status = p_target_status)
  ) THEN
    RAISE EXCEPTION 'invalid subscription transition % -> %', current_row.status, p_target_status USING ERRCODE = '23514';
  END IF;
  INSERT INTO public.monetization_subscription_events
    (subscription_id, account_id, event_type, from_status, to_status, metadata,
     idempotency_key, actor_id)
  VALUES
    (current_row.id, current_row.account_id, p_event_type, current_row.status,
     p_target_status, COALESCE(p_metadata, '{}'::JSONB), p_idempotency_key, p_actor_id);
  UPDATE public.monetization_subscriptions
    SET status = p_target_status,
        cancellation_requested_at = CASE
          WHEN p_target_status = 'cancellation_pending' THEN NOW()
          WHEN p_target_status = 'active' THEN NULL
          ELSE cancellation_requested_at END,
        cancellation_effective_at = CASE
          WHEN p_target_status = 'cancellation_pending' THEN current_period_end
          WHEN p_target_status = 'active' THEN NULL
          ELSE cancellation_effective_at END,
        cancel_at_period_end = p_target_status = 'cancellation_pending',
        updated_at = NOW()
    WHERE id = current_row.id
    RETURNING * INTO current_row;
  RETURN current_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.run_monetization_maintenance(
  p_batch_size INT DEFAULT 500
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  expired_quotes INT := 0;
  expired_entitlements INT := 0;
  cancelled_subscriptions INT := 0;
  suspended_subscriptions INT := 0;
  applied_changes INT := 0;
  expired_credit_groups INT := 0;
  trial_ending_events INT := 0;
  renewal_upcoming_events INT := 0;
  credit_group RECORD;
BEGIN
  WITH candidates AS (
    SELECT id FROM public.monetization_quotes
    WHERE status = 'active' AND expires_at <= NOW()
    ORDER BY expires_at FOR UPDATE SKIP LOCKED LIMIT p_batch_size
  )
  UPDATE public.monetization_quotes quote SET status = 'expired'
  FROM candidates WHERE quote.id = candidates.id;
  GET DIAGNOSTICS expired_quotes = ROW_COUNT;

  WITH candidates AS (
    SELECT id FROM public.monetization_entitlements
    WHERE status = 'active' AND ends_at IS NOT NULL AND ends_at <= NOW()
    ORDER BY ends_at FOR UPDATE SKIP LOCKED LIMIT p_batch_size
  )
  UPDATE public.monetization_entitlements entitlement
  SET status = 'expired', updated_at = NOW()
  FROM candidates WHERE entitlement.id = candidates.id;
  GET DIAGNOSTICS expired_entitlements = ROW_COUNT;

  INSERT INTO public.monetization_subscription_events
    (subscription_id, account_id, event_type, from_status, to_status, idempotency_key)
  SELECT id, account_id, 'trial_ending', status, status,
    'maintenance:trial-ending:' || trial_ends_at::DATE::TEXT
  FROM public.monetization_subscriptions
  WHERE status = 'trialing'
    AND trial_ends_at > NOW()
    AND trial_ends_at <= NOW() + INTERVAL '3 days'
  ORDER BY trial_ends_at
  LIMIT p_batch_size
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS trial_ending_events = ROW_COUNT;

  INSERT INTO public.monetization_subscription_events
    (subscription_id, account_id, event_type, from_status, to_status, idempotency_key)
  SELECT id, account_id, 'renewal_upcoming', status, status,
    'maintenance:renewal-upcoming:' || current_period_end::DATE::TEXT
  FROM public.monetization_subscriptions
  WHERE status = 'active'
    AND current_period_end > NOW()
    AND current_period_end <= NOW() + INTERVAL '7 days'
  ORDER BY current_period_end
  LIMIT p_batch_size
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS renewal_upcoming_events = ROW_COUNT;

  WITH candidates AS (
    SELECT id FROM public.monetization_subscriptions
    WHERE status = 'cancellation_pending' AND current_period_end <= NOW()
    ORDER BY current_period_end FOR UPDATE SKIP LOCKED LIMIT p_batch_size
  ), inserted AS (
    INSERT INTO public.monetization_subscription_events
      (subscription_id, account_id, event_type, from_status, to_status, idempotency_key)
    SELECT subscription.id, subscription.account_id, 'cancelled', subscription.status,
      'cancelled', 'maintenance:cancel:' || subscription.current_period_end::TEXT
    FROM public.monetization_subscriptions subscription JOIN candidates USING (id)
    ON CONFLICT DO NOTHING RETURNING subscription_id
  )
  UPDATE public.monetization_subscriptions subscription
  SET status = 'cancelled', cancel_at_period_end = FALSE, updated_at = NOW()
  FROM candidates WHERE subscription.id = candidates.id;
  GET DIAGNOSTICS cancelled_subscriptions = ROW_COUNT;

  WITH candidates AS (
    SELECT id FROM public.monetization_subscriptions
    WHERE status = 'past_due' AND grace_period_ends_at IS NOT NULL AND grace_period_ends_at <= NOW()
    ORDER BY grace_period_ends_at FOR UPDATE SKIP LOCKED LIMIT p_batch_size
  ), inserted AS (
    INSERT INTO public.monetization_subscription_events
      (subscription_id, account_id, event_type, from_status, to_status, idempotency_key)
    SELECT subscription.id, subscription.account_id, 'paused', subscription.status,
      'suspended', 'maintenance:grace:' || subscription.grace_period_ends_at::TEXT
    FROM public.monetization_subscriptions subscription JOIN candidates USING (id)
    ON CONFLICT DO NOTHING RETURNING subscription_id
  )
  UPDATE public.monetization_subscriptions subscription
  SET status = 'suspended', updated_at = NOW()
  FROM candidates WHERE subscription.id = candidates.id;
  GET DIAGNOSTICS suspended_subscriptions = ROW_COUNT;

  WITH candidates AS (
    SELECT id FROM public.monetization_subscriptions
    WHERE scheduled_change_at IS NOT NULL AND scheduled_change_at <= NOW()
      AND status IN ('active','trialing','cancellation_pending')
    ORDER BY scheduled_change_at FOR UPDATE SKIP LOCKED LIMIT p_batch_size
  ), inserted AS (
    INSERT INTO public.monetization_subscription_events
      (subscription_id, account_id, event_type, from_status, to_status, metadata, idempotency_key)
    SELECT subscription.id, subscription.account_id, 'changed', subscription.status,
      subscription.status, jsonb_build_object('productId', subscription.scheduled_product_id,
      'priceId', subscription.scheduled_price_id),
      'maintenance:change:' || subscription.scheduled_change_at::TEXT
    FROM public.monetization_subscriptions subscription JOIN candidates USING (id)
    ON CONFLICT DO NOTHING RETURNING subscription_id
  )
  UPDATE public.monetization_subscriptions subscription
  SET product_id = scheduled_product_id,
      price_id = scheduled_price_id,
      scheduled_product_id = NULL,
      scheduled_price_id = NULL,
      scheduled_change_at = NULL,
      updated_at = NOW()
  FROM candidates WHERE subscription.id = candidates.id;
  GET DIAGNOSTICS applied_changes = ROW_COUNT;

  FOR credit_group IN
    SELECT account_id, credit_type, expires_at, SUM(quantity)::BIGINT AS remaining
    FROM public.monetization_credit_transactions
    WHERE expires_at IS NOT NULL AND expires_at <= NOW()
    GROUP BY account_id, credit_type, expires_at
    HAVING SUM(quantity) > 0
    ORDER BY expires_at
    LIMIT p_batch_size
  LOOP
    PERFORM public.record_monetization_credit_transaction(
      credit_group.account_id, credit_group.credit_type, -credit_group.remaining,
      'Expiration des crédits', 'expiry', credit_group.expires_at::TEXT,
      NULL, 'maintenance:expiry:' || credit_group.credit_type || ':' || credit_group.expires_at::TEXT,
      NULL
    );
    expired_credit_groups := expired_credit_groups + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'expiredQuotes', expired_quotes,
    'expiredEntitlements', expired_entitlements,
    'cancelledSubscriptions', cancelled_subscriptions,
    'suspendedSubscriptions', suspended_subscriptions,
    'appliedChanges', applied_changes,
    'expiredCreditGroups', expired_credit_groups,
    'trialEndingEvents', trial_ending_events,
    'renewalUpcomingEvents', renewal_upcoming_events
  );
END;
$$;

CREATE OR REPLACE VIEW public.monetization_reconciliation AS
SELECT
  order_row.id AS order_id,
  order_row.account_id,
  order_row.currency,
  order_row.total_minor AS order_total_minor,
  COALESCE(SUM(payment.amount_minor) FILTER (WHERE payment.status IN ('succeeded','partially_refunded','refunded')), 0)::BIGINT AS captured_minor,
  COALESCE((
    SELECT SUM(refund.amount_minor) FROM public.monetization_refunds refund
    WHERE refund.order_id = order_row.id AND refund.status = 'succeeded'
  ), 0)::BIGINT AS refunded_minor,
  COALESCE(MAX(invoice.total_minor), 0)::BIGINT AS invoiced_minor,
  CASE
    WHEN order_row.status = 'paid'
      AND order_row.total_minor = COALESCE(SUM(payment.amount_minor) FILTER (WHERE payment.status IN ('succeeded','partially_refunded','refunded')), 0)
      AND order_row.total_minor = COALESCE(MAX(invoice.total_minor), 0)
    THEN 'matched'
    WHEN order_row.status IN ('created','pending','requires_action') THEN 'pending'
    ELSE 'mismatch'
  END AS reconciliation_status
FROM public.monetization_orders order_row
LEFT JOIN public.monetization_payments payment ON payment.order_id = order_row.id
LEFT JOIN public.monetization_invoices invoice ON invoice.order_id = order_row.id
GROUP BY order_row.id, order_row.account_id, order_row.currency, order_row.total_minor, order_row.status;

-- Least-privilege capabilities for customer self-service and finance/admin work.
INSERT INTO public.access_capabilities (id, is_sensitive)
VALUES
  ('billing.read.own', FALSE),
  ('billing.customer.update.own', FALSE),
  ('invoice.read.own', FALSE),
  ('subscription.cancel.own', FALSE),
  ('subscription.change.own', FALSE),
  ('monetization.payments.read', TRUE),
  ('monetization.invoices.read', TRUE),
  ('monetization.refunds.read', TRUE),
  ('monetization.refunds.create', TRUE),
  ('monetization.refunds.approve', TRUE),
  ('monetization.credits.adjust', TRUE),
  ('monetization.reconciliation.read', TRUE)
ON CONFLICT (id) DO UPDATE SET is_sensitive = EXCLUDED.is_sensitive;

INSERT INTO public.access_role_grants (role_kind, role_key, capability_id)
SELECT 'account_family', family, capability
FROM unnest(ARRAY['individual','professional']) family
CROSS JOIN unnest(ARRAY[
  'billing.read.own','billing.customer.update.own','invoice.read.own',
  'subscription.cancel.own','subscription.change.own'
]::TEXT[]) capability
ON CONFLICT DO NOTHING;

INSERT INTO public.access_role_grants (role_kind, role_key, capability_id)
SELECT 'staff_role', role_key, capability
FROM unnest(ARRAY['finance','admin','owner']) role_key
CROSS JOIN unnest(ARRAY[
  'monetization.payments.read','monetization.invoices.read','monetization.refunds.read',
  'monetization.refunds.create','monetization.credits.adjust','monetization.reconciliation.read'
]::TEXT[]) capability
ON CONFLICT DO NOTHING;

INSERT INTO public.access_role_grants (role_kind, role_key, capability_id)
VALUES
  ('staff_role','admin','monetization.refunds.approve'),
  ('staff_role','owner','monetization.refunds.approve')
ON CONFLICT DO NOTHING;

ALTER TABLE public.monetization_billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_subscription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_tax_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_usage_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.monetization_billing_customers FROM anon, authenticated;
REVOKE ALL ON public.monetization_subscription_items FROM anon, authenticated;
REVOKE ALL ON public.monetization_payments FROM anon, authenticated;
REVOKE ALL ON public.monetization_invoices FROM anon, authenticated;
REVOKE ALL ON public.monetization_invoice_lines FROM anon, authenticated;
REVOKE ALL ON public.monetization_refunds FROM anon, authenticated;
REVOKE ALL ON public.monetization_credit_transactions FROM anon, authenticated;
REVOKE ALL ON public.monetization_usage_records FROM anon, authenticated;
REVOKE ALL ON public.monetization_subscription_events FROM anon, authenticated;
REVOKE ALL ON public.monetization_tax_rules FROM anon, authenticated;
REVOKE ALL ON public.monetization_usage_limits FROM anon, authenticated;
REVOKE ALL ON public.monetization_credit_balances FROM anon, authenticated;
REVOKE ALL ON public.monetization_reconciliation FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.record_monetization_credit_transaction(UUID,VARCHAR,BIGINT,TEXT,VARCHAR,VARCHAR,TIMESTAMPTZ,VARCHAR,UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.transition_monetization_subscription(UUID,VARCHAR,VARCHAR,VARCHAR,JSONB,UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.run_monetization_maintenance(INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_monetization_credit_transaction(UUID,VARCHAR,BIGINT,TEXT,VARCHAR,VARCHAR,TIMESTAMPTZ,VARCHAR,UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.transition_monetization_subscription(UUID,VARCHAR,VARCHAR,VARCHAR,JSONB,UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.run_monetization_maintenance(INT) TO service_role;
