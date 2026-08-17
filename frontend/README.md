# Shongre Frontend — Architecture & Developer Guide

The Shongre frontend is a multi-market, multi-category marketplace interface supporting both individual (*Particuliers*) and professional sellers (*Professionnels*).

It features a dual-mode service architecture that allows running either:
1. **Standalone Demo Mode** (`VITE_DATA_MODE=demo`): Fully deterministic, in-memory local fixtures, no backend or database required.
2. **Live HTTP API Mode** (`VITE_DATA_MODE=api`): Connects over HTTP REST to `backend/` (`http://localhost:4000/api/v1` or staging/production API).

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
│   ├── design-system/            # Tokens, primitives (Button, Modal, ListingCard, FormField...)
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

Create `frontend/.env` from template:
```bash
cp frontend/.env.example frontend/.env
# or via make from monorepo root:
make frontend-env
```

The application runtime mode is configured centrally in `src/api/client/api-client.config.ts` and `frontend/.env`:

```env
# Server Port
PORT=3000

# Central Data Mode: "demo" (default) | "api"
VITE_DATA_MODE=demo

# Backend API Endpoint (Used when VITE_DATA_MODE=api)
VITE_API_URL=http://localhost:4000/api/v1
```

### Switching Modes

- **Demo Mode**: `VITE_DATA_MODE=demo` — runs entirely in-browser, no backend required.
- **API Mode**: `VITE_DATA_MODE=api` — calls backend REST API over HTTP with request IDs and token transport.

---

## 4. Available Scripts

From `/frontend`:

```bash
# Install dependencies
npm install

# Start local Vite development server
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
3. `npm run build` (`vite build` — clean production bundle).
4. `make check-boundary` (0 server secrets leaked into frontend).
