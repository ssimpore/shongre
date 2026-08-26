# Shongre Frontend — Architecture & Developer Guide

The Shongre frontend is a Next.js App Router marketplace interface supporting both individual (_Particuliers_) and professional sellers (_Professionnels_).

It features a dual-mode service architecture that allows running either:

1. **Standalone Demo Mode** (`NEXT_PUBLIC_DATA_MODE=demo`): Fully deterministic, in-memory local fixtures, no backend or database required.
2. **Live HTTP API Mode** (`NEXT_PUBLIC_DATA_MODE=api`): Connects over HTTP REST to the environment-defined backend URL.

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
      ┌────────┴────────┐
      ▼                 ▼
Demo Adapters     HTTP Adapters
(src/api/adapters/demo/)   (src/api/adapters/http/)
      │                 │
      ▼                 ▼
Deterministic Fixtures  Shongre Backend API
& StorageService        & Supabase
```

`src/api/contracts/` owns UI-facing service/view-model interfaces, not a second
HTTP contract. The sole wire contract is
`backend/openapi/openapi.json`; HTTP adapters consume generated method/path
types from `@shongre/contracts/openapi` and map responses into those frontend
interfaces. New URLs or wire DTO registries must not be handwritten here.

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
│   │   ├── client/               # Service registry & DATA_MODE toggle
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
make frontend
```

The data mode is configured centrally in `src/api/client/api-client.config.ts`.
Deployment origins and `APP_ENV` come from the typed environment projection in
`src/platform/market/market-infrastructure.ts`. The Next server validates them
at container startup and injects a safe `window.__SHONGRE_RUNTIME_CONFIG__`
before application code. They are not compiled into the Docker image, so the
same digest is promoted through DEV, STAGING, and PRODUCTION. See
[`docs/architecture/environments.md`](../docs/architecture/environments.md).

```env
# Central Data Mode: "demo" (default) | "api"
NEXT_PUBLIC_DATA_MODE=demo

# Backend API Endpoint (Used when NEXT_PUBLIC_DATA_MODE=api)
NEXT_PUBLIC_API_URL=<environment-defined API origin and prefix>
```

### Switching Modes

- **Demo Mode**: `NEXT_PUBLIC_DATA_MODE=demo` — runs entirely in-browser, no backend required.
- **API Mode**: `NEXT_PUBLIC_DATA_MODE=api` — calls backend REST API over HTTP with request IDs and token transport.

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
