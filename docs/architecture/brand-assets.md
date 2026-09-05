# SHONGRE. brand assets

## Canonical source and versioning

`brand/shongre/v1.0.0/` is the immutable source of truth for the approved
SHONGRE. visual identity. It contains the complete supplied logo, icon, Web,
iOS, Android, social, print, token, documentation, and preview package. Its
`CHECKSUMS.sha256` protects every source file other than the checksum file
itself, and `VERSION.txt` identifies the active version.

Do not edit a released version in place. A future release belongs in a new
`brand/shongre/vX.Y.Z/` directory. The ZIP is an import artifact, not a second
source of truth, and is not committed once the checked and extracted version is
present.

The official signature is `SHONGRE.`: uppercase, with exactly one final period.
In full color, the period is Shongre Orange. The canonical colors are Shongre
Orange `#FF6500`, Shongre Ink `#172033`, White `#FFFFFF`, and Mist `#F7F8FA`.

## Generated runtime subset

`scripts/brand-assets.config.ts` is the single runtime mapping. Run:

```bash
make brand-sync
make brand-check
```

`brand-sync` validates the source checksums before copying anything. It is
idempotent, creates missing directories, writes a checksummed generated-file
inventory at `scripts/generated/brand-assets.manifest.json`, and removes only
paths recorded in its previous inventory or the explicit superseded-generator
allowlist. It never changes the canonical kit and never deletes unrelated
assets.

`brand-check` verifies the active version and complete checksum coverage,
required dimensions, iOS opacity, Android background opacity and 66 dp critical
safe-zone bounds, mapping freshness, generated inventory, configuration
references, source JSON/XML/CSS, approved component variants, token ownership,
obsolete references, Docker boundaries, and the absence of unmanaged print or
documentation assets from the public tree.

The current destinations are:

| Consumer            | Generated destination                                              | Source scope                                                             |
| ------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Web metadata        | `frontend/public/favicon*`, `frontend/public/apple-touch-icon.png` | Prepared Web favicons and touch icon                                     |
| Web UI              | `frontend/public/brand/shongre/logo/`, `icon/`, and `pwa/`         | Approved logo layouts, standalone variants, and the header-safe PWA icon |
| Web sharing/PWA     | `frontend/public/brand/shongre/social/` and `pwa/`                 | 1200×630 Open Graph images and 192/512 any/maskable icons                |
| Design system       | `packages/design-tokens/src/brand.generated.js`                    | Canonical JSON brand palette                                             |
| Standalone invoices | `packages/brand/src/document.generated.ts`                         | Embedded 240 px approved horizontal logo                                 |
| Expo                | `mobile/assets/brand/`                                             | Store icon, splash logo, favicon, adaptive layers, and native resources  |

Files in those destinations are generated. Change the central mapping or the
next canonical kit version, not the copies.

## Public and internal boundaries

Only the curated `frontend/public` subset is exposed by the Web deployment.
The canonical `brand/` tree, social masters in `06_Social`, print files in
`07_Print`, documentation in `09_Documentation`, previews in `10_Previews`, and
all unused platform exports remain internal. Frontend and backend Dockerfiles
copy the synchronized runtime output through their existing application/package
trees; they do not copy `brand/` into build or runtime images.
The root `.dockerignore` also excludes the canonical kit from build contexts;
the synchronized files inside `frontend/`, `mobile/`, and `packages/` remain
available to their normal builds.

Do not place the complete kit in application source, `frontend/public`, an Expo
bundle, a Docker image, or a deployment artifact. Do not use repository
symlinks for brand delivery.

## Web usage

Next.js App Router metadata in `frontend/app/layout.tsx` owns favicon, Apple
touch icon, default Open Graph/Twitter image, and environment-aware
`metadataBase`. `frontend/app/manifest.ts` owns the PWA name, orange theme,
white background, and any/maskable icons. Product-specific Open Graph rendering
resolves the configured application origin before loading approved artwork; no
production hostname is embedded in source.

Favicons use only the standalone SHONGRE monogram at prepared 16, 32, 48, 64,
and 96 px sizes, with the multi-resolution ICO as a compatibility fallback.
Metadata appends the kit version as a cache key so browsers do not retain an
obsolete wordmark favicon. Never use a horizontal, stacked, or wordmark logo in
favicon metadata.

Use `BrandLogo`, `BrandIcon`, and `BrandHeaderSignature` from the existing Web
design system. Their variant/layout/size unions are deliberately closed. The
header signature composes the synchronized 192 px PWA icon and approved primary
wordmark at independently governed sizes. It uses the approved square mask-safe
PWA icon with the `radius-sm` presentation mask, producing restrained 4 px
corners while keeping the monogram inside its approved safe zone. An optional
market label belongs beneath the wordmark rather than beneath the combined
icon-and-wordmark width. The primitives preserve intrinsic aspect ratios and
clear space, offer decorative empty-alt behavior, and reserve eager loading for
above-the-fold use. Do not expose arbitrary color, stretching, shadow, or
inline-path overrides.

Use primary artwork on light backgrounds and reverse or monochrome-white
artwork on dark backgrounds. The marketplace footer uses the same separately
sized `BrandHeaderSignature` lockup as the header, pairing the shared mask-safe
icon and `radius-sm` treatment with the approved reverse wordmark. This keeps
the orange icon and terminal period visible without allowing radius drift;
standalone primary `BrandIcon` consumers use that same source and radius.
Reserve monochrome white for contexts that cannot reproduce color. Use semantic
design tokens for surrounding UI, and never use orange for long body text on
white. Authentication routes inherit the shared focused shell; main navigation,
footers, admin permission surfaces, solution shells, newsletter previews,
error/loading guards, structured data, and invoice documents use the same
primitives or generated document asset.

## Design tokens

The kit JSON generates a narrow adapter; `packages/design-tokens/` remains the
only application token system. It maps the official palette to
`--brand-primary`, `--brand-ink`, `--brand-background`, and
`--brand-surface-subtle`. The darker `--brand-primary-hover` and existing
interactive primary states are centralized derived colors: official orange
does not provide AA contrast for normal white text, so it is not used as a
white-text button background. Functional status, chart, category, and provider
colors are not reclassified as brand colors.

## iOS, Android, and Expo

The existing mobile app is Expo/React Native with generated native projects.
`mobile/app.config.ts` references the supplied opaque 1024×1024 iOS icon, the
Play Store icon, splash artwork, and Android adaptive foreground, background,
and monochrome layers. The orange background comes from the shared token
adapter.

During Expo prebuild, `with-brand-assets.cjs` copies the synchronized
`AppIcon.appiconset` to the generated Xcode asset catalog and installs the
density-specific Android launchers, adaptive XML, 432 px (108 dp at xxxhdpi)
layers, and themed monochrome resource. iOS applies its own mask; never add
rounded corners or shadows. Android launchers must be reviewed through circle,
squircle, rounded-square, and standard masks. The supplied dark and tinted iOS
masters are synchronized for a future minimum-target/configuration decision but
are not declared as alternates while the app still supports iOS 16.4.

The native `mobile/ios` and `mobile/android` directories are ignored generated
output, not places to maintain assets. Validate integration with:

```bash
make mobile-prebuild-clean
make mobile-check
```

## Social, print, documents, and email

For social publishing, select the prepared asset in `06_Social` and verify each
platform crop immediately before publication. Only the generic Open Graph pair
mapped from `03_Web` is served by the app.

Use the horizontal primary logo for light documents and the approved reverse
or one-color variant for constrained backgrounds/printing. The current HTML
invoice paths embed a generated approved PNG so downloads remain self-contained.
Provider-managed transactional-email templates should use an approved runtime
asset hosted on the configured environment origin; never use a hardcoded
production domain or attach the complete kit.

Compatibility SVG, PDF, and EPS files may embed approved raster artwork and are
not necessarily editable Bézier vectors. For signage, embroidery, engraving,
vehicle graphics, very large formats, or trademark masters, commission a manual
vector redraw and compare it with the approved PNG master before replacing any
canonical file.

## Accessibility and logo governance

- Use alt text `SHONGRE.` when the logo identifies the destination or brand.
- Use empty alt text and `aria-hidden` only when adjacent content already names
  the brand.
- Preserve at least one quarter of the monogram height as clear space.
- Keep the horizontal signature at least 120 px wide and the icon at least
  24 px in digital UI.
- Never retype, lowercase, recolor, crop, distort, shadow, or separate the
  orange period from the full-color signature.

## Upgrade procedure

1. Extract the approved release to `brand/shongre/vX.Y.Z/` after checking for
   unsafe paths/symlinks and verifying its supplier checksums.
2. Keep the preceding version until all consumers and rollback evidence have
   migrated; do not mutate it.
3. Update `BRAND_VERSION` and source filenames only in
   `scripts/brand-assets.config.ts`.
4. Run `make brand-sync`, then review the generated inventory and diff.
5. Run `make brand-check`, `make ui-check`, `make cross-platform-check`, the
   production Web build, Expo prebuild validation, and applicable Docker build.
6. Visually review light/dark Web headers, mobile widths, authentication,
   favicon/PWA/share images, invoices, and native icon masks.
7. Remove the old version only in a later explicit cleanup after released
   consumers and rollback procedures no longer reference it.
