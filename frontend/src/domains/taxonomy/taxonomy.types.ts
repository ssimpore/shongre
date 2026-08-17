/**
 * SHONGRE MARKETPLACE TAXONOMY DOMAIN TYPES
 * Single Source of Truth for hierarchy, attributes, capabilities, search filters, and publication schemas.
 */

export type TaxonomyLevel = 'category' | 'subcategory' | 'type' | 'subtype';

export type TaxonomyNodeStatus = 'active' | 'draft' | 'disabled' | 'deprecated' | 'archived';

export type ConditionSchemeId =
  | 'consumer_product'
  | 'vehicle'
  | 'real_estate'
  | 'collectible'
  | 'professional'
  | 'job'
  | 'service';

export interface ConditionOption {
  value: string;
  label: string;
  description: string;
  labels?: Record<string, string>;
}

export type AttributeDataType =
  | 'select'
  | 'multi_select'
  | 'number'
  | 'text'
  | 'boolean'
  | 'range'
  | 'year';

export interface AttributeOption {
  value: string;
  label: string;
  labels?: Record<string, string>;
}

export interface AttributeDependency {
  attributeId: string;
  operator: 'equals' | 'in' | 'not_equals';
  value: any;
}

export interface AttributeValidation {
  min?: number;
  max?: number;
  pattern?: string;
  step?: number;
  placeholder?: string;
}

export interface TaxonomyAttribute {
  id: string;
  code: string;
  label: string;
  labels?: Record<string, string>;
  helpText?: string;
  dataType: AttributeDataType;
  unit?: string;
  required?: boolean;
  filterable?: boolean;
  searchable?: boolean;
  sortable?: boolean;
  options?: AttributeOption[];
  dependencies?: AttributeDependency[];
  validation?: AttributeValidation;
  publicationGroup?: 'general' | 'specifications' | 'dimensions' | 'performance' | 'legal';
  displayOrder?: number;
}

export type FulfillmentMode =
  | 'hand_delivery'
  | 'parcel_shipping'
  | 'heavy_delivery'
  | 'digital_download'
  | 'on_site_service'
  | 'none';

export interface TaxonomyCapabilities {
  canSell: boolean;
  canGive: boolean;
  canExchange: boolean;
  canRent: boolean;
  reservationAllowed: boolean;
  securePaymentAllowed: boolean;
  negotiablePrice: boolean;
  fulfillmentModes: FulfillmentMode[];
}

export interface SellerEligibilityRules {
  individualAllowed: boolean;
  proAllowed: boolean;
  proVerificationRequired?: boolean;
  proKbisRequired?: boolean;
}

export interface TaxonomySeoMeta {
  metaTitleTemplate?: string;
  metaDescriptionTemplate?: string;
  canonicalPath?: string;
  indexable?: boolean;
}

export interface TaxonomyMarketOverride {
  status?: TaxonomyNodeStatus;
  capabilities?: Partial<TaxonomyCapabilities>;
  sellerEligibility?: Partial<SellerEligibilityRules>;
  additionalAttributeIds?: string[];
  removedAttributeIds?: string[];
}

export type ListingFamily =
  | 'physical_product'
  | 'vehicle'
  | 'real_estate'
  | 'service'
  | 'job'
  | 'professional_equipment'
  | 'digital';

export interface TaxonomyNodeBase {
  id: string;
  slug: string;
  /**
   * Canonical complete human-readable label.
   */
  label?: string;
  /**
   * Convenient canonical French name (legacy alias for label).
   */
  name: string;
  /**
   * Optional compact alias intended for constrained UI surfaces.
   * Never used as an identifier or business-rule value.
   */
  shortLabel?: string;
}

export type TaxonomyLabelMode = 'full' | 'compact';

export interface TaxonomyLabelOptions {
  compact?: boolean;
  locale?: string;
}

export interface TaxonomyNode extends TaxonomyNodeBase {
  id: string;
  code: string;
  slug: string;
  parentId?: string;
  ancestorIds?: string[];
  level: TaxonomyLevel;
  publishable?: boolean; // false for navigation-only categories; true for publishable leaves
  listingFamily?: ListingFamily;
  supportedIntents?: string[]; // e.g. ['SELL', 'GIVE', 'EXCHANGE', 'RENT', 'OFFER_SERVICE', 'JOB_OFFER']
  labels: Record<string, string>; // e.g. { 'fr-FR': 'Voitures d\'occasion', 'en-US': 'Used Cars' }
  shortLabels?: Record<string, string>; // e.g. { 'fr-FR': 'Voitures', 'en-US': 'Cars' }
  name: string; // convenient canonical French name
  label?: string; // canonical complete human-readable label
  shortLabel?: string; // optional compact alias intended for constrained UI surfaces
  description?: string;
  iconName?: string;
  accentColor?: string;
  sortOrder: number;
  status: TaxonomyNodeStatus;
  conditionScheme?: ConditionSchemeId;
  capabilities?: Partial<TaxonomyCapabilities>;
  sellerEligibility?: Partial<SellerEligibilityRules>;
  attributeIds?: string[];
  attributeOverrides?: Record<string, Partial<TaxonomyAttribute>>;
  summaryAttributeIds?: string[]; // Top 1-3 attributes for listing card preview
  filterFacetIds?: string[]; // Attributes to render as search facets
  marketOverrides?: Record<string, TaxonomyMarketOverride>;
  seo?: TaxonomySeoMeta;
  synonyms?: string[];
  aliases?: string[];
  replacedById?: string; // For deprecated categories: successor node ID
  createdAt?: string;
  updatedAt?: string;
  children?: TaxonomyNode[];
}

export interface ResolvedPublicationSchema {
  node: TaxonomyNode;
  ancestors: TaxonomyNode[];
  conditionScheme: ConditionOption[];
  attributes: TaxonomyAttribute[];
  capabilities: TaxonomyCapabilities;
  sellerEligibility: SellerEligibilityRules;
  summaryAttributeIds: string[];
}

export interface SearchFacetDefinition {
  attribute: TaxonomyAttribute;
  facetType: 'range' | 'select' | 'multi_select' | 'boolean';
  order: number;
}

// =========================================================================
// ADMIN & GOVERNANCE MODELS
// =========================================================================

export type TaxonomyChangeType =
  | 'created'
  | 'updated'
  | 'moved'
  | 'reordered'
  | 'deprecated'
  | 'deleted'
  | 'attribute_assigned'
  | 'market_override';

export interface TaxonomyDraftChange {
  id: string;
  nodeId: string;
  nodeLabel: string;
  changeType: TaxonomyChangeType;
  description: string;
  previousState?: Partial<TaxonomyNode>;
  newState: Partial<TaxonomyNode>;
  timestamp: string;
  actor: {
    id: string;
    name: string;
    role: string;
  };
}

export interface TaxonomyVersion {
  id: string;
  versionNumber: number;
  status: 'draft' | 'published' | 'archived';
  changeCount: number;
  description?: string;
  publishedAt?: string;
  publishedBy?: string;
  createdAt: string;
}

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface TaxonomyValidationIssue {
  id: string;
  nodeId?: string;
  nodeLabel?: string;
  severity: ValidationSeverity;
  code: string;
  message: string;
  field?: string;
  remediation?: string;
}

export interface TaxonomyImpactReport {
  nodeId: string;
  nodeLabel: string;
  activeListingsCount: number;
  descendantsCount: number;
  publishableLeavesCount: number;
  savedSearchesCount: number;
  marketOverridesCount: number;
  isSafeToDelete: boolean;
  blockingReasons: string[];
}

export interface TaxonomyAuditEvent {
  id: string;
  nodeId: string;
  nodeLabel: string;
  action: string;
  actor: {
    id: string;
    name: string;
    role: string;
  };
  timestamp: string;
  details?: string;
}

export interface CreateTaxonomyNodeInput {
  parentId?: string;
  level: TaxonomyLevel;
  name: string;
  label?: string;
  shortLabel?: string;
  slug: string;
  description?: string;
  iconName?: string;
  accentColor?: string;
  publishable?: boolean;
  status?: TaxonomyNodeStatus;
  conditionScheme?: ConditionSchemeId;
  attributeIds?: string[];
  capabilities?: Partial<TaxonomyCapabilities>;
}

export interface UpdateTaxonomyNodeInput {
  name?: string;
  label?: string;
  shortLabel?: string;
  slug?: string;
  description?: string;
  iconName?: string;
  accentColor?: string;
  publishable?: boolean;
  status?: TaxonomyNodeStatus;
  sortOrder?: number;
  conditionScheme?: ConditionSchemeId;
  attributeIds?: string[];
  summaryAttributeIds?: string[];
  filterFacetIds?: string[];
  capabilities?: Partial<TaxonomyCapabilities>;
  sellerEligibility?: Partial<SellerEligibilityRules>;
  seo?: TaxonomySeoMeta;
  aliases?: string[];
  synonyms?: string[];
  replacedById?: string;
}
