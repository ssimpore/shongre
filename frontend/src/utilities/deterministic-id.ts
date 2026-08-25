/** Stable FNV-1a identifier for deterministic demo records and scenarios. */
export function deterministicId(prefix: string, parts: unknown[]): string {
  const serialized = JSON.stringify(parts, (_key, value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return value;
    }
    return Object.fromEntries(
      Object.entries(value).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    );
  });
  let hash = 2_166_136_261;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return `${prefix}_${(hash >>> 0).toString(36)}`;
}

let runtimeSequence = 0;

/**
 * Produces distinct ids from deterministic input plus deterministic call order.
 * The sequence intentionally resets with the demo runtime, unlike Math.random.
 */
export function deterministicRuntimeId(
  prefix: string,
  parts: unknown[] = [],
): string {
  runtimeSequence += 1;
  return deterministicId(prefix, [...parts, runtimeSequence]);
}

/** Human-readable code generated from the same deterministic hash. */
export function deterministicCode(
  prefix: string,
  length: number,
  parts: unknown[] = [],
  alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789",
): string {
  const hash = deterministicRuntimeId("code", [prefix, ...parts]);
  let state = 2_166_136_261;
  for (const char of hash) {
    state ^= char.charCodeAt(0);
    state = Math.imul(state, 16_777_619);
  }
  let value = "";
  for (let index = 0; index < length; index += 1) {
    state = Math.imul(state ^ (index + 1), 16_777_619);
    value += alphabet[(state >>> 0) % alphabet.length];
  }
  return `${prefix}${value}`;
}
