import assert from "node:assert/strict";
import test from "node:test";

import {
  findTrackedArtifacts,
  trackedArtifactReason,
} from "./check-repository-hygiene.mjs";

test("rejects disposable tracked output", () => {
  const paths = [
    ".runtime/frontend.pid",
    "frontend/.next/cache/webpack.bin",
    "frontend/test-results/home/error-context.md",
    "backend/dist/index.js",
    "mobile/.expo/settings.json",
    "coverage/lcov.info",
    "debug.log",
    "notes.tmp",
    "component.tsx.bak",
    ".DS_Store",
  ];

  assert.deepEqual(
    findTrackedArtifacts(paths).map(({ path }) => path),
    paths,
  );
});

test("preserves intentional source, generated, migration, fixture, and platform files", () => {
  const paths = [
    "packages/design-tokens/src/generated/brand.ts",
    "backend/supabase/migrations/20260905000000_example.sql",
    "frontend/src/__fixtures__/debug.log",
    "mobile/ios/Shongre/Assets.xcassets/AppIcon.appiconset/Contents.json",
    "mobile/android/app/src/main/res/mipmap-hdpi/ic_launcher.png",
    "brand/shongre/example-version/CHECKSUMS.sha256",
  ];

  for (const path of paths) {
    assert.equal(trackedArtifactReason(path), null, path);
  }
});
