-- =============================================================================
-- Organization-owned product entitlements
--
-- account_id remains the payer/audit subject. organization_id is the explicit
-- product-access subject. Access must never be inferred from organization
-- ownership because one account may own or manage several organizations.
-- =============================================================================

ALTER TABLE public.monetization_quotes
  ADD COLUMN IF NOT EXISTS organization_id UUID
  REFERENCES public.organizations(id) ON DELETE RESTRICT;
ALTER TABLE public.monetization_orders
  ADD COLUMN IF NOT EXISTS organization_id UUID
  REFERENCES public.organizations(id) ON DELETE RESTRICT;
ALTER TABLE public.monetization_entitlements
  ADD COLUMN IF NOT EXISTS organization_id UUID
  REFERENCES public.organizations(id) ON DELETE RESTRICT;
ALTER TABLE public.monetization_subscriptions
  ADD COLUMN IF NOT EXISTS organization_id UUID
  REFERENCES public.organizations(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS monetization_quotes_organization_idx
  ON public.monetization_quotes (organization_id, status, expires_at DESC)
  WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS monetization_orders_organization_idx
  ON public.monetization_orders (organization_id, status, created_at DESC)
  WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS monetization_entitlements_organization_resolution_idx
  ON public.monetization_entitlements
    (organization_id, product_id, entitlement_key, status, ends_at)
  WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS monetization_subscriptions_organization_idx
  ON public.monetization_subscriptions
    (organization_id, product_id, status, current_period_end DESC)
  WHERE organization_id IS NOT NULL;

-- Recover explicit scope embedded by newer contracts. Older professional
-- records are backfilled only when the payer has exactly one active
-- organization membership, so ambiguous multi-organization accounts fail
-- closed and require an operator-reviewed assignment.
UPDATE public.monetization_quotes quote
SET organization_id = NULLIF(quote.quote_snapshot->>'organizationId', '')::UUID
WHERE quote.organization_id IS NULL
  AND NULLIF(quote.quote_snapshot->>'organizationId', '') IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.organization_members member
    WHERE member.organization_id = NULLIF(quote.quote_snapshot->>'organizationId', '')::UUID
      AND member.user_id = quote.account_id
      AND member.status = 'active'
  );

UPDATE public.monetization_orders order_row
SET organization_id = COALESCE(
  NULLIF(order_row.order_snapshot->>'organizationId', '')::UUID,
  quote.organization_id
)
FROM public.monetization_quotes quote
WHERE quote.id = order_row.quote_id
  AND order_row.organization_id IS NULL
  AND COALESCE(
    NULLIF(order_row.order_snapshot->>'organizationId', '')::UUID,
    quote.organization_id
  ) IS NOT NULL;

WITH sole_membership AS (
  SELECT member.user_id, min(member.organization_id::TEXT)::UUID AS organization_id
  FROM public.organization_members member
  JOIN public.organizations organization ON organization.id = member.organization_id
  WHERE member.status = 'active' AND organization.status = 'active'
  GROUP BY member.user_id
  HAVING count(DISTINCT member.organization_id) = 1
)
UPDATE public.monetization_entitlements entitlement
SET organization_id = sole.organization_id
FROM sole_membership sole
WHERE entitlement.account_id = sole.user_id
  AND entitlement.organization_id IS NULL
  AND (
    entitlement.product_id = 'product.facturation'
    OR entitlement.entitlement_key LIKE 'invoicing.%'
    OR entitlement.entitlement_key LIKE 'prospecting.%'
  );

UPDATE public.monetization_entitlements entitlement
SET organization_id = order_row.organization_id
FROM public.monetization_orders order_row
WHERE entitlement.source_order_id = order_row.id
  AND entitlement.organization_id IS NULL
  AND order_row.organization_id IS NOT NULL;

UPDATE public.monetization_subscriptions subscription
SET organization_id = order_row.organization_id
FROM public.monetization_orders order_row
WHERE subscription.source_order_id = order_row.id
  AND subscription.organization_id IS NULL
  AND order_row.organization_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.assert_monetization_organization_scope(
  p_account_id UUID,
  p_organization_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_organization_id IS NULL THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_members member
    JOIN public.organizations organization ON organization.id = member.organization_id
    WHERE member.organization_id = p_organization_id
      AND member.user_id = p_account_id
      AND member.status = 'active'
      AND organization.status = 'active'
      AND (
        member.role IN ('owner','admin')
        OR member.permissions @> ARRAY['subscription.manage.own']::TEXT[]
      )
  ) THEN
    RAISE EXCEPTION 'organization_subscription_management_required'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.scope_monetization_quote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.organization_id := COALESCE(
    NEW.organization_id,
    NULLIF(NEW.quote_snapshot->>'organizationId', '')::UUID
  );
  PERFORM public.assert_monetization_organization_scope(
    NEW.account_id, NEW.organization_id
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.scope_monetization_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.organization_id := COALESCE(
    NEW.organization_id,
    NULLIF(NEW.order_snapshot->>'organizationId', '')::UUID,
    (SELECT quote.organization_id FROM public.monetization_quotes quote
      WHERE quote.id = NEW.quote_id)
  );
  PERFORM public.assert_monetization_organization_scope(
    NEW.account_id, NEW.organization_id
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.scope_monetization_entitlement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  candidate UUID;
BEGIN
  IF NEW.organization_id IS NULL AND NEW.source_order_id IS NOT NULL THEN
    SELECT order_row.organization_id INTO NEW.organization_id
    FROM public.monetization_orders order_row
    WHERE order_row.id = NEW.source_order_id;
  END IF;
  IF NEW.organization_id IS NULL AND (
    NEW.product_id = 'product.facturation'
    OR NEW.entitlement_key LIKE 'invoicing.%'
    OR NEW.entitlement_key LIKE 'prospecting.%'
  ) THEN
    SELECT min(member.organization_id::TEXT)::UUID INTO candidate
    FROM public.organization_members member
    JOIN public.organizations organization ON organization.id = member.organization_id
    WHERE member.user_id = NEW.account_id
      AND member.status = 'active'
      AND organization.status = 'active'
    HAVING count(DISTINCT member.organization_id) = 1;
    NEW.organization_id := candidate;
  END IF;
  PERFORM public.assert_monetization_organization_scope(
    NEW.account_id, NEW.organization_id
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.scope_monetization_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT order_row.organization_id INTO NEW.organization_id
    FROM public.monetization_orders order_row
    WHERE order_row.id = NEW.source_order_id;
  END IF;
  PERFORM public.assert_monetization_organization_scope(
    NEW.account_id, NEW.organization_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS monetization_quote_organization_scope
  ON public.monetization_quotes;
CREATE TRIGGER monetization_quote_organization_scope
BEFORE INSERT OR UPDATE OF organization_id, quote_snapshot
ON public.monetization_quotes
FOR EACH ROW EXECUTE FUNCTION public.scope_monetization_quote();

DROP TRIGGER IF EXISTS monetization_order_organization_scope
  ON public.monetization_orders;
CREATE TRIGGER monetization_order_organization_scope
BEFORE INSERT OR UPDATE OF organization_id, order_snapshot
ON public.monetization_orders
FOR EACH ROW EXECUTE FUNCTION public.scope_monetization_order();

DROP TRIGGER IF EXISTS monetization_entitlement_organization_scope
  ON public.monetization_entitlements;
CREATE TRIGGER monetization_entitlement_organization_scope
BEFORE INSERT OR UPDATE OF organization_id, source_order_id
ON public.monetization_entitlements
FOR EACH ROW EXECUTE FUNCTION public.scope_monetization_entitlement();

DROP TRIGGER IF EXISTS monetization_subscription_organization_scope
  ON public.monetization_subscriptions;
CREATE TRIGGER monetization_subscription_organization_scope
BEFORE INSERT OR UPDATE OF organization_id, source_order_id
ON public.monetization_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.scope_monetization_subscription();

ALTER TABLE public.monetization_entitlements
  ADD CONSTRAINT monetization_organization_product_scope_required
  CHECK (
    (
      product_id <> 'product.facturation'
      AND entitlement_key NOT LIKE 'invoicing.%'
      AND entitlement_key NOT LIKE 'prospecting.%'
    )
    OR organization_id IS NOT NULL
  ) NOT VALID;

CREATE OR REPLACE FUNCTION public.organization_has_active_product_entitlement(
  p_organization_id UUID,
  p_entitlement_key TEXT
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organizations organization
    JOIN public.monetization_entitlements entitlement
      ON entitlement.organization_id = organization.id
    WHERE organization.id = p_organization_id
      AND organization.status = 'active'
      AND entitlement.entitlement_key = p_entitlement_key
      AND entitlement.product_id = 'product.facturation'
      AND entitlement.status = 'active'
      AND entitlement.starts_at <= NOW()
      AND (entitlement.ends_at IS NULL OR entitlement.ends_at > NOW())
      AND entitlement.entitlement_value = 'true'::JSONB
  );
$$;

REVOKE ALL ON FUNCTION public.assert_monetization_organization_scope(UUID,UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.scope_monetization_quote()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.scope_monetization_order()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.scope_monetization_entitlement()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.scope_monetization_subscription()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.organization_has_active_product_entitlement(UUID,TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.organization_has_active_product_entitlement(UUID,TEXT)
  TO authenticated, service_role;

COMMENT ON COLUMN public.monetization_entitlements.account_id IS
  'Billing payer and audit subject; never sufficient for organization product access.';
COMMENT ON COLUMN public.monetization_entitlements.organization_id IS
  'Explicit product-access subject. NULL is permitted only for account-scoped products.';
