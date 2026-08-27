import { useEffect, useId, useRef } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * The last control the user actually pressed.
 *
 * Safari does not focus a `<button>` when it is clicked, so on open
 * `document.activeElement` is `<body>` — and "return focus to whatever was
 * focused before" restored focus to nothing, dropping keyboard and VoiceOver
 * users back at the top of the document every time they closed a sheet.
 * Tracking the pressed control gives the restore step something real to aim at
 * on every engine.
 */
let lastPressedControl: HTMLElement | null = null;
let lastPressedAt = 0;
if (typeof document !== "undefined") {
  const rememberPressedControl = (event: Event) => {
    const control = (event.target as HTMLElement | null)?.closest?.(
      'button, a[href], [role="button"], summary',
    );
    if (control) {
      lastPressedControl = control as HTMLElement;
      lastPressedAt = Date.now();
    }
  };

  document.addEventListener("pointerdown", rememberPressedControl, true);
  // Safari does not focus buttons on click, and synthetic WebKit activation
  // is not required to expose a PointerEvent. Capture `click` as the reliable
  // semantic fallback before React's bubbling handler opens the overlay.
  document.addEventListener("click", rememberPressedControl, true);
}

/**
 * Shared modal/drawer behaviour: Escape to dismiss, body scroll lock, focus
 * moved into the dialog on open, focus trapped inside it while open, and focus
 * returned to the trigger on close.
 *
 * Every overlay in the app goes through this so keyboard users get the same
 * contract whether the surface renders as a centred modal or a sheet.
 */
export function useDialogBehavior(
  isOpen: boolean,
  onClose: () => void,
  dismissOnEscape = true,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const active = document.activeElement as HTMLElement | null;
    /* Safari may leave focus on the field edited before a button click rather
       than moving it to the clicked button. Prefer the freshly activated,
       still-connected control in that case. The short freshness window keeps
       a programmatically opened dialog from inheriting an unrelated old click. */
    const recentlyPressed =
      lastPressedControl?.isConnected && Date.now() - lastPressedAt < 1_000
        ? lastPressedControl
        : null;
    previouslyFocused.current =
      recentlyPressed ?? (active && active !== document.body ? active : null);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus into the dialog: first focusable control, else the dialog itself.
    const container = containerRef.current;
    const focusFirst = () => {
      if (!container) return;
      const first = container.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? container).focus({ preventScroll: true });
    };
    const raf = requestAnimationFrame(focusFirst);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissOnEscape) {
        /* Escape dismisses the innermost thing, not the whole surface. This
           listener is on `document` in the capture phase, so without the check
           it fired before any popup inside the dialog could react: opening the
           sort menu inside the mobile filter drawer and pressing Escape took
           the entire drawer with it, losing every filter the user had set.
           An open popup marks itself, and then owns the key. */
        if (container?.querySelector("[data-popover-open]")) return;
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !container) return;

      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (focusable.length === 0) {
        e.preventDefault();
        container.focus({ preventScroll: true });
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey && (active === first || active === container)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = previousOverflow;

      // Restore focus on the next frame rather than inside cleanup. The trigger
      // usually re-renders as part of the same close (a burger button swapping
      // its icon and label), and WebKit drops a focus call made before that
      // render commits — the drawer closed and focus fell back to the document,
      // stranding keyboard users at the top of the page.
      const trigger = previouslyFocused.current;
      if (trigger?.isConnected) {
        requestAnimationFrame(() => {
          if (trigger.isConnected) trigger.focus({ preventScroll: true });
        });
      }
    };
  }, [isOpen, dismissOnEscape]);

  return { containerRef, titleId };
}
