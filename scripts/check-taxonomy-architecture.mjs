import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const ignored = new Set([
  "node_modules",
  ".next",
  "dist",
  "coverage",
  "tests",
  "e2e",
  "testing",
  "generated",
  ".git",
  "ios",
  "android",
]);
const referenceTables = [
  "auto_vehicle_types",
  "auto_attribute_definitions",
  "auto_catalog_entries",
  "real_estate_property_types",
  "real_estate_attribute_definitions",
  "real_estate_field_rules",
  "course_subjects",
  "course_subject_levels",
  "employment_dictionary_entries",
];

export function taxonomyArchitectureViolations(name, source) {
  if (
    /(?:^|\/)(?:tests|e2e|testing|generated|migrations|history)\//.test(name) ||
    /\.(?:test|spec)\./.test(name) ||
    name === "backend/scripts/taxonomy/verify-v1-migration.ts"
  )
    return [];
  const problems = [];
  if (
    /\b(?:course_subject_allowed_levels|category_attributes|taxonomy_node_attributes|category_market_availability)\b/.test(
      source,
    )
  )
    problems.push("reference to retired taxonomy table");
  if (
    name.startsWith("backend/supabase/seed/") &&
    name.endsWith(".sql") &&
    name !== "backend/supabase/seed/taxonomy-v1.generated.sql" &&
    name !== "backend/supabase/seed/taxonomy-references.generated.sql"
  ) {
    const sql = source.replace(/--[^\n]*|\/\*[\s\S]*?\*\//g, "");
    if (
      new RegExp(
        `\\b(?:INSERT\\s+INTO|UPDATE|DELETE\\s+FROM|TRUNCATE(?:\\s+TABLE)?|MERGE\\s+INTO)\\s+(?:ONLY\\s+)?(?:"?public"?\\s*\\.\\s*)?"?(?:${referenceTables.join("|")})"?\\b`,
        "i",
      ).test(sql)
    )
      problems.push("seed bypasses canonical taxonomy reference authoring");
  }
  if (
    /(?:taxonomy[-./_ ]v[234]|TaxonomyV[234]|taxonomyV[234]|TAXONOMY_V[234])/.test(
      source + name,
    )
  )
    problems.push("non-v1 taxonomy implementation");
  if (
    /(?:from\s*["']|import\(["'])[^"'\n]*(?:testing\/taxonomy|fixtures\/[^"'\n]*taxonomy|taxonomy\/generated|generated\/taxonomy-v\d|taxonomy-catalog|taxonomy-v\d-(?:public|identity|card|resolver))/.test(
      source,
    )
  )
    problems.push("runtime catalogue/test-fixture import");
  if (
    /taxonomy(?:\/|\.)(?:catalog|data|fixtures)\./.test(name) ||
    /CATEGORY_SLUG_ICON_MAP|storedVehicleKeys|VEHICLE_FUEL_LABELS|EMPLOYMENT_TELEWORK|audienceLevels|propertyTypeLabels|amenityLabels|transactionLabels|fuelLabels|transmissionLabels/.test(
      source,
    )
  )
    problems.push("competing static taxonomy mapping");
  if (
    name.startsWith("backend/src/modules/taxonomy/") &&
    /(?:config\.dataMode|BACKEND_DATA_MODE|DATA_MODE|Math\.random\()/.test(
      source,
    )
  )
    problems.push("runtime taxonomy source selection");
  if (
    new RegExp(`\\.from\\(\\s*["'](?:${referenceTables.join("|")})["']`).test(
      source,
    )
  )
    problems.push("direct runtime access to unpublished reference authoring");
  if (
    /DEFAULT_AUTO_TYPES|TYPE_ROWS|DICTIONARY_SEEDS|EMPLOYMENT_DICTIONARIES|SUBJECT_LABELS/.test(
      source,
    )
  )
    problems.push("competing domain reference catalogue");
  if (/^(?:frontend|mobile)\//.test(name)) {
    if (/\.from\(["'](?:categories|taxonomy_[^"']+)["']/.test(source))
      problems.push("direct client taxonomy database access");
    if (/new TaxonomyV1Service|class TaxonomyV1Service/.test(source))
      problems.push("client taxonomy domain resolver");
    if (
      /catch\s*\([^)]*\)\s*(?:=>)?\s*\{?\s*(?:return\s+)?(?:TAXONOMY_|getTaxonomyV1PublicBundle)/s.test(
        source,
      )
    )
      problems.push("API failure catalogue fallback");
  }
  return problems.map((problem) => `${name}: ${problem}`);
}

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return ignored.has(entry.name) ? [] : files(path);
    return /\.(?:ts|tsx|js|mjs|sql)$/.test(entry.name) &&
      !/\.(?:test|spec)\./.test(entry.name)
      ? [path]
      : [];
  });
}

export function checkTaxonomyArchitecture() {
  const problems = [];
  for (const base of [
    "backend/src",
    "backend/scripts",
    "backend/supabase/seed",
    "frontend/src",
    "frontend/app",
    "mobile/src",
    "mobile/app",
    "packages",
  ]) {
    for (const path of files(join(root, base)))
      problems.push(
        ...taxonomyArchitectureViolations(
          relative(root, path),
          readFileSync(path, "utf8"),
        ),
      );
  }
  const spec = JSON.parse(
    readFileSync(join(root, "backend/openapi/openapi.json"), "utf8"),
  );
  for (const path of Object.keys(spec.paths))
    if (path.startsWith("/taxonomy/") && !path.startsWith("/taxonomy/v1/"))
      problems.push(`${path}: public taxonomy route outside v1`);
  for (const name of Object.keys(spec.components.schemas))
    if (/^TaxonomyV[234]|TaxonomyLegacy/.test(name))
      problems.push(`${name}: superseded transport schema`);
  if (problems.length) throw new Error(problems.join("\n"));
  console.log(
    "Taxonomy architecture verified: v1 only; database/API runtime; import and test data isolated.",
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href)
  checkTaxonomyArchitecture();
