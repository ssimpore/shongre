import { GoogleGenAI } from '@google/genai';
import { TAXONOMY } from '../domains/taxonomy/taxonomy.data';

export interface ListingAIGenerationResult {
  title: string;
  description: string;
  suggestedCategorySlug: string;
  suggestedSubCategorySlug: string;
  estimatedPrice: {
    min: number;
    max: number;
    recommended: number;
  };
  tags: string[];
  tips: string[];
}

export interface ListingSafetyAnalysis {
  riskScore: number; // 0 (safe) to 100 (high risk)
  verdict: 'compliant' | 'suspicious' | 'prohibited_item' | 'potential_scam';
  confidence: number; // 0 to 100
  summary: string;
  flaggedKeywords: string[];
  recommendedAction: 'approve' | 'request_clarification' | 'hide' | 'delete';
}

class GeminiService {
  private ai: GoogleGenAI | null = null;
  private apiKey: string | null = null;

  constructor() {
    this.initClient();
  }

  private initClient(): void {
    // Check environment variables safely in Vite / Browser / Server
    const key =
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
      (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
      null;

    if (key && key !== 'MY_GEMINI_API_KEY' && key.trim().length > 5) {
      this.apiKey = key.trim();
      try {
        this.ai = new GoogleGenAI({ apiKey: this.apiKey });
      } catch (e) {
        console.warn('Failed to initialize GoogleGenAI client', e);
      }
    }
  }

  public isConfigured(): boolean {
    return Boolean(this.ai);
  }

  /**
   * AI-Powered Listing Creator & Description Enhancer
   */
  public async generateListingAssistance(params: {
    rawInput: string;
    condition?: string;
    categoryHint?: string;
    existingTitle?: string;
    existingPrice?: number;
  }): Promise<ListingAIGenerationResult> {
    const inputPrompt = params.rawInput.trim() || params.existingTitle || 'Vélo de route moderne';
    const conditionLabel = params.condition || 'très bon état';

    // If Gemini API is configured, call Gemini 2.5 Flash
    if (this.ai) {
      try {
        const prompt = `Tu es l'assistant expert en e-commerce et petites annonces de la plateforme française Shongre.
Ton rôle est d'optimiser une annonce pour qu'elle se vende rapidement, au bon prix, avec clarté et honnêteté.

Données fournies par le vendeur :
- Mots-clés / Titre brut : "${inputPrompt}"
- État déclaré : "${conditionLabel}"
${params.categoryHint ? `- Catégorie pressentie : "${params.categoryHint}"` : ''}
${params.existingPrice ? `- Prix envisagé : ${params.existingPrice} €` : ''}

Catégories Shongre disponibles : ${TAXONOMY.map((t) => t.slug).join(', ')}

Réponds STRICTEMENT avec un objet JSON au format suivant (sans texte additionnel autour) :
{
  "title": "Titre accrocheur de 5 à 12 mots en français précisant marque, modèle et état",
  "description": "Description détaillée et aérée en français (3 à 4 paragraphes avec points clés, état esthétique/fonctionnel, accessoires inclus, mention de remise en main propre sécurisée par code PIN ou envoi soigné)",
  "suggestedCategorySlug": "un slug parmi les catégories fournies",
  "suggestedSubCategorySlug": "nom du sous-type",
  "estimatedPrice": {
    "min": 50,
    "max": 120,
    "recommended": 85
  },
  "tags": ["motcle1", "motcle2", "motcle3"],
  "tips": ["Conseil 1 pour maximiser la vente", "Conseil 2"]
}`;

        const response = await this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const text = response.text;
        if (text) {
          const parsed = JSON.parse(text);
          return {
            title: parsed.title || inputPrompt,
            description: parsed.description || '',
            suggestedCategorySlug: parsed.suggestedCategorySlug || 'multimedia',
            suggestedSubCategorySlug: parsed.suggestedSubCategorySlug || '',
            estimatedPrice: parsed.estimatedPrice || { min: 30, max: 80, recommended: 50 },
            tags: Array.isArray(parsed.tags) ? parsed.tags : ['occasion', 'shongre'],
            tips: Array.isArray(parsed.tips) ? parsed.tips : ['Ajoutez 3 photos sous éclairage naturel'],
          };
        }
      } catch (err) {
        console.warn('Gemini API call failed, falling back to smart heuristic generator', err);
      }
    }

    // High-quality Smart Fallback / Offline Generator
    return this.generateSmartFallback(inputPrompt, conditionLabel, params.existingPrice);
  }

  /**
   * AI-Powered Safety & Anti-Fraud Content Analysis for Moderation
   */
  public async analyzeListingSafety(listing: {
    title: string;
    description: string;
    price: number;
    categorySlug?: string;
    sellerName?: string;
  }): Promise<ListingSafetyAnalysis> {
    if (this.ai) {
      try {
        const prompt = `Tu es l'agent d'audit de sécurité et de conformité de la plateforme de petites annonces Shongre.
Analyse l'annonce suivante pour détecter tout risque :
- Contrefaçon ou contrefaçons de luxe manifestes
- Arnaques de paiement externe (ex: coupon PCS, mandat cash, phishing)
- Articles prohibés (armes, drogues, contrefaçons, documents d'identité)
- Prix anormalement bas ou incohérent (tentative d'hameçonnage)

Données de l'annonce :
- Titre : "${listing.title}"
- Description : "${listing.description}"
- Prix : ${listing.price} €
- Catégorie : "${listing.categorySlug || 'général'}"

Réponds STRICTEMENT avec un JSON au format suivant :
{
  "riskScore": 15, // 0 (très sûr) à 100 (fraude certaine)
  "verdict": "compliant" | "suspicious" | "prohibited_item" | "potential_scam",
  "confidence": 92,
  "summary": "Explication claire en français du verdict",
  "flaggedKeywords": ["mots clés suspects ou vides"],
  "recommendedAction": "approve" | "request_clarification" | "hide" | "delete"
}`;

        const response = await this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const text = response.text;
        if (text) {
          return JSON.parse(text);
        }
      } catch (err) {
        console.warn('Gemini safety analysis failed, using rule-based evaluator', err);
      }
    }

    // Rule-based heuristic fallback
    return this.evaluateSafetyHeuristics(listing);
  }

  /**
   * Smart Offline Generator for Listing Assistance
   */
  private generateSmartFallback(
    rawText: string,
    condition: string,
    existingPrice?: number
  ): ListingAIGenerationResult {
    const textLower = rawText.toLowerCase();
    let categorySlug = 'maison-deco';
    let subCat = 'mobilier';
    let basePrice = existingPrice || 75;

    if (/vélo|gravel|vtt|velo|trottinette|course|shimano|btwin/i.test(textLower)) {
      categorySlug = 'loisirs-sport';
      subCat = 'velos-cyclisme';
      basePrice = existingPrice || 280;
    } else if (/iphone|macbook|ipad|samsung|sony|ps5|playstation|casque|nintendo|airpods|tv|ordinateur/i.test(textLower)) {
      categorySlug = 'multimedia';
      subCat = 'telephonie-smartphones';
      basePrice = existingPrice || 350;
    } else if (/voiture|peugeot|renault|clio|pneus|audi|bmw|moto|scooter/i.test(textLower)) {
      categorySlug = 'vehicules';
      subCat = 'voitures-occasion';
      basePrice = existingPrice || 4500;
    } else if (/robe|veste|manteau|chaussures|nike|sneakers|sac|montre|cuir/i.test(textLower)) {
      categorySlug = 'mode-beaute';
      subCat = 'vetements';
      basePrice = existingPrice || 45;
    }

    const cleanTitle = rawText.charAt(0).toUpperCase() + rawText.slice(1);
    const title = cleanTitle.length > 8 ? `${cleanTitle} - Très bon état` : `${cleanTitle} en parfait état de fonctionnement`;

    const description = `Je vends ${rawText.trim()} en ${condition}.\n\n` +
      `✨ Caractéristiques et points forts :\n` +
      `- Matériel soigné et testé avec soin, parfaitement fonctionnel.\n` +
      `- Vendu avec tous ses accessoires d'origine.\n` +
      `- Aucun défaut majeur, utilisé avec précaution.\n\n` +
      `📦 Modalités de remise & d'envoi :\n` +
      `- Remise en main propre recommandée (sécurisée par code PIN Shongre).\n` +
      `- Envoi soigné et protégé possible via Mondial Relay ou Colissimo.\n` +
      `- Paiement sécurisé via le système de séquestre Shongre. N'hésitez pas à me contacter pour toute question !`;

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
      tags: [categorySlug, 'bon-plan', 'seconde-main', 'qualite-verifiee'],
      tips: [
        'Ajoutez 3 photos claires sous une lumière naturelle.',
        'Mentionnez si vous disposez de la facture d\'achat ou de l\'emballage.',
        'La remise en main propre par code PIN rassure les acheteurs locaux.',
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

    const scamKeywords = ['mandat cash', 'western union', 'pcs', 'transcash', 'virement immédiat sans voir', 'payer par coupon'];
    const prohibitedKeywords = ['arme', 'fusil', 'fausse monnaie', 'passeport', 'permis', 'drogue', 'cbd puissant', 'contrefaçon 1:1'];

    scamKeywords.forEach((w) => {
      if (text.includes(w)) flagged.push(w);
    });

    prohibitedKeywords.forEach((w) => {
      if (text.includes(w)) flagged.push(w);
    });

    // Check suspicious price for high-end items
    if (/iphone 15|macbook pro|ps5/i.test(text) && listing.price > 0 && listing.price < 50) {
      flagged.push('prix anormalement bas (< 50 € pour matériel haut de gamme)');
    }

    if (flagged.length > 0) {
      return {
        riskScore: flagged.some((f) => prohibitedKeywords.includes(f)) ? 90 : 75,
        verdict: flagged.some((f) => prohibitedKeywords.includes(f)) ? 'prohibited_item' : 'potential_scam',
        confidence: 88,
        summary: `Détection de termes ou signaux à risque : ${flagged.join(', ')}.`,
        flaggedKeywords: flagged,
        recommendedAction: 'hide',
      };
    }

    return {
      riskScore: 5,
      verdict: 'compliant',
      confidence: 95,
      summary: 'Annonce conforme aux règles de la communauté Shongre. Aucun élément suspect détecté.',
      flaggedKeywords: [],
      recommendedAction: 'approve',
    };
  }
}

export const geminiService = new GeminiService();
