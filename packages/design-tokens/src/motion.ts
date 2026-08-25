import { themeMotion } from "./theme";

export const motion = {
  duration: {
    fast: themeMotion["duration-fast"],
    normal: themeMotion["duration-normal"],
    slow: themeMotion["duration-slow"],
    feedback: themeMotion["duration-feedback"],
  },
  easing: {
    standard: themeMotion["ease-standard"],
    enter: themeMotion["ease-out-soft"],
    exit: themeMotion["ease-standard"],
  },
} as const;

const milliseconds = (duration: string) => {
  if (!duration.endsWith("ms")) {
    throw new Error(
      `Expected a millisecond duration token, received ${duration}`,
    );
  }
  return Number.parseFloat(duration);
};

/** Numeric adapters for JavaScript timers, derived from canonical tokens. */
export const motionDurationMs = {
  fast: milliseconds(motion.duration.fast),
  normal: milliseconds(motion.duration.normal),
  slow: milliseconds(motion.duration.slow),
  feedback: milliseconds(motion.duration.feedback),
} as const;
