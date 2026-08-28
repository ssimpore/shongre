-- =============================================================================
-- Shongre Facturation product access and editable drafts
--
-- Reuses the existing organization, membership and monetization authorities.
-- No price or provider identifier is invented here: an approved commercial
-- catalog version must publish those terms before production checkout.
-- =============================================================================

INSERT INTO public.monetization_products (id, code, kind)
VALUES ('product.facturation', 'shongre.facturation', 'subscription')
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  kind = EXCLUDED.kind;

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
      ON entitlement.account_id = organization.owner_id
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

REVOKE ALL ON FUNCTION public.organization_has_active_product_entitlement(UUID,TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.organization_has_active_product_entitlement(UUID,TEXT)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_invoicing_tenant_member(p_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (
    EXISTS (
      SELECT 1
      FROM public.organization_members member
      JOIN public.profiles profile ON profile.id = member.user_id
      WHERE member.organization_id = p_organization_id
        AND member.status = 'active'
        AND profile.auth_user_id = (SELECT public.auth_uid())
    )
    AND (SELECT public.organization_has_active_product_entitlement(
      p_organization_id,
      'invoicing.enabled'
    ))
  ) OR (SELECT public.is_admin());
$$;

REVOKE ALL ON FUNCTION public.is_invoicing_tenant_member(UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_invoicing_tenant_member(UUID)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.update_invoicing_invoice_draft(
  p_invoice_id UUID,
  p_actor_id UUID,
  p_expected_version BIGINT,
  p_invoice JSONB,
  p_request_id TEXT DEFAULT NULL
)
RETURNS public.invoicing_invoices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target public.invoicing_invoices%ROWTYPE;
  customer public.invoicing_parties%ROWTYPE;
  line JSONB;
  tax JSONB;
  line_count INTEGER;
  v_subtotal_minor BIGINT := 0;
  v_tax_total_minor BIGINT := 0;
  v_total_minor BIGINT := 0;
  correlation_id TEXT := gen_random_uuid()::TEXT;
BEGIN
  SELECT * INTO target
  FROM public.invoicing_invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invoice_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF target.commercial_state NOT IN ('DRAFT','READY_TO_FINALIZE') THEN
    RAISE EXCEPTION 'invoice_not_editable' USING ERRCODE = '55000';
  END IF;
  IF target.version <> p_expected_version THEN
    RAISE EXCEPTION 'version_conflict' USING ERRCODE = '40001';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members member
    WHERE member.organization_id = target.organization_id
      AND member.user_id = p_actor_id
      AND member.status = 'active'
  ) OR NOT public.organization_has_active_product_entitlement(
    target.organization_id,
    'invoicing.enabled'
  ) THEN
    RAISE EXCEPTION 'invoicing_entitlement_required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO customer
  FROM public.invoicing_parties
  WHERE id = NULLIF(p_invoice->>'customerPartyId', '')::UUID
    AND organization_id = target.organization_id;
  IF NOT FOUND OR NOT (customer.roles @> ARRAY['customer']::TEXT[]) THEN
    RAISE EXCEPTION 'customer_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF jsonb_typeof(p_invoice->'lines') <> 'array' THEN
    RAISE EXCEPTION 'invalid_invoice_lines' USING ERRCODE = '22023';
  END IF;
  line_count := jsonb_array_length(p_invoice->'lines');
  IF line_count < 1 OR line_count > 500 THEN
    RAISE EXCEPTION 'invalid_invoice_line_count' USING ERRCODE = '22023';
  END IF;

  FOR line IN SELECT value FROM jsonb_array_elements(p_invoice->'lines')
  LOOP
    v_subtotal_minor := v_subtotal_minor + (line->>'netAmountMinor')::BIGINT;
    v_tax_total_minor := v_tax_total_minor + (line->>'taxAmountMinor')::BIGINT;
    v_total_minor := v_total_minor + (line->>'grossAmountMinor')::BIGINT;
    IF (line->>'grossAmountMinor')::BIGINT <>
       (line->>'netAmountMinor')::BIGINT + (line->>'taxAmountMinor')::BIGINT THEN
      RAISE EXCEPTION 'invalid_invoice_line_total' USING ERRCODE = '22023';
    END IF;
  END LOOP;
  IF v_subtotal_minor <> (p_invoice->>'subtotalMinor')::BIGINT
     OR v_tax_total_minor <> (p_invoice->>'taxTotalMinor')::BIGINT
     OR v_total_minor <> (p_invoice->>'totalMinor')::BIGINT
     OR v_total_minor <> v_subtotal_minor + v_tax_total_minor THEN
    RAISE EXCEPTION 'invalid_invoice_totals' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.invoicing_tax_breakdowns WHERE invoice_id = target.id;
  DELETE FROM public.invoicing_invoice_lines WHERE invoice_id = target.id;

  FOR line IN SELECT value FROM jsonb_array_elements(p_invoice->'lines')
  LOOP
    INSERT INTO public.invoicing_invoice_lines (
      id, invoice_id, position, description, quantity_decimal, unit,
      unit_price_minor_decimal, tax_rate_bps, tax_category,
      exemption_reason_code, exemption_reason, net_amount_minor,
      tax_amount_minor, gross_amount_minor
    ) VALUES (
      (line->>'id')::UUID, target.id, (line->>'position')::INTEGER,
      line->>'description', (line->>'quantity')::NUMERIC,
      line->>'unit', (line->>'unitPriceMinorDecimal')::NUMERIC,
      (line->>'taxRateBps')::INTEGER, line->>'taxCategory',
      NULLIF(line->>'exemptionReasonCode',''),
      NULLIF(line->>'exemptionReason',''),
      (line->>'netAmountMinor')::BIGINT,
      (line->>'taxAmountMinor')::BIGINT,
      (line->>'grossAmountMinor')::BIGINT
    );
  END LOOP;

  IF jsonb_typeof(p_invoice->'taxBreakdowns') <> 'array' THEN
    RAISE EXCEPTION 'invalid_tax_breakdowns' USING ERRCODE = '22023';
  END IF;
  FOR tax IN SELECT value FROM jsonb_array_elements(p_invoice->'taxBreakdowns')
  LOOP
    INSERT INTO public.invoicing_tax_breakdowns (
      invoice_id, tax_rate_bps, tax_category, taxable_amount_minor,
      tax_amount_minor
    ) VALUES (
      target.id, (tax->>'taxRateBps')::INTEGER, tax->>'taxCategory',
      (tax->>'taxableAmountMinor')::BIGINT,
      (tax->>'taxAmountMinor')::BIGINT
    );
  END LOOP;

  UPDATE public.invoicing_invoices
  SET customer_party_id = customer.id,
      issue_date = (p_invoice->>'issueDate')::DATE,
      due_date = (p_invoice->>'dueDate')::DATE,
      service_period_start = NULLIF(p_invoice->>'servicePeriodStart','')::DATE,
      service_period_end = NULLIF(p_invoice->>'servicePeriodEnd','')::DATE,
      purchase_order_reference = NULLIF(p_invoice->>'purchaseOrderReference',''),
      customer_reference = NULLIF(p_invoice->>'customerReference',''),
      notes = NULLIF(p_invoice->>'notes',''),
      commercial_state = 'READY_TO_FINALIZE',
      subtotal_minor = v_subtotal_minor,
      tax_total_minor = v_tax_total_minor,
      total_minor = v_total_minor,
      outstanding_minor = v_total_minor,
      version = version + 1,
      updated_at = NOW()
  WHERE id = target.id
  RETURNING * INTO target;

  INSERT INTO public.invoicing_outbox (
    organization_id, legal_entity_id, invoice_id, market_code, country_code,
    environment_id, event_type, idempotency_key, correlation_id, payload
  ) VALUES (
    target.organization_id, target.legal_entity_id, target.id,
    target.market_code, target.country_code, target.environment_id,
    'InvoiceDraftUpdated', 'draft-update:' || target.id::TEXT || ':' || target.version::TEXT,
    correlation_id, jsonb_build_object(
      'invoiceId', target.id, 'version', target.version,
      'marketCode', target.market_code, 'currency', target.currency
    )
  );

  INSERT INTO public.invoicing_audit_events (
    organization_id, legal_entity_id, invoice_id, market_code, country_code,
    environment_id, actor_id, action, resource_type, resource_id, request_id,
    correlation_id, reason_code, safe_metadata
  ) VALUES (
    target.organization_id, target.legal_entity_id, target.id,
    target.market_code, target.country_code, target.environment_id,
    p_actor_id, 'invoice.draft_updated', 'invoice', target.id, p_request_id,
    correlation_id, 'user_requested',
    jsonb_build_object('version', target.version, 'lineCount', line_count)
  );

  RETURN target;
END;
$$;

REVOKE ALL ON FUNCTION public.update_invoicing_invoice_draft(UUID,UUID,BIGINT,JSONB,TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_invoicing_invoice_draft(UUID,UUID,BIGINT,JSONB,TEXT)
  TO service_role;

COMMENT ON FUNCTION public.organization_has_active_product_entitlement(UUID,TEXT) IS
  'Organization-level product gate backed by active monetization entitlements on the existing organization owner account.';
COMMENT ON FUNCTION public.update_invoicing_invoice_draft(UUID,UUID,BIGINT,JSONB,TEXT) IS
  'Optimistic, entitlement-checked draft replacement. Finalized legal records remain immutable.';
