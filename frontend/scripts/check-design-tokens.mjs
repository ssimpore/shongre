#!/usr/bin/env node
/**
 * Enforces the canonical semantic design-token boundary.
 *
 * Application code may describe meaning (`text-muted`, `surface-inverse`,
 * `rating-fill`, `staff-surface`) but may never request a hue, shade, literal
 * colour, or Tailwind default. Raw primitives remain private to
 * `@shongre/design-tokens`; official flags and external-provider marks are
 * exposed only through that package's typed artwork registries.
 *
 * Run: node scripts/check-design-tokens.mjs
 */
import { readdirSync, readFileSync } from "fs";
import { join, relative } from "path";

/**
 * Every tree whose classes end up in the stylesheet.
 *
 * `src/index.css` declares `@source "../../packages/ui/src"` and
 * `@source "../../packages/features/src"`, so Tailwind compiles those trees
 * into the same bundle — but this guard only ever walked `src`, which left the
 * canonical primitive layer as the one place in the product where a raw hex, an
 * arbitrary radius or an undeclared token could ship unchallenged. That is the
 * wrong way round: a violation in `Button.web.tsx` reaches every screen, while
 * one in a feature reaches a single page. Keep this list in step with the
 * `@source` directives.
 */
const ROOTS = ["app", "src", "../packages/ui/src", "../packages/features/src"];
const COLOR_ASSERTION_ROOTS = [
  "e2e",
  "../packages/ui/tests",
  "../packages/features/tests",
];
const THEME_SOURCE = "../packages/design-tokens/dist/tokens.css";

/** Utility+shade combinations that have an exact semantic token equivalent. */
const BANNED = [
  {
    re: /\b(?:[a-z0-9-]+:)*(?:bg|text|border|ring|outline|divide|fill|stroke|shadow|accent|caret|decoration|placeholder|from|via|to)(?:-[trblxyse])?-(?:(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950)|white|black|orange|darkorange|orangered)(?:\/[0-9]+)?\b/,
    hint: "a semantic role such as text-muted, bg-surface-inverse, border-base, rating-fill, or staff-surface",
  },
  {
    re: /\b(?:[a-z0-9-]+:)*(?:bg|text|border|ring|outline|divide|fill|stroke|shadow|accent|caret|decoration|placeholder|from|via|to)(?:-[trblxyse])?-primary(?:-[a-z0-9-]+)?\/[0-9]+\b/,
    hint: "an explicit semantic orange surface, border, ring, overlay, or shadow token",
  },
  {
    re: /\b(?:[a-z-]+:)*bg-(emerald|green|red|rose|amber|yellow|sky|blue)-(?:50|100)\b/,
    hint: "bg-{success|warning|danger|info}-surface",
  },
  {
    re: /\b(?:[a-z-]+:)*(?:border|ring|divide|outline)-(emerald|green|red|rose|amber|yellow|sky|blue)-(?:100|200|300)\b/,
    hint: "border-{…}-border",
  },
  {
    re: /\b(?:[a-z-]+:)*(?:text|fill|stroke)-(emerald|green|red|rose|sky|blue)-(?:500|600|700|800|900|950)\b/,
    hint: "text-{success|danger|info}",
  },
  {
    re: /\b(?:[a-z-]+:)*(?:text|fill|stroke)-(amber|yellow)-(?:600|700|800|900|950)\b/,
    hint: "text-warning",
  },
  {
    re: /\b(?:[a-z-]+:)*bg-(emerald|green|red|rose|sky|blue)-(?:500|600|700)\b/,
    hint: "bg-{success|danger|info}",
  },
  // Error-state borders are unambiguous, unlike amber's 400/500 accent range.
  {
    re: /\b(?:[a-z-]+:)*border-(red|rose)-(?:400|500)\b/,
    hint: "border-danger",
  },
  /* Arbitrary type sizes. The scale in src/index.css documents `micro` (11px)
     as the smallest size allowed anywhere — "for badges, counters and dense
     metadata only, never for body copy". 45 call sites ignored it, including
     `text-[10px]` x17 and `text-[9px]` x2 inside the listing card, the mobile
     tab bar and the hero: the three components a visitor sees first. A size the
     scale genuinely lacks gets a named step (see `--text-card-title` and
     `--text-hero`), not a bracket. */
  {
    re: /\b(?:[a-z-]+:)*text-\[[0-9.]+(?:px|rem|em)\]/,
    hint: "a named step — text-micro / text-xs / text-sm / text-card-title / text-hero",
  },
  {
    re: /\b(?:[a-z-]+:)*leading-\[[^\]]+\]/,
    hint: "leading-{none|tight|snug|normal|relaxed|loose} or a named semantic token",
  },
  {
    re: /\b(?:[a-z-]+:)*tracking-\[[^\]]+\]/,
    hint: "tracking-{tighter|tight|normal|wide|wider|code} or a named semantic token",
  },
  {
    re: /\b(?:[a-z-]+:)*font-\[[^\]]+\]/,
    hint: "font-{normal|medium|semibold|bold|extrabold} or a named font token",
  },
  {
    re: /\b(?:[a-z-]+:)*font-black\b/,
    hint: "font-bold (700) or exceptional font-extrabold (800); weight 900 is not part of the Shongre hierarchy",
  },
  {
    re: /\b(?:[a-z0-9-]+:)*(?:bg|text|border|ring|outline|fill|stroke)-\[#[0-9a-f]{3,8}\]/i,
    hint: "a semantic --color-* token declared in src/index.css",
  },
  {
    re: /\b(?:[a-z0-9-]+:)*rounded(?:-[trbl]{1,2})?-\[[^\]]+\]/,
    hint: "rounded-{xs|sm|md|lg|xl|2xl|3xl|card|overlay|pill}",
  },
  {
    re: /\b(?:[a-z0-9-]+:)*shadow-\[[^\]]+\]/,
    hint: "shadow-{xs|sm|md|lg|dropdown|overlay|sticky}",
  },
  {
    re: /\b(?:[a-z0-9-]+:)*z-(?:\[[^\]]+\]|[0-9]+)\b/,
    hint: "z-{base|raised|sticky|dropdown|popover|header|drawer|modal|toast|tooltip}",
  },
  {
    re: /\b(?:[a-z0-9-]+:)*duration-(?:\[[^\]]+\]|[0-9]+)\b/,
    hint: "duration-{fast|normal|slow}",
  },
  {
    re: /\b(?:[a-z0-9-]+:)*stroke-\[[^\]]+\]/,
    hint: "the Icon primitive weight or a named stroke utility",
  },
  {
    re: /\b(?:[a-z0-9-]+:)*opacity-\[[^\]]+\]/,
    hint: "an owned opacity step",
  },
  {
    re: /\b(?:[a-z0-9-]+:)*(?:min-)?h-\[(?:32|36|40|42|44|48|52|56)px\]/,
    hint: "h-control-{sm|md|touch|lg|fab}",
  },
  /* Arbitrary utilities put visual values back into feature modules and make
     equivalent layouts drift. If a role is missing, add a semantic token to
     @shongre/design-tokens and consume its named utility instead. */
  {
    re: /\b(?:[a-z0-9-]+:)*[a-z][a-z0-9-]*-\[[^\]]+\]/,
    hint: "a named utility backed by the canonical design-token package",
  },
  {
    re: /\bstyle\s*=\s*\{\{/,
    hint: "a shared component, variant, or named token-backed CSS rule",
  },
  /* Form bounds are product policy. A literal in a page can drift from the
     schema or adapter while still looking valid in the browser. Keep bounds in
     a named domain/contract constraint and consume the same value everywhere. */
  {
    re: /\b(?:min|max|minLength|maxLength|step)\s*=\s*(?:\{\s*)?["']?-?\d[\d_.]*/,
    hint: "a named constraint shared with the relevant schema or service",
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
const OWNED_FAMILIES = ["primary", "danger", "success", "warning", "info"];

/** Colour utilities whose value resolves from the `--color-*` namespace. */
const COLOR_UTILITIES =
  "bg|text|border|ring|outline|divide|fill|stroke|shadow|accent|caret|decoration|placeholder|from|via|to";

function declaredColorTokens() {
  const css = readFileSync(THEME_SOURCE, "utf8");
  const start = css.indexOf("@theme {");
  if (start === -1) throw new Error(`${THEME_SOURCE} declares no @theme block`);
  let depth = 0;
  let end = css.length;
  for (let i = css.indexOf("{", start); i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) {
      end = i;
      break;
    }
  }
  const block = css.slice(start, end);
  return new Set(
    Array.from(block.matchAll(/--color-([a-z0-9-]+)\s*:/gi), (m) => m[1]),
  );
}

const declared = declaredColorTokens();

/**
 * Every custom property the stylesheet actually defines, from any block — the
 * `@theme` layer, `:root`, and the hand-written rules in `src/index.css`.
 */
function declaredCustomProperties() {
  const names = new Set();
  for (const source of [THEME_SOURCE, "src/index.css"]) {
    const css = readFileSync(source, "utf8");
    for (const m of css.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)) names.add(m[1]);
  }
  // Tailwind's own spacing multiplier is generated, not authored here.
  names.add("--spacing");
  return names;
}

const declaredProperties = declaredCustomProperties();

/**
 * `padding-inline: calc(var(--spacing-base) * 2)` shipped for months doing
 * nothing: `--spacing-base` was never declared, so the `calc()` was invalid at
 * computed-value time and the whole declaration was dropped. A `var()` with no
 * declaration and no fallback is silent — no console warning, no build error,
 * just a rule that quietly does not apply.
 */
function findUndeclaredCustomProperties(line) {
  const found = [];
  for (const m of line.matchAll(/var\(\s*(--[a-zA-Z0-9-]+)\s*([,)])/g)) {
    const [, name, terminator] = m;
    // A fallback makes the reference safe even when the property is absent.
    if (terminator === ",") continue;
    if (declaredProperties.has(name)) continue;
    // Properties set from component style objects at runtime.
    if (RUNTIME_CUSTOM_PROPERTIES.has(name)) continue;
    found.push(name);
  }
  return found;
}

/**
 * Set from a `style` prop rather than the stylesheet. Each must be assigned by
 * a component that also owns the rule consuming it.
 */
const RUNTIME_CUSTOM_PROPERTIES = new Set([
  "--category-accent",
  "--mobile-nav-total-h",
]);

// e.g. `hover:bg-danger-hover`, `md:border-t-primary-border`, `shadow-primary/20`
const OWNED_CLASS = new RegExp(
  `(?:^|[\\s"'\`{])(?:[a-z0-9-]+:)*(?:${COLOR_UTILITIES})(?:-[trblxyse])?-((?:${OWNED_FAMILIES.join("|")})(?:-[a-z0-9-]+)?)(?:/[^\\s"'\`]+)?(?=$|[\\s"'\`}])`,
  "g",
);

function findUndeclaredTokens(line) {
  const found = [];
  for (const m of line.matchAll(OWNED_CLASS)) {
    if (!declared.has(m[1])) found.push(m[1]);
  }
  return found;
}

/* ---------------------------------------------------------------------------
   Guard 2b: named token values outside the `--color-*` namespace.

   Guard 2 above only validates the five owned colour families, so every other
   Tailwind namespace could name a token that does not exist and ship inert.
   Four did, and none of them were visible to any test:

     - `shadow-card` on 14 call sites across employment, real-estate and auto.
       `--shadow-card` is not declared, so those cards had no elevation at all
       and three `hover:shadow-card` transitions animated nothing.
     - `bg-bg-page` on 6 pages. The declared token is `bg-base`; the pages only
       looked right because <body> already paints the same colour underneath.
     - `h-control` and `h-control-compact`, which are not steps on the control
       scale (`sm|md|touch|lg|fab`). Both sat beside a real `h-control-touch`,
       so the element kept a height and the dead class went unnoticed.

   A class whose token is undeclared produces no CSS — no warning, no error.
   That is the same failure mode as the `bg-danger-hover` bug Guard 2 was built
   for, so the rule is generalised here rather than repeated per namespace.

   Scope is deliberately narrow: only the namespaces that actually hold project
   tokens, matched by longest prefix, and only for *named* values. Numeric and
   fractional values (`h-3.5`, `max-w-27.5`, `gap-x-6`) resolve arithmetically
   from `--spacing` and are always valid; arbitrary values are already rejected
   by the BANNED list above. Anything the guard cannot classify is left alone —
   a false negative is cheap here, a false positive blocks the build.
   --------------------------------------------------------------------------- */
function declaredIn(css, namespace) {
  return new Set(
    Array.from(
      css.matchAll(new RegExp(`--${namespace}-([a-z0-9-]+)\\s*:`, "gi")),
      (m) => m[1].toLowerCase(),
    ),
  );
}

const themeCss = readFileSync(THEME_SOURCE, "utf8");
const appCss = readFileSync("src/index.css", "utf8");
const bothCss = themeCss + appCss;

/** `@utility z-modal { … }` declares a utility name with no `--token` behind it. */
const customUtilities = new Set(
  Array.from(appCss.matchAll(/@utility\s+([a-z0-9-]+)/gi), (m) => m[1]),
);

const COLOR_KEYWORDS = new Set([
  "transparent",
  "current",
  "inherit",
  "auto",
  "initial",
  "unset",
  "none",
]);
/** `max-w-screen-xl` still resolves from the breakpoint scale in Tailwind v4. */
const BREAKPOINT_WIDTH = /^screen-(?:sm|md|lg|xl|2xl)$/;
const SIZE_KEYWORDS = new Set([
  "auto",
  "full",
  "screen",
  "min",
  "max",
  "fit",
  "px",
  "none",
  "prose",
  "reverse",
  "dvh",
  "dvw",
  "svh",
  "svw",
  "lvh",
  "lvw",
  "vh",
  "vw",
  "3xs",
  "2xs",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
  "5xl",
  "6xl",
  "7xl",
]);
const SHADOW_KEYWORDS = new Set([
  "2xs",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "none",
  "inner",
  "initial",
]);
const RADIUS_KEYWORDS = new Set([
  "none",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
  "full",
  "initial",
]);

const spacingTokens = declaredIn(bothCss, "spacing");
const shadowTokens = declaredIn(bothCss, "shadow");
const radiusTokens = declaredIn(bothCss, "radius");
const colorTokens = declaredIn(bothCss, "color");
const containerTokens = declaredIn(bothCss, "container");

const isColorValue = (v) => colorTokens.has(v) || COLOR_KEYWORDS.has(v);

/**
 * `bg-*` is shared with gradients, sizing, clipping and repetition, none of
 * which name a colour token. `divide-y` / `border-x` are complete utilities
 * whose trailing letter is a side, not a value.
 */
const NON_COLOR_BG =
  /^(?:gradient|linear|radial|conic|clip|origin|repeat|blend|none|cover|contain|fixed|local|scroll|auto|center|top|bottom|left|right|position|size)\b/;
const BARE_SIDE = /^(?:t|r|b|l|x|y|s|e|tl|tr|br|bl|ss|se|ee|es|reverse)$/;

/**
 * Prefix → validator, matched longest-first so `min-h-` never parses as `min-`
 * and `gap-x-` never parses as `gap-`.
 */
const NAMESPACES = [
  [
    "max-w",
    (v) =>
      spacingTokens.has(v) || containerTokens.has(v) || SIZE_KEYWORDS.has(v),
    "--spacing-* / --container-*",
  ],
  [
    "min-w",
    (v) =>
      spacingTokens.has(v) || containerTokens.has(v) || SIZE_KEYWORDS.has(v),
    "--spacing-* / --container-*",
  ],
  ["max-h", (v) => spacingTokens.has(v) || SIZE_KEYWORDS.has(v), "--spacing-*"],
  ["min-h", (v) => spacingTokens.has(v) || SIZE_KEYWORDS.has(v), "--spacing-*"],
  ["size", (v) => spacingTokens.has(v) || SIZE_KEYWORDS.has(v), "--spacing-*"],
  [
    "shadow",
    (v) => shadowTokens.has(v) || SHADOW_KEYWORDS.has(v) || isColorValue(v),
    "--shadow-*",
  ],
  [
    "rounded",
    (v) => radiusTokens.has(v) || RADIUS_KEYWORDS.has(v),
    "--radius-*",
  ],
  ["h", (v) => spacingTokens.has(v) || SIZE_KEYWORDS.has(v), "--spacing-*"],
  [
    "w",
    (v) =>
      spacingTokens.has(v) || containerTokens.has(v) || SIZE_KEYWORDS.has(v),
    "--spacing-*",
  ],
  ["bg", isColorValue, "--color-*"],
  ["placeholder", isColorValue, "--color-*"],
  ["divide", isColorValue, "--color-*"],
  ["fill", isColorValue, "--color-*"],
  ["stroke", isColorValue, "--color-*"],
  ["accent", isColorValue, "--color-*"],
  ["caret", isColorValue, "--color-*"],
].sort((a, b) => b[0].length - a[0].length);

/** Directional variants share the base namespace: `rounded-tl-card`, `max-w-*`. */
const SIDE = "(?:-(?:t|r|b|l|x|y|s|e|tl|tr|br|bl|ss|se|ee|es))?";

const namespaceMisses = [];

/** One whitespace-delimited class token, with any leading variants stripped. */
const RAW_CLASS =
  /(?:^|[\s"'`{(])((?:[a-z0-9][a-z0-9.\/-]*:)*)(-?[a-z][a-z0-9./-]*)(?=$|[\s"'`})])/g;

function checkNamespaces(line, file, lineNo) {
  for (const m of line.matchAll(RAW_CLASS)) {
    const cls = m[2];
    if (customUtilities.has(cls)) continue;
    // Opacity modifiers (`bg-primary/20`) do not change which token is named.
    const bare = cls.split("/")[0];
    for (const [prefix, ok, label] of NAMESPACES) {
      const re = new RegExp(`^${prefix}${SIDE}-(.+)$`);
      const hit = bare.match(re);
      if (!hit) continue;
      const value = hit[1];
      // Numeric, fractional and negative values resolve arithmetically.
      if (/^-?\d/.test(value)) break;
      // `divide-y`, `border-x`: the trailing letter is the side, not a value.
      if (BARE_SIDE.test(value)) break;
      if (BREAKPOINT_WIDTH.test(value)) break;
      if (prefix === "bg" && NON_COLOR_BG.test(value)) break;
      if (!ok(value)) {
        namespaceMisses.push({ file, line: lineNo, found: cls, hint: label });
      }
      break;
    }
  }
}

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(?:css|tsx?)$/.test(p)) out.push(p);
  }
  return out;
}

const violations = [];
const undeclared = [];
const undeclaredProperties = [];
const colorSourceViolations = [];
const ALL_FILES = ROOTS.flatMap((root) => walk(root));
const COLOR_ASSERTION_FILES = COLOR_ASSERTION_ROOTS.flatMap((root) =>
  walk(root),
);

for (const file of COLOR_ASSERTION_FILES) {
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => {
      const match = line.match(BANNED[0].re);
      if (match) {
        violations.push({
          file: relative(".", file),
          line: i + 1,
          found: match[0],
          hint: BANNED[0].hint,
        });
      }
    });
}

/* ---------------------------------------------------------------------------
   Open Graph image routes are not a web surface.

   `next/og` renders through satori, which supports neither class names nor CSS
   custom properties — an inline style object is the only styling channel it
   has. These routes therefore cannot express type through `@theme` classes the
   way every rendered page must, so the three guards below skip them. They are
   held to the tokens by review instead: the hex values at the top of such a
   file must be copied from the canonical palette.

   This is the same category as the standalone documents already listed in
   `ALLOWED_WEB_FONT_DECLARATION_FILES` — output that cannot inherit the root
   class because it is not rendered inside the application shell.
   --------------------------------------------------------------------------- */
const isImageGenerationRoute = (file) =>
  /(?:^|\/)app\/og\/.+\/route\.tsx$/.test(relative(".", file));

/* ---------------------------------------------------------------------------
   Guard 3: one Web font architecture.

   `next/font` belongs at the Next.js root, the design-token package owns the
   family stack, and application surfaces inherit it. Standalone HTML returned
   by the edge 404 path or exported as a preview invoice cannot inherit the root
   class, so those two documents may consume the canonical token string
   directly. Native files retain their platform font-family mapping.
   --------------------------------------------------------------------------- */
const ALLOWED_WEB_FONT_DECLARATION_FILES = new Set([
  "src/index.css",
  "src/platform/seo/not-found-presentation.ts",
]);
const fontArchitectureViolations = [];
const nextFontImportFiles = [];

for (const file of ALL_FILES) {
  const relativeFile = relative(".", file);
  const source = readFileSync(file, "utf8");
  const isTest = /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file);
  const isNative = /\.native\.tsx?$/.test(file);

  if (/from\s+["']next\/font\/(?:google|local)["']/.test(source)) {
    nextFontImportFiles.push(relativeFile);
  }
  if (
    !isTest &&
    !isNative &&
    !isImageGenerationRoute(file) &&
    !ALLOWED_WEB_FONT_DECLARATION_FILES.has(relativeFile) &&
    /(?:font-family\s*:|\bfontFamily\s*:)/.test(source)
  ) {
    fontArchitectureViolations.push({
      file: relativeFile,
      reason:
        "declares a component or page font family instead of inheriting the application token",
    });
  }
  if (
    !isTest &&
    /(?:--font-inter\b|Inter Variable|@fontsource-variable\/inter|\bfont-display\b)/.test(
      source,
    )
  ) {
    fontArchitectureViolations.push({
      file: relativeFile,
      reason: "contains a removed Inter or display-family implementation",
    });
  }
}

if (
  nextFontImportFiles.length !== 1 ||
  nextFontImportFiles[0] !== "app/layout.tsx"
) {
  fontArchitectureViolations.push({
    file: nextFontImportFiles.join(", ") || "(none)",
    reason: "next/font must be configured exactly once in app/layout.tsx",
  });
}

const rootLayoutSource = readFileSync("app/layout.tsx", "utf8");
if (
  !/import\s*\{\s*Nunito_Sans\s*\}\s*from\s*["']next\/font\/google["']/.test(
    rootLayoutSource,
  ) ||
  (rootLayoutSource.match(/Nunito_Sans\s*\(/g) || []).length !== 1 ||
  !/variable:\s*["']--font-nunito-sans["']/.test(rootLayoutSource)
) {
  fontArchitectureViolations.push({
    file: "app/layout.tsx",
    reason: "must own the single Nunito_Sans variable loader",
  });
}

if (
  !themeCss.includes("--font-sans: var(--font-family-sans);") ||
  !themeCss.includes("--font-family-sans:")
) {
  fontArchitectureViolations.push({
    file: THEME_SOURCE,
    reason: "must expose --font-family-sans and map Tailwind font-sans to it",
  });
}

const frontendPackage = readFileSync("package.json", "utf8");
if (/@fontsource|font-(?:inter|roboto)|typeface-/.test(frontendPackage)) {
  fontArchitectureViolations.push({
    file: "package.json",
    reason: "contains a legacy or duplicate font dependency",
  });
}
for (const file of ALL_FILES) {
  const relativeFile = relative(".", file);
  const source = readFileSync(file, "utf8");
  const isTest = /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file);
  if (!isTest) {
    const rawLiteral = source.match(
      /#[\da-f]{3,8}\b|\b(?:rgba?|hsla?|oklch)\s*\(|\b(?:color|background|backgroundColor|borderColor|outlineColor|fill|stroke)\s*:\s*["']?(?:orange|darkorange|orangered)\b/i,
    );
    const rawPaletteApi = source.match(
      /\b(?:nativePalette\b|palette\s*\[|themeColors\s*\[\s*["'](?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)|--color-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)\b)/,
    );
    if (rawLiteral || rawPaletteApi) {
      const match = rawLiteral ?? rawPaletteApi;
      const line = source.slice(0, match.index).split("\n").length;
      colorSourceViolations.push({
        file: relativeFile,
        line,
        found: match[0],
      });
    }
  }
  if (isImageGenerationRoute(file)) continue;
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    for (const { re, hint } of BANNED) {
      const m = line.match(re);
      if (m)
        violations.push({
          file: relative(".", file),
          line: i + 1,
          found: m[0],
          hint,
        });
    }
    for (const token of findUndeclaredTokens(line)) {
      undeclared.push({ file: relative(".", file), line: i + 1, token });
    }
    for (const property of findUndeclaredCustomProperties(line)) {
      undeclaredProperties.push({
        file: relative(".", file),
        line: i + 1,
        property,
      });
    }
    if (!/\.test\.tsx?$/.test(file) && !file.endsWith(".css"))
      checkNamespaces(line, relative(".", file), i + 1);
  });
}

/* Typography must be expressed through classes backed by @theme. Inline
   typography bypasses responsive variants, the shared font stack and the
   accessibility floor, so keep it out of feature components. Token mirrors
   are the one intentional exception and are already covered by parity tests. */
const inlineTypography = [];
for (const file of ALL_FILES) {
  if (!file.endsWith(".tsx")) continue;
  if (file.includes("/design-system/tokens/")) continue;
  if (isImageGenerationRoute(file)) continue;
  const source = readFileSync(file, "utf8");
  const pattern =
    /style\s*=\s*\{\{[^}]*\b(fontFamily|fontSize|fontWeight|lineHeight|letterSpacing)\b[^}]*\}\}/g;
  for (const match of source.matchAll(pattern)) {
    const line = source.slice(0, match.index).split("\n").length;
    inlineTypography.push({
      file: relative(".", file),
      line,
      found: match[0].slice(0, 120),
    });
  }
}

/**
 * Text tokens must clear WCAG AA against every surface they can sit on.
 *
 * A single ratio against `bg-surface` is not enough: `text-muted` reached
 * 4.79:1 on white and shipped anyway, then failed at 4.25:1 on `bg-subtle` and
 * 4.10:1 on `bg-muted`. That one token put a serious axe violation on the
 * property detail, teacher profile, course table, admin market and CRM
 * prospecting surfaces at once, and nothing in the pipeline could see it
 * because the pages themselves were correct — the token was not.
 *
 * `text-disabled` is deliberately absent: WCAG 1.4.3 exempts inactive
 * controls, and holding it to 4.5:1 would make disabled state indistinguishable
 * from enabled.
 */
const AA_NORMAL_TEXT = 4.5;
const TEXT_TOKENS_ON_LIGHT = ["text-main", "text-secondary", "text-muted"];
const LIGHT_SURFACES = ["bg-surface", "bg-base", "bg-subtle", "bg-muted"];
const SEMANTIC_TEXT_SURFACE_PAIRS = [
  ...TEXT_TOKENS_ON_LIGHT.flatMap((textToken) =>
    LIGHT_SURFACES.map((surfaceToken) => [textToken, surfaceToken]),
  ),
  ["primary", "primary-light"],
];

function readToken(name) {
  const match = themeCss.match(
    new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{3,8})`),
  );
  return match ? match[1] : null;
}

function channel(value) {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const full =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;
  const r = parseInt(full.slice(1, 3), 16);
  const g = parseInt(full.slice(3, 5), 16);
  const b = parseInt(full.slice(5, 7), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

const contrastFailures = [];
for (const [textToken, surfaceToken] of SEMANTIC_TEXT_SURFACE_PAIRS) {
  const fg = readToken(textToken);
  if (!fg) continue;
  const bg = readToken(surfaceToken);
  if (!bg) continue;
  const ratio = contrast(fg, bg);
  if (ratio < AA_NORMAL_TEXT) {
    contrastFailures.push({ textToken, surfaceToken, fg, bg, ratio });
  }
}

if (contrastFailures.length > 0) {
  console.error(
    `\n✘ design tokens: ${contrastFailures.length} text/surface pair(s) below WCAG AA.\n`,
  );
  console.error(
    "  Body copy needs 4.5:1. A token that only passes on white fails the moment",
  );
  console.error(
    "  it is placed on a tinted panel, which is most of the product.\n",
  );
  for (const f of contrastFailures) {
    console.error(
      `  --color-${f.textToken} (${f.fg}) on --color-${f.surfaceToken} (${f.bg})\n      ${f.ratio.toFixed(2)}:1  →  needs ${AA_NORMAL_TEXT}:1`,
    );
  }
  console.error("");
}

if (colorSourceViolations.length > 0) {
  console.error(
    `\n✘ design tokens: ${colorSourceViolations.length} raw colour source escape hatch(es).\n`,
  );
  console.error(
    "  Runtime colour values must enter through a typed semantic export from @shongre/design-tokens.\n",
  );
  for (const violation of colorSourceViolations.slice(0, 40)) {
    console.error(
      `  ${violation.file}:${violation.line}\n      ${violation.found}`,
    );
  }
  console.error("");
}

if (fontArchitectureViolations.length > 0) {
  console.error(
    `\n✘ design tokens: ${fontArchitectureViolations.length} font architecture violation(s).\n`,
  );
  console.error(
    "  Web typography must come from the single Nunito Sans loader in app/layout.tsx,",
  );
  console.error(
    "  flow through --font-family-sans, and inherit through application surfaces.\n",
  );
  for (const violation of fontArchitectureViolations) {
    console.error(`  ${violation.file}\n      ${violation.reason}`);
  }
  console.error("");
}

if (inlineTypography.length > 0) {
  console.error(
    `\n✘ design tokens: ${inlineTypography.length} inline typography style(s).\n`,
  );
  console.error(
    "  Use Typography/Text primitives or token-backed utility classes so type remains responsive and consistent.\n",
  );
  for (const v of inlineTypography.slice(0, 40)) {
    console.error(`  ${v.file}:${v.line}\n      ${v.found}`);
  }
  if (inlineTypography.length > 40)
    console.error(`\n  …and ${inlineTypography.length - 40} more.`);
  console.error("");
}

if (undeclaredProperties.length > 0) {
  console.error(
    `\n✘ design tokens: ${undeclaredProperties.length} var() reference(s) name a property that is never declared.\n`,
  );
  console.error(
    "  A var() with no declaration and no fallback makes the whole declaration\n" +
      "  invalid at computed-value time, so the rule is silently dropped.\n" +
      "  Declare the property, use one that exists, or supply a fallback.\n",
  );
  for (const u of undeclaredProperties.slice(0, 40)) {
    console.error(`  ${u.file}:${u.line}\n      var(${u.property})`);
  }
  if (undeclaredProperties.length > 40)
    console.error(`\n  …and ${undeclaredProperties.length - 40} more.`);
  console.error("");
}

if (undeclared.length > 0) {
  console.error(
    `\n✘ design tokens: ${undeclared.length} class(es) name an undeclared token.\n`,
  );
  console.error(
    `  Tailwind emits no CSS for these, so they are silently inert.`,
  );
  console.error(
    `  Declare the token in ${THEME_SOURCE} (and mirror it in tokens/theme.ts), or use one that exists.\n`,
  );
  for (const u of undeclared.slice(0, 40)) {
    console.error(
      `  ${u.file}:${u.line}\n      --color-${u.token} is not declared`,
    );
  }
  if (undeclared.length > 40)
    console.error(`\n  …and ${undeclared.length - 40} more.`);
  console.error("");
}

if (namespaceMisses.length > 0) {
  console.error(
    `\n✘ design tokens: ${namespaceMisses.length} class(es) name a token that is not declared.\n`,
  );
  console.error(
    "  Tailwind emits no CSS for these, so the utility is silently inert —",
  );
  console.error(
    "  the same failure mode that shipped `shadow-card` with no elevation.\n",
  );
  for (const v of namespaceMisses.slice(0, 40)) {
    console.error(
      `  ${v.file}:${v.line}\n      ${v.found}  →  declare it in the ${v.hint} namespace, or use a step that exists`,
    );
  }
  if (namespaceMisses.length > 40)
    console.error(`\n  …and ${namespaceMisses.length - 40} more.`);
  console.error("");
}

if (
  violations.length === 0 &&
  undeclared.length === 0 &&
  undeclaredProperties.length === 0 &&
  namespaceMisses.length === 0 &&
  colorSourceViolations.length === 0 &&
  inlineTypography.length === 0 &&
  fontArchitectureViolations.length === 0 &&
  contrastFailures.length === 0
) {
  console.log(
    "✔ design system: semantic colors, contrast, type, radii, elevation, motion and stacking checks passed",
  );
  process.exit(0);
}

if (
  violations.length === 0 &&
  (inlineTypography.length > 0 ||
    undeclaredProperties.length > 0 ||
    fontArchitectureViolations.length > 0 ||
    namespaceMisses.length > 0 ||
    colorSourceViolations.length > 0 ||
    contrastFailures.length > 0)
)
  process.exit(1);

console.error(`\n✘ design tokens: ${violations.length} off-scale value(s).\n`);
console.error(
  "  These have exact semantic equivalents — see the ramp and type-scale comments in src/index.css.\n",
);
for (const v of violations.slice(0, 40)) {
  console.error(`  ${v.file}:${v.line}\n      ${v.found}  →  ${v.hint}`);
}
if (violations.length > 40)
  console.error(`\n  …and ${violations.length - 40} more.`);
console.error("");
process.exit(1);
