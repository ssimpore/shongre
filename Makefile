.DEFAULT_GOAL := help
.PHONY: help install dev dev-frontend frontend-dev dev-backend backend-dev \
        dev-api-demo dev-db \
        free-port free-port-frontend frontend-free-port free-port-backend backend-free-port \
        env frontend-env backend-env \
        build build-frontend frontend-build build-backend backend-build preview \
        test test-frontend frontend-test test-backend backend-test test-watch frontend-test-watch backend-test-watch \
        backend-test-unit backend-test-contracts test-contracts backend-test-integration backend-test-rls backend-test-security \
        benchmark benchmark-backend backend-benchmark \
        lint lint-frontend frontend-lint lint-backend backend-lint \
        check check-frontend frontend-check check-backend backend-check check-boundary \
        clean clean-frontend frontend-clean clean-backend backend-clean \
        db-migrate backend-db-migrate db-seed backend-db-seed db-types backend-db-types \
        backend-docker-build docker-build-backend backend-docker-run docker-run-backend \
        ai-test info frontend-info backend-info cli

# Read PORT from frontend/.env, or default to 3000
PORT ?= $(shell grep -E '^(FRONTEND_PORT|PORT)=' frontend/.env 2>/dev/null | head -n 1 | cut -d '=' -f2 | tr -d ' "' || echo 3000)
ifeq ($(strip $(PORT)),)
PORT := 3000
endif

# Read BACKEND_PORT from backend/.env, or default to 4000
BACKEND_PORT ?= $(shell grep -E '^(BACKEND_PORT|PORT)=' backend/.env 2>/dev/null | head -n 1 | cut -d '=' -f2 | tr -d ' "' || echo 4000)
ifeq ($(strip $(BACKEND_PORT)),)
BACKEND_PORT := 4000
endif

# ANSI color codes
CYAN    := \033[36m
GREEN   := \033[32m
YELLOW  := \033[33m
MAGENTA := \033[35m
RESET   := \033[0m
BOLD    := \033[1m

## help: Display this help menu with all available make commands
help:
	@echo ""
	@echo "$(CYAN)$(BOLD)========================================================================$(RESET)"
	@echo "$(CYAN)$(BOLD)              SHONGRE PLATFORM - UNIFIED MAKE AUTOMATION                $(RESET)"
	@echo "$(CYAN)$(BOLD)========================================================================$(RESET)"
	@echo ""
	@echo "$(BOLD)Usage:$(RESET) make $(GREEN)<target>$(RESET)"
	@echo ""
	@echo "$(MAGENTA)$(BOLD)🚀 Development & Servers:$(RESET)"
	@printf "  $(GREEN)%-30s$(RESET) %s (Ports: $(YELLOW)%s$(RESET) & $(YELLOW)%s$(RESET))\n" "dev" "Start BOTH Frontend & Backend concurrently" "$(PORT)" "$(BACKEND_PORT)"
	@printf "  $(GREEN)%-30s$(RESET) %s\n" "dev-api-demo" "Run Frontend in API mode against Backend in Demo mode"
	@printf "  $(GREEN)%-30s$(RESET) %s\n" "dev-db" "Run Frontend in API mode against Backend in PostgreSQL mode"
	@printf "  $(GREEN)%-30s$(RESET) %s (Port: $(YELLOW)%s$(RESET))\n" "frontend-dev (dev-frontend)" "Start Frontend Vite dev server only" "$(PORT)"
	@printf "  $(GREEN)%-30s$(RESET) %s (Port: $(YELLOW)%s$(RESET))\n" "backend-dev (dev-backend)" "Start Backend HTTP API dev server only" "$(BACKEND_PORT)"
	@printf "  $(GREEN)%-30s$(RESET) %s (Ports: $(YELLOW)%s$(RESET), $(YELLOW)%s$(RESET))\n" "free-port" "Free both Frontend and Backend ports" "$(PORT)" "$(BACKEND_PORT)"
	@printf "  $(GREEN)%-30s$(RESET) %s (Port: $(YELLOW)%s$(RESET))\n" "frontend-free-port" "Free Frontend port (3000)" "$(PORT)"
	@printf "  $(GREEN)%-30s$(RESET) %s (Port: $(YELLOW)%s$(RESET))\n" "backend-free-port" "Free Backend port (4000)" "$(BACKEND_PORT)"
	@printf "  $(GREEN)%-30s$(RESET) %s\n" "env" "Initialize both frontend/.env and backend/.env from examples"
	@printf "  $(GREEN)%-30s$(RESET) %s\n" "install" "Install all npm dependencies across monorepo"
	@echo ""
	@echo "$(MAGENTA)$(BOLD)🧪 Testing & Quality Assurance:$(RESET)"
	@printf "  $(GREEN)%-30s$(RESET) %s\n" "test" "Execute all unit & integration test suites (both)"
	@printf "  $(GREEN)%-30s$(RESET) %s\n" "frontend-test (test-frontend)" "Run frontend Vitest test suite"
	@printf "  $(GREEN)%-30s$(RESET) %s\n" "backend-test (test-backend)" "Run all backend Vitest test suites"
	@printf "  $(GREEN)%-30s$(RESET) %s\n" "backend-test-contracts" "Run repository dual-mode contract test suite"
	@printf "  $(GREEN)%-30s$(RESET) %s\n" "frontend-test-watch (test-watch)" "Run frontend tests in interactive watch mode"
	@printf "  $(GREEN)%-30s$(RESET) %s\n" "backend-test-watch" "Run backend tests in interactive watch mode"
	@printf "  $(GREEN)%-30s$(RESET) %s\n" "backend-test-unit" "Run backend unit tests (escrow, lifecycle, KYC)"
	@printf "  $(GREEN)%-30s$(RESET) %s\n" "backend-test-integration" "Run backend REST API integration tests"
	@printf "  $(GREEN)%-30s$(RESET) %s\n" "backend-test-rls" "Run Supabase Row Level Security policy tests"
	@printf "  $(GREEN)%-30s$(RESET) %s\n" "backend-test-security" "Run boundary protection & secret isolation tests"
	@printf "  $(GREEN)%-30s$(RESET) %s\n" "backend-benchmark (benchmark)" "Execute backend computation & latency SLA benchmarks"
	@echo ""
	@echo "$(MAGENTA)$(BOLD)🔍 Linting & CI Pipelines:$(RESET)"
	@printf "  $(GREEN)%-30s$(RESET) %s\n" "lint" "Run TypeScript type checks on both frontend and backend"
	@printf "  $(GREEN)%-30s$(RESET) %s\n" "frontend-lint (lint-frontend)" "Run TypeScript check on frontend (tsc --noEmit)"
	@printf "  $(GREEN)%-30s$(RESET) %s\n" "backend-lint (lint-backend)" "Run TypeScript check on backend (tsc --noEmit)"
	@printf "  $(GREEN)%-30s$(RESET) %s\n" "check" "Run complete CI pipeline (frontend + backend + boundary)"
	@printf "  $(GREEN)%-30s$(RESET) %s\n" "frontend-check (check-frontend)" "Run complete frontend CI pipeline (lint + test + build)"
	@printf "  $(GREEN)%-30s$(RESET) %s\n" "backend-check (check-backend)" "Run complete backend CI pipeline (lint + test + build + perf)"
	@printf "  $(GREEN)%-30s$(RESET) %s\n" "check-boundary" "Verify backend secrets do not leak into frontend"
	@echo ""
	@echo "$(MAGENTA)$(BOLD)📦 Build & Clean:$(RESET)"
	@printf "  $(GREEN)%-30s$(RESET) %s\n" "build" "Compile production bundle for both frontend and backend"
	@printf "  $(GREEN)%-30s$(RESET) %s\n" "frontend-build (build-frontend)" "Compile frontend production bundle (Vite)"
	@printf "  $(GREEN)%-30s$(RESET) %s\n" "backend-build (build-backend)" "Compile backend TypeScript and resolve path aliases"
	@printf "  $(GREEN)%-30s$(RESET) %s\n" "preview" "Locally preview the production frontend build"
	@printf "  $(GREEN)%-30s$(RESET) %s\n" "clean" "Clean build artifacts (dist/ across monorepo)"
	@printf "  $(GREEN)%-30s$(RESET) %s\n" "frontend-clean (clean-frontend)" "Clean only frontend build artifacts"
	@printf "  $(GREEN)%-30s$(RESET) %s\n" "backend-clean (clean-backend)" "Clean only backend build artifacts"
	@echo ""
	@echo "$(MAGENTA)$(BOLD)🗄️ Database & Supabase:$(RESET)"
	@printf "  $(GREEN)%-30s$(RESET) %s\n" "db-migrate (backend-db-migrate)" "Validate and run Supabase SQL migrations"
	@printf "  $(GREEN)%-30s$(RESET) %s\n" "db-seed (backend-db-seed)" "Seed database with taxonomy, users & market data"
	@printf "  $(GREEN)%-30s$(RESET) %s\n" "db-types (backend-db-types)" "Generate TypeScript database types into backend/generated/"
	@echo ""
	@echo "$(MAGENTA)$(BOLD)🐳 Docker & Production:$(RESET)"
	@printf "  $(GREEN)%-30s$(RESET) %s\n" "backend-docker-build" "Build production Docker container image"
	@printf "  $(GREEN)%-30s$(RESET) %s\n" "backend-docker-run" "Run backend container locally on port $(BACKEND_PORT)"
	@echo ""
	@echo "$(MAGENTA)$(BOLD)ℹ️ Utilities & Diagnostics:$(RESET)"
	@printf "  $(GREEN)%-30s$(RESET) %s\n" "info" "Display full platform runtime status & configuration"
	@printf "  $(GREEN)%-30s$(RESET) %s\n" "frontend-info" "Display frontend status & configuration"
	@printf "  $(GREEN)%-30s$(RESET) %s\n" "backend-info" "Display backend status, endpoints & port"
	@printf "  $(GREEN)%-30s$(RESET) %s\n" "ai-test" "Run Gemini AI generation & anti-fraud safety audit"
	@printf "  $(GREEN)%-30s$(RESET) %s\n" "cli" "Run the Shongre Node.js CLI interactive assistant"
	@echo ""

# ==============================================================================
# 🚀 Development & Server Management
# ==============================================================================

## free-port: Free both frontend and backend ports configured in .env
free-port: frontend-free-port backend-free-port

## frontend-free-port: Free frontend port configured in .env
free-port-frontend: frontend-free-port
frontend-free-port:
	@node frontend/bin/shongre.js free-port

## backend-free-port: Free backend port configured in .env
free-port-backend: backend-free-port
backend-free-port:
	@node backend/scripts/maintenance/free-port.js 2>/dev/null || \
	(if command -v lsof >/dev/null 2>&1; then \
		PIDS=$$(lsof -ti :$(BACKEND_PORT) 2>/dev/null); \
		if [ -n "$$PIDS" ]; then \
			echo "$(YELLOW)⚡ Backend port $(BACKEND_PORT) is occupied. Killing PID(s): $$PIDS...$(RESET)"; \
			kill -9 $$PIDS 2>/dev/null || true; \
			echo "$(GREEN)✔ Backend port $(BACKEND_PORT) successfully freed.$(RESET)"; \
		else \
			echo "$(GREEN)✔ Backend port $(BACKEND_PORT) is free.$(RESET)"; \
		fi \
	fi)

## env: Initialize both frontend/.env and backend/.env from examples if missing
env: frontend-env backend-env

## frontend-env: Initialize frontend .env file from template if missing
frontend-env:
	@if [ ! -f frontend/.env ]; then \
		if [ -f frontend/.env.example ]; then cp frontend/.env.example frontend/.env && echo "$(GREEN)✔ Created frontend/.env from .env.example$(RESET)"; fi \
	else \
		echo "$(YELLOW)ℹ frontend/.env already exists.$(RESET)"; \
	fi

## backend-env: Initialize backend .env file from template if missing
backend-env:
	@if [ ! -f backend/.env ]; then \
		cp backend/.env.example backend/.env; \
		echo "$(GREEN)✔ Created backend/.env from .env.example$(RESET)"; \
	else \
		echo "$(YELLOW)ℹ backend/.env already exists.$(RESET)"; \
	fi

## dev: Free ports and start BOTH Frontend and Backend concurrently
dev: free-port
	@echo "$(CYAN)$(BOLD)🚀 Starting Shongre Full Stack (Frontend :$(PORT), Backend :$(BACKEND_PORT))...$(RESET)\n"
	@npx concurrently -k -n "FRONTEND,BACKEND" -c "cyan.bold,green.bold" \
		"cd frontend && npm run dev" \
		"cd backend && npm run dev"

## dev-api-demo: Run Frontend in API mode against Backend in Demo mode
dev-api-demo: free-port
	@echo "$(CYAN)$(BOLD)🚀 Starting Shongre (Frontend: API Mode, Backend: Demo Mode)...$(RESET)\n"
	@npx concurrently -k -n "FRONTEND,BACKEND" -c "cyan.bold,green.bold" \
		"cd frontend && VITE_DATA_MODE=api VITE_API_URL=http://localhost:$(BACKEND_PORT)/api/v1 npm run dev" \
		"cd backend && BACKEND_DATA_MODE=demo npm run dev"

## dev-db: Run Frontend in API mode against Backend in Database mode (Supabase Local)
dev-db: free-port
	@echo "$(CYAN)$(BOLD)🚀 Starting Shongre (Frontend: API Mode, Backend: PostgreSQL Mode)...$(RESET)\n"
	@npx concurrently -k -n "FRONTEND,BACKEND" -c "cyan.bold,green.bold" \
		"cd frontend && VITE_DATA_MODE=api VITE_API_URL=http://localhost:$(BACKEND_PORT)/api/v1 npm run dev" \
		"cd backend && BACKEND_DATA_MODE=database npm run dev"

## frontend-dev: Start Frontend Vite dev server only (auto-frees port)
dev-frontend: frontend-dev
frontend-dev: frontend-free-port
	@node frontend/bin/shongre.js dev

## backend-dev: Start Backend API dev server only (auto-frees port)
dev-backend: backend-dev
backend-dev: backend-free-port
	cd backend && npm run dev

## install: Install all dependencies across monorepo
install:
	npm install

# ==============================================================================
# 🧪 Testing & Quality Assurance
# ==============================================================================

## test: Run automated tests across both frontend and backend
test: frontend-test backend-test

## frontend-test: Run frontend automated tests (Vitest)
test-frontend: frontend-test
frontend-test:
	cd frontend && npm run test

## backend-test: Run all backend automated tests (Vitest)
test-backend: backend-test
backend-test:
	cd backend && npm run test

## backend-test-contracts: Run repository contract tests across dual modes
test-contracts: backend-test-contracts
backend-test-contracts:
	cd backend && npm run test:contracts

## frontend-test-watch: Run frontend tests in interactive watch mode
test-watch: frontend-test-watch
frontend-test-watch:
	cd frontend && npx vitest

## backend-test-watch: Run backend tests in interactive watch mode
backend-test-watch:
	cd backend && npm run test:watch

## backend-test-unit: Run backend unit tests only
backend-test-unit:
	cd backend && npm run test:unit

## backend-test-integration: Run backend REST API integration tests
backend-test-integration:
	cd backend && npm run test:integration

## backend-test-rls: Run Supabase Row Level Security policy tests
backend-test-rls:
	cd backend && npm run test:rls

## backend-test-security: Run backend architecture boundary & security tests
backend-test-security:
	cd backend && npm run test:security

## backend-benchmark: Run computation and routing latency benchmarks
benchmark: backend-benchmark
benchmark-backend: backend-benchmark
backend-benchmark:
	cd backend && npm run benchmark

# ==============================================================================
# 🔍 Linting & CI Pipelines
# ==============================================================================

## lint: Check TypeScript types across both frontend and backend
lint: frontend-lint backend-lint

## frontend-lint: Run TypeScript type check on frontend
lint-frontend: frontend-lint
frontend-lint:
	cd frontend && npm run lint

## backend-lint: Run TypeScript type check on backend
lint-backend: backend-lint
backend-lint:
	cd backend && npm run lint

## check-boundary: Verify architecture boundary integrity
check-boundary:
	@if [ -f backend/scripts/maintenance/check-boundary.js ]; then node backend/scripts/maintenance/check-boundary.js; fi

## frontend-check: Run complete quality pipeline for frontend (lint -> test -> build)
check-frontend: frontend-check
frontend-check:
	@node frontend/bin/shongre.js check

## backend-check: Run complete quality pipeline for backend (lint -> test -> build -> benchmark -> boundary)
check-backend: backend-check
backend-check: backend-lint backend-test backend-build backend-benchmark check-boundary
	@echo "\n$(GREEN)$(BOLD)✔ All backend quality checks and benchmarks passed successfully!$(RESET)\n"

## check: Run full CI quality checks across entire monorepo
check:
	@node frontend/bin/shongre.js check
	@if [ -f backend/package.json ]; then cd backend && npm run test && npm run build; fi
	@$(MAKE) check-boundary

# ==============================================================================
# 📦 Build & Clean
# ==============================================================================

## build: Build both frontend and backend for production
build: frontend-build backend-build

## frontend-build: Build frontend for production
build-frontend: frontend-build
frontend-build:
	cd frontend && npm run build

## backend-build: Build backend for production
build-backend: backend-build
backend-build:
	cd backend && npm run build

## preview: Preview frontend production build locally
preview:
	cd frontend && npm run preview

## clean: Remove dist and build artifacts across monorepo
clean: frontend-clean backend-clean

## frontend-clean: Clean only frontend build artifacts
clean-frontend: frontend-clean
frontend-clean:
	cd frontend && npm run clean

## backend-clean: Clean only backend build artifacts
backend-clean:
	@if [ -d backend/dist ]; then rm -rf backend/dist && echo "$(GREEN)✔ Cleaned backend/dist/$(RESET)"; fi

# ==============================================================================
# 🗄️ Database & Supabase Operations
# ==============================================================================

## backend-db-migrate: Run database SQL migrations
db-migrate: backend-db-migrate
backend-db-migrate:
	cd backend && npm run db:migrate

## backend-db-seed: Seed database with canonical dataset
db-seed: backend-db-seed
backend-db-seed:
	cd backend && npm run db:seed

## backend-db-types: Generate database TypeScript types
db-types: backend-db-types
backend-db-types:
	cd backend && npm run db:types

# ==============================================================================
# 🐳 Docker Containerization
# ==============================================================================

## backend-docker-build: Build production Docker container image
docker-build-backend: backend-docker-build
backend-docker-build:
	docker build -t shongre-backend:latest ./backend

## backend-docker-run: Run backend Docker container locally
docker-run-backend: backend-docker-run
backend-docker-run: backend-free-port
	docker run --rm -p $(BACKEND_PORT):$(BACKEND_PORT) --env-file backend/.env shongre-backend:latest

# ==============================================================================
# ℹ️ Utilities & Diagnostics
# ==============================================================================

## info: Show full platform environment information
info: frontend-info backend-info

## frontend-info: Display frontend status and configuration
frontend-info:
	@node frontend/bin/shongre.js info

## backend-info: Display backend API status and configuration
backend-info:
	@echo ""
	@echo "$(CYAN)$(BOLD)======================================================$(RESET)"
	@echo "$(CYAN)$(BOLD)         SHONGRE BACKEND CORE CONFIGURATION           $(RESET)"
	@echo "$(CYAN)$(BOLD)======================================================$(RESET)"
	@echo "  • Service Port : $(GREEN)$(BACKEND_PORT)$(RESET) (configured in backend/.env)"
	@echo "  • Data Mode    : $(YELLOW)$(shell grep -E '^BACKEND_DATA_MODE=' backend/.env 2>/dev/null | cut -d '=' -f2 || echo 'demo')$(RESET)"
	@echo "  • Node Engine  : $(shell node -v 2>/dev/null || echo 'Unknown')"
	@echo "  • Health Route : $(CYAN)http://localhost:$(BACKEND_PORT)/health$(RESET)"
	@echo "  • API Base URL : $(CYAN)http://localhost:$(BACKEND_PORT)/api/v1$(RESET)"
	@echo "  • Tests Suites : 9 test suites (unit, contracts, integration, rls, security)"
	@echo ""

## ai-test: Run Gemini AI tests
ai-test:
	@node frontend/bin/shongre.js ai-test

## cli: Open the platform CLI
cli:
	@node frontend/bin/shongre.js help
