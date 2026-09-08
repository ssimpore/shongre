# Product experience harmonization report

Date: 2026-09-07

This is the implementation record for the repository-wide Web and native
product-experience audit. It records only defects verified from source, tests,
or a reproduced journey. Existing production, brand, taxonomy, market, and
access-control architecture was strengthened in place; no parallel UI, state,
navigation, service, or fixture system was introduced.

## 1. Executive summary

The audited repository already had mature design-token, navigation, route,
accessibility, contract, market, authorization, and browser gates. The baseline
`make check` passed, covering 175 Web routes, 215 static destinations, 173
routed screens in the E2E matrix, 520 OpenAPI operations, 111 ordered database
migrations, and all package production builds. A subsequent real-browser run
found one P0 missed by the non-E2E gate: every generic search and canonical
category journey crashed because the deterministic Web adapter returned raw
taxonomy nodes under a `Category[]` cast.

That P0 is fixed at the adapter boundary. The native audit also removed the
last local taxonomy source from publication, moved all search filtering to the
authoritative API, corrected the shared form-field disabled announcement,
added real radio semantics, completed native route titles, and made reporting,
blocking, and offers deliberate consequential actions. Mobile remains strictly
API-only and reaches Supabase only through the Shongre backend.

## 2. Product-wide experience map

| Experience plane         | Implemented journeys                                                                                                        | Primary surfaces                                            |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Public discovery         | country gateway, home, category, query search, facets, maps, listing, seller/store, Auto, Immo, Employment, Education       | responsive Web; native home/search/listing                  |
| Identity and preferences | registration, login, password recovery, email verification, consent, market/location/currency preferences, account settings | Web and native, with platform-specific session storage      |
| Buyer engagement         | favourites, saved searches and alerts, seller/price watch, messaging, offers, transactions, delivery, digital purchases     | Web and native where the capability is approved             |
| Seller and Professional  | publication, listing management, storefront, subscription, promotion, billing, vertical workspaces, digital selling         | Web; focused API-backed native publication/account surfaces |
| Trust and support        | verification, moderation, reports, blocks, appeals, account deletion, support requests, safety guidance                     | Web and native user entry points; Web operator workspaces   |
| Internal operations      | Staff, organization, support, trust and safety, finance, administration, CRM, market/taxonomy configuration                 | Web only by intentional platform policy                     |

## 3. Screen, route, and critical-flow inventory

The canonical Web inventory contains 175 registered routes and 215 verified
static destinations. The route test registry exercises 173 routed screens,
including public catalogue/detail surfaces, authentication, legal/help,
publication, buyer and seller workspaces, professional applications, Staff,
admin, finance, support, Trust and Safety, CRM, and compatibility redirects.

The Expo inventory contains 18 routable entries, including the root redirect,
plus two layout routes. User-facing screens are home, search, publication,
message list/thread, account overview, alerts, favourites, billing, delivery,
digital purchases, digital selling, notification preferences, login, listing
detail, settings, and account deletion. The audited critical native chains were:

1. market context → home/search → listing → favourite/contact/watch;
2. search inputs → canonical category/price API filters → result cards;
3. authenticated seller → API taxonomy tree → resolved schema → publication;
4. listing → reasoned report or confirmed block → authoritative response;
5. conversation → validated amount → confirmed offer → authoritative response;
6. account → explicitly titled destination → recoverable async state.

## 4. Cross-platform capability and parity matrix

| Capability                                               | Web                                              | iOS/Android                                              | Parity decision                                                            |
| -------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------- | -------------------------------------------------------------------------- |
| Discovery, search, category scope, prices                | complete responsive experience                   | API-backed focused experience                            | same domain meaning and backend authority; platform-native layout          |
| Listing detail and engagement                            | complete                                         | focused detail, favourite, contact, watch, report, block | same action names and consequences                                         |
| Publication                                              | full multi-step and vertical flows               | compact API-backed taxonomy-v1 flow                      | same contracts and server decisions; different presentation is intentional |
| Messaging and offers                                     | complete                                         | message thread and confirmed offers                      | same financial meaning; native confirmation added                          |
| Checkout/payment/subscription                            | complete where market/provider policy enables it | no native digital checkout                               | intentional store/policy boundary; no fake parity                          |
| Consent and account deletion                             | complete                                         | settings and guarded deletion                            | same consequences, native conventions                                      |
| Professional/admin/CRM/finance operations                | complete Web workspaces                          | not exposed                                              | intentional desktop operational boundary                                   |
| SEO, canonical URLs, browser history                     | server/client Web boundary                       | not applicable                                           | Web-specific                                                               |
| Secure native bearer storage and notification deep links | not applicable                                   | SecureStore/system notification routing                  | native-specific                                                            |

## 5. Implemented UI and design-system improvements

- The shared native `Button` now forwards a real accessibility role and state,
  then merges authoritative disabled/loading state. Selection controls can use
  the common visual primitive without being misrepresented as plain buttons.
- Publication universes, categories, listing types, fulfilment modes, access
  classes, and credential-allocation modes now expose radio-group semantics.
- Native form fields announce disabled only for explicit `editable={false}`;
  default text inputs are no longer announced as disabled.
- Existing semantic token sizing, spacing, radius, colour, and typography
  remain the only visual sources. No raw colour, one-off token family, or new
  theme was added. The repository remains intentionally light-scheme.

## 6. Action and interaction harmonization matrix

| Action                | Class                          | Harmonized behavior                                                                                          |
| --------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Search/filter         | primary task + toggles         | labelled fields, radio scope, inline price errors, debounced authoritative request, retry                    |
| Publish listing       | primary, consequential         | disabled until API taxonomy/schema are ready; backend-confirmed success or recoverable error                 |
| Favourite/watch       | reversible toggle              | retained optimistic/reversible interaction only where safe                                                   |
| Contact seller        | navigational                   | authentication gate, loading state, authoritative conversation creation                                      |
| Send offer            | consequential financial action | amount validation, formatted confirmation, explicit “Envoyer l’offre”, then API submission                   |
| Report listing        | destructive/safety action      | exact reason, required factual details, privacy guidance, cancel, loading, inline failure, confirmed success |
| Block seller          | destructive but reversible     | explicit consequence confirmation followed by an undo path                                                   |
| Delete account        | irreversible                   | retained existing reauthentication, typed confirmation, and consequence explanation                          |
| Consent accept/refuse | privacy choice                 | retained existing equal-prominence, no-silent-dismiss behavior                                               |

## 7. Accessibility improvements and verification

The P0 search repair restored the main landmark and the entire accessibility
tree on search/category pages. The focused isolated production-browser runs
then passed 64 checks: 52 Chromium and WebKit checks across regular and serial
search phases, plus 12 Chromium category/redirect checks. These covered plain
and query search, vertical searches, saved searches, canonical category
landings, redirects, truncation/reflow, and axe, with no critical or serious
axe finding.

Native improvements are covered by TypeScript, lint, the shared UI test suite,
and the full mobile test/architecture gate. Regression tests prove default and
explicitly editable inputs are enabled while `editable={false}` alone is
disabled. Loading announcements, radio roles/check state, error alerts, minimum
touch-control sizing, and modal semantics are implemented in the changed
surfaces.

Manual VoiceOver and TalkBack completion remains external verification; this
host has no running native simulator/device surface. No unperformed manual
screen-reader result is claimed.

## 8. Localization and market improvements

- Native publication labels resolve the active market locale with the required
  French fallback instead of pinning category text to `fr-FR`.
- Search scopes map to canonical taxonomy identifiers, never localized display
  text. Currency conversion for saved-search alert contracts still uses the
  shared money utility; public search sends documented major-unit bounds.
- Publication taxonomy is resolved for the active market and locale by the API;
  unavailable markets/categories fail closed with loading, empty, error, and
  retry states.
- Only French is currently shipped. The baseline i18n gate reports 2,587
  tracked user-visible literals across 183 files; migrated surfaces are clean.
  Shipping another locale requires approved translations and remains a product
  content dependency, not an invitation to invent copy.

## 9. Performance improvements and measurements

- Removing the native bundled taxonomy from publication avoids loading the
  complete local taxonomy fixture into that screen and replaces it with one
  market-scoped, validated API tree. Schema and cascading options remain lazy.
- Native search no longer downloads a broad result set and performs fuzzy scope
  and price filtering on the device; the backend receives the canonical scope
  and bounds and returns the authoritative set.
- Search request identity prevents stale responses from replacing current
  input, and invalid price input makes no network request while preserving the
  prior result state.
- The baseline production Web build passed at 345.8 KiB gzip initial client
  JavaScript with an 84.3 KiB largest chunk, within repository budgets. The
  repaired isolated production build compiled successfully and retained 281
  browser source maps. No speculative memoization, caching layer, or index was
  introduced without measurement.

## 10. Architectural consolidation and obsolete code

- Removed the unsafe `TaxonomyNode[] as any` compatibility lie from the Web
  demo adapter. It now returns the existing lazy legacy `Category` projection.
- Removed the native runtime import and singleton for
  `getTaxonomyV1PublicBundle`; the existing HTTP taxonomy service is the sole
  publication source.
- Split the native listing service's collection read from its typed search
  command. Removed display-text alias matching and client-side result
  filtering. One canonical scope-to-category function is shared by search and
  saved-alert creation.
- Removed no compatibility route, migration, generated artifact, or unrelated
  user work. Existing Web-only deterministic test adapters remain because they
  are required by repository policy; they are not a native or production data
  fallback.

## 11. Completed backlog mapped to findings

| ID    | Priority / severity / confidence | Verified evidence and impact                                                                                                                                      | Resolution and acceptance evidence                                                                                                     | Status    |
| ----- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| PX-01 | P0 / critical / high             | Historical browser fixture taxonomy omitted `subCategories`, crashing search and category routes; the fixture adapter was later retired by the API-only migration | Historical regression assertion; focused production Playwright 64/64                                                                   | completed |
| PX-02 | P1 / high / high                 | Native publication imported the complete public taxonomy bundle, bypassing the API-only client boundary                                                           | `mobile/app/(tabs)/publish.tsx:222` loads a keyed API tree; explicit loading/error/empty/retry and publish gate; mobile API-only audit | completed |
| PX-03 | P1 / high / high                 | Native search guessed vertical membership from title/condition/characteristics and filtered price after transport                                                 | `mobile/src/features/listings/listings.service.ts:39` and `:68`; `mobile/app/(tabs)/search.tsx:118`; exact payload regression test     | completed |
| PX-04 | P1 / high / high                 | `!editable` announced every default native field as disabled                                                                                                      | `packages/ui/src/forms/FormField.native.tsx:37`; pure three-case regression test                                                       | completed |
| PX-05 | P1 / high / high                 | Native listing reports submitted generic “other” data without collecting the user's reason/details                                                                | `mobile/app/listing/[id].tsx`: reasoned modal, minimum detail validation, privacy help, cancel/loading/error/success                   | completed |
| PX-06 | P1 / high / high                 | Native offers and seller blocks executed immediately despite financial/safety consequences                                                                        | `mobile/app/messages/[id].tsx:116`; `mobile/app/listing/[id].tsx:174`; formatted confirmation and block undo                           | completed |
| PX-07 | P2 / medium / high               | Shared native buttons could not represent radio state; selection groups were visual only                                                                          | `packages/ui/src/primitives/Button.native.tsx:33`; migrated search/publication/report selection consumers                              | completed |
| PX-08 | P2 / medium / high               | Three nested Expo destinations relied on filename-derived header labels                                                                                           | `mobile/app/_layout.tsx:108`; explicit localized titles                                                                                | completed |

No P3-only cosmetic change survived validation as worth adding. A proposed dark
theme and identical Web/native layouts were rejected with evidence: the product
declares a light colour scheme and platform-specific navigation/accessibility
adapters are intentional.

## 12. Tests, builds, browsers, devices, viewports, and flows verified

| Gate                                          | Result                                                                                                                                        |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Baseline `make check`                         | passed before task edits                                                                                                                      |
| Frontend unit/component tests                 | 167 files, 1,093 tests passed after repair                                                                                                    |
| Shared UI checks                              | typecheck plus 7 files, 18 tests passed                                                                                                       |
| Mobile full check                             | lint, typecheck, 19 files/75 tests, API-only audit over 59 runtime files, workspace resolution, and 39-file dead-code graph passed            |
| Focused isolated Web production/browser check | production build passed; 52/52 Chromium/WebKit search checks and 12/12 Chromium category/redirect checks passed                               |
| Cross-platform check                          | tokens, brand, package boundaries/tests, Web build/budget, Expo Doctor 21/21, and contracts passed; iOS SDK preflight blocked                 |
| Final canonical `make check`                  | passed: environment, hygiene, format, brand/tokens, OpenAPI, lint/types, all package tests/builds, Supabase template, secrets, and boundaries |

The browser plugin was not available in this task, so the repository's regular
Playwright fallback was used as required. Chromium and WebKit were executed
against fresh isolated production builds; the missing pinned WebKit runtime was
installed and the exact failed-to-launch matrix was rerun successfully. Firefox
cannot launch on this macOS 27 host because of the repository-documented
upstream sandbox incompatibility. The complete browser matrix remains part of
CI/release gating; no unsupported manual browser claim is made here.

## 13. Before-and-after evidence

| Before                                                                                                                                          | After                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `/recherche`, query search, and category aliases rendered Next's fatal error boundary: `Cannot read properties of undefined (reading 'length')` | production Chromium and WebKit render the routes and complete axe plus truncation checks               |
| Mobile publication selected categories from a bundled runtime taxonomy                                                                          | categories, listing types, schema, and cascading options come through market-scoped `/api/v1` services |
| “Auto/Immo/Emploi/Formation” was guessed from rendered words                                                                                    | each scope sends its canonical taxonomy category ID to search                                          |
| Invalid prices could reach conversion/filter logic                                                                                              | per-field errors block the request and preserve prior results                                          |
| Default native inputs were announced disabled                                                                                                   | only explicit non-editability is announced disabled                                                    |
| “Proposer”, “Signaler”, and “Bloquer” could mutate immediately                                                                                  | explicit verbs, reason/details, confirmation, loading, authoritative feedback, and undo where possible |

## 14. Remaining blockers requiring human or external resources

1. **Native manual assistive-technology evidence:** run the documented iOS and
   Android release/screen-reader matrix on physical devices or configured
   simulators. This host cannot supply VoiceOver/TalkBack interaction evidence.
2. **Full iOS build:** full Xcode and the `iphoneos` SDK are not selected on this
   host. The repository's generated-project and store preflights must run on a
   capable release host.
3. **Hosted API/Supabase/provider certification:** API-mode staging E2E,
   production-like load, webhooks, payments, KYC/KYB, restore drills, and
   observability require environment credentials, deployed infrastructure, and
   release authorization. The clients fail closed; no local value was invented.
4. **Additional shipped locales:** require approved translation content and a
   product decision before changing `SHIPPED_LOCALES`.

## 15. Pre-existing failures outside this task

The canonical non-E2E baseline had no failure. The first exhaustive browser run
was deliberately interrupted after 11.1 minutes once 372 checks had passed and
the single taxonomy P0 had produced 28 cascading search/category-dependent
failures; 38 route-matrix cases were intentionally skipped and 838 had not yet
run. The root cause was fixed and the affected focused production sweep passed.
This interrupted baseline is not represented as a post-fix failure.

External release gaps already tracked in the production capability matrix—live
provider certification, hosted performance evidence, full Xcode, and deployment
authorization—remain outside source-only implementation authority.

## 16. Final diff and tracking confirmation

All eight validated findings are completed. The task changed only the adapter,
native routes/services, shared native primitives/tests, documentation needed
for those findings, and the generated capability count block required after
adding tests. No database, OpenAPI, generated contract, brand source, provider
policy, deployment configuration, or unrelated dirty-worktree change was
overwritten. Final status/diff inspection passed, and the final canonical
`make check` completed successfully.
