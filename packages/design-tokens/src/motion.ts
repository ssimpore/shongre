import { themeMotion } from "./theme";

export const motion = {
  duration: {
    fast: themeMotion["duration-fast"],
    normal: themeMotion["duration-normal"],
    slow: themeMotion["duration-slow"],
  },
  easing: {
    standard: themeMotion["ease-standard"],
    enter: themeMotion["ease-out-soft"],
    exit: themeMotion["ease-standard"],
  },
} as const;
