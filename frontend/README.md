# Shongre Frontend — Architecture & Developer Guide

The Shongre frontend is a Next.js App Router marketplace interface supporting both individual (*Particuliers*) and professional sellers (*Professionnels*).

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

---

## 2. Directory Structure

```text
frontend/
├── app/                          # Next server shell, metadata, robots, sitemap, manifest
├── src/
│   ├── api/                      # Service contracts, demo/http adapters, error normalizer
│   │   ├── contracts/            # TypeScript interfaces for all marketplace domains
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
make env-init
```

The application runtime mode is configured centrally in `src/api/client/api-client.config.ts` and `frontend/.env`:

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

## 4. Available Scripts

From `/frontend`:

```bash
# Install dependencies
npm install

# Start local Next.js development server
npm run dev

# Run TypeScript typecheck
npm run lint

# Run all Vitest tests
npm test

# Build production bundle
npm run build

# Run end-to-end check (lint + test + build)
npm run check
```

---

## 5. Definition of Done (`make check`)

All contributions must pass the continuous verification pipeline:
1. `npm run lint` (`tsc --noEmit` — 0 type errors).
2. `npm test` (`vitest run` — 100% test suites passing).
3. `npm run build` (`next build` — server metadata and production bundle).
4. `make check-boundary` (0 server secrets leaked into frontend).

The shared UI and token architecture is documented in
`docs/architecture/cross-platform-ui.md`. Run `make ui-check` after changing a
shared primitive and `make cross-platform-check` before merging it.
