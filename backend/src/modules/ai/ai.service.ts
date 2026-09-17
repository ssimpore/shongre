import type { MarketContext } from "@shongre/contracts/market-country";
import {
  providers,
  type IAIProvider,
} from "../../integrations/providers/index.js";
import {
  repositories,
  type IListingRepository,
  type ListingPriceEstimate,
} from "../../infrastructure/database/repositories/index.js";
import { AppError } from "../../shared/errors/app-error.js";
import { taxonomyV1Service } from "../taxonomy/taxonomy.runtime.js";

/**
 * The marks of the classic marketplace scams, checked on every message. A
 * rule engine rather than a model on purpose: it runs on the send path, it
 * must answer the same in every environment, and its verdict is only ever a
 * warning shown to the recipient.
 */
const MESSAGE_SAFETY_RULES: ReadonlyArray<{
  flag: string;
  pattern: RegExp;
}> = [
  {
    flag: "off_platform_payment",
    pattern:
      /western\s*union|moneygram|mandat\s*cash|paypal\s*(famille|friends)|virement\s+(avant|d'?abord|immédiat|immediat)|crypto|bitcoin|usdt|ticket\s*(pcs|transcash|neosurf)|coupon\s*(pcs|paysafe)/i,
  },
  {
    flag: "off_platform_contact",
    pattern:
      /whats?app|t[ée]l[ée]gram|signal\b|contactez?-?\s*moi\s+(au|sur|par)|(mon|mes)\s+(num[ée]ro|mail|e-?mail)\s*(:|est)|\b0[67](?:[\s.-]?\d{2}){4}\b|\+33\s?[67](?:[\s.-]?\d{2}){4}/i,
  },
  {
    flag: "external_link",
    pattern: /https?:\/\/(?!(?:[a-z0-9-]+\.)*shongre\.(?:fr|com)\b)[^\s]+/i,
  },
  {
    flag: "shipping_fee_upfront",
    pattern:
      /(frais|acompte|caution)\s+(de\s+)?(livraison|transport|douane)\s+(à|a)\s+(payer|régler|regler)\s+(d'?abord|avant|en\s+avance)|transporteur\s+(agréé|agree|mandat)/i,
  },
  {
    flag: "pressure",
    pattern:
      /(urgent(?:e|issime)?|dernière\s+chance|derniere\s+chance)\s*[!.]|(r[ée]pond(?:ez|s)\s+(vite|imm[ée]diatement)|dans\s+l'?heure)/i,
  },
];

/** The recipient-facing reading of the flags, in the product language. */
export const MESSAGE_SAFETY_WARNINGS: Readonly<Record<string, string>> = {
  off_platform_payment:
    "Ce message propose un paiement en dehors de Shongre. Utilisez uniquement le paiement sécurisé de la plateforme.",
  off_platform_contact:
    "Ce message vous invite à poursuivre l’échange hors de Shongre. Restez sur la messagerie pour bénéficier de la protection.",
  external_link:
    "Ce message contient un lien externe. Ne saisissez jamais vos identifiants ou coordonnées bancaires sur un site tiers.",
  shipping_fee_upfront:
    "Ce message demande des frais avant l’envoi. Shongre ne demande jamais de payer des frais à l’avance.",
  pressure:
    "Ce message vous presse d’agir vite. Prenez le temps de vérifier avant toute décision.",
};

export interface ListingAssistanceInput {
  rawInput?: string;
  condition?: string;
  categoryHint?: string;
  existingTitle?: string;
  existingPrice?: number;
}

/** Owns the provider-neutral public AI boundary and keeps secrets server-side. */
export class AiService {
  constructor(
    private readonly provider: IAIProvider = providers.ai,
    private readonly listings: IListingRepository = repositories.listings,
  ) {}

  /**
   * Drafts a listing from the seller's photos. The model chooses among the
   * published, publishable categories of the market and its answer is
   * re-resolved against the taxonomy, so a hallucinated category is dropped
   * rather than offered. Everything returned is a proposal for the seller.
   */
  async suggestListingFromPhotos(input: {
    marketContext: MarketContext;
    locale: string;
    imageUrls: unknown;
  }) {
    const imageUrls = Array.isArray(input.imageUrls)
      ? input.imageUrls.filter(
          (value): value is string =>
            typeof value === "string" && /^https:\/\/\S{1,2048}$/.test(value),
        )
      : [];
    if (imageUrls.length < 1 || imageUrls.length > 5) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Ajoutez de 1 à 5 photos (adresses HTTPS) pour l’assistance.",
      });
    }
    const taxonomy = await taxonomyV1Service.snapshot();
    const categories = taxonomy
      .listTree(input.marketContext)
      .filter((node) => node.publishable)
      .map((node) => ({
        id: node.id,
        label:
          node.labels[input.locale] ||
          node.labels["fr-FR"] ||
          Object.values(node.labels)[0] ||
          node.slug,
      }));
    const described = await this.provider.describeListingPhotos({
      imageUrls,
      categories,
      locale: input.locale,
    });
    const category = described.categoryId
      ? taxonomy.findCategory(described.categoryId)
      : undefined;
    const offered = category && categories.some((c) => c.id === category.id);
    return {
      category: offered
        ? {
            id: category.id,
            slug: category.slug,
            label:
              category.labels[input.locale] ||
              category.labels["fr-FR"] ||
              category.slug,
          }
        : null,
      title: described.title.trim().slice(0, 80),
      description: described.description.trim().slice(0, 600),
      ...(described.brand?.trim() ? { brand: described.brand.trim() } : {}),
      ...(described.model?.trim() ? { model: described.model.trim() } : {}),
      confidence: Math.max(0, Math.min(100, Math.round(described.confidence))),
    };
  }

  /**
   * What comparable items sold for. The category is expanded to its
   * published descendants so a parent node answers with its whole subtree.
   */
  async estimateListingPrice(input: {
    marketCode: string;
    categoryId: string;
    brand?: string;
    model?: string;
    condition?: string;
  }): Promise<
    | (ListingPriceEstimate & { categoryId: string })
    | { basis: "none"; categoryId: string }
  > {
    const taxonomy = await taxonomyV1Service.snapshot();
    const category = taxonomy.findCategory(input.categoryId);
    if (!category) {
      throw new AppError({
        code: "NOT_FOUND",
        statusCode: 404,
        message: "Catégorie introuvable.",
      });
    }
    const categoryIds = taxonomy
      .getBundle()
      .categories.filter((node) => taxonomy.isDescendant(node.id, category.id))
      .map((node) => node.id);
    const estimate = await this.listings.estimatePrice({
      marketCode: input.marketCode,
      categoryIds,
      brand: input.brand,
      model: input.model,
      condition: input.condition,
    });
    return estimate
      ? { ...estimate, categoryId: category.id }
      : { basis: "none", categoryId: category.id };
  }

  /** The flags a message text raises; empty for an ordinary message. */
  assessMessageSafety(text: string): string[] {
    const normalized = text.normalize("NFC");
    return MESSAGE_SAFETY_RULES.filter((rule) =>
      rule.pattern.test(normalized),
    ).map((rule) => rule.flag);
  }

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
