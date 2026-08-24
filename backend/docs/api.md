# Shongre API contract

Shongre has one authoritative HTTP contract:
[`backend/openapi/openapi.json`](../openapi/openapi.json). It is an OpenAPI
3.1 document and is the source for routes, security declarations, request and
response shapes, generated TypeScript, runtime route metadata, and API
reference documentation. This page is a workflow guide, not a second endpoint
catalog.

The versioned business API is rooted at `/api/v1`. The unversioned `/health`,
`/livez`, and `/readyz` operational probes are also documented in the same
specification with operation-level server overrides. The generated, exhaustive
inventory is [`generated/endpoint-inventory.md`](generated/endpoint-inventory.md).

## Change workflow

1. Edit `backend/openapi/openapi.json` first. Reuse schemas, parameters,
   responses, and security schemes from `components`.
2. Assign a unique `operationId`, explicit `security`, `x-shongre-access`, and,
   for permission-protected operations, `x-shongre-permission`.
3. Run `make openapi-generate` to regenerate the shared TypeScript paths,
   backend runtime manifest, and endpoint inventory.
4. Implement the route in `backend/src/api/v1/router.ts`. The router refuses to
   boot if its method, path, access rule, or permission diverges from OpenAPI.
5. Consume it through a Web or mobile HTTP adapter. Import path types from
   `@shongre/contracts/openapi`; do not duplicate endpoint unions or wire DTOs.
6. Add contract and integration coverage, then run `make openapi-check` and the
   relevant workspace tests.

Generated files are read-only:

- `packages/contracts/src/generated/openapi.ts`
- `backend/src/generated/openapi-manifest.ts`
- `backend/docs/generated/endpoint-inventory.md`

## Commands and enforcement

```bash
make openapi-lint             # OpenAPI structural/style validation
make openapi-generate         # regenerate all committed artifacts
make openapi-check            # lint + stale output + route/spec parity
make openapi-docs             # standalone Redoc HTML reference
OPENAPI_BASE_REF=origin/main make openapi-breaking-check
```

`make lint`, `make check`, and CI include `openapi-check`. Pull requests also
compare the specification with the base branch. CI fails for an undocumented
route, documented-but-unimplemented route, duplicate route or operation ID,
stale generated artifact, missing access declaration, reintroduced legacy
alias, or undeclared operation removal.

## Compatibility and versions

Additive changes remain in `/api/v1`. Removing or changing an established
request/response requires either a new major prefix or a staged deprecation.
A staged removal must set `deprecated: true` and `x-sunset-at` in a released
contract, publish a migration path, migrate all repository consumers, and only
then remove the operation. Compatibility aliases are exceptional, time-boxed,
documented in OpenAPI, and have an owner and sunset date.

The API prefix is fixed at `/api/v1`; it is not a deploy-time variation. The
OpenAPI `info.version` uses semantic versions for contract releases while the
URL major communicates wire compatibility.

## Cross-cutting conventions

- Browser authentication uses secure HttpOnly cookies; native clients use the
  bearer scheme. Every operation declares its accepted security explicitly.
- Authorization derives ownership from the authenticated principal. Owner IDs
  are not accepted in collection URLs such as notifications and purchases.
- Errors use the shared `ErrorResponse` envelope and a request correlation ID.
- Monetary amounts use integer minor units plus ISO currency codes.
- Collection operations declare cursor or page semantics in OpenAPI rather
  than assuming all records are in memory.
- Mutations that can create money, orders, uploads, or subscriptions declare an
  idempotency key when replay safety is required.
- Public listing images and private verification documents use the documented
  two-phase upload operations. Private documents never use public buckets.

## Ownership

The backend API owners maintain the canonical specification and implementation.
Domain owners maintain their schemas and tests inside that contract. Web,
mobile, admin, and integration owners consume generated contract artifacts and
must not introduce another OpenAPI file or handwritten endpoint registry.
