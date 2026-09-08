-- Existing domain reference tables become relational authoring resources of v1.
-- Keys, constraints, listing FKs and stored values are preserved byte-for-byte;
-- runtime reads use the immutable publication, and only the taxonomy editor writes.
CREATE FUNCTION public.read_taxonomy_references() RETURNS JSONB
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $references$
SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'namespace',namespace,'marketCode',market,'key',key,'values',values) ORDER BY id),'[]'::jsonb) FROM (
SELECT 'auto_vehicle_types:' || r.market_code || ':' || r.type::TEXT AS id, 'auto_vehicle_types' AS namespace, r.market_code AS market, r.type::TEXT AS key, to_jsonb(r) - 'created_at' - 'updated_at' AS values FROM public.auto_vehicle_types r
UNION ALL
SELECT 'auto_attribute_definitions:' || r.market_code || ':' || r.id::TEXT AS id, 'auto_attribute_definitions' AS namespace, r.market_code AS market, r.id::TEXT AS key, to_jsonb(r) - 'created_at' - 'updated_at' AS values FROM public.auto_attribute_definitions r
UNION ALL
SELECT 'auto_catalog_entries:' || r.market_code || ':' || r.id::TEXT AS id, 'auto_catalog_entries' AS namespace, r.market_code AS market, r.id::TEXT AS key, to_jsonb(r) - 'created_at' - 'updated_at' AS values FROM public.auto_catalog_entries r
UNION ALL
SELECT 'real_estate_property_types:' || r.market_code || ':' || r.type::TEXT AS id, 'real_estate_property_types' AS namespace, r.market_code AS market, r.type::TEXT AS key, to_jsonb(r) - 'created_at' - 'updated_at' AS values FROM public.real_estate_property_types r
UNION ALL
SELECT 'real_estate_attribute_definitions:' || r.market_code || ':' || r.id::TEXT AS id, 'real_estate_attribute_definitions' AS namespace, r.market_code AS market, r.id::TEXT AS key, to_jsonb(r) - 'created_at' - 'updated_at' AS values FROM public.real_estate_attribute_definitions r
UNION ALL
SELECT 'real_estate_field_rules:' || r.market_code || ':' || r.id::TEXT AS id, 'real_estate_field_rules' AS namespace, r.market_code AS market, r.id::TEXT AS key, to_jsonb(r) - 'created_at' - 'updated_at' AS values FROM public.real_estate_field_rules r
UNION ALL
SELECT 'course_subjects:' || r.market_code || ':' || r.id::TEXT AS id, 'course_subjects' AS namespace, r.market_code AS market, r.id::TEXT AS key, to_jsonb(r) - 'created_at' - 'updated_at' AS values FROM public.course_subjects r
UNION ALL
SELECT 'course_subject_levels:' || r.market_code || ':' || r.id::TEXT AS id, 'course_subject_levels' AS namespace, r.market_code AS market, r.id::TEXT AS key, to_jsonb(r) - 'created_at' - 'updated_at' AS values FROM public.course_subject_levels r
UNION ALL
SELECT 'employment_dictionary_entries:' || r.market_code || ':' || r.id::TEXT AS id, 'employment_dictionary_entries' AS namespace, r.market_code AS market, r.id::TEXT AS key, to_jsonb(r) - 'created_at' - 'updated_at' AS values FROM public.employment_dictionary_entries r
) entries;
$references$;
REVOKE ALL ON FUNCTION public.read_taxonomy_references() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.read_taxonomy_references() TO service_role;

DO $authoring$
DECLARE definition TEXT;
BEGIN
 SELECT pg_get_functiondef('public.read_taxonomy_draft()'::regprocedure) INTO definition;
 IF position('''categories'',' IN definition)=0 THEN RAISE EXCEPTION 'Unexpected taxonomy reader definition'; END IF;
 EXECUTE replace(definition, '''categories'',', '''referenceEntries'', public.read_taxonomy_references(), ''categories'',');
 SELECT pg_get_functiondef('public.update_taxonomy_draft(bigint,jsonb,uuid,text,text)'::regprocedure) INTO definition;
 IF position('WHEN ''referenceData'' THEN' IN definition)=0 THEN RAISE EXCEPTION 'Unexpected taxonomy writer definition'; END IF;
 EXECUTE replace(definition, 'WHEN ''referenceData'' THEN', $cases$
WHEN 'auto_vehicle_types' THEN allowed := ARRAY['slug','type','label','is_active','sort_order','description','market_code','public_payload','schema_version','filter_field_ids','required_field_ids']; key_columns := 'type, market_code';
WHEN 'auto_attribute_definitions' THEN allowed := ARRAY['id','unit','label','options','is_active','is_public','field_type','sort_order','is_required','market_code','is_filterable','vehicle_types','public_payload','schema_version']; key_columns := 'id, market_code';
WHEN 'auto_catalog_entries' THEN allowed := ARRAY['id','kind','slug','label','ends_year','is_active','parent_id','market_code','starts_year','vehicle_types','public_payload']; key_columns := 'id, market_code';
WHEN 'real_estate_property_types' THEN allowed := ARRAY['slug','type','label','icon_name','is_active','sort_order','description','market_code','schema_version','filter_field_ids','transaction_types','required_field_ids']; key_columns := 'type, market_code';
WHEN 'real_estate_attribute_definitions' THEN allowed := ARRAY['id','unit','label','options','privacy','help_text','is_active','field_type','sort_order','is_required','market_code','is_filterable','property_types','schema_version','transaction_types']; key_columns := 'id, market_code';
WHEN 'real_estate_field_rules' THEN allowed := ARRAY['id','field_id','is_active','market_code','requirement','property_type','schema_version','transaction_type','condition_payload']; key_columns := 'id';
WHEN 'course_subjects' THEN allowed := ARRAY['id','slug','label','icon_name','is_active','parent_id','sort_order','description','market_code','public_payload','required_fields']; key_columns := 'id, market_code';
WHEN 'course_subject_levels' THEN allowed := ARRAY['id','label','is_active','sort_order','market_code','public_payload']; key_columns := 'id, market_code';
WHEN 'employment_dictionary_entries' THEN allowed := ARRAY['id','code','kind','slug','label','aliases','version','metadata','is_active','parent_id','sort_order','description','market_code']; key_columns := 'id';
WHEN 'referenceData' THEN$cases$);
END; $authoring$;

-- Capture the prior unversioned baseline without modifying migration history.
INSERT INTO public.taxonomy_migration_records(entity_type,identity,source_version,payload)
SELECT 'reference_catalog_v1',value->>'id','unversioned',value FROM jsonb_array_elements(public.read_taxonomy_references());

DO $publication$
DECLARE c public.taxonomy_configuration; previous public.taxonomy_publications; payload JSONB; result BIGINT;
BEGIN
 SELECT * INTO c FROM public.taxonomy_configuration WHERE singleton FOR UPDATE;
 IF NOT FOUND THEN RETURN; END IF;
 SELECT * INTO STRICT previous FROM public.taxonomy_publications WHERE revision=c.published_revision;
 payload := jsonb_set(previous.snapshot,'{referenceEntries}',public.read_taxonomy_references());
 INSERT INTO public.taxonomy_publications(taxonomy_version_id,draft_revision,checksum,snapshot,change_reason)
 VALUES(previous.taxonomy_version_id,c.draft_revision+1,encode(sha256(convert_to(payload::text,'UTF8')),'hex'),payload,'Consolidate domain reference authoring into canonical v1') RETURNING revision INTO result;
 INSERT INTO public.taxonomy_migration_records(entity_type,identity,source_version,payload) VALUES ('reference_publication_v1',result::TEXT,'v1',jsonb_build_object('sourceRevision',previous.revision,'sourceChecksum',previous.checksum,'targetRevision',result));
 UPDATE public.taxonomy_configuration SET draft_revision=draft_revision+1,published_revision=result,updated_at=now() WHERE singleton;
 PERFORM public.refresh_taxonomy_draft_snapshot();
END; $publication$;

-- Earlier publications predate the reference-data boundary. Preserve them as
-- immutable evidence; do not activate a snapshot without the consolidated data.
DO $rollback$
DECLARE definition TEXT;
BEGIN
 SELECT pg_get_functiondef('public.rollback_taxonomy_revision(bigint,bigint,uuid,text,text)'::regprocedure) INTO definition;
 IF position('WHERE revision = p_target_revision' IN definition)=0 THEN RAISE EXCEPTION 'Unexpected rollback definition'; END IF;
 EXECUTE replace(definition,'WHERE revision = p_target_revision','WHERE revision = p_target_revision AND snapshot ? ''referenceEntries''');
END; $rollback$;
