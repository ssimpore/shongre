-- Controlled v1 alias conversion advanced the authoring fingerprint. Rebuild
-- its database-owned draft projection during migration, keeping the first
-- authorized editor request within its normal RPC deadline.
DO $migration$
BEGIN
  IF EXISTS (SELECT 1 FROM public.taxonomy_configuration WHERE singleton) THEN
    PERFORM public.refresh_taxonomy_draft_snapshot();
  END IF;
END;
$migration$;
