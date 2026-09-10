import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkTaxonomyArchitecture,
  taxonomyArchitectureViolations as violations,
} from "./check-taxonomy-architecture.mjs";

test("rejects former versions, runtime fixtures, client resolvers and fallback catalogues", () => {
  for (const source of [
    'import { TaxonomyV4Service } from "./taxonomy.v4.service";',
    'import { bundle } from "@shongre/contracts/testing/taxonomy";',
    'import { bundle } from "./generated/taxonomy-v1.private";',
    'const nodes = await db.from("taxonomy_categories").select();',
    "const fallback = new TaxonomyV1Service(data);",
    "request.catch(() => getTaxonomyV1PublicBundle());",
    "const CATEGORY_SLUG_ICON_MAP = {};",
    "const propertyTypeLabels = { apartment: 'Appartement' };",
    "const fuelLabels = { diesel: 'Diesel' };",
  ])
    assert.ok(
      violations("frontend/src/api/taxonomy.ts", source).length,
      source,
    );
  assert.ok(
    violations(
      "backend/src/modules/taxonomy/taxonomy.runtime.ts",
      "config.dataMode === 'demo'",
    ).length,
  );
});
test("rejects independent domain reference catalogues and unpublished table readers", () => {
  for (const source of [
    'db.from("course_subjects").select("*")',
    "const DICTIONARY_SEEDS = [];",
  ])
    assert.ok(
      violations(
        "backend/src/infrastructure/database/repositories/courses.repository.ts",
        source,
      ).length,
    );
});
test("checks SQL seeds for retired relations and duplicate reference writers", () => {
  for (const source of [
    "INSERT INTO public.course_subject_allowed_levels SELECT * FROM levels;",
    "INSERT INTO public.course_subjects (id, label) VALUES ('maths', 'Maths');",
    'UPDATE "public"."auto_vehicle_types" SET label = \'Car\';',
    "DELETE FROM public.auto_catalog_entries;",
    "TRUNCATE TABLE public.real_estate_field_rules;",
    "INSERT INTO real_estate_attribute_definitions SELECT * FROM defaults;",
  ])
    assert.ok(
      violations("backend/supabase/seed/vertical.sql", source).length,
      source,
    );
  assert.deepEqual(
    violations(
      "backend/supabase/seed/vertical.sql",
      "INSERT INTO public.auto_plans (id) VALUES ('free'); -- UPDATE public.auto_vehicle_types",
    ),
    [],
  );
  assert.deepEqual(
    violations(
      "backend/supabase/seed/taxonomy-v1.generated.sql",
      "INSERT INTO public.course_subjects SELECT * FROM imported_references;",
    ),
    [],
  );
  assert.deepEqual(
    violations(
      "backend/supabase/seed/taxonomy-references.generated.sql",
      "INSERT INTO public.course_subjects SELECT * FROM imported_references;",
    ),
    [],
  );
});
test("the complete active source and SQL seed scope respects taxonomy boundaries", () => {
  assert.doesNotThrow(checkTaxonomyArchitecture);
});
test("allows immutable history, isolated test inputs and unrelated product versions", () => {
  assert.deepEqual(
    violations(
      "backend/supabase/migrations/00078_taxonomy_v4.sql",
      "taxonomy v4",
    ),
    [],
  );
  assert.deepEqual(
    violations(
      "backend/tests/fixtures/taxonomy.ts",
      'import { bundle } from "./generated/taxonomy-v1.private";',
    ),
    [],
  );
  assert.deepEqual(
    violations(
      "frontend/src/api/taxonomy.ts",
      'apiOperation("getTaxonomyV1Tree", {}); const productVersion = "4.0.0";',
    ),
    [],
  );
});
