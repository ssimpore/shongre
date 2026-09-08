-- Expand-only: relational authoring remains authoritative. Immutable publications
-- are derived in one database snapshot and are the only runtime taxonomy source.
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS taxonomy_description TEXT;
ALTER TABLE public.taxonomy_listing_types
  ADD COLUMN IF NOT EXISTS market_availability JSONB,
  ADD COLUMN IF NOT EXISTS presentation JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS discovery_projection JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.taxonomy_attributes
  ADD COLUMN IF NOT EXISTS source_data_type TEXT,
  ADD COLUMN IF NOT EXISTS scope TEXT,
  ADD COLUMN IF NOT EXISTS cardinality TEXT,
  ADD COLUMN IF NOT EXISTS default_value TEXT,
  ADD COLUMN IF NOT EXISTS card_visible BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS detail_visible BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS seller_eligibility JSONB,
  ADD COLUMN IF NOT EXISTS market_availability JSONB,
  ADD COLUMN IF NOT EXISTS localized_help_text JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS placeholder JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE public.taxonomy_configuration (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  draft_revision BIGINT NOT NULL DEFAULT 0 CHECK (draft_revision >= 0),
  published_revision BIGINT,
  -- Import provenance, quarantined policy, reference-source review and templates;
  -- never category, field, option, binding, or presentation content.
  editorial_metadata JSONB NOT NULL CHECK (jsonb_typeof(editorial_metadata) = 'object'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.taxonomy_publications (
  revision BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  taxonomy_version_id UUID NOT NULL REFERENCES public.taxonomy_versions(id) ON DELETE RESTRICT,
  draft_revision BIGINT NOT NULL,
  checksum TEXT NOT NULL CHECK (checksum ~ '^[a-f0-9]{64}$'),
  snapshot JSONB NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  change_reason TEXT NOT NULL CHECK (length(trim(change_reason)) BETWEEN 3 AND 1000),
  request_id TEXT
);
ALTER TABLE public.taxonomy_configuration ADD CONSTRAINT taxonomy_configuration_publication_fk
  FOREIGN KEY (published_revision) REFERENCES public.taxonomy_publications(revision) ON DELETE RESTRICT;
ALTER TABLE public.taxonomy_configuration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_configuration FORCE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_publications FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.taxonomy_configuration, public.taxonomy_publications FROM anon, authenticated;

CREATE FUNCTION public.read_taxonomy_draft() RETURNS JSONB
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $function$
SELECT c.editorial_metadata || jsonb_build_object(
  'categories', (SELECT COALESCE(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id', r.id, 'sourceKey', r.source_key, 'parentId', r.parent_id, 'level', CASE level WHEN 'category' THEN 0 WHEN 'subcategory' THEN 1 ELSE 2 END, 'slug', r.slug, 'labels', r.labels, 'shortLabels', r.short_labels, 'description', r.taxonomy_description, 'iconName', r.icon_name, 'sortOrder', r.sort_order, 'status', r.status, 'publishable', r.publishable, 'sellerEligibility', r.seller_eligibility, 'marketAvailability', (SELECT COALESCE(jsonb_agg(jsonb_build_object('marketCode',m.market_code,'status',m.status,'marketplaceEnabled',m.marketplace_enabled,'indexable',m.indexable) ORDER BY m.market_code),'[]'::jsonb) FROM taxonomy_market_availability m WHERE m.category_id = r.id), 'seo', r.seo_config)) ORDER BY r.id), '[]'::jsonb) FROM public.categories r WHERE source_key IS NOT NULL),
  'listingTypes', (SELECT COALESCE(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id', r.id, 'sourceKey', r.source_key, 'categoryId', r.category_id, 'verticalId', r.vertical_id, 'publicationFlow', r.publication_flow, 'intent', r.intent, 'labels', r.labels, 'intentLabel', r.intent_labels, 'slug', r.slug, 'sellerEligibility', r.seller_eligibility, 'status', r.status, 'marketAvailability', r.market_availability, 'seoIndexable', r.seo_indexable)) ORDER BY r.id), '[]'::jsonb) FROM public.taxonomy_listing_types r WHERE market_availability IS NOT NULL),
  'attributes', (SELECT COALESCE(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id', r.id, 'code', r.code, 'labels', r.labels, 'dataType', r.data_type, 'sourceDataType', r.source_data_type, 'uiComponent', r.ui_component, 'groupId', r.attribute_group_id, 'scope', r.scope, 'optionSetId', r.option_set_id, 'cardinality', r.cardinality, 'unit', r.unit, 'defaultValue', r.default_value, 'validation', r.validation, 'searchable', r.is_searchable, 'filterable', r.is_filterable, 'sortable', r.is_sortable, 'cardVisible', r.card_visible, 'detailVisible', r.detail_visible, 'seoRelevant', r.is_seo_relevant, 'sellerEligibility', r.seller_eligibility, 'marketAvailability', r.market_availability, 'defaultRequired', r.is_required, 'defaultDisplayOrder', r.display_order, 'privacy', r.privacy, 'immutableAfterPublication', r.immutable_after_publication, 'helpText', r.localized_help_text, 'placeholder', r.placeholder)) ORDER BY r.id), '[]'::jsonb) FROM public.taxonomy_attributes r WHERE source_data_type IS NOT NULL),
  'attributeGroups', (SELECT COALESCE(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id', r.id, 'labels', r.labels, 'iconName', r.icon_name, 'sortOrder', r.sort_order, 'collapsible', r.collapsible, 'public', r.is_public)) ORDER BY r.id), '[]'::jsonb) FROM public.taxonomy_attribute_groups r WHERE TRUE),
  'optionSets', (SELECT COALESCE(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id', r.id, 'labels', r.labels)) ORDER BY r.id), '[]'::jsonb) FROM public.taxonomy_option_sets r WHERE TRUE),
  'options', (SELECT COALESCE(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id', r.id, 'optionSetId', r.option_set_id, 'key', r.option_key, 'labels', r.labels, 'sortOrder', r.sort_order, 'active', r.is_active, 'managedExternally', r.managed_externally)) ORDER BY r.id), '[]'::jsonb) FROM public.taxonomy_options r WHERE TRUE),
  'optionParentLinks', (SELECT COALESCE(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('optionId', r.option_id, 'parentOptionId', r.parent_option_id)) ORDER BY r.option_id, r.parent_option_id), '[]'::jsonb) FROM public.taxonomy_option_parent_links r WHERE TRUE),
  'bindings', (SELECT COALESCE(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id', r.id, 'categoryId', r.category_id, 'listingTypeId', r.listing_type_id, 'intent', r.intent, 'attributeId', r.attribute_id, 'groupId', r.group_id, 'scope', r.scope, 'sourceLevel', r.source_level, 'required', r.is_required, 'sortOrder', r.sort_order, 'publicationVisible', r.publication_visible, 'detailVisible', r.detail_visible, 'cardVisible', r.card_visible, 'filterable', r.filterable, 'searchable', r.searchable, 'sortable', r.sortable, 'sellerEligibility', r.seller_eligibility, 'overrideDefault', r.override_default)) ORDER BY r.id), '[]'::jsonb) FROM public.taxonomy_attribute_bindings r WHERE effective_until IS NULL),
  'dependencies', (SELECT COALESCE(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id', r.id, 'scopes', r.scopes, 'trigger', r.trigger, 'operator', r.operator, 'values', r.trigger_values, 'effect', r.effect, 'targets', r.targets, 'detail', r.detail, 'status', r.status)) ORDER BY r.id), '[]'::jsonb) FROM public.taxonomy_dependency_rules r WHERE TRUE),
  'validationRules', (SELECT COALESCE(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id', r.id, 'target', r.target, 'scopes', r.scopes, 'ruleType', r.rule_type, 'expression', r.expression, 'severity', r.severity, 'messages', r.messages, 'countries', r.country_codes, 'sellerScopes', r.seller_scopes, 'enforcement', r.enforcement, 'status', r.status)) ORDER BY r.id), '[]'::jsonb) FROM public.taxonomy_validation_rules r WHERE TRUE),
  'sellerRules', (SELECT COALESCE(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id', r.id, 'sellerType', r.seller_type, 'capability', r.capability, 'proposedAllowed', r.proposed_allowed, 'proposedLimit', r.proposed_limit, 'proposedVerification', r.proposed_verification, 'status', r.status)) ORDER BY r.id), '[]'::jsonb) FROM public.taxonomy_seller_rules r WHERE TRUE),
  'aliases', (SELECT COALESCE(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('alias', r.alias, 'canonicalCategoryId', r.canonical_node_id, 'kind', r.alias_kind)) ORDER BY r.alias), '[]'::jsonb) FROM public.taxonomy_aliases r WHERE status = 'active'),
  'projections', jsonb_build_object(
    'filters', (SELECT COALESCE(jsonb_agg(p.value ORDER BY r.id, p.ordinality), '[]'::jsonb) FROM public.taxonomy_listing_types r CROSS JOIN LATERAL jsonb_array_elements(COALESCE(r.presentation->'filters', '[]'::jsonb)) WITH ORDINALITY p(value, ordinality)),
    'cardFields', (SELECT COALESCE(jsonb_agg(p.value ORDER BY r.id, p.ordinality), '[]'::jsonb) FROM public.taxonomy_listing_types r CROSS JOIN LATERAL jsonb_array_elements(COALESCE(r.presentation->'cardFields', '[]'::jsonb)) WITH ORDINALITY p(value, ordinality)),
    'detailFields', (SELECT COALESCE(jsonb_agg(p.value ORDER BY r.id, p.ordinality), '[]'::jsonb) FROM public.taxonomy_listing_types r CROSS JOIN LATERAL jsonb_array_elements(COALESCE(r.presentation->'detailFields', '[]'::jsonb)) WITH ORDINALITY p(value, ordinality)),
    'publicationFlow', (SELECT COALESCE(jsonb_agg(p.value ORDER BY r.id, p.ordinality), '[]'::jsonb) FROM public.taxonomy_listing_types r CROSS JOIN LATERAL jsonb_array_elements(COALESCE(r.presentation->'publicationFlow', '[]'::jsonb)) WITH ORDINALITY p(value, ordinality)),
    'search', (SELECT COALESCE(jsonb_agg(p.value ORDER BY r.id, p.ordinality), '[]'::jsonb) FROM public.categories r CROSS JOIN LATERAL jsonb_array_elements(COALESCE(r.discovery_projection->'search', '[]'::jsonb)) WITH ORDINALITY p(value, ordinality)),
    'seo', (SELECT COALESCE(jsonb_agg(p.value ORDER BY r.id, p.ordinality), '[]'::jsonb) FROM public.categories r CROSS JOIN LATERAL jsonb_array_elements(COALESCE(r.discovery_projection->'seo', '[]'::jsonb)) WITH ORDINALITY p(value, ordinality))
  )
) FROM public.taxonomy_configuration c WHERE singleton;
$function$;

CREATE FUNCTION public.get_taxonomy_draft() RETURNS JSONB
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $function$
SELECT jsonb_build_object('revision', draft_revision, 'publishedRevision', published_revision,
  'checksum', encode(sha256(convert_to(public.read_taxonomy_draft()::text, 'UTF8')), 'hex'),
  'bundle', public.read_taxonomy_draft()) FROM public.taxonomy_configuration WHERE singleton;
$function$;

CREATE FUNCTION public.get_taxonomy_publication(p_if_revision BIGINT DEFAULT NULL) RETURNS JSONB
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $function$
SELECT jsonb_build_object('revision', p.revision, 'checksum', p.checksum,
  'bundle', CASE WHEN p.revision = p_if_revision THEN NULL ELSE p.snapshot END)
FROM public.taxonomy_configuration c
JOIN public.taxonomy_publications p ON p.revision = c.published_revision WHERE c.singleton;
$function$;

CREATE FUNCTION public.publish_taxonomy_revision(
  p_expected_revision BIGINT, p_expected_checksum TEXT, p_actor_profile_id UUID,
  p_change_reason TEXT, p_request_id TEXT DEFAULT NULL
) RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $function$
DECLARE configuration public.taxonomy_configuration; payload JSONB; digest TEXT; result BIGINT; version_id UUID;
BEGIN
  SELECT * INTO STRICT configuration FROM public.taxonomy_configuration WHERE singleton FOR UPDATE;
  IF configuration.draft_revision <> p_expected_revision THEN
    RAISE EXCEPTION 'Taxonomy revision conflict' USING ERRCODE = '40001';
  END IF;
  payload := public.read_taxonomy_draft();
  digest := encode(sha256(convert_to(payload::text, 'UTF8')), 'hex');
  IF digest IS DISTINCT FROM p_expected_checksum THEN
    RAISE EXCEPTION 'Taxonomy validation snapshot changed' USING ERRCODE = '40001';
  END IF;
  SELECT id INTO STRICT version_id FROM public.taxonomy_versions
    WHERE version_number = split_part(payload->'metadata'->>'taxonomyVersion', '.', 1)::integer;
  IF EXISTS (SELECT 1 FROM public.taxonomy_publications WHERE revision = configuration.published_revision AND checksum = digest) THEN
    RETURN configuration.published_revision;
  END IF;
  INSERT INTO public.taxonomy_publications(taxonomy_version_id, draft_revision, checksum, snapshot, published_by, change_reason, request_id)
    VALUES (version_id, p_expected_revision, digest, payload, p_actor_profile_id, p_change_reason, p_request_id) RETURNING revision INTO result;
  UPDATE public.taxonomy_configuration SET published_revision = result, updated_at = now() WHERE singleton;
  UPDATE public.taxonomy_versions SET status = 'published', published_at = now(), published_by = p_actor_profile_id WHERE id = version_id;
  INSERT INTO public.taxonomy_audit_events(taxonomy_version, action, actor_profile_id, request_id, safe_payload)
    VALUES (payload->'metadata'->>'taxonomyVersion', 'taxonomy.published', p_actor_profile_id, p_request_id,
      jsonb_build_object('revision', result, 'draftRevision', p_expected_revision, 'checksum', digest, 'reason', p_change_reason));
  RETURN result;
END;
$function$;

REVOKE ALL ON FUNCTION public.read_taxonomy_draft() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_taxonomy_draft() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_taxonomy_publication(BIGINT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.publish_taxonomy_revision(BIGINT,TEXT,UUID,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.read_taxonomy_draft(), public.get_taxonomy_draft(),
  public.get_taxonomy_publication(BIGINT), public.publish_taxonomy_revision(BIGINT,TEXT,UUID,TEXT,TEXT) TO service_role;
