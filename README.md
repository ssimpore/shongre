# Shongre

Authentication architecture, provider-console setup, session lifecycle and
rollout instructions are documented in
[`docs/architecture/authentication.md`](docs/architecture/authentication.md).

Shongre is a multi-market classifieds and transactional marketplace for individual and professional sellers. The repository contains a Next.js Web application, a modular Node.js backend, and one Expo/React Native mobile application for iOS and Android.

## Architecture

```text
Web users ───────▶ frontend/ ──┐
                               ├── typed public contracts ──▶ backend/ ──▶ PostgreSQL / Supabase
Mobile users ───▶ mobile/ ─────┘
                     │
                     ├── Expo source in app/ + src/
                     └── generated native projects in ios/ + android/

Shared product system: packages/design-tokens/, packages/ui/, packages/features/,
packages/shared/, packages/brand/, and packages/contracts/
Runtime/deployment tooling:  infrastructure/ + scripts/ + Makefile
```

The web and mobile clients are adapter-based. Their default `demo` mode is deterministic, asynchronous, and works with the backend stopped. `api` mode uses the same service contracts with HTTP adapters. UI components do not import backend implementation or branch on data mode.

Specialized verticals reuse that platform boundary. Shongre Immo is documented in [`docs/architecture/shongre-immo.md`](docs/architecture/shongre-immo.md); its current standalone routes are `/immo`, `/deposer/immo`, `/compte/immo`, and `/admin/immo`.

Supabase remains canonical under `backend/supabase/`; `infrastructure/` owns cross-cutting templates and operations rather than a duplicate database stack.

The single HTTP contract is the OpenAPI 3.1 document at
[`backend/openapi/openapi.json`](backend/openapi/openapi.json). Web, mobile,
admin, and integration consumers use its generated TypeScript paths from
`@shongre/contracts/openapi`; the backend router is checked against the same
contract at boot and in CI. The architecture and API change workflow are in
[`docs/architecture/openapi.md`](docs/architecture/openapi.md) and
[`backend/docs/api.md`](backend/docs/api.md).

## Prerequisites

- Node.js 22 through 26 and npm 10 or newer (see `package.json` engines and `.nvmrc`)
- Docker plus the Supabase CLI for local database mode
- Expo-compatible iOS/Android tooling for local native runs
- macOS and current Xcode for local iOS builds; EAS may build remotely

Run `make doctor` for an evidence-based local tool report. Missing optional native tools do not prevent standalone web/demo work.

## First setup

```bash
make setup
make dev
```

`make setup` creates an ignored `.env` from `.env.example`, installs the npm workspace, renders local Supabase configuration, and runs diagnostics. Keep secrets in ignored `.env.local` or secure CI/EAS variables.

The complete everyday workflow is intentionally small:

```bash
make help       # discover generated command documentation
make doctor     # diagnose the machine and configured modes
make check      # deterministic pre-commit/pre-PR gate
```

Environment precedence is:

```text
exported process variable  >  .env.local  >  .env
```

All host ports and runtime URLs come from that configuration. `scripts/env.sh` derives local URLs when appropriate; Make targets and package scripts do not own competing port values.

## Development

```bash
make dev          # backend API + scheduled worker + web
make dev-mobile   # backend API + scheduled worker + one Expo Metro server
make dev-all      # backend API + scheduled worker + web + Expo Metro

make frontend     # standalone demo Web, backend stopped
make backend      # backend API only
make worker       # scheduled worker only

make ios
make android
make mobile-web

make status
make health       # fails unless the complete Web stack is healthy
make smoke        # health plus anonymous listings request
make logs
make stop-all
```

Processes launched through the root tooling are recorded under ignored `.runtime/`. Port collision handling prints the owning PID/command and only terminates a process whose tracked PID belongs to this repository. It never runs a broad `killall`, pattern kill, or blind SIGKILL.

To override a port for one invocation, export it on that command:

```bash
FRONTEND_PORT=3310 make frontend
BACKEND_PORT=4410 make backend
EXPO_METRO_PORT=8181 make mobile
E2E_FRONTEND_PORT=3110 make test-e2e
```

Use `make ports` to see configured values and current owners. `make free-port PORT=…` refuses to kill an unrelated process. Playwright builds one isolated Webpack production checkout, starts its standalone server on `E2E_FRONTEND_PORT`, and removes both afterward; it never borrows the interactive Next.js process.

## Data modes

| Client/runtime | Deterministic standalone mode | Connected mode                                      |
| -------------- | ----------------------------- | --------------------------------------------------- |
| Web            | `NEXT_PUBLIC_DATA_MODE=demo`  | `NEXT_PUBLIC_DATA_MODE=api` + `NEXT_PUBLIC_API_URL` |
| Mobile         | `EXPO_PUBLIC_DATA_MODE=demo`  | `EXPO_PUBLIC_DATA_MODE=api` + `EXPO_PUBLIC_API_URL` |
| Backend        | `BACKEND_DATA_MODE=demo`      | `BACKEND_DATA_MODE=database`                        |

Demo is the default. There is no silent fallback to Supabase or production HTTP. Production mobile configuration is separately validated from local public Expo values.

## Database and infrastructure

```bash
make infra-start
make infra-status
make infra-health
make migrations-check
make db-migrate
make db-seed
make db-reset
make db-types
make infra-stop
```

Schema changes belong in `backend/supabase/migrations/`. `make migrations-check` validates ordering and contents without connecting to PostgreSQL. Mutating database commands require `APP_ENV=development` and prove that the target host and database name are local; `make db-reset` additionally invokes only the local `backend/supabase` workdir. The generated `backend/supabase/config.toml` is ignored; edit its checked-in template and environment values instead.

## Quality

```bash
make lint
make typecheck
make test
make test-critical
make test-e2e
make check
make check-all

make frontend-build
make backend-build
make mobile-check
make infra-check
make ui-check
make cross-platform-check

make openapi-check       # contract lint, generated-artifact and route parity
make openapi-docs        # build the standalone Redoc API reference
```

`make check` validates the environment and migrations, formatting, all workspaces, tests, Web/backend builds, infrastructure configuration, tracked-secret scanning, and frontend/backend boundaries. `make test-critical` is a focused gate for authentication/RBAC, listing lifecycle and ownership, messaging, payments/escrow/finance, monetization/entitlements, verification/compliance, provider safety, and public data boundaries. `make check-all` adds the focused critical gate, cross-platform propagation, browser E2E, and the high-severity dependency audit. Native/store-specific checks inspect generated projects after `make mobile-prebuild-clean`.

## Mobile and store readiness

The mobile application uses Expo SDK 57, React Native 0.86, React 19.2, and Expo Router. Stable identifiers, application version, iOS build number, Android versionCode, deployment target, SDK targets, privacy manifest, permissions, and deep-link domains are driven by `mobile/app.config.ts` plus release environment variables.

```bash
make mobile-prebuild-clean
make expo-doctor
make android-sdk-check
make android-16kb-check
make ios-sdk-check
make permissions-check
make privacy-check
make store-check
```

Store-check uses `PASS`, `FAIL`, `WARNING`, `MANUAL REVIEW REQUIRED`, and `NOT APPLICABLE`. It is a preflight, never a claim that Apple or Google will approve the app. Current evidence and human tasks live in `mobile/store/` and `docs/compliance/`.

On macOS, verify the native iOS Release source graph without signing after the
generated workspace exists:

```bash
cd mobile/ios
pod install
bash -c 'source ../../scripts/env.sh && export NODE_ENV=production && \
  xcodebuild -workspace Shongre.xcworkspace -scheme Shongre \
  -configuration Release -destination "generic/platform=iOS Simulator" \
  CODE_SIGNING_ALLOWED=NO ARCHS=arm64 ONLY_ACTIVE_ARCH=YES \
  DEBUG_INFORMATION_FORMAT=dwarf GCC_GENERATE_DEBUGGING_SYMBOLS=NO build'
```

The Bash wrapper is required because `scripts/env.sh` owns the non-secret Expo
release configuration. This validates compilation, Hermes bundling, linkage,
resources, and app packaging; it does not replace a signed device archive or
store submission checks. Allow several gigabytes of free disk space for a first
native build.

Universal/App Link files require real signing identities. Configure `APPLE_TEAM_ID` and `ANDROID_SHA256_CERT_FINGERPRINT`, then run `make association-files`, deploy the generated ignored files over HTTPS, and verify them with `make deep-links-check`.

Build, submit, and release remain separate actions:

```bash
make ios-preview-build
make android-preview-build
make ios-production-build
make android-production-build

# Explicit submission only after preflight and human approval
make submit-ios
make submit-android
```

Production credentials, keystores, certificates, App Store Connect keys, Play service accounts, EAS credentials, and reviewer passwords must never be committed.

## Safety and privacy implemented

- mobile sessions use Keychain/Keystore through Expo SecureStore;
- production endpoint checks require stable HTTPS and reject local, LAN, emulator, and tunnel hosts;
- account deletion is available in mobile and on the public web, with reauthentication, active-order protection, anonymization, credential/token revocation, and audit state;
- UGC users can report and server-authoritatively block/unblock, and blocked users cannot send messages;
- push registration is associated with the authenticated account and removed on logout/deletion;
- declared native permissions are limited to selected photos and notifications with usable fallbacks;
- analytics, advertising, tracking, camera, contacts, microphone, device location, and crash-reporting SDKs are not enabled today;
- physical marketplace payments are separated from digital promotion/subscription features, which remain unavailable in mobile until a current billing-policy review approves an implementation.

The final privacy policy, exact retention periods, processor list, store-console declarations, reviewer credentials, ratings, signing, signed-artifact checks, metadata, and rollout remain human/legal/operations responsibilities.

## Business rules and monetization

Commercial configuration is versioned and backend-authoritative. Start with:

- `docs/architecture/business-rules-monetization.md` for the domain, APIs, precedence, security, quote, payment, and entitlement lifecycle;
- `docs/implementation/monetization-migration-map.md` for the audited sources and consumer migration evidence;
- `docs/operations/monetization-admin-guide.md` for safe draft, approval, scheduling, rollback, and incident procedures.

The machine-readable baseline and localized reason-code reference are exported from `@shongre/contracts/monetization-catalog`.

## Repository map

```text
frontend/                 Next.js App Router Web app, demo + HTTP adapters
backend/                  Node modular monolith, repositories, API, tests
backend/supabase/         canonical migrations, policies, functions, local config template
mobile/                   single Expo iOS/Android source and generated native projects
mobile/store/             Apple, Google, privacy, permission, and release evidence
packages/design-tokens/   canonical visual values and generated platform adapters
packages/ui/              shared Web/native primitive APIs
packages/features/        shared feature presentation and interaction rules
packages/shared/          framework-free formatting and validation
packages/brand/           canonical brand mark and generated app assets
packages/contracts/       generated OpenAPI types plus stable domain schemas
infrastructure/           cross-cutting operations and association-file templates
scripts/                  environment, process, port, health, and infrastructure tooling
docs/                     architecture, security, operations, and current store baseline
Makefile                  canonical developer and release CLI
AGENTS.md                 mandatory engineering rules and durable lessons
```

Run `make help` for the canonical command list.
