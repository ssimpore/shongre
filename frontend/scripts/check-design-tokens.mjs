#!/usr/bin/env node
/**
 * Guards the semantic status tokens declared in src/index.css.
 *
 * The design system defines success / warning / danger / info with contrast
 * tuned per surface, and index.css states the rule outright: "Use these instead
 * of reaching into raw emerald/amber/red/sky palettes so the same state always
 * reads the same way across cards, tables and admin."
 *
 * Before this guard existed the codebase used raw palettes 1,230 times against
 * 46 token usages — a 27:1 ratio. "Success" appeared as 26 distinct emerald
 * utilities across 11 shades, and "danger" was split across two hue families
 * (red *and* rose), so the same error state changed colour by screen.
 *
 * What is intentionally still allowed, and why:
 *   - amber/yellow accents (`text-amber-400/500`, `fill-amber-*`, solid amber
 *     fills): these carry star ratings and the boost/premium accent, which are
 *     not warnings. Mapping them to --color-warning would relabel "featured"
 *     as "problem".
 *   - light text shades (100–400) and dark fills (800–950): these sit on
 *     inverted panels where a single token cannot hold contrast.
 *   - indigo / purple: categorical role and state identity, not status.
 *
 * Run: node scripts/check-design-tokens.mjs
 */
import { readdirSync, readFileSync } from 'fs';
import { join, relative } from 'path';

const ROOT = 'src';
const THEME_SOURCE = 'src/index.css';

/** Utility+shade combinations that have an exact semantic token equivalent. */
const BANNED = [
  { re: /\b(?:[a-z-]+:)*bg-(emerald|green|red|rose|amber|yellow|sky|blue)-(?:50|100)\b/, hint: 'bg-{success|warning|danger|info}-surface' },
  { re: /\b(?:[a-z-]+:)*(?:border|ring|divide|outline)-(emerald|green|red|rose|amber|yellow|sky|blue)-(?:100|200|300)\b/, hint: 'border-{…}-border' },
  { re: /\b(?:[a-z-]+:)*(?:text|fill|stroke)-(emerald|green|red|rose|sky|blue)-(?:500|600|700|800|900|950)\b/, hint: 'text-{success|danger|info}' },
  { re: /\b(?:[a-z-]+:)*(?:text|fill|stroke)-(amber|yellow)-(?:600|700|800|900|950)\b/, hint: 'text-warning' },
  { re: /\b(?:[a-z-]+:)*bg-(emerald|green|red|rose|sky|blue)-(?:500|600|700)\b/, hint: 'bg-{success|danger|info}' },
  // Error-state borders are unambiguous, unlike amber's 400/500 accent range.
  { re: /\b(?:[a-z-]+:)*border-(red|rose)-(?:400|500)\b/, hint: 'border-danger' },
  /* Arbitrary type sizes. The scale in src/index.css documents `micro` (11px)
     as the smallest size allowed anywhere — "for badges, counters and dense
     metadata only, never for body copy". 45 call sites ignored it, including
     `text-[10px]` x17 and `text-[9px]` x2 inside the listing card, the mobile
     tab bar and the hero: the three components a visitor sees first. A size the
     scale genuinely lacks gets a named step (see `--text-card-title` and
     `--text-hero`), not a bracket. */
  {
    re: /\b(?:[a-z-]+:)*text-\[[0-9.]+(?:px|rem|em)\]/,
    hint: 'a named step — text-micro / text-xs / text-sm / text-card-title / text-hero',
  },
];

/* ---------------------------------------------------------------------------
   Guard 2: utility classes that name a token which does not exist.

   Tailwind generates nothing for a class whose theme key is undeclared — no
   warning, no error, just a class that does nothing. `danger` shipped that way:
   the Button primitive asked for `bg-danger-hover` / `bg-danger-active`, only
   `--color-danger` was declared, and so every destructive button in the product
   was inert on hover and on press until someone noticed by eye.

   Only the five project-owned colour families are checked. Tailwind ships no
   `primary` / `danger` / `success` / `warning` / `info` palette of its own, so a
   class in one of those families can only resolve through `@theme` — which
   makes the check exact, with no built-in palette to produce false positives.
   --------------------------------------------------------------------------- */
const OWNED_FAMILIES = ['primary', 'danger', 'success', 'warning', 'info'];

/** Colour utilities whose value resolves from the `--color-*` namespace. */
const COLOR_UTILITIES =
  'bg|text|border|ring|outline|divide|fill|stroke|shadow|accent|caret|decoration|placeholder|from|via|to';

function declaredColorTokens() {
  const css = readFileSync(THEME_SOURCE, 'utf8');
  const start = css.indexOf('@theme {');
  if (start === -1) throw new Error(`${THEME_SOURCE} declares no @theme block`);
  let depth = 0;
  let end = css.length;
  for (let i = css.indexOf('{', start); i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) { end = i; break; }
  }
  const block = css.slice(start, end);
  return new Set(Array.from(block.matchAll(/--color-([a-z0-9-]+)\s*:/gi), (m) => m[1]));
}

const declared = declaredColorTokens();

// e.g. `hover:bg-danger-hover`, `md:border-t-primary-border`, `shadow-primary/20`
const OWNED_CLASS = new RegExp(
  `(?:^|[\\s"'\`{])(?:[a-z0-9-]+:)*(?:${COLOR_UTILITIES})(?:-[trblxyse])?-((?:${OWNED_FAMILIES.join('|')})(?:-[a-z0-9-]+)?)(?:/[^\\s"'\`]+)?(?=$|[\\s"'\`}])`,
  'g',
);

function findUndeclaredTokens(line) {
  const found = [];
  for (const m of line.matchAll(OWNED_CLASS)) {
    if (!declared.has(m[1])) found.push(m[1]);
  }
  return found;
}

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (p.endsWith('.tsx')) out.push(p);
  }
  return out;
}

const violations = [];
const undeclared = [];
for (const file of walk(ROOT)) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const { re, hint } of BANNED) {
      const m = line.match(re);
      if (m) violations.push({ file: relative('.', file), line: i + 1, found: m[0], hint });
    }
    for (const token of findUndeclaredTokens(line)) {
      undeclared.push({ file: relative('.', file), line: i + 1, token });
    }
  });
}

if (undeclared.length > 0) {
  console.error(`\n✘ design tokens: ${undeclared.length} class(es) name an undeclared token.\n`);
  console.error(`  Tailwind emits no CSS for these, so they are silently inert.`);
  console.error(`  Declare the token in ${THEME_SOURCE} (and mirror it in tokens/theme.ts), or use one that exists.\n`);
  for (const u of undeclared.slice(0, 40)) {
    console.error(`  ${u.file}:${u.line}\n      --color-${u.token} is not declared`);
  }
  if (undeclared.length > 40) console.error(`\n  …and ${undeclared.length - 40} more.`);
  console.error('');
}

if (violations.length === 0 && undeclared.length === 0) {
  console.log('✔ design tokens: no raw status palettes, no off-scale type sizes, no undeclared tokens in src/**/*.tsx');
  process.exit(0);
}

if (violations.length === 0) process.exit(1);

console.error(`\n✘ design tokens: ${violations.length} off-scale value(s).\n`);
console.error('  These have exact semantic equivalents — see the ramp and type-scale comments in src/index.css.\n');
for (const v of violations.slice(0, 40)) {
  console.error(`  ${v.file}:${v.line}\n      ${v.found}  →  ${v.hint}`);
}
if (violations.length > 40) console.error(`\n  …and ${violations.length - 40} more.`);
console.error('');
process.exit(1);
