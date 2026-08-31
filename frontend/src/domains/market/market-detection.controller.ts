import type { MarketDetectionRecommendation } from "@shongre/contracts";
import { services } from "../../api/client/service-registry";
import type { GeoCoordinates } from "./geolocation.service";

/** UI/controller boundary for both automatic and explicitly consented signals. */
export const marketDetectionController = {
  detectProbableCountry(): Promise<MarketDetectionRecommendation> {
    return services.markets.detectProbableCountry();
  },

  detectCountryFromCoordinates(
    coordinates: GeoCoordinates,
  ): Promise<MarketDetectionRecommendation> {
    return services.markets.detectCountryFromCoordinates(coordinates);
  },
};
