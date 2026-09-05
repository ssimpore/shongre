/**
 * Produces a stable UUID-shaped identifier without randomness or platform APIs.
 * Intended for deterministic fixtures and demo adapters, never security tokens.
 */
export function deterministicUuid(namespace: string, value: string): string {
  const source = `${namespace}:${value}`;
  let output = "";

  for (let round = 0; round < 4; round += 1) {
    let hash = 2_166_136_261 ^ round;
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16_777_619);
    }
    output += (hash >>> 0).toString(16).padStart(8, "0");
  }

  const versioned = `${output.slice(0, 12)}4${output.slice(13, 16)}8${output.slice(17)}`;
  return `${versioned.slice(0, 8)}-${versioned.slice(8, 12)}-${versioned.slice(12, 16)}-${versioned.slice(16, 20)}-${versioned.slice(20, 32)}`;
}
