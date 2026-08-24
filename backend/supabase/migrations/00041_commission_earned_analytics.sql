-- Commission quotes lock checkout pricing but are not earned revenue. Only an
-- immutable earned calculation (created after provider-confirmed payment) and
-- its reversal states belong in GMV/revenue analytics.
CREATE OR REPLACE VIEW public.commission_analytics_daily
WITH (security_invoker = true) AS
SELECT
  date_trunc('day', calculation.calculated_at)::DATE AS date,
  calculation.snapshot->'inputSnapshot'->>'marketCode' AS market_code,
  CASE
    WHEN calculation.snapshot->'inputSnapshot'->>'verticalId' = 'cours' THEN 'education'
    ELSE calculation.snapshot->'inputSnapshot'->>'verticalId'
  END AS vertical_id,
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
WHERE calculation.eligible
  AND calculation.state IN ('earned','partially_reversed','reversed')
GROUP BY 1,2,3,4,5,6;

REVOKE ALL ON public.commission_analytics_daily FROM anon, authenticated;
