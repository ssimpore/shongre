-- =============================================================================
-- Shared organization provisioning for independently acquired Shongre products
--
-- Creates the common organization/team context only. Product access remains a
-- separate monetization entitlement and is deliberately not granted here.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.organization_business_identifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  country_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  identifier_type TEXT NOT NULL DEFAULT 'BUSINESS_REGISTRATION'
    CHECK (char_length(identifier_type) BETWEEN 1 AND 80),
  identifier_value TEXT NOT NULL CHECK (char_length(identifier_value) BETWEEN 1 AND 180),
  verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified','pending','verified','rejected','expired')),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, country_code, identifier_type),
  UNIQUE (country_code, identifier_type, identifier_value)
);

CREATE INDEX IF NOT EXISTS organization_business_identifiers_organization_idx
  ON public.organization_business_identifiers (organization_id, country_code);

ALTER TABLE public.organization_business_identifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_business_identifiers FORCE ROW LEVEL SECURITY;

CREATE POLICY organization_business_identifiers_member_read
  ON public.organization_business_identifiers FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members member
      JOIN public.profiles profile ON profile.id = member.user_id
      WHERE member.organization_id = organization_business_identifiers.organization_id
        AND member.status = 'active'
        AND profile.auth_user_id = (SELECT public.auth_uid())
    )
    OR (SELECT public.is_admin())
  );

CREATE OR REPLACE FUNCTION public.ensure_owned_organization(
  p_owner_id UUID,
  p_legal_name TEXT,
  p_trading_name TEXT,
  p_business_identifier TEXT,
  p_vat_number TEXT,
  p_legal_form TEXT,
  p_registered_address TEXT,
  p_city TEXT,
  p_postal_code TEXT,
  p_country_code TEXT,
  p_professional_vertical TEXT
)
RETURNS SETOF public.organizations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target public.organizations%ROWTYPE;
  normalized_identifier TEXT := regexp_replace(trim(p_business_identifier), '[\s.\-]', '', 'g');
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles profile
    WHERE profile.id = p_owner_id
      AND profile.account_family = 'professional'
      AND profile.status = 'active'
  ) THEN
    RAISE EXCEPTION 'professional_owner_required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.markets market
    WHERE market.code = upper(p_country_code)
      AND market.is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'active_market_required' USING ERRCODE = '22023';
  END IF;

  IF trim(p_legal_name) = ''
    OR normalized_identifier = ''
    OR trim(p_registered_address) = ''
    OR trim(p_city) = ''
    OR trim(p_postal_code) = '' THEN
    RAISE EXCEPTION 'organization_details_required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO target
  FROM public.organizations organization
  WHERE organization.owner_id = p_owner_id
    AND organization.status = 'active'
  ORDER BY organization.created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.organizations (
      owner_id, legal_name, trade_name, siren, siret, vat_number, legal_form,
      registered_address, city, postal_code, country, professional_vertical,
      status
    ) VALUES (
      p_owner_id,
      trim(p_legal_name),
      NULLIF(trim(p_trading_name), ''),
      CASE
        WHEN upper(p_country_code) = 'FR' AND length(normalized_identifier) IN (9,14)
          THEN left(normalized_identifier, 9)
        ELSE NULL
      END,
      CASE
        WHEN upper(p_country_code) = 'FR' AND length(normalized_identifier) = 14
          THEN normalized_identifier
        ELSE NULL
      END,
      NULLIF(trim(p_vat_number), ''),
      NULLIF(trim(p_legal_form), ''),
      trim(p_registered_address),
      trim(p_city),
      trim(p_postal_code),
      upper(p_country_code),
      p_professional_vertical,
      'active'
    )
    RETURNING * INTO target;
  END IF;

  INSERT INTO public.organization_members (
    organization_id, user_id, role, status, permissions
  ) VALUES (
    target.id,
    p_owner_id,
    'owner',
    'active',
    ARRAY[
      'invoice.read',
      'invoice.create',
      'invoice.finalize',
      'invoice.export',
      'invoice.party.manage',
      'invoicing.tenant.manage',
      'subscription.manage.own'
    ]::TEXT[]
  )
  ON CONFLICT (organization_id, user_id) DO UPDATE SET
    role = 'owner',
    status = 'active',
    updated_at = NOW();

  INSERT INTO public.organization_markets (
    organization_id, market_code, status, verification_state
  ) VALUES (
    target.id, upper(p_country_code), 'active', 'pending'
  )
  ON CONFLICT (organization_id, market_code) DO NOTHING;

  INSERT INTO public.organization_business_identifiers (
    organization_id, country_code, identifier_type, identifier_value
  ) VALUES (
    target.id,
    upper(p_country_code),
    'BUSINESS_REGISTRATION',
    normalized_identifier
  )
  ON CONFLICT (organization_id, country_code, identifier_type) DO NOTHING;

  RETURN NEXT target;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_owned_organization(
  UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_owned_organization(
  UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT
) TO service_role;

COMMENT ON FUNCTION public.ensure_owned_organization(
  UUID,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT
) IS 'Idempotently provisions shared organization/team context. Never grants a product entitlement.';

CREATE OR REPLACE FUNCTION public.bootstrap_invoicing_legal_entity_from_organization(
  p_organization_id UUID,
  p_actor_id UUID,
  p_market_code TEXT,
  p_currency TEXT,
  p_locale TEXT,
  p_timezone TEXT
)
RETURNS public.invoicing_legal_entities
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  organization public.organizations%ROWTYPE;
  target public.invoicing_legal_entities%ROWTYPE;
  business_identifier public.organization_business_identifiers%ROWTYPE;
  legacy_identifier TEXT;
  legacy_identifier_type TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members member
    WHERE member.organization_id = p_organization_id
      AND member.user_id = p_actor_id
      AND member.status = 'active'
  ) OR NOT public.organization_has_active_product_entitlement(
    p_organization_id,
    'invoicing.enabled'
  ) THEN
    RAISE EXCEPTION 'invoicing_entitlement_required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO organization
  FROM public.organizations candidate
  WHERE candidate.id = p_organization_id
    AND candidate.status = 'active'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'organization_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF organization.country <> upper(p_market_code) THEN
    RAISE EXCEPTION 'organization_market_mismatch' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO target
  FROM public.invoicing_legal_entities entity
  WHERE entity.organization_id = p_organization_id
    AND entity.default_market_code = upper(p_market_code)
  ORDER BY entity.created_at ASC
  LIMIT 1;
  IF FOUND THEN
    RETURN target;
  END IF;

  INSERT INTO public.invoicing_legal_entities (
    organization_id, legal_name, trading_name, legal_form, country_code,
    default_market_code, default_currency, default_locale, timezone,
    address_line_1, postal_code, city, address_country_code,
    verification_status
  ) VALUES (
    organization.id,
    organization.legal_name,
    organization.trade_name,
    organization.legal_form,
    organization.country,
    upper(p_market_code),
    upper(p_currency),
    p_locale,
    p_timezone,
    organization.registered_address,
    organization.postal_code,
    organization.city,
    organization.country,
    CASE WHEN organization.is_verified THEN 'verified' ELSE 'unverified' END
  )
  RETURNING * INTO target;

  SELECT * INTO business_identifier
  FROM public.organization_business_identifiers identifier
  WHERE identifier.organization_id = organization.id
    AND identifier.country_code = organization.country
  ORDER BY identifier.created_at ASC
  LIMIT 1;

  IF FOUND THEN
    INSERT INTO public.invoicing_legal_identifiers (
      legal_entity_id, identifier_type, country_code, identifier_value,
      verification_status, verified_at, verification_source
    ) VALUES (
      target.id,
      business_identifier.identifier_type,
      business_identifier.country_code,
      business_identifier.identifier_value,
      business_identifier.verification_status,
      business_identifier.verified_at,
      'shared_organization'
    );
  ELSE
    legacy_identifier := COALESCE(organization.siret, organization.siren);
    legacy_identifier_type := CASE
      WHEN organization.siret IS NOT NULL THEN 'SIRET'
      WHEN organization.siren IS NOT NULL THEN 'SIREN'
      ELSE NULL
    END;
    IF legacy_identifier IS NOT NULL THEN
      INSERT INTO public.invoicing_legal_identifiers (
        legal_entity_id, identifier_type, country_code, identifier_value,
        verification_status, verification_source
      ) VALUES (
        target.id,
        legacy_identifier_type,
        organization.country,
        legacy_identifier,
        CASE WHEN organization.is_verified THEN 'verified' ELSE 'unverified' END,
        'shared_organization_legacy'
      );
    END IF;
  END IF;

  RETURN target;
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_invoicing_legal_entity_from_organization(
  UUID,UUID,TEXT,TEXT,TEXT,TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_invoicing_legal_entity_from_organization(
  UUID,UUID,TEXT,TEXT,TEXT,TEXT
) TO service_role;

COMMENT ON FUNCTION public.bootstrap_invoicing_legal_entity_from_organization(
  UUID,UUID,TEXT,TEXT,TEXT,TEXT
) IS 'Creates the first Facturation legal entity from shared organization facts without duplicating user input.';
