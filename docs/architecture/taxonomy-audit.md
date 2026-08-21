# Shongre taxonomy audit and implementation record

Status: implemented incrementally in taxonomy schema v2.  The frontend remains
demo-only; the backend migration and validator are prepared for the future API
adapter and do not change the current runtime data mode.

## Executive findings

The frontend was the most complete taxonomy source, but the platform had three
different representations:

1. a 16-root frontend tree with inherited attributes;
2. a seven-root backend demo tree with different IDs and slugs;
3. a database schema that stored category attributes as ad-hoc rows without a
   global registry or version.

That split made a category appear publishable in one surface and unsearchable
in another. It also allowed card/detail fields and search facets to drift away
from publication fields.

The implemented boundary is now:

```text
TaxonomyNode + TaxonomyAttribute registry
        ↓
publication resolver → validation → listing payload
        ↓
search facets → card summary → detail groups → comparison metadata
```

## Current canonical inventory

The canonical frontend tree currently contains 16 root categories, 60 nodes,
44 publishable leaves and 109 registry attributes. The enrichment
pass gives every publishable leaf a non-empty resolved publication schema,
search facets where fields are filterable, card priorities, comparison metadata,
detail-group order and media guidance.

There are currently no `subtype` nodes in the shipped fixture. The schema and
admin model support `category → subcategory → type → subtype`; adding a subtype
is therefore a data publication task, not a component rewrite.

## Implemented changes

- `frontend/src/domains/taxonomy/taxonomy.types.ts` now models field roles,
  privacy, comparison/search/SEO flags, richer data types, presentation rules,
  media guidance and taxonomy versions.
- `frontend/src/domains/taxonomy/attribute.registry.ts` adds reusable fields
  for vehicle history/energy, rentals, real estate equipment, services,
  tutoring, jobs, electronics, fashion, pets, leisure, sports, agriculture,
  professional equipment, energy and donation/product flows.
- `frontend/src/domains/taxonomy/taxonomy.data.ts` enriches legacy nodes without
  replacing the existing tree literal. It assigns family, publishability,
  inherited fields, card/detail/comparison metadata and media guidance.
- `PublishWizard` renders select, multi-select, number, range, money, boolean,
  long text and date fields from the resolved schema. It does not contain
  category-specific field trees.
- `PublicationService` validates required fields, dependencies, option values,
  numeric bounds, ranges, lengths and patterns, and sanitizes ID-keyed legacy
  attributes to canonical codes.
- Listing detail summaries and grouped characteristics resolve through node
  presentation metadata. Legacy slugs are normalized through
  `TaxonomyMigration`.
- Demo search resolves category descendants generically and applies dynamic
  attribute filters (scalar, array overlap and range criteria).
- The admin repository validates presentation references, filterability,
  duplicate attribute codes and option-bearing field types. Admin create/update
  inputs can edit presentation/media metadata.
- `packages/contracts/src/schemas/taxonomy.ts` provides a shared Zod boundary
  for frontend/backend taxonomy payloads.
- `backend/supabase/migrations/00010_taxonomy_schema_v2.sql` adds taxonomy
  versions, the global registry, explicit node assignments, listing schema
  versions, JSONB/index support and RLS policies while preserving legacy tables.
- The backend publication path validates canonical attributes and preserves
  legacy top-level `condition` drafts during the adapter transition.

## Field governance rules

| Rule | Runtime effect |
| --- | --- |
| Stable `id` and `code` | IDs are API/storage keys; codes are listing payload keys. Both are validated. |
| `fieldRole` | `required` blocks publication; `recommended` informs the seller; `computed/system` should not become public inputs. |
| `privacy` | Moderator-only fields are excluded from public detail rendering. |
| `filterable` | Only explicitly filterable attributes become search facets. |
| `comparable` | Only comparable fields become comparison candidates. |
| `publicationGroup` | Detail and publication ordering are derived from the same metadata. |
| `dependencies` | Conditional fields are shown and validated declaratively. |
| `validation` | Min/max, integer, length, pattern and step rules are shared by the form and validator. |
| `taxonomyVersion` / `attributes_schema_version` | Listings can be audited and migrated against the schema used at publication. |

## Backward compatibility and rollout

The old `categories`, `category_attributes` and `listings.category_id` columns
remain available. Migration 00010 adds v2 columns/tables rather than deleting
or rewriting existing data. The safe rollout sequence is:

1. publish registry and node assignments into `taxonomy_attributes` and
   `taxonomy_node_attributes`;
2. assign a published `taxonomy_versions` row;
3. backfill `categories.taxonomy_version_id` and
   `listings.taxonomy_version_id`/`attributes_schema_version`;
4. run contract and listing validation reports;
5. switch the future HTTP adapter to v2 reads;
6. deprecate legacy `category_attributes` writes only after backfill and
   verification.

## Remaining data work

The code path is schema-driven, but taxonomy content still needs a governed
business publication pass before production:

- complete country-specific taxonomy branches and subtype depth;
- localize every registry label/help/options map for each supported locale;
- seed the v2 registry and node assignments into Postgres;
- decide authoritative category IDs for old backend/demo fixtures and backfill
  listing references;
- add moderation-specific and market-specific rules where legal review requires
  them;
- add comparison UI and admin field-assignment screens on top of the metadata
  already exposed by the contracts.

These are data/governance or future adapter tasks; they do not require putting
category conditionals back into pages.

## Verification

Representative checks now cover:

- shared Zod taxonomy node/attribute contracts;
- taxonomy integrity, all publishable leaves, descendant filtering and dependent
  publication fields;
- listing summary/detail formatting across vehicles, real estate, electronics
  and furniture;
- admin duplicate-code/presentation validation and draft publication;
- backend required/options/type validation and legacy listing lifecycle.
