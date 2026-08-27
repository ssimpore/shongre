#!/usr/bin/env node
/**
 * Measures how much of the interface has moved to the translation layer.
 *
 * The point is to make "when can English ship?" a number instead of a feeling.
 * `catalogueCoverage` in the app answers a narrower question — is every key in
 * the catalogue translated? — and it reported 100% for English while every page
 * body was still hardcoded French. That gap is what this script measures.
 *
 * It looks for user-visible French text still living in JSX: text between tags,
 * and the string literals passed to the props that reach a screen reader or a
 * placeholder. Detection is by French-specific signal (accented characters and
 * common French words) rather than "any string", because the codebase is full of
 * class names, slugs, ids and English-language keys that are not copy.
 *
 * Run: node scripts/check-i18n-coverage.mjs [--list]
 * CI:  `npm run check:i18n` fails if a locale is declared shipped while strings
 *      remain outside the catalogue.
 */
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

const ROOT = "src";
const SHOW_LIST = process.argv.includes("--list");
const LOCALE_IDENTITY = "src/i18n/locale.ts";

/** Surfaces already migrated; regressions here are what the gate protects. */
const MIGRATED = [
  "src/app/layouts/MobileBottomNav.tsx",
  "src/app/layouts/Footer.tsx",
  "src/app/layouts/CookieConsent.tsx",
  "src/design-system/primitives/LanguageSelector.tsx",
  "src/features/admin/crm/components/EvidenceDrawer.tsx",
];

/** Directories with no user-facing copy of their own. */
const SKIP_DIRS = new Set(["i18n", "mocks"]);

const ACCENTED = /[àâäçéèêëîïôöùûüÿœÆ]/i;
const FRENCH_WORDS =
  /\b(le|la|les|un|une|des|du|de|au|aux|et|ou|est|sont|vous|votre|vos|nos|notre|pour|avec|sans|sur|dans|par|plus|tout|tous|toute|cette|ce|ces|qui|que|dont|être|avoir|annonce|annonces|vendeur|acheteur|recherche|compte|message|messages|paiement|livraison)\b/i;

/** Props whose string value is read out or displayed. */
const VISIBLE_PROPS =
  /\b(aria-label|title|placeholder|alt|label|description)=["']([^"']{3,})["']/g;
/** Text sitting directly between JSX tags, on one line. */
const JSX_TEXT = />([^<>{}\n]{3,})</g;
/** The same, wrapped across lines — invisible to the single-line pattern. */
const MULTILINE_JSX_TEXT = />(\s*\n[^<>{}]{3,}?)</g;
/**
 * Copy assigned to a named field rather than written in JSX.
 *
 * `usePublishCta` builds `label` / `shortLabel` in a `.ts` file and feeds the
 * loudest button in the product; scanning only JSX in `.tsx` files missed it
 * entirely, and the tab bar shipped reading "Vendre" in an English interface.
 */
const COPY_IDENTIFIERS =
  /\b(label|shortLabel|title|description|message|placeholder|tagline|heading|summary|text|name|cta|hint|error|helper)\s*:\s*(['"])([^'"]{4,})\2/g;

/**
 * Language names are written in their own language on purpose — a picker that
 * renders "French" to an English reader is worse than one that renders
 * "Français", which is what the reader is looking for.
 */
const NATIVE_LANGUAGE_NAMES = new Set([
  "Français",
  "English",
  "Deutsch",
  "Español",
  "Nederlands",
  "Italiano",
]);

function looksFrench(text) {
  const trimmed = text.trim();
  if (NATIVE_LANGUAGE_NAMES.has(trimmed)) return false;
  if (trimmed.length < 3) return false;
  // Skip anything that is plainly not prose.
  if (/^[\s\d\p{P}\p{S}]+$/u.test(trimmed)) return false;
  if (/^[a-z0-9-]+$/.test(trimmed)) return false; // slugs, class fragments
  if (/^(https?:|\/|#|\.|@)/.test(trimmed)) return false;
  return ACCENTED.test(trimmed) || FRENCH_WORDS.test(trimmed);
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIRS.has(entry)) walk(full, files);
    } else if (
      /\.tsx?$/.test(entry) &&
      !/\.test\.tsx?$/.test(entry) &&
      !/\.d\.ts$/.test(entry)
    ) {
      files.push(full);
    }
  }
  return files;
}

const findings = [];
const perFile = new Map();

for (const file of walk(ROOT)) {
  const source = readFileSync(file, "utf8");
  const hits = [];

  /* Records that carry their own per-locale maps are already translated: the
     flat `name` / `label` beside `labels: { 'fr-FR': …, 'en-US': … }` is the
     French *source*, not a missing translation. Counting it reported the
     taxonomy as 65 untranslated strings while every English label was sitting
     in the same object, unread. Data localised this way is resolved through
     `getTaxonomyLabel` / `localize`, so only the JSX in such a file is copy. */
  const carriesLocaleMaps = /'en-US'\s*:/.test(source);

  for (const [, , value] of source.matchAll(VISIBLE_PROPS)) {
    if (looksFrench(value)) hits.push(value.trim());
  }
  for (const [, value] of source.matchAll(JSX_TEXT)) {
    if (looksFrench(value)) hits.push(value.trim());
  }
  for (const [, value] of source.matchAll(MULTILINE_JSX_TEXT)) {
    const collapsed = value.replace(/\s+/g, " ").trim();
    if (looksFrench(collapsed)) hits.push(collapsed);
  }
  // Groups: [full, identifier, quote, text] — read the text, not the quote.
  if (!carriesLocaleMaps) {
    for (const [, , , value] of source.matchAll(COPY_IDENTIFIERS)) {
      if (looksFrench(value)) hits.push(value.trim());
    }
  }

  if (hits.length) {
    perFile.set(relative(".", file), hits.length);
    findings.push(...hits.map((text) => ({ file: relative(".", file), text })));
  }
}

const totalStrings = findings.length;
const migratedRegressions = MIGRATED.filter((file) => perFile.has(file));
const localeSource = readFileSync(LOCALE_IDENTITY, "utf8");
const shippedDeclaration = localeSource.match(
  /SHIPPED_LOCALES\s*=\s*\[([^\]]*)\]/,
);
const shippedLocales = Array.from(
  shippedDeclaration?.[1].matchAll(/["']([^"']+)["']/g) ?? [],
  (match) => match[1],
);
const incompleteShippedLocales = shippedLocales.filter(
  (locale) => locale !== "fr-FR" && totalStrings > 0,
);

const ranked = [...perFile.entries()].sort((a, b) => b[1] - a[1]);

console.log("\ni18n migration coverage\n" + "=".repeat(50));
console.log(`Untranslated user-visible strings: ${totalStrings}`);
console.log(`Files carrying them:               ${perFile.size}`);
console.log(`\nLargest remaining surfaces:`);
for (const [file, count] of ranked.slice(0, 12)) {
  console.log(`  ${String(count).padStart(4)}  ${file}`);
}

if (SHOW_LIST) {
  console.log("\nAll findings:");
  for (const { file, text } of findings) {
    console.log(`  ${file}: ${text.slice(0, 90)}`);
  }
}

if (migratedRegressions.length) {
  console.error(
    "\n✖ These surfaces were migrated to t() and have picked up hardcoded copy again:\n" +
      migratedRegressions
        .map((file) => `    ${file} (${perFile.get(file)})`)
        .join("\n"),
  );
  process.exit(1);
}

if (incompleteShippedLocales.length) {
  console.error(
    "\n✖ Locales cannot ship while user-visible copy remains outside the catalogue:\n" +
      incompleteShippedLocales.map((locale) => `    ${locale}`).join("\n"),
  );
  process.exit(1);
}

console.log(
  `\n✔ every migrated surface is still free of hardcoded copy` +
    `\n  ${totalStrings} strings remain between English and SHIPPED_LOCALES.\n`,
);
