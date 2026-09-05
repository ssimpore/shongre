# @shongre/brand

Shared TypeScript identity metadata for the official `SHONGRE.` brand.

The complete source kit is the immutable release selected by the sole
`activeVersion` field in `brand/shongre/brand.config.json`. Runtime Web and Expo
assets, typed identity/Web registries, document artwork, and the design-token
adapter are synchronized from that source by `npm run brand:sync` at the
repository root. This package does not own or redraw the logo artwork.

Use the root export for identity metadata, `@shongre/brand/web` for public Web
paths and intrinsic dimensions, and `@shongre/brand/document` only in dedicated
backend or demo document generators. Keeping the embedded document image off
the root export prevents it from entering unrelated Web module graphs.
