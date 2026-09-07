# OpenAPI-first API architecture

## Authority and dependency direction

```text
backend/openapi/openapi.json
          │
          ├──▶ packages/contracts/src/generated/openapi.ts
          ├──▶ packages/contracts/src/generated/api-client.ts
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

The generated JSON operation functions in `@shongre/contracts/api-client`
accept a platform transport and infer input and output from generated OpenAPI
operations. Their serializer encodes path parameters, preserves false/zero
query values, and forwards cancellation. The generator rejects unsupported
query/body encodings instead of inventing a fallback. Redirect/pixel endpoints
and operational probes keep their dedicated transport behavior. Web and native
favorite reads/writes use these generated functions. Other existing adapters
continue to consume generated path and operation types; remaining opaque
`JsonValue` responses require domain-by-domain schema refinement.

The Web and mobile HTTP foundations accept only generated OpenAPI path types.
They still map transport data into client-specific view models at adapter
boundaries, which prevents database rows or backend implementation types from
leaking into UI components.

## Versioning and lifecycle

`/api/v1` is the sole active business API prefix. Additive evolution happens
within v1. Breaking changes require a new major or an announced deprecation
window. Operation removals are blocked unless the base contract already marks
the operation deprecated and supplies a valid `x-sunset-at` that has elapsed. All repository consumers
must migrate before a legacy operation is removed.

There are no active business-route compatibility aliases after this
consolidation. The operational `/api/health` and `/api/ready` names coexist with
the orchestrator-native `/livez` and `/readyz`, and `/health/live` and
`/health/ready`. These names share implementations and remain documented to
preserve deployed probes. A future business
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

## Generation and runtime documentation

`make api-generate` uses the existing openapi-typescript generator plus the
repository’s deterministic operation generator. `make api-check` checks spec,
source ownership, generated drift, contract compilation, and premature operation
removals when `OPENAPI_BASE_REF` is supplied. The comparison is not a complete
schema-compatibility analysis: request/response shape changes still require
review and consumer tests. An unreadable configured base fails the check.
`make api-export` produces an ignored
`backend/openapi/openapi.yaml` distribution artifact; JSON remains the sole
editable specification, and Git history supplies version snapshots.

`GET /api/openapi.json` and `GET /api/docs` are public operational routes. The
reference requires no remote JavaScript/CDN dependency. `make openapi-docs`
continues to build the fuller standalone Redoc artifact.

Errors retain the documented v1 `error` extension while adding RFC 9457-style
`type`, `title`, `status`, `code`, `detail` and request correlation. They remain
`application/json` for existing clients, with `private, no-store` caching.
The shape follows [Problem Details](https://www.rfc-editor.org/rfc/rfc9457.html);
a future media-type or extension removal requires explicit versioning.
