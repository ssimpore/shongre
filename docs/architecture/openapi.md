# OpenAPI-first API architecture

## Authority and dependency direction

```text
backend/openapi/openapi.json
          │
          ├──▶ packages/contracts/src/generated/openapi.ts
          │          ├──▶ Web HTTP adapters
          │          └──▶ mobile HTTP services
          │
          ├──▶ backend/src/generated/openapi-manifest.ts
          │          └──▶ router boot/runtime enforcement
          │
          └──▶ endpoint inventory + Redoc API reference
```

The OpenAPI document is edited first. Generated artifacts flow outward from
it; they never flow back into the contract. Domain-facing frontend service
interfaces remain useful view-model boundaries, but they do not define HTTP
URLs or wire schemas. Backend modules implement business behavior while the
versioned router maps the canonical transport contract to those modules.

## Runtime parity

The generated backend manifest carries each operation's method, normalized
path, operation ID, access level, permission, required-body flag, success
status, and primitive query validation metadata. Router registration fails for
an operation absent from the contract or for an access mismatch. Router startup
also fails if a documented operation is missing. A static contract check gives
the same guarantee in CI without needing a live server.

The Web and mobile HTTP foundations accept only generated OpenAPI path types.
They still map transport data into client-specific view models at adapter
boundaries, which prevents database rows or backend implementation types from
leaking into UI components.

## Versioning and lifecycle

`/api/v1` is the sole active business API prefix. Additive evolution happens
within v1. Breaking changes require a new major or an announced deprecation
window. Operation removals are blocked unless the base contract already marks
the operation deprecated and supplies `x-sunset-at`. All repository consumers
must migrate before a legacy operation is removed.

There are no active compatibility aliases after this consolidation. A future
exception must appear in OpenAPI, identify its replacement, owner, and sunset,
and be covered by breaking-change checks.

## Security and transport rules

Every operation has an explicit public, authenticated, or permission-protected
access declaration. The authenticated principal owns identity; URLs and bodies
do not choose a caller. Common error responses, request IDs, bearer/cookie
schemes, upload phases, idempotency headers, and pagination parameters are
central components. Provider credentials, database rows, and internal fraud
data remain backend implementation details.

## Verification gates

`openapi:check` validates syntax/style, generated TypeScript freshness, runtime
manifest freshness, endpoint inventory freshness, exact implementation parity,
operation ID uniqueness, security metadata, error coverage, and banned legacy
fragments. Contract tests run the parity audit; integration tests exercise
authentication, authorization, validation, canonical success paths, standard
errors, removed aliases, and unversioned-route rejection. CI performs the same
checks and a base-branch breaking-change comparison.

Developer commands and detailed contribution rules are in
[`backend/docs/api.md`](../../backend/docs/api.md).
