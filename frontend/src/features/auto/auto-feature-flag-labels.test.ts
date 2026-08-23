import { describe, expect, it } from "vitest";
import { autoFeatureFlagsSchema } from "@shongre/contracts/auto";
import {
  AUTO_FEATURE_FLAG_LABELS,
  autoFeatureFlagLabel,
} from "./auto-feature-flag-labels";

describe("automotive feature-flag labels", () => {
  it("covers every flag in the public automotive contract", () => {
    expect(Object.keys(AUTO_FEATURE_FLAG_LABELS).sort()).toEqual(
      Object.keys(autoFeatureFlagsSchema.shape).sort(),
    );
  });

  it("renders known flags as French product copy", () => {
    expect(autoFeatureFlagLabel("verticalEnabled")).toBe(
      "Verticale Auto disponible",
    );
    expect(autoFeatureFlagLabel("dealerApiSyncEnabled")).toBe(
      "Synchronisation API concessionnaires",
    );
  });

  it("keeps an unknown future flag readable", () => {
    expect(autoFeatureFlagLabel("futureFlagEnabled")).toBe("Future flag");
  });
});
