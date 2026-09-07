import { describe, expect, it } from "vitest";

import { nativeTextInputAccessibilityState } from "../src/utils/nativeAccessibility";

describe("native form accessibility state", () => {
  it("announces default and explicitly editable fields as enabled", () => {
    expect(nativeTextInputAccessibilityState(undefined)).toEqual({
      disabled: false,
    });
    expect(nativeTextInputAccessibilityState(true)).toEqual({
      disabled: false,
    });
  });

  it("announces only explicitly non-editable fields as disabled", () => {
    expect(nativeTextInputAccessibilityState(false)).toEqual({
      disabled: true,
    });
    expect(
      nativeTextInputAccessibilityState(undefined, {
        busy: true,
        disabled: true,
      }),
    ).toEqual({ busy: true, disabled: true });
  });
});
