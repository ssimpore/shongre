-- Extend the governed display-currency catalogue with USD and reject market
-- currency publication until every non-default display currency has a current
-- conversion path. Rates remain admin-owned and are never guessed here.

INSERT INTO public.currency_definitions (
  code,
  display_name,
  symbol,
  minor_unit_digits,
  enabled
)
VALUES ('USD', 'Dollar américain', '$', 2, TRUE)
ON CONFLICT (code) DO NOTHING;

CREATE OR REPLACE FUNCTION public.apply_approved_market_currencies()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  configured_currencies TEXT[];
  default_currency TEXT;
  unreachable_currencies TEXT[];
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM NEW.status THEN
    configured_currencies := ARRAY(
      SELECT jsonb_array_elements_text(NEW.candidate_snapshot->'supportedCurrencies')
    );
    default_currency := NEW.candidate_snapshot->>'currency';

    IF cardinality(configured_currencies) = 0 OR
       NOT (default_currency = ANY(configured_currencies)) THEN
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

    WITH RECURSIVE current_edges(from_currency, to_currency) AS (
      SELECT rate.base_currency, rate.quote_currency
      FROM public.currency_exchange_rates rate
      WHERE rate.enabled
        AND rate.as_of <= NOW()
        AND rate.expires_at > NOW()
      UNION
      SELECT rate.quote_currency, rate.base_currency
      FROM public.currency_exchange_rates rate
      WHERE rate.enabled
        AND rate.as_of <= NOW()
        AND rate.expires_at > NOW()
    ), reachable(currency) AS (
      SELECT default_currency
      UNION
      SELECT edge.to_currency
      FROM reachable
      JOIN current_edges edge ON edge.from_currency = reachable.currency
    )
    SELECT ARRAY_AGG(configured.code ORDER BY configured.code)
    INTO unreachable_currencies
    FROM unnest(configured_currencies) configured(code)
    WHERE NOT EXISTS (
      SELECT 1 FROM reachable WHERE reachable.currency = configured.code
    );

    IF cardinality(unreachable_currencies) > 0 THEN
      RAISE EXCEPTION 'market currencies require a current conversion path: %',
        array_to_string(unreachable_currencies, ', ')
        USING ERRCODE = '23514';
    END IF;

    UPDATE public.markets
    SET supported_currencies = configured_currencies
    WHERE code = NEW.market_code;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.apply_approved_market_currencies() IS
  'Applies reviewed market display currencies only when definitions and current conversion paths are valid.';
