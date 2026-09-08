import {
  AiServiceContract,
  ListingAssistanceRequest,
  ListingAssistanceResult,
  ListingSafetyAnalysis,
  ListingSafetyRequest,
} from "../../contracts/ai.contract";
import { apiOperation } from "./generated-api-operation";

/**
 * Calls `backend/`, which holds the provider credentials. No key ever reaches
 * the browser.
 */
export class HttpAiService implements AiServiceContract {
  async generateListingAssistance(
    request: ListingAssistanceRequest,
  ): Promise<ListingAssistanceResult> {
    return apiOperation<ListingAssistanceResult, "postAiListingAssistance">(
      "postAiListingAssistance",
      { body: request },
    );
  }

  async analyzeListingSafety(
    request: ListingSafetyRequest,
  ): Promise<ListingSafetyAnalysis> {
    return apiOperation<ListingSafetyAnalysis, "postAiListingSafety">(
      "postAiListingSafety",
      { body: request },
    );
  }
}

export const httpAiService = new HttpAiService();
