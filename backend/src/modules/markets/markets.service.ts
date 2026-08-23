import { CountryMarketDefinition } from "../../shared/types/index.js";
import {
  IMarketRepository,
  repositories,
  CANONICAL_DEMO_MARKETS,
} from "../../infrastructure/database/repositories/index.js";

export const CANONICAL_MARKETS = CANONICAL_DEMO_MARKETS;

export class MarketsService {
  constructor(private marketRepo: IMarketRepository = repositories.markets) {}

  async getAllMarkets(): Promise<CountryMarketDefinition[]> {
    return this.marketRepo.getAll();
  }

  async getMarketByCode(code: string): Promise<CountryMarketDefinition | null> {
    return this.marketRepo.getByCode(code);
  }

  async getActiveMarket(): Promise<CountryMarketDefinition> {
    return this.marketRepo.getActive();
  }

  async setActiveMarket(code: string): Promise<CountryMarketDefinition> {
    return this.marketRepo.setActive(code);
  }

  async getEffectiveMarketConfig(
    code: string,
  ): Promise<CountryMarketDefinition> {
    return this.marketRepo.getEffective(code);
  }
}

export const marketsService = new MarketsService();
