.DEFAULT_GOAL := help
SHELL := /bin/bash

.PHONY: help setup doctor info env-init env-check install reinstall \
	dev dev-web dev-mobile dev-all start stop stop-all restart status health logs \
	web web-dev frontend-dev frontend-start frontend-build frontend-lint frontend-typecheck frontend-test frontend-test-e2e frontend-check frontend-clean frontend-logs \
	backend backend-dev backend-start backend-build backend-lint backend-typecheck backend-test backend-check backend-health backend-logs \
	contracts-lint contracts-typecheck contracts-test contracts-check \
	tokens-check tokens-build ui-check ui-test ui-lint ui-typecheck ui-build shared-check cross-platform-check \
	mobile mobile-dev mobile-start mobile-stop mobile-status mobile-health mobile-web expo expo-start expo-clear expo-doctor ios ios-run ios-open ios-clean android android-run android-open android-clean mobile-prebuild mobile-prebuild-clean mobile-lint mobile-typecheck mobile-test mobile-check \
	infra infra-start infra-stop infra-restart infra-status infra-health infra-logs infra-config infra-check infra-validate \
	db-start db-stop db-status db-health db-migrate db-seed db-reset db-types supabase-start supabase-stop supabase-status supabase-reset supabase-migrate supabase-seed supabase-types supabase-link supabase-pull supabase-push \
	ports check-ports free-app-ports free-ports free-port \
	lint lint-fix format format-check typecheck test test-unit test-integration test-e2e test-coverage check ci build \
	clean clean-deps clean-all reset audit outdated \
	eas-doctor ios-preview-build android-preview-build ios-production-build android-production-build eas-build-ios eas-build-android eas-build-all submit-ios submit-android \
	privacy-check permissions-check sdk-audit version version-check version-bump-patch version-bump-minor version-bump-major reviewer-access-check association-files deep-links-check mobile-identifiers-check mobile-production-env-check release-content-check ios-sdk-check ios-privacy-check ios-permissions-check ios-entitlements-check ios-signing-check ios-store-check ios-release-check android-sdk-check android-data-safety-check android-permissions-check android-16kb-check android-signing-check android-store-check android-release-check release-check store-check

define env_run
	@source scripts/env.sh && $(1)
endef

help: ## Show the categorized developer CLI
	@printf '\nShongre developer CLI\n\n'
	@printf 'Setup & diagnostics\n'
	@printf '  %-30s %s\n' 'make setup' 'Initialize env and install the npm workspace'
	@printf '  %-30s %s\n' 'make doctor' 'Check required and optional local tools'
	@printf '  %-30s %s\n' 'make env-check' 'Validate environment and port conflicts'
	@printf '  %-30s %s\n' 'make ports' 'Show configured ports and their owners'
	@printf '\nDevelopment\n'
	@printf '  %-30s %s\n' 'make dev' 'Run backend + web with tracked cleanup'
	@printf '  %-30s %s\n' 'make dev-mobile' 'Run backend + one Expo Metro server'
	@printf '  %-30s %s\n' 'make dev-all' 'Run backend + web + Expo Metro'
	@printf '  %-30s %s\n' 'make ios / make android' 'Run the Expo application on a native target'
	@printf '  %-30s %s\n' 'make stop-all' 'Stop only tracked Shongre processes'
	@printf '\nQuality\n'
	@printf '  %-30s %s\n' 'make check' 'Lint, typecheck, test, build, and check boundaries'
	@printf '  %-30s %s\n' 'make mobile-check' 'Validate the Expo source and compatibility'
	@printf '  %-30s %s\n' 'make ui-check' 'Validate tokens, shared UI, Web, and Expo consumers'
	@printf '  %-30s %s\n' 'make cross-platform-check' 'Verify shared propagation across Web, iOS, and Android'
	@printf '  %-30s %s\n' 'make infra-check' 'Validate generated infrastructure configuration'
	@printf '\nStore & release\n'
	@printf '  %-30s %s\n' 'make store-check' 'Run evidence-based Apple/Google preflight'
	@printf '  %-30s %s\n' 'make ios-preview-build' 'Build an iOS preview with EAS; never submits'
	@printf '  %-30s %s\n' 'make android-preview-build' 'Build an Android preview with EAS; never submits'
	@printf '  %-30s %s\n' 'make ios-production-build' 'Build an iOS candidate; never submits'
	@printf '  %-30s %s\n' 'make android-production-build' 'Build an Android candidate; never submits'
	@printf '  %-30s %s\n' 'make submit-ios / submit-android' 'Explicit submission after preflight'
	@printf '\nRun make info for runtime values. Host ports come from .env, never this Makefile.\n\n'

# Setup and environment -------------------------------------------------------
setup: env-init install doctor

env-init:
	@if [[ ! -e .env ]]; then cp .env.example .env && echo 'Created .env from .env.example'; else echo '.env already exists; left unchanged'; fi
	@source scripts/env.sh && scripts/render-supabase-config.sh

env-check:
	@scripts/env-check.sh

doctor:
	@scripts/doctor.sh

info: env-check
	@source scripts/env.sh && printf 'Environment: %s\nWeb:         http://%s:%s\nBackend:     http://%s:%s%s\nMetro:       http://%s:%s\nData modes:  web=%s backend=%s mobile=%s\n' "$$APP_ENV" "$$FRONTEND_HOST" "$$FRONTEND_PORT" "$$BACKEND_HOST" "$$BACKEND_PORT" "$$API_PREFIX" "$$EXPO_HOST" "$$EXPO_METRO_PORT" "$$VITE_DATA_MODE" "$$BACKEND_DATA_MODE" "$$EXPO_PUBLIC_DATA_MODE"

install:
	@npm install

reinstall: clean-deps install

# Tracked development processes ----------------------------------------------
dev: dev-web
dev-web:
	@scripts/dev.sh web
dev-mobile:
	@scripts/dev.sh mobile
dev-all:
	@scripts/dev.sh all
start: dev

web web-dev frontend-dev:
	@scripts/service.sh foreground frontend auto -- npm run dev --workspace=frontend

frontend-start:
	@scripts/service.sh foreground frontend auto -- npm run preview --workspace=frontend

backend backend-dev:
	@scripts/service.sh foreground backend auto -- npm run dev --workspace=backend

backend-start: backend-build
	@scripts/service.sh foreground backend auto -- node backend/dist/index.js

mobile mobile-dev mobile-start expo expo-start:
	@source scripts/env.sh && scripts/service.sh foreground metro "$$EXPO_METRO_PORT" -- npm run start --workspace=mobile -- --port "$$EXPO_METRO_PORT"
mobile-stop:
	@source scripts/env.sh && scripts/service.sh stop metro "$$EXPO_METRO_PORT"

stop stop-all:
	@source scripts/env.sh && scripts/service.sh stop frontend "$$FRONTEND_PORT" || true
	@source scripts/env.sh && scripts/service.sh stop backend "$$BACKEND_PORT" || true
	@source scripts/env.sh && scripts/service.sh stop metro "$$EXPO_METRO_PORT" || true

restart: stop-all dev

status mobile-status:
	@scripts/status.sh

health mobile-health backend-health:
	@scripts/health.sh

logs:
	@for service_name in frontend backend metro; do echo "== $$service_name =="; scripts/service.sh logs "$$service_name" auto; done

frontend-logs:
	@scripts/service.sh logs frontend auto
backend-logs:
	@scripts/service.sh logs backend auto

# Web and backend quality -----------------------------------------------------
frontend-build:
	@source scripts/env.sh && npm run build --workspace=frontend
frontend-lint frontend-typecheck:
	@npm run lint --workspace=frontend
frontend-test:
	@npm run test --workspace=frontend
frontend-test-e2e:
	@source scripts/env.sh && npm run test:e2e --workspace=frontend
frontend-check:
	@source scripts/env.sh && SKIP_E2E="$${SKIP_E2E:-0}" npm run check --workspace=frontend
frontend-clean:
	@npm run clean --workspace=frontend

backend-build:
	@npm run build --workspace=backend
backend-lint backend-typecheck:
	@npm run lint --workspace=backend
backend-test:
	@npm run test --workspace=backend
backend-check: backend-lint backend-test backend-build
	@npm run benchmark --workspace=backend
	@npm run check:boundary
contracts-lint contracts-typecheck:
	@npm run typecheck --workspace=@shongre/contracts
contracts-test:
	@npm run test --workspace=@shongre/contracts
contracts-check: contracts-typecheck contracts-test

# Cross-platform product system ----------------------------------------------
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
ui-check: tokens-check ui-lint ui-typecheck ui-test ui-build frontend-typecheck frontend-build mobile-typecheck expo-doctor
cross-platform-check: ui-check contracts-check shared-check
	@node scripts/check-cross-platform-ui.mjs
	@source scripts/env.sh && npm exec --workspace=mobile -- expo install --check
	@node mobile/scripts/release-check.mjs ios-sdk
	@node mobile/scripts/release-check.mjs android-sdk

# Mobile development and native layers ---------------------------------------
mobile-web:
	@source scripts/env.sh && npm run web --workspace=mobile -- --port "$$EXPO_WEB_PORT"
expo-clear:
	@source scripts/env.sh && npm run start --workspace=mobile -- --clear --port "$$EXPO_METRO_PORT"
expo-doctor:
	@source scripts/env.sh && npm exec --workspace=mobile -- expo-doctor
ios ios-run:
	@source scripts/env.sh && npm run ios --workspace=mobile
ios-open:
	@open mobile/ios 2>/dev/null || { echo 'mobile/ios is generated by make mobile-prebuild'; exit 1; }
ios-clean:
	@[[ ! -d mobile/ios/build ]] || rm -rf mobile/ios/build
android android-run:
	@source scripts/env.sh && npm run android --workspace=mobile
android-open:
	@open -a 'Android Studio' mobile/android 2>/dev/null || { echo 'Android Studio or mobile/android unavailable'; exit 1; }
android-clean:
	@[[ ! -d mobile/android/.gradle ]] || rm -rf mobile/android/.gradle
	@[[ ! -d mobile/android/app/build ]] || rm -rf mobile/android/app/build
mobile-prebuild:
	@source scripts/env.sh && npm exec --workspace=mobile -- expo prebuild --no-install
mobile-prebuild-clean:
	@source scripts/env.sh && npm exec --workspace=mobile -- expo prebuild --clean --no-install
mobile-lint:
	@npm run lint --workspace=mobile
mobile-typecheck:
	@npm run typecheck --workspace=mobile
mobile-test:
	@npm run test --workspace=mobile
mobile-check: mobile-lint mobile-test expo-doctor mobile-production-env-check

# Infrastructure and data -----------------------------------------------------
infra infra-start:
	@scripts/infra.sh start
infra-stop:
	@scripts/infra.sh stop
infra-restart: infra-stop infra-start
infra-status db-status supabase-status:
	@scripts/infra.sh status
infra-health db-health:
	@scripts/infra.sh health
infra-logs:
	@scripts/infra.sh logs
infra-config:
	@scripts/infra.sh config
infra-check infra-validate:
	@scripts/infra.sh check
db-start supabase-start: infra-start
db-stop supabase-stop: infra-stop
db-migrate supabase-migrate:
	@npm run db:migrate --workspace=backend
db-seed supabase-seed:
	@npm run db:seed --workspace=backend
db-types supabase-types:
	@npm run db:types --workspace=backend
db-reset supabase-reset:
	@source scripts/env.sh && [[ "$$APP_ENV" == 'development' ]] || { echo 'Refusing database reset outside APP_ENV=development'; exit 1; }; command -v supabase >/dev/null && scripts/render-supabase-config.sh && supabase db reset --workdir backend
supabase-link:
	@source scripts/env.sh && [[ -n "$${SUPABASE_PROJECT_REF:-}" ]] || { echo 'SUPABASE_PROJECT_REF is required'; exit 1; }; supabase link --workdir backend --project-ref "$$SUPABASE_PROJECT_REF"
supabase-pull:
	@supabase db pull --workdir backend
supabase-push:
	@supabase db push --workdir backend

# Port safety -----------------------------------------------------------------
ports check-ports:
	@scripts/ports.sh
free-port:
	@source scripts/env.sh && [[ -n "$${PORT:-}" ]] || { echo 'Usage: make free-port PORT=xxxx'; exit 2; }; scripts/free-port.sh "$$PORT"
free-app-ports free-ports:
	@source scripts/env.sh && scripts/free-port.sh "$$FRONTEND_PORT" frontend && scripts/free-port.sh "$$BACKEND_PORT" backend && scripts/free-port.sh "$$EXPO_METRO_PORT" metro && scripts/free-port.sh "$$EXPO_WEB_PORT" expo-web

# Repository quality ----------------------------------------------------------
lint: ui-lint frontend-lint backend-lint mobile-lint contracts-typecheck
lint-fix:
	@echo 'No unsafe global autofix is configured; use package-local focused fixes.'
format:
	@npm exec -- prettier --write 'frontend/{app,src,scripts}/**/*.{ts,tsx,js,mjs,json,md}' 'backend/{src,scripts,tests,docs}/**/*.{ts,tsx,js,mjs,json,md}' 'backend/package.json' 'backend/tsconfig.json' 'mobile/{app,src,scripts,tests,store}/**/*.{ts,tsx,js,mjs,json,md}' 'mobile/app.config.ts' 'mobile/eas.json' 'mobile/eslint.config.js' 'mobile/metro.config.js' 'mobile/package.json' 'mobile/tsconfig.json' 'mobile/vitest.config.ts' 'packages/**/*.{ts,tsx,js,mjs,json,md}' 'scripts/**/*.{js,mjs,md}' 'docs/**/*.md' '.github/**/*.{yml,yaml,md}' 'package.json' 'README.md'
format-check:
	@npm exec -- prettier --check 'frontend/{app,src,scripts}/**/*.{ts,tsx,js,mjs,json,md}' 'backend/{src,scripts,tests,docs}/**/*.{ts,tsx,js,mjs,json,md}' 'backend/package.json' 'backend/tsconfig.json' 'mobile/{app,src,scripts,tests,store}/**/*.{ts,tsx,js,mjs,json,md}' 'mobile/app.config.ts' 'mobile/eas.json' 'mobile/eslint.config.js' 'mobile/metro.config.js' 'mobile/package.json' 'mobile/tsconfig.json' 'mobile/vitest.config.ts' 'packages/**/*.{ts,tsx,js,mjs,json,md}' 'scripts/**/*.{js,mjs,md}' 'docs/**/*.md' '.github/**/*.{yml,yaml,md}' 'package.json' 'README.md'
typecheck: ui-typecheck frontend-typecheck backend-typecheck mobile-typecheck contracts-typecheck
test: ui-test frontend-test backend-test mobile-test contracts-test
test-unit: test
test-integration:
	@npm run test:integration --workspace=backend
test-e2e: frontend-test-e2e
test-coverage:
	@npm run test --workspace=frontend -- --coverage
	@npm run test --workspace=backend -- --coverage
	@npm run test --workspace=mobile -- --coverage
check: env-init env-check tokens-check lint test frontend-build backend-build infra-check
	@npm run check:boundary
ci: env-init
	@npm ci
	@$(MAKE) format-check check
build: ui-build frontend-build backend-build mobile-typecheck

# Safe cleanup ----------------------------------------------------------------
clean: stop-all
	@[[ ! -d frontend/.next ]] || rm -rf frontend/.next
	@[[ ! -d frontend/out ]] || rm -rf frontend/out
	@[[ ! -d backend/dist ]] || rm -rf backend/dist
	@[[ ! -d mobile/.expo ]] || rm -rf mobile/.expo
	@[[ ! -d .runtime ]] || rm -rf .runtime
clean-deps: stop-all
	@for dependency_dir in node_modules frontend/node_modules backend/node_modules mobile/node_modules packages/*/node_modules; do [[ ! -d "$$dependency_dir" ]] || rm -rf "$$dependency_dir"; done
clean-all: clean clean-deps
reset: clean install env-check
audit:
	@npm audit
outdated:
	@npm outdated || true

# Versions, store checks, builds, and explicit submissions --------------------
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
store-check: check mobile-check
	@$(MAKE) mobile-prebuild-clean
	@node mobile/scripts/release-check.mjs store

eas-doctor:
	@npm exec --workspace=mobile -- eas-cli@latest -- doctor
ios-preview-build:
	@$(MAKE) store-check && npm exec --workspace=mobile -- eas-cli@latest -- build --platform ios --profile preview
android-preview-build:
	@$(MAKE) store-check && npm exec --workspace=mobile -- eas-cli@latest -- build --platform android --profile preview
ios-production-build eas-build-ios:
	@$(MAKE) store-check && npm exec --workspace=mobile -- eas-cli@latest -- build --platform ios --profile production
android-production-build eas-build-android:
	@$(MAKE) store-check && npm exec --workspace=mobile -- eas-cli@latest -- build --platform android --profile production
eas-build-all:
	@$(MAKE) store-check && npm exec --workspace=mobile -- eas-cli@latest -- build --platform all --profile production
submit-ios:
	@$(MAKE) store-check && npm exec --workspace=mobile -- eas-cli@latest -- submit --platform ios --profile production
submit-android:
	@$(MAKE) store-check && npm exec --workspace=mobile -- eas-cli@latest -- submit --platform android --profile production
