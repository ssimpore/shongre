# Shongre mobile application

## Brand assets

Expo consumes the generated subset in `mobile/assets/brand/`. The config plugin
at `mobile/plugins/with-brand-assets.cjs` installs the approved iOS app-icon set
and Android legacy/adaptive/themed resources during prebuild. Never edit those
generated files or the ignored native projects as a source of truth. Update the
versioned kit under `brand/shongre/`, run `make brand-sync`, then validate with
`make brand-check` and `make mobile-prebuild-clean`. Full platform and upgrade
guidance is in [`docs/architecture/brand-assets.md`](../docs/architecture/brand-assets.md).
