import type { operations } from "@shongre/contracts/openapi";
import type { Listing } from "../../../types";
import { apiOperation } from "./generated-api-operation";
import { mapBackendListing } from "./http-listings.service";

type BackendSitemapListingPage =
  operations["getDiscoverySitemapListings"]["responses"][200]["content"]["application/json"];

export async function fetchPublicSitemapListingPage(input: {
  marketCode: string;
  cursor?: string;
  limit?: number;
}): Promise<{
  items: Listing[];
  snapshotAt: string;
  pageInfo: { hasNextPage: boolean; nextCursor?: string };
}> {
  const result = await apiOperation<
    BackendSitemapListingPage,
    "getDiscoverySitemapListings"
  >("getDiscoverySitemapListings", {
    credentials: "omit",
    query: {
      marketCode: input.marketCode,
      cursor: input.cursor,
      limit: input.limit ?? 500,
    },
  });
  return {
    ...result,
    items: result.items.map(mapBackendListing),
  };
}
