import {
  createWatchSubscriptionInputSchema,
  updateWatchSubscriptionInputSchema,
  type CreateWatchSubscriptionInput,
  type WatchSubscription,
} from "@shongre/contracts/watch-subscriptions";
import { getCountryConfig } from "@shongre/contracts";
import { majorToMinorAmount } from "@shongre/shared/money";
import {
  type IListingRepository,
  type IUserRepository,
  type IWatchSubscriptionRepository,
  repositories,
} from "../../infrastructure/database/repositories/index.js";
import { AppError } from "../../shared/errors/app-error.js";
import { requireMarketCode } from "../../shared/market/market-code.js";

function validationFailure(message: string): never {
  throw new AppError({ code: "VALIDATION_ERROR", statusCode: 400, message });
}

export class WatchSubscriptionsService {
  constructor(
    private readonly repository: IWatchSubscriptionRepository = repositories.watchSubscriptions,
    private readonly listings: IListingRepository = repositories.listings,
    private readonly users: IUserRepository = repositories.users,
  ) {}

  async list(
    userId: string,
    marketCode: string,
  ): Promise<{ items: WatchSubscription[] }> {
    const market = this.requireEnabledMarket(marketCode);
    return {
      items: await this.repository.list(userId, market),
    };
  }

  async createOrReplace(
    userId: string,
    routeMarketCode: string,
    rawInput: unknown,
  ): Promise<WatchSubscription> {
    const parsed = createWatchSubscriptionInputSchema.safeParse(rawInput);
    if (!parsed.success)
      validationFailure(parsed.error.issues[0]?.message || "Alerte invalide.");
    const routeMarket = this.requireEnabledMarket(routeMarketCode);
    if (parsed.data.marketCode !== routeMarket) {
      validationFailure(
        "Le marché de l’alerte ne correspond pas à la requête.",
      );
    }

    const input = await this.validateTarget(userId, parsed.data);
    return this.repository.upsert(userId, input);
  }

  async update(
    id: string,
    userId: string,
    marketCode: string,
    rawInput: unknown,
  ): Promise<WatchSubscription> {
    const parsed = updateWatchSubscriptionInputSchema.safeParse(rawInput);
    if (!parsed.success)
      validationFailure(
        parsed.error.issues[0]?.message || "Préférences invalides.",
      );
    const updated = await this.repository.updateOwned(
      id,
      userId,
      this.requireEnabledMarket(marketCode),
      parsed.data,
    );
    if (!updated) this.notFound();
    return updated;
  }

  async remove(id: string, userId: string, marketCode: string): Promise<void> {
    const removed = await this.repository.deleteOwned(
      id,
      userId,
      this.requireEnabledMarket(marketCode),
    );
    if (!removed) this.notFound();
  }

  private async validateTarget(
    userId: string,
    input: CreateWatchSubscriptionInput,
  ): Promise<CreateWatchSubscriptionInput> {
    if (input.targetType === "listing_price") {
      const listing = await this.listings.findPublicById(
        input.targetId,
        input.marketCode,
      );
      if (!listing) this.notFound("Annonce introuvable sur ce marché.");
      if (listing.sellerId === userId) {
        throw new AppError({
          code: "CONFLICT",
          statusCode: 409,
          message:
            "Une alerte de prix ne peut pas suivre votre propre annonce.",
        });
      }
      const currentPrice = {
        amountMinor: majorToMinorAmount(listing.price, listing.currency),
        currency: listing.currency,
      };
      if (
        input.baselinePrice &&
        (input.baselinePrice.currency !== currentPrice.currency ||
          input.baselinePrice.amountMinor !== currentPrice.amountMinor)
      ) {
        throw new AppError({
          code: "CONFLICT",
          statusCode: 409,
          message:
            "Le prix de l’annonce a changé. Rechargez avant de créer l’alerte.",
        });
      }
      return { ...input, baselinePrice: currentPrice };
    }

    if (input.targetType === "seller") {
      if (input.targetId === userId) {
        throw new AppError({
          code: "CONFLICT",
          statusCode: 409,
          message: "Vous ne pouvez pas suivre votre propre profil vendeur.",
        });
      }
      if (!(await this.users.findPublicById(input.targetId))) {
        this.notFound("Vendeur introuvable.");
      }
    }

    return input;
  }

  private notFound(message = "Alerte introuvable."): never {
    throw new AppError({ code: "NOT_FOUND", statusCode: 404, message });
  }

  private requireEnabledMarket(marketCode: string): string {
    const market = requireMarketCode(marketCode);
    if (!getCountryConfig(market)?.marketplace.enabled) {
      throw new AppError({
        code: "CONFLICT",
        statusCode: 409,
        message: "Les alertes seront disponibles à l’ouverture de ce marché.",
      });
    }
    return market;
  }
}

export const watchSubscriptionsService = new WatchSubscriptionsService();
