import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  themeColors,
  themeRadii,
  themeText,
  themeControlSizes,
  themeContainers,
  themeMotion,
} from './theme';
import { radii } from './radii';

const here = dirname(fileURLToPath(import.meta.url));
const indexCss = readFileSync(resolve(here, '../../index.css'), 'utf8');

/** Extract the `@theme { … }` block from index.css. */
function readThemeBlock(): string {
  const start = indexCss.indexOf('@theme {');
  expect(start, 'index.css must declare an @theme block').toBeGreaterThan(-1);
  let depth = 0;
  for (let i = indexCss.indexOf('{', start); i < indexCss.length; i++) {
    if (indexCss[i] === '{') depth++;
    else if (indexCss[i] === '}') {
      depth--;
      if (depth === 0) return indexCss.slice(start, i);
    }
  }
  throw new Error('Unterminated @theme block in index.css');
}

const themeBlock = readThemeBlock();

/** Map every `--custom-property: value;` declared in the @theme block. */
const declaredVars = new Map<string, string>();
for (const match of themeBlock.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
  declaredVars.set(match[1], match[2].trim());
}

function expectVar(name: string, expected: string) {
  const actual = declaredVars.get(name);
  expect(
    actual,
    `index.css @theme is missing ${name} — it is declared in design-system/tokens/theme.ts`
  ).toBeDefined();
  expect(actual, `${name} drifted between index.css and tokens/theme.ts`).toBe(expected);
}

describe('design tokens ↔ index.css parity', () => {
  it('declares every colour token with the same value', () => {
    for (const [name, value] of Object.entries(themeColors)) {
      expectVar(`--color-${name}`, value);
    }
  });

  it('declares every radius token with the same value', () => {
    for (const [name, value] of Object.entries(themeRadii)) {
      expectVar(`--radius-${name}`, value);
    }
  });

  it('declares the micro type size', () => {
    for (const [name, value] of Object.entries(themeText)) {
      expectVar(`--text-${name}`, value);
    }
  });

  it('declares shared control heights and container widths', () => {
    for (const [name, value] of Object.entries(themeControlSizes)) {
      expectVar(`--spacing-${name}`, value);
    }
    for (const [name, value] of Object.entries(themeContainers)) {
      expectVar(`--container-${name}`, value);
    }
  });

  it('declares the motion vocabulary', () => {
    for (const [name, value] of Object.entries(themeMotion)) {
      expectVar(`--${name}`, value);
    }
  });
});

describe('radius scale is coherent', () => {
  it('maps semantic aliases onto the shared scale', () => {
    // These are the four radii the product actually reasons about. Pinning them
    // to named tokens is what stops components inventing their own corners —
    // `card` and `modal` map to the shell radii rather than to numbered steps,
    // because the 20px/28px shells are not steps on the numbered scale.
    expect(radii.button).toBe(themeRadii.xl);
    expect(radii.input).toBe(themeRadii.xl);
    expect(radii.card).toBe(themeRadii.card);
    expect(radii.modal).toBe(themeRadii.overlay);
  });

  it('increases monotonically', () => {
    const scale = [
      themeRadii.xs,
      themeRadii.sm,
      themeRadii.md,
      themeRadii.lg,
      themeRadii.xl,
      themeRadii['2xl'],
      themeRadii['3xl'],
    ].map((v) => parseFloat(v));

    for (let i = 1; i < scale.length; i++) {
      expect(scale[i], `radius scale step ${i} must be larger than the previous`).toBeGreaterThan(
        scale[i - 1]
      );
    }
  });
});

/** Relative luminance per WCAG 2.1 §relative-luminance. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const linear = channels.map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)];
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

describe('brand colour contrast (WCAG 2.1 AA)', () => {
  const AA_NORMAL = 4.5;

  // The light surfaces the brand colour is actually rendered against, measured
  // from the running app. Primary never sits on bg-subtle/bg-muted as text.
  const lightSurfaces = [
    themeColors['bg-surface'],
    themeColors['bg-base'],
    themeColors['primary-light'],
  ];

  it('keeps primary readable as text on every light surface it is used on', () => {
    for (const surface of lightSurfaces) {
      expect(
        contrast(themeColors.primary, surface),
        `primary ${themeColors.primary} on ${surface} must reach AA for normal text`
      ).toBeGreaterThanOrEqual(AA_NORMAL);
    }
  });

  it('keeps white readable on primary fills (buttons, badges, CTAs)', () => {
    for (const fill of [themeColors.primary, themeColors['primary-hover'], themeColors['primary-active']]) {
      expect(contrast('#FFFFFF', fill), `white on ${fill} must reach AA`).toBeGreaterThanOrEqual(
        AA_NORMAL
      );
    }
  });

  it('keeps the on-dark variant readable on dark panels', () => {
    expect(contrast(themeColors['primary-on-dark'], themeColors['stone-900'])).toBeGreaterThanOrEqual(
      AA_NORMAL
    );
  });

  it('keeps hover and active perceptibly darker than the step before', () => {
    const ramp = [themeColors.primary, themeColors['primary-hover'], themeColors['primary-active']];
    for (let i = 1; i < ramp.length; i++) {
      const step = luminance(ramp[i - 1]) / luminance(ramp[i]);
      expect(step, `${ramp[i]} must be a visible step darker than ${ramp[i - 1]}`).toBeGreaterThan(
        1.15
      );
    }
  });

  it('keeps semantic status colours readable on their own surfaces', () => {
    const combos: [string, string][] = [
      [themeColors.success, themeColors['success-surface']],
      [themeColors.warning, themeColors['warning-surface']],
      [themeColors.danger, themeColors['danger-surface']],
      [themeColors.info, themeColors['info-surface']],
    ];
    for (const [fg, bg] of combos) {
      expect(contrast(fg, bg), `${fg} on ${bg} must reach AA`).toBeGreaterThanOrEqual(AA_NORMAL);
    }
  });
});

describe('typography floor', () => {
  it('keeps 11px as the smallest size in the system', () => {
    // 8px/9px/10px labels used to be scattered across ~420 call sites.
    expect(parseFloat(themeText.micro) * 16).toBe(11);
  });

  it('does not reintroduce ad-hoc sub-micro font sizes in index.css', () => {
    const fontSizes = [...indexCss.matchAll(/--text-[a-z0-9-]+\s*:\s*([0-9.]+)rem/gi)].map((m) =>
      parseFloat(m[1] as string)
    );
    for (const size of fontSizes) {
      expect(size * 16).toBeGreaterThanOrEqual(11);
    }
  });
});
