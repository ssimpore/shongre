# Shongre — Marketplace & Escrow Platform

Shongre is a modern multi-category classifieds marketplace supporting both individual and verified professional sellers, featuring secure end-to-end transactions (full escrow deposit, in-person hand delivery with 6-digit PIN verification, tracked parcel delivery, live messaging with photo attachments, and Pro seller storefront management).

---

## 1. Current Project Status

- **Status**: **Frontend-Only**
- **Simulation Layer**: The application uses deterministic in-memory / LocalStorage repositories (`src/repositories/`) to model all platform flows, states, and user journeys.
- **Backend Readiness**: All UI components and pages communicate through strict repository interfaces (`IListingRepository`, `IUserRepository`, `ITransactionRepository`, `IMessagingRepository`). Future backend APIs (Node, Django, Go, Java) can replace these mock implementations without rewriting UI views.

---

## 2. Technology Stack

- **Framework**: React 19 (`react`, `react-dom`)
- **Language**: TypeScript 5.8 (Strict type checking with `tsc --noEmit`)
- **Routing**: React Router 7 (`react-router-dom`)
- **Build Tool & Dev Server**: Vite 6 (`vite`, `@vitejs/plugin-react`)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`, `tailwindcss`) + CSS Custom Properties
- **Icons**: Lucide React (`lucide-react`)
- **Maps**: Leaflet (`leaflet`, `@types/leaflet`)
- **AI Engine**: Google Gen AI SDK (`@google/genai`) with offline heuristic fallback
- **Test Runner**: Vitest 4 (`vitest`)
- **Automation & CLI**: Node.js CLI script (`frontend/bin/shongre.js`) and root `Makefile`

---

## 3. Repository Structure

Every frontend-specific source and configuration file lives under the `/frontend` directory, maintaining a clean boundary for future backend and infrastructure modules:

```text
shongre/
├── frontend/                     # Self-contained frontend application
│   ├── .env.example              # Frontend environment template (PORT=3000, VITE_*)
│   ├── bin/                      # CLI automation and CI checks (shongre.js)
│   ├── public/                   # Static assets
│   ├── src/                      # Frontend source code (pages, components, design system)
│   ├── index.html                # HTML entry point
│   ├── package.json              # Dependencies and scripts
│   ├── tsconfig.json             # TypeScript configuration
│   └── vite.config.ts            # Vite bundler configuration
├── backend/                      # Self-contained backend application
│   ├── .env.example              # Backend environment template (PORT=4000, Supabase, Stripe)
│   ├── src/                      # Backend API, domain modules, and infrastructure
│   ├── supabase/                 # Supabase migrations, edge functions, seed
│   ├── scripts/                  # Migrations, type generators, port freeing, boundary scan
│   ├── tests/                    # Vitest test suites (unit, integration, rls, security)
│   └── package.json              # Backend dependencies and scripts
├── Makefile                      # Monorepo unified command automation
├── README.md                     # Human-facing documentation and architecture guide
├── AGENTS.md                     # 150-rule AI agent operational engineering contract
└── .gitignore                    # Monorepo git ignore rules
```

---

## 4. Getting Started

### Prerequisites

- **Node.js**: `v20.x` or later (tested on Node.js `v22+`)
- **npm**: `v10.x` or later

### Installation & Development

#### Quick Start: Run Everything
```bash
# Clone the repository
git clone https://github.com/your-org/shongre.git
cd shongre

# Install dependencies across monorepo
make install

# Start BOTH Frontend (:3000) and Backend (:4000) concurrently
make dev
```

#### Targeted Development
```bash
# Start Frontend dev server only (:3000)
make frontend-dev

# Start Backend API server only (:4000)
make backend-dev
```

The frontend application will be accessible at `http://localhost:3000` and the backend API at `http://localhost:4000`.

---

## 5. Unified Command Matrix

All development tasks can be run directly via `make` from the monorepo root:

| Domain | Both (Frontend + Backend) | Frontend Only | Backend Only | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Dev Server** | `make dev` | `make frontend-dev` | `make backend-dev` | Starts dev server(s) with automatic port clearance. |
| **Port Cleanup** | `make free-port` | `make frontend-free-port` | `make backend-free-port` | Terminates processes on ports 3000/4000. |
| **Environment** | `make env` | `make frontend-env` | `make backend-env` | Initializes `.env` files from templates. |
| **Testing** | `make test` | `make frontend-test` | `make backend-test` | Executes Vitest test suites. |
| **Test Watch** | — | `make frontend-test-watch` | `make backend-test-watch` | Runs Vitest in interactive watch mode. |
| **Granular Tests**| — | — | `make backend-test-unit`<br>`make backend-test-integration`<br>`make backend-test-rls`<br>`make backend-test-security` | Targeted test execution. |
| **Benchmarks** | — | — | `make backend-benchmark` | Validates computation & latency SLA (<100µs). |
| **Type Check** | `make lint` | `make frontend-lint` | `make backend-lint` | TypeScript compiler type-check (`tsc --noEmit`). |
| **CI Quality** | `make check` | `make frontend-check` | `make backend-check` | Full quality pipeline (lint + test + build). |
| **Production** | `make build` | `make frontend-build` | `make backend-build` | Compiles production builds. |
| **Preview** | — | `make preview` | — | Locally previews frontend production build. |
| **Clean** | `make clean` | `make frontend-clean` | `make backend-clean` | Removes `dist/` build artifacts. |
| **Database** | — | — | `make db-migrate`<br>`make db-seed`<br>`make db-types` | Supabase migrations, seed and types. |
| **Docker** | — | — | `make backend-docker-build`<br>`make backend-docker-run` | Production container build and run. |
| **Diagnostics** | `make info` | `make frontend-info` | `make backend-info` | Environment information and status. |
| **AI Audit** | `make ai-test` | `make ai-test` | — | Runs Gemini AI & anti-fraud tests. |
| **CLI Help** | `make help` | `make cli` | — | Displays interactive CLI & make help manuals. |

---

## 6. Core Platform Architecture

### 6.1 Canonical Taxonomy (`src/domains/taxonomy/`)
- **Single Source of Truth**: All categories, subcategories, custom attribute schemas (e.g. `vehicle.mileage`, `phone.storage`, `realEstate.surface`), and condition schemes are defined exclusively in `taxonomy.data.ts`.
- **Consumers**: Publication wizard (`PublishWizard.tsx`), search filters (`SearchPage.tsx`), listing details (`ListingDetailPage.tsx`), and Gemini AI parser derive from this single tree.

### 6.2 Multi-Market Engine (`src/domains/market/`)
- **France (`FR`) as Reference**: France is the canonical market baseline.
- **Inheritance & Overrides**: Secondary markets (`BE`, `CH`, `LU`, `DE`, `ES`) inherit all French settings (protection fees, shipping limits, legal mentions) unless explicitly overridden via `marketResolver.getEffectiveMarketConfig(marketCode)`.

### 6.3 Transaction Engine & Escrow (`src/domains/transaction/`)
- **Direct Purchase (`DIRECT_PURCHASE`)**: Full escrow authorization $\to$ seller shipping / hand delivery $\to$ 6-digit PIN verification / buyer confirmation $\to$ fund release.
- **Reservation (`RESERVATION`)**: Down-payment escrow $\to$ on-site meeting $\to$ remainder payment in person.
- **Separation**: Direct Purchase and Reservation are distinct flows with dedicated capability resolvers.

### 6.4 13-Role RBAC Security Matrix (`src/security/`)
- **Granular Capabilities**: 27 permissions (`listing.publish.pro`, `escrow.override`, `moderation.ban`, `tax.vat.manage`, etc.) mapped across 13 platform roles (Guest, Individual, Pro, Certified Pro, Moderator, Support, Compliance, Finance, Admin, Super Admin...).
- **Route & Component Protection**: `<RequireAuth>`, `<RequireRole>`, `<RequirePermission>`, and `<Can>`.

### 6.5 Data Access Layer (`src/repositories/`)
- **Interface Segregation**: UI pages communicate strictly with `IListingRepository`, `IUserRepository`, `ITransactionRepository`, and `IMessagingRepository`.
- **Future API Replacement**: When a real backend API is connected, only the repository implementations need to be updated; no UI components or pages will require refactoring.

---

## 7. Future Backend Integration Strategy

The repository is structured so that introducing a backend (e.g. under `backend/` or an external API gateway) is an additive operation:

1. **Step 1**: Implement `ApiListingRepository`, `ApiUserRepository`, `ApiTransactionRepository`, `ApiMessagingRepository` conforming to existing repository interfaces.
2. **Step 2**: Provide HTTP client adapters mapping API responses into canonical domain models.
3. **Step 3**: Switch the repository injection in `src/repositories/` without changing feature pages or components.
