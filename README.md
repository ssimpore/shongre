# Shongre — Marketplace & Escrow Platform

Shongre is a multi-market classifieds and transactional escrow marketplace supporting both individual (*Particuliers*) and verified professional sellers (*Professionnels*), featuring secure end-to-end transactions (full escrow deposit, hand delivery with PIN verification, parcel delivery, live messaging with attachments, and Pro seller storefront management).

---

## 1. Dual-Mode Architecture & Execution Matrix

Shongre permanently supports switching between a fully deterministic **Demo environment** and a live **PostgreSQL / Supabase HTTP API environment** through centralized configuration.

```text
┌─────────────────────────────────────────────────────────────┐
│                          FRONTEND                           │
│                                                             │
│  VITE_DATA_MODE=demo                 VITE_DATA_MODE=api     │
│         │                                    │              │
│         ▼                                    ▼              │
│    Demo Adapters                       HTTP Adapters        │
│   (Local Fixtures)                     (API Client)         │
└──────────────────────────────────────────────┬──────────────┘
                                               │
                                       HTTP /api/v1/*
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────┐
│                           BACKEND                           │
│                                                             │
│                   Domain & Application Services             │
│                 (Listings, Auth, Orders, Escrow...)         │
│                                │                            │
│                       Repository Interfaces                 │
│                                │                            │
│      ┌─────────────────────────┴─────────────────────────┐  │
│      ▼                                                   ▼  │
│  Demo Repositories                            Postgres Repos│
│  (In-Memory Store)                            (Supabase/PG) │
│      │                                                   │  │
│  BACKEND_DATA_MODE=demo                  BACKEND_DATA_MODE= │
│                                                   database  │
└──────────────────────────────────────────────────┬──────────┘
                                                   │
                                                   ▼
                                           Supabase / Postgres
```

### Supported Execution Modes

| Mode | Frontend (`VITE_DATA_MODE`) | Backend (`BACKEND_DATA_MODE`) | External Services | Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **Mode A** | `demo` | *Not required* | None | Standalone UI development & deterministic browser testing |
| **Mode B** | `api` | `demo` | Backend API (:4000) | Full-stack HTTP contract testing without database |
| **Mode C** | `api` | `database` | Supabase Local / Docker | Complete local development against PostgreSQL |
| **Mode D** | `api` | `database` | Supabase Cloud | Staging & Production deployment |

---

## 2. Technology Stack

- **Frontend**: React 19 (`react`, `react-dom`), TypeScript 5.8, React Router 7 (`react-router-dom`), Vite 6, Tailwind CSS v4, Lucide Icons, Leaflet, Vitest 4
- **Backend**: Node.js 22+ ESM, TypeScript 5.8, PostgreSQL 15, Supabase (`@supabase/supabase-js`), Stripe (`stripe`), Google Gen AI (`@google/genai`), Vitest 3
- **DevOps & Automation**: Root `Makefile`, CLI helper (`frontend/bin/shongre.js`), boundary scanner (`check-boundary.js`)

---

## 3. Quick Start

### Prerequisites
- **Node.js**: `v20.x` or later (recommended: `v22+`)
- **npm**: `v10.x` or later

### Install Dependencies
```bash
make install
```

### Run Full Stack
```bash
# Start BOTH Frontend (:3000) and Backend (:4000) concurrently in default mode
make dev

# Run Frontend in API mode against Backend in Demo mode
make dev-api-demo

# Run Frontend in API mode against Backend in PostgreSQL mode
make dev-db
```

### Run Tests & Quality CI
```bash
# Run all frontend and backend tests
make test

# Run repository contract tests across dual modes
make test-contracts

# Run full CI quality check (lint + test + build + boundary scan)
make check
```

---

## 4. Repository Structure

```text
shongre/
├── frontend/                     # Self-contained frontend application
│   ├── .env.example              # Frontend environment template (VITE_DATA_MODE, VITE_API_URL)
│   ├── bin/                      # CLI automation and CI checks (shongre.js)
│   ├── src/
│   │   ├── api/
│   │   │   ├── adapters/         # Demo and HTTP service adapters
│   │   │   ├── client/           # Service registry and API configuration
│   │   │   ├── contracts/        # Typed public API service contracts
│   │   │   └── errors/           # Normalized AppError and user messages
│   │   ├── app/                  # Routing, layouts, and providers
│   │   ├── domains/              # Domain logic (marketplace, taxonomy, escrow)
│   │   ├── features/             # Feature UI views and pages
│   │   └── design-system/        # Reusable UI primitives and design tokens
│   └── package.json
├── backend/                      # Self-contained backend application
│   ├── .env.example              # Backend environment template (BACKEND_DATA_MODE, Supabase, Stripe)
│   ├── src/
│   │   ├── api/v1/               # REST API HTTP router and handlers
│   │   ├── app/                  # Bootstrap, server, and central config
│   │   ├── infrastructure/
│   │   │   ├── database/         # Repositories (I*, Demo*, Postgres*) and DB clients
│   │   │   ├── logging/          # Structured logger
│   │   │   ├── payments/         # Stripe adapter
│   │   │   ├── search/           # Postgres full-text search provider
│   │   │   └── supabase/         # Supabase client singleton
│   │   ├── integrations/         # External provider abstractions (Stripe, KYC, SIRET, Gemini AI)
│   │   ├── modules/              # Domain services (listings, auth, orders, escrow...)
│   │   └── shared/               # Shared domain types, RBAC permissions, escrow helpers
│   ├── supabase/                 # Supabase SQL migrations, RLS policies, seed
│   ├── tests/                    # Unit, contract, integration, RLS, and boundary tests
│   └── package.json
├── Makefile                      # Monorepo unified automation
├── AGENTS.md                     # Engineering rules and architecture boundaries
└── README.md
```

---

## 5. Security & Boundary Guarantees

- **Authenticated API**: Every `/api/v1` route declares an access rule (`PUBLIC`, `AUTHENTICATED`, or a required permission). Identity is resolved per request from a signed `Authorization: Bearer` token — never from a path parameter or request body. See AGENTS.md §151.
- **Password storage**: scrypt (`node:crypto`), salted per account, in a dedicated `user_credentials` table that is never exposed to clients. Login is constant-time and does not reveal whether an account exists.
- **Least privilege**: Roles map to permissions through `shared/auth/rbac.ts`. Registration cannot claim staff roles, and a session can only switch to roles the account actually holds.
- **Webhook authenticity**: Stripe webhooks are verified against `STRIPE_WEBHOOK_SECRET` (HMAC-SHA256 over the raw body, with a replay window). Unsigned events are rejected.
- **Zero Secret Leakage**: The frontend bundle never imports backend implementations or sensitive environment variables (`SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, Stripe secret keys). Verified automatically via `make check-boundary`.
- **Relational Integrity & RLS**: All Supabase business tables are secured with Row Level Security (RLS) policies and PostgreSQL constraints.
- **Contract Equivalence**: Frontend consumes typed service contracts (`ListingsServiceContract`, `OrdersServiceContract`, etc.) without branching conditionals in UI components.

### Required configuration

| Variable | Where | Notes |
| :--- | :--- | :--- |
| `JWT_SECRET` | backend | **Required in production.** The server refuses to boot if unset, shorter than 32 chars, or still a placeholder. Generate with `openssl rand -base64 48`. |
| `AUTH_TOKEN_TTL_SECONDS` | backend | Session lifetime, default `43200` (12h). |
| `STRIPE_WEBHOOK_SECRET` | backend | Required for the Stripe webhook endpoint to accept anything. |
| `DEMO_ACCOUNT_PASSWORD` | backend | Password for seeded demo personas. Never seeded in production. |
| `VITE_DATA_MODE` | frontend | **Must be set explicitly to build** (`api` or `demo`); the build fails otherwise. |

### Demo credentials

In non-production environments the canonical personas are seeded with the
password `ShongreDemo2024!` (override via `DEMO_ACCOUNT_PASSWORD`):

| Account | Role |
| :--- | :--- |
| `thomas.laurent@example.fr` | individual buyer |
| `camille.martin@example.fr` | individual seller |
| `admin@shongre.com` | admin |
