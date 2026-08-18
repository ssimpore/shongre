import React from 'react';
import { ScrollRestoration } from 'react-router-dom';

/**
 * Scroll behaviour for the whole application.
 *
 * Without this, every route kept whatever scroll offset the previous page had:
 * opening a store from a listing halfway down the results landed the user
 * 1800px into a page they had never seen, apparently blank. Two pages patched
 * around it with their own `window.scrollTo` on mount, which the rest of the
 * app never got.
 *
 * The key is the pathname rather than the full location, which makes the
 * behaviour intentional per navigation type:
 *   - new pathname      -> top of the page (a page the user has not seen)
 *   - same pathname     -> position preserved (search filters, sort, pagination
 *                          and tab changes all write to the query string, and
 *                          yanking the list back to the top on every filter tap
 *                          is the classic marketplace annoyance)
 *   - back / forward    -> the position that entry was left at
 */
export const AppScrollRestoration: React.FC = () => (
  <ScrollRestoration getKey={(location) => location.pathname} />
);
