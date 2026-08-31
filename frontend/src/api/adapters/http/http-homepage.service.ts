import type { HomepageConfiguration } from "@shongre/contracts/homepage";
import type { HomepageServiceContract } from "../../contracts/homepage.contract";
import type {
  HomepageDealItem,
  HomepageExperience,
  HomepageOfferPresentation,
  HomepageQuery,
  PublishHomepageInput,
  SaveHomepageDraftInput,
} from "../../../domains/homepage/homepage.types";
import type { TrendingSectionResponse } from "../../../domains/trending/trending.types";
import type { BackendListing } from "./http-listings.service";
import { mapBackendListing } from "./http-listings.service";
import { httpClient } from "./http-client";

type BackendHomepageDealItem = Omit<HomepageDealItem, "listing"> & {
  listing: BackendListing;
  offer: HomepageOfferPresentation;
};

type BackendTrendingSection = Omit<TrendingSectionResponse, "topics"> & {
  topics: Array<
    Omit<TrendingSectionResponse["topics"][number], "listings"> & {
      listings: BackendListing[];
    }
  >;
};

type BackendHomepageExperience = Omit<HomepageExperience, "sections"> & {
  sections: Array<
    Omit<
      HomepageExperience["sections"][number],
      "trending" | "deals" | "listings"
    > & {
      trending?: BackendTrendingSection;
      deals?: BackendHomepageDealItem[];
      listings?: BackendListing[];
    }
  >;
};

const params = (query: HomepageQuery) => ({
  market: query.marketCode,
  country: query.country,
  locale: query.locale,
  region: query.region,
  city: query.city,
});

function mapExperience(
  response: BackendHomepageExperience,
): HomepageExperience {
  return {
    ...response,
    sections: response.sections.map((section) => ({
      ...section,
      listings: section.listings?.map(mapBackendListing),
      deals: section.deals?.map((item) => ({
        ...item,
        listing: mapBackendListing(item.listing),
      })),
      trending: section.trending
        ? {
            ...section.trending,
            topics: section.trending.topics.map((topic) => ({
              ...topic,
              listings: topic.listings.map(mapBackendListing),
            })),
          }
        : undefined,
    })),
  };
}

export class HttpHomepageService implements HomepageServiceContract {
  async getHomepage(query: HomepageQuery): Promise<HomepageExperience> {
    return mapExperience(
      await httpClient.get<BackendHomepageExperience>("/home", {
        params: params(query),
      }),
    );
  }

  getHomepageDraft(query: HomepageQuery): Promise<HomepageConfiguration> {
    return httpClient.get<HomepageConfiguration>(
      "/admin/homepage/configuration",
      { params: params(query) },
    );
  }

  saveHomepageDraft(
    input: SaveHomepageDraftInput,
  ): Promise<HomepageConfiguration> {
    return httpClient.put<HomepageConfiguration>(
      "/admin/homepage/configuration",
      input,
      {
        params: {
          market: input.configuration.marketCode,
          locale: input.configuration.locale,
        },
      },
    );
  }

  async previewHomepage(
    configuration: HomepageConfiguration,
    query: HomepageQuery,
  ): Promise<HomepageExperience> {
    return mapExperience(
      await httpClient.post<BackendHomepageExperience>(
        "/admin/homepage/preview",
        { configuration },
        { params: params(query) },
      ),
    );
  }

  publishHomepage(input: PublishHomepageInput): Promise<HomepageConfiguration> {
    return httpClient.post<HomepageConfiguration>(
      "/admin/homepage/publish",
      input,
      { params: { market: input.marketCode, locale: input.locale } },
    );
  }
}

export const httpHomepageService = new HttpHomepageService();
