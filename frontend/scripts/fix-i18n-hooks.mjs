#!/usr/bin/env node
/**
 * Adds the missing `const { t } = useTranslation()` to components that call `t`.
 *
 * The extractor's first version computed each component's body from match
 * offsets it had already invalidated by reversing the match list, so in files
 * holding several components it inserted the hook into the wrong one — or not at
 * all. Rather than fold the fix back into a codemod that has already run, this
 * repairs the result, which is verifiable against `tsc` on its own.
 *
 * Class components are reported, never patched: hooks are illegal there and the
 * right fix is a human decision about restructuring.
 *
 * Usage: node scripts/fix-i18n-hooks.mjs <file...>
 */
import { readFileSync, writeFileSync } from 'fs';

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('usage: node scripts/fix-i18n-hooks.mjs <file...>');
  process.exit(1);
}

/** Component declarations this can safely open. */
const COMPONENT = /(?:export\s+)?const\s+([A-Z]\w*)\s*(?::\s*React\.FC[^=]*)?=\s*\([^)]*\)\s*=>\s*\{\n/g;

for (const file of files) {
  const source = readFileSync(file, 'utf8');

  if (/class\s+\w+\s+extends\s+React\.Component/.test(source) && /\bt\('/.test(source)) {
    console.log(`⚠ ${file}: class component calls t() — hooks are illegal here, needs restructuring`);
    continue;
  }

  const matches = [...source.matchAll(COMPONENT)];
  if (matches.length === 0) continue;

  // Body of component i runs from its opening brace to the start of component i+1.
  const bounds = matches.map((match, i) => ({
    name: match[1],
    bodyStart: match.index + match[0].length,
    bodyEnd: i + 1 < matches.length ? matches[i + 1].index : source.length,
  }));

  // Insert from the end so earlier offsets stay valid.
  let output = source;
  let added = 0;
  for (const { name, bodyStart, bodyEnd } of [...bounds].reverse()) {
    const body = source.slice(bodyStart, bodyEnd);
    if (!/\bt\(\s*'/.test(body)) continue;
    if (/const\s*\{[^}]*\bt\b[^}]*\}\s*=\s*useTranslation\(\)/.test(body)) continue;

    output = `${output.slice(0, bodyStart)}  const { t } = useTranslation();\n${output.slice(bodyStart)}`;
    added += 1;
    void name;
  }

  if (added > 0) {
    writeFileSync(file, output);
    console.log(`${file}: added ${added} hook call(s)`);
  }
}
