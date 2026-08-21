import { useEffect, useState } from "react";

/**
 * Matches a CSS media query and stays in sync with viewport changes.
 *
 * Use this when a breakpoint must change *what is mounted*, not just how it
 * looks — for example rendering a real `<table>` on desktop and stacked rows on
 * phones, or mounting only one of two marquee rails. For purely visual
 * differences prefer Tailwind's responsive classes: they need no JS and avoid a
 * first-paint mismatch.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
