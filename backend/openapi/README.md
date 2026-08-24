# Canonical OpenAPI source

`openapi.json` is the only authoritative Shongre HTTP contract. No generated
artifact, frontend service interface, router declaration, mobile client, or
Markdown endpoint list may compete with it.

The document uses OpenAPI 3.1. Business operations are relative to `/api/v1`.
Operational probes use per-operation root servers but remain in this same
contract. Shared headers, security schemes, errors, and schemas live under
`components`.

Run from the repository root:

```bash
npm run openapi:lint
npm run openapi:generate
npm run openapi:check
npm run openapi:docs
```

See [`backend/docs/api.md`](../docs/api.md) for the change, versioning,
deprecation, generation, and CI policies. Do not edit generated output.
