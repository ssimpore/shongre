#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { configColors } from "../packages/design-tokens/src/config.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const css = await readFile(
  path.join(root, "packages/design-tokens/dist/tokens.css"),
  "utf8",
);
const webEntry = await readFile(
  path.join(root, "frontend/src/index.css"),
  "utf8",
);
const nativeScreen = await readFile(
  path.join(root, "mobile/app/(tabs)/index.tsx"),
  "utf8",
);
const nativeAdapter = await readFile(
  path.join(root, "packages/design-tokens/src/native.ts"),
  "utf8",
);

const failures = [];
if (!css.includes(`--color-primary: ${configColors.brand};`))
  failures.push(
    "generated Web CSS does not contain the canonical primary token",
  );
if (!nativeAdapter.includes("primary: colors.action.primary"))
  failures.push(
    "native primary token is not derived from the canonical semantic token",
  );
if (!webEntry.includes("@shongre/design-tokens/tokens.css"))
  failures.push("Web does not load generated canonical tokens");
if (!nativeScreen.includes("@shongre/design-tokens/native"))
  failures.push("native screens do not consume the native token adapter");

if (failures.length) throw new Error(failures.join("\n"));
process.stdout.write(
  "One canonical token propagates to generated Web CSS and the shared iOS/Android native adapter.\n",
);
