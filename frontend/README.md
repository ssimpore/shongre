# Shongre Frontend — Architecture & Developer Guide

> **Note**: The frontend is **intentionally not connected to `backend/` yet**.
> It operates with high-fidelity, deterministic **Demo Adapters** backed by local storage and state machines, allowing 100% of user and admin flows to be executed, tested, and demonstrated standalone without external services.

---

## 1. Architectural Overview

The Shongre frontend is architected around a strict decoupled contract layer:

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
Demo Adapters     HTTP Adapters (Future)
(src/api/adapters/demo/)   (src/api/adapters/http/)
      │                 │
      ▼                 ▼
Local Repositories   Shongre Backend API
& StorageService     & Supabase
```

---

## 2. Directory Structure

```text
frontend/
├── src/
│   ├── api/                      # Service contracts, demo/http adapters, error normalizer
│   │   ├── contracts/            # TypeScript interfaces for all 20 marketplace domains
│   │   ├── adapters/demo/        # Deterministic simulation adapters (Promise<T>)
│   │   ├── adapters/http/        # Inactive REST adapters prepared for future backend
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

## 3. Data Mode Configuration

The application runtime mode is configured centrally in `src/api/client/api-client.config.ts`:

```env
# Available modes: 'demo' (default) | 'api'
VITE_DATA_MODE=demo
VITE_API_URL=https://api.shongre.com/v1
```

### Switching to the Future Backend

When the real backend is ready:
1. Set `VITE_DATA_MODE=api` in `.env`.
2. Configure `VITE_API_URL`.
3. The `serviceRegistry` will automatically route calls through `src/api/adapters/http/` without modifying any UI component or page.

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

# Run all unit tests
npm test

# Build production bundle
npm run build

# Run end-to-end check
npm run check
```

---

## 5. Definition of Done (`make check`)

All contributions must pass the continuous verification pipeline:
1. `npm run lint` (`tsc --noEmit` — 0 type errors).
2. `npm test` (`vitest run` — 100% test suites passing).
3. `npm run build` (`vite build` — clean production bundle).
