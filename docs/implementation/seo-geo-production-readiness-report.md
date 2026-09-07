# SEO and GEO production-readiness report

Date: 2026-09-07

## Outcome and evidence boundary

This change closes the safe repository-owned discovery gaps found in the audit.
The accepted runtime evidence uses the connected Web client in API mode, the
database-mode backend, and the repository-owned local Supabase stack. No demo
runtime result is used as completion evidence, and no production system,
credential, Search Console property, Bing property, or live IndexNow endpoint
was mutated.

The implementation improves crawl and rich-result eligibility; it does not
promise rankings, traffic, rich results, citations, or inclusion in an answer
engine. Field Core Web Vitals and production index coverage are not available
from repository evidence.

## Baseline findings

| Priority | Confidence | Finding                                                                                                                                              | Impact before this change                                                                                                                  |
| -------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| P0       | High       | Listing sitemap collection reused the ordinary search contract with a requested limit far above its bounded maximum.                                 | API-mode sitemap generation could not enumerate production-scale inventory reliably.                                                       |
| P0       | High       | Private crawler exclusions covered France-shaped paths but not every market-prefixed equivalent.                                                     | International account, messaging, payment, and administration route shapes were not represented consistently in crawler cooperation rules. |
| P1       | High       | Hydration and React Router navigation searched only `head` for metadata managed by streamed Next.js output.                                          | A client navigation could leave contradictory server and client robots metadata in the document.                                           |
| P1       | High       | Listing sitemaps did not expose validated listing images.                                                                                            | Search crawlers received weaker image-discovery signals.                                                                                   |
| P1       | High       | Product, collection, profile, and job structured data omitted several truthful fields already present in the authoritative server projection.        | Eligible pages had less complete machine-readable entity and offer context.                                                                |
| P1       | High       | Publication lifecycle events had no durable IndexNow delivery path.                                                                                  | Search freshness depended on recrawl and sitemap discovery alone.                                                                          |
| P1       | Medium     | A second client-side listing metadata/schema generator overlapped the server SEO policy.                                                             | Two potential owners could drift in canonical, lifecycle, and structured-data decisions.                                                   |
| P2       | High       | Auto, property, and education specialized detail templates depend on post-hydration entity data.                                                     | These routes cannot safely be indexed or receive subtype schema yet. They remain deliberately `noindex, follow`.                           |
| P2       | High       | No governed category/location or editorial content model exists.                                                                                     | The correct state is no generated permutation pages, avoiding thin or doorway inventory.                                                   |
| External | High       | No production Search Console/Bing coverage data, field CWV, public Rich Results validation, or answer-engine referral baseline is available locally. | Production discovery outcomes cannot be measured or attributed from this workspace.                                                        |

## Changes implemented

### Technical SEO

- Added `GET /api/v1/discovery/sitemap-listings` to the canonical OpenAPI
  document. It provides bounded, stable, snapshot-aware cursor pagination and
  returns public sitemap projections only.
- Implemented backend cursor validation, cross-market rejection, repeated-
  cursor protection, bounded page sizes, and batched public listing hydration.
  Public media URLs come from the backend projection backed by Supabase Storage;
  the Web client does not query Supabase.
- Added validated image entries to listing sitemap XML, including the image
  namespace, absolute HTTP(S)-only URL handling, deduplication, and bounded
  counts. Credential-bearing or malformed image URLs are omitted.
- Expanded production crawler exclusions from the authoritative country
  registry so private route prefixes cover France and every international
  market path.
- Fixed client metadata reconciliation across the whole streamed document so
  canonical, alternate, and robots nodes remain singular after hydration and
  client navigation.
- Preserved environment fail-closed behavior: only production can be indexed;
  local, test, preview, development, and staging return response-level noindex,
  disallow crawlers, and do not expose public sitemaps or the IndexNow key.
- Removed the duplicate client-side listing SEO/schema generator after a
  repository-wide consumer search. The typed server policy remains the only
  owner.

### International SEO

- Kept all host, prefix, locale, and market decisions in `CountryConfig`,
  `COUNTRY_REGISTRY`, `resolveMarketContext()`, and the canonical URL builders.
- Preserved self-canonicals and reciprocal alternates only for markets where the
  same public entity is actually available. The global gateway remains the
  `x-default` for eligible home-page alternates.
- Preserved Senegal and Burkina Faso as coming-soon, non-indexable markets until
  their activation and legal/indexing readiness are authoritative.
- Added market binding to sitemap cursors and rejects reusing a cursor for a
  different country.

### Structured data

- Product schema now uses the canonical listing URL, all validated public
  images, truthful Schema.org item-condition mappings, price/currency,
  availability, seller, category, and visible service area.
- JobPosting schema now emits only supported employment types, truthful remote
  eligibility and applicant country, ISO-currency salary values with exponent-
  aware conversion, validated employer logos, and only active/unexpired jobs
  with a real publication date.
- Qualified collections now emit `CollectionPage`, `ItemList`, and
  `BreadcrumbList` from the same visible server projection.
- Eligible public seller pages retain `ProfilePage`; home/trust pages retain the
  stable Organization/WebSite and applicable page types.
- No ratings, reviews, inventory counts, GTINs, shipping promises, return
  policies, identities, dates, salaries, or locations were invented.

### Fresh discovery and privacy

- Added a service-role-only `indexnow_events` PostgreSQL outbox with deny-by-
  default RLS, publication/update/sale/expiry/removal triggers, stable event
  keys, leasing with `SKIP LOCKED`, retry backoff, dead-lettering after eight
  attempts, and 30-day completed-event cleanup.
- Added a production-only backend worker. It filters events against current
  market, legal, launch, and indexing readiness; builds URLs through canonical
  market utilities; groups batches by verification host; and treats only HTTP
  200/202 as success.
- Added a production-only same-host `/indexnow-key.txt` endpoint. IndexNow is
  off by default and requires both `INDEXNOW_ENABLED=true` and a valid key.
- Kept the key and full submitted URLs out of logs. The outbox contains public
  URL metadata only—not listing bodies, seller contact data, messages, payment
  data, or verification data.

### Content and GEO

- Preserved factual, visible About, Contact, help, safety, legal, privacy,
  terms, and accessibility references as the authority/trust layer.
- Kept metadata, visible content, schema, API projections, and sitemap URLs tied
  to the same server route data.
- Preserved `ugc nofollow` handling for untrusted user-provided outbound links.
- Did not create thin location/category permutations, filler FAQs, fabricated
  editorial authorship, keyword variants, or mass-generated pages.
- Retained the pre-existing bounded `/llms.txt` only as an explicitly
  experimental directory. It grants no access and is not treated as an OpenAI
  or search-engine ranking/indexing signal.
- Kept `OAI-SearchBot` search participation and `GPTBot` training policy as
  separate controls.

### Media and performance

- The primary listing image reserves a 1200 by 900 box, uses truthful alt text,
  eager loading, and high fetch priority; the connected 390 by 844 browser
  check confirms no horizontal overflow.
- Sitemap image URLs are stable public Supabase Storage projections. Responsive
  variants remain enabled only for configured providers whose resizing
  semantics are known; the local Supabase Storage transformation endpoint is
  not enabled, so this change does not generate broken speculative transform
  URLs.
- The production build remains within bundle budgets: 345.8 KiB gzip initial
  JavaScript, 84.3 KiB gzip largest chunk, and 19.2 KiB gzip for the listing
  detail route.
- An actual Chrome DevTools performance trace was not available because the
  Chrome DevTools MCP trace tools are not installed in this environment. No
  synthetic LCP, INP, CLS, or TTFB number is reported as measured.

## Route and indexation matrix

All indexable outcomes below also require production, an active and legally
approved market, a canonical market match, and successful server data
resolution. Lower environments are always `noindex, nofollow, noarchive` at the
response layer.

| Route family                                                                                                    | Production status and index policy                                                                              | Canonical / alternate policy                                                                     | Sitemap / schema                                                            |
| --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| France home `shongre.fr/`                                                                                       | Indexable canonical page                                                                                        | Self-canonical; reciprocal eligible market alternates and global `x-default`                     | Static sitemap; Organization + WebSite                                      |
| Global gateway `shongre.com/`                                                                                   | Indexable country-selection page                                                                                | Self-canonical and `x-default`                                                                   | Static sitemap; factual organization/site context only                      |
| Belgium/Switzerland market home                                                                                 | Indexable when market is active and approved                                                                    | Self-canonical under `/be` or `/ch`; reciprocal only when equivalent                             | Static sitemap; Organization + WebSite when eligible                        |
| Senegal/Burkina Faso market home                                                                                | Coming soon; non-indexable but reachable                                                                        | Self URL, no invented equivalence                                                                | Excluded; no eligible rich schema                                           |
| Categories and subcategories                                                                                    | Indexable only for canonical taxonomy nodes with market availability and minimum inventory                      | Taxonomy-projected self-canonical; old taxonomy path redirects once                              | Category sitemap; applicable collection/breadcrumb schema                   |
| Category query, filters, sorts, tracking state                                                                  | `noindex, follow`                                                                                               | Clean category canonical                                                                         | Excluded; no variant schema                                                 |
| Root search                                                                                                     | Indexable only without query state and with sufficient inventory                                                | `/recherche`                                                                                     | Eligible only for the clean qualified collection; no arbitrary-query schema |
| Search queries and faceted search                                                                               | `noindex, follow` and crawlable                                                                                 | Clean `/recherche` canonical                                                                     | Excluded                                                                    |
| Curated collection directory/pages                                                                              | Indexable only with maintained content and minimum inventory                                                    | Canonical slug; stable legacy ID/slug redirects once                                             | Collections sitemap; CollectionPage + ItemList + BreadcrumbList             |
| Category/location landings                                                                                      | No pages are allowlisted today                                                                                  | No generated permutations                                                                        | Excluded pending owned content model                                        |
| Generic active listing `/annonce/{id}`                                                                          | Indexable when active and market-published                                                                      | Self-canonical, or one redirect to its authoritative specialized path                            | Listings + image sitemap; Product/Offer                                     |
| Inactive, sold, expired, suspended, unavailable listing                                                         | Preserved current reachable `noindex, follow` behavior when resolved; missing/deleted resources return real 404 | Stable resource canonical where resolved                                                         | Excluded; no Product/Offer                                                  |
| Specialized Auto/Immo/Education detail                                                                          | `noindex, follow` until the entity is server-hydrated                                                           | Specialized path is authoritative; generic alias redirects once                                  | Excluded; subtype schema intentionally deferred                             |
| Public seller/professional profile                                                                              | Indexable only with sufficient active inventory                                                                 | `/profil/{slug}` or `/boutique/{slug}` based on authoritative seller type; aliases redirect once | Professionals sitemap; ProfilePage                                          |
| Jobs collection                                                                                                 | Indexable without arbitrary query state and with active inventory                                               | `/emploi`                                                                                        | Jobs collection sitemap when qualified                                      |
| Active job detail                                                                                               | Indexable until authoritative expiry                                                                            | `/emploi/offre/{slug}`                                                                           | Jobs sitemap; JobPosting when published date exists                         |
| Expired job                                                                                                     | Reachable `noindex, follow`                                                                                     | Stable job canonical                                                                             | Excluded; no JobPosting                                                     |
| About, Contact, help, safety, legal, privacy, terms, accessibility                                              | Indexable canonical trust/static pages                                                                          | Self-canonical; alternates only where the page is genuinely equivalent                           | Static sitemap where configured; applicable AboutPage/ContactPage/WebPage   |
| Editorial guides                                                                                                | No new indexable family without owner, sources, dates, methodology, and maintenance policy                      | No synthetic slugs or variants                                                                   | No feed/sitemap group today                                                 |
| Auth, account, favorites, messaging, publication, checkout, payment, verification, admin, API, preview/internal | Private or transactional; `noindex, nofollow`; crawler-disallowed cooperation rule                              | No public discovery alternate                                                                    | Excluded; no public schema                                                  |
| Legacy canonical route                                                                                          | Permanent single-hop redirect (`308` where handled by Next route policy)                                        | Destination is the only canonical                                                                | Source excluded                                                             |
| Unknown or missing public resource                                                                              | Real `404`; never soft 404                                                                                      | No false entity canonical/schema                                                                 | Excluded                                                                    |
| Unresolved removal/retention policy                                                                             | Current status is preserved                                                                                     | Requires product/legal decision before introducing `410` or retention redirects                  | No speculative change                                                       |

## Representative validation evidence

### Connected API/Supabase runtime

- Web data mode: API.
- Backend data mode: database, using repository-owned local Supabase.
- Sitemap endpoint: first and second cursor pages returned distinct IDs; using
  a France cursor for Belgium returned `400 VALIDATION_ERROR`.
- Public media projection returned a real Supabase Storage URL rather than an
  undefined or demo asset.
- No live IndexNow request was made. Disabled-mode behavior and delivery
  outcomes use mocked fetch in worker tests.

### Browser coverage

Regular Playwright Chromium passed 11 of 11 connected checks:

- initial server HTML and truthful schema;
- server/hydrated metadata identity;
- 390 by 844 mobile layout, LCP image priority/dimensions, and no overflow;
- client-side listing navigation without duplicate robots metadata;
- active JobPosting;
- canonical organization trust page;
- arbitrary-search noindex with crawlable links;
- canonical taxonomy plus interacted-facet noindex;
- real missing-resource and unknown-route 404s;
- single-hop legacy redirect with retained user state;
- lower-environment crawler and sitemap blocking.

Interaction coverage includes HTTP/initial HTML, hydrated desktop rendering,
React Router navigation, mouse-driven sort/facet interaction, and a narrow
mobile viewport. Firefox/WebKit were not used for the final focused run because
the canonical repository E2E wrapper selects standalone demo mode, which is out
of scope for this evidence; no demo browser result is counted.

Online Schema.org Validator and Google Rich Results Test submissions were not
performed: the representative URLs are local and the task does not authorize a
public production deployment or submission of local fixture payloads to a live
provider. Local contract tests enforce JSON escaping, required values, supported
enums, lifecycle gates, and omission of unverified fields. Public validation
remains a release step.

## Verification commands

| Command/check                                        | Result                                                                                       |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `make openapi-generate` / `make openapi-check`       | Passed; 521 operations, 516 runtime operations plus 5 operational endpoints, 460 paths       |
| `make migrations-check`                              | Passed; 113 ordered migrations                                                               |
| `make db-migrate`                                    | Passed; IndexNow migrations applied to local Supabase                                        |
| Generated DB type inspection                         | `indexnow_events` and all four IndexNow RPCs present; no `db-types-check` Make target exists |
| `make supabase-health`                               | Passed                                                                                       |
| `make local-fixtures-check`                          | Passed; 19 listings, 31 profiles, 77 media assets                                            |
| `make capability-inventory-check`                    | Passed; 521 operations, 113 migrations, 423 test files                                       |
| `make seo-check`                                     | Passed; 5 crawler policies and 96 private path guards                                        |
| `make backend-typecheck` / `make frontend-typecheck` | Passed                                                                                       |
| `make backend-lint` / `make frontend-lint`           | Passed, including route, navigation, design-system, token, and SEO governance checks         |
| `make format-check`                                  | Passed before final report; rerun in the final clean gate                                    |
| `make backend-test`                                  | Passed; 181 files, 990 tests passed, 2 intentional skips                                     |
| `make frontend-test`                                 | Passed; 167 files, 1,097 tests                                                               |
| Focused IndexNow/OpenAPI/RLS tests                   | Passed; 3 files, 16 tests                                                                    |
| Connected Chromium SEO E2E                           | Passed; 11 tests, API/database/local-Supabase runtime                                        |
| `make backend-build` / `make frontend-build`         | Passed; frontend bundle budgets passed                                                       |
| `make smoke`                                         | Passed after final documentation in connected API/database/local-Supabase mode               |
| Chrome DevTools CWV trace                            | Not run; required trace MCP tools unavailable, so no fabricated metric                       |

No visual token value or component styling changed, so a standalone token
generation/synchronization step was not required; frontend lint still ran the
repository's design-system and token governance checks.

## Remaining production or policy work

1. Configure and verify the real production origins, Google and Bing ownership
   tokens, per-origin Search Console properties, and sitemap submissions.
2. Provision a production IndexNow key, expose it through the protected secret
   store, set `INDEXNOW_ENABLED=true` only after verification, and observe the
   first batches. The feature remains safely off until then.
3. Configure CDN/WAF verification of claimed OAI-SearchBot, GPTBot, and other
   bot IP ranges from their current official publications. Never trust only a
   user-agent string.
4. Validate representative deployed URLs in Google Rich Results Test and
   Schema.org Validator. Resolve every critical error before release.
5. Establish field CrUX/RUM Core Web Vitals by market, route family, device, and
   connection cohort. Install the Chrome DevTools MCP integration if a local
   trace is required during engineering review.
6. Decide with product/legal whether inactive, sold, expired, and intentionally
   removed listings should remain available, redirect, return 404, or return
   410, including retention periods and user value. Current behavior is
   intentionally preserved.
7. Server-hydrate the full Auto/Immo/Education entity projections before making
   specialized pages indexable or emitting vehicle/property/education subtype
   schema.
8. Provide editorial ownership, methodology, sources, correction process, and
   maintained unique content before introducing guides or an explicit
   category/location allowlist.
9. Confirm that hosted Supabase image transformations are enabled and budgeted
   before adding responsive transformation URLs for owned listing media.

## Measurement plan

Capture a dated pre-release baseline, annotate the release, and compare like-
for-like cohorts. Segment every applicable measure by market, route family,
device, and landing-page type; retain brand/non-brand separation where the
provider supports it.

| Measure                                         | Source and cadence                                                                                                 | Release guardrail / interpretation                                                                                                                           |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Valid indexed pages                             | Google Search Console page indexing and submitted sitemap reports; weekly, daily during rollout                    | Compare valid canonical count with eligible sitemap inventory; investigate unexpected loss or indexation of excluded routes                                  |
| Excluded and duplicate URLs                     | Search Console reasons plus canonical inspection samples; weekly                                                   | Facets, private routes, lower environments, and inactive resources should remain excluded; unexpected alternate canonical selection is a defect              |
| Crawl and sitemap errors                        | Search Console, Bing Webmaster, CDN status logs, and sitemap endpoint checks; daily alerts                         | Alert on non-2xx sitemap fetches, invalid XML, wrong-host URLs, redirect chains, or private URL appearance                                                   |
| Organic impressions, clicks, CTR, landing pages | Search Console API and existing analytics ingestion; weekly and 28-day comparison                                  | Segment market/route/brand; do not attribute changes to the release without cohort and seasonality evidence                                                  |
| Rich-result eligibility                         | Search Console enhancements plus scheduled representative Rich Results tests; weekly                               | Zero critical schema errors; valid markup is eligibility, not a result guarantee                                                                             |
| LCP, INP, CLS                                   | Privacy-gated RUM and CrUX at the 75th percentile; weekly, trailing 28 days                                        | Targets: LCP at most 2.5 s, INP at most 200 ms, CLS at most 0.1; track sample size and route/device mix                                                      |
| Bing/AI visibility                              | Bing Webmaster reports and any product-supported citation/referral reporting; monthly                              | Record availability and sampled citations without inferring complete coverage                                                                                |
| ChatGPT referrals                               | Consent-gated analytics using referrer classification and `utm_source=chatgpt.com`; weekly                         | Count sessions and landing pages without logging prompts or private URLs                                                                                     |
| Conversion quality                              | Existing analytics and authoritative backend outcomes; weekly                                                      | By market/landing type: qualified contact, saved item, publication, checkout, and completed transaction rates; protect PII and avoid last-click overclaiming |
| IndexNow health                                 | Outbox queue age, retries, dead letters, batch size, and provider status class; operational dashboard and alerting | Alert on sustained oldest-event age, repeated 429/5xx, dead-letter growth, or submissions while disabled                                                     |

## Primary-source guidance used

- [Google: canonical URL consolidation](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Google: faceted navigation crawl management](https://developers.google.com/search/blog/2024/12/crawling-december-faceted-nav)
- [Google: sitemap construction](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Google: robots.txt and noindex](https://developers.google.com/search/docs/crawling-indexing/robots/intro)
- [Google: localized versions and hreflang](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [Google: merchant listing structured data](https://developers.google.com/search/docs/appearance/structured-data/merchant-listing)
- [Google: JobPosting structured data](https://developers.google.com/search/docs/appearance/structured-data/job-posting)
- [Google: ProfilePage structured data](https://developers.google.com/search/docs/appearance/structured-data/profile-page)
- [Schema.org: ProfilePage](https://schema.org/ProfilePage)
- [OpenAI: publisher and crawler controls](https://help.openai.com/en/articles/12627856)
- [IndexNow protocol](https://www.indexnow.org/documentation)
- [Bing Webmaster: IndexNow](https://www.bing.com/webmasters/help/indexnow-0z209wby)
- [Next.js: Metadata API](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [Next.js: robots metadata convention](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots)
- [Supabase: Storage image transformations](https://supabase.com/docs/guides/storage/serving/image-transformations)
