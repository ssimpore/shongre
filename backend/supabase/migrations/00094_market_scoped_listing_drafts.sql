-- Listing onboarding drafts are account-plus-market state. Existing rows are
-- preserved and backfilled from their explicit draft market when possible.
ALTER TABLE public.listing_drafts
  ADD COLUMN IF NOT EXISTS market_code VARCHAR(2);

UPDATE public.listing_drafts
SET market_code = UPPER(COALESCE(NULLIF(draft_data ->> 'marketCode', ''), 'FR'))
WHERE market_code IS NULL;

ALTER TABLE public.listing_drafts
  ALTER COLUMN market_code SET NOT NULL;

ALTER TABLE public.listing_drafts
  DROP CONSTRAINT IF EXISTS listing_drafts_pkey;

ALTER TABLE public.listing_drafts
  ADD CONSTRAINT listing_drafts_pkey PRIMARY KEY (user_id, market_code);

ALTER TABLE public.listing_drafts
  DROP CONSTRAINT IF EXISTS listing_drafts_market_code_fkey;

ALTER TABLE public.listing_drafts
  ADD CONSTRAINT listing_drafts_market_code_fkey
  FOREIGN KEY (market_code) REFERENCES public.markets(code) ON DELETE RESTRICT
  NOT VALID;

ALTER TABLE public.listing_drafts
  VALIDATE CONSTRAINT listing_drafts_market_code_fkey;

CREATE INDEX IF NOT EXISTS listing_drafts_market_updated_idx
  ON public.listing_drafts (market_code, updated_at DESC);
