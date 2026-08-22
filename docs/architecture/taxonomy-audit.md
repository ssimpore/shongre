# Canonical taxonomy audit and implementation record

Status: taxonomy version 3 implemented and verified on 2026-08-22. The frontend
continues to run in the required `demo` data mode; this work does not connect it
to Supabase or the production API.

## Outcome

Shongre now has one shared identity catalogue for frontend and backend runtime
use, backed by an idempotent PostgreSQL reconciliation migration:

- 16 active root categories;
- 61 active nodes;
- 45 publishable leaves;
- 109 reusable attribute definitions;
- 52 active legacy aliases and redirects;
- 20 database source-to-canonical merge mappings;
- zero active duplicate IDs, codes or slugs;
- zero orphaned or circular nodes;
- 45/45 publishable leaves passing the coverage gate.

The canonical flow is:

```text
stable taxonomy identity + versioned attribute registry
        ↓
publication resolver + seller/market policy
        ↓
server validation + commercial authorization
        ↓
search facets + card fields + detail groups + comparison + CTA
```

`packages/contracts/src/fixtures/taxonomy-catalog.ts` owns stable IDs, codes,
slugs, localized names, hierarchy and legacy aliases. The existing frontend
taxonomy retains the richer schema and presentation configuration, and the
coverage gate prevents it from drifting from the shared identities.

## Audit inventory

| Surface | Existing source | Finding | Resolution |
| --- | --- | --- | --- |
| Frontend taxonomy | `frontend/src/domains/taxonomy/taxonomy.data.ts` | Richest source: 16 roots, inheritance and vertical metadata | Retained and enriched; checked against shared identities |
| Attribute definitions | `frontend/src/domains/taxonomy/attribute.registry.ts` | 109 reusable fields, but comparison coverage was incomplete | Retained; comparison flags completed |
| Publication | resolver, service and `PublishWizard` | Schema-driven fields existed; pricing/media copy still assumed a product | Reused; intent, media, price model, inventory and standard policy now resolve by family |
| Cards/details | shared `ListingCard`, listing display resolver and detail page | Detail groups were schema-driven; card summaries and CTA labels were not wired through | Shared web/native cards now render taxonomy summary fields; detail CTA follows taxonomy |
| Search/comparison | demo search, Auto and Cours verticals | Facets were schema-driven; compatible-leaf rule was not centralized | One compatibility guard and comparison attribute resolver added |
| Administration | taxonomy and monetization pages | Versioning existed; CTA, moderation and standard allowance were not editable | Existing editor extended; commercial simulator uses canonical IDs |
| Backend demo | taxonomy repository | Obsolete seven-root parallel tree and legacy slugs | Parallel tree removed; repository reads shared 61-node catalogue |
| Backend validation | taxonomy/listing/business-rule services | Server validation and quota authorization existed | Retained; final-leaf validation and job/on-request pricing added |
| Database | migrations 00001, 00004 and 00010 | Legacy IDs plus a v2 registry, without a complete canonical seed or aliases | Migration 00016 expands, maps, verifies and deprecates safely |
| Monetization | shared commercial catalogue and Immo scopes | `courses` and `real-estate` were commercial category aliases | Replaced with canonical taxonomy IDs |
| Demo listings | `frontend/src/mocks/initialDemoData.ts` | Several historical slugs were normalized independently in storage | One shared alias resolver now normalizes all seeded listings |
| SEO/navigation | category routes and taxonomy labels | Canonical routing existed but old aliases lacked one auditable map | Alias resolver returns canonical `/categorie/:slug` redirects |
| Discovery | collections and trending | `Bons plans` is a cross-category collection | Explicitly excluded from taxonomy aliases |

No category remains backend-only or frontend-only in active runtime identity
data. Historical values remain only in migrations, aliases, fixtures used to
prove compatibility, and migration tests.

## Canonical tree

```text
Véhicules
├── Voitures d'occasion
│   ├── Citadines
│   ├── Berlines
│   ├── SUV & 4x4
│   ├── Breaks
│   ├── Coupés & Cabriolets
│   └── Utilitaires & Fourgons
├── Motos & Scooters
├── Vélos & Trottinettes électriques
└── Équipements & Pièces Auto / Moto
Immobilier
├── Ventes immobilières
├── Locations à l'année
├── Bureaux & Commerces
└── Parkings & Garages
Emploi & Recrutement
└── Offres d'emploi
Services & Prestations
├── Bricolage, Rénovation & Travaux
├── Cours particuliers & Formation
└── Événementiel, Photo & DJ
Maison, Meubles & Jardin
├── Mobilier & Meubles
│   ├── Canapés & Fauteuils
│   ├── Tables & Chaises
│   └── Lits & Literie
├── Électroménager
└── Bricolage, Outillage & Jardin
Électronique & Multimédia
├── Smartphones & Téléphones
├── Informatique & PC Portables
├── Consoles & Jeux vidéo
└── Audio, Hi-Fi & Casques
Mode & Accessoires
├── Vêtements Femme
├── Vêtements Homme
├── Chaussures
└── Montres & Bijoux
Bébé & Puériculture
├── Poussettes & Sièges auto
└── Jouets & Jeux d'éveil
Loisirs, Livres & Musique
├── Instruments de musique
└── Livres, BD & Mangas
Sports & Plein air
├── Fitness & Musculation
├── Randonnée, Camping & Ski
└── Sports nautiques & Glisse
Animaux & Accessoires
└── Accessoires & Alimentation
Matériel Professionnel & BTP
├── BTP, Chantier & Engins
└── Restauration & Hôtellerie (CHR)
Agriculture & Espaces verts
└── Tracteurs & Matériel de récolte
Énergie & Transition Écologique
├── Panneaux solaires & Onduleurs
└── Bornes de recharge VE
Informatique Pro & Serveurs
Dons & Solidarité
```

Property type, vehicle make/model, course subject, job contract, fashion size
and similar decision dimensions remain controlled attributes rather than
parallel category trees. This avoids duplicating the same business concept at
multiple taxonomy levels.

## Duplicate reconciliation

Migration 00016 records counts before changing references, updates listings,
saved searches, category attributes, activity events and trending topics, then
marks old category rows `deprecated`. It never deletes a referenced category.

| Legacy source | Canonical target |
| --- | --- |
| `cars` | `vehicles.cars` |
| `motorcycles` | `vehicles.motos` |
| `bicycles` | `vehicles.cycles` |
| `real-estate` | `real_estate` |
| `real-estate-sale` | `real_estate.sales` |
| `real-estate-rent` | `real_estate.rentals` |
| `multimedia` | `electronics` |
| `smartphones` | `electronics.smartphones` |
| `computers` | `electronics.computers` |
| `gaming` | `electronics.gaming` |
| `home-garden` | `home_garden` |
| `furniture` | `home_garden.furniture` |
| `appliances` | `home_garden.appliances` |
| `clothing-women` | `fashion.women` |
| `clothing-men` | `fashion.men` |
| `luxury-watches` | `fashion.jewelry` |
| `leisure-sports` | `leisure_culture` |
| `musical-instruments` | `leisure_culture.instruments` |
| `sport-equipment` | `sports_outdoors.fitness` |
| `professional` | `professional_btp` |

Additional historical French slugs are stored as aliases. `Bons plans` is not
mapped to `Dons & Solidarité`; it remains a discovery collection.

## Schema, publication and presentation

Each active publishable leaf resolves:

- schema version and lifecycle status;
- supported intent and price model;
- required, recommended and conditional attributes;
- field validation, units, options and dependencies;
- search facets and sorting;
- 3–5 card decision fields;
- ordered detail sections;
- compatible-leaf comparison fields;
- media minimum/maximum and recommended views;
- localized SEO metadata;
- moderation/prohibited-item policy;
- primary CTA;
- free standard publication policy and non-preselected optional upgrades.

The standard journey remains one adaptive engine. Job offers use `Apply`, have
no product purchase flow and no mandatory product photo. Services use quote or
lesson CTAs and service pricing. Real estate uses visit requests and property
media. Vehicles use test-drive requests and technical decision fields.

Eligible private sellers keep `Publication standard gratuite`, including the
configured duration, media allowance, messaging, management and standard
statistics. Paid visibility is loaded asynchronously from the centralized
promotion service and is never preselected.

## Database design and safety

Migration `backend/supabase/migrations/00016_canonical_taxonomy_governance.sql`:

1. expands `categories` with publication, presentation, moderation, market,
   premium and schema-governance columns;
2. upserts version 3 and all 61 stable identities;
3. records 20 source-to-canonical mappings with before-counts;
4. creates 52 aliases and canonical redirects;
5. migrates every known reference table;
6. deprecates legacy rows without deleting them;
7. backfills the global attribute registry and node assignments;
8. adds hierarchy, publishable-marketplace and alias indexes;
9. enables deny-by-default RLS for aliases and merge reports;
10. exposes a read-only alias resolver;
11. is safe to rerun without duplicate rows or lost before-counts.

Search remains PostgreSQL-backed in the current backend. Updating
`listings.category_id` updates the existing B-tree/GIN-indexed records directly;
there is no external search index to rebuild in the current architecture.

## Verification record

The isolated PostgreSQL verification applied migrations 00001–00005, 00007,
00010 and 00016. Supabase-only role grants in unrelated migrations were not
needed for the taxonomy test database.

Results:

- 61 active nodes, 45 publishable leaves and 16 roots;
- 52/52 unique active aliases;
- zero duplicate active slugs;
- zero orphaned active nodes;
- migration 00016 reran successfully;
- a synthetic legacy listing and saved search both moved from `cars` to
  `vehicles.cars`;
- `attributes_schema_version` remained 2 and `taxonomy_version_id` was set;
- the mapping retained `listing_count_before = 1` and
  `saved_search_count_before = 1` after rerun;
- `real-estate-sale` resolved to
  `/categorie/ventes-immobilieres`.

The temporary verification database was dropped after these checks. No live or
production database was changed. On deployment, the merge report will capture
the real listing/reference counts before any production references move.

Run the executable coverage matrix with:

```bash
npm run check:taxonomy -w frontend
```

The command is part of the frontend prebuild and fails on incomplete leaf
configuration, identity drift, invalid aliases, unresolved demo listing
references, duplicate concepts, orphaned nodes, cycles or invalid references.

## External rollout boundary

Remaining work is operational rather than a missing in-repository
implementation:

- apply migration 00016 in the target Supabase environment and archive its
  generated merge-count report;
- keep the frontend in demo mode until the HTTP adapters are explicitly
  authorized;
- run production analytics/search cache revalidation after deployment if an
  external index is introduced;
- enable real payments, payouts, KYC/KYB and provider webhooks only through
  their existing backend feature flags and operational approvals.
