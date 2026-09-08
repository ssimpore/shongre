import type { TrendingServiceContract } from "../../contracts/trending.contract";
import { apiOperation } from "./generated-api-operation";
import type {
  TrendingQuery,
  TrendingSectionResponse,
} from "../../../domains/trending/trending.types";

export class HttpTrendingService implements TrendingServiceContract {
  async getTrending(query: TrendingQuery): Promise<TrendingSectionResponse> {
    return apiOperation<TrendingSectionResponse, "getHomeTrending">(
      "getHomeTrending",
      {
        query: {
          market: query.marketCode,
          country: query.country,
          locale: query.locale,
          region: query.region,
          city: query.city,
          limit: query.limit,
        },
      },
    );
  }
}

export const httpTrendingService = new HttpTrendingService();
