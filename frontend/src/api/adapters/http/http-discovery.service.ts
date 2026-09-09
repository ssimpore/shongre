import type { operations } from "@shongre/contracts/openapi";
import type { Collection } from "../../../domains/collection/collection.types";
import { apiOperation } from "./generated-api-operation";

type BackendCollectionPage =
  operations["getDiscoveryCollections"]["responses"][200]["content"]["application/json"];

/**
 * The collection rail, assembled by the backend.
 *
 * The client used to build this itself: fetch the taxonomy tree, then one
 * `search(limit: 1)` per root category to read a count and a cover image — 19
 * requests on a French homepage. The counts and artwork are inventory facts the
 * backend already holds, so it returns them together in one bounded response.
 */
export async function fetchDiscoveryCollections(input: {
  marketCode: string;
  locale: string;
}): Promise<Collection[]> {
  const result = await apiOperation<
    BackendCollectionPage,
    "getDiscoveryCollections"
  >("getDiscoveryCollections", {
    query: { marketCode: input.marketCode, locale: input.locale },
  });
  return result.collections.map((collection) => ({
    ...collection,
    tags: [...collection.tags],
    // Formatted here rather than server-side: the count is a fact, its
    // presentation is locale-dependent and belongs to the view model.
    itemCountLabel: new Intl.NumberFormat(input.locale).format(
      collection.listingCount,
    ),
  }));
}
