/**
 * Reading a PostGIS point back out of the database.
 *
 * A `geography(Point)` column does not come back as `POINT(x y)` and it does not
 * come back as GeoJSON. PostgREST hands over the raw EWKB hex — a string like
 * `0101000020E6100000E9263108AC1C13403333333333E34640` — which the previous
 * parser recognised as neither, so every real-estate listing in the product
 * published `latitude: 0, longitude: 0` while its row held a perfectly good
 * coordinate. The public map drew nothing, or worse, drew the Gulf of Guinea.
 *
 * All three input shapes are accepted because all three are real: GeoJSON when
 * a query casts to `json`, well-known text when it casts to `text`, and EWKB
 * hex when it does neither — which is the default, and therefore the one that
 * mattered.
 */

export interface GeographyPoint {
  latitude: number;
  longitude: number;
}

/** `0x20000000` — the EWKB flag saying an SRID follows the type word. */
const EWKB_SRID_FLAG = 0x20000000;
/** `0x80000000` / `0x40000000` — a Z or M ordinate follows X and Y. */
const EWKB_Z_FLAG = 0x80000000;
const EWKB_M_FLAG = 0x40000000;
const WKB_POINT = 1;

function parseEwkbHex(value: string): GeographyPoint | null {
  // Two hex characters per byte, and a point is never shorter than
  // endianness + type + two doubles.
  if (!/^[0-9a-fA-F]+$/.test(value) || value.length < 42) return null;
  let buffer: Buffer;
  try {
    buffer = Buffer.from(value, "hex");
  } catch {
    return null;
  }
  if (buffer.length < 21) return null;

  const endianness = buffer.readUInt8(0);
  if (endianness !== 0 && endianness !== 1) return null;
  const little = endianness === 1;
  const readU32 = (at: number) =>
    little ? buffer.readUInt32LE(at) : buffer.readUInt32BE(at);
  const readF64 = (at: number) =>
    little ? buffer.readDoubleLE(at) : buffer.readDoubleBE(at);

  const typeWord = readU32(1);
  // The low 16 bits carry the geometry type; the high bits are flags. Anything
  // that is not a point (a polygon, a collection) has no single coordinate to
  // report, so it is absence rather than a guess at its centre.
  if ((typeWord & 0xffff) !== WKB_POINT) return null;

  let offset = 5;
  if (typeWord & EWKB_SRID_FLAG) offset += 4;
  const ordinates =
    2 + (typeWord & EWKB_Z_FLAG ? 1 : 0) + (typeWord & EWKB_M_FLAG ? 1 : 0);
  if (buffer.length < offset + ordinates * 8) return null;

  // EWKB is always X then Y — longitude then latitude, the opposite of how
  // every human writes a coordinate.
  const longitude = readF64(offset);
  const latitude = readF64(offset + 8);
  return isUsable(latitude, longitude) ? { latitude, longitude } : null;
}

function isUsable(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  );
}

/**
 * The coordinate a geography column holds, or `null` when it holds none.
 *
 * Null rather than a zeroed pair: `(0, 0)` is a real place in the Gulf of
 * Guinea, roughly 4 500 km from the nearest Shongre market, and returning it
 * for "unknown" is how a Lyon apartment ends up on a map of the Atlantic.
 */
export function parseGeographyPoint(value: unknown): GeographyPoint | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "object") {
    const coordinates = (value as { coordinates?: unknown }).coordinates;
    if (Array.isArray(coordinates) && coordinates.length >= 2) {
      const [longitude, latitude] = coordinates as number[];
      return isUsable(latitude, longitude) ? { latitude, longitude } : null;
    }
    return null;
  }

  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;

  // `SRID=4326;POINT(4.8881 45.7503)` — extended well-known text.
  const wkt = text.match(/POINT\s*\(\s*(-?[\d.]+)\s+(-?[\d.]+)/i);
  if (wkt) {
    const longitude = Number(wkt[1]);
    const latitude = Number(wkt[2]);
    return isUsable(latitude, longitude) ? { latitude, longitude } : null;
  }

  return parseEwkbHex(text);
}
