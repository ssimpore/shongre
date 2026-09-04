import { useEffect } from "react";

const DEV_INDICATOR_TOP_PROPERTY = "--shongre-development-indicator-top";
const DEV_INDICATOR_STYLE_ATTRIBUTE =
  "data-shongre-development-indicator-alignment";

/**
 * Next.js only exposes a corner setting for its development indicator and
 * otherwise fixes the top offset at 20px. Align that development-only surface
 * with the toolbar's persistent toggle so expanded and collapsed states share
 * the same horizontal centerline without duplicating either control.
 */
export function DevelopmentIndicatorAlignment() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const toolbar = document.querySelector<HTMLElement>(
      "[data-environment-toolbar]",
    );
    if (!toolbar) return;
    const toolbarToggle = toolbar.querySelector<HTMLElement>(
      "[data-environment-toolbar-toggle]",
    );

    let portal: HTMLElement | null = null;
    let documentObserver: MutationObserver | null = null;
    let shadowObserver: MutationObserver | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let currentBadge: Element | null = null;

    const cleanPortal = () => {
      shadowObserver?.disconnect();
      resizeObserver?.disconnect();
      shadowObserver = null;
      resizeObserver = null;
      currentBadge = null;
      if (!portal) return;
      portal.shadowRoot
        ?.getElementById("devtools-indicator")
        ?.removeAttribute("data-shongre-environment-aligned");
      portal.shadowRoot
        ?.querySelector(`style[${DEV_INDICATOR_STYLE_ATTRIBUTE}]`)
        ?.remove();
      portal.style.removeProperty(DEV_INDICATOR_TOP_PROPERTY);
    };

    const updateAlignment = () => {
      if (!portal?.shadowRoot) return;
      const indicator = portal.shadowRoot.getElementById("devtools-indicator");
      const badge = portal.shadowRoot.querySelector("[data-next-badge-root]");
      if (!indicator || !badge) return;

      const isTopRight = Boolean(indicator.style.top && indicator.style.right);
      indicator.toggleAttribute("data-shongre-environment-aligned", isTopRight);
      if (!isTopRight) return;

      if (badge !== currentBadge) {
        resizeObserver?.disconnect();
        resizeObserver = new ResizeObserver(updateAlignment);
        resizeObserver.observe(toolbar);
        if (toolbarToggle) resizeObserver.observe(toolbarToggle);
        resizeObserver.observe(badge);
        currentBadge = badge;
      }

      const toolbarRect = toolbar.getBoundingClientRect();
      const alignmentRect =
        toolbarToggle?.getBoundingClientRect() ?? toolbarRect;
      const indicatorHeight = badge.getBoundingClientRect().height;
      const top = Math.max(
        alignmentRect.top + alignmentRect.height / 2 - indicatorHeight / 2,
        0,
      );
      portal.style.setProperty(DEV_INDICATOR_TOP_PROPERTY, `${top}px`);
    };

    const connectPortal = () => {
      const candidate = Array.from(
        document.querySelectorAll<HTMLElement>("nextjs-portal"),
      ).find((element) => element.shadowRoot);
      if (!candidate || candidate === portal) {
        updateAlignment();
        return;
      }

      documentObserver?.disconnect();
      cleanPortal();
      portal = candidate;
      const shadowRoot = candidate.shadowRoot;
      if (!shadowRoot) return;

      const style = document.createElement("style");
      style.setAttribute(DEV_INDICATOR_STYLE_ATTRIBUTE, "true");
      style.textContent = `
        #devtools-indicator[data-shongre-environment-aligned] {
          top: var(${DEV_INDICATOR_TOP_PROPERTY}) !important;
        }
      `;
      shadowRoot.append(style);
      shadowObserver = new MutationObserver(updateAlignment);
      shadowObserver.observe(shadowRoot, {
        childList: true,
        subtree: true,
      });
      updateAlignment();
    };

    documentObserver = new MutationObserver(connectPortal);
    documentObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    connectPortal();

    return () => {
      documentObserver?.disconnect();
      cleanPortal();
    };
  }, []);

  return null;
}
