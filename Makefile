.DEFAULT_GOAL := help
SHELL := /bin/bash

.PHONY: help setup doctor info env env-init env-check install reinstall \
	dev demo dev-web dev-mobile dev-all start stop stop-all restart status health smoke logs \
	web frontend web-dev frontend-dev frontend-start frontend-build frontend-lint frontend-typecheck frontend-test frontend-test-e2e frontend-check frontend-clean frontend-logs \
	backend backend-dev backend-start worker worker-dev worker-start backend-build backend-lint backend-typecheck backend-test backend-check backend-health backend-logs worker-logs \
	contracts-lint contracts-typecheck contracts-test contracts-check openapi-lint openapi-generate openapi-check openapi-docs openapi-breaking-check \
	tokens-check tokens-build ui-check ui-test ui-lint ui-typecheck ui-build shared-check cross-platform-check \
	mobile mobile-dev mobile-start mobile-stop mobile-status mobile-health mobile-web expo expo-start expo-clear expo-doctor ios ios-run ios-open ios-clean android android-run android-open android-clean mobile-prebuild mobile-prebuild-clean mobile-lint mobile-typecheck mobile-test mobile-check \
	infra infra-start infra-stop infra-restart infra-status infra-health infra-logs infra-config infra-check infra-validate \
	db-start db-stop db-status db-health db-migrate migrations-check db-seed db-reset db-types db-shell supabase-start supabase-stop supabase-status supabase-reset supabase-migrate supabase-seed supabase-types supabase-link supabase-pull supabase-push \
	ports check-ports free-app-ports free-ports free-port \
	lint lint-fix format format-check typecheck test test-unit test-integration test-critical test-e2e test-coverage i18n-check taxonomy-check providers-check contracts generate check check-all ci build \
	clean clean-deps clean-all reset audit outdated \
	eas-doctor ios-preview-build android-preview-build ios-production-build android-production-build eas-build-ios eas-build-android eas-build-all submit-ios submit-android \
	privacy-check permissions-check sdk-audit version version-check version-bump-patch version-bump-minor version-bump-major reviewer-access-check association-files deep-links-check mobile-identifiers-check mobile-production-env-check release-content-check ios-sdk-check ios-privacy-check ios-permissions-check ios-entitlements-check ios-signing-check ios-store-check ios-release-check android-sdk-check android-data-safety-check android-permissions-check android-16kb-check android-signing-check android-store-check android-release-check release-check store-check \
	production-config-check production-release-check backup-restore-test secret-scan

define env_run
	@source scripts/env.sh && $(1)
endef

PRETTIER_FILES := \
	'frontend/{app,src,scripts}/**/*.{ts,tsx,js,mjs,json,md}' \
	'frontend/package.json' 'frontend/README.md' \
	'backend/{src,scripts,tests,docs}/**/*.{ts,tsx,js,mjs,json,md}' \
	'backend/package.json' 'backend/tsconfig.json' 'backend/README.md' \
	'backend/openapi/**/*.{json,yml,yaml,md}' \
	'mobile/{app,src,scripts,tests,store}/**/*.{ts,tsx,js,mjs,json,md}' \
	'mobile/app.config.ts' 'mobile/eas.json' 'mobile/eslint.config.js' \
	'mobile/metro.config.js' 'mobile/package.json' 'mobile/tsconfig.json' 'mobile/vitest.config.ts' \
	'packages/**/*.{ts,tsx,js,mjs,json,md}' \
	'scripts/**/*.{js,mjs,md}' \
	'docs/**/*.md' '.github/**/*.{yml,yaml,md}' \
	'package.json' 'README.md'

help: ## Show this generated command reference
	@printf '\nShongre developer CLI\n'
	@awk '\
		/^##@ / { heading = substr($$0, 5); printf "\n%s\n", heading; next } \
		/^[A-Za-z0-9_.-]+:.*## / { \
			target = $$0; sub(/:.*/, "", target); \
			description = $$0; sub(/^[^#]*## /, "", description); \
			printf "  make %-25s %s\n", target, description; \
		}' $(MAKEFILE_LIST)
	@printf '\nHost ports and runtime modes come from .env; run make info for resolved values.\n\n'

##@ Setup & diagnostics
setup: env install doctor ## Prepare a complete standalone development checkout

env: env-init ## Create missing local environment files without overwriting values

env-init:
	@if [[ ! -e .env ]]; then cp .env.example .env && echo 'Created .env from .env.example'; else echo '.env already exists; left unchanged'; fi
	@source scripts/env.sh && scripts/render-supabase-config.sh

env-check: ## Validate required names, modes, ports, and public-variable safety
	@scripts/env-check.sh

doctor: ## Diagnose tools, versions, configuration, ports, and optional platforms
	@scripts/doctor.sh

info: env-check ## Print resolved non-secret runtime endpoints and data modes
	@source scripts/env.sh && printf 'Environment: %s\nWeb:         http://%s:%s\nPlaywright:  http://%s:%s\nBackend:     http://%s:%s%s\nMetro:       http://%s:%s\nData modes:  web=%s backend=%s mobile=%s\n' "$$APP_ENV" "$$FRONTEND_HOST" "$$FRONTEND_PORT" "$$FRONTEND_HOST" "$$E2E_FRONTEND_PORT" "$$BACKEND_HOST" "$$BACKEND_PORT" "$$API_PREFIX" "$$EXPO_HOST" "$$EXPO_METRO_PORT" "$$NEXT_PUBLIC_DATA_MODE" "$$BACKEND_DATA_MODE" "$$EXPO_PUBLIC_DATA_MODE"

install: ## Install the npm workspace using its committed lockfile
	@npm install

reinstall: clean-deps install

##@ Development
dev: dev-web ## Run backend, worker, and Web with tracked cleanup
demo: ## Run the complete Web stack with command-scoped deterministic demo modes
	@NEXT_PUBLIC_DATA_MODE=demo VITE_DATA_MODE=demo BACKEND_DATA_MODE=demo EXPO_PUBLIC_DATA_MODE=demo scripts/dev.sh web
dev-web:
	@scripts/dev.sh web
dev-mobile: ## Run backend, worker, and one Expo Metro server
	@scripts/dev.sh mobile
dev-all: ## Run backend, worker, Web, and one Expo Metro server
	@scripts/dev.sh all
start: dev

frontend: frontend-dev ## Run only the standalone Web application
web web-dev frontend-dev:
	@scripts/service.sh foreground frontend auto -- npm run dev --workspace=frontend

frontend-start:
	@scripts/service.sh foreground frontend auto -- npm run preview --workspace=frontend

backend: backend-dev ## Run only the backend API
backend-dev:
	@scripts/service.sh foreground backend auto -- npm run dev --workspace=backend

backend-start: backend-build
	@scripts/service.sh foreground backend auto -- npm run start --workspace=backend

worker: worker-dev ## Run only the backend scheduled worker
worker-dev:
	@scripts/service.sh foreground worker none -- npm run dev:worker --workspace=backend
worker-start: backend-build
	@scripts/service.sh foreground worker none -- npm run start:worker --workspace=backend

mobile: mobile-dev ## Run the Expo development server
mobile-dev mobile-start expo expo-start:
	@source scripts/env.sh && scripts/service.sh foreground metro "$$EXPO_METRO_PORT" -- npm run start --workspace=mobile -- --port "$$EXPO_METRO_PORT"
mobile-stop:
	@source scripts/env.sh && scripts/service.sh stop metro "$$EXPO_METRO_PORT"

stop: stop-all
stop-all: ## Stop only tracked Shongre application processes
	@source scripts/env.sh && scripts/service.sh stop frontend "$$FRONTEND_PORT" || true
	@source scripts/env.sh && scripts/service.sh stop backend "$$BACKEND_PORT" || true
	@source scripts/env.sh && scripts/service.sh stop worker none || true
	@source scripts/env.sh && scripts/service.sh stop metro "$$EXPO_METRO_PORT" || true

restart: stop-all dev

status: ## Show Git, environment, tracked services, ports, and infrastructure state
	@scripts/status.sh
mobile-status: status

health: ## Require the complete Web development stack to be healthy
	@scripts/health.sh stack
backend-health:
	@scripts/health.sh backend
mobile-health:
	@scripts/health.sh mobile
smoke: ## Smoke-test Web, API readiness, and an anonymous listings request
	@scripts/health.sh smoke

logs: ## Show recent logs from tracked application processes
	@for service_name in frontend backend worker metro; do echo "== $$service_name =="; scripts/service.sh logs "$$service_name" auto; done

frontend-logs:
	@scripts/service.sh logs frontend auto
backend-logs:
	@scripts/service.sh logs backend auto
worker-logs:
	@scripts/service.sh logs worker none

##@ Application quality
frontend-build: ## Build the production Web artifact
	@source scripts/env.sh && npm run build --workspace=frontend
frontend-lint:
	@npm run lint --workspace=frontend
frontend-typecheck:
	@npm run typecheck --workspace=frontend
frontend-test: ## Run Web unit and component tests
	@npm run test --workspace=frontend
frontend-test-e2e: ## Run the real Playwright browser suite
	@scripts/e2e.sh $(E2E_ARGS)
frontend-check:
	@source scripts/env.sh && SKIP_E2E="$${SKIP_E2E:-0}" npm run check --workspace=frontend
frontend-clean:
	@npm run clean --workspace=frontend

backend-build: ## Build backend API and worker artifacts
	@npm run build --workspace=backend
backend-lint:
	@npm run lint --workspace=backend
backend-typecheck:
	@npm run typecheck --workspace=backend
backend-test: ## Run backend unit, integration, security, contract, and RLS tests
	@npm run test --workspace=backend
backend-check: backend-lint backend-test backend-build
	@npm run benchmark --workspace=backend
	@npm run check:boundary
contracts-lint contracts-typecheck:
	@npm run typecheck --workspace=@shongre/contracts
contracts-test:
	@npm run test --workspace=@shongre/contracts
contracts-check: contracts-typecheck contracts-test
openapi-lint: ## Lint the canonical OpenAPI contract
	@npm run openapi:lint
openapi-generate: ## Regenerate OpenAPI TypeScript and runtime manifests
	@npm run openapi:generate
openapi-check: ## Reject spec, implementation, or generated-client drift
	@npm run openapi:check
openapi-docs: ## Build standalone API reference documentation
	@npm run openapi:docs
openapi-breaking-check: ## Compare the contract with OPENAPI_BASE_REF when configured
	@npm run openapi:breaking

##@ Shared product system
tokens-build:
	@npm run build --workspace=@shongre/design-tokens
tokens-check: tokens-build
	@npm run check:generated --workspace=@shongre/design-tokens
	@npm run test --workspace=@shongre/design-tokens
	@npm run check:assets --workspace=@shongre/brand
	@node scripts/check-cross-platform-ui.mjs
	@node scripts/verify-token-propagation.mjs
ui-lint:
	@npm run lint --workspace=@shongre/ui
	@npm run lint --workspace=@shongre/features
ui-typecheck:
	@npm run typecheck --workspace=@shongre/design-tokens
	@npm run typecheck --workspace=@shongre/brand
	@npm run typecheck --workspace=@shongre/shared
	@npm run typecheck --workspace=@shongre/ui
	@npm run typecheck --workspace=@shongre/features
ui-test:
	@npm run test --workspace=@shongre/design-tokens
	@npm run test --workspace=@shongre/brand
	@npm run test --workspace=@shongre/shared
	@npm run test --workspace=@shongre/ui
	@npm run test --workspace=@shongre/features
ui-build: tokens-build
	@npm run check:assets --workspace=@shongre/brand
	@npm run build --workspace=@shongre/brand
	@npm run build --workspace=@shongre/shared
	@npm run build --workspace=@shongre/ui
	@npm run build --workspace=@shongre/features
shared-check:
	@npm run check --workspace=@shongre/brand
	@npm run check --workspace=@shongre/shared
	@npm run check --workspace=@shongre/features
ui-check: tokens-check ui-lint ui-typecheck ui-test ui-build frontend-typecheck frontend-build mobile-typecheck expo-doctor ## Validate tokens and shared UI in Web and Expo consumers
cross-platform-check: ui-check contracts-check shared-check ## Prove shared-system propagation across Web, iOS, and Android
	@node scripts/check-cross-platform-ui.mjs
	@source scripts/env.sh && npm exec --workspace=mobile -- expo install --check
	@node mobile/scripts/release-check.mjs ios-sdk
	@node mobile/scripts/release-check.mjs android-sdk

##@ Mobile
mobile-web:
	@source scripts/env.sh && npm run web --workspace=mobile -- --port "$$EXPO_WEB_PORT"
expo-clear:
	@source scripts/env.sh && npm run start --workspace=mobile -- --clear --port "$$EXPO_METRO_PORT"
expo-doctor: ## Run Expo's dependency and configuration diagnostics
	@source scripts/env.sh && npm exec --workspace=mobile -- expo-doctor
ios: ios-run ## Run the Expo application on iOS
ios-run:
	@source scripts/env.sh && npm run ios --workspace=mobile
ios-open:
	@open mobile/ios 2>/dev/null || { echo 'mobile/ios is generated by make mobile-prebuild'; exit 1; }
ios-clean:
	@[[ ! -d mobile/ios/build ]] || rm -rf mobile/ios/build
android: android-run ## Run the Expo application on Android
android-run:
	@source scripts/env.sh && npm run android --workspace=mobile
android-open:
	@open -a 'Android Studio' mobile/android 2>/dev/null || { echo 'Android Studio or mobile/android unavailable'; exit 1; }
android-clean:
	@[[ ! -d mobile/android/.gradle ]] || rm -rf mobile/android/.gradle
	@[[ ! -d mobile/android/app/build ]] || rm -rf mobile/android/app/build
mobile-prebuild:
	@source scripts/env.sh && npm exec --workspace=mobile -- expo prebuild --no-install
mobile-prebuild-clean: ## Regenerate clean iOS and Android projects from Expo config
	@source scripts/env.sh && npm exec --workspace=mobile -- expo prebuild --clean --no-install
mobile-lint:
	@npm run lint --workspace=mobile
mobile-typecheck:
	@npm run typecheck --workspace=mobile
mobile-test:
	@npm run test --workspace=mobile
mobile-check: mobile-lint mobile-typecheck mobile-test expo-doctor mobile-production-env-check ## Validate Expo source, types, tests, and configuration

##@ Infrastructure & database
infra: infra-start
infra-start: ## Start required local Supabase services in database mode
	@scripts/infra.sh start
infra-stop: ## Stop the local Supabase stack
	@scripts/infra.sh stop
infra-restart: infra-stop infra-start
infra-status: ## Show local Supabase status
	@scripts/infra.sh status
db-status supabase-status: infra-status
infra-health: ## Require configured local infrastructure to be healthy
	@scripts/infra.sh health
db-health: infra-health
infra-logs:
	@scripts/infra.sh logs
infra-config:
	@scripts/infra.sh config
infra-check: ## Validate Dockerfiles, manifests, runbooks, and generated config
	@scripts/infra.sh check
infra-validate: infra-check
production-config-check:
	@node scripts/production-readiness.mjs
production-release-check:
	@node scripts/production-readiness.mjs --require-evidence
backup-restore-test:
	@scripts/verify-backup-restore.sh
secret-scan:
	@node scripts/scan-tracked-secrets.mjs
db-start supabase-start: infra-start
db-stop supabase-stop: infra-stop
db-migrate: ## Apply ordered migrations to the explicitly configured database
	@scripts/database.sh migrate
supabase-migrate: db-migrate
migrations-check: ## Validate migration ordering and contents without connecting to a database
	@scripts/database.sh check
db-seed: ## Load deterministic seed data into a proven local development database
	@scripts/database.sh seed
supabase-seed: db-seed
db-types: ## Regenerate canonical database types from local or explicitly linked Supabase
	@source scripts/env.sh && npm run db:types --workspace=backend
supabase-types: db-types
db-reset: ## Reconstruct only the proven local Supabase development database
	@scripts/database.sh reset
supabase-reset: db-reset
db-shell: ## Open psql only against a proven local development database
	@scripts/database.sh shell
supabase-link:
	@source scripts/env.sh && [[ -n "$${SUPABASE_PROJECT_REF:-}" ]] || { echo 'SUPABASE_PROJECT_REF is required'; exit 1; }; supabase link --workdir backend --project-ref "$$SUPABASE_PROJECT_REF"
supabase-pull:
	@supabase db pull --workdir backend
supabase-push:
	@supabase db push --workdir backend

##@ Diagnostics
ports: ## Show configured ports, availability, and listener ownership
	@scripts/ports.sh
check-ports: ports
free-port:
	@source scripts/env.sh && [[ -n "$${PORT:-}" ]] || { echo 'Usage: make free-port PORT=xxxx'; exit 2; }; scripts/free-port.sh "$$PORT"
free-app-ports free-ports:
	@source scripts/env.sh && scripts/free-port.sh "$$FRONTEND_PORT" frontend && scripts/free-port.sh "$$BACKEND_PORT" backend && scripts/free-port.sh "$$EXPO_METRO_PORT" metro && scripts/free-port.sh "$$EXPO_WEB_PORT" expo-web

##@ Quality gates
lint: openapi-check ui-lint frontend-lint backend-lint mobile-lint contracts-typecheck ## Run established static and architecture linters
lint-fix:
	@echo 'No unsafe global autofix is configured; use package-local focused fixes.'
format: ## Format supported source and documentation files with Prettier
	@npm exec -- prettier --write $(PRETTIER_FILES)
format-check: ## Verify formatting without changing files
	@npm exec -- prettier --check $(PRETTIER_FILES)
typecheck: ui-typecheck frontend-typecheck backend-typecheck mobile-typecheck contracts-typecheck ## Type-check every TypeScript workspace
test: ui-test frontend-test backend-test mobile-test contracts-test ## Run the complete non-E2E test suite
test-unit: test
test-integration: ## Run the backend HTTP integration suite
	@npm run test:integration --workspace=backend
test-critical: ## Run focused marketplace security, auth, listing, money, and compliance tests
	@npm run test:critical --workspace=backend
	@npm run test:critical --workspace=frontend
	@npm run test:critical --workspace=@shongre/shared
test-e2e: frontend-test-e2e ## Run all configured Playwright engines
test-coverage:
	@npm run test --workspace=frontend -- --coverage
	@npm run test --workspace=backend -- --coverage
	@npm run test --workspace=mobile -- --coverage
i18n-check: ## Validate locale catalogues and untranslated-surface regression budgets
	@npm run check:i18n --workspace=frontend
taxonomy-check: ## Validate canonical taxonomy coverage and publication schemas
	@npm run check:taxonomy --workspace=frontend
providers-check: ## Run safe mocked provider adapters and fail-closed provider tests
	@npm run test:providers --workspace=backend
contracts: contracts-check ## Validate stable public client/backend contracts
generate: tokens-build db-types openapi-generate ## Regenerate deterministic tokens, database types, and API clients
check: env env-check migrations-check format-check tokens-check lint typecheck test frontend-build backend-build infra-check secret-scan ## Run the deterministic pre-commit and pre-PR gate
	@npm run check:boundary
check-all: check test-critical cross-platform-check test-e2e ## Run exhaustive local validation including browsers and critical subsets
	@npm audit --audit-level=high
ci: env
	@npm ci
	@$(MAKE) check
build: ui-build frontend-build backend-build mobile-typecheck ## Build all local production artifacts without publishing

##@ Maintenance
clean: stop-all ## Remove disposable build, cache, coverage, and test artifacts
	@[[ ! -d frontend/.next ]] || rm -rf frontend/.next
	@[[ ! -d frontend/out ]] || rm -rf frontend/out
	@[[ ! -d backend/dist ]] || rm -rf backend/dist
	@[[ ! -d mobile/.expo ]] || rm -rf mobile/.expo
	@for artifact_dir in coverage frontend/coverage backend/coverage mobile/coverage frontend/test-results frontend/playwright-report frontend/blob-report; do [[ ! -d "$$artifact_dir" ]] || rm -rf "$$artifact_dir"; done
	@find frontend backend mobile packages -type d -name '.vite' -prune -exec rm -rf {} + 2>/dev/null || true
	@[[ ! -d .runtime ]] || rm -rf .runtime
clean-deps: stop-all
	@for dependency_dir in node_modules frontend/node_modules backend/node_modules mobile/node_modules packages/*/node_modules; do [[ ! -d "$$dependency_dir" ]] || rm -rf "$$dependency_dir"; done
clean-all: clean clean-deps ## Also remove workspace dependencies
reset: clean install env-check ## Safely rebuild disposable local project state, preserving env and databases
audit: ## Report npm dependency advisories
	@npm audit
outdated:
	@npm outdated || true

##@ Store & release
version:
	@source scripts/env.sh && printf 'App %s | iOS build %s | Android versionCode %s\n' "$$APP_VERSION" "$$IOS_BUILD_NUMBER" "$$ANDROID_VERSION_CODE"
version-check:
	@node mobile/scripts/release-check.mjs version
version-bump-patch:
	@node mobile/scripts/version.mjs patch
version-bump-minor:
	@node mobile/scripts/version.mjs minor
version-bump-major:
	@node mobile/scripts/version.mjs major

privacy-check:
	@node mobile/scripts/release-check.mjs privacy
permissions-check:
	@node mobile/scripts/release-check.mjs permissions
sdk-audit:
	@node mobile/scripts/release-check.mjs sdk-audit
reviewer-access-check:
	@node mobile/scripts/release-check.mjs reviewer-access
association-files:
	@scripts/render-deep-links.sh
deep-links-check:
	@node mobile/scripts/release-check.mjs deep-links
mobile-identifiers-check:
	@node mobile/scripts/release-check.mjs identifiers
mobile-production-env-check:
	@node mobile/scripts/release-check.mjs production-env
release-content-check:
	@node mobile/scripts/release-check.mjs content
ios-sdk-check:
	@node mobile/scripts/release-check.mjs ios-sdk
ios-privacy-check:
	@node mobile/scripts/release-check.mjs ios-privacy
ios-permissions-check:
	@node mobile/scripts/release-check.mjs ios-permissions
ios-entitlements-check:
	@node mobile/scripts/release-check.mjs ios-entitlements
ios-signing-check:
	@node mobile/scripts/release-check.mjs ios-signing
android-sdk-check:
	@node mobile/scripts/release-check.mjs android-sdk
android-data-safety-check:
	@node mobile/scripts/release-check.mjs android-data-safety
android-permissions-check:
	@node mobile/scripts/release-check.mjs android-permissions
android-16kb-check:
	@node mobile/scripts/release-check.mjs android-16kb
android-signing-check:
	@node mobile/scripts/release-check.mjs android-signing
ios-store-check ios-release-check:
	@node mobile/scripts/release-check.mjs ios
android-store-check android-release-check:
	@node mobile/scripts/release-check.mjs android
release-check: store-check
store-check: check mobile-check ## Run evidence-based Apple and Google release preflight
	@$(MAKE) mobile-prebuild-clean
	@node mobile/scripts/release-check.mjs store

eas-doctor:
	@npm exec --workspace=mobile -- eas-cli@latest -- doctor
ios-preview-build: ## Build an iOS preview with EAS without submitting
	@$(MAKE) store-check && npm exec --workspace=mobile -- eas-cli@latest -- build --platform ios --profile preview
android-preview-build: ## Build an Android preview with EAS without submitting
	@$(MAKE) store-check && npm exec --workspace=mobile -- eas-cli@latest -- build --platform android --profile preview
ios-production-build: ## Build an iOS release candidate without submitting
	@$(MAKE) store-check && npm exec --workspace=mobile -- eas-cli@latest -- build --platform ios --profile production
eas-build-ios: ios-production-build
android-production-build: ## Build an Android release candidate without submitting
	@$(MAKE) store-check && npm exec --workspace=mobile -- eas-cli@latest -- build --platform android --profile production
eas-build-android: android-production-build
eas-build-all:
	@$(MAKE) store-check && npm exec --workspace=mobile -- eas-cli@latest -- build --platform all --profile production
submit-ios: ## Explicitly submit the validated iOS candidate
	@$(MAKE) store-check && npm exec --workspace=mobile -- eas-cli@latest -- submit --platform ios --profile production
submit-android: ## Explicitly submit the validated Android candidate
	@$(MAKE) store-check && npm exec --workspace=mobile -- eas-cli@latest -- submit --platform android --profile production
