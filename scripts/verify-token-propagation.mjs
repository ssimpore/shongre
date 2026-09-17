#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { brandPalette } from "../packages/design-tokens/src/brand.generated.js";
import {
  deriveShongreOrangeTokens,
  mixHex,
} from "../packages/design-tokens/src/brand-orange.ts";
import { configColors } from "../packages/design-tokens/src/config.ts";
import { themeColors } from "../packages/design-tokens/src/theme.ts";

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
const semanticAdapter = await readFile(
  path.join(root, "packages/design-tokens/src/colors.ts"),
  "utf8",
);
const officialAdapter = await readFile(
  path.join(root, "packages/design-tokens/src/official.ts"),
  "utf8",
);
const themeSource = await readFile(
  path.join(root, "packages/design-tokens/src/theme.ts"),
  "utf8",
);

const failures = [];
for (const [name, value] of Object.entries(themeColors)) {
  if (!css.includes(`--color-${name}: ${value};`)) {
    failures.push(`generated Web CSS is missing --color-${name}: ${value}`);
  }
}
const rawPublicColorName =
  /^(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d{2,3})?$|^(?:white|black)$/;
for (const name of Object.keys(themeColors)) {
  if (rawPublicColorName.test(name))
    failures.push(`raw palette key is publicly exposed: ${name}`);
}
if (configColors.brand !== themeColors["brand-primary"])
  failures.push("build-time brand colour bypasses the semantic adapter");
if (configColors.surface !== themeColors["bg-surface"])
  failures.push("build-time surface colour bypasses the semantic adapter");
if (!nativeAdapter.includes("primary: colors.action.primary"))
  failures.push(
    "native primary token is not derived from the canonical semantic token",
  );
if (!webEntry.includes("@shongre/design-tokens/tokens.css"))
  failures.push("Web does not load generated canonical tokens");
if (/--color-[a-z0-9-]+\s*:/.test(webEntry))
  failures.push("Web CSS redeclares a colour instead of loading the package");
if (!nativeScreen.includes("@shongre/design-tokens/native"))
  failures.push("native screens do not consume the native token adapter");
if (/\bnativePalette\b|\bthemeColors\b/.test(nativeAdapter))
  failures.push(
    "native adapter exposes a raw palette instead of semantic colors",
  );
if (/export\s+const\s+palette\b/.test(semanticAdapter))
  failures.push("semantic adapter exposes a raw palette alias");
if (/#[\da-f]{3,8}\b|\b(?:rgba?|hsla?|oklch)\s*\(/i.test(officialAdapter))
  failures.push("official artwork adapter duplicates literal colour values");

const orangeRoles = deriveShongreOrangeTokens(brandPalette.orange);
const orangeBindings = {
  "brand-primary": orangeRoles.canonical,
  primary: orangeRoles.interactive,
  "primary-hover": orangeRoles.hover,
  "primary-active": orangeRoles.active,
  "primary-disabled": orangeRoles.disabled,
  "primary-disabled-border": orangeRoles.disabledBorder,
  "primary-light": orangeRoles.light,
  "primary-surface-faint": orangeRoles.surfaceFaint,
  "primary-surface": orangeRoles.surface,
  "primary-surface-selected": orangeRoles.surfaceSelected,
  "primary-surface-strong": orangeRoles.surfaceStrong,
  "primary-border": orangeRoles.border,
  "primary-border-soft": orangeRoles.borderSoft,
  "primary-border-strong": orangeRoles.borderStrong,
  "primary-on-dark": orangeRoles.onDark,
  "primary-on-dark-ring": orangeRoles.onDarkRing,
  "primary-on-dark-border": orangeRoles.onDarkBorder,
  focus: orangeRoles.interactive,
  "primary-surface-soft": orangeRoles.surfaceSoft,
  "primary-on-inverse-soft": orangeRoles.onInverseSoft,
  "primary-on-inverse-muted": orangeRoles.onInverseMuted,
  "primary-fill": orangeRoles.fill,
  "primary-emphasis": orangeRoles.emphasis,
  "primary-ring": orangeRoles.ring,
  "primary-ring-strong": orangeRoles.ringStrong,
  "primary-shadow": orangeRoles.shadow,
  "primary-shadow-strong": orangeRoles.shadowStrong,
  "primary-overlay": orangeRoles.overlay,
  "category-vehicles": orangeRoles.interactive,
  "category-sport": orangeRoles.fill,
  "category-home-garden": orangeRoles.canonical,
};
/* `interactive`/`hover`/`active` are darkened to clear AA against white (see
   `deriveShongreOrangeTokens`); every other role must stay the untinted logo
   swatch behind an alpha. */
const readableRamp = new Set([
  orangeRoles.interactive,
  orangeRoles.hover,
  orangeRoles.active,
]);
for (const [name, expected] of Object.entries(orangeBindings)) {
  if (themeColors[name] !== expected) {
    failures.push(
      `semantic orange role ${name} is ${themeColors[name]}; expected computed ${expected}`,
    );
  }
  if (readableRamp.has(expected)) continue;
  if (
    expected.slice(0, 7) !== brandPalette.orange ||
    ![7, 9].includes(expected.length)
  ) {
    failures.push(
      `orange role ${name} changes the logo swatch instead of its alpha`,
    );
  }
}

/* Warning retains its functional amber identity. Every other
   saturated warm hexadecimal theme value must be one of the computed Shongre
   Orange bindings above; this prevents a new visual alias from hiding behind a
   different semantic name. */
const functionalWarmExceptions = new Set([
  "warning",
  "warning-hover",
  "warning-active",
]);
function isSaturatedOrangeHex(value) {
  if (!/^#[\da-f]{6}$/i.test(value)) return false;
  const [red, green, blue] = [1, 3, 5].map(
    (index) => Number.parseInt(value.slice(index, index + 2), 16) / 255,
  );
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  if (delta === 0) return false;
  let hue =
    maximum === red
      ? ((green - blue) / delta) % 6
      : maximum === green
        ? (blue - red) / delta + 2
        : (red - green) / delta + 4;
  hue = (hue * 60 + 360) % 360;
  const lightness = (maximum + minimum) / 2;
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  return hue >= 10 && hue <= 45 && saturation >= 0.45;
}
for (const [name, value] of Object.entries(themeColors)) {
  if (
    isSaturatedOrangeHex(value) &&
    !(name in orangeBindings) &&
    !functionalWarmExceptions.has(name)
  ) {
    failures.push(
      `unauthorized orange-like theme value ${name}: ${value}; derive a semantic role from canonical Shongre Orange or document a functional exception`,
    );
  }
}

const changedOrangeRoles = deriveShongreOrangeTokens(
  mixHex(brandPalette.orange, brandPalette.white, 0.2),
);
for (const name of Object.keys(orangeRoles)) {
  if (changedOrangeRoles[name] === orangeRoles[name]) {
    failures.push(
      `canonical orange mutation does not propagate to derived role ${name}`,
    );
  }
}

if (themeColors["brand-primary"] !== brandPalette.orange) {
  failures.push("brand-primary does not equal the generated canonical orange");
}
if (
  /colorPrimitives\.orange|orange(?:Accessible|Hover|Active|Soft|Border)\b/.test(
    themeSource,
  )
) {
  failures.push(
    "theme source contains an independently authored orange alias instead of the derivation recipe",
  );
}

if (failures.length) throw new Error(failures.join("\n"));
process.stdout.write(
  `${Object.keys(themeColors).length} semantic colour tokens propagate from one typed source to generated Web CSS and the shared iOS/Android adapter; ${Object.keys(orangeBindings).length} orange bindings and a canonical-token mutation were verified.\n`,
);
