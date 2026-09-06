import { describe, expect, it } from "vitest";
import { localSeedUuid } from "../../scripts/seed/local-seed-identity.js";

describe("local development seed identity", () => {
  it("returns stable RFC-compatible UUIDs scoped by entity kind", () => {
    const first = localSeedUuid("profile", "user_camille");
    expect(first).toBe(localSeedUuid("profile", "user_camille"));
    expect(first).not.toBe(localSeedUuid("listing", "user_camille"));
    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});
