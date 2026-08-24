-- Authenticated uploads enter a private staging bucket, are inspected by the
-- backend, and are only then copied to the public immutable media bucket.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-media-staging',
  'listing-media-staging',
  FALSE,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-media',
  'listing-media',
  TRUE,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE TABLE IF NOT EXISTS public.listing_media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  staging_path TEXT NOT NULL UNIQUE,
  public_path TEXT UNIQUE,
  public_url TEXT UNIQUE,
  original_file_name VARCHAR(255) NOT NULL,
  declared_content_type VARCHAR(50) NOT NULL,
  detected_content_type VARCHAR(50),
  declared_size_bytes BIGINT NOT NULL,
  actual_size_bytes BIGINT,
  status VARCHAR(30) NOT NULL DEFAULT 'upload_pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  attached_at TIMESTAMPTZ,
  CONSTRAINT listing_media_asset_type_check CHECK (
    declared_content_type IN ('image/jpeg', 'image/png', 'image/webp')
    AND (
      detected_content_type IS NULL
      OR detected_content_type IN ('image/jpeg', 'image/png', 'image/webp')
    )
  ),
  CONSTRAINT listing_media_asset_size_check CHECK (
    declared_size_bytes BETWEEN 1 AND 10485760
    AND (actual_size_bytes IS NULL OR actual_size_bytes BETWEEN 1 AND 10485760)
  ),
  CONSTRAINT listing_media_asset_status_check CHECK (
    status IN ('upload_pending', 'ready', 'attached', 'rejected')
  )
);

CREATE INDEX IF NOT EXISTS listing_media_assets_owner_status_idx
  ON public.listing_media_assets (owner_user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS listing_media_assets_unattached_idx
  ON public.listing_media_assets (created_at)
  WHERE status IN ('upload_pending', 'ready');

ALTER TABLE public.listing_media_assets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.listing_media_assets FROM anon, authenticated;

-- Media rows are public to read, but mutation is a backend operation so an
-- authenticated browser cannot attach arbitrary URLs to a seller's listing.
DROP POLICY IF EXISTS "Sellers can manage media for own listings"
  ON public.listing_media;
REVOKE INSERT, UPDATE, DELETE ON public.listing_media FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.attach_owned_listing_media(
  p_owner_user_id UUID,
  p_listing_id UUID,
  p_urls TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  matched_count INTEGER;
BEGIN
  IF COALESCE(array_length(p_urls, 1), 0) = 0
     OR COALESCE(array_length(p_urls, 1), 0) > 20 THEN
    RAISE EXCEPTION 'Invalid media count' USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.listings
    WHERE id = p_listing_id AND seller_id = p_owner_user_id
  ) THEN
    RAISE EXCEPTION 'Listing ownership required' USING ERRCODE = '42501';
  END IF;

  PERFORM 1
  FROM public.listing_media_assets
  WHERE owner_user_id = p_owner_user_id
    AND status = 'ready'
    AND public_url = ANY(p_urls)
  FOR UPDATE;

  SELECT COUNT(*)
  INTO matched_count
  FROM public.listing_media_assets
  WHERE owner_user_id = p_owner_user_id
    AND status = 'ready'
    AND public_url = ANY(p_urls);

  IF matched_count <> array_length(p_urls, 1) THEN
    RAISE EXCEPTION 'Every media asset must be ready and owned by the seller'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.listing_media (listing_id, url, sort_order, is_primary, file_size_bytes)
  SELECT
    p_listing_id,
    requested.url,
    requested.ordinality - 1,
    requested.ordinality = 1,
    asset.actual_size_bytes
  FROM unnest(p_urls) WITH ORDINALITY AS requested(url, ordinality)
  JOIN public.listing_media_assets AS asset
    ON asset.public_url = requested.url
   AND asset.owner_user_id = p_owner_user_id
   AND asset.status = 'ready';

  UPDATE public.listing_media_assets
  SET
    listing_id = p_listing_id,
    status = 'attached',
    attached_at = NOW()
  WHERE owner_user_id = p_owner_user_id
    AND status = 'ready'
    AND public_url = ANY(p_urls);
END;
$$;

REVOKE ALL ON FUNCTION public.attach_owned_listing_media(UUID, UUID, TEXT[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.attach_owned_listing_media(UUID, UUID, TEXT[])
  TO service_role;
