import { describe, expect, it } from "vitest";
import { deterministicUuid } from "./deterministic-id";

describe("deterministicUuid", () => {
  it("returns stable, namespaced UUIDs for demo data", () => {
    const first = deterministicUuid("delivery-request", "user:FR:key");
    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(deterministicUuid("delivery-request", "user:FR:key")).toBe(first);
    expect(deterministicUuid("delivery-application", "user:FR:key")).not.toBe(
      first,
    );
  });
});
