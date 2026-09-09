import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { TAXONOMY_V1_PRIVATE_BUNDLE as compiled } from "../../taxonomy/generated/taxonomy-v1.private.js";
import { runPsql } from "../database/psql.js";

const url = process.env.DATABASE_URL;
if (
  !url ||
  process.env.APP_ENV !== "local" ||
  !["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname)
) {
  throw new Error(
    "Taxonomy migration verification requires the repository-owned local database.",
  );
}
const migrated =
  runPsql(
    url,
    "SELECT to_regclass('public.taxonomy_revision_migrations') IS NOT NULL",
  ) === "t";
const migration = readFileSync(
  fileURLToPath(
    new URL(
      "../../supabase/migrations/00124_canonical_taxonomy_v1.sql",
      import.meta.url,
    ),
  ),
  "utf8",
);
const referencesMigrated =
  runPsql(
    url,
    "SELECT to_regprocedure('public.require_listing_taxonomy_v1()') IS NOT NULL",
  ) === "t";
const referencesMigration = readFileSync(
  fileURLToPath(
    new URL(
      "../../supabase/migrations/00125_taxonomy_v1_references.sql",
      import.meta.url,
    ),
  ),
  "utf8",
);
const referencePublicationMigrated =
  runPsql(
    url,
    "SELECT to_regprocedure('public.read_taxonomy_references()') IS NOT NULL",
  ) === "t";
const referenceBoundaryMigrated =
  runPsql(
    url,
    "SELECT to_regprocedure('public.published_taxonomy_reference_entries()') IS NOT NULL",
  ) === "t";
const referencePublicationMigration = readFileSync(
  fileURLToPath(
    new URL(
      "../../supabase/migrations/00127_taxonomy_v1_reference_publication.sql",
      import.meta.url,
    ),
  ),
  "utf8",
);
const referenceBoundaryMigration = readFileSync(
  fileURLToPath(
    new URL(
      "../../supabase/migrations/00128_taxonomy_v1_reference_boundaries.sql",
      import.meta.url,
    ),
  ),
  "utf8",
);
const conditionMigrated =
  runPsql(
    url,
    "SELECT EXISTS(SELECT 1 FROM taxonomy_migration_records WHERE entity_type='client_reference_v1' AND identity='auto_attribute_definitions:FR:condition')",
  ) === "t";
const conditionMigration = readFileSync(
  fileURLToPath(
    new URL(
      "../../supabase/migrations/00129_taxonomy_v1_vehicle_condition.sql",
      import.meta.url,
    ),
  ),
  "utf8",
);
const tutoringActivationMigrated =
  runPsql(
    url,
    "SELECT EXISTS(SELECT 1 FROM taxonomy_migration_records WHERE entity_type='tutoring_activation_v1')",
  ) === "t";
const tutoringActivationMigration = readFileSync(
  fileURLToPath(
    new URL(
      "../../supabase/migrations/00130_taxonomy_v1_tutoring_activation.sql",
      import.meta.url,
    ),
  ),
  "utf8",
);
const fieldRelevanceMigrated =
  runPsql(
    url,
    "SELECT EXISTS(SELECT 1 FROM public.taxonomy_migration_records WHERE entity_type = 'taxonomy_binding_not_applicable_v1')",
  ) === "t";
const fieldRelevanceMigration = readFileSync(
  fileURLToPath(
    new URL(
      "../../supabase/migrations/00131_taxonomy_v1_field_relevance.sql",
      import.meta.url,
    ),
  ),
  "utf8",
);

const invariants = `
DO $test$
BEGIN
  IF EXISTS(SELECT 1 FROM taxonomy_attributes WHERE localized_help_text->>'fr-FR' LIKE 'Caractéristique canonique%' OR localized_help_text->>'fr-FR' = localized_help_text->>'en-US') THEN RAISE EXCEPTION 'Placeholder or untranslated help text remains'; END IF;
  IF EXISTS(SELECT 1 FROM taxonomy_listing_types t CROSS JOIN LATERAL jsonb_array_elements(COALESCE(t.presentation->'filters','[]'::jsonb)) f WHERE f->>'id' IS DISTINCT FROM t.id || '|' || (f->>'attributeId')) THEN RAISE EXCEPTION 'Filter identity is not derived from its attribute'; END IF;
  IF (SELECT count(*) FROM taxonomy_migration_records WHERE entity_type='taxonomy_binding_not_applicable_v1') <> (SELECT count(*) FROM taxonomy_attribute_bindings WHERE effective_until IS NOT NULL) THEN RAISE EXCEPTION 'Retired bindings were deleted rather than preserved'; END IF;
  IF NOT EXISTS(SELECT 1 FROM taxonomy_configuration c JOIN taxonomy_publications p ON p.revision=c.published_revision CROSS JOIN LATERAL jsonb_array_elements(p.snapshot->'referenceEntries') r WHERE r->>'id'='auto_attribute_definitions:FR:condition') THEN RAISE EXCEPTION 'Vehicle condition not published'; END IF;
  IF EXISTS(SELECT 1 FROM taxonomy_migration_records r JOIN taxonomy_publications before ON before.revision=(r.payload->>'sourceRevision')::BIGINT JOIN taxonomy_publications after ON after.revision=(r.payload->>'targetRevision')::BIGINT WHERE r.entity_type='client_reference_publication_v1' AND (before.snapshot-'referenceEntries' IS DISTINCT FROM after.snapshot-'referenceEntries' OR NOT (after.snapshot->'referenceEntries') @> (before.snapshot->'referenceEntries'))) THEN RAISE EXCEPTION 'Condition import changed existing publication content'; END IF;
  IF EXISTS(SELECT 1 FROM taxonomy_configuration c JOIN taxonomy_publications p ON p.revision=c.published_revision WHERE NOT p.snapshot ? 'referenceEntries') THEN RAISE EXCEPTION 'Missing consolidated reference publication'; END IF;
  IF EXISTS(SELECT 1 FROM taxonomy_migration_records r WHERE entity_type='reference_catalog_v1' AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(read_taxonomy_references()) current WHERE current->>'id'=r.identity)) THEN RAISE EXCEPTION 'Reference identity lost'; END IF;
  IF EXISTS(SELECT 1 FROM taxonomy_migration_records r WHERE entity_type='course_subject_level_v1' AND NOT EXISTS(SELECT 1 FROM course_subjects s WHERE s.id=r.payload->>'subject_id' AND s.market_code=r.payload->>'market_code' AND s.public_payload->'levelIds' ? (r.payload->>'level_id'))) THEN RAISE EXCEPTION 'Course level relationship lost'; END IF;
  IF EXISTS(SELECT 1 FROM pg_policies WHERE tablename IN ('auto_vehicle_types','auto_attribute_definitions','auto_catalog_entries','real_estate_property_types','real_estate_attribute_definitions','real_estate_field_rules','course_subjects','course_subject_levels','employment_dictionary_entries')) THEN RAISE EXCEPTION 'Public reference draft policy retained'; END IF;
  IF to_regclass('public.course_subject_allowed_levels') IS NOT NULL THEN RAISE EXCEPTION 'Duplicate course level associations retained'; END IF;
  IF (SELECT count(*) FROM taxonomy_versions WHERE status <> 'archived') <> 1
    OR NOT EXISTS (SELECT 1 FROM taxonomy_versions WHERE version_number=1 AND status='published') THEN RAISE EXCEPTION 'Multiple active versions'; END IF;
  IF EXISTS (SELECT 1 FROM taxonomy_publications p JOIN taxonomy_revision_migrations m ON m.source_revision=p.revision
    WHERE p.checksum<>m.source_checksum OR encode(sha256(convert_to(p.snapshot::text,'UTF8')),'hex')<>p.checksum) THEN RAISE EXCEPTION 'Original publication changed'; END IF;
  IF EXISTS (SELECT 1 FROM taxonomy_publications p JOIN taxonomy_revision_migrations m ON m.target_revision=p.revision
    WHERE p.checksum<>m.target_checksum OR p.snapshot #>> '{metadata,taxonomyVersion}'<>'v1' OR p.snapshot ? 'crosswalk'
      OR encode(sha256(convert_to(p.snapshot::text,'UTF8')),'hex')<>p.checksum) THEN RAISE EXCEPTION 'Converted publication invalid'; END IF;
  IF EXISTS (SELECT 1 FROM taxonomy_revision_migrations m JOIN taxonomy_publications a ON a.revision=m.source_revision
    JOIN taxonomy_publications b ON b.revision=m.target_revision
    WHERE a.snapshot - 'metadata' - 'crosswalk' - 'compatibility' IS DISTINCT FROM b.snapshot - 'metadata') THEN RAISE EXCEPTION 'Taxonomy content lost during conversion'; END IF;
  IF EXISTS (SELECT 1 FROM listings l JOIN taxonomy_migration_records r ON r.entity_type='listing' AND r.identity=l.id::text
    LEFT JOIN taxonomy_migration_records converted ON converted.entity_type='listing_attributes_v1' AND converted.identity=l.id::text
    WHERE l.attributes - 'categoryPath' IS DISTINCT FROM COALESCE(converted.payload->'after',r.payload->'attributes') - 'categoryPath'
      OR (converted.identity IS NOT NULL AND converted.payload->'before' IS DISTINCT FROM r.payload->'attributes')) THEN RAISE EXCEPTION 'Historical values lost'; END IF;
  -- Breadcrumbs are derived projections. Reseeding may replace an archived
  -- legacy path only with the exact ancestry of the current canonical category.
  IF EXISTS (SELECT 1 FROM listings l JOIN taxonomy_migration_records r ON r.entity_type='listing' AND r.identity=l.id::text
    WHERE l.attributes->'categoryPath' IS DISTINCT FROM r.payload->'attributes'->'categoryPath'
      AND l.attributes->'categoryPath' IS DISTINCT FROM (
        WITH RECURSIVE ancestry AS (
          SELECT id,parent_id,0 AS depth FROM categories WHERE id=l.category_id
          UNION ALL SELECT c.id,c.parent_id,a.depth+1 FROM categories c JOIN ancestry a ON c.id=a.parent_id
        ) SELECT jsonb_agg(id ORDER BY depth DESC) FROM ancestry
      )) THEN RAISE EXCEPTION 'Refreshed listing ancestry is not canonical'; END IF;
  IF EXISTS(SELECT 1 FROM vertical_market_activations WHERE vertical_type='tutoring' AND subcategory_ids=ARRAY['education']::TEXT[] AND category_ids=ARRAY['services']::TEXT[]) THEN RAISE EXCEPTION 'Tutoring activation still targets Services'; END IF;
  IF EXISTS(SELECT 1 FROM course_offers offer JOIN listings l ON l.id=offer.listing_id JOIN vertical_market_activations a ON a.vertical_type='tutoring' AND a.market_code=offer.market_code WHERE a.category_ids=ARRAY['education']::TEXT[] AND l.category_id<>'education') THEN RAISE EXCEPTION 'Course discovery category disagrees with activation'; END IF;
  IF EXISTS (SELECT 1 FROM listings l JOIN categories c ON c.id=l.category_id WHERE c.source_key IS NULL) THEN RAISE EXCEPTION 'Historical category reference unresolved'; END IF;
  IF EXISTS (SELECT 1 FROM listings WHERE taxonomy_version_id IS DISTINCT FROM (SELECT id FROM taxonomy_versions WHERE version_number=1) OR attributes_schema_version<>1) THEN RAISE EXCEPTION 'Listing version unresolved'; END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'
    AND (prosrc LIKE '%4.0.0%' OR prosrc LIKE '%taxonomy_v4%' OR prosrc LIKE '%services.tutoring%')) THEN RAISE EXCEPTION 'Retired taxonomy reference in executable SQL'; END IF;
  IF to_regclass('public.category_attributes') IS NOT NULL OR to_regclass('public.taxonomy_node_attributes') IS NOT NULL
    OR to_regclass('public.category_market_availability') IS NOT NULL THEN RAISE EXCEPTION 'Superseded authoring table retained'; END IF;
  BEGIN
    UPDATE taxonomy_versions SET status='published' WHERE version_number=4;
    IF FOUND THEN RAISE EXCEPTION 'Historical version activation accepted'; END IF;
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    UPDATE taxonomy_revision_migrations SET target_checksum=source_checksum;
    IF FOUND THEN RAISE EXCEPTION 'Migration evidence mutation accepted'; END IF;
  EXCEPTION WHEN integrity_constraint_violation THEN NULL;
  END;
END;
$test$;
SELECT jsonb_build_object('activeVersion','v1','domainReferences',jsonb_array_length(read_taxonomy_references()),'preservedCourseLevels',(SELECT count(*) FROM taxonomy_migration_records WHERE entity_type='course_subject_level_v1'),'listings',(SELECT count(*) FROM listings),
  'convertedPublications',(SELECT count(*) FROM taxonomy_revision_migrations),
  'preservedReferences',(SELECT count(*) FROM taxonomy_migration_records),
  'convertedAttributePayloads',(SELECT count(*) FROM taxonomy_migration_records WHERE entity_type='listing_attributes_v1'),
  'oldTablesRetired',true,'publicationContentPreserved',true,'listingValuesPreserved',true);
`;
// The migration applies the reviewed records with set-based SQL while the compiler
// applies them to the normalized source. A migrated database and a freshly seeded one
// must therefore hold the same configuration; these fingerprints prove it rather than
// assuming it.
const fingerprint = (values: string[]) =>
  createHash("md5")
    .update([...values].sort().join("\n"))
    .digest("hex");
const expectedFingerprints: Record<string, string> = {
  bindings: fingerprint(compiled.bindings.map((row) => row.id)),
  filters: fingerprint(compiled.projections.filters.map((row) => row.id)),
  helpText: fingerprint(
    compiled.attributes.map(
      (row) => `${row.id}::${row.helpText["fr-FR"]}::${row.helpText["en-US"]}`,
    ),
  ),
};
const draftFingerprintSql = `SELECT jsonb_build_object(
  'bindings', (SELECT md5(string_agg(v, E'\\n' ORDER BY v COLLATE "C")) FROM (SELECT b->>'id' AS v FROM jsonb_array_elements(public.read_taxonomy_draft()->'bindings') b) s),
  'filters', (SELECT md5(string_agg(v, E'\\n' ORDER BY v COLLATE "C")) FROM (SELECT f->>'id' AS v FROM jsonb_array_elements(public.read_taxonomy_draft()->'projections'->'filters') f) s),
  'helpText', (SELECT md5(string_agg(v, E'\\n' ORDER BY v COLLATE "C")) FROM (SELECT (a->>'id') || '::' || (a->'helpText'->>'fr-FR') || '::' || (a->'helpText'->>'en-US') AS v FROM jsonb_array_elements(public.read_taxonomy_draft()->'attributes') a) s))`;
const observedFingerprints = JSON.parse(
  runPsql(url, draftFingerprintSql),
) as Record<string, string>;
for (const [name, expected] of Object.entries(expectedFingerprints)) {
  if (observedFingerprints[name] !== expected)
    throw new Error(
      `Database ${name} configuration diverges from the compiled taxonomy; re-run make taxonomy-compile and apply the taxonomy migrations.`,
    );
}

const before = runPsql(
  url,
  "SELECT md5(string_agg(revision::text || ':' || checksum,'|' ORDER BY revision)) FROM taxonomy_publications",
);
console.log(
  runPsql(
    url,
    `BEGIN;\n${migrated ? "" : migration}\n${referencesMigrated ? "" : referencesMigration}\n${referencePublicationMigrated ? "" : referencePublicationMigration}\n${referenceBoundaryMigrated ? "" : referenceBoundaryMigration}\n${conditionMigrated ? "" : conditionMigration}\n${tutoringActivationMigrated ? "" : tutoringActivationMigration}\n${fieldRelevanceMigrated ? "" : fieldRelevanceMigration}\n${invariants}\nROLLBACK;`,
  ),
);
const after = runPsql(
  url,
  "SELECT md5(string_agg(revision::text || ':' || checksum,'|' ORDER BY revision)) FROM taxonomy_publications",
);
if (before !== after)
  throw new Error("Migration dry run changed persisted publication history.");
console.log(
  migrated
    ? "Verified applied v1 conversion and immutable history."
    : "Verified v1 migration in a rolled-back transaction; database unchanged.",
);
