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
if (typeof document !== "undefined") {
  document.addEventListener(
    "pointerdown",
    (event) => {
      const control = (event.target as HTMLElement | null)?.closest?.(
        'button, a[href], [role="button"], summary',
      );
      if (control) lastPressedControl = control as HTMLElement;
    },
    true,
  );
}

/**
 * Shared modal/drawer behaviour: Escape to dismiss, body scroll lock, focus
 * moved into the dialog on open, focus trapped inside it while open, and focus
 * returned to the trigger on close.
 *
 * Every overlay in the app goes through this so keyboard users get the same
 * contract whether the surface renders as a centred modal or a sheet.
 */
export function useDialogBehavior(isOpen: boolean, onClose: () => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const active = document.activeElement as HTMLElement | null;
    previouslyFocused.current =
      active && active !== document.body ? active : lastPressedControl;

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
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
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
  }, [isOpen, onClose]);

  return { containerRef, titleId };
}
