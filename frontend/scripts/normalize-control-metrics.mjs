#!/usr/bin/env node
/**
 * Rewrites control-sized Tailwind utilities to Shongre's semantic metrics.
 *
 * Scope is intentionally JSX controls only. A 48px image or a 32px status tile
 * is layout/content geometry; a 48px button is `control-lg`. Keeping that
 * distinction avoids the usual "replace every h-12" codemod damage.
 *
 * Run without arguments to migrate. `--check` is CI-safe and exits non-zero
 * when a control can still be normalized.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';

const ROOT = 'src';
const checkOnly = process.argv.includes('--check');

const CONTROL_TAGS = new Set([
  'button',
  'input',
  'select',
  'textarea',
  'Button',
  'IconButton',
  'Input',
  'Select',
  'Textarea',
]);

const FIELD_TAGS = new Set(['input', 'select', 'textarea', 'Input', 'Select', 'Textarea']);
const PRIMITIVE_BUTTON_TAGS = new Set(['Button', 'IconButton']);

const METRIC_REPLACEMENTS = [
  [/\bmin-h-\[42px\]/g, 'min-h-control-touch'],
  [/\bh-\[42px\]/g, 'h-control-touch'],
  [/\bh-8\b/g, 'h-control-sm'],
  [/\bh-9\b/g, 'h-control-md'],
  [/\bh-10\b/g, 'h-control-md'],
  [/\bh-11\b/g, 'h-control-touch'],
  [/\bh-12\b/g, 'h-control-lg'],
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, out);
    else if (path.endsWith('.tsx')) out.push(path);
  }
  return out;
}

function appendStaticClass(raw, className) {
  const quote = raw[0];
  if ((quote === '"' || quote === "'") && raw.at(-1) === quote) {
    return `${raw.slice(0, -1)} ${className}${quote}`;
  }

  const wrapped = raw.match(/^(\{\s*)(["'`])([\s\S]*)(\2)(\s*\})$/);
  if (wrapped) {
    return `${wrapped[1]}${wrapped[2]}${wrapped[3]} ${className}${wrapped[4]}${wrapped[5]}`;
  }

  // Expressions such as `className={cn(...)}` are owned by their component or
  // a shared class constant. Guessing inside arbitrary JavaScript would make a
  // formatting codemod unsafe, so those remain explicit review points.
  return raw;
}

function normalizeInitializer(raw, tagName, enforceNativeFieldHeight = false) {
  let normalized = raw;
  for (const [pattern, replacement] of METRIC_REPLACEMENTS) {
    normalized = normalized.replace(pattern, replacement);
  }

  // Ordinary fields and the two owned button primitives share one radius.
  // Native card-like buttons are left alone: their radius belongs to the card
  // pattern, not to the control pattern.
  const isSizedNativeButton =
    tagName === 'button' && /\b(?:min-)?h-control-(?:sm|md|touch|lg|fab)\b/.test(normalized);
  if (FIELD_TAGS.has(tagName) || PRIMITIVE_BUTTON_TAGS.has(tagName) || isSizedNativeButton) {
    normalized = normalized.replace(/\brounded-(?:lg|xl|2xl)\b/g, 'rounded-control');
  }

  if (
    enforceNativeFieldHeight &&
    !/\b(?:min-)?h-(?:control-(?:sm|md|touch|lg|fab)|full|auto|screen|\[[^\]]+\]|[0-9]+)\b/.test(normalized)
  ) {
    normalized = appendStaticClass(
      normalized,
      tagName === 'textarea' ? 'min-h-control-touch' : 'h-control-touch',
    );
  }

  return normalized;
}

function nativeInputNeedsHeight(node, sourceFile) {
  const typeAttribute = node.attributes.properties.find(
    (property) => ts.isJsxAttribute(property) && property.name.text === 'type',
  );
  if (!typeAttribute || !ts.isJsxAttribute(typeAttribute)) return true;
  if (!typeAttribute.initializer) return true;

  const excluded = new Set(['checkbox', 'radio', 'range', 'file', 'color', 'hidden']);
  if (ts.isStringLiteral(typeAttribute.initializer)) {
    return !excluded.has(typeAttribute.initializer.text.toLowerCase());
  }

  /* A conditional `type={visible ? 'text' : 'password'}` is still a text
     control. Read its literal branches so future password/number components
     cannot bypass the guard merely because their type is dynamic. Mixed or
     fully dynamic expressions stay opt-in to avoid resizing a conditional that
     can also become a checkbox, range or file input. */
  const source = typeAttribute.initializer.getText(sourceFile);
  const literalTypes = Array.from(source.matchAll(/["']([a-z-]+)["']/gi), (match) =>
    match[1].toLowerCase(),
  );
  return literalTypes.length > 0 && literalTypes.every((type) => !excluded.has(type));
}

const changed = [];
for (const file of walk(ROOT)) {
  const source = readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = [];

  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = node.tagName.getText(sourceFile);
      if (CONTROL_TAGS.has(tagName)) {
        const className = node.attributes.properties.find(
          (property) => ts.isJsxAttribute(property) && property.name.text === 'className',
        );
        if (className && ts.isJsxAttribute(className) && className.initializer) {
          const start = className.initializer.getStart(sourceFile);
          const end = className.initializer.getEnd();
          const current = source.slice(start, end);
          const enforceNativeFieldHeight =
            (tagName === 'select' || tagName === 'textarea') ||
            (tagName === 'input' && nativeInputNeedsHeight(node, sourceFile));
          const normalized = normalizeInitializer(current, tagName, enforceNativeFieldHeight);
          if (normalized !== current) edits.push({ start, end, normalized });
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  if (edits.length === 0) continue;

  changed.push({ file: relative('.', file), count: edits.length });
  if (!checkOnly) {
    let next = source;
    for (const edit of edits.sort((a, b) => b.start - a.start)) {
      next = `${next.slice(0, edit.start)}${edit.normalized}${next.slice(edit.end)}`;
    }
    writeFileSync(file, next);
  }
}

if (changed.length === 0) {
  console.log('✔ control metrics: semantic heights and radii are normalized');
  process.exit(0);
}

const total = changed.reduce((sum, item) => sum + item.count, 0);
if (checkOnly) {
  console.error(`✘ control metrics: ${total} control declaration(s) use numeric geometry`);
  for (const item of changed.slice(0, 40)) console.error(`  ${item.file} (${item.count})`);
  process.exit(1);
}

console.log(`✔ normalized ${total} control declaration(s) across ${changed.length} file(s)`);
