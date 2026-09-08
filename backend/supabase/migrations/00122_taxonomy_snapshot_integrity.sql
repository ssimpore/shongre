-- Materialize the draft once: checksum and content must share the same read.
CREATE OR REPLACE FUNCTION public.get_taxonomy_draft() RETURNS JSONB
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $function$
WITH payload AS MATERIALIZED (SELECT public.read_taxonomy_draft() AS bundle)
SELECT jsonb_build_object('revision', c.draft_revision, 'publishedRevision', c.published_revision,
  'checksum', encode(sha256(convert_to(payload.bundle::text, 'UTF8')), 'hex'),
  'bundle', payload.bundle) FROM public.taxonomy_configuration c CROSS JOIN payload WHERE c.singleton;
$function$;

CREATE FUNCTION public.protect_taxonomy_publication() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public, pg_temp AS $function$
BEGIN
  -- FK anonymization may erase attribution; content and revision evidence stay immutable.
  IF TG_OP = 'UPDATE' AND NEW.published_by IS NULL
    AND (to_jsonb(NEW) - 'published_by') = (to_jsonb(OLD) - 'published_by') THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Published taxonomy revisions are immutable' USING ERRCODE = '23000';
END;
$function$;
CREATE TRIGGER taxonomy_publication_immutable BEFORE UPDATE OR DELETE ON public.taxonomy_publications
FOR EACH ROW EXECUTE FUNCTION public.protect_taxonomy_publication();
REVOKE ALL ON FUNCTION public.protect_taxonomy_publication() FROM PUBLIC, anon, authenticated;
