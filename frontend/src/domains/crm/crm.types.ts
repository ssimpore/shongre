/**
 * SHONGRE CRM DOMAIN TYPES
 * Authoritative models for Contacts, Companies, Leads, Opportunities,
 * Activities, Tasks, and AI Public Prospecting.
 */

export type ContactLifecycle =
  | "lead"
  | "prospect"
  | "qualified"
  | "customer"
  | "partner"
  | "do_not_contact"
  | "archived";

export type ContactQualification = "unqualified" | "low" | "medium" | "high";

export type CompanyLifecycle =
  | "prospect"
  | "qualified"
  | "customer"
  | "partner"
  | "do_not_contact"
  | "archived";

export type EntitySource =
  | "shongre_signup"
  | "pro_signup"
  | "manual"
  | "ai_research"
  | "inbound"
  | "referral"
  | "event";

export interface CrmContactIdentity {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  avatarUrl?: string;
}

export interface CrmContact {
  id: string;
  linkedUserId?: string;
  linkedSellerId?: string;
  companyId?: string;
  companyName?: string;
  identity: CrmContactIdentity;
  lifecycle: ContactLifecycle;
  qualification: ContactQualification;
  ownerId?: string;
  ownerName?: string;
  marketCode: string;
  tags: string[];
  source: EntitySource;
  doNotContact: boolean;
  notesCount: number;
  lastActivityAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyLocation {
  city?: string;
  postalCode?: string;
  region?: string;
  country: string;
}

export interface CrmCompany {
  id: string;
  name: string;
  legalName?: string;
  domain?: string;
  website?: string;
  industry?: string;
  companySize?: string;
  location?: CompanyLocation;
  linkedSellerId?: string;
  linkedUserId?: string;
  lifecycle: CompanyLifecycle;
  contactsCount: number;
  contactIds: string[];
  ownerId?: string;
  ownerName?: string;
  tags: string[];
  marketCode: string;
  source: EntitySource;
  doNotContact: boolean;
  catalogSizeEstimate?: number;
  aiFitScore?: number;
  aiSummary?: string;
  lastActivityAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type OpportunityType =
  | "pro_seller_acquisition"
  | "pro_subscription_upgrade"
  | "advertising"
  | "partnership"
  | "enterprise_account";

export type OpportunityStage =
  | "new"
  | "qualified"
  | "contacted"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export interface CrmMoney {
  amountMinor: number;
  currency: string;
}

export interface CrmOpportunity {
  id: string;
  title: string;
  companyId?: string;
  companyName?: string;
  contactIds: string[];
  primaryContactName?: string;
  type: OpportunityType;
  stage: OpportunityStage;
  estimatedValue: CrmMoney;
  probability: number;
  expectedCloseDate?: string;
  ownerId?: string;
  ownerName?: string;
  marketCode: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ActivityType =
  | "note"
  | "call"
  | "email"
  | "meeting"
  | "task_completed"
  | "ai_discovered"
  | "stage_changed"
  | "pro_conversion"
  | "do_not_contact_set"
  | "enrichment_applied";

export interface CrmActivity {
  id: string;
  entityType: "contact" | "company" | "opportunity";
  entityId: string;
  type: ActivityType;
  title: string;
  description?: string;
  authorName: string;
  authorRole?: string;
  isAiGenerated?: boolean;
  createdAt: string;
}

export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "pending" | "completed" | "cancelled";

export interface CrmTask {
  id: string;
  title: string;
  dueDate: string;
  assigneeId: string;
  assigneeName: string;
  relatedType: "contact" | "company" | "opportunity";
  relatedId: string;
  relatedTitle: string;
  priority: TaskPriority;
  status: TaskStatus;
  notes?: string;
  createdAt: string;
}

// AI PROSPECTING TYPES
export interface ProspectResearchQuery {
  naturalLanguageQuery: string;
  marketCode?: string;
  region?: string;
  taxonomySlugs?: string[];
  industry?: string;
  requireWebsite?: boolean;
  limit?: number;
}

export interface ProspectSource {
  id: string;
  url: string;
  title: string;
  snippet?: string;
  sourceType: string;
  retrievedAt: string;
}

export interface ProspectResearchCandidate {
  id: string;
  company: {
    name: string;
    website?: string;
    domain?: string;
    location?: string;
    industry?: string;
    description?: string;
    estimatedSize?: string;
  };
  suggestedTaxonomySlugs?: string[];
  fit: {
    score: number; // 0 - 100
    level: "high" | "medium" | "low";
    reasons: string[];
    caveats?: string[];
  };
  sources: ProspectSource[];
  possibleExistingEntityId?: string;
  possibleExistingSellerId?: string;
  isDuplicate?: boolean;
  status: "discovered" | "imported" | "dismissed";
}

export interface ProspectResearchResult {
  query: ProspectResearchQuery;
  candidates: ProspectResearchCandidate[];
  totalFound: number;
  researchedAt: string;
}

export interface CompanyEnrichmentDiff {
  companyId: string;
  suggestedIndustry?: string;
  suggestedWebsite?: string;
  suggestedCatalogSize?: number;
  suggestedSummary?: string;
  suggestedTaxonomySlugs?: string[];
  sources: ProspectSource[];
}
