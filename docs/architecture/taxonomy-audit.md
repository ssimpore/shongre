# Taxonomy v4 architecture and migration record

Status: implemented in-repository on 2026-08-29. Taxonomy v4 remains a draft
database version until an authorized operator publishes it. Demo remains the
default client data mode; no hosted database or live provider was changed.

## One source and deterministic outputs

`backend/taxonomy/v4/taxonomy-v4.normalized.json` is the single reviewed,
backend-owned taxonomy source in the repository. The reviewed master workbook
is an explicit import input, never a runtime dependency. The import records its
SHA-256 checksum, validates all required sheets and relationships, and rewrites
the normalized source deterministically.

`backend/scripts/taxonomy/master-compiler.ts` owns workbook normalization and
artifact generation; `backend/scripts/taxonomy/compile.ts` is its stable CLI
entry point. `backend/taxonomy/v4/crosswalk.reviewed.json` is migration evidence,
not another category catalogue. Generated private/public bundles, local seed SQL,
and the import report are read-only outputs:

- `backend/src/modules/taxonomy/generated/taxonomy-v4.private.ts`;
- `packages/contracts/src/fixtures/generated/taxonomy-v4.public.{json,ts}`;
- `backend/supabase/seed/taxonomy-v4.generated.sql`;
- `docs/architecture/generated/taxonomy-v4-import-report.json`.

The old v3 fixture is retained only as a compatibility snapshot for explicit
legacy crosswalk and established vertical-contract consumers. It does not drive
runtime taxonomy navigation, publication schemas, search projections, admin
inspection, or mobile. Remove it only after all persisted references and its
remaining named consumers have migrated.

The supported workflow is:

```bash
make taxonomy-import TAXONOMY_WORKBOOK=/absolute/path/to/workbook.xlsx
make taxonomy-compile
make taxonomy-check
```

`taxonomy-check` recompiles from the normalized source, fails on generated drift,
and runs the Web coverage gate.

## Master workbook result

The imported workbook checksum is
`47dfc844bc66504276c1467e8e2d03227370fc66fd831f17a61815d5722c0cf0`.
Core sheets 01–21 supply the normalized model; summary and sheets 22–30 are
advisory evidence only.

| Resource               |     Workbook/source |                                         Normalized/runtime |
| ---------------------- | ------------------: | ---------------------------------------------------------: |
| Verticals              |                  18 |                                                   18 roots |
| Category rows          |                 276 |                         294 nodes including vertical roots |
| Publishable leaves     |                 208 |                                                        208 |
| Listing types          |                 208 |                            208 across 20 publication flows |
| Attributes             |                 323 |                               323 private; 317 public-safe |
| Attribute groups       |                  56 |                                                         56 |
| Option rows            |                 732 |              732 private; 725 public-safe; 75 parent links |
| Compact bindings       |               1,194 |                         10,751 resolved effective bindings |
| Dependencies           |                 122 |                                     203 normalized effects |
| Validation rows        | 505 + 30 regulatory | 535 private; regulatory rows disabled pending legal review |
| Filter rows            |                 242 |                                      2,704 resolved facets |
| Card/detail rows       |           130 / 790 |                             1,402 / 10,059 resolved fields |
| Publication-flow rows  |                 846 |                                      1,612 resolved fields |
| Search/SEO projections |       341 / derived |                                                  208 / 294 |

The compiler expands `FLOW_TEMPLATE` rows, then applies listing-type `ADD` and
`EXCLUDE` overrides. The result has exactly 10,751 unique category/type/attribute
relationships and no duplicate effective binding. It also consolidates 34
repeated filter templates by flow and attribute, retaining the earliest
canonical display definition. Radius remains part of the existing search
contract rather than a second duplicate city facet.

All 108 workbook country-policy rows remain quarantined draft policy. The
placeholder market code `FUTURE` is not added to the market registry. All 47
seller-policy rows are disabled pending policy review, and all 30 regulatory
rules are disabled pending legal approval. Runtime availability continues to
come from the canonical market registry: FR, BE, and CH active; SN and BF coming
soon and non-indexable.

## Compatibility and migration safety

The reviewed crosswalk covers 294 master identities, all 61 legacy v3 nodes,
and all 154 nodes from the superseded v4 source. Of the previous v4 identities,
40 remain exact, 30 are reviewed renames, and 84 have explicit compatibility
redirects; none is left to an automatic broad match. The deterministic demo
dry-run resolves all 19 seeded listings without an ambiguous category.

Legacy listing drafts are mapped at the application boundary to master field
names and options, including `listing_intent`, `price_type`, `condition`,
`currency`, `city`, and `postal_code`. Web/native semantic control registries
cover every workbook UI component. Choice-like fields without a materialized
closed option set use the existing text fallback and surface an admin warning,
not an empty control or a false publication blocker.

Migration `backend/supabase/migrations/00078_taxonomy_v4.sql` is expand-only.
Generated local seed SQL uses deterministic upserts, deprecates stale categories,
disables stale listing types/options, and expires stale bindings. It never
deletes listings, truncates tables, or deletes taxonomy rows. Local import still
requires `APP_ENV=local`, a proven loopback database target, and explicit local
approval:

```bash
make taxonomy-db-dry-run
make taxonomy-db-import
```

Hosted publication, data backfill, search/cache revalidation, and policy
activation require the protected operational workflow and current legal,
provider, and market-readiness evidence.

## Runtime boundary and verification

The authoritative backend resolver remains
`backend/src/modules/taxonomy/taxonomy.v4.service.ts`. Public contracts are owned
by `packages/contracts/src/schemas/taxonomy.ts`; OpenAPI remains the only HTTP
specification. Web and mobile consume the generated public-safe projection
through the shared resolver/service boundary. Private expressions, seller draft
policy, internal fields, and unapproved regulatory data do not enter the public
bundle or local storage.

Minimum verification:

```bash
make taxonomy-check
make migrations-check
make openapi-check
make typecheck
make frontend-test
make backend-test
make mobile-check
```

The executable coverage gate currently proves 208/208 active publishable leaves
complete across the generated schema, publication, card/detail, filter,
comparison, market, alias, Web, and mobile boundaries.
