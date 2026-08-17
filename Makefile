.DEFAULT_GOAL := help
.PHONY: help install dev dev-backend free-port build preview test test-backend test-watch lint check check-boundary clean ai-test info cli db-migrate db-seed db-types

# Read PORT from frontend/.env, or default to 3000
PORT ?= $(shell grep -E '^PORT=' frontend/.env 2>/dev/null | cut -d '=' -f2 | tr -d ' "' || echo 3000)
ifeq ($(strip $(PORT)),)
PORT := 3000
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
	@echo "$(CYAN)$(BOLD)======================================================$(RESET)"
	@echo "$(CYAN)$(BOLD)       SHONGRE PLATFORM - MAKEFILE AUTOMATION         $(RESET)"
	@echo "$(CYAN)$(BOLD)======================================================$(RESET)"
	@echo ""
	@echo "$(BOLD)Usage:$(RESET) make $(GREEN)<target>$(RESET)"
	@echo ""
	@echo "$(MAGENTA)$(BOLD)Development & Server:$(RESET)"
	@printf "  $(GREEN)%-18s$(RESET) %s (Port: $(YELLOW)%s$(RESET))\n" "dev" "Start Vite dev server (auto-frees port from .env)" "$(PORT)"
	@printf "  $(GREEN)%-18s$(RESET) %s\n" "dev-backend" "Start backend HTTP API server in development mode"
	@printf "  $(GREEN)%-18s$(RESET) %s (Port: $(YELLOW)%s$(RESET))\n" "free-port" "Kill any process occupying port configured in .env" "$(PORT)"
	@printf "  $(GREEN)%-18s$(RESET) %s\n" "install" "Install all npm dependencies across monorepo"
	@echo ""
	@echo "$(MAGENTA)$(BOLD)Testing & Quality Assurance:$(RESET)"
	@printf "  $(GREEN)%-18s$(RESET) %s\n" "test" "Execute all unit test suites (frontend & backend)"
	@printf "  $(GREEN)%-18s$(RESET) %s\n" "test-backend" "Execute backend Vitest test suite"
	@printf "  $(GREEN)%-18s$(RESET) %s\n" "test-watch" "Run Vitest in interactive watch mode"
	@printf "  $(GREEN)%-18s$(RESET) %s\n" "lint" "Run TypeScript type checks on frontend and backend"
	@printf "  $(GREEN)%-18s$(RESET) %s\n" "check-boundary" "Verify backend secrets and contracts do not leak into frontend"
	@printf "  $(GREEN)%-18s$(RESET) %s\n" "check" "Run complete quality pipeline (lint + test + build + boundary)"
	@printf "  $(GREEN)%-18s$(RESET) %s\n" "ai-test" "Run Gemini AI generation & anti-fraud safety audit tests"
	@echo ""
	@echo "$(MAGENTA)$(BOLD)Database & Supabase:$(RESET)"
	@printf "  $(GREEN)%-18s$(RESET) %s\n" "db-migrate" "Execute Supabase SQL migrations from backend/supabase/migrations/"
	@printf "  $(GREEN)%-18s$(RESET) %s\n" "db-seed" "Seed database with initial taxonomy, demo users & market data"
	@printf "  $(GREEN)%-18s$(RESET) %s\n" "db-types" "Generate TypeScript database types into backend/generated/"
	@echo ""
	@echo "$(MAGENTA)$(BOLD)Build & Production:$(RESET)"
	@printf "  $(GREEN)%-18s$(RESET) %s\n" "build" "Compile production bundle for frontend and backend"
	@printf "  $(GREEN)%-18s$(RESET) %s\n" "preview" "Locally preview the production build"
	@printf "  $(GREEN)%-18s$(RESET) %s\n" "clean" "Clean build artifacts (dist/ directory)"
	@echo ""
	@echo "$(MAGENTA)$(BOLD)Utilities & Information:$(RESET)"
	@printf "  $(GREEN)%-18s$(RESET) %s\n" "info" "Display platform runtime information & environment status"
	@printf "  $(GREEN)%-18s$(RESET) %s\n" "cli" "Run the Shongre Node.js CLI interactive assistant"
	@echo ""

## free-port: Free the port configured in .env
free-port:
	@node frontend/bin/shongre.js free-port

## dev: Free the configured port from .env and start the Vite dev server
dev:
	@node frontend/bin/shongre.js dev

## dev-backend: Start the backend API server
dev-backend:
	cd backend && npm run dev

## install: Install all dependencies in frontend and backend
install:
	npm install

## build: Build the frontend and backend applications for production
build:
	cd frontend && npm run build
	@if [ -f backend/package.json ]; then cd backend && npm run build; fi

## preview: Preview the production build locally
preview:
	cd frontend && npm run preview

## test: Run automated tests across frontend and backend
test:
	cd frontend && npm run test
	@if [ -f backend/package.json ]; then cd backend && npm run test; fi

## test-backend: Run backend automated tests
test-backend:
	cd backend && npm run test

## test-watch: Run tests in watch mode
test-watch:
	cd frontend && npx vitest

## lint: Check TypeScript types
lint:
	cd frontend && npm run lint
	@if [ -f backend/package.json ]; then cd backend && npm run lint; fi

## check-boundary: Verify architecture boundary integrity
check-boundary:
	@if [ -f backend/scripts/maintenance/check-boundary.js ]; then node backend/scripts/maintenance/check-boundary.js; fi

## check: Run full CI quality checks (lint -> test -> build -> check-boundary)
check:
	@node frontend/bin/shongre.js check
	@if [ -f backend/package.json ]; then cd backend && npm run test && npm run build; fi
	@$(MAKE) check-boundary

## clean: Remove dist and build artifacts
clean:
	cd frontend && npm run clean
	@if [ -d backend/dist ]; then rm -rf backend/dist; fi

## db-migrate: Run database migrations
db-migrate:
	cd backend && npm run db:migrate

## db-seed: Seed database
db-seed:
	cd backend && npm run db:seed

## db-types: Generate database types
db-types:
	cd backend && npm run db:types

## ai-test: Run Gemini AI tests
ai-test:
	@node frontend/bin/shongre.js ai-test

## info: Show platform environment information
info:
	@node frontend/bin/shongre.js info

## cli: Open the platform CLI
cli:
	@node frontend/bin/shongre.js help

