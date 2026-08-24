# Shongre Frontend Architecture Specification

## 1. System Overview

The Shongre frontend is a Next.js App Router application built with React 19 and TypeScript. The server-rendered app shell owns metadata, structured data, robots, sitemap, and the manifest. The mature marketplace UI is mounted behind one client boundary while routes are migrated incrementally to Server Components. It operates in two independent data modes:

- **Standalone Demo Mode** (`NEXT_PUBLIC_DATA_MODE=demo`): Operates with deterministic local service adapters and state stores. Backend is completely optional and does not need to run.
- **Live HTTP API Mode** (`NEXT_PUBLIC_DATA_MODE=api`): Connects over REST HTTP to the Shongre backend API (`/api/v1/*`), with structured error handling, auth token management, and request tracing.

The live wire contract is not declared by these service interfaces. Its only
source is `backend/openapi/openapi.json`; `@shongre/contracts/openapi` provides
generated route and operation types to every HTTP adapter. Frontend service
contracts remain mappings for UI-oriented view models.

```text
┌─────────────────────────────────────────────────────────────┐
│                          FRONTEND                           │
│                                                             │
│ NEXT_PUBLIC_DATA_MODE=demo      NEXT_PUBLIC_DATA_MODE=api  │
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
│                      Node.js / Express                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Service Layer & Registry (`src/api/`)

All UI components and viewmodels communicate with domain services via typed contracts in `src/api/contracts/`.

### 2.1 Contracts

- `ListingsServiceContract`
- `SearchServiceContract`
- `AuthServiceContract`
- `MarketsServiceContract`
- `TaxonomyServiceContract`
- `MessagingServiceContract`
- `NotificationsServiceContract`
- `OrdersServiceContract`
- `PaymentsServiceContract`
- `PromotionsServiceContract`
- `VerificationServiceContract`
- `WorkspaceServiceContract`
- `AdminServiceContract`
- `ReviewsServiceContract`

### 2.2 Service Registry (`src/api/client/service-registry.ts`)

The `services` registry dispatches each contract to either its `demo` adapter or its `http` adapter based on `apiClientConfig.dataMode`.

---

## 3. Strict Boundary & Security Rules

- No server secrets (`SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, Stripe secret keys) may ever enter frontend source files.
- UI code is free of `if (isDemoMode)` branches.
- Errors are mapped to normalized `AppError` instances with localized user-facing messages.
