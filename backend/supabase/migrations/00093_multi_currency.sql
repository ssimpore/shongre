-- Central, audited display-currency catalogue and exact rational exchange rates.
-- Financial records keep their original amount_minor + currency; these rates
-- are projections only and never rewrite orders, payments, refunds or invoices.

ALTER TABLE public.markets
  ADD COLUMN IF NOT EXISTS supported_currencies TEXT[] NOT NULL DEFAULT '{}';

UPDATE public.markets
SET supported_currencies = ARRAY[currency]
WHERE cardinality(supported_currencies) = 0;

ALTER TABLE public.markets
  ADD CONSTRAINT markets_supported_currencies_nonempty_check
  CHECK (cardinality(supported_currencies) > 0) NOT VALID;
ALTER TABLE public.markets
  VALIDATE CONSTRAINT markets_supported_currencies_nonempty_check;

CREATE TABLE IF NOT EXISTS public.currency_definitions (
  code VARCHAR(3) PRIMARY KEY CHECK (code ~ '^[A-Z]{3}$'),
  display_name VARCHAR(120) NOT NULL CHECK (length(trim(display_name)) >= 2),
  symbol VARCHAR(12) NOT NULL CHECK (length(trim(symbol)) >= 1),
  minor_unit_digits SMALLINT NOT NULL CHECK (minor_unit_digits BETWEEN 0 AND 4),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.currency_exchange_rates (
  base_currency VARCHAR(3) NOT NULL REFERENCES public.currency_definitions(code) ON DELETE RESTRICT,
  quote_currency VARCHAR(3) NOT NULL REFERENCES public.currency_definitions(code) ON DELETE RESTRICT,
  rate_numerator BIGINT NOT NULL CHECK (rate_numerator > 0),
  rate_denominator BIGINT NOT NULL CHECK (rate_denominator > 0),
  source VARCHAR(120) NOT NULL CHECK (length(trim(source)) >= 2),
  as_of TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (base_currency, quote_currency),
  CHECK (base_currency <> quote_currency),
  CHECK (expires_at > as_of)
);

CREATE INDEX IF NOT EXISTS currency_exchange_rates_active_idx
  ON public.currency_exchange_rates (enabled, base_currency, quote_currency, expires_at);

CREATE TABLE IF NOT EXISTS public.currency_configuration_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('currency','exchange_rate')),
  entity_key TEXT NOT NULL,
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL CHECK (length(trim(reason)) BETWEEN 8 AND 500),
  before_snapshot JSONB,
  after_snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS currency_configuration_audit_entity_idx
  ON public.currency_configuration_audit (entity_type, entity_key, created_at DESC);

ALTER TABLE public.currency_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currency_definitions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.currency_exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currency_exchange_rates FORCE ROW LEVEL SECURITY;
ALTER TABLE public.currency_configuration_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currency_configuration_audit FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.currency_definitions, public.currency_exchange_rates,
  public.currency_configuration_audit FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.currency_definitions,
  public.currency_exchange_rates TO service_role;
GRANT SELECT, INSERT ON public.currency_configuration_audit TO service_role;

INSERT INTO public.currency_definitions
  (code, display_name, symbol, minor_unit_digits, enabled)
VALUES
  ('EUR', 'Euro', '€', 2, TRUE),
  ('CHF', 'Franc suisse', 'CHF', 2, TRUE),
  ('XOF', 'Franc CFA BCEAO', 'F CFA', 0, TRUE)
ON CONFLICT (code) DO NOTHING;

CREATE OR REPLACE FUNCTION public.upsert_currency_definition(
  p_code TEXT,
  p_display_name TEXT,
  p_symbol TEXT,
  p_minor_unit_digits INTEGER,
  p_enabled BOOLEAN,
  p_actor_id UUID,
  p_reason TEXT
)
RETURNS SETOF public.currency_definitions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  before_row public.currency_definitions%ROWTYPE;
  after_row public.currency_definitions%ROWTYPE;
BEGIN
  IF p_code !~ '^[A-Z]{3}$' THEN
    RAISE EXCEPTION 'invalid currency code' USING ERRCODE = '22023';
  END IF;
  IF length(trim(p_reason)) < 8 OR length(trim(p_reason)) > 500 THEN
    RAISE EXCEPTION 'currency change reason required' USING ERRCODE = '22023';
  END IF;
  IF NOT p_enabled AND EXISTS (
    SELECT 1 FROM public.markets market
    WHERE market.currency = p_code OR p_code = ANY(market.supported_currencies)
  ) THEN
    RAISE EXCEPTION 'currency is referenced by a market' USING ERRCODE = '23503';
  END IF;

  SELECT * INTO before_row FROM public.currency_definitions WHERE code = p_code FOR UPDATE;
  INSERT INTO public.currency_definitions (
    code, display_name, symbol, minor_unit_digits, enabled
  ) VALUES (
    p_code, trim(p_display_name), trim(p_symbol), p_minor_unit_digits, p_enabled
  )
  ON CONFLICT (code) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    symbol = EXCLUDED.symbol,
    minor_unit_digits = EXCLUDED.minor_unit_digits,
    enabled = EXCLUDED.enabled,
    version = public.currency_definitions.version + 1,
    updated_at = NOW()
  RETURNING * INTO after_row;

  INSERT INTO public.currency_configuration_audit (
    entity_type, entity_key, actor_id, reason, before_snapshot, after_snapshot
  ) VALUES (
    'currency', p_code, p_actor_id, trim(p_reason),
    CASE WHEN before_row.code IS NULL THEN NULL ELSE to_jsonb(before_row) END,
    to_jsonb(after_row)
  );
  RETURN NEXT after_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_currency_exchange_rate(
  p_base_currency TEXT,
  p_quote_currency TEXT,
  p_rate_numerator BIGINT,
  p_rate_denominator BIGINT,
  p_source TEXT,
  p_as_of TIMESTAMPTZ,
  p_expires_at TIMESTAMPTZ,
  p_enabled BOOLEAN,
  p_actor_id UUID,
  p_reason TEXT
)
RETURNS SETOF public.currency_exchange_rates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  before_row public.currency_exchange_rates%ROWTYPE;
  after_row public.currency_exchange_rates%ROWTYPE;
BEGIN
  IF p_base_currency = p_quote_currency THEN
    RAISE EXCEPTION 'exchange rate currencies must differ' USING ERRCODE = '22023';
  END IF;
  IF p_rate_numerator <= 0 OR p_rate_denominator <= 0 OR p_expires_at <= p_as_of THEN
    RAISE EXCEPTION 'invalid exchange rate' USING ERRCODE = '22023';
  END IF;
  IF length(trim(p_reason)) < 8 OR length(trim(p_reason)) > 500 THEN
    RAISE EXCEPTION 'exchange rate change reason required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO before_row
  FROM public.currency_exchange_rates
  WHERE base_currency = p_base_currency AND quote_currency = p_quote_currency
  FOR UPDATE;

  INSERT INTO public.currency_exchange_rates (
    base_currency, quote_currency, rate_numerator, rate_denominator,
    source, as_of, expires_at, enabled
  ) VALUES (
    p_base_currency, p_quote_currency, p_rate_numerator, p_rate_denominator,
    trim(p_source), p_as_of, p_expires_at, p_enabled
  )
  ON CONFLICT (base_currency, quote_currency) DO UPDATE SET
    rate_numerator = EXCLUDED.rate_numerator,
    rate_denominator = EXCLUDED.rate_denominator,
    source = EXCLUDED.source,
    as_of = EXCLUDED.as_of,
    expires_at = EXCLUDED.expires_at,
    enabled = EXCLUDED.enabled,
    version = public.currency_exchange_rates.version + 1,
    updated_at = NOW()
  RETURNING * INTO after_row;

  INSERT INTO public.currency_configuration_audit (
    entity_type, entity_key, actor_id, reason, before_snapshot, after_snapshot
  ) VALUES (
    'exchange_rate', p_base_currency || '/' || p_quote_currency,
    p_actor_id, trim(p_reason),
    CASE WHEN before_row.base_currency IS NULL THEN NULL ELSE to_jsonb(before_row) END,
    to_jsonb(after_row)
  );
  RETURN NEXT after_row;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_currency_definition(TEXT,TEXT,TEXT,INTEGER,BOOLEAN,UUID,TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.upsert_currency_exchange_rate(TEXT,TEXT,BIGINT,BIGINT,TEXT,TIMESTAMPTZ,TIMESTAMPTZ,BOOLEAN,UUID,TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_currency_definition(TEXT,TEXT,TEXT,INTEGER,BOOLEAN,UUID,TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.upsert_currency_exchange_rate(TEXT,TEXT,BIGINT,BIGINT,TEXT,TIMESTAMPTZ,TIMESTAMPTZ,BOOLEAN,UUID,TEXT)
  TO service_role;

CREATE OR REPLACE FUNCTION public.apply_approved_market_currencies()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  configured_currencies TEXT[];
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM NEW.status THEN
    configured_currencies := ARRAY(
      SELECT jsonb_array_elements_text(NEW.candidate_snapshot->'supportedCurrencies')
    );
    IF cardinality(configured_currencies) = 0 OR
       NOT ((NEW.candidate_snapshot->>'currency') = ANY(configured_currencies)) THEN
      RAISE EXCEPTION 'default currency must be supported' USING ERRCODE = '22023';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM unnest(configured_currencies) configured(code)
      LEFT JOIN public.currency_definitions definition
        ON definition.code = configured.code AND definition.enabled
      WHERE definition.code IS NULL
    ) THEN
      RAISE EXCEPTION 'market currencies must exist and be enabled' USING ERRCODE = '22023';
    END IF;
    UPDATE public.markets
    SET supported_currencies = configured_currencies
    WHERE code = NEW.market_code;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS market_configuration_apply_currencies
  ON public.market_configuration_change_requests;
CREATE TRIGGER market_configuration_apply_currencies
AFTER UPDATE OF status ON public.market_configuration_change_requests
FOR EACH ROW EXECUTE FUNCTION public.apply_approved_market_currencies();

COMMENT ON TABLE public.currency_definitions IS
  'Platform-global ISO currency display definitions. No provider credentials or financial balances.';
COMMENT ON TABLE public.currency_exchange_rates IS
  'Audited display-only rational exchange rates. Authoritative money is never rewritten.';
