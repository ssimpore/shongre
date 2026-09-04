/**
 * Motion helpers shared by everything that animates imperatively.
 *
 * The stylesheet already neutralises CSS transitions and animations under
 * `prefers-reduced-motion`, but that cannot reach JavaScript-driven motion:
 * `window.scrollTo({ behavior: 'smooth' })` keeps animating regardless of the
 * user's setting. Anything that scrolls or animates from code goes through here.
 */

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** `smooth`, unless the user asked for less motion. */
const scrollBehavior = (): ScrollBehavior =>
  prefersReducedMotion() ? "auto" : "smooth";

export const scrollToTop = (): void => {
  if (typeof window === "undefined") return;
  window.scrollTo({ top: 0, behavior: scrollBehavior() });
};
