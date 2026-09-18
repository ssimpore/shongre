import React, { useEffect, useRef, useState } from "react";

export interface DeferUntilVisibleProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "children"
> {
  children: React.ReactNode;
  /**
   * Rendered until the slot is on screen. Give it the children's footprint so
   * nothing moves when they arrive.
   */
  fallback?: React.ReactNode;
  /**
   * How far outside the viewport counts as "visible", in CSS margin syntax.
   * The default starts the work one screen early, so a reader scrolling at a
   * normal pace never sees the fallback.
   */
  rootMargin?: string;
}

/**
 * Mounts its children the first time their slot is actually on screen.
 *
 * `React.lazy` keeps a heavy module out of the initial bundle, but a lazy
 * component that mounts on page load still downloads and runs on page load.
 * That is what a map five screens down a detail page was doing: the renderer,
 * its worker and the first tiles — a few megabytes — for a section most
 * readers never reach. The same held for a results map panel that a
 * breakpoint hides: `display: none` costs nothing to lay out and everything to
 * fetch.
 *
 * Visibility is the honest gate for both. An element that is hidden by CSS
 * never intersects, so nothing loads; when the breakpoint reveals it or the
 * reader scrolls towards it, the observer fires once and the children take
 * over. The server renders the fallback, which keeps hydration exact.
 *
 * Without `IntersectionObserver` the children mount immediately — a browser
 * that old is better served slowly than not at all.
 */
export function DeferUntilVisible({
  children,
  fallback = null,
  rootMargin = "100%",
  ...divProps
}: DeferUntilVisibleProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const slot = slotRef.current;
    if (!slot) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        setVisible(true);
      },
      { rootMargin },
    );
    observer.observe(slot);
    return () => observer.disconnect();
  }, [visible, rootMargin]);

  return (
    <div ref={slotRef} {...divProps}>
      {visible ? children : fallback}
    </div>
  );
}
