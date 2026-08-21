import { useEffect } from "react";
import { applyPageMeta, PageMeta } from "../services/seo.service";

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
  const serialised = JSON.stringify(meta);

  useEffect(() => {
    applyPageMeta(JSON.parse(serialised) as PageMeta);
  }, [serialised]);
}
