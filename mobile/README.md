# Shongre mobile application

## API-only runtime

Mobile uses the Shongre `/api/v1` contract in local, test, preview,
development, staging, and production. `EXPO_PUBLIC_API_URL` is mandatory and
must contain the prefix exactly once. Runtime routes call typed services, and
those services use the central authenticated HTTP client; there are no mobile
demo adapters, fixture repositories, demo credentials, data-mode switches, or
API-failure fallbacks. Local connected development is
`mobile → backend API → database-mode backend → local Supabase`.

Tests mock HTTP at the transport boundary or exercise an isolated local API.
Run `make mobile-api-only-check` to enforce the boundary. Supabase credentials,
tables, RPCs, and Auth remain backend-only. A backend-issued, short-lived signed
HTTPS upload URL is supported only by the dedicated credential-free upload
transport.

## Brand assets

Expo consumes the generated subset in `mobile/assets/brand/` through
`brand-assets.generated.json` and `src/brand-images.generated.ts`. The config
plugin at `mobile/plugins/with-brand-assets.cjs` installs the approved iOS
app-icon set and Android legacy/adaptive/themed resources during prebuild. Never
edit those generated files or the ignored native projects as a source of truth.
Add a compatible versioned kit under `brand/shongre/`, then run
`npm run brand:activate -- vX.Y.Z`. The command validates the complete kit before
updating `brand.config.json`, regenerates these adapters, runs the Web/native
quality gates, and restores the previous brand if any check fails. Validate a
manual selector edit with `make brand-sync`, `make brand-check`, and
`make mobile-prebuild-clean`. Full platform and upgrade guidance is in
[`docs/architecture/brand-assets.md`](../docs/architecture/brand-assets.md).
