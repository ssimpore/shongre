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
│   ├── bin/                      # CLI automation and CI checks (shongre.js)
│   ├── public/                   # Static assets
│   ├── src/
│   │   ├── app/                  # Application composition, router (AppRouter), layouts, providers
│   │   ├── components/           # Cross-domain shared components (ListingCard, PriceDisplay...)
│   │   ├── configuration/        # Plans, visibility boost options, and market configurations
│   │   ├── design-system/        # Source of visual truth: tokens and UI primitives
│   │   ├── domains/              # Pure business rules, canonical state machines and resolvers
│   │   │   ├── fulfillment/      # Delivery methods, carrier quotes & handover resolvers
│   │   │   ├── listing/          # Listing display attributes & condition resolvers
│   │   │   ├── market/           # Multi-market engine (France canonical, BE/CH/LU/DE/ES overrides)
│   │   │   ├── publication/      # Dynamic category attributes schema & form engine
│   │   │   ├── taxonomy/         # Canonical taxonomy tree, attributes & condition schemes
│   │   │   ├── transaction/      # Escrow calculation, verification PIN & dispute engine
│   │   │   └── user/             # SIRET verification, seller capabilities & role helpers
│   │   ├── features/             # User-facing capability modules (search, publish, auth, admin...)
│   │   ├── mocks/                # Deterministic demo fixtures (users, listings, messages...)
│   │   ├── repositories/         # Data-access contracts (IListingRepository, IUserRepository...)
│   │   ├── security/             # 13-role RBAC matrix, audit logger & route guards
│   │   ├── services/             # Storage service & Gemini AI listing assistant
│   │   ├── types/                # Canonical TypeScript declarations & domain models
│   │   ├── utilities/            # Formatters, currency & date helpers
│   │   ├── index.css             # Tailwind v4 theme & CSS design tokens
│   │   └── main.tsx              # Application bootstrap
│   ├── index.html                # HTML entry point
│   ├── package.json              # Dependencies and scripts
│   ├── tsconfig.json             # TypeScript configuration
│   └── vite.config.ts            # Vite bundler configuration
├── Makefile                      # Root convenience command automation
├── README.md                     # Human-facing documentation and architecture guide
├── AGENTS.md                     # AI agent operational contract and rules
└── .gitignore                    # Root ignore rules
```

---

## 4. Getting Started

### Prerequisites

- **Node.js**: `v20.x` or later (tested on Node.js `v22+`)
- **npm**: `v10.x` or later

### Installation & Development

#### Option A: Using the Root `Makefile` (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-org/shongre.git
cd shongre

# Install dependencies
make install

# Start local development server (defaults to port 3000)
make dev
```

#### Option B: Directly inside `/frontend`

```bash
cd shongre/frontend
npm install
npm run dev
```

The application will be accessible at `http://localhost:3000`.

---

## 5. Available Commands

| Command (Root Makefile) | Command (`frontend/`) | Description |
| :--- | :--- | :--- |
| `make dev` | `npm run dev` | Starts Vite development server on port 3000 (auto-frees busy ports). |
| `make test` | `npm test` | Executes Vitest unit test suite (Escrow, RBAC, AI, Market, Taxonomy). |
| `make test-watch` | `npx vitest` | Runs Vitest in interactive watch mode. |
| `make lint` | `npm run lint` | Runs TypeScript compiler type-check (`tsc --noEmit`). |
| `make build` | `npm run build` | Compiles optimized production bundle with chunk splitting. |
| `make preview` | `npm run preview` | Locally previews the production build. |
| `make check` | `npm run check` | Executes full CI quality pipeline (**lint** $\to$ **test** $\to$ **build**). |
| `make clean` | `npm run clean` | Removes `dist/` build artifacts and cache. |
| `make ai-test` | `node bin/shongre.js ai-test` | Tests Gemini AI assistant and anti-fraud heuristic validation. |
| `make info` | `node bin/shongre.js info` | Displays platform environment, versions, and configuration status. |
| `make free-port` | `node bin/shongre.js free-port`| Terminates lingering processes occupying the configured port. |
| `make cli` | `node bin/shongre.js help` | Displays the interactive Shongre Node.js CLI manual. |

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
