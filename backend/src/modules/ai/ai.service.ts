import {
  providers,
  type IAIProvider,
} from "../../integrations/providers/index.js";
import { AppError } from "../../shared/errors/app-error.js";

export interface ListingAssistanceInput {
  rawInput?: string;
  condition?: string;
  categoryHint?: string;
  existingTitle?: string;
  existingPrice?: number;
}

/** Owns the provider-neutral public AI boundary and keeps secrets server-side. */
export class AiService {
  constructor(private readonly provider: IAIProvider = providers.ai) {}

  async generateListingAssistance(input: ListingAssistanceInput) {
    const rawInput = String(input?.rawInput || "").trim();
    if (rawInput.length < 8 || rawInput.length > 5_000) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Décrivez l’objet en 8 à 5 000 caractères.",
      });
    }

    const sentence = rawInput.replace(/\s+/g, " ");
    const proposedTitle = String(
      input.existingTitle || sentence.split(/[.!?]/)[0],
    )
      .trim()
      .slice(0, 80);
    const referencePrice = Number(input.existingPrice || 0);
    const recommended =
      Number.isFinite(referencePrice) && referencePrice > 0
        ? Math.round(referencePrice)
        : 50;

    return {
      title: proposedTitle || "Annonce Shongre",
      description: sentence.slice(0, 2_000),
      suggestedCategorySlug:
        String(input.categoryHint || "autres").trim() || "autres",
      suggestedSubCategorySlug: "autres",
      estimatedPrice: {
        min: Math.max(0, Math.round(recommended * 0.8)),
        max: Math.round(recommended * 1.2),
        recommended,
      },
      tags: [input.condition, input.categoryHint]
        .filter((value): value is string => Boolean(value?.trim()))
        .map((value) => value.trim())
        .slice(0, 5),
      tips: [
        "Ajoutez des photos nettes prises sous plusieurs angles.",
        "Décrivez précisément l’état et les éventuels défauts.",
      ],
    };
  }

  async analyzeListingSafety(input: {
    title?: string;
    description?: string;
    price?: number;
  }) {
    const title = String(input?.title || "").trim();
    const description = String(input?.description || "").trim();
    const price = Number(input?.price);
    if (!title || !description || !Number.isFinite(price) || price < 0) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Titre, description et prix valide sont requis.",
      });
    }
    const assessment = await this.provider.analyzeListingContent(
      title,
      description,
      price,
    );
    return {
      ...assessment,
      recommendedAction:
        assessment.riskScore >= 80
          ? "hide"
          : assessment.riskScore >= 50
            ? "request_clarification"
            : "approve",
    } as const;
  }
}

export const aiService = new AiService();
