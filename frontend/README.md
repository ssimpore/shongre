# Shongre Frontend — Architecture & Developer Guide

The Shongre frontend is a Next.js App Router marketplace interface supporting both individual (_Particuliers_) and professional sellers (_Professionnels_).

It uses one HTTP service architecture connected to the environment-defined
Shongre backend URL. There is no browser fixture or data-mode fallback.

---

## 1. Architectural Flow

```text
Pages & Views (src/features/, src/app/)
               │
               ▼
       ViewModels & Hooks
               │
               ▼
   API & Service Contracts (src/api/contracts/)
               │
               │
               ▼
        HTTP Adapters
   (src/api/adapters/http/)
               │
               ▼
      Shongre Backend API
           & Supabase
```

`src/api/contracts/` owns UI-facing service/view-model interfaces, not a second
HTTP contract. The sole wire contract is
`backend/openapi/openapi.json`; HTTP adapters consume generated method/path
types from `@shongre/contracts/openapi` and map responses into those frontend
interfaces. New URLs or wire DTO registries must not be handwritten here.

The single consent-aware Web analytics SDK, provider mapping, sanitization,
identity lifecycle and local debug panel are documented in
[`docs/analytics.md`](docs/analytics.md).

---

## 2. Directory Structure

```text
frontend/
├── app/                          # Next server shell, metadata, robots, sitemap, manifest
├── src/
│   ├── api/                      # Service contracts, demo/http adapters, error normalizer
│   │   ├── contracts/            # UI-facing service and view-model interfaces
│   │   ├── adapters/demo/        # Deterministic simulation adapters (Promise<T>)
│   │   ├── adapters/http/        # Complete HTTP client adapters targeting /api/v1/*
│   │   ├── client/               # Environment-selected service registry
│   │   └── errors/               # Normalized AppError and localized messages
│   │
│   ├── app/                      # Router, root layouts, top-level providers
│   ├── configuration/            # Market configs, routes, plans & boosts, coordinates
│   ├── design-system/            # Compatibility entrypoints over shared packages + Web composites
│   ├── domains/                  # Pure business rules (Taxonomy, Escrow, KYC, Multi-market)
│   ├── features/                 # User-facing pages (Home, Search, Publish, Admin, Workspaces)
│   ├── mocks/                    # Deterministic baseline fixtures
│   ├── repositories/             # Data access contracts & in-memory caches
│   ├── security/                 # 13-role RBAC matrix, authorization & audit logging
│   ├── services/                 # Local persistence and Gemini AI assistant
│   └── types/                    # Canonical TypeScript declarations & domain models
```

---

## 3. Environment & Data Mode Configuration

Initialize the repository environment from the root:

```bash
make env
make dev       # connected API + local Supabase
make frontend  # API-only Web client (the configured API must be available)
```

The API request base URL is configured centrally in `src/api/client/api-client.config.ts`.
Deployment origins and `APP_ENV` come from the typed environment projection in
`src/platform/market/market-infrastructure.ts`. The Next server validates them
at container startup and injects a safe `window.__SHONGRE_RUNTIME_CONFIG__`
before application code. They are not compiled into the Docker image, so the
same digest is promoted through DEV, STAGING, and PRODUCTION. See
[`docs/architecture/environments.md`](../docs/architecture/environments.md).

## Brand assets

The Web app consumes only the generated runtime subset under
`public/brand/shongre/` plus the root favicon and Apple touch icon. Approved
artwork comes from the release selected by
`brand/shongre/brand.config.json`; do not add hand-copied logos to `public/` or
recreate the signature as text. Use
the generated `@shongre/brand/web` registry plus `BrandLogo`, `BrandIcon`, or
the separately sized `BrandHeaderSignature` lockup. Activate an approved release
with `npm run brand:activate -- vX.Y.Z`, or run `make brand-sync` after a reviewed
manual selector update, and verify with `make brand-check`. The complete
source kit remains private to the repository; see
[`docs/architecture/brand-assets.md`](../docs/architecture/brand-assets.md).

```env
# Backend API endpoint
NEXT_PUBLIC_API_URL=<environment-defined API origin and prefix>
```

Use `make dev` to run the Web client, backend, worker, and local Supabase stack.

The process environment is authoritative. Connected builds cannot be switched
to demo mode from browser storage or the UI.

---

## 4. Package-local scripts

From `/frontend`:

```bash
# Install dependencies
npm install

# Start local Next.js development server
npm run dev

# Run TypeScript typecheck and frontend architecture lint
npm run typecheck
npm run lint

# Run all Vitest tests
npm test

# Run Playwright through the root CLI and its isolated production server
cd ..
make test-e2e

# Build production bundle
cd frontend
npm run build

# Run end-to-end check (lint + test + build)
npm run check
```

---

## 5. Definition of Done

The package-local checks remain available for focused work, but every
contribution must finish with root `make check`. That gate validates formatting,
types and tests across all workspaces, migration ordering, Web/backend builds,
infrastructure configuration, tracked secrets, runtime hostname policy, and
frontend/backend boundaries.
Use `make test-critical` for the focused marketplace-integrity subset and
`make check-all` when browser or cross-platform behavior is affected.

The shared UI and token architecture is documented in
`docs/architecture/cross-platform-ui.md`. Run `make ui-check` after changing a
shared primitive and `make cross-platform-check` before merging it.

All frontend colour must use semantic utilities generated by
`@shongre/design-tokens` (for example `text-text-muted`, `bg-bg-surface`,
`bg-surface-inverse`, or `text-success`). Raw Tailwind palettes, literal colour
syntax, local colour variables, and `white`/`black`/named-orange utilities fail
`npm run check:tokens`; add or refine a semantic role in the canonical package
instead of bypassing it. The current application declares a light browser
colour scheme and uses explicit inverse roles for intentionally dark surfaces;
there is no separate user-selectable dark theme today.

The exact Shongre Orange swatch comes only from the active brand kit. Primary,
hover, active, disabled, focus, border, subtle-surface, inverse, and fill states
are generated by the package's private typed recipe. Frontend code must consume
those semantic roles and must not calculate or alias orange locally.
