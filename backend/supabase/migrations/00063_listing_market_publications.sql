-- =============================================================================
-- One listing, many explicit market publications.
-- Shared listing content remains on listings; market availability, localized
-- presentation, price, compliance and services live on this relation.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.listing_market_publications (
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  market_code VARCHAR(2) NOT NULL REFERENCES public.markets(code) ON DELETE RESTRICT,
  status VARCHAR(24) NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft', 'pending_review', 'active', 'paused', 'suspended',
      'rejected', 'expired'
    )),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  price_minor BIGINT NOT NULL CHECK (price_minor >= 0),
  currency VARCHAR(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  localized_content JSONB NOT NULL DEFAULT '{}'::jsonb,
  available_services JSONB NOT NULL DEFAULT '{}'::jsonb,
  compliance_state VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (compliance_state IN ('pending', 'approved', 'restricted', 'rejected')),
  published_at TIMESTAMPTZ,
  sort_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (listing_id, market_code)
);

CREATE UNIQUE INDEX IF NOT EXISTS listing_market_one_primary_idx
  ON public.listing_market_publications (listing_id)
  WHERE is_primary = TRUE;
CREATE INDEX IF NOT EXISTS listing_market_discovery_idx
  ON public.listing_market_publications
    (market_code, status, sort_date DESC, listing_id);
CREATE INDEX IF NOT EXISTS listing_market_currency_price_idx
  ON public.listing_market_publications
    (market_code, currency, price_minor, listing_id)
  WHERE status = 'active';

DROP TRIGGER IF EXISTS set_listing_market_publications_updated_at
  ON public.listing_market_publications;
CREATE TRIGGER set_listing_market_publications_updated_at
  BEFORE UPDATE ON public.listing_market_publications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Existing rows become one explicit primary publication. ISO 4217 exponents
-- are preserved for currencies currently or plausibly present in legacy data.
INSERT INTO public.listing_market_publications (
  listing_id,
  market_code,
  status,
  is_primary,
  price_minor,
  currency,
  compliance_state,
  published_at,
  sort_date,
  created_at,
  updated_at
)
SELECT
  listing.id,
  listing.market_code,
  CASE
    WHEN listing.status IN ('published', 'reserved', 'sold') THEN 'active'
    WHEN listing.status = 'flagged' THEN 'pending_review'
    WHEN listing.status = 'rejected' THEN 'rejected'
    WHEN listing.status = 'archived' THEN 'expired'
    ELSE 'draft'
  END,
  TRUE,
  CASE
    WHEN listing.currency IN ('BIF','CLP','DJF','GNF','ISK','JPY','KMF','KRW','PYG','RWF','UGX','UYI','VND','VUV','XAF','XOF','XPF')
      THEN ROUND(listing.price)::BIGINT
    WHEN listing.currency IN ('BHD','IQD','JOD','KWD','LYD','OMR','TND')
      THEN ROUND(listing.price * 1000)::BIGINT
    ELSE ROUND(listing.price * 100)::BIGINT
  END,
  UPPER(listing.currency),
  CASE WHEN listing.status = 'flagged' THEN 'pending' ELSE 'approved' END,
  listing.published_at,
  COALESCE(listing.organic_freshness_at, listing.published_at, listing.created_at),
  listing.created_at,
  listing.updated_at
FROM public.listings AS listing
WHERE listing.market_code IS NOT NULL
ON CONFLICT (listing_id, market_code) DO NOTHING;

-- Legacy columns remain temporarily for compatibility, but new writes must be
-- explicit. The relation above is the source for market-scoped discovery.
ALTER TABLE public.listings
  ALTER COLUMN market_code DROP DEFAULT,
  ALTER COLUMN currency DROP DEFAULT;

ALTER TABLE public.listing_market_publications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active listing market publications are public"
  ON public.listing_market_publications;
CREATE POLICY "Active listing market publications are public"
  ON public.listing_market_publications FOR SELECT
  USING (
    status = 'active'
    AND compliance_state = 'approved'
    AND EXISTS (
      SELECT 1
      FROM public.listings AS listing
      WHERE listing.id = listing_market_publications.listing_id
        AND listing.status IN ('published', 'reserved', 'sold')
    )
  );

DROP POLICY IF EXISTS "Publishers manage listing market publications"
  ON public.listing_market_publications;
CREATE POLICY "Publishers manage listing market publications"
  ON public.listing_market_publications FOR ALL
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.listings AS listing
      JOIN public.profiles AS profile
        ON profile.id IN (listing.seller_id, listing.publisher_user_id)
      WHERE listing.id = listing_market_publications.listing_id
        AND profile.auth_user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.listings AS listing
      JOIN public.profiles AS profile
        ON profile.id IN (listing.seller_id, listing.publisher_user_id)
      WHERE listing.id = listing_market_publications.listing_id
        AND profile.auth_user_id = (SELECT auth.uid())
    )
  );

GRANT SELECT ON public.listing_market_publications TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.listing_market_publications TO authenticated;

COMMENT ON TABLE public.listing_market_publications IS
  'Explicit market publication state for a shared listing. No market inherits another market publication.';
COMMENT ON COLUMN public.listing_market_publications.price_minor IS
  'Authoritative market price in ISO 4217 minor units.';
COMMENT ON COLUMN public.listing_market_publications.available_services IS
  'Resolved market service availability snapshot; never interpreted as provider credentials.';
