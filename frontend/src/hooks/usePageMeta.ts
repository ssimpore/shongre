import { useEffect } from "react";
import { applyPageMeta, PageMeta } from "../services/seo.service";
import { useMarketLocation } from "../app/providers/MarketLocationProvider";

/**
 * Declares a route's metadata from inside the page that owns it.
 *
 * The effect depends on the serialised value rather than the object, because
 * every call site builds its `PageMeta` inline — a new object identity on each
 * render, which would rewrite the whole head on every keystroke of a search box.
 *
 * There is no cleanup on unmount by design: the next route applies its own
 * metadata, and clearing on the way out would leave the document briefly
 * describing nothing during the swap. Routes that render nothing meaningful
 * (loading, 404) still call this so the previous page's title never lingers.
 */
export function usePageMeta(meta: PageMeta): void {
  const { currentLocale, marketContext } = useMarketLocation();
  const serialised = JSON.stringify({
    ...meta,
    locale: meta.locale || currentLocale,
  });

  useEffect(() => {
    const parsed = JSON.parse(serialised) as PageMeta;
    applyPageMeta(parsed, marketContext);

    const observeMetadata = () => {
      metadataObserver.observe(document.head, { childList: true });
      metadataObserver.observe(document.body, { childList: true });
    };
    const metadataObserver = new MutationObserver(() => {
      // Disconnect while applying: structured data is replaced intentionally
      // and must not recursively trigger this observer.
      metadataObserver.disconnect();
      applyPageMeta(parsed, marketContext);
      observeMetadata();
    });
    observeMetadata();

    // App Router metadata may be hoisted from the streamed body after the
    // first effect. A second paint-time pass updates that tag and collapses any
    // transient duplicate created during hydration.
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() =>
        applyPageMeta(parsed, marketContext),
      );
    });
    return () => {
      metadataObserver.disconnect();
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [marketContext, serialised]);
}
