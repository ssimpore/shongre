import type { AccessibilityState } from "react-native";

export function nativeTextInputAccessibilityState(
  editable: boolean | undefined,
  state?: AccessibilityState,
): AccessibilityState {
  return {
    ...state,
    disabled: editable === false || state?.disabled === true,
  };
}
