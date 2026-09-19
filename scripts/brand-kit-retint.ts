/**
 * Re-tints the flat brand artwork from one canonical orange to another.
 *
 * Every kit raster is flat colour: the orange, the ink, white and mist, over
 * transparency. Its anti-aliased edge pixels are straight-alpha blends of the
 * orange with exactly one of those partners, so a pixel is classified by the
 * partner it blends with, its blend weight is recovered from the channel the
 * partner and the orange disagree on most, and the same weight is re-applied
 * with the new orange. That keeps edges clean where a naive channel scaling
 * would darken every fringe.
 */

export type Rgb = readonly [red: number, green: number, blue: number];

export interface RetintOptions {
  /** The orange every artwork carries today. */
  from: Rgb;
  /** The orange it must carry. */
  to: Rgb;
  /** Flat colours the orange is anti-aliased against, besides transparency. */
  partners: readonly Rgb[];
  /** Per-channel tolerance for a blend to be recognised (lossy formats need more). */
  tolerance?: number;
}

export function parseRgb(hex: string): Rgb {
  const match = hex.match(/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
  if (!match)
    throw new Error(`Expected a six-digit hex colour; received ${hex}.`);
  return [
    Number.parseInt(match[1], 16),
    Number.parseInt(match[2], 16),
    Number.parseInt(match[3], 16),
  ];
}

/**
 * Recovers how much of `orange` a pixel that blends `orange` with `partner`
 * still holds, using the channel with the widest span between the two, and
 * checks the other channels agree with that weight within `tolerance`.
 */
function blendWeight(
  pixel: Rgb,
  orange: Rgb,
  partner: Rgb,
  tolerance: number,
): number | null {
  let widest = 0;
  for (let channel = 1; channel < 3; channel += 1) {
    if (
      Math.abs(orange[channel] - partner[channel]) >
      Math.abs(orange[widest] - partner[widest])
    ) {
      widest = channel;
    }
  }
  const span = orange[widest] - partner[widest];
  if (Math.abs(span) < 40) return null;
  const weight = (pixel[widest] - partner[widest]) / span;
  if (weight < -0.02 || weight > 1.02) return null;
  const clamped = Math.min(1, Math.max(0, weight));
  for (let channel = 0; channel < 3; channel += 1) {
    const expected =
      orange[channel] * clamped + partner[channel] * (1 - clamped);
    if (Math.abs(expected - pixel[channel]) > tolerance) return null;
  }
  return clamped;
}

/**
 * Re-tints one straight-alpha RGBA buffer in place and returns how many
 * pixels changed. Pixels that are neither the orange nor a recognised blend of
 * it are left untouched, so ink, white and mist artwork passes through byte
 * for byte.
 */
export function retintRgba(
  data: Uint8Array | Buffer,
  options: RetintOptions,
): number {
  const tolerance = options.tolerance ?? 3;
  const { from, to } = options;
  let changed = 0;
  for (let offset = 0; offset < data.length; offset += 4) {
    const alpha = data[offset + 3];
    if (alpha === 0) continue;
    const pixel: Rgb = [data[offset], data[offset + 1], data[offset + 2]];
    // Exact or near-exact orange, at any alpha: edges over transparency keep
    // the orange itself and vary only the alpha channel.
    if (
      Math.abs(pixel[0] - from[0]) <= tolerance &&
      Math.abs(pixel[1] - from[1]) <= tolerance &&
      Math.abs(pixel[2] - from[2]) <= tolerance
    ) {
      data[offset] = to[0];
      data[offset + 1] = to[1];
      data[offset + 2] = to[2];
      changed += 1;
      continue;
    }
    let best: { weight: number; partner: Rgb; error: number } | null = null;
    for (const partner of options.partners) {
      const weight = blendWeight(pixel, from, partner, tolerance);
      if (weight === null || weight <= 0) continue;
      let error = 0;
      for (let channel = 0; channel < 3; channel += 1) {
        error += Math.abs(
          from[channel] * weight +
            partner[channel] * (1 - weight) -
            pixel[channel],
        );
      }
      if (!best || error < best.error) best = { weight, partner, error };
    }
    if (best) {
      for (let channel = 0; channel < 3; channel += 1) {
        data[offset + channel] = Math.round(
          to[channel] * best.weight + best.partner[channel] * (1 - best.weight),
        );
      }
      changed += 1;
      continue;
    }
    // Resampling ringing in the smallest icons leaves a few pixels of the
    // orange hue that blend with nothing (an overshoot such as 255,90,0).
    // They keep their relation to the orange: each channel is scaled the way
    // the orange's own channel moved.
    if (isSameHue(pixel, from)) {
      for (let channel = 0; channel < 3; channel += 1) {
        data[offset + channel] =
          from[channel] === 0
            ? Math.min(255, pixel[channel])
            : Math.min(
                255,
                Math.round((pixel[channel] * to[channel]) / from[channel]),
              );
      }
      changed += 1;
    }
  }
  return changed;
}

function hue([red, green, blue]: Rgb): number | null {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  if (delta === 0 || max === 0 || delta / max < 0.6) return null;
  let value =
    max === red
      ? ((green - blue) / delta) % 6
      : max === green
        ? (blue - red) / delta + 2
        : (red - green) / delta + 4;
  value = (value * 60 + 360) % 360;
  return value;
}

function isSameHue(pixel: Rgb, orange: Rgb): boolean {
  const pixelHue = hue(pixel);
  const orangeHue = hue(orange);
  if (pixelHue === null || orangeHue === null) return false;
  const distance = Math.abs(pixelHue - orangeHue);
  return Math.min(distance, 360 - distance) <= 12;
}
