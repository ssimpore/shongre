import {
  AiServiceContract,
  ListingAssistanceRequest,
  ListingAssistanceResult,
  ListingSafetyAnalysis,
  ListingSafetyRequest,
} from "../../contracts/ai.contract";
import { httpClient } from "./http-client";

/**
 * Calls `backend/`, which holds the provider credentials. No key ever reaches
 * the browser.
 */
export class HttpAiService implements AiServiceContract {
  async generateListingAssistance(
    request: ListingAssistanceRequest,
  ): Promise<ListingAssistanceResult> {
    return httpClient.post<ListingAssistanceResult>(
      "/ai/listing-assistance",
      request,
    );
  }

  async analyzeListingSafety(
    request: ListingSafetyRequest,
  ): Promise<ListingSafetyAnalysis> {
    return httpClient.post<ListingSafetyAnalysis>(
      "/ai/listing-safety",
      request,
    );
  }
}

export const httpAiService = new HttpAiService();
