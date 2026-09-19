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
 * Every opaque orange role is the exact logo swatch. Interaction feedback uses
 * motion, elevation, borders, or opacity rather than introducing another
 * orange; subtle surfaces, rings, borders, shadows, and disabled states may
 * vary only the canonical swatch's alpha.
 */
export function deriveShongreOrangeTokens(orange: HexColor) {
  parseHex(orange);
  return {
    canonical: orange,
    interactive: orange,
    hover: orange,
    active: orange,
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
