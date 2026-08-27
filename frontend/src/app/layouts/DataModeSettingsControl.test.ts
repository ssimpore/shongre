import { describe, expect, it } from "vitest";

import { allowsLocalDataModeRecovery } from "./data-mode-recovery";

describe("allowsLocalDataModeRecovery", () => {
  it.each(["local", "development", "test"] as const)(
    "allows an unauthenticated developer to leave Live mode in %s",
    (environment) => {
      expect(allowsLocalDataModeRecovery("api", environment)).toBe(true);
    },
  );

  it.each(["preview", "staging", "production"] as const)(
    "never bypasses admin authorization in %s",
    (environment) => {
      expect(allowsLocalDataModeRecovery("api", environment)).toBe(false);
    },
  );

  it("does not widen access while Demo mode is already active", () => {
    expect(allowsLocalDataModeRecovery("demo", "local")).toBe(false);
  });
});
