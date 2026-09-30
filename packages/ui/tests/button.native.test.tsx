import { beforeEach, describe, expect, it, vi } from "vitest";
import { themeMotion } from "@shongre/design-tokens";

const preference = vi.hoisted(() => ({ reduced: false }));
vi.mock("../src/hooks/useReducedMotion.native", () => ({
  useReducedMotion: () => preference.reduced,
}));
vi.mock("react-native", () => ({
  Pressable: "Pressable",
  Text: "Text",
  ActivityIndicator: "ActivityIndicator",
  StyleSheet: { create: (styles: unknown) => styles },
}));

import { Button } from "../src/primitives/Button.native";

const variants = [
  "primary",
  "secondary",
  "outline",
  "ghost",
  "danger",
  "pro",
] as const;

function pressedStyle(props: Parameters<typeof Button>[0]) {
  const element = Button(props);
  return Object.assign(
    {},
    ...element.props.style({ pressed: true }).filter(Boolean),
  );
}

describe("native button feedback", () => {
  beforeEach(() => {
    preference.reduced = false;
  });

  it.each(variants)("uses the same control response for %s", (variant) => {
    expect(
      pressedStyle({ variant, label: "Continuer", onPress: vi.fn() }).transform,
    ).toEqual([{ scale: Number(themeMotion["motion-press-control-scale"]) }]);
  });

  it.each(variants)("keeps %s stationary in reduced motion", (variant) => {
    preference.reduced = true;
    const props = { variant, label: "Continuer", onPress: vi.fn() };
    const element = Button(props);
    const resting = Object.assign(
      {},
      ...element.props.style({ pressed: false }).filter(Boolean),
    );
    const pressed = pressedStyle(props);
    expect(pressed.transform).toBeUndefined();
    expect(
      pressed.borderColor !== resting.borderColor ||
        pressed.opacity !== resting.opacity,
    ).toBe(true);
  });

  it.each(variants)("does not move unavailable %s controls", (variant) => {
    for (const state of [{ disabled: true }, { isLoading: true }]) {
      const props = {
        variant,
        label: "Continuer",
        onPress: vi.fn(),
        ...state,
      };
      expect(pressedStyle(props).transform).toBeUndefined();
      expect(Button(props).props.disabled).toBe(true);
    }
  });
});
