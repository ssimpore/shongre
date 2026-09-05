# SHONGRE. brand assets

## Canonical source and versioning

`brand/shongre/brand.config.json` is the sole selector for the released
directory that is the canonical source of truth. Its `activeVersion` resolves
to one immutable `brand/shongre/vX.Y.Z/` kit containing the complete supplied
logo, icon, Web, iOS, Android, social, print, token, documentation, and preview
package. The selected kit's `CHECKSUMS.sha256`
protects every source file other than the checksum file itself, while
`VERSION.txt` identifies that release. Application code must never select a
version independently.

Do not edit a released version in place. A future release belongs in a new
`brand/shongre/vX.Y.Z/` directory. The ZIP is an import artifact, not a second
source of truth, and is not committed once the checked and extracted version is
present.

The official signature is `SHONGRE.`: uppercase, with exactly one final period.
In full color, the period is Shongre Orange. Canonical palette values come only
from the selected kit's `08_Design_Tokens/brand-tokens.json`; documentation,
tests, and application code must not restate them. `brand-check` decodes every
orange logo, icon, favicon, PWA, iOS, and Android
master and requires its dominant opaque saturated warm pixel to equal the
canonical orange token. Resampling and antialiased edge pixels are deliberately
excluded from that comparison; they are blends, not alternate brand swatches.

## Generated runtime subset

`scripts/brand-assets.config.ts` is the single typed runtime mapping. It reads
and schema-validates `brand.config.json`, then generates identity, Web, Expo,
native, document, and token adapters so application code does not repeat asset
paths or versions. Run:

```bash
make brand-sync
make brand-check
```

To validate and activate a release as one transaction, run:

```bash
npm run brand:activate -- vX.Y.Z
# equivalent Make entry point
make brand-activate VERSION=vX.Y.Z
```

Before changing the selector, activation validates the candidate directory,
semantic version, `VERSION.txt`, token identity/schema, full checksum and
manifest coverage, required source contract, JSON/XML, image dimensions, and
iOS opacity. It snapshots the selector and every managed output, synchronizes
the candidate, then runs `brand-activation-check`: repository lint, type checks,
unit/integration tests, production builds, cross-platform checks, Playwright
responsive/visual behavior, and accessibility. Any sync or verification failure
restores the previous selector and byte-identical generated outputs. A missing,
corrupt, incomplete, or incompatible candidate is rejected before current state
is touched. Concurrent activations are rejected by an ignored `.runtime` lock.

`brand-sync` validates the source checksums before copying anything. It is
idempotent, creates missing directories, writes a checksummed generated-file
inventory at `scripts/generated/brand-assets.manifest.json`, and removes only
paths recorded in its previous generated inventory. It never changes the
canonical kit and never deletes unrelated assets.

`brand-check` verifies the active configuration, `ASSET_MANIFEST.csv`, complete
checksum coverage, required dimensions, iOS opacity, Android background opacity
and 66 dp critical safe-zone bounds, mapping and registry freshness, generated
inventory, configuration references, source JSON/XML/CSS, approved component
variants, token ownership, obsolete references, unmanaged duplicate kit files,
Docker boundaries, and the absence of unmanaged print or documentation assets
from the public or Expo runtime trees.

The current destinations are:

| Consumer            | Generated destination                                              | Source scope                                                             |
| ------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Web metadata        | `frontend/public/favicon*`, `frontend/public/apple-touch-icon.png` | Prepared Web favicons and touch icon                                     |
| Web UI              | `frontend/public/brand/shongre/logo/`, `icon/`, and `pwa/`         | Approved logo layouts, standalone variants, and the header-safe PWA icon |
| Web sharing/PWA     | `frontend/public/brand/shongre/social/` and `pwa/`                 | 1200×630 Open Graph images and 192/512 any/maskable icons                |
| Identity registry   | `packages/brand/src/active.generated.ts`                           | Typed signature, selected version, and cache key                         |
| Design system       | `packages/design-tokens/src/brand.generated.js`                    | Canonical palette from the version-matched token document                |
| Web registry        | `@shongre/brand/web`                                               | Typed metadata, UI, PWA, SEO, and sharing paths and intrinsic sizes      |
| Standalone invoices | `@shongre/brand/document`                                          | Embedded 240 px approved horizontal logo                                 |
| Expo registry       | `mobile/brand-assets.generated.json`                               | Expo and native-plugin paths                                             |
| Expo UI             | `mobile/src/brand-images.generated.ts` and `mobile/assets/brand/`  | Static Metro image registry plus runtime artwork                         |

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
The generated registry appends the selected kit version to every logo, icon,
favicon, PWA, and Open Graph URL. Changing `activeVersion` therefore invalidates
browser/CDN caches without changing authored application paths. Never use a
horizontal, stacked, or wordmark logo in favicon metadata.

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
`--brand-surface-subtle`. A private typed recipe computes every orange UI role —
accessible primary, hover, active, disabled, border, focus, subtle surface,
inverse, fill, and approved orange category accents — from the single generated
Shongre Orange input plus official Ink and White. Official orange does not
provide AA contrast for normal white text, so filled controls use the derived
accessible primary while identity artwork retains the selected kit's exact
canonical swatch. Functional status, chart, unrelated category, country-flag,
and provider colors are not
reclassified as brand colors. `make tokens-check` rejects independently authored
orange aliases and performs an in-memory one-token mutation proof.

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
3. Preserve the canonical file contract used by
   `scripts/brand-assets.config.ts`. If supplier filenames changed, add reviewed
   compatibility exports to the new kit; activation must remain data-only.
4. Run `npm run brand:activate -- vX.Y.Z`. Do not edit generated files.
5. Review `brand.config.json`, the generated inventory, cache keys, and diff.
6. Visually review light/dark Web headers, mobile widths, authentication,
   favicon/PWA/share images, invoices, and native icon masks.
7. Roll back immediately with
   `npm run brand:activate -- v<previous-version>`; the same preflight and gates
   apply, and no manual copying is required.
8. Remove the old version only in a later explicit cleanup after released
   consumers and rollback procedures no longer reference it.
