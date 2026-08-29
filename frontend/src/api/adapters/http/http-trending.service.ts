import type { TrendingServiceContract } from "../../contracts/trending.contract";
import type {
  TrendingQuery,
  TrendingSectionResponse,
} from "../../../domains/trending/trending.types";
import { httpClient } from "./http-client";

export class HttpTrendingService implements TrendingServiceContract {
  async getTrending(query: TrendingQuery): Promise<TrendingSectionResponse> {
    return httpClient.get<TrendingSectionResponse>("/home/trending", {
      params: {
        market: query.marketCode,
        country: query.country,
        locale: query.locale,
        region: query.region,
        city: query.city,
        limit: query.limit,
      },
    });
  }
}

export const httpTrendingService = new HttpTrendingService();
