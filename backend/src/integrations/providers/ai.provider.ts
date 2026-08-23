import { AppError } from "../../shared/errors/app-error.js";

export interface AISafetyAssessment {
  riskScore: number;
  verdict: "compliant" | "suspicious" | "prohibited_item" | "potential_scam";
  confidence: number;
  summary: string;
  flaggedKeywords: string[];
}

export interface IAIProvider {
  analyzeListingContent(
    title: string,
    description: string,
    price: number,
  ): Promise<AISafetyAssessment>;
}

export class DemoAIProvider implements IAIProvider {
  async analyzeListingContent(
    title: string,
    description: string,
    price: number,
  ): Promise<AISafetyAssessment> {
    const normalizedContent = `${title} ${description}`.toLocaleLowerCase(
      "fr-FR",
    );
    const suspiciousKeywords = [
      "western union",
      "mandat cash",
      "crypto",
      "contrefacon",
      "arme",
      "drogue",
    ];
    const flaggedKeywords = suspiciousKeywords.filter((keyword) =>
      normalizedContent.includes(keyword),
    );

    if (flaggedKeywords.length > 0) {
      return {
        riskScore: 85,
        verdict: "suspicious",
        confidence: 90,
        summary:
          "Le scénario de démonstration a détecté un contenu à examiner.",
        flaggedKeywords,
      };
    }

    if (price <= 0) {
      return {
        riskScore: 40,
        verdict: "suspicious",
        confidence: 70,
        summary: "Le scénario de démonstration a détecté un prix à examiner.",
        flaggedKeywords: [],
      };
    }

    return {
      riskScore: 5,
      verdict: "compliant",
      confidence: 95,
      summary: "Le scénario de démonstration considère cette annonce conforme.",
      flaggedKeywords: [],
    };
  }
}

export class GeminiAIProvider implements IAIProvider {
  async analyzeListingContent(
    title: string,
    description: string,
    price: number,
  ): Promise<AISafetyAssessment> {
    void title;
    void description;
    void price;
    throw new AppError({
      code: "NETWORK_ERROR",
      statusCode: 503,
      message: "L'analyse automatique est temporairement indisponible.",
    });
  }
}
