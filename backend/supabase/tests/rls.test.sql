BEGIN;

SELECT plan(10);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.invoicing_parties'::regclass),
  'invoicing parties have RLS enabled'
);
SELECT ok(
  (SELECT relforcerowsecurity FROM pg_class WHERE oid = 'public.invoicing_parties'::regclass),
  'invoicing parties force RLS for table owners'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.monetization_entitlements'::regclass),
  'monetization entitlements have RLS enabled'
);

INSERT INTO public.profiles (
  id, auth_user_id, slug, email, name, account_type, primary_role, status,
  country, professional_vertical
) VALUES
  ('91000000-0000-4000-a000-000000000001', '92000000-0000-4000-a000-000000000001',
   'rls-owner-one', 'rls-owner-one@example.test', 'RLS Owner One',
   'professional', 'pro_seller', 'active', 'FR', 'generic'),
  ('91000000-0000-4000-a000-000000000002', '92000000-0000-4000-a000-000000000002',
   'rls-owner-two', 'rls-owner-two@example.test', 'RLS Owner Two',
   'professional', 'pro_seller', 'active', 'FR', 'generic');

INSERT INTO public.organizations (
  id, owner_id, legal_name, trade_name, registered_address, city,
  postal_code, country, professional_vertical, status
) VALUES
  ('93000000-0000-4000-a000-000000000001', '91000000-0000-4000-a000-000000000001',
   'RLS Organization One', 'RLS One', '1 rue des Tests', 'Paris', '75001',
   'FR', 'generic', 'active'),
  ('93000000-0000-4000-a000-000000000002', '91000000-0000-4000-a000-000000000002',
   'RLS Organization Two', 'RLS Two', '2 rue des Tests', 'Paris', '75002',
   'FR', 'generic', 'active');

INSERT INTO public.organization_members (
  organization_id, user_id, role, status, permissions
) VALUES
  ('93000000-0000-4000-a000-000000000001', '91000000-0000-4000-a000-000000000001',
   'owner', 'active', ARRAY['invoice.read','subscription.manage.own']),
  ('93000000-0000-4000-a000-000000000002', '91000000-0000-4000-a000-000000000002',
   'owner', 'active', ARRAY['invoice.read','subscription.manage.own']);

INSERT INTO public.monetization_entitlements (
  id, account_id, organization_id, product_id, entitlement_key,
  entitlement_value, starts_at, status
) VALUES (
  '94000000-0000-4000-a000-000000000001',
  '91000000-0000-4000-a000-000000000001',
  '93000000-0000-4000-a000-000000000001',
  'product.facturation', 'invoicing.enabled', 'true'::JSONB, NOW(), 'active'
);

INSERT INTO public.invoicing_parties (
  id, organization_id, party_kind, roles, legal_name,
  billing_address_line_1, billing_postal_code, billing_city,
  billing_country_code, locale, preferred_currency
) VALUES
  ('95000000-0000-4000-a000-000000000001', '93000000-0000-4000-a000-000000000001',
   'company', ARRAY['customer'], 'Visible Customer', '1 rue Client', '75001',
   'Paris', 'FR', 'fr-FR', 'EUR'),
  ('95000000-0000-4000-a000-000000000002', '93000000-0000-4000-a000-000000000002',
   'company', ARRAY['customer'], 'Isolated Customer', '2 rue Client', '75002',
   'Paris', 'FR', 'fr-FR', 'EUR');

SELECT ok(
  public.organization_has_active_product_entitlement(
    '93000000-0000-4000-a000-000000000001', 'invoicing.enabled'
  ),
  'the explicitly entitled organization resolves active access'
);
SELECT ok(
  NOT public.organization_has_active_product_entitlement(
    '93000000-0000-4000-a000-000000000002', 'invoicing.enabled'
  ),
  'organization ownership alone does not resolve product access'
);

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub', '92000000-0000-4000-a000-000000000001', true
);
SELECT is(
  (SELECT count(*) FROM public.invoicing_parties), 1::BIGINT,
  'an entitled member sees only its organization party'
);
SELECT is(
  (SELECT count(*) FROM public.invoicing_parties
    WHERE organization_id = '93000000-0000-4000-a000-000000000002'),
  0::BIGINT,
  'an entitled member cannot read another organization party'
);
SELECT throws_ok(
  $$ INSERT INTO public.invoicing_parties (
       organization_id, party_kind, roles, legal_name,
       billing_address_line_1, billing_postal_code, billing_city,
       billing_country_code, locale, preferred_currency
     ) VALUES (
       '93000000-0000-4000-a000-000000000001', 'company', ARRAY['customer'],
       'Browser Write', '3 rue Client', '75003', 'Paris', 'FR', 'fr-FR', 'EUR'
     ) $$,
  '42501', NULL,
  'authenticated browser roles cannot write invoicing parties directly'
);

SELECT set_config(
  'request.jwt.claim.sub', '92000000-0000-4000-a000-000000000002', true
);
SELECT is(
  (SELECT count(*) FROM public.invoicing_parties), 0::BIGINT,
  'an organization owner without Facturation entitlement sees no parties'
);

SET LOCAL ROLE anon;
SELECT is(
  (SELECT count(*) FROM public.invoicing_parties), 0::BIGINT,
  'anonymous users see no invoicing parties'
);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
