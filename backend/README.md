# Shongre Backend Architecture

This directory (`backend/`) contains 100% of the server-side code, database migrations, Supabase configurations, background jobs, external integrations, API route handlers, domain services, security policies, and testing suites for the Shongre Marketplace & Escrow platform.

---

## Directory Overview

```text
backend/
├── src/
│   ├── app/            # Application configuration, bootstrap lifecycle, and HTTP server
│   ├── api/v1/         # Versioned REST API route handlers
│   ├── modules/        # Domain business logic (Listings, Escrow, KYC, Monetization, etc.)
│   ├── infrastructure/ # Low-level clients (PostgreSQL, Supabase, Storage, Search, Logger)
│   ├── integrations/   # External service adapters (Stripe, Gemini AI, SIRENE, KYC, Resend)
│   ├── shared/         # Common error classes, money calculations, RBAC and DTO types
│   └── workers/        # Asynchronous job runners (Lifecycle cleanup, Notifications, AI screening)
├── supabase/
│   ├── config.toml     # Supabase project configuration
│   ├── migrations/     # Canonical SQL migrations (00001 to 00005)
│   ├── functions/      # Supabase Edge Functions (Stripe, Escrow, AI Moderation, Expiry)
│   ├── seed/           # Seed SQL data
│   ├── policies/       # Row Level Security documentation
│   └── tests/          # SQL RLS tests
├── scripts/            # Database migration, seed, type generation, and boundary checks
├── tests/              # Vitest test suites (Unit, Integration, RLS, Security)
├── docs/               # Architecture, Database, API, and Security technical specifications
└── generated/          # Database type declarations generated from schema
```

---

## Getting Started

### 1. Install Dependencies
From the repository root or within `backend/`:
```bash
make install
# or
cd backend && npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env` and fill in secrets:
```bash
cp .env.example .env
```

### 3. Run Backend in Development Mode
```bash
make dev-backend
# or
cd backend && npm run dev
```

### 4. Run Test Suites
```bash
make backend-test
# or
cd backend && npm test
```

### 5. Validate Boundary Integrity
```bash
make check-boundary
```
