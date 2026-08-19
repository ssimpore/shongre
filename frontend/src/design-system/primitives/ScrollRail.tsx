import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface ScrollRailProps {
  children: React.ReactNode;
  /** Applied to the scrolling track, alongside the overflow handling. */
  className?: string;
  /** Accessible name for the scroll controls (e.g. "onglets", "catégories"). */
  label?: string;
  /**
   * Snaps items to the track's leading edge.
   *
   * Opt-in because it suits card rails and not chip rows: a card stranded
   * half-off the edge is unreadable, whereas snapping a row of short pills makes
   * scrolling feel like it is fighting the finger. Items still need their own
   * `snap-start` — this supplies the container half of the contract, which the
   * collections rail was missing, so its cards carried `snap-start` and never
   * snapped.
   *
   * `mandatory`, matching the hero rail. Note for anyone debugging the buttons
   * through a CDP-driven browser: `scrollBy({ behavior: 'smooth' })` does not
   * animate there and reads as "the arrows do nothing", on snapped and unsnapped
   * rails alike. It works in real Chromium — verified from the Playwright suite,
   * which is the harness to trust for this.
   */
  snap?: boolean;
}

/**
 * Horizontal rail that reveals its own overflow.
 *
 * index.css documents the house pattern: rails scroll with `.no-scrollbar` and
 * "the affordance is the content bleeding off-edge". That works when an item is
 * visibly clipped mid-word — but when the last item happens to end near the
 * boundary there is no bleed to see, and the item simply looks absent. On the
 * taxonomy console the strip ran to 1508px in a 1440px viewport and hid an
 * entire tab ("Historique & Audit") with no cue at all.
 *
 * So the cue is made explicit, and only when it is actually needed: a scroll
 * button appears on whichever side has more content. When everything fits, this
 * renders exactly like the bare rail it replaces.
 *
 * There is deliberately no gradient fade behind those buttons. It read as a
 * shadow smeared down the edge of the content rather than as a hint, and on a
 * card rail it dimmed the artwork of whichever card sat at the boundary.
 */
export const ScrollRail: React.FC<ScrollRailProps> = ({
  children,
  className = '',
  label = 'contenu',
  snap = false,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setOverflow({
      left: el.scrollLeft > 2,
      right: max > 2 && el.scrollLeft < max - 2,
    });
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // Children changing width (tab labels, chips) also changes overflow.
    Array.from(el.children).forEach((c) => ro.observe(c));
    el.addEventListener('scroll', measure, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', measure);
    };
  }, [measure, children]);

  const nudge = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(160, el.clientWidth * 0.7), behavior: 'smooth' });
  };

  return (
    <div className="relative min-w-0">
      <div
        ref={trackRef}
        className={`overflow-x-auto no-scrollbar ${
          snap ? 'snap-x snap-mandatory scroll-px-4 sm:scroll-px-0' : ''
        } ${className}`}
      >
        {children}
      </div>

      {/* No gradient fades. They read as a shadow smeared across the edge of
          the content rather than as a hint, and over a card rail they dimmed the
          artwork of whichever card sat at the boundary. The scroll buttons are
          the affordance; snapping (see `snap`) is what stops an item being
          stranded half-clipped in the first place. */}
      {overflow.left && (
        <button
          type="button"
          onClick={() => nudge(-1)}
          aria-label={`Faire défiler les ${label} vers la gauche`}
          className="absolute left-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 backdrop-blur-xs border border-border-base shadow-md hover:shadow-lg flex items-center justify-center text-stone-700 hover:text-primary hover:border-primary-border transition-all cursor-pointer active:scale-95 z-20"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {overflow.right && (
        <button
          type="button"
          onClick={() => nudge(1)}
          aria-label={`Faire défiler les ${label} vers la droite`}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 backdrop-blur-xs border border-border-base shadow-md hover:shadow-lg flex items-center justify-center text-stone-700 hover:text-primary hover:border-primary-border transition-all cursor-pointer active:scale-95 z-20"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};
