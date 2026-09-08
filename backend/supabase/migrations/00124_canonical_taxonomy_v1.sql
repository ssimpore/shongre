-- Expand and backfill canonical v1. Immutable publications and migration records
-- retain their original payloads; historical schemas never participate in reads.
CREATE TABLE public.taxonomy_migration_records (
  entity_type TEXT NOT NULL,
  identity TEXT NOT NULL,
  source_version TEXT NOT NULL,
  target_identity TEXT,
  payload JSONB NOT NULL,
  migrated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (entity_type, identity)
);
ALTER TABLE public.taxonomy_migration_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_migration_records FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.taxonomy_migration_records FROM PUBLIC, anon, authenticated;
CREATE FUNCTION public.protect_taxonomy_migration_record() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public, pg_temp AS $function$
BEGIN
  RAISE EXCEPTION 'Taxonomy migration evidence is immutable' USING ERRCODE='23000';
END;
$function$;
REVOKE ALL ON FUNCTION public.protect_taxonomy_migration_record() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER taxonomy_migration_record_immutable BEFORE UPDATE OR DELETE ON public.taxonomy_migration_records
FOR EACH ROW EXECUTE FUNCTION public.protect_taxonomy_migration_record();

CREATE TABLE public.taxonomy_revision_migrations (
  source_revision BIGINT PRIMARY KEY REFERENCES public.taxonomy_publications(revision),
  target_revision BIGINT NOT NULL UNIQUE REFERENCES public.taxonomy_publications(revision),
  source_checksum TEXT NOT NULL,
  target_checksum TEXT NOT NULL,
  migrated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.taxonomy_revision_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxonomy_revision_migrations FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.taxonomy_revision_migrations FROM PUBLIC, anon, authenticated;
CREATE TRIGGER taxonomy_revision_migration_immutable BEFORE UPDATE OR DELETE ON public.taxonomy_revision_migrations
FOR EACH ROW EXECUTE FUNCTION public.protect_taxonomy_migration_record();

-- No conversion of an unknown document is allowed. This function exists only
-- within this migration and is dropped after the backfill.
CREATE FUNCTION public.migrate_taxonomy_document_to_v1(payload JSONB) RETURNS JSONB
LANGUAGE plpgsql SET search_path = public, pg_temp AS $function$
DECLARE result JSONB;
BEGIN
  IF payload #>> '{metadata,taxonomyVersion}' <> '4.0.0'
    OR NOT payload ?& ARRAY['categories','listingTypes','attributes','bindings','options','projections'] THEN
    RAISE EXCEPTION 'Unsupported taxonomy document; explicit conversion required' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(payload->'categories') n
      WHERE NOT n ?& ARRAY['id','sourceKey','labels','marketAvailability'])
    OR EXISTS (SELECT 1 FROM jsonb_array_elements(payload->'attributes') a
      WHERE NOT a ?& ARRAY['id','code','dataType','privacy','marketAvailability']) THEN
    RAISE EXCEPTION 'Incomplete taxonomy document; cannot relabel as v1' USING ERRCODE = '22023';
  END IF;
  -- Crosswalks are import/audit evidence, not a second runtime resolver.
  result := jsonb_set(payload - 'crosswalk' - 'compatibility', '{metadata,taxonomyVersion}', '"v1"');
  RETURN result;
END;
$function$;
REVOKE ALL ON FUNCTION public.migrate_taxonomy_document_to_v1(JSONB) FROM PUBLIC, anon, authenticated;

INSERT INTO public.taxonomy_versions(version_number,status,description)
VALUES (1,'published','Canonical taxonomy v1; editorial changes use publication revisions')
ON CONFLICT (version_number) DO NOTHING;

DO $migration$
DECLARE item RECORD; converted JSONB; target BIGINT; version_id UUID; prior_pointer BIGINT;
BEGIN
  SELECT id INTO STRICT version_id FROM public.taxonomy_versions WHERE version_number = 1;
  SELECT published_revision INTO prior_pointer FROM public.taxonomy_configuration WHERE singleton FOR UPDATE;
  FOR item IN SELECT * FROM public.taxonomy_publications ORDER BY revision LOOP
    converted := public.migrate_taxonomy_document_to_v1(item.snapshot);
    INSERT INTO public.taxonomy_publications(taxonomy_version_id,draft_revision,checksum,snapshot,published_by,change_reason)
    VALUES (version_id,item.draft_revision,encode(sha256(convert_to(converted::text,'UTF8')),'hex'),converted,item.published_by,
      'Controlled v1 conversion of publication ' || item.revision) RETURNING revision INTO target;
    INSERT INTO public.taxonomy_revision_migrations(source_revision,target_revision,source_checksum,target_checksum)
    VALUES(item.revision,target,item.checksum,encode(sha256(convert_to(converted::text,'UTF8')),'hex'));
    IF item.revision = prior_pointer THEN
      UPDATE public.taxonomy_configuration SET published_revision = target WHERE singleton;
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM public.taxonomy_configuration WHERE singleton) THEN
    INSERT INTO public.taxonomy_migration_records(entity_type,identity,source_version,payload)
      SELECT 'editorial_metadata','singleton',editorial_metadata #>> '{metadata,taxonomyVersion}',editorial_metadata
      FROM public.taxonomy_configuration WHERE singleton;
    IF (SELECT editorial_metadata #>> '{metadata,taxonomyVersion}' FROM public.taxonomy_configuration WHERE singleton) <> '4.0.0' THEN
      RAISE EXCEPTION 'Unsupported draft taxonomy version' USING ERRCODE='22023';
    END IF;
    UPDATE public.taxonomy_configuration SET
      editorial_metadata = jsonb_set(editorial_metadata - 'crosswalk' - 'compatibility','{metadata,taxonomyVersion}','"v1"'),
      draft_revision = draft_revision + 1, draft_snapshot = NULL,
      draft_snapshot_revision = NULL, draft_snapshot_checksum = NULL, updated_at = now() WHERE singleton;
  END IF;
END;
$migration$;
DROP FUNCTION public.migrate_taxonomy_document_to_v1(JSONB);

-- Explicit reviewed aliases are the only permitted category mapping. Retained
-- retired rows serve historical FKs only and cannot enter a published document.
DO $preflight$
BEGIN
  IF EXISTS (SELECT 1 FROM public.taxonomy_configuration) AND EXISTS (SELECT 1 FROM public.categories c WHERE c.source_key IS NULL
    AND NOT EXISTS (SELECT 1 FROM public.taxonomy_aliases a JOIN public.categories target ON target.id=a.canonical_node_id
      WHERE a.alias=c.id AND a.status='active' AND target.source_key IS NOT NULL)) THEN
    RAISE EXCEPTION 'Unmapped historical categories; review taxonomy aliases before migration' USING ERRCODE='23503';
  END IF;
  IF EXISTS (SELECT 1 FROM public.category_attributes)
    OR EXISTS (SELECT 1 FROM public.taxonomy_node_attributes)
    OR EXISTS (SELECT 1 FROM public.category_market_availability) THEN
    RAISE EXCEPTION 'Unconverted historical fields or market policies; explicit reviewed import required before retiring old tables' USING ERRCODE='23514';
  END IF;
  IF EXISTS (SELECT 1 FROM public.listings WHERE attributes_schema_version NOT IN (2,3,4)) THEN
    RAISE EXCEPTION 'Unknown stored listing taxonomy schema' USING ERRCODE='22023';
  END IF;
END;
$preflight$;

INSERT INTO public.taxonomy_migration_records(entity_type,identity,source_version,target_identity,payload)
SELECT 'category',c.id,COALESCE(v.version_number::text,'unversioned'),a.canonical_node_id,to_jsonb(c)
FROM public.categories c LEFT JOIN public.taxonomy_versions v ON v.id=c.taxonomy_version_id
JOIN public.taxonomy_aliases a ON a.alias=c.id AND a.status='active' WHERE c.source_key IS NULL;
UPDATE public.categories c SET replaced_by_id=a.canonical_node_id,status='archived',is_active=false
FROM public.taxonomy_aliases a WHERE c.source_key IS NULL AND a.alias=c.id AND a.status='active';
UPDATE public.categories SET taxonomy_version_id=(SELECT id FROM public.taxonomy_versions WHERE version_number=1)
WHERE source_key IS NOT NULL;

-- Record full originals before changing references. Attribute values and broad
-- historical categories remain intact; no publishable leaf/type is guessed.
INSERT INTO public.taxonomy_migration_records(entity_type,identity,source_version,target_identity,payload)
SELECT 'listing',l.id::text,l.attributes_schema_version::text,COALESCE(a.canonical_node_id,l.category_id),
  jsonb_build_object('categoryId',l.category_id,'attributes',l.attributes,'attributesSchemaVersion',l.attributes_schema_version,'taxonomyVersionId',l.taxonomy_version_id)
FROM public.listings l LEFT JOIN public.taxonomy_aliases a ON a.alias=l.category_id AND a.status='active';
UPDATE public.listings l SET category_id=a.canonical_node_id
FROM public.taxonomy_aliases a WHERE l.category_id=a.alias AND a.status='active' AND l.category_id<>a.canonical_node_id;
UPDATE public.listings SET taxonomy_version_id=(SELECT id FROM public.taxonomy_versions WHERE version_number=1),attributes_schema_version=1;
ALTER TABLE public.listings ALTER COLUMN attributes_schema_version SET DEFAULT 1;
ALTER TABLE public.listings ADD CONSTRAINT listings_taxonomy_schema_v1 CHECK (attributes_schema_version=1);

INSERT INTO public.taxonomy_migration_records(entity_type,identity,source_version,payload)
SELECT 'saved_search',id::text,'unversioned',jsonb_build_object('categoryId',category_id,'filters',filters) FROM public.saved_searches;
UPDATE public.saved_searches s SET category_id=a.canonical_node_id
FROM public.taxonomy_aliases a WHERE s.category_id=a.alias AND a.status='active' AND s.category_id<>a.canonical_node_id;

INSERT INTO public.taxonomy_migration_records(entity_type,identity,source_version,payload)
SELECT 'listing_draft',user_id::text||'/'||market_code,COALESCE(draft_data->>'taxonomyVersion','unversioned'),draft_data FROM public.listing_drafts;
DO $drafts$
BEGIN
  IF EXISTS (SELECT 1 FROM public.listing_drafts WHERE draft_data ? 'taxonomyVersion'
    AND draft_data->>'taxonomyVersion' NOT IN ('4.0.0','2','3')) THEN
    RAISE EXCEPTION 'Unknown saved draft taxonomy version' USING ERRCODE='22023';
  END IF;
END;
$drafts$;
UPDATE public.listing_drafts SET draft_data=jsonb_set(draft_data - 'taxonomyRevision','{taxonomyVersion}','"v1"')
WHERE draft_data ? 'taxonomyVersion';
UPDATE public.listing_drafts d SET draft_data=jsonb_set(d.draft_data,'{taxonomyNodeId}',to_jsonb(a.canonical_node_id))
FROM public.taxonomy_aliases a WHERE d.draft_data->>'taxonomyNodeId'=a.alias AND a.status='active';

UPDATE public.taxonomy_versions SET status='archived' WHERE version_number<>1;
ALTER TABLE public.taxonomy_versions ADD CONSTRAINT taxonomy_only_v1_active CHECK (version_number=1 OR status='archived');
ALTER TABLE public.taxonomy_configuration ADD CONSTRAINT taxonomy_configuration_v1 CHECK (editorial_metadata #>> '{metadata,taxonomyVersion}' = 'v1');

-- Former tables contain no data after verified conversion; RESTRICT proves there
-- is no dependent view/function/FK. Applied SQL history is deliberately retained.
DROP TABLE public.taxonomy_node_attributes RESTRICT;
DROP TABLE public.category_attributes RESTRICT;
DROP TABLE public.category_market_availability RESTRICT;

CREATE OR REPLACE FUNCTION public.publish_taxonomy_revision(
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
  IF configuration.draft_snapshot_revision IS DISTINCT FROM configuration.draft_revision
     OR configuration.draft_snapshot IS NULL THEN
    PERFORM public.refresh_taxonomy_draft_snapshot();
    SELECT * INTO STRICT configuration FROM public.taxonomy_configuration WHERE singleton;
  END IF;
  payload := configuration.draft_snapshot;
  digest := configuration.draft_snapshot_checksum;
  IF digest IS DISTINCT FROM p_expected_checksum THEN
    RAISE EXCEPTION 'Taxonomy validation snapshot changed' USING ERRCODE = '40001';
  END IF;
  IF payload #>> '{metadata,taxonomyVersion}' <> 'v1' THEN
    RAISE EXCEPTION 'Only taxonomy v1 can be published' USING ERRCODE='22023';
  END IF;
  SELECT id INTO STRICT version_id FROM public.taxonomy_versions WHERE version_number = 1;
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

CREATE OR REPLACE FUNCTION public.rollback_taxonomy_revision(
  p_expected_revision BIGINT, p_target_revision BIGINT, p_actor_profile_id UUID,
  p_change_reason TEXT, p_request_id TEXT DEFAULT NULL
) RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $function$
DECLARE current_revision BIGINT;
BEGIN
  SELECT draft_revision INTO STRICT current_revision FROM public.taxonomy_configuration WHERE singleton FOR UPDATE;
  IF current_revision <> p_expected_revision THEN RAISE EXCEPTION 'Taxonomy revision conflict' USING ERRCODE = '40001'; END IF;
  IF p_actor_profile_id IS NULL OR length(trim(p_change_reason)) NOT BETWEEN 3 AND 1000
    OR NOT EXISTS (SELECT 1 FROM public.taxonomy_publications WHERE revision = p_target_revision AND snapshot #>> '{metadata,taxonomyVersion}' = 'v1') THEN
    RAISE EXCEPTION 'Invalid taxonomy rollback' USING ERRCODE = '22023';
  END IF;
  UPDATE public.taxonomy_configuration SET published_revision = p_target_revision,
    draft_snapshot_revision = CASE WHEN draft_snapshot_revision = draft_revision THEN draft_revision + 1 ELSE draft_snapshot_revision END,
    draft_revision = draft_revision + 1, updated_at = now() WHERE singleton;
  INSERT INTO public.taxonomy_audit_events(taxonomy_version, action, actor_profile_id, request_id, safe_payload)
    SELECT editorial_metadata->'metadata'->>'taxonomyVersion', 'taxonomy.rolled_back', p_actor_profile_id, p_request_id,
      jsonb_build_object('revision', p_target_revision, 'reason', p_change_reason) FROM public.taxonomy_configuration WHERE singleton;
  RETURN p_target_revision;
END;
$function$;

DO $verify$
BEGIN
  IF EXISTS (SELECT 1 FROM taxonomy_configuration c JOIN taxonomy_publications p ON p.revision=c.published_revision
    WHERE p.snapshot #>> '{metadata,taxonomyVersion}' <> 'v1') THEN
    RAISE EXCEPTION 'Publication conversion incomplete';
  END IF;
  IF EXISTS (SELECT 1 FROM listings l JOIN categories c ON c.id=l.category_id WHERE c.source_key IS NULL) THEN
    RAISE EXCEPTION 'Listing reference conversion incomplete';
  END IF;
  IF EXISTS (SELECT 1 FROM taxonomy_configuration WHERE singleton) THEN PERFORM refresh_taxonomy_draft_snapshot(); END IF;
END;
$verify$;
