-- Provider routes are selected by an explicit scope, market, capability,
-- operation and (for financial routes) currency. No country inherits France.

ALTER TABLE public.provider_routing_rules
  ADD COLUMN IF NOT EXISTS operation TEXT,
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3),
  ADD COLUMN IF NOT EXISTS routing_scope TEXT,
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE public.provider_routing_rules
SET operation = capability
WHERE operation IS NULL;

UPDATE public.provider_routing_rules
SET routing_scope = CASE
  WHEN market_code = '*' THEN 'PLATFORM_GLOBAL'
  ELSE 'MARKET_SCOPED'
END
WHERE routing_scope IS NULL;

ALTER TABLE public.provider_routing_rules
  ALTER COLUMN operation SET NOT NULL,
  ALTER COLUMN routing_scope SET NOT NULL;

ALTER TABLE public.provider_routing_rules
  DROP CONSTRAINT IF EXISTS provider_routing_rules_capability_market_code_environment_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'provider_routing_rules_scope_check'
  ) THEN
    ALTER TABLE public.provider_routing_rules
      ADD CONSTRAINT provider_routing_rules_scope_check CHECK (
        (routing_scope = 'PLATFORM_GLOBAL' AND market_code = '*')
        OR
        (routing_scope = 'MARKET_SCOPED' AND market_code ~ '^[A-Z]{2}$')
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'provider_routing_rules_currency_check'
  ) THEN
    ALTER TABLE public.provider_routing_rules
      ADD CONSTRAINT provider_routing_rules_currency_check
      CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$');
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS provider_routing_rules_dimensions_unique_idx
  ON public.provider_routing_rules (
    capability,
    operation,
    market_code,
    COALESCE(currency, ''),
    environment
  );
CREATE INDEX IF NOT EXISTS provider_routing_rules_resolution_idx
  ON public.provider_routing_rules (
    market_code, capability, operation, currency, environment, enabled
  );

CREATE OR REPLACE FUNCTION public.validate_provider_routing_market()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  market_currency TEXT;
BEGIN
  IF NEW.routing_scope = 'MARKET_SCOPED' THEN
    SELECT currency INTO market_currency
    FROM public.markets
    WHERE code = NEW.market_code
      AND enabled = TRUE;
    IF market_currency IS NULL THEN
      RAISE EXCEPTION 'provider routing market is not configured: %', NEW.market_code
        USING ERRCODE = '23514';
    END IF;
    IF NEW.currency IS NOT NULL AND NEW.currency <> market_currency THEN
      RAISE EXCEPTION 'provider routing currency % is not enabled for market %',
        NEW.currency, NEW.market_code
        USING ERRCODE = '23514';
    END IF;
  ELSIF NEW.currency IS NOT NULL THEN
    RAISE EXCEPTION 'platform-global provider routes cannot carry market currency'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_provider_routing_market_trigger
  ON public.provider_routing_rules;
CREATE TRIGGER validate_provider_routing_market_trigger
  BEFORE INSERT OR UPDATE OF market_code, currency, routing_scope
  ON public.provider_routing_rules
  FOR EACH ROW EXECUTE FUNCTION public.validate_provider_routing_market();

COMMENT ON COLUMN public.provider_routing_rules.operation IS
  'Provider-neutral operation within a capability; required in every route decision.';
COMMENT ON COLUMN public.provider_routing_rules.currency IS
  'Explicit ISO currency for financial routes; NULL only for non-financial operations.';
COMMENT ON COLUMN public.provider_routing_rules.automatic_failover IS
  'Explicit approval gate. A configured fallback is never activated when false.';
