-- Public hostnames are deployment configuration, not mutable market content.
-- Markets retain only the stable canonical-domain mode and public path.

ALTER TABLE public.markets
  ADD COLUMN IF NOT EXISTS canonical_domain_mode TEXT;

UPDATE public.markets
SET canonical_domain_mode = CASE
  WHEN code = 'FR' THEN 'france'
  ELSE 'international'
END
WHERE canonical_domain_mode IS NULL;

ALTER TABLE public.markets
  ALTER COLUMN canonical_domain_mode SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'markets_canonical_domain_mode_check'
  ) THEN
    ALTER TABLE public.markets
      ADD CONSTRAINT markets_canonical_domain_mode_check
      CHECK (canonical_domain_mode IN ('france', 'international'));
  END IF;
END $$;

DROP INDEX IF EXISTS public.markets_domain_path_unique_idx;

CREATE UNIQUE INDEX IF NOT EXISTS markets_domain_mode_path_unique_idx
  ON public.markets (canonical_domain_mode, base_path);

ALTER TABLE public.markets
  DROP COLUMN IF EXISTS primary_domain;
