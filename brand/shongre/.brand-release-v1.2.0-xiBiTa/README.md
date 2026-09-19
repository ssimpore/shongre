# Shongre Brand Kit

Version 1.2.0 - 19 September 2026

This package contains the approved Shongre visual identity for web, iOS,
Android, social media, presentations, documents, and print production.

## Primary signature

- Brand name: `SHONGRE.`
- Primary color: Shongre Orange `#FF5722`
- Primary ink: Shongre Ink `#172033`
- Reverse color: White `#FFFFFF`
- The final period is always orange in the full-color wordmark.

## Start here

1. Read `09_Documentation/Shongre_Brand_Guidelines.pdf` or the Word version.
2. Use `01_Logo/Master/shongre-logo-horizontal-primary.png` as the default logo.
3. Use `02_Icon/Master/shongre-icon-1024.png` when only the icon is needed.
4. Use the prepared files under `03_Web`, `04_iOS`, `05_Android`, or
   `06_Social` instead of resizing an asset manually.

## Package map

- `01_Logo`: horizontal, stacked, wordmark-only, monochrome, reverse, and
  raster exports.
- `02_Icon`: standalone icon masters and color variants.
- `03_Web`: favicons, PWA icons, Apple touch icon, header logos, and Open Graph
  images.
- `04_iOS`: Xcode-ready `AppIcon.appiconset` plus dark and tinted alternatives.
- `05_Android`: density-specific legacy icons, adaptive-icon layers and XML,
  Play Store icon, and feature graphic.
- `06_Social`: ready-sized profile and cover images for major networks plus
  generic share/story assets.
- `07_Print`: 300 dpi RGB, approximate CMYK, grayscale, PDF, and EPS-ready
  artwork.
- `08_Design_Tokens`: JSON, CSS, Android XML, and iOS color tokens.
- `09_Documentation`: detailed brand guidelines in DOCX, PDF, and Markdown.
- `10_Previews`: quick visual reference sheets.
- `ASSET_MANIFEST.csv`: file inventory, dimensions, media types, and SHA-256
  hashes.
- `CHECKSUMS.sha256`: package integrity checksums.

## File formats

- PNG: preferred for transparent logos and app icons.
- WebP: preferred for lightweight web delivery where supported.
- JPG: use only on fixed light or dark backgrounds.
- SVG compatibility wrappers: self-contained browser-compatible files that
  embed the approved high-resolution raster artwork. They preserve appearance
  but are not editable vector paths.
- PDF/EPS/TIFF: supplied for print handoff. The CMYK TIFF is an approximate
  conversion and should be proofed by the print provider against its ICC
  profile before production.

## Important production note

The approved artwork originated as high-resolution raster artwork. The SVG,
PDF, and EPS compatibility files preserve that artwork but do not turn it into
native Bézier paths. For trademark masters, vehicle livery, signage, embroidery,
or very large-format output, commission a manual vector redraw and compare it
against the PNG masters before replacing these files.

## Platform references

- Apple app-icon guidance: https://developer.apple.com/design/human-interface-guidelines/app-icons
- Android adaptive-icon guidance: https://developer.android.com/develop/ui/compose/system/icon_design_adaptive
- X profile/header guidance: https://help.x.com/en/managing-your-account/common-issues-when-uploading-profile-photo

Platform rules change. Reconfirm store and network specifications immediately
before a new production submission.
