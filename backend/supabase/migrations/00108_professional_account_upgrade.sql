-- Atomically upgrades a customer account and provisions its legal organization.
-- Verification and product entitlements remain separate, privileged workflows.

CREATE OR REPLACE FUNCTION public.upgrade_account_to_professional(
  p_user_id UUID,
  p_company_name TEXT,
  p_business_identifier TEXT,
  p_legal_form TEXT,
  p_vat_number TEXT,
  p_business_address TEXT,
  p_phone TEXT
)
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO target
  FROM public.profiles profile
  WHERE profile.id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'account_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF target.status <> 'active' THEN
    RAISE EXCEPTION 'active_account_required' USING ERRCODE = '42501';
  END IF;
  IF target.account_family <> 'individual' THEN
    RAISE EXCEPTION 'individual_account_required' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.staff_memberships membership
    WHERE membership.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'staff_account_forbidden' USING ERRCODE = '42501';
  END IF;
  IF target.city IS NULL OR target.postal_code IS NULL THEN
    RAISE EXCEPTION 'profile_address_required' USING ERRCODE = '22023';
  END IF;

  UPDATE public.profiles
  SET
    account_type = 'professional',
    primary_role = 'pro_seller',
    professional_vertical = COALESCE(professional_vertical, 'generic'),
    phone = COALESCE(NULLIF(trim(p_phone), ''), phone),
    is_business_verified = FALSE,
    updated_at = NOW()
  WHERE id = p_user_id;

  PERFORM public.ensure_owned_organization(
    p_user_id,
    p_company_name,
    p_company_name,
    p_business_identifier,
    p_vat_number,
    p_legal_form,
    p_business_address,
    target.city,
    target.postal_code,
    target.country,
    'generic'
  );

  RETURN QUERY SELECT * FROM public.profiles WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.upgrade_account_to_professional(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upgrade_account_to_professional(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO service_role;

COMMENT ON FUNCTION public.upgrade_account_to_professional(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) IS 'Service-role workflow that atomically upgrades an Individual account and provisions its unverified legal organization.';
