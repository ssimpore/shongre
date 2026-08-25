# Shongre Backend Architecture Specification

## 1. System Overview

Shongre is an enterprise-grade C2C & B2C marketplace designed for European multi-market transactions with integrated Escrow protection, automated progressive KYC/KYB verification, AI safety screening, structured taxonomy management, and full dual-mode support (deterministic demo vs live PostgreSQL).

```text
                    ┌────────────────────────┐
                    │       FRONTEND/        │
                    │   React 19 / Vite SPA  │
                    └───────────┬────────────┘
                                │ HTTP / REST contracts
                                ▼
                    ┌────────────────────────┐
                    │        BACKEND/        │
                    │   Node.js / TypeScript │
                    │   REST API (/api/v1)   │
                    │   Domain Modules       │
                    │   Repository Layer     │
                    │   Provider Layer       │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │        SUPABASE        │
                    │   PostgreSQL 15        │
                    │   Row-Level Security   │
                    │   Triggers & FTS       │
                    │   Edge Functions       │
                    └────────────────────────┘
```

---

## 2. Dual-Mode Repository & Provider Architecture

### 2.0 OpenAPI transport boundary

`backend/openapi/openapi.json` is the only HTTP contract. The router implements
its generated runtime manifest, while Web and mobile consume generated path and
operation types from `@shongre/contracts/openapi`. Domain services do not own
URLs, and repository/database models are never exported as the wire contract.
See [`../docs/api.md`](api.md) and
[`../../docs/architecture/openapi.md`](../../docs/architecture/openapi.md).

### 2.0.2 Country and domain boundary

The API resolves a market from `X-Shongre-Market`, the full referrer URL and
explicit request fields, then rejects any mismatch. The header selects data
scope; it never grants authorization. Country routing, canonical public URLs,
cross-domain session handoff, shared taxonomy and per-market availability are
defined in
[`../../docs/architecture/multi-country.md`](../../docs/architecture/multi-country.md).

### 2.0.1 CRM bounded domain

CRM reuses the repository, OpenAPI, authorization and shared Provider Platform
boundaries described here. It never imports vertical business models or vendor
SDKs into CRM Core. The domain model, tenant/RLS rules, current implementation
status and release gates are documented in
[`crm-platform.md`](crm-platform.md).

### 2.1 Central Configuration (`BACKEND_DATA_MODE`)

- `BACKEND_DATA_MODE=demo` (Default): Domain services consume `Demo*Repository` implementations backed by deterministic in-memory collections.
- `BACKEND_DATA_MODE=database`: Domain services consume `Postgres*Repository` implementations querying PostgreSQL tables via Supabase clients with typed schema rows.

### 2.2 Repository Container (`src/infrastructure/database/repositories/`)

- `IUserRepository` $\to$ `DemoUserRepository` / `PostgresUserRepository`
- `IListingRepository` $\to$ `DemoListingRepository` / `PostgresListingRepository`
- `IMarketRepository` $\to$ `DemoMarketRepository` / `PostgresMarketRepository`
- `ITaxonomyRepository` $\to$ `DemoTaxonomyRepository` / `PostgresTaxonomyRepository`
- `IOrderRepository` $\to$ `DemoOrderRepository` / `PostgresOrderRepository`
- `IMonetizationRepository` $\to$ `DemoMonetizationRepository` / `PostgresMonetizationRepository`
- `IVerificationRepository` $\to$ `DemoVerificationRepository` / `PostgresVerificationRepository`
- `IMessagingRepository` $\to$ `DemoMessagingRepository` / `PostgresMessagingRepository`
- `INotificationRepository` $\to$ `DemoNotificationRepository` / `PostgresNotificationRepository`
- `IReviewRepository` $\to$ `DemoReviewRepository` / `PostgresReviewRepository`
- `IAdminRepository` $\to$ `DemoAdminRepository` / `PostgresAdminRepository`
- `IWorkspaceRepository` $\to$ `DemoWorkspaceRepository` / `PostgresWorkspaceRepository`

### 2.3 Provider Abstraction Layer (`src/integrations/providers/`)

- `IPaymentProvider` $\to$ `DemoPaymentProvider` / `StripePaymentProvider`
- `IKYCProvider` $\to$ `DemoKYCProvider` / `LiveKYCProvider`
- `IBusinessRegistryProvider` $\to$ `DemoBusinessRegistryProvider` / `SiretBusinessRegistryProvider`
- `IAIProvider` $\to$ `DemoAIProvider` / `GeminiAIProvider`

---

## 3. Directory Separation & Monorepo Boundaries

1. **`backend/` Ownership**: 100% of server-side logic, database migrations, configuration, background jobs, external integrations, API routing, RLS policies, and tests reside in `backend/`.
2. **`frontend/` Isolation**: The frontend is a pure client interacting with the backend solely via typed HTTP contracts. Zero secrets, service roles, or database connections exist in the frontend.
3. **Multi-Market Engine**: France (`FR`) acts as the canonical base market. All foreign markets (`BE`, `CH`, `LU`, `DE`, `ES`) inherit defaults via `marketsService.getEffectiveMarketConfig()`.
4. **Escrow Workflows**:
   - `DIRECT_PURCHASE`: Full escrow hold (item + shipping + protection fee) with 4-digit PIN verification upon hand delivery.
   - `RESERVATION`: Down payment escrow hold with in-person balance settlement.
