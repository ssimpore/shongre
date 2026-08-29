import type {
  HomepageConfiguration,
  HomepageOfferType,
  ResolvedHomepageConfiguration,
  ResolvedHomepageSection,
} from "@shongre/contracts/homepage";
import type { Money } from "@shongre/contracts";
import type { Listing } from "../../types";
import type { TrendingSectionResponse } from "../trending/trending.types";

export interface HomepageQuery {
  marketCode: string;
  locale: string;
  country?: string;
  region?: string;
  city?: string;
  now?: Date;
}

export interface HomepageOfferPresentation {
  type: HomepageOfferType;
  state: "active";
  currentPrice: Money;
  originalPrice: Money;
  discountAmount: Money;
  discountBps: number;
  startsAt?: string;
  endsAt?: string;
}

export interface HomepageDealItem {
  listing: Listing;
  offer: HomepageOfferPresentation;
}

export type HomepageSectionLoadStatus =
  | "loading"
  | "ready"
  | "empty"
  | "error";

export interface HomepageSectionView extends ResolvedHomepageSection {
  status: HomepageSectionLoadStatus;
  errorCode?: "TRENDING_UNAVAILABLE" | "DEALS_UNAVAILABLE" | "LISTINGS_UNAVAILABLE";
  trending?: TrendingSectionResponse;
  deals?: HomepageDealItem[];
  listings?: Listing[];
}

export interface HomepageExperience
  extends Omit<ResolvedHomepageConfiguration, "sections"> {
  sections: HomepageSectionView[];
}

export interface SaveHomepageDraftInput {
  configuration: HomepageConfiguration;
  changeReason: string;
}

export interface PublishHomepageInput {
  marketCode: string;
  locale: string;
  changeReason: string;
}
