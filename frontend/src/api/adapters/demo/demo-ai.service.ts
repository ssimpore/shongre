import {
  AiServiceContract,
  ListingAssistanceRequest,
  ListingAssistanceResult,
  ListingSafetyAnalysis,
  ListingSafetyRequest,
} from "../../contracts/ai.contract";
import { simulateNetworkDelay } from "../../client/api-client.config";
import {
  requireDemoAnyCapability,
  requireDemoCapability,
} from "./demo-authorization";

/**
 * Deterministic AI adapter.
 *
 * Same input, same output, no network and no provider key — which is what makes
 * the demo reproducible in tests and in review. These rules are the heuristics
 * that already backed the product whenever the provider was unreachable; they
 * are now the only implementation on the client side.
 */
export class DemoAiService implements AiServiceContract {
  async generateListingAssistance(
    request: ListingAssistanceRequest,
  ): Promise<ListingAssistanceResult> {
    await simulateNetworkDelay();
    requireDemoCapability("listing.create");
    const rawText =
      request.rawInput.trim() ||
      request.existingTitle ||
      "Vélo de route moderne";
    return this.generateSmartDraft(
      rawText,
      request.condition || "très bon état",
      request.existingPrice,
    );
  }

  async analyzeListingSafety(
    request: ListingSafetyRequest,
  ): Promise<ListingSafetyAnalysis> {
    await simulateNetworkDelay();
    requireDemoAnyCapability(["listing.create", "moderation.review"]);
    return this.evaluateSafetyHeuristics(request);
  }

  /**
   * Smart Offline Generator for Listing Assistance
   */
  private generateSmartDraft(
    rawText: string,
    condition: string,
    existingPrice?: number,
  ): ListingAssistanceResult {
    const textLower = rawText.toLowerCase();
    let categorySlug = "maison-deco";
    let subCat = "mobilier";
    let basePrice = existingPrice || 75;

    if (
      /vélo|gravel|vtt|velo|trottinette|course|shimano|btwin/i.test(textLower)
    ) {
      categorySlug = "loisirs-sport";
      subCat = "velos-cyclisme";
      basePrice = existingPrice || 280;
    } else if (
      /iphone|macbook|ipad|samsung|sony|ps5|playstation|casque|nintendo|airpods|tv|ordinateur/i.test(
        textLower,
      )
    ) {
      categorySlug = "multimedia";
      subCat = "telephonie-smartphones";
      basePrice = existingPrice || 350;
    } else if (
      /voiture|peugeot|renault|clio|pneus|audi|bmw|moto|scooter/i.test(
        textLower,
      )
    ) {
      categorySlug = "vehicules";
      subCat = "voitures-occasion";
      basePrice = existingPrice || 4500;
    } else if (
      /robe|veste|manteau|chaussures|nike|sneakers|sac|montre|cuir/i.test(
        textLower,
      )
    ) {
      categorySlug = "mode-beaute";
      subCat = "vetements";
      basePrice = existingPrice || 45;
    }

    const cleanTitle = rawText.charAt(0).toUpperCase() + rawText.slice(1);
    const title =
      cleanTitle.length > 8
        ? `${cleanTitle} - Très bon état`
        : `${cleanTitle} en parfait état de fonctionnement`;

    const description =
      `Je vends ${rawText.trim()} en ${condition}.\n\n` +
      `✨ Caractéristiques et points forts :\n` +
      `- Matériel soigné et testé avec soin, parfaitement fonctionnel.\n` +
      `- Vendu avec tous ses accessoires d'origine.\n` +
      `- Aucun défaut majeur, utilisé avec précaution.\n\n` +
      `📦 Modalités de remise & d'envoi :\n` +
      `- Remise en main propre recommandée (sécurisée par code PIN Shongre).\n` +
      `- Envoi soigné et protégé possible via Mondial Relay ou Colissimo.\n` +
      `- Paiement en ligne traité par notre prestataire. N'hésitez pas à me contacter pour toute question !`;

    return {
      title,
      description,
      suggestedCategorySlug: categorySlug,
      suggestedSubCategorySlug: subCat,
      estimatedPrice: {
        min: Math.round(basePrice * 0.85),
        max: Math.round(basePrice * 1.25),
        recommended: basePrice,
      },
      tags: [categorySlug, "bon-plan", "seconde-main", "qualite-verifiee"],
      tips: [
        "Ajoutez 3 photos claires sous une lumière naturelle.",
        "Mentionnez si vous disposez de la facture d'achat ou de l'emballage.",
        "La remise en main propre par code PIN rassure les acheteurs locaux.",
      ],
    };
  }

  /**
   * Rule-based Safety Evaluator
   */
  private evaluateSafetyHeuristics(listing: {
    title: string;
    description: string;
    price: number;
    sellerName?: string;
  }): ListingSafetyAnalysis {
    const text = `${listing.title} ${listing.description}`.toLowerCase();
    const flagged: string[] = [];

    const scamKeywords = [
      "mandat cash",
      "western union",
      "pcs",
      "transcash",
      "virement immédiat sans voir",
      "payer par coupon",
    ];
    const prohibitedKeywords = [
      "arme",
      "fusil",
      "fausse monnaie",
      "passeport",
      "permis",
      "drogue",
      "cbd puissant",
      "contrefaçon 1:1",
    ];

    scamKeywords.forEach((w) => {
      if (text.includes(w)) flagged.push(w);
    });

    prohibitedKeywords.forEach((w) => {
      if (text.includes(w)) flagged.push(w);
    });

    // Check suspicious price for high-end items
    if (
      /iphone 15|macbook pro|ps5/i.test(text) &&
      listing.price > 0 &&
      listing.price < 50
    ) {
      flagged.push(
        "prix anormalement bas (< 50 € pour matériel haut de gamme)",
      );
    }

    if (flagged.length > 0) {
      return {
        riskScore: flagged.some((f) => prohibitedKeywords.includes(f))
          ? 90
          : 75,
        verdict: flagged.some((f) => prohibitedKeywords.includes(f))
          ? "prohibited_item"
          : "potential_scam",
        confidence: 88,
        summary: `Détection de termes ou signaux à risque : ${flagged.join(", ")}.`,
        flaggedKeywords: flagged,
        recommendedAction: "hide",
      };
    }

    return {
      riskScore: 5,
      verdict: "compliant",
      confidence: 95,
      summary:
        "Annonce conforme aux règles de la communauté Shongre. Aucun élément suspect détecté.",
      flaggedKeywords: [],
      recommendedAction: "approve",
    };
  }
}

export const demoAiService = new DemoAiService();
