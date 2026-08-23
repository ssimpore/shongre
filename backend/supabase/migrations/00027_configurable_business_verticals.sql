-- Commercial vertical identifiers are configuration data, not a release-time enum.
-- Keep the identifier constrained and referenced, while allowing future verticals.

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace namespace ON namespace.oid = rel.relnamespace
    WHERE namespace.nspname = 'public'
      AND rel.relname = 'business_verticals'
      AND con.contype = 'c'
      AND (
        con.conname = 'business_verticals_id_check'
        OR (
          pg_get_constraintdef(con.oid) ILIKE '%general%'
          AND pg_get_constraintdef(con.oid) ILIKE '%auto%'
          AND pg_get_constraintdef(con.oid) ILIKE '%immo%'
          AND pg_get_constraintdef(con.oid) ILIKE '%emploi%'
          AND pg_get_constraintdef(con.oid) ILIKE '%cours%'
          AND pg_get_constraintdef(con.oid) ILIKE '%services%'
        )
      )
  LOOP
    EXECUTE format(
      'ALTER TABLE public.business_verticals DROP CONSTRAINT %I',
      constraint_name
    );
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace namespace ON namespace.oid = rel.relnamespace
    WHERE namespace.nspname = 'public'
      AND rel.relname = 'business_verticals'
      AND con.conname = 'business_verticals_id_format_check'
  ) THEN
    ALTER TABLE public.business_verticals
      ADD CONSTRAINT business_verticals_id_format_check
      CHECK (id ~ '^[a-z][a-z0-9_-]{1,29}$') NOT VALID;
  END IF;
END $$;

ALTER TABLE public.business_verticals
  VALIDATE CONSTRAINT business_verticals_id_format_check;

ALTER TABLE public.business_verticals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_verticals FROM anon, authenticated;

-- A campaign may deliberately chain an initial free phase with the existing
-- provider-backed, fixed-period discount. The immutable catalog snapshot stays
-- authoritative; this column is only its queryable projection.
ALTER TABLE public.monetization_promotions
  ADD COLUMN IF NOT EXISTS free_period_days INT
    CHECK (free_period_days IS NULL OR free_period_days > 0);

CREATE OR REPLACE FUNCTION public.sync_promotion_free_period_days()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.monetization_promotions stored_promotion
  SET free_period_days = NULLIF(promotion->>'freePeriodDays', '')::INT,
      updated_at = NOW()
  FROM jsonb_array_elements(NEW.snapshot->'promotions') promotion
  WHERE stored_promotion.id = promotion->>'id'
    AND stored_promotion.configuration_version_id = NEW.id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS commercial_configuration_sync_promotion_free_period
  ON public.commercial_configuration_versions;
CREATE CONSTRAINT TRIGGER commercial_configuration_sync_promotion_free_period
AFTER INSERT OR UPDATE OF snapshot ON public.commercial_configuration_versions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.sync_promotion_free_period_days();

-- Installs a compiled, audited catalog release without mutating its predecessor.
-- Any failure rolls the archive step back with the import in the same transaction.
CREATE OR REPLACE FUNCTION public.install_commercial_catalog_release(
  p_catalog JSONB,
  p_snapshot_hash TEXT,
  p_reason TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_id VARCHAR := p_catalog->>'configurationVersionId';
  target_market VARCHAR := p_catalog->>'marketCode';
  target_version INT := (p_catalog->>'versionNumber')::INT;
  target_effective_at TIMESTAMPTZ := (p_catalog->>'generatedAt')::TIMESTAMPTZ;
  existing_hash TEXT;
  existing_status VARCHAR;
  latest_version INT;
BEGIN
  IF jsonb_typeof(p_catalog) <> 'object'
     OR target_id IS NULL
     OR target_market IS NULL
     OR target_version IS NULL
     OR length(p_snapshot_hash) <> 64
     OR length(p_reason) < 8 THEN
    RAISE EXCEPTION 'invalid commercial catalog release';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext('commercial-catalog-release-' || target_market)
  );

  SELECT snapshot_hash, status
  INTO existing_hash, existing_status
  FROM public.commercial_configuration_versions
  WHERE id = target_id
  FOR UPDATE;

  IF FOUND THEN
    IF existing_hash = p_snapshot_hash AND existing_status = 'active' THEN
      RETURN;
    END IF;
    RAISE EXCEPTION 'commercial catalog release id already exists';
  END IF;

  SELECT COALESCE(MAX(version_number), 0)
  INTO latest_version
  FROM public.commercial_configuration_versions
  WHERE rule_set_id = 'commercial-core'
    AND market_code = target_market;

  IF target_version <= latest_version THEN
    RAISE EXCEPTION 'commercial catalog version must increase';
  END IF;

  UPDATE public.commercial_configuration_versions
  SET status = 'archived',
      effective_until = target_effective_at,
      updated_at = NOW()
  WHERE rule_set_id = 'commercial-core'
    AND market_code = target_market
    AND status = 'active';

  PERFORM public.import_commercial_catalog(p_catalog, p_snapshot_hash, p_reason);

  IF NOT EXISTS (
    SELECT 1
    FROM public.commercial_configuration_versions
    WHERE id = target_id
      AND status = 'active'
      AND snapshot_hash = p_snapshot_hash
  ) THEN
    RAISE EXCEPTION 'commercial catalog release activation failed';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.install_commercial_catalog_release(JSONB, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
