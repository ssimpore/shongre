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

/** Utility+shade combinations that have an exact semantic token equivalent. */
const BANNED = [
  { re: /\b(?:[a-z-]+:)*bg-(emerald|green|red|rose|amber|yellow|sky|blue)-(?:50|100)\b/, hint: 'bg-{success|warning|danger|info}-surface' },
  { re: /\b(?:[a-z-]+:)*(?:border|ring|divide|outline)-(emerald|green|red|rose|amber|yellow|sky|blue)-(?:100|200|300)\b/, hint: 'border-{…}-border' },
  { re: /\b(?:[a-z-]+:)*(?:text|fill|stroke)-(emerald|green|red|rose|sky|blue)-(?:500|600|700|800|900|950)\b/, hint: 'text-{success|danger|info}' },
  { re: /\b(?:[a-z-]+:)*(?:text|fill|stroke)-(amber|yellow)-(?:600|700|800|900|950)\b/, hint: 'text-warning' },
  { re: /\b(?:[a-z-]+:)*bg-(emerald|green|red|rose|sky|blue)-(?:500|600|700)\b/, hint: 'bg-{success|danger|info}' },
  // Error-state borders are unambiguous, unlike amber's 400/500 accent range.
  { re: /\b(?:[a-z-]+:)*border-(red|rose)-(?:400|500)\b/, hint: 'border-danger' },
];

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (p.endsWith('.tsx')) out.push(p);
  }
  return out;
}

const violations = [];
for (const file of walk(ROOT)) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const { re, hint } of BANNED) {
      const m = line.match(re);
      if (m) violations.push({ file: relative('.', file), line: i + 1, found: m[0], hint });
    }
  });
}

if (violations.length === 0) {
  console.log('✔ design tokens: no raw status palettes in src/**/*.tsx');
  process.exit(0);
}

console.error(`\n✘ design tokens: ${violations.length} raw status palette usage(s).\n`);
console.error('  These have exact semantic equivalents — see the ramp comments in src/index.css.\n');
for (const v of violations.slice(0, 40)) {
  console.error(`  ${v.file}:${v.line}\n      ${v.found}  →  ${v.hint}`);
}
if (violations.length > 40) console.error(`\n  …and ${violations.length - 40} more.`);
console.error('');
process.exit(1);
