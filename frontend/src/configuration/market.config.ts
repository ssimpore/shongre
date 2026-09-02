import { marketService } from "../domains/market/market.service";
import { Market } from "../domains/market/market.types";
import {
  getDemoTaxRateBps,
  getDemoTransactionCommercials,
} from "../domains/monetization/demo-commercial-catalog";
import {
  DEFAULT_MARKET_CODE,
  DEFAULT_MARKET_CURRENCY,
  DEFAULT_MARKET_CURRENCY_SYMBOL,
  DEFAULT_MARKET_LOCALE,
  DEFAULT_MARKET_TIMEZONE,
} from "./market-baseline";
import { MONETIZATION_ADMIN_CONSTRAINTS } from "@shongre/contracts/monetization";

export interface CountryMarketDefinition {
  code: string;
  name: string;
  flag: string;
  currency: string;
  supportedCurrencies: string[];
  version?: number;
  currencySymbol: string;
  locale: string;
  phonePrefix: string;
  phonePlaceholder: string;
  phoneRegex: RegExp;
  postalCodePlaceholder: string;
  postalCodeRegex: RegExp;
  vatRateStandard: number;
  businessIdentifierLabel: string;
  businessIdentifierHelper: string;
  businessIdentifierRegex: RegExp;
  businessIdentifierFormatPlaceholder: string;
  secondaryIdentifierLabel?: string;
  vatNumberFormatPlaceholder: string;
  vatNumberRegex: RegExp;
  supportedLegalForms: string[];
  requiredVerificationDocuments: {
    id: string;
    label: string;
    description: string;
  }[];
  isDefault?: boolean;
}

/**
 * Builds a CountryMarketDefinition from a Market domain entity and its effective configuration
 */
export function buildCountryMarketDefinition(
  market: Market,
): CountryMarketDefinition {
  const config = marketService.getEffectiveConfig(market.code);
  return {
    code: market.code,
    name: market.name,
    flag: market.flag,
    currency: config.localization.defaultCurrency,
    supportedCurrencies: [...market.supportedCurrencies],
    version: market.version,
    currencySymbol: config.localization.currencySymbol,
    locale: config.localization.defaultLocale,
    phonePrefix: config.localization.phonePrefix,
    phonePlaceholder: config.localization.phonePlaceholder,
    phoneRegex: new RegExp(config.localization.phoneRegex),
    postalCodePlaceholder: config.localization.postalCodePlaceholder,
    postalCodeRegex: new RegExp(config.localization.postalCodeRegex),
    vatRateStandard: config.taxes.vatRateStandard,
    businessIdentifierLabel: config.pro.businessIdentifierLabel,
    businessIdentifierHelper: config.pro.businessIdentifierHelper,
    businessIdentifierRegex: new RegExp(
      config.pro.businessIdentifierRegex,
      "i",
    ),
    businessIdentifierFormatPlaceholder:
      config.pro.businessIdentifierFormatPlaceholder,
    secondaryIdentifierLabel: config.pro.secondaryIdentifierLabel,
    vatNumberFormatPlaceholder: config.pro.vatNumberFormatPlaceholder,
    vatNumberRegex: new RegExp(config.pro.vatNumberRegex, "i"),
    supportedLegalForms: config.pro.supportedLegalForms,
    requiredVerificationDocuments: config.pro.requiredVerificationDocuments,
    isDefault: market.isDefault,
  };
}

export const getMarketDefinition = (
  countryCode?: string,
): CountryMarketDefinition => {
  const market = marketService.getMarket(countryCode);
  return buildCountryMarketDefinition(market);
};

export const SUPPORTED_MARKETS: Record<string, CountryMarketDefinition> =
  new Proxy(
    {},
    {
      get(_target, prop: string) {
        if (typeof prop === "symbol" || prop === "toJSON") return undefined;
        return getMarketDefinition(prop);
      },
      ownKeys() {
        return marketService.getMarkets().map((m) => m.code);
      },
      getOwnPropertyDescriptor(_target, prop: string) {
        const exists = marketService.getMarkets().some((m) => m.code === prop);
        if (exists) {
          return {
            enumerable: true,
            configurable: true,
            value: getMarketDefinition(prop),
          };
        }
        return undefined;
      },
    },
  );

export const MARKET_CONFIG = {
  defaultMarket: DEFAULT_MARKET_CODE,
  defaultLocale: DEFAULT_MARKET_LOCALE,
  defaultCurrency: DEFAULT_MARKET_CURRENCY,
  defaultCurrencySymbol: DEFAULT_MARKET_CURRENCY_SYMBOL,
  timezone: DEFAULT_MARKET_TIMEZONE,
  dateFormat: "dd/MM/yyyy",
  dateTimeFormat: "dd/MM/yyyy HH:mm",
  postalCodeRegex: /^[0-9]{5}$/,
  phonePrefix: "+33",
  vatRateStandard:
    getDemoTaxRateBps(DEFAULT_MARKET_CODE) /
    MONETIZATION_ADMIN_CONSTRAINTS.basisPoints.max,
  buyerProtectionFeePercent:
    getDemoTransactionCommercials(DEFAULT_MARKET_CODE, "individual")
      .protectionRateBps / MONETIZATION_ADMIN_CONSTRAINTS.basisPoints.max,
  buyerProtectionFixedFee:
    getDemoTransactionCommercials(DEFAULT_MARKET_CODE, "individual")
      .protectionFixedMinor / MONETIZATION_ADMIN_CONSTRAINTS.moneyMajorToMinor,
  maxPhotosPerListing: {
    individual: 8,
    pro: 20,
  },
  supportedLocales: [
    { code: "fr-FR", label: "Français (France)", flag: "🇫🇷" },
    { code: "fr-BE", label: "Français (Belgique)", flag: "🇧🇪" },
    { code: "fr-CH", label: "Français (Suisse)", flag: "🇨🇭" },
    { code: "es-ES", label: "Español", flag: "🇪🇸" },
    { code: "en-US", label: "English (EU)", flag: "🇪🇺" },
  ],
  popularCities: [
    {
      name: "Paris",
      postalCode: "75000",
      department: "75 - Paris",
      region: "Île-de-France",
    },
    {
      name: "Lyon",
      postalCode: "69000",
      department: "69 - Rhône",
      region: "Auvergne-Rhône-Alpes",
    },
    {
      name: "Marseille",
      postalCode: "13000",
      department: "13 - Bouches-du-Rhône",
      region: "Provence-Alpes-Côte d'Azur",
    },
    {
      name: "Toulouse",
      postalCode: "31000",
      department: "31 - Haute-Garonne",
      region: "Occitanie",
    },
    {
      name: "Bordeaux",
      postalCode: "33000",
      department: "33 - Gironde",
      region: "Nouvelle-Aquitaine",
    },
    {
      name: "Nantes",
      postalCode: "44000",
      department: "44 - Loire-Atlantique",
      region: "Pays de la Loire",
    },
    {
      name: "Lille",
      postalCode: "59000",
      department: "59 - Nord",
      region: "Hauts-de-France",
    },
    {
      name: "Strasbourg",
      postalCode: "67000",
      department: "67 - Bas-Rhin",
      region: "Grand Est",
    },
    {
      name: "Rennes",
      postalCode: "35000",
      department: "35 - Ille-et-Vilaine",
      region: "Bretagne",
    },
    {
      name: "Nice",
      postalCode: "06000",
      department: "06 - Alpes-Maritimes",
      region: "Provence-Alpes-Côte d'Azur",
    },
    {
      name: "Montpellier",
      postalCode: "34000",
      department: "34 - Hérault",
      region: "Occitanie",
    },
  ],
};

export const CONDITION_OPTIONS = [
  { value: "new_with_tag", label: "Neuf avec étiquette" },
  { value: "new_without_tag", label: "Neuf sans étiquette" },
  { value: "very_good", label: "Très bon état" },
  { value: "good", label: "Bon état" },
  { value: "fair", label: "État satisfaisant" },
  { value: "for_parts", label: "Pour pièces / Réparation" },
  { value: "not_applicable", label: "Non applicable" },
];

export const validateBusinessIdentifier = (
  identifier: string,
  countryCode = DEFAULT_MARKET_CODE,
): boolean => {
  const clean = identifier.replace(/[\s.-]/g, "");
  if (!clean) return false;
  const def = getMarketDefinition(countryCode);
  if (countryCode.toUpperCase() === DEFAULT_MARKET_CODE) {
    return /^\d{9}$/.test(clean) || /^\d{14}$/.test(clean);
  }
  return (
    def.businessIdentifierRegex.test(identifier) ||
    def.businessIdentifierRegex.test(clean)
  );
};

export const formatBusinessIdentifier = (
  identifier: string,
  countryCode = DEFAULT_MARKET_CODE,
): string => {
  const clean = identifier.replace(/[\s.-]/g, "");
  if (countryCode.toUpperCase() === DEFAULT_MARKET_CODE) {
    if (clean.length === 14) {
      return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6, 9)} ${clean.slice(9, 14)}`;
    }
    if (clean.length === 9) {
      return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6, 9)}`;
    }
  }
  if (countryCode.toUpperCase() === "BE" && clean.length === 10) {
    return `${clean.slice(0, 4)}.${clean.slice(4, 7)}.${clean.slice(7, 10)}`;
  }
  return identifier;
};

export const calculateVatNumber = (
  siren: string,
  countryCode = DEFAULT_MARKET_CODE,
): string => {
  const clean = siren.replace(/\D/g, "").slice(0, 9);
  if (countryCode.toUpperCase() === DEFAULT_MARKET_CODE && clean.length === 9) {
    const sirenNum = parseInt(clean, 10);
    const key = (12 + 3 * (sirenNum % 97)) % 97;
    const keyStr = key < 10 ? `0${key}` : `${key}`;
    return `FR${keyStr}${clean}`;
  }
  if (countryCode.toUpperCase() === "BE") {
    return `BE0${clean}`;
  }
  return `${countryCode.toUpperCase()}${clean}`;
};
