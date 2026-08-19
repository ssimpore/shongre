#!/usr/bin/env node
/**
 * Moves hardcoded French copy out of a component and into the catalogue.
 *
 * This exists because the migration is ~900 strings across ~135 files: done by
 * hand it is thousands of edits with no verification between them, and a single
 * mangled JSX expression is a blank page. The tool is deliberately conservative
 * — it rewrites only the shapes it can recognise unambiguously and reports
 * everything else for a human, rather than guessing and producing code that
 * compiles but renders wrongly.
 *
 * Usage:
 *   node scripts/extract-i18n.mjs <file> [--namespace ns] [--dry]
 *
 * What it does per file:
 *   1. finds visible French strings (JSX text, and the props that reach a user)
 *   2. mints a stable key from the namespace plus a slug of the copy
 *   3. rewrites the call site to `t('key')`
 *   4. appends the French entry to messages.fr.ts
 *   5. ensures the component has `const { t } = useTranslation()` and the import
 *
 * English is NOT written here. Translation is a judgement call and belongs in a
 * reviewed catalogue edit, not in a codemod.
 */
import { readFileSync, writeFileSync } from 'fs';
import { basename } from 'path';

const [, , target, ...flags] = process.argv;
if (!target) {
  console.error('usage: node scripts/extract-i18n.mjs <file> [--namespace ns] [--dry]');
  process.exit(1);
}
const DRY = flags.includes('--dry');
const nsFlag = flags.indexOf('--namespace');
const NAMESPACE =
  nsFlag >= 0 ? flags[nsFlag + 1] : basename(target).replace(/\.tsx$/, '').replace(/^./, (c) => c.toLowerCase());

const FR_CATALOGUE = 'src/i18n/messages.fr.ts';

const ACCENTED = /[àâäçéèêëîïôöùûüÿœÆ]/i;
const FRENCH_WORDS =
  /\b(le|la|les|un|une|des|du|de|au|aux|et|ou|est|sont|vous|votre|vos|nos|notre|pour|avec|sans|sur|dans|par|plus|tout|tous|toute|cette|ce|ces|qui|que|dont|être|avoir|annonce|annonces|vendeur|acheteur|recherche|compte|message|messages|paiement|livraison)\b/i;

function looksFrench(text) {
  const trimmed = text.trim();
  if (trimmed.length < 3) return false;
  if (/^[\s\d\p{P}\p{S}]+$/u.test(trimmed)) return false;
  if (/^[a-z0-9-]+$/.test(trimmed)) return false;
  if (/^(https?:|\/|#|\.|@)/.test(trimmed)) return false;
  return ACCENTED.test(trimmed) || FRENCH_WORDS.test(trimmed);
}

/** `Déposer une annonce` -> `deposerUneAnnonce`, capped so keys stay readable. */
function slugify(text) {
  const words = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5);
  if (words.length === 0) return 'text';
  return words
    .map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join('');
}

const source = readFileSync(target, 'utf8');
let output = source;
const minted = new Map(); // key -> french text
const skipped = [];

const existingCatalogue = readFileSync(FR_CATALOGUE, 'utf8');
const usedKeys = new Set([...existingCatalogue.matchAll(/^\s*'([^']+)':/gm)].map((m) => m[1]));

function mintKey(text) {
  const base = `${NAMESPACE}.${slugify(text)}`;
  if (!usedKeys.has(base) && !minted.has(base)) return base;
  // Same copy, same key — reuse rather than minting a duplicate entry.
  for (const [key, value] of minted) if (value === text) return key;
  let n = 2;
  while (usedKeys.has(`${base}${n}`) || minted.has(`${base}${n}`)) n += 1;
  return `${base}${n}`;
}

/* 1. Visible props: aria-label="…" / title="…" / placeholder="…" ------------ */
/* Props whose string value reaches a user: accessibility names, and the copy
   props the design-system primitives take (`title`, `description`, empty-state
   and confirmation labels). Kept in step with check-i18n-coverage.mjs. */
const COPY_PROPS =
  /\b(aria-label|title|placeholder|alt|description|label|clearFiltersLabel|emptyMessage|confirmLabel|cancelLabel|submitLabel|helperText|errorMessage|tooltip|subtitle|heading|ctaLabel|saveSearchLabel)="([^"{}]{3,})"/g;

output = output.replace(
  COPY_PROPS,
  (whole, prop, value) => {
    if (!looksFrench(value)) return whole;
    const key = mintKey(value);
    minted.set(key, value);
    return `${prop}={t('${key}')}`;
  },
);

/* 2. JSX text nodes --------------------------------------------------------
   Only a run of plain text bounded by tags, with no braces or nested markup —
   anything richer (a sentence wrapping a <Link>, an interpolated value) is
   reported instead, because splitting it correctly needs a human decision about
   where the placeholders go. */
output = output.replace(/>([^<>{}\n]{3,})</g, (whole, value) => {
  if (!looksFrench(value)) return whole;
  const trimmed = value.trim();
  // Preserve surrounding whitespace so JSX spacing does not shift.
  const leading = value.slice(0, value.indexOf(trimmed[0]));
  const trailing = value.slice(value.indexOf(trimmed[0]) + trimmed.length);
  const key = mintKey(trimmed);
  minted.set(key, trimmed);
  return `>${leading}{t('${key}')}${trailing}<`;
});

/* 3. Report the shapes deliberately left alone ----------------------------- */
for (const [, value] of source.matchAll(/>([^<>]*[àâäçéèêëîïôöùûüÿ][^<>]*)</g)) {
  if (/[{}]/.test(value) && looksFrench(value.replace(/\{[^}]*\}/g, ''))) {
    skipped.push(value.trim().slice(0, 80));
  }
}

if (minted.size === 0) {
  console.log(`${target}: nothing to extract`);
  if (skipped.length) console.log(`  ${skipped.length} mixed expression(s) need a human`);
  process.exit(0);
}

/* 4. Ensure each component that now calls `t` actually has it -------------- */
function ensureHook(code) {
  let result = code;
  const componentPattern =
    /(export\s+)?const\s+([A-Z]\w*)\s*:\s*React\.FC[^=]*=\s*\(([^)]*)\)\s*=>\s*\{\n/g;
  const matches = [...result.matchAll(componentPattern)];

  // Walk backwards so earlier offsets stay valid.
  for (const match of matches.reverse()) {
    const start = match.index + match[0].length;
    const nextComponent = matches.find((m) => m.index > match.index);
    const end = nextComponent ? nextComponent.index : result.length;
    const body = result.slice(start, end);
    if (!/\bt\('/.test(body)) continue;
    if (/const\s*\{\s*t\s*\}\s*=\s*useTranslation\(\)/.test(body)) continue;
    result = result.slice(0, start) + '  const { t } = useTranslation();\n' + result.slice(start);
  }
  return result;
}

output = ensureHook(output);

if (!/from '.*i18n\/I18nProvider'/.test(output)) {
  const depth = target.split('/').length - 2;
  const rel = '../'.repeat(depth) + 'i18n/I18nProvider';
  const lines = output.split('\n');
  const lastImport = lines.reduce(
    (acc, line, i) => (line.startsWith('import ') && line.trimEnd().endsWith(';') ? i : acc),
    0,
  );
  lines.splice(lastImport + 1, 0, `import { useTranslation } from '${rel}';`);
  output = lines.join('\n');
}

/* 5. Append the French entries -------------------------------------------- */
const entries = [...minted.entries()]
  .map(([key, value]) => `  '${key}': ${JSON.stringify(value).replace(/^"|"$/g, "'").replace(/'/g, "\\'")},`)
  .join('\n');

// Rebuild as proper single-quoted TS literals with escaping handled by JSON.
const tsEntries = [...minted.entries()]
  .map(([key, value]) => `  '${key}': ${JSON.stringify(value)},`)
  .join('\n');

const marker = '} as const;';
const catalogueOut = existingCatalogue.replace(
  marker,
  `\n  // --- ${NAMESPACE} ---\n${tsEntries}\n${marker}`,
);

if (DRY) {
  console.log(`${target}: would extract ${minted.size} string(s)`);
  for (const [key, value] of minted) console.log(`  ${key} = ${value.slice(0, 70)}`);
  if (skipped.length) console.log(`  skipped ${skipped.length} mixed expression(s)`);
  process.exit(0);
}

writeFileSync(target, output);
writeFileSync(FR_CATALOGUE, catalogueOut);
console.log(`${target}: extracted ${minted.size} string(s) under "${NAMESPACE}."`);
if (skipped.length) {
  console.log(`  ${skipped.length} mixed expression(s) left for manual handling:`);
  for (const s of skipped.slice(0, 5)) console.log(`    ${s}`);
}
void entries;
