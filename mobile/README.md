# Shongre mobile application

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
