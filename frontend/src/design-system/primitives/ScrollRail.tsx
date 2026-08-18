import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface ScrollRailProps {
  children: React.ReactNode;
  /** Applied to the scrolling track, alongside the overflow handling. */
  className?: string;
  /** Accessible name for the scroll controls (e.g. "onglets", "catégories"). */
  label?: string;
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
 * So the cue is made explicit, and only when it is actually needed: a gradient
 * fade plus a scroll button appears on whichever side has more content. When
 * everything fits, this renders exactly like the bare rail it replaces.
 */
export const ScrollRail: React.FC<ScrollRailProps> = ({ children, className = '', label = 'contenu' }) => {
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
      <div ref={trackRef} className={`overflow-x-auto no-scrollbar ${className}`}>
        {children}
      </div>

      {overflow.left && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-white to-transparent"
          />
          <button
            type="button"
            onClick={() => nudge(-1)}
            aria-label={`Faire défiler les ${label} vers la gauche`}
            className="absolute left-0 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white border border-border-base shadow-xs flex items-center justify-center text-stone-600 hover:text-primary hover:border-primary-border transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </>
      )}

      {overflow.right && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white to-transparent"
          />
          <button
            type="button"
            onClick={() => nudge(1)}
            aria-label={`Faire défiler les ${label} vers la droite`}
            className="absolute right-0 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white border border-border-base shadow-xs flex items-center justify-center text-stone-600 hover:text-primary hover:border-primary-border transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
};
