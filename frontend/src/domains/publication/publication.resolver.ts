/**
 * SHONGRE PUBLICATION SCHEMA RESOLVER
 * Authoritative compiler that translates taxonomy nodes, market configuration,
 * seller capabilities and listing intent into an actionable publication schema.
 */

import { taxonomyService } from '../taxonomy/taxonomy.service';
import { ATTRIBUTE_REGISTRY } from '../taxonomy/attribute.registry';
import { CONDITION_SCHEMES } from '../taxonomy/condition.schemes';
import {
  TaxonomyNode,
  TaxonomyAttribute,
  ConditionOption,
  TaxonomyCapabilities,
  SellerEligibilityRules,
  ListingFamily,
} from '../taxonomy/taxonomy.types';
import { ListingIntent, PriceModel, PackageSizeTier } from './publication.types';
import { marketService } from '../market/market.service';

export interface ResolvedPublicationField {
  attribute: TaxonomyAttribute;
  isVisiblyMet: boolean;
  isRequired: boolean;
  isDisabled: boolean;
}

export interface ResolvedPublicationEngineSchema {
  node: TaxonomyNode;
  ancestors: TaxonomyNode[];
  isPublishable: boolean;
  listingFamily: ListingFamily;
  supportedIntents: ListingIntent[];
  defaultIntent: ListingIntent;
  conditionScheme: ConditionOption[];
  attributes: TaxonomyAttribute[];
  fields: ResolvedPublicationField[];
  capabilities: TaxonomyCapabilities;
  sellerEligibility: SellerEligibilityRules;
  summaryAttributeIds: string[];
  marketCode: string;
  currency: {
    code: string;
    symbol: string;
  };
  supportedPriceModels: PriceModel[];
  defaultPriceModel: PriceModel;
}

export interface ResolvePublicationParams {
  taxonomyNodeId: string;
  marketCode?: string;
  sellerRole?: string;
  listingIntent?: ListingIntent;
  currentValues?: Record<string, any>;
}

export class PublicationResolver {
  /**
   * Resolves the full publication schema for a given taxonomy node and market context.
   */
  resolve(params: ResolvePublicationParams): ResolvedPublicationEngineSchema | null {
    const { taxonomyNodeId, marketCode = 'FR', sellerRole, listingIntent, currentValues = {} } = params;
    const node = taxonomyService.getNode(taxonomyNodeId);
    if (!node) return null;

    const ancestors = taxonomyService.getAncestors(taxonomyNodeId);
    const hierarchy = [...ancestors, node];
    const isPublishable = taxonomyService.isPublishable(taxonomyNodeId);
    const listingFamily = taxonomyService.getFamily(taxonomyNodeId);

    // 1. Resolve Capabilities (Inherited from Root down to Leaf with Market Overrides)
    const capabilities: TaxonomyCapabilities = {
      canSell: true,
      canGive: true,
      canExchange: true,
      canRent: false,
      reservationAllowed: true,
      securePaymentAllowed: true,
      negotiablePrice: true,
      fulfillmentModes: ['hand_delivery', 'parcel_shipping'],
    };

    hierarchy.forEach((n) => {
      if (n.capabilities) {
        Object.assign(capabilities, n.capabilities);
      }
      if (n.marketOverrides && n.marketOverrides[marketCode]?.capabilities) {
        Object.assign(capabilities, n.marketOverrides[marketCode]!.capabilities);
      }
    });

    // 2. Resolve Seller Eligibility
    const sellerEligibility: SellerEligibilityRules = {
      individualAllowed: true,
      proAllowed: true,
      proVerificationRequired: false,
      proKbisRequired: false,
    };

    hierarchy.forEach((n) => {
      if (n.sellerEligibility) {
        Object.assign(sellerEligibility, n.sellerEligibility);
      }
      if (n.marketOverrides && n.marketOverrides[marketCode]?.sellerEligibility) {
        Object.assign(sellerEligibility, n.marketOverrides[marketCode]!.sellerEligibility);
      }
    });

    // 3. Resolve Condition Scheme
    let conditionSchemeId = node.conditionScheme;
    if (!conditionSchemeId) {
      for (let i = ancestors.length - 1; i >= 0; i--) {
        if (ancestors[i].conditionScheme) {
          conditionSchemeId = ancestors[i].conditionScheme;
          break;
        }
      }
    }
    const conditionScheme: ConditionOption[] =
      CONDITION_SCHEMES[conditionSchemeId || 'consumer_product'] || CONDITION_SCHEMES.consumer_product;

    // 4. Resolve Attributes with overrides
    const accumulatedAttributeIds = new Set<string>();
    hierarchy.forEach((n) => {
      if (n.attributeIds) {
        n.attributeIds.forEach((attrId) => accumulatedAttributeIds.add(attrId));
      }
      if (n.marketOverrides && n.marketOverrides[marketCode]?.additionalAttributeIds) {
        n.marketOverrides[marketCode]!.additionalAttributeIds!.forEach((attrId) =>
          accumulatedAttributeIds.add(attrId)
        );
      }
      if (n.marketOverrides && n.marketOverrides[marketCode]?.removedAttributeIds) {
        n.marketOverrides[marketCode]!.removedAttributeIds!.forEach((attrId) =>
          accumulatedAttributeIds.delete(attrId)
        );
      }
    });

    const attributes: TaxonomyAttribute[] = Array.from(accumulatedAttributeIds)
      .map((attrId) => {
        const base = ATTRIBUTE_REGISTRY[attrId];
        if (!base) return null;
        const override = node.attributeOverrides?.[attrId];
        return override ? { ...base, ...override } : base;
      })
      .filter((a): a is TaxonomyAttribute => a !== null)
      .sort((a, b) => (a.displayOrder || 99) - (b.displayOrder || 99));

    // 5. Evaluate Declarative Conditional Dependencies for Fields
    const fields: ResolvedPublicationField[] = attributes.map((attr) => {
      let isVisiblyMet = true;
      let isRequired = !!attr.required;
      let isDisabled = false;

      if (attr.dependencies && attr.dependencies.length > 0) {
        isVisiblyMet = attr.dependencies.every((dep) => {
          const rawKey = dep.attributeId.split('.').pop() || dep.attributeId;
          const val = currentValues[rawKey] ?? currentValues[dep.attributeId];
          if (dep.operator === 'equals') return val === dep.value;
          if (dep.operator === 'in') return Array.isArray(dep.value) && dep.value.includes(val);
          if (dep.operator === 'not_equals') return val !== dep.value;
          return true;
        });
      }

      return {
        attribute: attr,
        isVisiblyMet,
        isRequired: isVisiblyMet ? isRequired : false,
        isDisabled,
      };
    });

    // 6. Resolve Supported Intents
    let supportedIntents: ListingIntent[] = ['SELL', 'GIVE', 'EXCHANGE'];
    if (listingFamily === 'real_estate') {
      supportedIntents = ['SELL', 'RENT'];
    } else if (listingFamily === 'service') {
      supportedIntents = ['OFFER_SERVICE'];
    } else if (listingFamily === 'job') {
      supportedIntents = ['JOB_OFFER'];
    } else if (listingFamily === 'vehicle') {
      supportedIntents = ['SELL', 'RENT'];
    }
    if (node.supportedIntents) {
      supportedIntents = node.supportedIntents as ListingIntent[];
    }
    const defaultIntent = supportedIntents[0] || 'SELL';

    // 7. Resolve Supported Price Models
    let supportedPriceModels: PriceModel[] = ['fixed', 'negotiable', 'free'];
    let defaultPriceModel: PriceModel = 'fixed';
    if (listingFamily === 'service') {
      supportedPriceModels = ['hourly', 'daily', 'fixed', 'on_request'];
      defaultPriceModel = 'hourly';
    } else if (listingFamily === 'job') {
      supportedPriceModels = ['monthly', 'on_request'];
      defaultPriceModel = 'monthly';
    } else if (listingFamily === 'real_estate' && (listingIntent === 'RENT' || defaultIntent === 'RENT')) {
      supportedPriceModels = ['rent_plus_charges', 'monthly'];
      defaultPriceModel = 'rent_plus_charges';
    }

    // 8. Resolve Market Currency
    const effectiveMarket = marketService.getEffectiveConfig(marketCode);
    const currency = {
      code: effectiveMarket.localization.defaultCurrency || 'EUR',
      symbol: effectiveMarket.localization.currencySymbol || '€',
    };

    // 9. Summary Attribute IDs
    let summaryIds = node.summaryAttributeIds;
    if (!summaryIds || summaryIds.length === 0) {
      for (let i = ancestors.length - 1; i >= 0; i--) {
        if (ancestors[i].summaryAttributeIds && ancestors[i].summaryAttributeIds!.length > 0) {
          summaryIds = ancestors[i].summaryAttributeIds;
          break;
        }
      }
    }

    return {
      node,
      ancestors,
      isPublishable,
      listingFamily,
      supportedIntents,
      defaultIntent,
      conditionScheme,
      attributes,
      fields,
      capabilities,
      sellerEligibility,
      summaryAttributeIds: summaryIds || [],
      marketCode,
      currency,
      supportedPriceModels,
      defaultPriceModel,
    };
  }
}

export const publicationResolver = new PublicationResolver();
