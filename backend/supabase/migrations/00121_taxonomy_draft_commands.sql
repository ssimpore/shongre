-- All editor writes serialize against the draft revision. Values are typed by
-- the existing tables; both resource and column names are allowlisted here.
CREATE FUNCTION public.update_taxonomy_draft(
  p_expected_revision BIGINT, p_changes JSONB, p_actor_profile_id UUID,
  p_change_reason TEXT, p_request_id TEXT DEFAULT NULL
) RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $function$
DECLARE current_revision BIGINT; change JSONB; table_name TEXT; allowed TEXT[];
  key_columns TEXT; columns_sql TEXT; update_sql TEXT; record_values JSONB;
BEGIN
  SELECT draft_revision INTO STRICT current_revision FROM public.taxonomy_configuration WHERE singleton FOR UPDATE;
  IF current_revision <> p_expected_revision THEN RAISE EXCEPTION 'Taxonomy revision conflict' USING ERRCODE = '40001'; END IF;
  IF p_actor_profile_id IS NULL OR length(trim(p_change_reason)) NOT BETWEEN 3 AND 1000
     OR jsonb_typeof(p_changes) <> 'array' OR jsonb_array_length(p_changes) NOT BETWEEN 1 AND 1200 THEN
    RAISE EXCEPTION 'Invalid taxonomy update' USING ERRCODE = '22023';
  END IF;
  FOR change IN SELECT value FROM jsonb_array_elements(p_changes) LOOP
    table_name := change->>'table'; record_values := change->'values'; key_columns := 'id';
    CASE table_name
      WHEN 'categories' THEN allowed := ARRAY['id','source_key','code','slug','name','short_label','parent_id','labels','short_labels','level','taxonomy_description','icon_name','sort_order','status','is_active','publishable','seller_eligibility','seo_config','discovery_projection'];
      WHEN 'taxonomy_listing_types' THEN allowed := ARRAY['id','source_key','category_id','vertical_id','publication_flow','intent','labels','intent_labels','slug','seller_eligibility','status','market_availability','seo_indexable','presentation'];
      WHEN 'taxonomy_attributes' THEN allowed := ARRAY['id','code','label','labels','data_type','source_data_type','ui_component','attribute_group_id','scope','option_set_id','cardinality','unit','default_value','validation','is_searchable','is_filterable','is_sortable','card_visible','detail_visible','is_seo_relevant','seller_eligibility','market_availability','is_required','display_order','privacy','immutable_after_publication','localized_help_text','placeholder'];
      WHEN 'taxonomy_attribute_groups' THEN allowed := ARRAY['id','labels','icon_name','sort_order','collapsible','is_public'];
      WHEN 'taxonomy_option_sets' THEN allowed := ARRAY['id','labels'];
      WHEN 'taxonomy_options' THEN allowed := ARRAY['id','option_set_id','option_key','labels','sort_order','is_active','managed_externally'];
      WHEN 'taxonomy_option_parent_links' THEN allowed := ARRAY['option_id','parent_option_id']; key_columns := 'option_id, parent_option_id';
      WHEN 'taxonomy_attribute_bindings' THEN allowed := ARRAY['id','category_id','listing_type_id','intent','attribute_id','group_id','scope','source_level','is_required','sort_order','publication_visible','detail_visible','card_visible','filterable','searchable','sortable','seller_eligibility','override_default'];
      WHEN 'taxonomy_dependency_rules' THEN allowed := ARRAY['id','scopes','trigger','operator','trigger_values','effect','targets','detail','status'];
      WHEN 'taxonomy_validation_rules' THEN allowed := ARRAY['id','target','scopes','rule_type','expression','severity','messages','country_codes','seller_scopes','enforcement','status'];
      WHEN 'taxonomy_aliases' THEN allowed := ARRAY['alias','canonical_node_id','alias_kind','redirect_path','status']; key_columns := 'alias';
      WHEN 'taxonomy_market_availability' THEN allowed := ARRAY['category_id','market_code','status','marketplace_enabled','indexable']; key_columns := 'category_id, market_code';
      WHEN 'referenceData' THEN
        UPDATE public.taxonomy_configuration SET editorial_metadata = jsonb_set(editorial_metadata, '{referenceData}',
          COALESCE((SELECT jsonb_agg(value) FROM jsonb_array_elements(editorial_metadata->'referenceData') WHERE value->>'id' <> record_values->>'id'), '[]'::jsonb) || jsonb_build_array(record_values)) WHERE singleton;
        CONTINUE;
      ELSE RAISE EXCEPTION 'Unsupported taxonomy resource' USING ERRCODE = '22023';
    END CASE;
    IF jsonb_typeof(record_values) <> 'object' OR EXISTS (SELECT 1 FROM jsonb_object_keys(record_values) k WHERE NOT k = ANY(allowed)) THEN
      RAISE EXCEPTION 'Unsupported taxonomy field' USING ERRCODE = '22023';
    END IF;
    SELECT string_agg(format('%I', key), ', ' ORDER BY key),
      string_agg(format('%I = EXCLUDED.%I', key, key), ', ' ORDER BY key)
      INTO columns_sql, update_sql FROM jsonb_object_keys(record_values) key;
    EXECUTE format('INSERT INTO public.%I (%s) SELECT %s FROM jsonb_populate_record(NULL::public.%I, $1) ON CONFLICT (%s) DO UPDATE SET %s',
      table_name, columns_sql, columns_sql, table_name, key_columns, update_sql) USING record_values;
  END LOOP;
  UPDATE public.taxonomy_configuration SET draft_revision = draft_revision + 1, updated_at = now() WHERE singleton;
  INSERT INTO public.taxonomy_audit_events(taxonomy_version, action, actor_profile_id, request_id, safe_payload)
    SELECT editorial_metadata->'metadata'->>'taxonomyVersion', 'taxonomy.draft_updated', p_actor_profile_id, p_request_id,
      jsonb_build_object('revision', current_revision + 1, 'recordCount', jsonb_array_length(p_changes), 'reason', p_change_reason)
    FROM public.taxonomy_configuration WHERE singleton;
  RETURN current_revision + 1;
END;
$function$;

CREATE FUNCTION public.rollback_taxonomy_revision(
  p_expected_revision BIGINT, p_target_revision BIGINT, p_actor_profile_id UUID,
  p_change_reason TEXT, p_request_id TEXT DEFAULT NULL
) RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $function$
DECLARE current_revision BIGINT;
BEGIN
  SELECT draft_revision INTO STRICT current_revision FROM public.taxonomy_configuration WHERE singleton FOR UPDATE;
  IF current_revision <> p_expected_revision THEN RAISE EXCEPTION 'Taxonomy revision conflict' USING ERRCODE = '40001'; END IF;
  IF p_actor_profile_id IS NULL OR length(trim(p_change_reason)) NOT BETWEEN 3 AND 1000
    OR NOT EXISTS (SELECT 1 FROM public.taxonomy_publications WHERE revision = p_target_revision) THEN
    RAISE EXCEPTION 'Invalid taxonomy rollback' USING ERRCODE = '22023';
  END IF;
  UPDATE public.taxonomy_configuration SET published_revision = p_target_revision, draft_revision = draft_revision + 1, updated_at = now() WHERE singleton;
  INSERT INTO public.taxonomy_audit_events(taxonomy_version, action, actor_profile_id, request_id, safe_payload)
    SELECT editorial_metadata->'metadata'->>'taxonomyVersion', 'taxonomy.rolled_back', p_actor_profile_id, p_request_id,
      jsonb_build_object('revision', p_target_revision, 'reason', p_change_reason) FROM public.taxonomy_configuration WHERE singleton;
  RETURN p_target_revision;
END;
$function$;
REVOKE ALL ON FUNCTION public.update_taxonomy_draft(BIGINT,JSONB,UUID,TEXT,TEXT), public.rollback_taxonomy_revision(BIGINT,BIGINT,UUID,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_taxonomy_draft(BIGINT,JSONB,UUID,TEXT,TEXT), public.rollback_taxonomy_revision(BIGINT,BIGINT,UUID,TEXT,TEXT) TO service_role;
