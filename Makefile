.DEFAULT_GOAL := help
SHELL := /bin/bash

# Command-scoped selection; never persist an active production profile on disk.
ifneq ($(strip $(ENVIRONMENT)),)
export SHONGRE_ENV := $(ENVIRONMENT)
endif

.PHONY: help setup doctor info env-info urls env env-init env-check env-local env-test env-preview env-development env-staging env-production install reinstall \
	dev-down dev-restart dev-status dev-logs dev-reset dev-clean api-export api-generate api-check docker-up docker-down docker-restart logs-backend logs-worker logs-frontend logs-supabase mail-up mail-down mail-status redis-up redis-down redis-status redis-logs \
	dev dev-web dev-development dev-staging staging dev-mobile dev-all start stop stop-all restart status health smoke logs \
	frontend frontend-start frontend-build frontend-lint frontend-api-only-check frontend-typecheck frontend-test frontend-test-e2e test-web-api-transport frontend-check frontend-clean frontend-logs seo-check seo-audit \
	backend backend-dev backend-start worker worker-dev worker-start backend-build backend-lint backend-typecheck backend-test backend-check backend-health backend-logs worker-logs \
	contracts-lint contracts-typecheck contracts-test contracts-check openapi-lint openapi-generate openapi-check openapi-docs openapi-breaking-check \
	brand-sync brand-check brand-release brand-activate brand-activation-check tokens-check tokens-build ui-check ui-test ui-lint ui-typecheck ui-build shared-check cross-platform-check \
	mobile mobile-dev mobile-start mobile-stop mobile-status mobile-health mobile-web expo expo-start expo-clear expo-doctor ios ios-run ios-open ios-clean android android-run android-open android-clean mobile-prebuild mobile-prebuild-clean mobile-lint mobile-typecheck mobile-test mobile-api-only-check mobile-dead-code mobile-check \
	infra-check supabase-up supabase-down supabase-status supabase-health supabase-logs supabase-config \
	db-migrate db-diff migrations-check db-seed geo-backfill geo-rate-limit-test api-rate-limit-test monetization-draft-import taxonomy-db-dry-run taxonomy-db-import taxonomy-db-test discovery-db-test taxonomy-migration-check db-reset db-types db-types-check db-shell supabase-link supabase-pull supabase-push \
	ports check-ports free-app-ports free-ports free-port \
	lint lint-fix format format-check typecheck test test-unit test-integration test-critical test-e2e test-coverage i18n-check taxonomy-import taxonomy-compile taxonomy-check providers-check analytics-check crm-check marketing-check repository-hygiene-check contracts generate check check-all ci build \
	clean clean-deps clean-all reset audit outdated \
	eas-doctor ios-preview-build android-preview-build ios-production-build android-production-build eas-build-ios eas-build-android eas-build-all submit-ios submit-android \
	privacy-check permissions-check sdk-audit version version-check version-bump-patch version-bump-minor version-bump-major reviewer-access-check association-files deep-links-check mobile-identifiers-check mobile-production-env-check release-content-check ios-sdk-check ios-privacy-check ios-permissions-check ios-entitlements-check ios-signing-check ios-store-check ios-release-check android-sdk-check android-data-safety-check android-permissions-check android-16kb-check android-signing-check android-store-check android-release-check release-check store-check \
	production-config-check production-release-check backup-restore-test secret-scan hostname-check deploy deploy-dev deploy-staging deploy-prod rollback remote-health \
	operations-tooling-check capability-inventory-check capability-inventory-update e2e-triage e2e-baseline-update e2e-triage-database e2e-baseline-update-database web-push-keys performance-smoke performance-db-plan performance-check storage-restore-test image-transform-check observability-evidence edge-functions-evidence \
	docker-config docker-build docker-build-frontend docker-build-backend docker-start docker-stop docker-status docker-health docker-logs docker-scan docker-audit \
	tunnel-status tunnel-health tunnel-logs api-schema api-types contracts release-manifest-check deployment-config-check env-matrix-check

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
	'scripts/**/*.{js,mjs,ts,json,md}' \
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
	@printf '\nSelect per command: make env-check ENVIRONMENT=local|dev|staging|prod\nPorts and runtime modes come from the selected profile; run make env-info ENVIRONMENT=dev.\n\n'

##@ Setup & diagnostics
setup: env install doctor ## Prepare a complete standalone development checkout

env: env-init ## Create missing local environment files without overwriting values

env-init:
	@source scripts/lib/environment-profile.sh && profile="$$(shongre_environment_profile "$${SHONGRE_ENV:-$${APP_ENV:-local}}")" && [[ "$$profile" == local ]] || { echo 'make env initializes local only; hosted profiles use their dedicated secret stores.'; exit 2; }
	@if [[ ! -e .env.local ]]; then cp .env.example .env.local && echo 'Created .env.local from .env.example'; else echo '.env.local already exists; left unchanged'; fi
	@source scripts/env.sh && scripts/render-supabase-config.sh

env-check: ## Validate the selected profile; ENVIRONMENT=local|dev|staging|prod
	@scripts/env-check.sh

env-local: ## Validate the ignored local development profile
	@SHONGRE_ENV=local scripts/env-check.sh

env-test: ## Validate the isolated automated-test profile
	@SHONGRE_ENV=test scripts/env-check.sh

env-preview: ## Validate an explicitly populated dynamic preview profile
	@SHONGRE_ENV=preview scripts/env-check.sh

env-development: ## Validate development, including required hosted resources
	@SHONGRE_ENV=development scripts/env-check.sh

env-staging: ## Validate staging, including required hosted database credentials
	@SHONGRE_ENV=staging scripts/env-check.sh

env-production: ## Validate production, including required hosted database credentials
	@SHONGRE_ENV=production scripts/env-check.sh

env-matrix-check: ## Validate all six profiles with isolated non-secret resource bindings
	@node --test scripts/environment-profile.test.mjs scripts/runtime-fingerprint.test.mjs

doctor: ## Diagnose tools, versions, configuration, ports, and optional platforms
	@scripts/doctor.sh

info: env-info
env-info: env-check ## Print resolved non-secret environment, URL, provider, and indexing modes
	@source scripts/env.sh && printf 'Environment       %s (%s)\nFrance frontend   %s\nIntl frontend     %s\nAPI               %s%s\nMobile API        %s\nSupabase          %s\nStorage           %s\nPayments          %s\nEmail             %s\nAI                %s\nAnalytics         %s\nSEO indexing      %s\nBackend mode      %s/%s\n' "$$APP_ENV" "$$ENVIRONMENT_ID" "$$PUBLIC_FR_URL" "$$PUBLIC_INTL_URL" "$$API_URL" "$$API_PREFIX" "$$EXPO_PUBLIC_API_URL" "$${SUPABASE_PROJECT_REF:-local}" "$$STORAGE_ENVIRONMENT_ID" "$$PAYMENT_MODE" "$$EMAIL_MODE" "$$AI_MODE" "$$ANALYTICS_MODE" "$$( [[ "$$APP_ENV" == production ]] && echo enabled || echo disabled )" "$$BACKEND_DATA_MODE" "$$DATABASE_INFRA_MODE"

urls: env-check ## Print the selected environment's service URLs without credentials
	@scripts/service-urls.sh

install: ## Install frontend, backend, mobile, and shared workspace dependencies
	@npm ci

reinstall: clean-deps install

##@ Development
dev: ## Ensure the complete stack (API, worker, Web, Metro); ENVIRONMENT=local (default), dev, or staging
	@BACKEND_DATA_MODE=database scripts/dev.sh all
dev-web: ## Ensure only the connected Web stack, without Metro
	@BACKEND_DATA_MODE=database scripts/dev.sh web
dev-development: ## Restart the Web stack against the dedicated hosted development database
	@$(MAKE) dev-web ENVIRONMENT=development
dev-staging: ## Run the Web stack with .env.staging and .env.staging.local
	@$(MAKE) dev-web ENVIRONMENT=staging
staging: dev-staging ## Alias for dev-staging
dev-mobile: ## Restart API, worker and Metro; ENVIRONMENT=local (default), dev, or staging
	@BACKEND_DATA_MODE=database scripts/dev.sh mobile
dev-all: ## Restart API, worker, Web and Metro; ENVIRONMENT=local (default), dev, or staging
	@BACKEND_DATA_MODE=database scripts/dev.sh all
start: dev

frontend: ## Run the API-only Web client at the configured origin
	@scripts/service.sh foreground frontend auto -- npm run dev --workspace=frontend

frontend-start:
	@scripts/service.sh foreground frontend auto -- npm run preview --workspace=frontend

backend: backend-dev ## Run the database-backed API at the configured local origin
backend-dev:
	@scripts/service.sh foreground backend auto -- npm run dev --workspace=backend

backend-start: backend-build
	@scripts/service.sh foreground backend auto -- npm run start --workspace=backend

worker: worker-dev ## Run the database-backed queue worker
worker-dev:
	@scripts/service.sh foreground worker none -- npm run dev:worker --workspace=backend
worker-start: backend-build
	@scripts/service.sh foreground worker none -- npm run start:worker --workspace=backend

mobile: dev-mobile ## Run the API-only mobile application with its local Supabase-backed API
mobile-dev mobile-start expo expo-start:
	@source scripts/env.sh && scripts/service.sh foreground metro "$$EXPO_METRO_PORT" -- npm run start --workspace=mobile -- --port "$$EXPO_METRO_PORT"
mobile-stop:
	@source scripts/env.sh && scripts/service.sh stop metro "$$EXPO_METRO_PORT"

stop: stop-all
stop-all: ## Stop only tracked Shongre application processes
	@source scripts/env.sh || exit $$?; \
	result=0; \
	for service_name in frontend backend worker metro; do \
		scripts/service.sh stop "$$service_name" auto || result=1; \
	done; \
	exit "$$result"

dev-down: ## Stop owned applications, local containers, and Supabase without deleting data
	@source scripts/env.sh && [[ "$$APP_ENV" == local ]] || { echo 'dev-down requires ENVIRONMENT=local'; exit 2; }
	@$(MAKE) stop-all
	@scripts/compose.sh stop
dev-restart: ## Stop the complete local stack, then start it again
	@$(MAKE) dev-down
	@$(MAKE) dev
dev-status: status ## Show local processes, infrastructure, and configured URLs
dev-logs: logs ## Show the bounded application log view
dev-reset: dev-down ## Destructively recreate only the proven local database, then reseed
	@$(MAKE) supabase-up
	@$(MAKE) db-reset
	@$(MAKE) db-seed
dev-clean: clean ## Stop owned applications and remove disposable files; preserve database volumes
logs-backend: backend-logs ## Show bounded API logs
logs-worker: worker-logs ## Show bounded worker logs
logs-frontend: frontend-logs ## Show bounded frontend logs
logs-supabase: supabase-logs ## Show local Supabase endpoints and container log guidance
mail-up: ## Ensure the existing Supabase-owned Mailpit sink is available
	@scripts/mail.sh up
mail-down: ## Stop only the repository-owned Mailpit container
	@scripts/mail.sh down
mail-status: ## Require the local Mailpit UI and container to be healthy
	@scripts/mail.sh status
redis-up: ## Start the repository-owned local Redis service
	@scripts/redis.sh up
redis-down: ## Stop local Redis while preserving its named volume
	@scripts/redis.sh down
redis-status: ## Require a successful local Redis ping
	@scripts/redis.sh status
redis-logs: ## Show bounded local Redis logs
	@scripts/redis.sh logs

restart: dev

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
frontend-build: brand-check ## Build the production Web artifact
	@source scripts/env.sh && NODE_ENV=production npm run build --workspace=frontend
frontend-lint:
	@npm run lint --workspace=frontend
frontend-api-only-check: ## Reject Web demo data, direct Supabase, and non-HTTP service loaders
	@npm run check:api-only --workspace=frontend
frontend-typecheck:
	@npm run typecheck --workspace=frontend
frontend-test: ## Run Web unit and component tests
	@SHONGRE_ENV=test bash -c 'source scripts/env.sh && npm run test --workspace=frontend'
frontend-test-e2e: ## Run the real Playwright browser suite
	@SHONGRE_ENV=test scripts/e2e.sh $(E2E_ARGS)
web-push-keys: ## Print a fresh VAPID key pair for WEB_PUSH_VAPID_PUBLIC_KEY / WEB_PUSH_VAPID_PRIVATE_KEY
	@node -e 'const k=require("web-push").generateVAPIDKeys();console.log("WEB_PUSH_VAPID_PUBLIC_KEY="+k.publicKey);console.log("WEB_PUSH_VAPID_PRIVATE_KEY="+k.privateKey)'
test-web-database-mode: ## Run the browser journeys that assert the PostgreSQL repositories against the seeded local Supabase stack
	@SHONGRE_ENV=test SHONGRE_E2E_DATA_MODE=database scripts/e2e.sh $(E2E_ARGS)
e2e-triage: ## Run the browser suite and fail only on failures that are not already recorded
	@E2E_JSON_REPORT=$(CURDIR)/.runtime/e2e-report.json $(MAKE) frontend-test-e2e E2E_ARGS="$(E2E_ARGS)" || true
	@node scripts/e2e-triage.mjs --report $(CURDIR)/.runtime/e2e-report.json
e2e-baseline-update: ## Re-record the browser failures that exist on this tree
	@E2E_JSON_REPORT=$(CURDIR)/.runtime/e2e-report.json $(MAKE) frontend-test-e2e E2E_ARGS="$(E2E_ARGS)" || true
	@node scripts/e2e-triage.mjs --report $(CURDIR)/.runtime/e2e-report.json --update
e2e-triage-database: ## Run the database-mode browser suite and fail only on failures not recorded for that mode
	@E2E_JSON_REPORT=$(CURDIR)/.runtime/e2e-report.database.json $(MAKE) test-web-database-mode E2E_ARGS="$(E2E_ARGS)" || true
	@node scripts/e2e-triage.mjs --report $(CURDIR)/.runtime/e2e-report.database.json --baseline frontend/e2e/known-failures.database.json
e2e-baseline-update-database: ## Re-record the database-mode browser failures that exist on this tree
	@E2E_JSON_REPORT=$(CURDIR)/.runtime/e2e-report.database.json $(MAKE) test-web-database-mode E2E_ARGS="$(E2E_ARGS)" || true
	@node scripts/e2e-triage.mjs --report $(CURDIR)/.runtime/e2e-report.database.json --baseline frontend/e2e/known-failures.database.json --update
test-web-api-transport: ## Verify first-party Web sessions against an isolated test API and production Web build
	@SHONGRE_ENV=test SHONGRE_E2E_API_TRANSPORT=1 scripts/e2e.sh web-api-transport.spec.ts $(E2E_ARGS)
seo-check: ## Validate centralized SEO and GEO discovery governance
	@npm run check:seo --workspace=frontend
seo-audit: ## Audit a public origin (SEO_ORIGIN=https://example.test)
	@test -n "$(SEO_ORIGIN)" || { echo "SEO_ORIGIN is required"; exit 2; }
	@node frontend/scripts/seo-audit.mjs "$(SEO_ORIGIN)" $(SEO_AUDIT_ARGS)
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
	@SHONGRE_ENV=test bash -c 'source scripts/env.sh && npm run test --workspace=backend'
backend-check: backend-lint backend-test backend-build
	@npm run benchmark --workspace=backend
	@npm run check:boundary
contracts-lint contracts-typecheck:
	@npm run typecheck --workspace=@shongre/contracts
contracts-test:
	@SHONGRE_ENV=test bash -c 'source scripts/env.sh && npm run test --workspace=@shongre/contracts'
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
api-export: ## Export the canonical OpenAPI JSON as a generated YAML artifact
	@node backend/scripts/openapi/export-yaml.mjs
api-generate: openapi-generate ## Generate shared transport types, operations, and backend manifests
api-check: openapi-check contracts-typecheck openapi-breaking-check ## Verify contract validity, generated drift, compilation, and configured base comparison

api-schema: openapi-lint openapi-check ## Validate the canonical OpenAPI schema
api-types: openapi-generate openapi-check ## Regenerate and compile OpenAPI client contracts
release-manifest-check: ## Test digest, commit, OpenAPI, and migration manifest invariants
	@node scripts/release-manifest.test.mjs
deployment-config-check: ## Test deploy-file isolation, target binding, and permissions
	@node scripts/validate-deployment-env.test.mjs
operations-tooling-check: ## Test release evidence, hosted load, storage restore, and observability tooling
	@$(MAKE) capability-inventory-check
	@node scripts/production-readiness.test.mjs
	@node --import tsx scripts/load-smoke.test.mjs
	@APP_ENV=test node --import tsx scripts/database-performance-plan.test.mjs
	@node --import tsx scripts/verify-storage-restore.test.mjs
	@node --import tsx scripts/verify-image-transform.test.mjs
	@node --import tsx scripts/verify-observability.test.mjs
	@node scripts/check-runtime-hostnames.test.mjs
	@node --import tsx scripts/check-performance-contract.mjs
	@npm run local-fixtures:check

local-fixtures-sync: ## Refresh the versioned local database scenario and its media assets
	@npm run local-fixtures:sync

local-fixtures-check: ## Reject drift in the backend-owned local database scenario
	@npm run local-fixtures:check

capability-inventory-check: ## Reject stale generated counts in the capability matrix
	@node scripts/update-capability-inventory.mjs --check

capability-inventory-update: ## Refresh generated OpenAPI, migration, and test-file counts
	@node scripts/update-capability-inventory.mjs

##@ Shared product system
brand-sync: ## Synchronize approved runtime assets from the canonical SHONGRE. kit
	@npm run brand:sync

brand-check: ## Validate the canonical kit, runtime mappings, and public boundary
	@node --import tsx --test scripts/brand-kit-retint.test.ts
	@npm run brand:check
	@node scripts/check-brand-version-references.mjs
	@node --import tsx scripts/verify-brand-version-propagation.ts

brand-release: ## Derive a new immutable candidate kit (FROM_VERSION, VERSION, ORANGE; optional RELEASE_DATE)
	@test -n "$(FROM_VERSION)" || { echo "FROM_VERSION is required" >&2; exit 2; }
	@test -n "$(VERSION)" || { echo "VERSION is required" >&2; exit 2; }
	@test -n "$(ORANGE)" || { echo "ORANGE is required" >&2; exit 2; }
	@npm run brand:release -- --from "$(FROM_VERSION)" --to "$(VERSION)" --orange "$(ORANGE)" $(if $(RELEASE_DATE),--date "$(RELEASE_DATE)",)

brand-activate: ## Activate VERSION transactionally (usage: make brand-activate VERSION=vX.Y.Z)
	@test -n "$(VERSION)" || { echo "VERSION is required" >&2; exit 2; }
	@npm run brand:activate -- "$(VERSION)"

brand-activation-check: check cross-platform-check frontend-test-e2e ## Run all gates required by a brand switch

tokens-build:
	@npm run build --workspace=@shongre/design-tokens
tokens-check: tokens-build
	@npm run check:generated --workspace=@shongre/design-tokens
	@npm run test --workspace=@shongre/design-tokens
	@npm run check:tokens --workspace=frontend
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
	@SHONGRE_ENV=test bash -c 'source scripts/env.sh && npm run test --workspace=mobile'
mobile-api-only-check: ## Reject mobile demo architecture, direct Supabase, and unapproved network calls
	@npm run api-only --workspace=mobile
dead-code: ## Reject unreachable Web and backend source files
	@node scripts/dead-code-check.mjs
mobile-dead-code: ## Reject unreachable Expo source files
	@npm run dead-code --workspace=mobile
mobile-runtime-resolution-check:
	@npm run check:runtime-resolution --workspace=mobile
mobile-check: mobile-lint mobile-typecheck mobile-test mobile-api-only-check mobile-dead-code mobile-runtime-resolution-check expo-doctor mobile-production-env-check ## Validate Expo API-only architecture, source, types, tests, reachability, runtime resolution, and configuration

##@ Infrastructure & database
infra-check: ## Validate Dockerfiles, manifests, runbooks, and generated config
	@scripts/infra.sh check
	@node --test scripts/local-development-contract.test.mjs scripts/e2e-filter.test.mjs scripts/e2e-triage.test.mjs scripts/lib/merge-playwright-reports.test.mjs
supabase-up: ## Start the repository-owned local Supabase stack
	@scripts/supabase.sh up
supabase-down: ## Stop the repository-owned local Supabase stack
	@scripts/supabase.sh down
supabase-status: ## Show local Supabase service endpoints and status
	@scripts/supabase.sh status
supabase-health: ## Require the local Supabase stack to be healthy
	@scripts/supabase.sh health
supabase-logs: ## Show local Supabase endpoints and log guidance
	@scripts/supabase.sh logs
supabase-config: ## Render ignored local Supabase configuration from the root environment
	@scripts/supabase.sh config
docker-config: ## Render and validate the canonical Compose topology
	@scripts/compose.sh config
docker-build: ## Build both environment-agnostic runtime images locally
	@scripts/compose.sh build
docker-build-frontend: ## Build the environment-agnostic Web image locally
	@docker build -f frontend/Dockerfile -t shongre-frontend:local .
docker-build-backend: ## Build the shared API/worker/migrator image locally
	@docker build -f backend/Dockerfile -t shongre-backend:local .
docker-start: ## Start the loopback-only local container topology
	@scripts/compose.sh start
docker-stop: ## Stop only this checkout's local container topology
	@scripts/compose.sh stop
docker-up: docker-start ## Start the canonical local container topology
docker-down: docker-stop ## Stop the canonical local containers without deleting volumes
docker-restart: ## Restart the canonical local container topology
	@$(MAKE) docker-down
	@$(MAKE) docker-up

docker-status:
	@scripts/compose.sh status
	@$(MAKE) supabase-status
	@$(MAKE) mail-status
docker-health:
	@scripts/compose.sh health
	@$(MAKE) supabase-health
	@$(MAKE) mail-status
docker-logs:
	@scripts/compose.sh logs
docker-scan: ## Scan locally built runtime images for HIGH/CRITICAL findings
	@for image in shongre-frontend:local shongre-backend:local; do docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v shongre-trivy-cache:/root/.cache ghcr.io/aquasecurity/trivy:0.73.0@sha256:7cced7cae583819fc7806d4cbc0dbbc7cad18b99f7d3e235192e6da8c091045c image --scanners vuln --exit-code 1 --severity HIGH,CRITICAL "$$image"; done
docker-audit: ## Verify runtime users and absence of common secret/build files
	@scripts/image-audit.sh
tunnel-status: ## Show the environment's private cloudflared connector containers
	@scripts/tunnel.sh status
tunnel-health: ## Require an active cloudflared HA connection metric
	@scripts/tunnel.sh health
tunnel-logs: ## Show bounded connector logs without printing its token
	@scripts/tunnel.sh logs
production-config-check:
	@SHONGRE_ENV=production bash -c 'source scripts/env.sh && node scripts/production-readiness.mjs'
production-release-check:
	@SHONGRE_ENV=production bash -c 'source scripts/env.sh && node scripts/production-readiness.mjs --require-evidence'
backup-restore-test:
	@scripts/verify-backup-restore.sh
storage-restore-test: ## Verify a representative object from backup through an isolated restore target
	@node --import tsx scripts/verify-storage-restore.mjs
image-transform-check: ## Prove the hosted storage image transformer resizes a public object before enabling supabase_render
	@node --import tsx scripts/verify-image-transform.mjs
performance-smoke: ## Measure hosted API success-rate and p95 budgets and write release evidence
	@node --import tsx scripts/load-smoke.mjs
performance-db-plan: ## EXPLAIN a production-sized discovery shape in an isolated local PostgreSQL session
	@source scripts/env.sh && \
	  PERFORMANCE_DATABASE_URL="$${PERFORMANCE_DATABASE_URL:-postgresql://$${SUPABASE_HOST:-127.0.0.1}:$${SUPABASE_DB_PORT:-54322}/postgres}" \
	  PGHOST="$${PGHOST:-$${SUPABASE_HOST:-127.0.0.1}}" \
	  PGPORT="$${PGPORT:-$${SUPABASE_DB_PORT:-54322}}" \
	  PGUSER="$${PGUSER:-$$(node -e 'const u=process.env.DATABASE_URL;if(u)process.stdout.write(decodeURIComponent(new URL(u).username||""))')}" \
	  PGPASSWORD="$${PGPASSWORD:-$$(node -e 'const u=process.env.DATABASE_URL;if(u)process.stdout.write(decodeURIComponent(new URL(u).password||""))')}" \
	  node --import tsx scripts/database-performance-plan.mjs
performance-check: ## Reject drift in SLOs, budgets, cache policy, timeouts, and hot-query projections
	@node --import tsx scripts/check-performance-contract.mjs
observability-evidence: ## Prove request IDs and record confirmed drain, trace, alert, and on-call evidence
	@node --import tsx scripts/verify-observability.mjs
edge-functions-evidence: ## Prove only reviewed Supabase Edge Functions are deployed
	@node scripts/verify-edge-functions.mjs
secret-scan:
	@node scripts/scan-tracked-secrets.mjs
hostname-check: ## Reject environment-specific hostnames in runtime source
	@node scripts/check-runtime-hostnames.mjs
db-migrate: ## Apply ordered migrations to the explicitly configured database
	@scripts/database.sh migrate
db-diff: ## Print a local schema diff without mutating a hosted environment
	@scripts/database.sh diff
migrations-check: ## Validate migration ordering and contents without connecting to a database
	@scripts/database.sh check
db-seed: ## Load deterministic seed data into a proven local development database
	@scripts/database.sh seed
geo-backfill: ## Resolve missing listing coordinates so spatial search can find them; ARGS="--limit=100 --dry-run"
	@scripts/database.sh geo-backfill $(ARGS)
monetization-draft-import: ## Idempotently install the reviewed target commercial draft outside production
	@source scripts/env.sh && npm run db:seed:monetization-target --workspace=backend
taxonomy-db-dry-run: taxonomy-compile ## Diff the v1 import against a proven local database, then roll back
	@scripts/database.sh taxonomy-dry-run
taxonomy-db-import: taxonomy-compile ## Idempotently import v1 into a proven local database
	@scripts/database.sh taxonomy-import
taxonomy-db-test: ## Verify authorized taxonomy editing and publication against the local database
	@scripts/database.sh taxonomy-test
discovery-db-test: ## Verify vertical search publications and seller classification on the local database
	@scripts/database.sh discovery-test
taxonomy-migration-check: ## Verify canonical v1 migration and preserved history against the local database
	@scripts/database.sh taxonomy-migration-check
db-types: ## Regenerate canonical database types from local or explicitly linked Supabase
	@source scripts/env.sh && npm run db:types --workspace=backend
db-types-check: ## Reject generated database type drift against the migrated schema
	@source scripts/env.sh && npm run db:types:check --workspace=backend
db-reset: ## Reconstruct only the proven local Supabase development database
	@scripts/database.sh reset
db-shell: ## Open psql only against a proven local development database
	@scripts/database.sh shell
supabase-link:
	@source scripts/env.sh && scripts/render-supabase-config.sh && [[ -n "$${SUPABASE_PROJECT_REF:-}" ]] || { echo 'SUPABASE_PROJECT_REF is required'; exit 1; }; supabase link --workdir backend --project-ref "$$SUPABASE_PROJECT_REF"
supabase-pull:
	@source scripts/env.sh && scripts/render-supabase-config.sh && supabase db pull --workdir backend
supabase-push:
	@source scripts/env.sh && scripts/render-supabase-config.sh && supabase db push --workdir backend

##@ Diagnostics
ports: ## Show configured ports, availability, and listener ownership
	@scripts/ports.sh
check-ports: ports
free-port:
	@source scripts/env.sh && [[ -n "$${PORT:-}" ]] || { echo 'Usage: make free-port PORT=xxxx'; exit 2; }; scripts/free-port.sh "$$PORT"
free-app-ports free-ports:
	@source scripts/env.sh && scripts/free-port.sh "$$FRONTEND_PORT" frontend && scripts/free-port.sh "$$BACKEND_PORT" backend && scripts/free-port.sh "$$EXPO_METRO_PORT" metro && scripts/free-port.sh "$$EXPO_WEB_PORT" expo-web

##@ Quality gates
lint: openapi-check ui-lint frontend-lint backend-lint mobile-lint dead-code mobile-dead-code contracts-typecheck ## Run established static and architecture linters
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
	@SHONGRE_ENV=test bash -c 'source scripts/env.sh && npm run test:integration --workspace=backend'
geo-rate-limit-test: ## Prove the shared geocoding budget against the repository-owned local Redis
	@SHONGRE_ENV=test bash -c 'source scripts/env.sh && GEOCODING_RATE_LIMIT_TEST=local npm run test --workspace=backend -- tests/integration/geocoding-rate-limiter-redis.test.ts'
api-rate-limit-test: ## Prove the shared API request budget against the repository-owned local Redis
	@SHONGRE_ENV=test bash -c 'source scripts/env.sh && API_RATE_LIMIT_TEST=local npm run test --workspace=backend -- tests/integration/api-rate-limiter-redis.test.ts'
test-critical: ## Run focused marketplace security, auth, listing, money, and compliance tests
	@SHONGRE_ENV=test bash -c 'source scripts/env.sh && npm run test:critical --workspace=backend'
	@SHONGRE_ENV=test bash -c 'source scripts/env.sh && npm run test:critical --workspace=frontend'
	@SHONGRE_ENV=test bash -c 'source scripts/env.sh && npm run test:critical --workspace=@shongre/shared'
test-e2e: frontend-test-e2e ## Run all configured Playwright engines
test-coverage:
	@SHONGRE_ENV=test bash -c 'source scripts/env.sh && npm run test --workspace=frontend -- --coverage'
	@SHONGRE_ENV=test bash -c 'source scripts/env.sh && npm run test --workspace=backend -- --coverage'
	@SHONGRE_ENV=test bash -c 'source scripts/env.sh && npm run test --workspace=mobile -- --coverage'
i18n-check: ## Validate locale catalogues and untranslated-surface regression budgets
	@npm run check:i18n --workspace=frontend
taxonomy-import: ## Import TAXONOMY_WORKBOOK into the reviewed normalized v1 source and generated projections
	@test -n "$(TAXONOMY_WORKBOOK)" || (echo 'TAXONOMY_WORKBOOK is required.' >&2; exit 1)
	@npm run taxonomy:import -- "$(TAXONOMY_WORKBOOK)"
taxonomy-compile: ## Regenerate taxonomy v1 bundles and local seed SQL from the normalized backend source
	@npm run taxonomy:compile
taxonomy-check: ## Validate taxonomy v1 source drift, generated projections, and Web publication coverage
	@npm run taxonomy:check
	@npm run check:taxonomy --workspace=frontend
providers-check: ## Run safe mocked provider adapters and fail-closed provider tests
	@SHONGRE_ENV=test bash -c 'source scripts/env.sh && npm run test:providers --workspace=backend'
analytics-check: ## Validate analytics privacy, consent, services, migration, and API contracts
	@SHONGRE_ENV=test bash -c 'source scripts/env.sh && npm run test --workspace=frontend -- src/analytics src/services/analytics.service.test.ts'
	@SHONGRE_ENV=test bash -c 'source scripts/env.sh && npm run test --workspace=backend -- tests/unit/analytics-service.test.ts tests/unit/search-console-worker.test.ts tests/rls/analytics-migration.test.ts tests/rls/commission-earned-analytics-migration.test.ts tests/contracts/analytics-openapi.test.ts'
	@$(MAKE) migrations-check
	@$(MAKE) openapi-check
crm-check: ## Run focused CRM contracts, services, RLS, SSRF, and HTTP-adapter tests
	@SHONGRE_ENV=test bash -c 'source scripts/env.sh && npm run test:crm --workspace=backend'
	@SHONGRE_ENV=test bash -c 'source scripts/env.sh && npm run test:crm --workspace=frontend'
marketing-check: ## Run focused Marketing consent, audience, campaign, RLS, provider, and demo tests
	@SHONGRE_ENV=test bash -c 'source scripts/env.sh && npm run test:marketing --workspace=backend'
	@SHONGRE_ENV=test bash -c 'source scripts/env.sh && npm run test:marketing --workspace=frontend'
	@npm run openapi:check
contracts: contracts-check ## Validate stable public client/backend contracts
generate: brand-sync tokens-build taxonomy-compile db-types openapi-generate ## Regenerate deterministic brand assets, taxonomy, tokens, database types, and API clients
repository-hygiene-check: ## Reject tracked caches, logs, build output, backups, and temporary artifacts
	@npm run check:repository-hygiene
check: env env-check env-matrix-check migrations-check release-manifest-check deployment-config-check operations-tooling-check repository-hygiene-check format-check brand-check tokens-check lint typecheck test frontend-build backend-build infra-check secret-scan hostname-check ## Run the deterministic pre-commit and pre-PR gate
	@npm run check:boundary
check-all: check test-critical cross-platform-check test-e2e test-web-api-transport test-web-database-mode ## Run exhaustive local validation including browsers and critical subsets
	@npm audit --audit-level=high
ci: env
	@npm ci
	@$(MAKE) check
build: ui-build frontend-build backend-build mobile-typecheck ## Build all local production artifacts without publishing

##@ Deployment
deploy: ## Dispatch protected deployment; ENVIRONMENT=dev|staging|prod is required
	@scripts/deploy.sh deploy "$${ENVIRONMENT:-}"
deploy-dev: ## Dispatch the current commit through the protected development pipeline
	@scripts/deploy.sh deploy development
deploy-staging: ## Dispatch the current commit through the protected staging pipeline
	@scripts/deploy.sh deploy staging
deploy-prod: ## Dispatch a main-branch commit through the protected production pipeline
	@scripts/deploy.sh deploy production
rollback: ## Roll back by digest; usage: make rollback ENVIRONMENT=staging RELEASE_SHA=<full-sha>
	@[[ "$${RELEASE_SHA:-}" =~ ^[0-9a-f]{40}$$ ]] || { echo 'RELEASE_SHA must be a full known-good commit SHA'; exit 2; }; RELEASE_SHA="$$RELEASE_SHA" scripts/deploy.sh rollback "$${ENVIRONMENT:-}"
remote-health: ## Verify a deployed target; usage: make remote-health ENVIRONMENT=staging
	@scripts/remote-health.sh "$${ENVIRONMENT:-}"
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
	@SHONGRE_ENV=production bash -c 'source scripts/env.sh && node mobile/scripts/release-check.mjs production-env'
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
