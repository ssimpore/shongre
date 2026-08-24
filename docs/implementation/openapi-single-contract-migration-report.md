# OpenAPI single-contract migration report

Date: 2026-08-24  
Contract: `backend/openapi/openapi.json`  
OpenAPI: 3.1.0  
Contract release: 1.0.0  
Business base path: `/api/v1`

## Final inventory

The canonical specification contains 253 path items and 267 operations across
41 API domains:

| Runtime                                             | Operations | Contract status                                            |
| --------------------------------------------------- | ---------: | ---------------------------------------------------------- |
| Versioned backend router                            |        264 | Exact method/path and access parity enforced               |
| Operational probes (`/health`, `/livez`, `/readyz`) |          3 | Documented in the same contract with root server overrides |
| Total                                               |        267 | One OpenAPI document                                       |

Access declarations are explicit for every operation: 57 public, 49
authenticated, and 161 permission-protected. The complete method/path,
operation ID, access, permission, and success-status inventory is generated at
[`backend/docs/generated/endpoint-inventory.md`](../../backend/docs/generated/endpoint-inventory.md).

## Migration map

| Removed or conflicting contract                    | Canonical contract                                                                          |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Unversioned business shadow such as `/listings`    | `/api/v1/listings`; unversioned calls return 404                                            |
| `/api/v1/courses/*`                                | `/api/v1/education/*`                                                                       |
| `GET /api/v1/promotions/boosts`                    | `GET /api/v1/business-rules/catalog`                                                        |
| `GET /api/v1/promotions/pro-plans`                 | `GET /api/v1/monetization/professional-plans` or the commercial catalog                     |
| `POST /api/v1/promotions/apply-boost`              | `POST /api/v1/monetization/quotes` then `/monetization/checkouts`                           |
| `POST /api/v1/promotions/subscribe-pro`            | Canonical quote/checkout/subscription workflow                                              |
| `GET /api/v1/messaging/conversations/:userId`      | `GET /api/v1/messaging/conversations`; caller derived from principal                        |
| `GET /api/v1/messaging/conversations/detail/:id`   | `GET /api/v1/messaging/conversations/:id`                                                   |
| `POST /api/v1/messaging/send`                      | `POST /api/v1/messaging/conversations/:id/messages`                                         |
| User-addressed notification URLs                   | `/api/v1/notifications`, `/unread-count`, and `/read-all`                                   |
| `/api/v1/orders/purchases/:userId`                 | `GET /api/v1/orders/purchases`                                                              |
| `/api/v1/orders/sales/:userId`                     | `GET /api/v1/orders/sales`                                                                  |
| `/api/v1/listings/drafts*` variants                | `/api/v1/listing-drafts` and `/listing-drafts/current`                                      |
| Taxonomy child/attribute route variants            | `/api/v1/taxonomy/nodes/:id/children` and `/attributes`                                     |
| `/api/v1/real-estate/accounts/:id/recently-viewed` | `/api/v1/real-estate/recently-viewed`; caller derived from principal                        |
| Vertical-specific draft media endpoints            | Central two-phase `/api/v1/media/listings/uploads*` and `/media/private-documents/uploads*` |

All repository Web/mobile consumers were migrated before removal. Integration
tests assert that representative removed aliases and the unversioned shadow now
return 404. There are no active compatibility exceptions.

## Added implementations discovered by the audit

The consumer-to-router comparison found active client capabilities with no
backend operation. They are now implemented and documented:

- deterministic/server-side AI listing assistance and safety operations;
- Education organization member and location management;
- account-owned Immo recently viewed storage and operations;
- centralized public image and private document uploads;
- private document type, size, magic-byte, account ownership, bucket, and RLS
  boundaries.

Database support was added through migrations
`00043_real_estate_recently_viewed.sql` and
`00044_private_document_uploads.sql`.

## Deleted legacy and duplicate code

- Education `/courses` alias registration;
- the obsolete promotions boost/plan/apply/subscribe routes;
- messaging send and conversation-detail compatibility routes;
- user-addressed notifications and order collection routes;
- the obsolete monetization service and its duplicate unit test;
- dead vertical media URLs and manual promotion client calls;
- the backend's unversioned router fallback.

A route-order collision where `GET /orders/:id` shadowed the canonical
`/orders/purchases` and `/orders/sales` collections was also corrected. The
static contract audit now rejects any earlier dynamic route that shadows a
later route with the same method.

## Generated clients and runtime artifacts

| Artifact                                       | Purpose                                                                            |
| ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| `packages/contracts/src/generated/openapi.ts`  | Generated OpenAPI paths, operations, parameters, bodies, responses, and components |
| `packages/contracts/src/openapi.ts`            | Stable generated-contract exports and runtime-path conversion                      |
| `backend/src/generated/openapi-manifest.ts`    | Router registration and runtime parity metadata                                    |
| `backend/docs/generated/endpoint-inventory.md` | Auditable endpoint reference                                                       |
| `backend/docs/generated/openapi.html`          | Locally generated Redoc reference (`make openapi-docs`)                            |

Frontend and mobile HTTP foundations accept only generated OpenAPI runtime path
types. Client-specific adapters continue to map transport payloads into their
UI/native view models; they do not own endpoint definitions.

## Automated enforcement

- Redocly validates OpenAPI 3.1 structure and rules.
- `openapi-typescript --check` rejects stale generated client types.
- manifest and inventory checks reject stale committed output.
- static parity rejects undocumented routes, unimplemented operations,
  duplicate routes/operation IDs, route shadows, security/permission drift,
  missing standard responses, and banned legacy fragments.
- router startup repeats method/path and access parity checks.
- contract tests execute the static parity audit.
- integration tests cover authentication, authorization, caller-derived
  ownership, domain validation envelopes, successful responses, removed
  aliases, unversioned rejection, and critical marketplace flows.
- pull-request CI compares the current specification with the base ref and
  rejects undeclared removals; a removal needs prior `deprecated: true` and
  `x-sunset-at` metadata.

## Documentation updated

- root `AGENTS.md` (no nested `AGENTS.md` files exist in this repository);
- root `README.md`, `backend/README.md`, and `frontend/README.md`;
- `backend/docs/api.md`, `backend/docs/architecture.md`, and
  `backend/openapi/README.md`;
- `docs/architecture/openapi.md`, authentication, mobile, and Education
  architecture documents;
- Education implementation report and production release runbook;
- Makefile help, environment validation, and CI workflow.

Obsolete endpoint lists were replaced or corrected instead of retained beside
the generated inventory.

## Verification evidence

The final repository verification run recorded:

- canonical `make check`: passed end to end;
- `npm run openapi:check`: passed; 264 router + 3 operational operations;
- backend contract tests: 28 passed, including breaking-removal policy fixtures;
- backend integration tests: 54 passed;
- complete backend suite: 429 passed;
- frontend suite: 591 passed;
- mobile suite: 4 passed;
- shared contracts suite: 67 passed;
- backend, frontend, mobile, and contracts typechecks: passed;
- backend and frontend production builds: passed;
- migration ordering/content check: passed.
- focused critical suites: backend 265, frontend 82, shared finance/monetization
  25 assertions passed.

The canonical gates are `make openapi-check`, `make check`, and the pull-request
breaking-change job. Generated documentation is rebuilt with
`make openapi-docs`.

## Final compatibility state

There is one OpenAPI document, one active business major, no active legacy
alias, no undocumented router or operational endpoint, no duplicate operation
ID, no route shadow, and no remaining compatibility exception. Any future
compatibility layer must be explicit in the canonical contract with ownership,
deprecation metadata, a replacement, and a sunset date.
