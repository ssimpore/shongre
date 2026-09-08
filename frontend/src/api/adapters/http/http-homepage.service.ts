import type { HomepageConfiguration } from "@shongre/contracts/homepage";
import { apiOperation } from "./generated-api-operation";
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
      "trending" | "deals" | "listings" | "universeGroups"
    > & {
      trending?: BackendTrendingSection;
      deals?: BackendHomepageDealItem[];
      listings?: BackendListing[];
      universeGroups?: Array<
        Omit<
          NonNullable<
            HomepageExperience["sections"][number]["universeGroups"]
          >[number],
          "listings"
        > & { listings: BackendListing[] }
      >;
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
      universeGroups: section.universeGroups?.map((group) => ({
        ...group,
        listings: group.listings.map(mapBackendListing),
      })),
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
      await apiOperation<BackendHomepageExperience, "getHome">("getHome", {
        query: params(query),
      }),
    );
  }

  getHomepageDraft(query: HomepageQuery): Promise<HomepageConfiguration> {
    return apiOperation<HomepageConfiguration, "getAdminHomepageConfiguration">(
      "getAdminHomepageConfiguration",
      { query: params(query) },
    );
  }

  saveHomepageDraft(
    input: SaveHomepageDraftInput,
  ): Promise<HomepageConfiguration> {
    return apiOperation<HomepageConfiguration, "putAdminHomepageConfiguration">(
      "putAdminHomepageConfiguration",
      {
        query: {
          market: input.configuration.marketCode,
          locale: input.configuration.locale,
        },
        body: input,
      },
    );
  }

  async previewHomepage(
    configuration: HomepageConfiguration,
    query: HomepageQuery,
  ): Promise<HomepageExperience> {
    return mapExperience(
      await apiOperation<BackendHomepageExperience, "postAdminHomepagePreview">(
        "postAdminHomepagePreview",
        { query: params(query), body: { configuration } },
      ),
    );
  }

  publishHomepage(input: PublishHomepageInput): Promise<HomepageConfiguration> {
    return apiOperation<HomepageConfiguration, "postAdminHomepagePublish">(
      "postAdminHomepagePublish",
      {
        query: { market: input.marketCode, locale: input.locale },
        body: input,
      },
    );
  }
}

export const httpHomepageService = new HttpHomepageService();
