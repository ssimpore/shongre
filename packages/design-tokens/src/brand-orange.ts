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
 * Finds the smallest one-per-mille blend toward the canonical ink that meets
 * the requested contrast. This keeps the interaction colour recognisably
 * Shongre Orange while making normal-size inverse text WCAG AA readable, with
 * enough headroom for the approved subtle orange surface.
 */
function accessibleBlend(
  source: HexColor,
  onColor: HexColor,
  toward: HexColor,
  minimumContrast: number,
): HexColor {
  for (let step = 0; step <= 1_000; step += 1) {
    const candidate = mixHex(source, toward, step / 1_000);
    if (contrastRatio(candidate, onColor) >= minimumContrast) return candidate;
  }
  throw new Error(
    "Unable to derive an accessible Shongre Orange interaction colour.",
  );
}

/**
 * The complete orange family is a recipe over the three approved brand
 * colours. There is deliberately no second orange literal here: changing the
 * generated canonical `orange` input recomputes every role.
 */
export function deriveShongreOrangeTokens(
  orange: HexColor,
  ink: HexColor,
  white: HexColor,
) {
  const interactive = accessibleBlend(orange, white, ink, 4.75);
  const overlay = withAlpha(orange, 0.2);
  const darkOverlaySurface = mixHex(ink, orange, 0.2);
  return {
    canonical: orange,
    interactive,
    hover: mixHex(interactive, ink, 0.12),
    active: mixHex(interactive, ink, 0.24),
    disabled: mixHex(orange, white, 0.62),
    disabledBorder: mixHex(orange, white, 0.46),
    light: mixHex(orange, white, 0.95),
    surfaceFaint: mixHex(orange, white, 0.985),
    surface: mixHex(orange, white, 0.9),
    surfaceSelected: mixHex(orange, white, 0.85),
    surfaceStrong: mixHex(orange, white, 0.8),
    border: mixHex(orange, white, 0.68),
    borderSoft: mixHex(orange, white, 0.82),
    borderStrong: mixHex(orange, white, 0.5),
    surfaceSoft: mixHex(orange, white, 0.97),
    onInverseSoft: mixHex(orange, white, 0.88),
    onInverseMuted: mixHex(orange, white, 0.7),
    fill: mixHex(orange, ink, 0.1),
    emphasis: mixHex(orange, ink, 0.28),
    ring: withAlpha(interactive, 0.2),
    ringStrong: withAlpha(interactive, 0.4),
    shadow: withAlpha(interactive, 0.2),
    shadowStrong: withAlpha(interactive, 0.3),
    overlay,
    onDark: accessibleBlend(orange, darkOverlaySurface, white, 4.75),
    onDarkRing: withAlpha(orange, 0.2),
    onDarkBorder: withAlpha(orange, 0.4),
  } as const;
}
