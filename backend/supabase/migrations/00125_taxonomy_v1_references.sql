-- Complete the controlled v1 reference conversion. The broad education domain
-- must not be assigned a guessed primary-homework leaf (00016/00030 document
-- tutoring as courses and professional training). Originals remain immutable.
CREATE TEMP TABLE v1_education_aliases AS
SELECT alias FROM public.taxonomy_aliases
WHERE alias IN ('services.tutoring','cours-particuliers','cours-formations','courses');
INSERT INTO v1_education_aliases VALUES ('courses') ON CONFLICT DO NOTHING;
INSERT INTO public.taxonomy_migration_records(entity_type,identity,source_version,payload)
SELECT 'education_alias',alias,'reviewed-import',to_jsonb(a) FROM public.taxonomy_aliases a
WHERE alias IN (SELECT alias FROM v1_education_aliases);
UPDATE public.taxonomy_aliases SET canonical_node_id='education',redirect_path='/categorie/education'
WHERE alias IN (SELECT alias FROM v1_education_aliases);
INSERT INTO public.taxonomy_aliases(alias,canonical_node_id,alias_kind,redirect_path,status)
SELECT 'courses','education','slug','/categorie/education','active'
WHERE EXISTS (SELECT 1 FROM public.categories WHERE id='education')
ON CONFLICT (alias) DO NOTHING;

CREATE FUNCTION public.migrate_v1_category_reference(identity TEXT) RETURNS TEXT
LANGUAGE plpgsql SET search_path=public,pg_temp AS $fn$
DECLARE target TEXT;
BEGIN
  IF identity IS NULL OR identity='' THEN RETURN identity; END IF;
  IF EXISTS (SELECT 1 FROM public.categories WHERE id=identity AND source_key IS NOT NULL) THEN RETURN identity; END IF;
  SELECT canonical_node_id INTO target FROM public.taxonomy_aliases WHERE alias=identity AND status='active';
  IF target IS NULL THEN RAISE EXCEPTION 'Unmapped taxonomy reference: %',identity USING ERRCODE='23503'; END IF;
  RETURN target;
END; $fn$;

CREATE FUNCTION public.migrate_v1_attributes(payload JSONB, category TEXT) RETURNS JSONB
LANGUAGE plpgsql SET search_path=public,pg_temp AS $fn$
DECLARE result JSONB:=payload; pair RECORD; translated JSONB; option_value TEXT; matches INT;
BEGIN
  IF payload IS NULL THEN RETURN payload; END IF;
  FOR pair IN SELECT * FROM (VALUES ('year','model_year','vehicles.'),('fuel','fuel_type','vehicles.'),
      ('gearbox','transmission','vehicles.'),('critair','critair_class','vehicles.'),('frameSize','size','vehicles.cycles.')) AS mapping(old_key,new_key,category_prefix)
  LOOP
    IF category LIKE pair.category_prefix || '%' AND payload ? pair.old_key THEN
      translated:=payload->pair.old_key;
      SELECT count(DISTINCT o.option_key),min(o.option_key) INTO matches,option_value
      FROM public.taxonomy_attributes a JOIN public.taxonomy_options o ON o.option_set_id=a.option_set_id
      WHERE a.id=pair.new_key AND (lower(o.id)=lower(translated #>> '{}') OR lower(o.option_key)=lower(translated #>> '{}')
        OR EXISTS(SELECT 1 FROM jsonb_each_text(o.labels) l WHERE lower(l.value)=lower(translated #>> '{}')));
      IF matches>1 THEN RAISE EXCEPTION 'Ambiguous stored option for %',pair.new_key USING ERRCODE='22023'; END IF;
      IF matches=1 THEN translated:=to_jsonb(option_value); END IF;
      IF result ? pair.new_key AND result->pair.new_key IS DISTINCT FROM translated THEN
        RAISE EXCEPTION 'Conflicting stored attribute keys % and %',pair.old_key,pair.new_key USING ERRCODE='22023';
      END IF;
      result:=jsonb_set(result-pair.old_key,ARRAY[pair.new_key],translated);
    END IF;
  END LOOP;
  RETURN result;
END; $fn$;

-- Restore deliberately broad education references using original migration
-- evidence, before converting attributes and deriving authoritative ancestry.
UPDATE public.listings l SET category_id='education'
FROM public.taxonomy_migration_records r
WHERE r.entity_type='listing' AND r.identity=l.id::TEXT AND r.payload->>'categoryId'='services.tutoring';
INSERT INTO public.taxonomy_migration_records(entity_type,identity,source_version,payload)
SELECT 'listing_attributes_v1',l.id::TEXT,'persisted-field-keys',jsonb_build_object('before',attributes,
  'after',public.migrate_v1_attributes(attributes,category_id)) FROM public.listings l
WHERE attributes IS DISTINCT FROM public.migrate_v1_attributes(attributes,category_id);
UPDATE public.listings SET attributes=public.migrate_v1_attributes(attributes,category_id)
WHERE attributes IS DISTINCT FROM public.migrate_v1_attributes(attributes,category_id);

-- Update live configuration dimensions. Event, analytics and financial evidence
-- retain their original dimensions and resolve identities through v1 aliases.
DO $refs$
DECLARE item RECORD; statement TEXT;
BEGIN
  FOR item IN SELECT * FROM (VALUES
    ('business_verticals','category_ids'),('digital_market_policies','allowed_category_ids'),
    ('homepage_offer_rules','taxonomy_branches'),('monetization_product_commercial_profiles','target_category_ids'),
    ('monetization_product_entitlements','category_ids'),('promotion_product_policies','eligible_category_ids'),
    ('vertical_add_ons','category_ids'),('vertical_market_activations','category_ids'),('vertical_market_activations','subcategory_ids')
  ) AS dimensions(table_name,column_name) LOOP
    EXECUTE format('INSERT INTO public.taxonomy_migration_records(entity_type,identity,source_version,payload)
      SELECT %L,md5(to_jsonb(t)::TEXT),''unversioned'',to_jsonb(t) FROM public.%I t
      WHERE %I IS DISTINCT FROM ARRAY(SELECT public.migrate_v1_category_reference(v) FROM unnest(%I) v)',
      item.table_name||'.'||item.column_name,item.table_name,item.column_name,item.column_name);
    EXECUTE format('UPDATE public.%I SET %I=ARRAY(SELECT public.migrate_v1_category_reference(v) FROM unnest(%I) v)
      WHERE %I IS NOT NULL',item.table_name,item.column_name,item.column_name,item.column_name);
  END LOOP;
  FOR item IN SELECT * FROM (VALUES ('trending_topics'),('homepage_universe_subsections'),('saved_searches'),('discovery_configuration_versions')) AS dimensions(table_name) LOOP
    EXECUTE format('INSERT INTO public.taxonomy_migration_records(entity_type,identity,source_version,payload)
      SELECT %L,id::TEXT,''unversioned'',to_jsonb(t) FROM public.%I t WHERE category_id IS DISTINCT FROM public.migrate_v1_category_reference(category_id)',
      item.table_name||'.category_id',item.table_name);
    EXECUTE format('UPDATE public.%I SET category_id=public.migrate_v1_category_reference(category_id) WHERE category_id IS NOT NULL',item.table_name);
  END LOOP;
END; $refs$;

-- Drafts remain incomplete until the current API resolver validates them. Only
-- proven identities/field names are converted; no type or missing answer is guessed.
UPDATE public.listing_drafts d SET draft_data=jsonb_set(draft_data,'{attributes}',
  public.migrate_v1_attributes(draft_data->'attributes',public.migrate_v1_category_reference(draft_data->>'taxonomyNodeId')))
WHERE jsonb_typeof(draft_data->'attributes')='object' AND draft_data->>'taxonomyNodeId' IS NOT NULL;
UPDATE public.listing_drafts SET draft_data=jsonb_set(draft_data,'{taxonomyNodeId}',to_jsonb(public.migrate_v1_category_reference(draft_data->>'taxonomyNodeId')))
WHERE draft_data->>'taxonomyNodeId' IS NOT NULL;
UPDATE public.listing_drafts d SET draft_data=jsonb_set(draft_data,'{taxonomyPath}',
  (SELECT jsonb_agg(public.migrate_v1_category_reference(value) ORDER BY ordinal)
   FROM jsonb_array_elements_text(draft_data->'taxonomyPath') WITH ORDINALITY AS path(value,ordinal)))
WHERE jsonb_typeof(draft_data->'taxonomyPath')='array' AND jsonb_array_length(draft_data->'taxonomyPath')>0;

-- The existing authoring workflow and immutable pointer remain the only active
-- implementation. Publish the alias correction alone, preserving unpublished edits.
DO $aliases$
DECLARE configuration public.taxonomy_configuration; payload JSONB; next_revision BIGINT;
BEGIN
  SELECT * INTO configuration FROM public.taxonomy_configuration WHERE singleton FOR UPDATE;
  IF FOUND THEN
    SELECT snapshot INTO STRICT payload FROM public.taxonomy_publications WHERE revision=configuration.published_revision;
    payload:=jsonb_set(payload,'{aliases}',
      COALESCE((SELECT jsonb_agg(CASE WHEN row->>'alias' IN (SELECT alias FROM v1_education_aliases)
        THEN jsonb_set(row,'{canonicalCategoryId}','"education"') ELSE row END)
        FROM jsonb_array_elements(payload->'aliases') row),'[]'::JSONB)
      || CASE WHEN EXISTS(SELECT 1 FROM jsonb_array_elements(payload->'aliases') row WHERE row->>'alias'='courses') THEN '[]'::JSONB
         ELSE '[{"alias":"courses","canonicalCategoryId":"education","kind":"slug"}]'::JSONB END);
    INSERT INTO public.taxonomy_publications(taxonomy_version_id,draft_revision,checksum,snapshot,change_reason)
    VALUES((SELECT id FROM public.taxonomy_versions WHERE version_number=1),configuration.draft_revision+1,
      encode(sha256(convert_to(payload::TEXT,'UTF8')),'hex'),payload,'v1 broad education reference correction') RETURNING revision INTO next_revision;
    UPDATE public.taxonomy_configuration SET published_revision=next_revision,draft_revision=draft_revision+1,
      draft_snapshot=NULL,draft_snapshot_revision=NULL,draft_snapshot_checksum=NULL,updated_at=now() WHERE singleton;
  END IF;
END; $aliases$;

-- Applied migration files stay unchanged. Replace the exact former-version
-- literals inside the three extant SQL operation owners.
DO $functions$
DECLARE item RECORD; definition TEXT;
BEGIN
  FOR item IN SELECT p.oid,proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND proname IN ('replace_taxonomy_header_categories','replace_taxonomy_header_navigation','sync_course_discovery_listing') LOOP
    definition:=pg_get_functiondef(item.oid);
    definition:=replace(definition,'''4.0.0''','''v1''');
    IF item.proname='sync_course_discovery_listing' THEN
      definition:=replace(definition,'ARRAY[''services'',''services.tutoring'']','ARRAY[''education'']');
    END IF;
    EXECUTE definition;
  END LOOP;
END; $functions$;

-- Canonical FK for every new or edited listing, including SQL-owned vertical
-- projections. Historical evidence remains in taxonomy_migration_records.
CREATE FUNCTION public.require_listing_taxonomy_v1() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path=public,pg_temp AS $fn$
DECLARE version_id UUID;
BEGIN
  SELECT id INTO STRICT version_id FROM public.taxonomy_versions WHERE version_number=1;
  IF NEW.taxonomy_version_id IS NOT NULL AND NEW.taxonomy_version_id<>version_id THEN
    RAISE EXCEPTION 'Only taxonomy v1 may own a listing' USING ERRCODE='23514';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.categories WHERE id=NEW.category_id AND source_key IS NOT NULL) THEN
    RAISE EXCEPTION 'Listing category must be canonical v1' USING ERRCODE='23503';
  END IF;
  NEW.taxonomy_version_id:=version_id;
  RETURN NEW;
END; $fn$;
REVOKE ALL ON FUNCTION public.require_listing_taxonomy_v1() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER listings_require_taxonomy_v1 BEFORE INSERT OR UPDATE OF category_id,taxonomy_version_id ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.require_listing_taxonomy_v1();
DROP FUNCTION public.migrate_v1_attributes(JSONB,TEXT);
DROP FUNCTION public.migrate_v1_category_reference(TEXT);
DROP TABLE v1_education_aliases;
