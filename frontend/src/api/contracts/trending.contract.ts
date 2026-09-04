import type {
  TrendingQuery,
  TrendingSectionResponse,
} from "../../domains/trending/trending.types";

export interface TrendingServiceContract {
  getTrending(query: TrendingQuery): Promise<TrendingSectionResponse>;
}
