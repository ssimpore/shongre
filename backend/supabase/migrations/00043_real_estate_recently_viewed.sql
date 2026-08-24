CREATE TABLE IF NOT EXISTS public.real_estate_recently_viewed (
  account_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.real_estate_properties(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (account_id, property_id)
);

CREATE INDEX IF NOT EXISTS real_estate_recently_viewed_account_time_idx
  ON public.real_estate_recently_viewed (account_id, viewed_at DESC);

ALTER TABLE public.real_estate_recently_viewed ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.real_estate_recently_viewed FROM anon, authenticated;
