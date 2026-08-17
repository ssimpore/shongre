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

## Getting Started & Makefile Automation

All backend operations can be executed directly from the monorepo root via `make` or inside `backend/`:

### 1. Environment & Setup
```bash
# Initialize backend/.env from .env.example
make backend-env

# Install all monorepo dependencies
make install
```

### 2. Development Server
```bash
# Start BOTH Frontend (:3000) and Backend (:4000) concurrently
make dev

# Start Backend API server only on port 4000 (with hot-reload and port-freeing)
make backend-dev
# or
make dev-backend
```

### 3. Testing & Benchmarking
```bash
# Run all backend Vitest tests
make backend-test

# Run specific backend test suites
make backend-test-unit         # Escrow, monetization, KYC, lifecycle
make backend-test-integration  # REST API HTTP routes & controllers
make backend-test-rls          # Supabase Row Level Security policies
make backend-test-security     # Boundary checks and secret isolation
make backend-test-watch        # Interactive Vitest watch mode

# Run computation & latency SLA benchmarks (<100µs SLA)
make backend-benchmark
```

### 4. Code Quality & Compilation
```bash
# Run TypeScript type checks (tsc --noEmit)
make backend-lint

# Build backend for production (tsc && tsc-alias)
make backend-build

# Clean backend build artifacts (dist/)
make backend-clean

# Full backend CI pipeline (lint + test + build + benchmark + boundary)
make backend-check
```

### 5. Database & Supabase Operations
```bash
# Validate and execute SQL migrations
make backend-db-migrate

# Seed database with canonical dataset
make backend-db-seed

# Generate TypeScript types from DB schema
make backend-db-types
```

### 6. Docker Containerization
```bash
# Build production Docker image (shongre-backend:latest)
make backend-docker-build

# Run backend container locally
make backend-docker-run
```

### 7. Information & Status
```bash
# Display backend status, endpoints and configuration
make backend-info
```
