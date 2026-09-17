import React, { lazy, Suspense } from "react";
import type { SearchAutocompleteProps } from "./SearchAutocomplete";

const SearchAutocomplete = lazy(() =>
  import("./SearchAutocomplete").then((module) => ({
    default: module.SearchAutocomplete,
  })),
);

/**
 * The suggestion dropdown is downloaded the first time a search box opens,
 * not with the shell every visitor loads; closed, it renders nothing, exactly
 * like the eager component.
 */
export const LazySearchAutocomplete: React.FC<SearchAutocompleteProps> = (
  props,
) => {
  if (!props.isOpen) return null;
  return (
    <Suspense fallback={null}>
      <SearchAutocomplete {...props} />
    </Suspense>
  );
};
