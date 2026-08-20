#!/usr/bin/env node
/**
 * Removes unused local bindings the compiler can prove are dead.
 *
 * Companion to `prune-unused-imports.mjs`, and deliberately narrower: it only
 * touches destructured bindings and whole `const` declarations whose initialiser
 * is a plain identifier, property access or call whose result is discarded.
 *
 * What it will not touch, and why:
 *   - function parameters: usually present to satisfy an interface, so removing
 *     one changes a signature rather than deleting dead weight
 *   - initialisers with side effects it cannot recognise — better to leave a
 *     dead binding than to delete a call something depends on
 *
 * Anything it declines is printed, so the remainder is a short list a human can
 * read rather than a silent gap.
 *
 * Run: node scripts/prune-unused-locals.mjs [--dry]
 */
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

const DRY = process.argv.includes('--dry');
const MAX_PASSES = 6;

/** Calls whose only purpose might be their side effect. */
const SIDE_EFFECTFUL = /\b(?:set|save|write|delete|remove|update|create|send|track|log|init|register|subscribe|mutate|push|toggle)/i;

function diagnostics() {
  try {
    execSync('npx tsc --noEmit --noUnusedLocals', { encoding: 'utf8', stdio: 'pipe' });
    return [];
  } catch (error) {
    const out = `${error.stdout || ''}${error.stderr || ''}`;
    return out
      .split('\n')
      .map((l) => l.match(/^(.+?)\((\d+),(\d+)\): error TS(6133|6198): (.+)$/))
      .filter(Boolean)
      .map((m) => ({
        file: m[1],
        line: Number(m[2]),
        code: m[4],
        name: (m[5].match(/'([^']+)' is declared/) || [])[1],
      }));
  }
}

/**
 * Drops one property from an object pattern.
 *
 * The three shapes are matched in order and the FIRST match wins. Running them
 * as a chain of `.replace` calls is what broke this script the first time: for
 * `{ location: userLocation }` the rename pattern missed, the plain pattern then
 * matched the alias on its own, and the file was left holding a dangling
 * `location:`. Same lesson the import pruner already learned about
 * `List as ListIcon` — one binding, one edit.
 */
function dropProperty(text, name) {
  const shapes = [
    // Renamed. The compiler reports the *alias*, so match the whole pair.
    new RegExp(`\\b\\w+\\s*:\\s*${name}\\b\\s*,?\\s*`),
    // Defaulted: `marketCode = 'FR'`. The default leaves with it, or `, = 'FR'`
    // is left behind — a syntax error, not a smaller pattern.
    new RegExp(`\\b${name}\\s*=\\s*[^,}]+,?\\s*`),
    // Plain.
    new RegExp(`\\b${name}\\b\\s*,?\\s*`),
  ];
  for (const shape of shapes) {
    if (shape.test(text)) return text.replace(shape, '');
  }
  return null;
}

/**
 * Elides one element from an array pattern.
 *
 * Array destructuring is positional, so deleting a slot renames every binding
 * after it: `const [value, setValue] = useState(false)` becomes
 * `const [setValue] = useState(false)`, and `setValue` is now the boolean. That
 * compiles wherever the types happen to line up, which is why it has to be an
 * elision — the empty slot in `const [, setValue]` exists for exactly this.
 */
function elideElement(text, name) {
  const next = text.replace(new RegExp(`(\\[[^\\]]*?)\\b${name}\\b\\s*`), '$1');
  return next === text ? null : next;
}

const skipped = [];
let total = 0;

for (let pass = 1; pass <= MAX_PASSES; pass += 1) {
  const found = diagnostics().filter((d) => d.name || d.code === '6198');
  if (found.length === 0) break;

  const byFile = new Map();
  for (const d of found) {
    if (!byFile.has(d.file)) byFile.set(d.file, []);
    byFile.get(d.file).push(d);
  }

  let removed = 0;

  for (const [file, items] of byFile) {
    const lines = readFileSync(file, 'utf8').split('\n');
    let touched = false;

    // Bottom-up so earlier line numbers stay valid.
    for (const item of [...items].sort((a, b) => b.line - a.line)) {
      const i = item.line - 1;
      const text = lines[i];
      if (text === undefined) continue;
      const decline = () => skipped.push(`${file}:${item.line}  ${text.trim().slice(0, 72)}`);

      // Whole destructuring is dead: drop the statement if it is a plain read.
      if (item.code === '6198') {
        if (/=\s*[\w.$]+(\([^)]*\))?;?\s*$/.test(text) && !SIDE_EFFECTFUL.test(text.split('=')[1] || '')) {
          lines.splice(i, 1);
          removed += 1;
          touched = true;
        } else {
          decline();
        }
        continue;
      }

      const pattern = text.match(/const\s*([{[])/);
      if (pattern) {
        const next = pattern[1] === '{'
          ? dropProperty(text, item.name)
          : elideElement(text, item.name);
        if (next === null) {
          decline();
          continue;
        }
        const tidied = next
          .replace(/\{\s*,/, '{')
          .replace(/,\s*,/g, ',')
          .replace(/,(\s*\})/g, '$1');
        // An emptied pattern means the statement was only dead bindings.
        if (/const\s*(\{\s*\}|\[\s*,*\s*\])\s*(:[^=]+)?=/.test(tidied)) {
          if (SIDE_EFFECTFUL.test(tidied.split('=').slice(1).join('='))) {
            decline();
            continue;
          }
          lines.splice(i, 1);
        } else {
          lines[i] = tidied;
        }
        removed += 1;
        touched = true;
        continue;
      }

      // Standalone `const x = <plain read>` on one line.
      const standalone = text.match(/^\s*const\s+\w+\s*(:[^=]+)?=\s*(.+?);?\s*$/);
      if (standalone && !SIDE_EFFECTFUL.test(standalone[2]) && !/=>|function|\{$/.test(standalone[2])) {
        lines.splice(i, 1);
        removed += 1;
        touched = true;
      } else {
        decline();
      }
    }

    if (touched && !DRY) writeFileSync(file, lines.join('\n'));
  }

  total += removed;
  console.log(`pass ${pass}: removed ${removed}`);
  if (DRY || removed === 0) break;
}

console.log(`\ntotal removed: ${total}`);
if (skipped.length) {
  console.log(`left for a human (${new Set(skipped).size}):`);
  [...new Set(skipped)].slice(0, 25).forEach((s) => console.log('  ' + s));
}
