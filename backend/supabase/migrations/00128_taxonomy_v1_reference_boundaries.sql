-- All classification tables are private relational authoring resources. Public
-- consumers use the canonical backend projection of an immutable v1 revision.
DO $rls$
DECLARE item TEXT; policy RECORD;
BEGIN
  FOREACH item IN ARRAY ARRAY['auto_vehicle_types','auto_attribute_definitions','auto_catalog_entries',
    'real_estate_property_types','real_estate_attribute_definitions','real_estate_field_rules',
    'course_subjects','course_subject_levels','employment_dictionary_entries'] LOOP
    FOR policy IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=item LOOP
      EXECUTE format('DROP POLICY %I ON public.%I',policy.policyname,item);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY',item);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated',item);
  END LOOP;
END; $rls$;

CREATE FUNCTION public.published_taxonomy_reference_entries()
RETURNS TABLE(namespace TEXT,market_code TEXT,record_key TEXT,record_values JSONB,revision BIGINT)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $read$
 SELECT entry->>'namespace',entry->>'marketCode',entry->>'key',entry->'values',p.revision
 FROM public.taxonomy_configuration c JOIN public.taxonomy_publications p ON p.revision=c.published_revision
 CROSS JOIN LATERAL jsonb_array_elements(p.snapshot->'referenceEntries') entry
 WHERE c.singleton AND p.snapshot #>> '{metadata,taxonomyVersion}'='v1';
$read$;
REVOKE ALL ON FUNCTION public.published_taxonomy_reference_entries() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.published_taxonomy_reference_entries() TO service_role;

-- SQL discovery must not see unpublished subject/level labels either. Preserve
-- the existing view's column types, filters and security boundary.
DO $view$
DECLARE definition TEXT;
BEGIN
 SELECT pg_get_viewdef('public.course_tutor_search_view'::regclass,true) INTO definition;
 IF position('JOIN course_subjects s' IN definition)=0 OR position('JOIN course_subject_levels l' IN definition)=0 THEN
   RAISE EXCEPTION 'Unexpected course discovery reference joins';
 END IF;
 definition := replace(definition,'JOIN course_subjects s',
   'JOIN (SELECT (jsonb_populate_record(NULL::public.course_subjects,e.record_values)).* FROM public.published_taxonomy_reference_entries() e WHERE e.namespace=''course_subjects'') s');
 definition := replace(definition,'JOIN course_subject_levels l',
   'JOIN (SELECT (jsonb_populate_record(NULL::public.course_subject_levels,e.record_values)).* FROM public.published_taxonomy_reference_entries() e WHERE e.namespace=''course_subject_levels'') l');
 EXECUTE 'CREATE OR REPLACE VIEW public.course_tutor_search_view WITH (security_invoker=true) AS ' || definition;
END; $view$;
REVOKE ALL ON public.course_tutor_search_view FROM anon, authenticated;

-- The unused association table duplicates exactly the levelIds already consumed
-- by publication. Contract it only after proving exact equivalence and preserving
-- every original row as immutable conversion evidence; RESTRICT checks dependencies.
DO $levels$
BEGIN
 IF EXISTS(SELECT 1 FROM public.course_subjects s
   WHERE ARRAY(SELECT value FROM jsonb_array_elements_text(s.public_payload->'levelIds') value ORDER BY value)
     IS DISTINCT FROM ARRAY(SELECT level_id::TEXT FROM public.course_subject_allowed_levels l
       WHERE l.subject_id=s.id AND l.market_code=s.market_code ORDER BY level_id)) THEN
   RAISE EXCEPTION 'Conflicting course subject level representations' USING ERRCODE='22023';
 END IF;
END; $levels$;
INSERT INTO public.taxonomy_migration_records(entity_type,identity,source_version,payload)
SELECT 'course_subject_level_v1',subject_id||':'||market_code||':'||level_id,'unversioned',to_jsonb(r)
FROM public.course_subject_allowed_levels r;
DROP TABLE public.course_subject_allowed_levels RESTRICT;
