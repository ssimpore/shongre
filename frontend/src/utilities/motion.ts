/**
 * Motion helpers shared by everything that animates imperatively.
 *
 * The stylesheet already neutralises CSS transitions and animations under
 * `prefers-reduced-motion`, but that cannot reach JavaScript-driven motion:
 * `window.scrollTo({ behavior: 'smooth' })` keeps animating regardless of the
 * user's setting. Anything that scrolls or animates from code goes through here.
 */

/** Duration tokens, mirroring `--duration-*` in `src/index.css`. */
export const DURATION = {
  fast: 150,
  normal: 250,
  slow: 350,
} as const;

export type DurationToken = keyof typeof DURATION;

export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** `smooth`, unless the user asked for less motion. */
export const scrollBehavior = (): ScrollBehavior =>
  prefersReducedMotion() ? 'auto' : 'smooth';

/** Returns 0 when the user asked for less motion, so timed UI resolves at once. */
export const motionDuration = (token: DurationToken): number =>
  prefersReducedMotion() ? 0 : DURATION[token];

export const scrollToTop = (): void => {
  if (typeof window === 'undefined') return;
  window.scrollTo({ top: 0, behavior: scrollBehavior() });
};

/** Brings an element into view without fighting the reduced-motion setting. */
export const scrollIntoView = (
  element: Element | null | undefined,
  options: Omit<ScrollIntoViewOptions, 'behavior'> = { block: 'start' },
): void => {
  element?.scrollIntoView({ ...options, behavior: scrollBehavior() });
};
