export type HexColor = `#${string}`;

type Rgb = readonly [red: number, green: number, blue: number];

const HEX_COLOR = /^#[\da-f]{6}$/i;

function parseHex(value: HexColor): Rgb {
  if (!HEX_COLOR.test(value)) {
    throw new Error(
      `Expected a six-digit hexadecimal colour; received ${value}.`,
    );
  }
  return [
    Number.parseInt(value.slice(1, 3), 16),
    Number.parseInt(value.slice(3, 5), 16),
    Number.parseInt(value.slice(5, 7), 16),
  ];
}

function formatHex([red, green, blue]: Rgb): HexColor {
  const channel = (value: number) =>
    Math.round(value).toString(16).padStart(2, "0").toUpperCase();
  return `#${channel(red)}${channel(green)}${channel(blue)}`;
}

function withAlpha(value: HexColor, opacity: number): HexColor {
  if (opacity < 0 || opacity > 1) {
    throw new Error("A colour opacity must be between zero and one.");
  }
  return `${value}${Math.round(opacity * 255)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase()}`;
}

/** Deterministically mixes two canonical colours in sRGB space. */
export function mixHex(
  source: HexColor,
  destination: HexColor,
  destinationWeight: number,
): HexColor {
  if (destinationWeight < 0 || destinationWeight > 1) {
    throw new Error("A colour-mix weight must be between zero and one.");
  }
  const from = parseHex(source);
  const to = parseHex(destination);
  return formatHex(
    from.map(
      (channel, index) =>
        channel * (1 - destinationWeight) + to[index] * destinationWeight,
    ) as unknown as Rgb,
  );
}

function relativeLuminance(value: HexColor): number {
  const channels = parseHex(value).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function contrastRatio(first: HexColor, second: HexColor): number {
  const [lighter, darker] = [
    relativeLuminance(first),
    relativeLuminance(second),
  ].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Darkens `value` toward black until it clears `target` contrast against
 * `against`, returning the lightest shade that qualifies.
 *
 * Deriving this rather than hard-coding a hex keeps the readable ramp correct
 * if the canonical orange is ever re-tuned: the ratio is the contract, the hex
 * is just its current solution.
 */
function darkenToContrast(
  value: HexColor,
  against: HexColor,
  target: number,
): HexColor {
  for (let weight = 0; weight <= 1; weight += 0.01) {
    const candidate = mixHex(value, "#000000", weight);
    if (contrastRatio(candidate, against) >= target) return candidate;
  }
  throw new Error(
    `No shade of ${value} reaches ${target}:1 against ${against}.`,
  );
}

/**
 * `canonical` is the exact logo swatch, and the alpha-derived surface, border,
 * ring and shadow roles all keep it untinted.
 *
 * `interactive`/`hover`/`active` are the one deliberate departure. The canonical
 * orange measures 2.95:1 against white, so it fails WCAG AA as a text colour on
 * light grounds *and* as a fill behind white labels — the same ratio in both
 * directions. Those three roles are therefore darkened to clear AA by
 * construction. The brand mark itself is an image asset and is unaffected, and
 * `onDark*` stays canonical because orange on a dark ground is the opposite
 * problem: there the canonical swatch already measures ~6:1 and darkening it
 * would lose contrast.
 */
export function deriveShongreOrangeTokens(orange: HexColor) {
  parseHex(orange);
  const readable = darkenToContrast(orange, "#FFFFFF", 4.5);
  return {
    canonical: orange,
    interactive: readable,
    hover: mixHex(readable, "#000000", 0.1),
    active: mixHex(readable, "#000000", 0.18),
    disabled: withAlpha(orange, 0.38),
    disabledBorder: withAlpha(orange, 0.54),
    light: withAlpha(orange, 0.05),
    surfaceFaint: withAlpha(orange, 0.015),
    surface: withAlpha(orange, 0.1),
    surfaceSelected: withAlpha(orange, 0.15),
    surfaceStrong: withAlpha(orange, 0.2),
    border: withAlpha(orange, 0.32),
    borderSoft: withAlpha(orange, 0.18),
    borderStrong: withAlpha(orange, 0.5),
    surfaceSoft: withAlpha(orange, 0.03),
    onInverseSoft: orange,
    onInverseMuted: orange,
    fill: orange,
    emphasis: orange,
    ring: withAlpha(orange, 0.2),
    ringStrong: withAlpha(orange, 0.4),
    shadow: withAlpha(orange, 0.2),
    shadowStrong: withAlpha(orange, 0.3),
    overlay: withAlpha(orange, 0.1),
    onDark: orange,
    onDarkRing: withAlpha(orange, 0.2),
    onDarkBorder: withAlpha(orange, 0.4),
  } as const;
}
