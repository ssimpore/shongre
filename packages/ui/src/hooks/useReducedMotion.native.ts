import { useSyncExternalStore } from "react";
import { AccessibilityInfo } from "react-native";

// Share one OS subscription across controls; remain still until the preference is known.
let reduced = true;
const listeners = new Set<() => void>();
let subscription:
  ReturnType<typeof AccessibilityInfo.addEventListener> | undefined;
let revision = 0;
function update(value: boolean) {
  revision += 1;
  reduced = value;
  for (const listener of listeners) listener();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!subscription) {
    subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      update,
    );
    const request = revision;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (request === revision) update(value);
      })
      .catch(() => {
        if (request === revision) update(true);
      });
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      subscription?.remove();
      subscription = undefined;
      revision += 1;
      reduced = true;
    }
  };
}
export function useReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => reduced,
    () => true,
  );
}
