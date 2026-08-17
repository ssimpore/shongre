# Shongre Backend Architecture Specification

## 1. System Overview

Shongre is an enterprise-grade C2C & B2C marketplace designed for European multi-market transactions with integrated Escrow protection, automated progressive KYC/KYB verification, AI safety screening, and structured taxonomy management.

```
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
                    │   Background Workers   │
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

## 2. Directory Separation & Monorepo Boundaries

1. **`backend/` Ownership**: 100% of server-side logic, database migrations, configuration, background jobs, external integrations, API routing, RLS policies, and tests reside in `backend/`.
2. **`frontend/` Isolation**: The frontend is a pure client interacting with the backend solely via typed HTTP contracts. Zero secrets, service roles, or database connections exist in the frontend.
3. **Multi-Market Engine**: France (`FR`) acts as the canonical base market. All foreign markets (`BE`, `CH`, `LU`, `DE`, `ES`) inherit defaults via `marketsService.getEffectiveMarketConfig()`.
4. **Escrow Workflows**:
   - `DIRECT_PURCHASE`: Full escrow hold (item + shipping + protection fee) with 4-digit PIN verification upon hand delivery.
   - `RESERVATION`: Down payment escrow hold with in-person balance settlement.
