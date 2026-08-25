import { randomUUID } from "node:crypto";
import type {
  CrmAccount,
  CrmAccountDuplicateCheck,
  CrmAccountInput,
  CrmActivity,
  CrmContact,
  CrmContactInput,
  CrmCustomField,
  CrmCustomFieldInput,
  CrmDuplicateMatch,
  CrmOpportunity,
  CrmOpportunityInput,
  CrmPipeline,
  CrmPipelineInput,
  CrmProduct,
  CrmProductInput,
  CrmQuote,
  CrmQuoteInput,
  CrmSavedView,
  CrmSavedViewInput,
  CrmTask,
  CrmTaskInput,
} from "@shongre/contracts/crm";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";
import { requireMarketCode } from "../../../shared/market/market-code.js";
import { databaseFailure } from "./repository-error.js";

export interface CrmTenantContext {
  tenantId: string;
  workspaceId: string;
  marketCode: string;
  currency: string;
}

export interface CrmListOptions {
  limit?: number;
  cursor?: string;
  query?: string;
}

export interface CrmPage<T> {
  items: T[];
  nextCursor?: string;
}

export interface ICrmRepository {
  resolveTenantId(userId: string): Promise<string | null>;
  getTenantContext(tenantId: string): Promise<CrmTenantContext | null>;
  provisionTenant(tenantId: string, actorId: string): Promise<CrmTenantContext>;
  listAccounts(
    tenantId: string,
    options?: CrmListOptions,
  ): Promise<CrmPage<CrmAccount>>;
  getAccount(tenantId: string, id: string): Promise<CrmAccount | null>;
  createAccount(
    context: CrmTenantContext,
    input: CrmAccountInput,
  ): Promise<CrmAccount>;
  updateAccount(
    tenantId: string,
    id: string,
    input: Partial<CrmAccountInput>,
    expectedVersion: number,
  ): Promise<CrmAccount>;
  findAccountDuplicates(
    tenantId: string,
    input: CrmAccountDuplicateCheck,
  ): Promise<CrmDuplicateMatch[]>;
  listContacts(
    tenantId: string,
    options?: CrmListOptions,
  ): Promise<CrmPage<CrmContact>>;
  getContact(tenantId: string, id: string): Promise<CrmContact | null>;
  createContact(
    context: CrmTenantContext,
    input: CrmContactInput,
  ): Promise<CrmContact>;
  updateContact(
    tenantId: string,
    id: string,
    input: Partial<CrmContactInput>,
    expectedVersion: number,
  ): Promise<CrmContact>;
  listPipelines(tenantId: string): Promise<CrmPipeline[]>;
  createPipeline(
    context: CrmTenantContext,
    input: CrmPipelineInput,
  ): Promise<CrmPipeline>;
  updatePipeline(
    tenantId: string,
    workspaceId: string,
    id: string,
    input: CrmPipelineInput,
    expectedVersion: number,
  ): Promise<CrmPipeline>;
  getStage(
    tenantId: string,
    stageId: string,
  ): Promise<{
    id: string;
    pipelineId: string;
    name: string;
    probability: number;
    isOpen: boolean;
    isWon: boolean;
    isLost: boolean;
  } | null>;
  listOpportunities(
    tenantId: string,
    options?: CrmListOptions,
  ): Promise<CrmPage<CrmOpportunity>>;
  getOpportunity(tenantId: string, id: string): Promise<CrmOpportunity | null>;
  createOpportunity(
    context: CrmTenantContext,
    input: CrmOpportunityInput,
  ): Promise<CrmOpportunity>;
  updateOpportunity(
    tenantId: string,
    id: string,
    input: Record<string, unknown>,
    expectedVersion: number,
  ): Promise<CrmOpportunity>;
  listTasks(
    tenantId: string,
    options?: CrmListOptions,
  ): Promise<CrmPage<CrmTask>>;
  createTask(context: CrmTenantContext, input: CrmTaskInput): Promise<CrmTask>;
  completeTask(
    tenantId: string,
    id: string,
    actorId: string,
    result: string | undefined,
    expectedVersion: number,
  ): Promise<CrmTask>;
  listActivities(
    tenantId: string,
    entityType: string,
    entityId: string,
    limit?: number,
  ): Promise<CrmActivity[]>;
  addActivity(
    context: CrmTenantContext,
    activity: Omit<
      CrmActivity,
      "id" | "tenantId" | "workspaceId" | "createdAt"
    >,
  ): Promise<CrmActivity>;
  listProducts(
    tenantId: string,
    options?: CrmListOptions,
  ): Promise<CrmPage<CrmProduct>>;
  createProduct(
    context: CrmTenantContext,
    input: CrmProductInput,
  ): Promise<CrmProduct>;
  updateProduct(
    tenantId: string,
    id: string,
    input: Partial<CrmProductInput>,
    expectedVersion: number,
  ): Promise<CrmProduct>;
  listQuotes(
    tenantId: string,
    options?: CrmListOptions & { opportunityId?: string },
  ): Promise<CrmPage<CrmQuote>>;
  createQuote(
    context: CrmTenantContext,
    input: CrmQuoteInput,
  ): Promise<CrmQuote>;
  listCustomFields(
    tenantId: string,
    entityType?: string,
  ): Promise<CrmCustomField[]>;
  createCustomField(
    context: CrmTenantContext,
    input: CrmCustomFieldInput,
  ): Promise<CrmCustomField>;
  listSavedViews(
    tenantId: string,
    workspaceId: string,
    userId: string,
    entityType?: string,
  ): Promise<CrmSavedView[]>;
  getSavedView(tenantId: string, id: string): Promise<CrmSavedView | null>;
  createSavedView(
    context: CrmTenantContext,
    actorId: string,
    input: CrmSavedViewInput,
  ): Promise<CrmSavedView>;
  updateSavedView(
    tenantId: string,
    id: string,
    actorId: string,
    input: CrmSavedViewInput,
    expectedVersion: number,
  ): Promise<CrmSavedView>;
  deleteSavedView(
    tenantId: string,
    id: string,
    expectedVersion: number,
  ): Promise<boolean>;
  addAudit(
    tenantId: string,
    actorId: string,
    action: string,
    entityType: string,
    entityId: string | undefined,
    changedFields: string[],
    correlationId: string,
  ): Promise<void>;
}

const DEMO_TENANT_ID = "10000000-0000-4000-8000-000000000001";
const DEMO_WORKSPACE_ID = "10000000-0000-4000-8000-000000000002";
const DEMO_PIPELINE_ID = "10000000-0000-4000-8000-000000000003";
const DEMO_USER_ID = "10000000-0000-4000-8000-000000000004";
const DEMO_TEAM_ID = "10000000-0000-4000-8000-000000000005";
const STAGES = [
  [
    "10000000-0000-4000-8000-000000000010",
    "Nouveau",
    0,
    10,
    "blue",
    true,
    false,
    false,
  ],
  [
    "10000000-0000-4000-8000-000000000011",
    "Qualifié",
    1,
    25,
    "teal",
    true,
    false,
    false,
  ],
  [
    "10000000-0000-4000-8000-000000000012",
    "Contacté",
    2,
    40,
    "amber",
    true,
    false,
    false,
  ],
  [
    "10000000-0000-4000-8000-000000000013",
    "Proposition",
    3,
    60,
    "orange",
    true,
    false,
    false,
  ],
  [
    "10000000-0000-4000-8000-000000000014",
    "Négociation",
    4,
    80,
    "red",
    true,
    false,
    false,
  ],
  [
    "10000000-0000-4000-8000-000000000015",
    "Gagné",
    5,
    100,
    "green",
    false,
    true,
    false,
  ],
  [
    "10000000-0000-4000-8000-000000000016",
    "Perdu",
    6,
    0,
    "neutral",
    false,
    false,
    true,
  ],
] as const;
const SEEDED_AT = "2026-08-25T08:00:00.000Z";

function stageObject(stage: (typeof STAGES)[number]) {
  return {
    id: stage[0],
    pipelineId: DEMO_PIPELINE_ID,
    name: stage[1],
    position: stage[2],
    defaultProbability: stage[3],
    colorToken: stage[4],
    isOpen: stage[5],
    isWon: stage[6],
    isLost: stage[7],
    requiredFields: [],
    version: 1,
  };
}

const demoContext: CrmTenantContext = {
  tenantId: DEMO_TENANT_ID,
  workspaceId: DEMO_WORKSPACE_ID,
  marketCode: "FR",
  currency: "EUR",
};
const demoPipeline: CrmPipeline = {
  id: DEMO_PIPELINE_ID,
  tenantId: DEMO_TENANT_ID,
  workspaceId: DEMO_WORKSPACE_ID,
  name: "Ventes Shongre Pro",
  description: "Pipeline commercial configurable",
  isDefault: true,
  isActive: true,
  stages: STAGES.map(stageObject),
  version: 1,
  createdAt: SEEDED_AT,
  updatedAt: SEEDED_AT,
};

const demoAccounts: CrmAccount[] = [
  {
    id: "20000000-0000-4000-8000-000000000001",
    ...demoContext,
    ownerId: DEMO_USER_ID,
    name: "L'Atelier Nordique SAS",
    legalName: "L'Atelier Nordique SAS",
    website: "https://atelier-nordique.fr",
    domain: "atelier-nordique.fr",
    industry: "Mobilier & restauration",
    country: "FR",
    region: "Île-de-France",
    city: "Paris",
    postalCode: "75011",
    marketCode: "FR",
    lifecycle: "customer",
    fitScore: 98,
    source: "shongre_adapter",
    tags: ["Compte clé", "Mobilier"],
    customValues: {},
    version: 1,
    createdAt: "2026-06-10T09:00:00.000Z",
    updatedAt: "2026-08-24T14:30:00.000Z",
  },
  {
    id: "20000000-0000-4000-8000-000000000002",
    ...demoContext,
    ownerId: DEMO_USER_ID,
    name: "VoltExpert Mobilité France",
    legalName: "VoltExpert France SAS",
    website: "https://voltexpert-france.fr",
    domain: "voltexpert-france.fr",
    industry: "Mobilité électrique",
    country: "FR",
    region: "Auvergne-Rhône-Alpes",
    city: "Lyon",
    postalCode: "69002",
    marketCode: "FR",
    lifecycle: "qualified",
    fitScore: 94,
    source: "ai_research",
    tags: ["B2B", "Potentiel fort"],
    customValues: {},
    version: 1,
    createdAt: "2026-08-15T11:00:00.000Z",
    updatedAt: "2026-08-24T13:00:00.000Z",
  },
  {
    id: "20000000-0000-4000-8000-000000000003",
    ...demoContext,
    ownerId: DEMO_USER_ID,
    name: "Maison Déco Paris",
    domain: "maison-deco-paris.fr",
    industry: "Décoration vintage",
    country: "FR",
    city: "Paris",
    postalCode: "75011",
    marketCode: "FR",
    lifecycle: "prospect",
    fitScore: 88,
    source: "ai_research",
    tags: ["Design", "Paris"],
    customValues: {},
    version: 1,
    createdAt: "2026-08-17T02:00:00.000Z",
    updatedAt: "2026-08-24T12:00:00.000Z",
  },
];

const demoContacts: CrmContact[] = [
  {
    id: "30000000-0000-4000-8000-000000000001",
    ...demoContext,
    ownerId: DEMO_USER_ID,
    accountIds: [demoAccounts[0].id],
    firstName: "Marc",
    lastName: "Dumont",
    fullName: "Marc Dumont",
    jobTitle: "Gérant",
    email: "contact@atelier-nordique.fr",
    phone: "+33 1 42 68 00 11",
    language: "fr",
    timezone: "Europe/Paris",
    country: "FR",
    preferredContactMethod: "email",
    lifecycle: "customer",
    source: "shongre_adapter",
    doNotContact: false,
    tags: ["Décisionnaire"],
    customValues: {},
    lastContactedAt: "2026-08-24T14:30:00.000Z",
    nextContactAt: "2026-08-26T10:30:00.000Z",
    version: 1,
    createdAt: "2026-06-10T09:00:00.000Z",
    updatedAt: "2026-08-24T14:30:00.000Z",
  },
  {
    id: "30000000-0000-4000-8000-000000000002",
    ...demoContext,
    ownerId: DEMO_USER_ID,
    accountIds: [demoAccounts[1].id],
    firstName: "Alexandre",
    lastName: "Garnier",
    fullName: "Alexandre Garnier",
    jobTitle: "Directeur commercial",
    email: "a.garnier@voltexpert-france.fr",
    country: "FR",
    lifecycle: "qualified",
    source: "ai_research",
    doNotContact: false,
    tags: ["Décisionnaire"],
    customValues: {},
    version: 1,
    createdAt: "2026-08-15T11:00:00.000Z",
    updatedAt: "2026-08-24T13:00:00.000Z",
  },
];

function demoOpportunity(
  id: string,
  account: CrmAccount,
  stageIndex: number,
  name: string,
  amountMinor: number,
  probability: number,
  close: string,
  nextStep: string,
): CrmOpportunity {
  const stage = demoPipeline.stages[stageIndex];
  return {
    id,
    ...demoContext,
    accountId: account.id,
    accountName: account.name,
    contactIds: demoContacts
      .filter((c) => c.accountIds.includes(account.id))
      .map((c) => c.id),
    ownerId: DEMO_USER_ID,
    ownerName: "Léa Bertin",
    teamId: DEMO_TEAM_ID,
    teamName: "Ventes France",
    pipelineId: DEMO_PIPELINE_ID,
    pipelineName: demoPipeline.name,
    stageId: stage.id,
    stageName: stage.name,
    name,
    amount: { amountMinor, currency: "EUR" },
    probability,
    forecastCategory: stageIndex >= 4 ? "commit" : "pipeline",
    expectedCloseDate: close,
    nextStep,
    source: "manual",
    status: "open",
    tags: ["Shongre Pro"],
    customValues: {},
    version: 1,
    createdAt: SEEDED_AT,
    updatedAt: "2026-08-24T14:30:00.000Z",
  };
}
const demoOpportunities: CrmOpportunity[] = [
  demoOpportunity(
    "40000000-0000-4000-8000-000000000001",
    demoAccounts[0],
    4,
    "Abonnement Shongre Pro Business — Atelier Nordique",
    118800,
    80,
    "2026-08-31",
    "Relancer la proposition",
  ),
  demoOpportunity(
    "40000000-0000-4000-8000-000000000002",
    demoAccounts[1],
    3,
    "Ouverture vitrine Pro Mobilité",
    58800,
    60,
    "2026-09-15",
    "Préparer la démonstration",
  ),
  demoOpportunity(
    "40000000-0000-4000-8000-000000000003",
    demoAccounts[2],
    0,
    "Campagne visibilité Déco",
    35000,
    30,
    "2026-09-30",
    "Appel de découverte",
  ),
];
const demoTasks: CrmTask[] = [
  {
    id: "50000000-0000-4000-8000-000000000001",
    ...demoContext,
    ownerId: DEMO_USER_ID,
    ownerName: "Léa Bertin",
    teamId: DEMO_TEAM_ID,
    opportunityId: demoOpportunities[0].id,
    accountId: demoAccounts[0].id,
    type: "call",
    title: "Relancer la proposition",
    priority: "high",
    status: "pending",
    dueAt: "2026-08-25T10:30:00.000Z",
    version: 1,
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
  {
    id: "50000000-0000-4000-8000-000000000002",
    ...demoContext,
    ownerId: DEMO_USER_ID,
    ownerName: "Léa Bertin",
    opportunityId: demoOpportunities[1].id,
    accountId: demoAccounts[1].id,
    type: "meeting",
    title: "Préparer la démonstration",
    priority: "high",
    status: "pending",
    dueAt: "2026-08-26T09:00:00.000Z",
    version: 1,
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
];
const demoActivities: CrmActivity[] = [
  {
    id: "60000000-0000-4000-8000-000000000001",
    ...demoContext,
    actorName: "Léa Bertin",
    entityType: "opportunity",
    entityId: demoOpportunities[0].id,
    activityType: "CALL_COMPLETED",
    title: "Appel de suivi",
    description: "Discussion sur les besoins et l'offre Pro Business.",
    occurredAt: "2026-08-24T14:30:00.000Z",
    isAiGenerated: false,
    createdAt: "2026-08-24T14:30:00.000Z",
  },
  {
    id: "60000000-0000-4000-8000-000000000002",
    ...demoContext,
    actorName: "Léa Bertin",
    entityType: "opportunity",
    entityId: demoOpportunities[0].id,
    activityType: "EMAIL_SENT",
    title: "Proposition commerciale envoyée",
    occurredAt: "2026-08-23T16:42:00.000Z",
    isAiGenerated: false,
    createdAt: "2026-08-23T16:42:00.000Z",
  },
];
const demoProducts: CrmProduct[] = [
  {
    id: "71000000-0000-4000-8000-000000000001",
    tenantId: DEMO_TENANT_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    sku: "PRO-BUSINESS-M",
    name: "Shongre Pro Business",
    description: "Abonnement professionnel mensuel",
    productType: "subscription",
    isActive: true,
    metadata: {},
    prices: [
      {
        id: "72000000-0000-4000-8000-000000000001",
        priceBookId: "72000000-0000-4000-8000-000000000010",
        productId: "71000000-0000-4000-8000-000000000001",
        marketCode: "FR",
        amount: { amountMinor: 9900, currency: "EUR" },
        billingInterval: "month",
      },
    ],
    version: 1,
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
];
const demoQuotes: CrmQuote[] = [];
const demoCustomFields: CrmCustomField[] = [
  {
    id: "75000000-0000-4000-8000-000000000001",
    tenantId: DEMO_TENANT_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    entityType: "account",
    name: "Taille du catalogue",
    key: "catalogue_size",
    fieldType: "integer",
    required: false,
    validation: { min: 0 },
    options: [],
    position: 0,
    status: "active",
    version: 1,
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
];

function page<T extends { updatedAt?: string }>(
  items: T[],
  options: CrmListOptions = {},
): CrmPage<T> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
  const query = options.query?.trim().toLocaleLowerCase("fr");
  const filtered = query
    ? items.filter((item) =>
        JSON.stringify(item).toLocaleLowerCase("fr").includes(query),
      )
    : items;
  const visible = options.cursor
    ? filtered.filter((item) => (item.updatedAt ?? "") < options.cursor!)
    : filtered;
  const selected = visible.slice(0, limit);
  return {
    items: structuredClone(selected),
    nextCursor: visible.length > limit ? selected.at(-1)?.updatedAt : undefined,
  };
}

function normalizedDomain(value?: string) {
  return value
    ?.trim()
    .toLocaleLowerCase("en-US")
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];
}

function normalizedPhone(value?: string) {
  return value?.replace(/[^0-9+]/g, "");
}

function normalizedTags(tags: string[] = []) {
  const unique = new Map<string, string>();
  for (const rawTag of tags) {
    const tag = rawTag.trim();
    const key = tag.toLocaleLowerCase("fr");
    if (tag && !unique.has(key)) unique.set(key, tag);
  }
  return [...unique.values()].sort((left, right) =>
    left.localeCompare(right, "fr"),
  );
}

function accountDuplicateMatches(
  rows: Array<
    Pick<CrmAccount, "id" | "name" | "domain" | "email" | "phone" | "address">
  >,
  input: CrmAccountDuplicateCheck,
): CrmDuplicateMatch[] {
  const candidateName = input.name?.trim().toLocaleLowerCase("fr");
  const candidateDomain = normalizedDomain(input.domain);
  const candidateEmail = input.email?.trim().toLocaleLowerCase("en-US");
  const candidatePhone = normalizedPhone(input.phone);
  const candidateAddress = input.address?.trim().toLocaleLowerCase("fr");
  return rows
    .map((row) => {
      const signals: CrmDuplicateMatch["signals"] = [];
      if (candidateDomain && normalizedDomain(row.domain) === candidateDomain)
        signals.push({
          kind: "domain",
          value: candidateDomain,
          confidence: 100,
        });
      if (
        candidateName &&
        row.name.trim().toLocaleLowerCase("fr") === candidateName
      )
        signals.push({ kind: "name", value: input.name!, confidence: 90 });
      if (
        candidateEmail &&
        row.email?.trim().toLocaleLowerCase("en-US") === candidateEmail
      )
        signals.push({
          kind: "email",
          value: candidateEmail,
          confidence: 100,
        });
      if (candidatePhone && normalizedPhone(row.phone) === candidatePhone)
        signals.push({
          kind: "phone",
          value: candidatePhone,
          confidence: 100,
        });
      if (
        candidateAddress &&
        row.address?.trim().toLocaleLowerCase("fr") === candidateAddress
      )
        signals.push({
          kind: "address",
          value: input.address!,
          confidence: 75,
        });
      if (!signals.length) return undefined;
      return {
        entityId: row.id,
        displayName: row.name,
        confidence: Math.min(
          100,
          Math.max(...signals.map((signal) => signal.confidence)) +
            Math.max(0, signals.length - 1) * 5,
        ),
        signals,
      } satisfies CrmDuplicateMatch;
    })
    .filter((match): match is CrmDuplicateMatch => Boolean(match))
    .sort((left, right) => right.confidence - left.confidence);
}

export class DemoCrmRepository implements ICrmRepository {
  private pipelines = [structuredClone(demoPipeline)];
  private accounts = structuredClone(demoAccounts);
  private contacts = structuredClone(demoContacts);
  private opportunities = structuredClone(demoOpportunities);
  private tasks = structuredClone(demoTasks);
  private activities = structuredClone(demoActivities);
  private products = structuredClone(demoProducts);
  private quotes = structuredClone(demoQuotes);
  private customFields = structuredClone(demoCustomFields);
  private savedViews: CrmSavedView[] = [];
  async resolveTenantId() {
    return DEMO_TENANT_ID;
  }
  async getTenantContext() {
    return structuredClone(demoContext);
  }
  async provisionTenant() {
    return structuredClone(demoContext);
  }
  async listAccounts(_tenantId: string, options?: CrmListOptions) {
    return page(this.accounts, options);
  }
  async getAccount(_tenantId: string, id: string) {
    return structuredClone(this.accounts.find((v) => v.id === id) ?? null);
  }
  async createAccount(context: CrmTenantContext, input: CrmAccountInput) {
    const now = new Date().toISOString();
    const value = {
      id: randomUUID(),
      ...context,
      country: input.country ?? context.marketCode,
      marketCode: input.marketCode ?? context.marketCode,
      lifecycle: input.lifecycle ?? "prospect",
      source: input.source ?? "manual",
      customValues: input.customValues ?? {},
      version: 1,
      createdAt: now,
      updatedAt: now,
      ...input,
      tags: normalizedTags(input.tags),
    } as CrmAccount;
    this.accounts.unshift(value);
    return structuredClone(value);
  }
  async updateAccount(
    _tenantId: string,
    id: string,
    input: Partial<CrmAccountInput>,
    expectedVersion: number,
  ) {
    const value = this.accounts.find((v) => v.id === id);
    if (!value || value.version !== expectedVersion)
      return Promise.reject(new Error("CRM_CONFLICT"));
    Object.assign(value, input, {
      ...(input.tags ? { tags: normalizedTags(input.tags) } : {}),
      version: value.version + 1,
      updatedAt: new Date().toISOString(),
    });
    return structuredClone(value);
  }
  async findAccountDuplicates(
    _tenantId: string,
    input: CrmAccountDuplicateCheck,
  ) {
    return structuredClone(accountDuplicateMatches(this.accounts, input));
  }
  async listContacts(_tenantId: string, options?: CrmListOptions) {
    return page(this.contacts, options);
  }
  async getContact(_tenantId: string, id: string) {
    return structuredClone(this.contacts.find((v) => v.id === id) ?? null);
  }
  async createContact(context: CrmTenantContext, input: CrmContactInput) {
    const now = new Date().toISOString();
    const value = {
      id: randomUUID(),
      ...context,
      accountIds: input.accountIds ?? [],
      fullName: `${input.firstName} ${input.lastName}`.trim(),
      country: input.country ?? context.marketCode,
      lifecycle: input.lifecycle ?? "prospect",
      source: input.source ?? "manual",
      doNotContact: input.doNotContact ?? false,
      customValues: input.customValues ?? {},
      version: 1,
      createdAt: now,
      updatedAt: now,
      ...input,
      tags: normalizedTags(input.tags),
    } as CrmContact;
    this.contacts.unshift(value);
    return structuredClone(value);
  }
  async updateContact(
    _tenantId: string,
    id: string,
    input: Partial<CrmContactInput>,
    expectedVersion: number,
  ) {
    const value = this.contacts.find((v) => v.id === id);
    if (!value || value.version !== expectedVersion)
      return Promise.reject(new Error("CRM_CONFLICT"));
    Object.assign(value, input, {
      ...(input.tags ? { tags: normalizedTags(input.tags) } : {}),
      fullName:
        `${input.firstName ?? value.firstName} ${input.lastName ?? value.lastName}`.trim(),
      version: value.version + 1,
      updatedAt: new Date().toISOString(),
    });
    return structuredClone(value);
  }
  async listPipelines() {
    return structuredClone(this.pipelines);
  }
  async createPipeline(context: CrmTenantContext, input: CrmPipelineInput) {
    const now = new Date().toISOString();
    const id = randomUUID();
    if (input.isDefault)
      this.pipelines.forEach((value) => {
        value.isDefault = false;
      });
    const value: CrmPipeline = {
      id,
      tenantId: context.tenantId,
      workspaceId: context.workspaceId,
      name: input.name,
      description: input.description,
      isDefault: input.isDefault,
      isActive: true,
      stages: input.stages.map((stage) => ({
        ...stage,
        id: stage.id ?? randomUUID(),
        pipelineId: id,
        version: 1,
      })),
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    this.pipelines.push(value);
    return structuredClone(value);
  }
  async updatePipeline(
    _tenantId: string,
    _workspaceId: string,
    id: string,
    input: CrmPipelineInput,
    expectedVersion: number,
  ) {
    const index = this.pipelines.findIndex((value) => value.id === id);
    const current = this.pipelines[index];
    if (!current || current.version !== expectedVersion)
      throw new Error("CRM_CONFLICT");
    if (input.isDefault)
      this.pipelines.forEach((value) => {
        value.isDefault = false;
      });
    const versions = new Map(
      current.stages.map((stage) => [stage.id, stage.version]),
    );
    const updated: CrmPipeline = {
      ...current,
      name: input.name,
      description: input.description,
      isDefault: input.isDefault,
      stages: input.stages.map((stage) => ({
        ...stage,
        id: stage.id ?? randomUUID(),
        pipelineId: id,
        version: ((stage.id ? versions.get(stage.id) : 0) ?? 0) + 1,
      })),
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
    };
    this.pipelines[index] = updated;
    return structuredClone(updated);
  }
  async getStage(_tenantId: string, stageId: string) {
    const stage = this.pipelines
      .flatMap((value) => value.stages)
      .find((value) => value.id === stageId);
    return stage
      ? {
          id: stage.id,
          pipelineId: stage.pipelineId,
          name: stage.name,
          probability: stage.defaultProbability,
          isOpen: stage.isOpen,
          isWon: stage.isWon,
          isLost: stage.isLost,
        }
      : null;
  }
  async listOpportunities(_tenantId: string, options?: CrmListOptions) {
    return page(this.opportunities, options);
  }
  async getOpportunity(_tenantId: string, id: string) {
    return structuredClone(this.opportunities.find((v) => v.id === id) ?? null);
  }
  async createOpportunity(
    context: CrmTenantContext,
    input: CrmOpportunityInput,
  ) {
    const now = new Date().toISOString();
    const selectedPipeline = this.pipelines.find(
      (value) => value.id === input.pipelineId,
    )!;
    const stage = selectedPipeline.stages.find((v) => v.id === input.stageId)!;
    const account = this.accounts.find((v) => v.id === input.accountId);
    const value = {
      id: randomUUID(),
      ...context,
      accountId: input.accountId,
      accountName: account?.name,
      contactIds: input.contactIds ?? [],
      ownerId: input.ownerId,
      ownerName: "Léa Bertin",
      teamId: input.teamId,
      teamName: "Ventes France",
      pipelineId: input.pipelineId,
      pipelineName: selectedPipeline.name,
      stageId: input.stageId,
      stageName: stage.name,
      name: input.name,
      description: input.description,
      amount: input.amount,
      probability: input.probability ?? stage.defaultProbability,
      forecastCategory: input.forecastCategory ?? "pipeline",
      expectedCloseDate: input.expectedCloseDate,
      nextStep: input.nextStep,
      source: input.source ?? "manual",
      sourceDetail: input.sourceDetail,
      status: "open",
      recurringValue: input.recurringValue,
      renewalDate: input.renewalDate,
      onboardingStatus: input.onboardingStatus,
      customValues: input.customValues ?? {},
      version: 1,
      createdAt: now,
      updatedAt: now,
      tags: normalizedTags(input.tags),
    } as CrmOpportunity;
    this.opportunities.unshift(value);
    return structuredClone(value);
  }
  async updateOpportunity(
    _tenantId: string,
    id: string,
    input: Record<string, unknown>,
    expectedVersion: number,
  ) {
    const value = this.opportunities.find((v) => v.id === id);
    if (!value || value.version !== expectedVersion)
      return Promise.reject(new Error("CRM_CONFLICT"));
    Object.assign(value, input, {
      ...(Array.isArray(input.tags)
        ? { tags: normalizedTags(input.tags as string[]) }
        : {}),
      version: value.version + 1,
      updatedAt: new Date().toISOString(),
    });
    return structuredClone(value);
  }
  async listTasks(_tenantId: string, options?: CrmListOptions) {
    return page(this.tasks, options);
  }
  async createTask(context: CrmTenantContext, input: CrmTaskInput) {
    const now = new Date().toISOString();
    const value = {
      id: randomUUID(),
      ...context,
      ownerId: input.ownerId,
      ownerName: "Léa Bertin",
      teamId: input.teamId,
      accountId: input.accountId,
      contactId: input.contactId,
      opportunityId: input.opportunityId,
      type: input.type,
      title: input.title,
      description: input.description,
      priority: input.priority ?? "medium",
      status: "pending",
      startAt: input.startAt,
      dueAt: input.dueAt,
      recurrence: input.recurrence,
      version: 1,
      createdAt: now,
      updatedAt: now,
    } as CrmTask;
    this.tasks.unshift(value);
    return structuredClone(value);
  }
  async completeTask(
    _tenantId: string,
    id: string,
    _actorId: string,
    result: string | undefined,
    expectedVersion: number,
  ) {
    const value = this.tasks.find((v) => v.id === id);
    if (!value || value.version !== expectedVersion)
      return Promise.reject(new Error("CRM_CONFLICT"));
    Object.assign(value, {
      status: "completed",
      completionResult: result,
      completedAt: new Date().toISOString(),
      version: value.version + 1,
      updatedAt: new Date().toISOString(),
    });
    return structuredClone(value);
  }
  async listActivities(
    _tenantId: string,
    entityType: string,
    entityId: string,
    limit = 100,
  ) {
    return structuredClone(
      this.activities
        .filter((v) => v.entityType === entityType && v.entityId === entityId)
        .slice(0, limit),
    );
  }
  async addActivity(
    context: CrmTenantContext,
    activity: Omit<
      CrmActivity,
      "id" | "tenantId" | "workspaceId" | "createdAt"
    >,
  ) {
    const value = {
      id: randomUUID(),
      ...context,
      ...activity,
      createdAt: new Date().toISOString(),
    };
    this.activities.unshift(value);
    return structuredClone(value);
  }
  async listProducts(_tenantId: string, options?: CrmListOptions) {
    return page(this.products, options);
  }
  async createProduct(context: CrmTenantContext, input: CrmProductInput) {
    const now = new Date().toISOString();
    const id = randomUUID();
    const value: CrmProduct = {
      id,
      tenantId: context.tenantId,
      workspaceId: context.workspaceId,
      sku: input.sku,
      name: input.name,
      description: input.description,
      productType: input.productType,
      isActive: input.isActive ?? true,
      metadata: input.metadata ?? {},
      prices: input.price
        ? [
            {
              id: randomUUID(),
              priceBookId: "72000000-0000-4000-8000-000000000010",
              productId: id,
              marketCode: input.price.marketCode,
              amount: input.price.amount,
              billingInterval: input.price.billingInterval,
            },
          ]
        : [],
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    this.products.unshift(value);
    return structuredClone(value);
  }
  async updateProduct(
    _tenantId: string,
    id: string,
    input: Partial<CrmProductInput>,
    expectedVersion: number,
  ) {
    const value = this.products.find((v) => v.id === id);
    if (!value || value.version !== expectedVersion)
      throw new Error("CRM_CONFLICT");
    Object.assign(value, input, {
      version: value.version + 1,
      updatedAt: new Date().toISOString(),
    });
    return structuredClone(value);
  }
  async listQuotes(
    _tenantId: string,
    options: CrmListOptions & { opportunityId?: string } = {},
  ) {
    return page(
      options.opportunityId
        ? this.quotes.filter((v) => v.opportunityId === options.opportunityId)
        : this.quotes,
      options,
    );
  }
  async createQuote(context: CrmTenantContext, input: CrmQuoteInput) {
    const now = new Date().toISOString();
    const account = this.accounts.find((v) => v.id === input.accountId);
    const items = input.items.map((item, position) => ({
      ...item,
      id: randomUUID(),
      totalMinor: Math.max(
        0,
        Math.round(item.quantity * item.unitAmountMinor) -
          item.discountMinor +
          item.taxMinor,
      ),
      position,
    }));
    const subtotalMinor = input.items.reduce(
      (sum, item) => sum + Math.round(item.quantity * item.unitAmountMinor),
      0,
    );
    const discountMinor = input.items.reduce(
      (sum, item) => sum + item.discountMinor,
      0,
    );
    const taxMinor = input.items.reduce((sum, item) => sum + item.taxMinor, 0);
    const value: CrmQuote = {
      id: randomUUID(),
      tenantId: context.tenantId,
      accountId: input.accountId,
      accountName: account?.name,
      opportunityId: input.opportunityId,
      quoteNumber: `DEV-${new Date().getUTCFullYear()}-${String(this.quotes.length + 1).padStart(5, "0")}`,
      subtotalMinor,
      discountMinor,
      taxMinor,
      totalMinor: Math.max(0, subtotalMinor - discountMinor + taxMinor),
      currency: input.currency,
      status: "draft",
      validUntil: input.validUntil,
      notes: input.notes,
      items,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    this.quotes.unshift(value);
    return structuredClone(value);
  }
  async listCustomFields(_tenantId: string, entityType?: string) {
    return structuredClone(
      entityType
        ? this.customFields.filter((v) => v.entityType === entityType)
        : this.customFields,
    );
  }
  async createCustomField(
    context: CrmTenantContext,
    input: CrmCustomFieldInput,
  ) {
    const now = new Date().toISOString();
    if (
      this.customFields.some(
        (v) => v.entityType === input.entityType && v.key === input.key,
      )
    )
      throw new Error("CRM_CUSTOM_FIELD_DUPLICATE");
    const value: CrmCustomField = {
      id: randomUUID(),
      tenantId: context.tenantId,
      workspaceId: context.workspaceId,
      entityType: input.entityType,
      name: input.name,
      key: input.key,
      description: input.description,
      fieldType: input.fieldType,
      required: input.required ?? false,
      validation: input.validation ?? {},
      options: input.options ?? [],
      position: input.position ?? this.customFields.length,
      status: "active",
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    this.customFields.push(value);
    return structuredClone(value);
  }
  async listSavedViews(
    _tenantId: string,
    _workspaceId: string,
    userId: string,
    entityType?: string,
  ) {
    return structuredClone(
      this.savedViews.filter(
        (view) =>
          (!entityType || view.entityType === entityType) &&
          (view.visibility !== "personal" || view.ownerId === userId),
      ),
    );
  }
  async getSavedView(_tenantId: string, id: string) {
    return structuredClone(
      this.savedViews.find((view) => view.id === id) ?? null,
    );
  }
  async createSavedView(
    context: CrmTenantContext,
    actorId: string,
    input: CrmSavedViewInput,
  ) {
    const now = new Date().toISOString();
    const value: CrmSavedView = {
      id: randomUUID(),
      tenantId: context.tenantId,
      workspaceId: context.workspaceId,
      ownerId: actorId,
      ...input,
      filterDefinition: input.filterDefinition ?? {},
      sortDefinition: input.sortDefinition ?? [],
      visibleColumns: input.visibleColumns ?? [],
      columnOrder: input.columnOrder ?? [],
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    this.savedViews.unshift(value);
    return structuredClone(value);
  }
  async updateSavedView(
    _tenantId: string,
    id: string,
    _actorId: string,
    input: CrmSavedViewInput,
    expectedVersion: number,
  ) {
    const value = this.savedViews.find((view) => view.id === id);
    if (!value || value.version !== expectedVersion)
      throw new Error("CRM_CONFLICT");
    Object.assign(value, input, {
      version: value.version + 1,
      updatedAt: new Date().toISOString(),
    });
    return structuredClone(value);
  }
  async deleteSavedView(
    _tenantId: string,
    id: string,
    expectedVersion: number,
  ) {
    const index = this.savedViews.findIndex((view) => view.id === id);
    if (index < 0 || this.savedViews[index].version !== expectedVersion)
      throw new Error("CRM_CONFLICT");
    this.savedViews.splice(index, 1);
    return true;
  }
  async addAudit() {}
}

function mapAccount(row: any, tags: string[] = []): CrmAccount {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    workspaceId: row.workspace_id,
    ownerId: row.owner_id ?? undefined,
    name: row.name,
    legalName: row.legal_name ?? undefined,
    website: row.website ?? undefined,
    domain: row.domain ?? undefined,
    industry: row.industry ?? undefined,
    description: row.description ?? undefined,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    country: row.country,
    region: row.region ?? undefined,
    city: row.city ?? undefined,
    postalCode: row.postal_code ?? undefined,
    address: row.address ?? undefined,
    marketCode: row.market_code,
    lifecycle: row.lifecycle,
    fitScore: row.fit_score ?? undefined,
    source: row.source,
    sourceDetail: row.source_detail ?? undefined,
    tags,
    customValues: row.custom_values ?? {},
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at ?? undefined,
  };
}
function mapContact(
  row: any,
  accountIds: string[] = [],
  tags: string[] = [],
): CrmContact {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    workspaceId: row.workspace_id,
    ownerId: row.owner_id ?? undefined,
    accountIds,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: row.full_name,
    jobTitle: row.job_title ?? undefined,
    department: row.department ?? undefined,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    language: row.language ?? undefined,
    timezone: row.timezone ?? undefined,
    country: row.country,
    preferredContactMethod: row.preferred_contact_method ?? undefined,
    lifecycle: row.lifecycle,
    leadStatus: row.lead_status ?? undefined,
    source: row.source,
    sourceDetail: row.source_detail ?? undefined,
    doNotContact: Boolean(row.do_not_contact),
    tags,
    customValues: row.custom_values ?? {},
    lastContactedAt: row.last_contacted_at ?? undefined,
    nextContactAt: row.next_contact_at ?? undefined,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at ?? undefined,
  };
}
function mapTask(row: any): CrmTask {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    workspaceId: row.workspace_id,
    ownerId: row.owner_id ?? undefined,
    ownerName: row.owner?.name ?? undefined,
    teamId: row.team_id ?? undefined,
    accountId: row.account_id ?? undefined,
    contactId: row.contact_id ?? undefined,
    opportunityId: row.opportunity_id ?? undefined,
    type: row.type,
    title: row.title,
    description: row.description ?? undefined,
    priority: row.priority,
    status: row.status,
    startAt: row.start_at ?? undefined,
    dueAt: row.due_at,
    completedAt: row.completed_at ?? undefined,
    completionResult: row.completion_result ?? undefined,
    recurrence: row.recurrence ?? undefined,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
function mapOpportunity(
  row: any,
  contactIds: string[] = [],
  tags: string[] = [],
): CrmOpportunity {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    workspaceId: row.workspace_id,
    accountId: row.account_id ?? undefined,
    accountName: row.account?.name ?? undefined,
    contactIds,
    ownerId: row.owner_id ?? undefined,
    ownerName: row.owner?.name ?? undefined,
    teamId: row.team_id ?? undefined,
    teamName: row.team?.name ?? undefined,
    pipelineId: row.pipeline_id,
    pipelineName: row.pipeline?.name ?? "",
    stageId: row.stage_id,
    stageName: row.stage?.name ?? "",
    name: row.name,
    description: row.description ?? undefined,
    amount: { amountMinor: Number(row.amount_minor), currency: row.currency },
    probability: row.probability,
    forecastCategory: row.forecast_category,
    expectedCloseDate: row.expected_close_date ?? undefined,
    nextStep: row.next_step ?? undefined,
    source: row.source,
    sourceDetail: row.source_detail ?? undefined,
    status: row.status,
    lossReason: row.loss_reason ?? undefined,
    lossDetail: row.loss_detail ?? undefined,
    competitor: row.competitor ?? undefined,
    futureRecontactDate: row.future_recontact_date ?? undefined,
    recurringValue:
      row.recurring_value_minor == null
        ? undefined
        : {
            amountMinor: Number(row.recurring_value_minor),
            currency: row.currency,
          },
    renewalDate: row.renewal_date ?? undefined,
    onboardingStatus: row.onboarding_status ?? undefined,
    tags,
    customValues: row.custom_values ?? {},
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    wonAt: row.won_at ?? undefined,
    lostAt: row.lost_at ?? undefined,
    archivedAt: row.archived_at ?? undefined,
  };
}
function mapActivity(row: any): CrmActivity {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    workspaceId: row.workspace_id,
    actorUserId: row.actor_user_id ?? undefined,
    actorName: row.actor?.name ?? "Système",
    entityType: row.entity_type,
    entityId: row.entity_id,
    activityType: row.activity_type,
    title: row.title,
    description: row.description ?? undefined,
    occurredAt: row.occurred_at,
    providerConnectionId: row.provider_connection_id ?? undefined,
    externalMessageId: row.external_message_id ?? undefined,
    externalThreadId: row.external_thread_id ?? undefined,
    isAiGenerated: Boolean(row.is_ai_generated),
    createdAt: row.created_at,
  };
}
function mapProduct(row: any, prices: any[] = []): CrmProduct {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    workspaceId: row.workspace_id ?? undefined,
    sku: row.sku,
    name: row.name,
    description: row.description ?? undefined,
    productType: row.product_type,
    isActive: Boolean(row.is_active),
    metadata: row.metadata ?? {},
    prices: prices.map((price) => ({
      id: price.id,
      priceBookId: price.price_book_id,
      productId: price.product_id,
      marketCode: price.price_book?.market_code ?? undefined,
      amount: {
        amountMinor: Number(price.amount_minor),
        currency: price.currency,
      },
      billingInterval: price.billing_interval ?? undefined,
      startsAt: price.starts_at ?? undefined,
      endsAt: price.ends_at ?? undefined,
    })),
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
function mapQuote(row: any, items: any[] = []): CrmQuote {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    accountId: row.account_id,
    accountName: row.account?.name ?? undefined,
    opportunityId: row.opportunity_id ?? undefined,
    quoteNumber: row.quote_number,
    subtotalMinor: Number(row.subtotal_minor),
    discountMinor: Number(row.discount_minor),
    taxMinor: Number(row.tax_minor),
    totalMinor: Number(row.total_minor),
    currency: row.currency,
    status: row.status,
    validUntil: row.valid_until ?? undefined,
    notes: row.notes ?? undefined,
    items: items.map((item) => ({
      id: item.id,
      productId: item.product_id ?? undefined,
      description: item.description,
      quantity: Number(item.quantity),
      unitAmountMinor: Number(item.unit_amount_minor),
      discountMinor: Number(item.discount_minor),
      taxMinor: Number(item.tax_minor),
      totalMinor: Number(item.total_minor),
      position: item.position,
    })),
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sentAt: row.sent_at ?? undefined,
    acceptedAt: row.accepted_at ?? undefined,
    rejectedAt: row.rejected_at ?? undefined,
  };
}
function mapCustomField(row: any): CrmCustomField {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    workspaceId: row.workspace_id ?? undefined,
    entityType: row.entity_type,
    name: row.name,
    key: row.key,
    description: row.description ?? undefined,
    fieldType: row.field_type,
    required: Boolean(row.required),
    validation: row.validation ?? {},
    options: row.options ?? [],
    position: row.position,
    status: row.status,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
function mapSavedView(row: any): CrmSavedView {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    workspaceId: row.workspace_id,
    ownerId: row.owner_id ?? undefined,
    entityType: row.entity_type,
    name: row.name,
    visibility: row.visibility,
    teamId: row.team_id ?? undefined,
    filterDefinition: row.filter_definition ?? {},
    sortDefinition: row.sort_definition ?? [],
    visibleColumns: row.visible_columns ?? [],
    columnOrder: row.column_order ?? [],
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PostgresCrmRepository implements ICrmRepository {
  private get client(): any {
    return getSupabaseAdminClient() as any;
  }
  private async query<T>(
    operation: string,
    request: PromiseLike<{ data: T; error: unknown }>,
  ): Promise<T> {
    try {
      const { data, error } = await request;
      if (error) databaseFailure(operation, error);
      return data;
    } catch (error) {
      databaseFailure(operation, error);
    }
  }
  async resolveTenantId(userId: string) {
    const data: any[] = await this.query(
      "crm.resolveTenant",
      this.client
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at")
        .limit(1),
    );
    return data[0]?.organization_id ?? null;
  }
  async getTenantContext(tenantId: string) {
    const data: any[] = await this.query(
      "crm.getContext",
      this.client
        .from("crm_workspaces")
        .select("id,tenant_id,market_code,default_currency")
        .eq("tenant_id", tenantId)
        .eq("is_default", true)
        .eq("is_active", true)
        .limit(1),
    );
    const row = data[0];
    return row
      ? {
          tenantId: row.tenant_id,
          workspaceId: row.id,
          marketCode: row.market_code,
          currency: row.default_currency,
        }
      : null;
  }
  async provisionTenant(tenantId: string, actorId: string) {
    const existing = await this.getTenantContext(tenantId);
    if (existing) return existing;
    const org: any = await this.query(
      "crm.getTenantCountry",
      this.client
        .from("organizations")
        .select("country")
        .eq("id", tenantId)
        .single(),
    );
    const marketCode = requireMarketCode(org.country);
    const market: any = await this.query(
      "crm.getTenantMarket",
      this.client
        .from("markets")
        .select("currency")
        .eq("code", marketCode)
        .single(),
    );
    const workspace: any = await this.query(
      "crm.provisionWorkspace",
      this.client
        .from("crm_workspaces")
        .insert({
          tenant_id: tenantId,
          name: "CRM",
          market_code: marketCode,
          default_currency: market.currency,
          is_default: true,
        })
        .select("*")
        .single(),
    );
    const pipeline: any = await this.query(
      "crm.provisionPipeline",
      this.client
        .from("crm_pipelines")
        .insert({
          tenant_id: tenantId,
          workspace_id: workspace.id,
          name: "Ventes",
          is_default: true,
        })
        .select("*")
        .single(),
    );
    const stageRows = STAGES.map((stage) => ({
      tenant_id: tenantId,
      pipeline_id: pipeline.id,
      name: stage[1],
      position: stage[2],
      default_probability: stage[3],
      color_token: stage[4],
      is_open: stage[5],
      is_won: stage[6],
      is_lost: stage[7],
    }));
    await this.query(
      "crm.provisionStages",
      this.client.from("crm_pipeline_stages").insert(stageRows).select("id"),
    );
    await this.addAudit(
      tenantId,
      actorId,
      "crm.tenant.provisioned",
      "workspace",
      workspace.id,
      ["workspace", "pipeline", "stages"],
      randomUUID(),
    );
    return {
      tenantId,
      workspaceId: workspace.id,
      marketCode,
      currency: market.currency,
    };
  }
  private options(query: any, options: CrmListOptions = {}) {
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
    let next = query.order("updated_at", { ascending: false }).limit(limit + 1);
    if (options.cursor) next = next.lt("updated_at", options.cursor);
    return { query: next, limit };
  }
  private async loadEntityTags(
    tenantId: string,
    entityType: "account" | "contact" | "opportunity",
    entityIds: string[],
  ) {
    const tagsByEntity = new Map<string, string[]>();
    if (!entityIds.length) return tagsByEntity;
    const rows: any[] = await this.query(
      `crm.load${entityType}Tags`,
      this.client
        .from("crm_entity_tags")
        .select("entity_id,tag:tag_id(name)")
        .eq("tenant_id", tenantId)
        .eq("entity_type", entityType)
        .in("entity_id", entityIds),
    );
    for (const row of rows) {
      const relation = Array.isArray(row.tag) ? row.tag[0] : row.tag;
      if (!relation?.name) continue;
      tagsByEntity.set(row.entity_id, [
        ...(tagsByEntity.get(row.entity_id) ?? []),
        relation.name,
      ]);
    }
    for (const tags of tagsByEntity.values()) {
      tags.sort((left, right) => left.localeCompare(right, "fr"));
    }
    return tagsByEntity;
  }
  private async replaceEntityTags(
    tenantId: string,
    entityType: "account" | "contact" | "opportunity",
    entityId: string,
    tagNames: string[],
  ) {
    const rows: any[] = await this.query(
      `crm.replace${entityType}Tags`,
      this.client.rpc("replace_crm_entity_tags", {
        p_tenant_id: tenantId,
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_tag_names: tagNames,
      }),
    );
    return rows.map((row) => row.name as string);
  }
  async listAccounts(tenantId: string, options: CrmListOptions = {}) {
    let query = this.client
      .from("crm_accounts")
      .select("*")
      .eq("tenant_id", tenantId)
      .is("archived_at", null);
    if (options.query)
      query = query.or(
        `name.ilike.%${options.query}%,domain.ilike.%${options.query}%`,
      );
    const configured = this.options(query, options);
    const rows: any[] = await this.query("crm.listAccounts", configured.query);
    const selected = rows.slice(0, configured.limit);
    const tags = await this.loadEntityTags(
      tenantId,
      "account",
      selected.map((row) => row.id),
    );
    const items = selected.map((row) =>
      mapAccount(row, tags.get(row.id) ?? []),
    );
    return {
      items,
      nextCursor:
        rows.length > configured.limit ? items.at(-1)?.updatedAt : undefined,
    };
  }
  async getAccount(tenantId: string, id: string) {
    const row: any = await this.query(
      "crm.getAccount",
      this.client
        .from("crm_accounts")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .maybeSingle(),
    );
    if (!row) return null;
    const tags = await this.loadEntityTags(tenantId, "account", [row.id]);
    return mapAccount(row, tags.get(row.id) ?? []);
  }
  async createAccount(context: CrmTenantContext, input: CrmAccountInput) {
    const row: any = await this.query(
      "crm.createAccount",
      this.client
        .from("crm_accounts")
        .insert({
          tenant_id: context.tenantId,
          workspace_id: context.workspaceId,
          name: input.name,
          legal_name: input.legalName,
          website: input.website,
          domain: input.domain,
          industry: input.industry,
          description: input.description,
          email: input.email,
          phone: input.phone,
          country: input.country ?? context.marketCode,
          region: input.region,
          city: input.city,
          postal_code: input.postalCode,
          address: input.address,
          market_code: input.marketCode ?? context.marketCode,
          lifecycle: input.lifecycle ?? "prospect",
          fit_score: input.fitScore,
          source: input.source ?? "manual",
          source_detail: input.sourceDetail,
          custom_values: input.customValues ?? {},
        })
        .select("*")
        .single(),
    );
    const tags = input.tags
      ? await this.replaceEntityTags(
          context.tenantId,
          "account",
          row.id,
          input.tags,
        )
      : [];
    return mapAccount(row, tags);
  }
  async updateAccount(
    tenantId: string,
    id: string,
    input: Partial<CrmAccountInput>,
    expectedVersion: number,
  ) {
    const update: any = {
      name: input.name,
      legal_name: input.legalName,
      website: input.website,
      domain: input.domain,
      industry: input.industry,
      description: input.description,
      email: input.email,
      phone: input.phone,
      country: input.country,
      region: input.region,
      city: input.city,
      postal_code: input.postalCode,
      address: input.address,
      market_code: input.marketCode,
      lifecycle: input.lifecycle,
      fit_score: input.fitScore,
      source: input.source,
      source_detail: input.sourceDetail,
      custom_values: input.customValues,
    };
    Object.keys(update).forEach(
      (key) => update[key] === undefined && delete update[key],
    );
    const row: any = await this.query(
      "crm.updateAccount",
      this.client
        .from("crm_accounts")
        .update(update)
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .eq("version", expectedVersion)
        .select("*")
        .maybeSingle(),
    );
    if (!row) throw new Error("CRM_CONFLICT");
    const tags = input.tags
      ? await this.replaceEntityTags(tenantId, "account", row.id, input.tags)
      : ((await this.loadEntityTags(tenantId, "account", [row.id])).get(
          row.id,
        ) ?? []);
    return mapAccount(row, tags);
  }
  async findAccountDuplicates(
    tenantId: string,
    input: CrmAccountDuplicateCheck,
  ) {
    const select = "id,name,domain,email,phone,address";
    const queries: Promise<any[]>[] = [];
    const exactLike = (value: string) =>
      value.replace(/[%_\\]/g, (match) => `\\${match}`);
    if (input.domain)
      queries.push(
        this.query(
          "crm.findAccountDuplicateByDomain",
          this.client
            .from("crm_accounts")
            .select(select)
            .eq("tenant_id", tenantId)
            .is("archived_at", null)
            .eq("domain", normalizedDomain(input.domain)),
        ),
      );
    if (input.name)
      queries.push(
        this.query(
          "crm.findAccountDuplicateByName",
          this.client
            .from("crm_accounts")
            .select(select)
            .eq("tenant_id", tenantId)
            .is("archived_at", null)
            .ilike("name", exactLike(input.name.trim())),
        ),
      );
    if (input.email)
      queries.push(
        this.query(
          "crm.findAccountDuplicateByEmail",
          this.client
            .from("crm_accounts")
            .select(select)
            .eq("tenant_id", tenantId)
            .is("archived_at", null)
            .ilike("email", exactLike(input.email.trim())),
        ),
      );
    if (input.phone)
      queries.push(
        this.query(
          "crm.findAccountDuplicateByPhone",
          this.client
            .from("crm_accounts")
            .select(select)
            .eq("tenant_id", tenantId)
            .is("archived_at", null)
            .eq("phone", input.phone.trim()),
        ),
      );
    if (input.address)
      queries.push(
        this.query(
          "crm.findAccountDuplicateByAddress",
          this.client
            .from("crm_accounts")
            .select(select)
            .eq("tenant_id", tenantId)
            .is("archived_at", null)
            .ilike("address", exactLike(input.address.trim())),
        ),
      );
    const rows = (await Promise.all(queries)).flat();
    const unique = [...new Map(rows.map((row) => [row.id, row])).values()];
    return accountDuplicateMatches(
      unique.map((row) => ({
        id: row.id,
        name: row.name,
        domain: row.domain ?? undefined,
        email: row.email ?? undefined,
        phone: row.phone ?? undefined,
        address: row.address ?? undefined,
      })),
      input,
    );
  }
  async listContacts(tenantId: string, options: CrmListOptions = {}) {
    let query = this.client
      .from("crm_contacts")
      .select("*")
      .eq("tenant_id", tenantId)
      .is("archived_at", null);
    if (options.query)
      query = query.or(
        `full_name.ilike.%${options.query}%,email.ilike.%${options.query}%`,
      );
    const configured = this.options(query, options);
    const rows: any[] = await this.query("crm.listContacts", configured.query);
    const selected = rows.slice(0, configured.limit);
    const ids = selected.map((row) => row.id);
    const links: any[] = ids.length
      ? await this.query(
          "crm.contactAccounts",
          this.client
            .from("crm_contact_accounts")
            .select("contact_id,account_id")
            .eq("tenant_id", tenantId)
            .in("contact_id", ids),
        )
      : [];
    const tags = await this.loadEntityTags(tenantId, "contact", ids);
    const byContact = new Map<string, string[]>();
    for (const link of links)
      byContact.set(link.contact_id, [
        ...(byContact.get(link.contact_id) ?? []),
        link.account_id,
      ]);
    const items = selected.map((row) =>
      mapContact(row, byContact.get(row.id) ?? [], tags.get(row.id) ?? []),
    );
    return {
      items,
      nextCursor:
        rows.length > configured.limit ? items.at(-1)?.updatedAt : undefined,
    };
  }
  async getContact(tenantId: string, id: string) {
    const [row, links] = await Promise.all([
      this.query<any>(
        "crm.getContact",
        this.client
          .from("crm_contacts")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("id", id)
          .maybeSingle(),
      ),
      this.query<any[]>(
        "crm.getContactAccounts",
        this.client
          .from("crm_contact_accounts")
          .select("account_id")
          .eq("tenant_id", tenantId)
          .eq("contact_id", id),
      ),
    ]);
    if (!row) return null;
    const tags = await this.loadEntityTags(tenantId, "contact", [row.id]);
    return mapContact(
      row,
      links.map((link) => link.account_id),
      tags.get(row.id) ?? [],
    );
  }
  async createContact(context: CrmTenantContext, input: CrmContactInput) {
    const row: any = await this.query(
      "crm.createContact",
      this.client
        .from("crm_contacts")
        .insert({
          tenant_id: context.tenantId,
          workspace_id: context.workspaceId,
          owner_id: input.ownerId,
          first_name: input.firstName,
          last_name: input.lastName,
          job_title: input.jobTitle,
          department: input.department,
          email: input.email,
          phone: input.phone,
          language: input.language,
          timezone: input.timezone,
          country: input.country ?? context.marketCode,
          preferred_contact_method: input.preferredContactMethod,
          lifecycle: input.lifecycle ?? "prospect",
          lead_status: input.leadStatus,
          source: input.source ?? "manual",
          source_detail: input.sourceDetail,
          do_not_contact: input.doNotContact ?? false,
          custom_values: input.customValues ?? {},
          last_contacted_at: input.lastContactedAt,
          next_contact_at: input.nextContactAt,
        })
        .select("*")
        .single(),
    );
    if (input.accountIds?.length)
      await this.query(
        "crm.linkContactAccounts",
        this.client.from("crm_contact_accounts").insert(
          input.accountIds.map((accountId) => ({
            tenant_id: context.tenantId,
            contact_id: row.id,
            account_id: accountId,
          })),
        ),
      );
    const tags = input.tags
      ? await this.replaceEntityTags(
          context.tenantId,
          "contact",
          row.id,
          input.tags,
        )
      : [];
    return mapContact(row, input.accountIds ?? [], tags);
  }
  async updateContact(
    tenantId: string,
    id: string,
    input: Partial<CrmContactInput>,
    expectedVersion: number,
  ) {
    const update: any = {
      owner_id: input.ownerId,
      first_name: input.firstName,
      last_name: input.lastName,
      job_title: input.jobTitle,
      department: input.department,
      email: input.email,
      phone: input.phone,
      language: input.language,
      timezone: input.timezone,
      country: input.country,
      preferred_contact_method: input.preferredContactMethod,
      lifecycle: input.lifecycle,
      lead_status: input.leadStatus,
      source: input.source,
      source_detail: input.sourceDetail,
      do_not_contact: input.doNotContact,
      custom_values: input.customValues,
      last_contacted_at: input.lastContactedAt,
      next_contact_at: input.nextContactAt,
    };
    Object.keys(update).forEach(
      (key) => update[key] === undefined && delete update[key],
    );
    const row: any = await this.query(
      "crm.updateContact",
      this.client
        .from("crm_contacts")
        .update(update)
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .eq("version", expectedVersion)
        .select("*")
        .maybeSingle(),
    );
    if (!row) throw new Error("CRM_CONFLICT");
    const [links, tags] = await Promise.all([
      input.accountIds
        ? Promise.resolve(input.accountIds)
        : this.query<any[]>(
            "crm.getUpdatedContactAccounts",
            this.client
              .from("crm_contact_accounts")
              .select("account_id")
              .eq("tenant_id", tenantId)
              .eq("contact_id", row.id),
          ).then((items) => items.map((item) => item.account_id as string)),
      input.tags
        ? this.replaceEntityTags(tenantId, "contact", row.id, input.tags)
        : this.loadEntityTags(tenantId, "contact", [row.id]).then(
            (items) => items.get(row.id) ?? [],
          ),
    ]);
    return mapContact(row, links, tags);
  }
  async listPipelines(tenantId: string) {
    const [pipelines, stages] = await Promise.all([
      this.query<any[]>(
        "crm.listPipelines",
        this.client
          .from("crm_pipelines")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("is_active", true)
          .order("created_at"),
      ),
      this.query<any[]>(
        "crm.listStages",
        this.client
          .from("crm_pipeline_stages")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("position"),
      ),
    ]);
    return pipelines.map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      workspaceId: row.workspace_id,
      name: row.name,
      description: row.description ?? undefined,
      isDefault: Boolean(row.is_default),
      isActive: Boolean(row.is_active),
      stages: stages
        .filter((stage) => stage.pipeline_id === row.id)
        .map((stage) => ({
          id: stage.id,
          pipelineId: stage.pipeline_id,
          name: stage.name,
          position: stage.position,
          defaultProbability: stage.default_probability,
          colorToken: stage.color_token,
          isOpen: stage.is_open,
          isWon: stage.is_won,
          isLost: stage.is_lost,
          requiredFields: stage.required_fields ?? [],
          slaHours: stage.sla_hours ?? undefined,
          version: stage.version,
        })),
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }
  private async savePipeline(
    tenantId: string,
    workspaceId: string,
    pipelineId: string | undefined,
    input: CrmPipelineInput,
    expectedVersion?: number,
  ) {
    const { data, error } = await this.client.rpc("save_crm_pipeline", {
      p_tenant_id: tenantId,
      p_workspace_id: workspaceId,
      p_pipeline_id: pipelineId ?? null,
      p_expected_version: expectedVersion ?? null,
      p_payload: input,
    });
    if (error) {
      const message = String(error.message ?? error);
      if (
        [
          "CRM_CONFLICT",
          "CRM_STAGE_IN_USE",
          "CRM_PIPELINE_NOT_FOUND",
          "CRM_STAGE_NOT_FOUND",
        ].some((code) => message.includes(code))
      )
        throw new Error(message.match(/CRM_[A-Z_]+/)?.[0] ?? "CRM_CONFLICT");
      databaseFailure("crm.savePipeline", error);
    }
    const saved = (await this.listPipelines(tenantId)).find(
      (value) => value.id === data,
    );
    if (!saved) databaseFailure("crm.savePipeline.readback");
    return saved;
  }
  async createPipeline(context: CrmTenantContext, input: CrmPipelineInput) {
    return this.savePipeline(
      context.tenantId,
      context.workspaceId,
      undefined,
      input,
    );
  }
  async updatePipeline(
    tenantId: string,
    workspaceId: string,
    id: string,
    input: CrmPipelineInput,
    expectedVersion: number,
  ) {
    return this.savePipeline(tenantId, workspaceId, id, input, expectedVersion);
  }
  async getStage(tenantId: string, stageId: string) {
    const row: any = await this.query(
      "crm.getStage",
      this.client
        .from("crm_pipeline_stages")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("id", stageId)
        .maybeSingle(),
    );
    return row
      ? {
          id: row.id,
          pipelineId: row.pipeline_id,
          name: row.name,
          probability: row.default_probability,
          isOpen: row.is_open,
          isWon: row.is_won,
          isLost: row.is_lost,
        }
      : null;
  }
  async listOpportunities(tenantId: string, options: CrmListOptions = {}) {
    let query = this.client
      .from("crm_opportunities")
      .select(
        "*,account:account_id(name),owner:owner_id(name),team:team_id(name),pipeline:pipeline_id(name),stage:stage_id(name)",
      )
      .eq("tenant_id", tenantId)
      .is("archived_at", null);
    if (options.query) query = query.ilike("name", `%${options.query}%`);
    const configured = this.options(query, options);
    const rows: any[] = await this.query(
      "crm.listOpportunities",
      configured.query,
    );
    const selected = rows.slice(0, configured.limit);
    const ids = selected.map((row) => row.id);
    const links: any[] = ids.length
      ? await this.query(
          "crm.opportunityContacts",
          this.client
            .from("crm_contact_opportunities")
            .select("opportunity_id,contact_id")
            .eq("tenant_id", tenantId)
            .in("opportunity_id", ids),
        )
      : [];
    const tags = await this.loadEntityTags(tenantId, "opportunity", ids);
    const byOpportunity = new Map<string, string[]>();
    for (const link of links)
      byOpportunity.set(link.opportunity_id, [
        ...(byOpportunity.get(link.opportunity_id) ?? []),
        link.contact_id,
      ]);
    const items = selected.map((row) =>
      mapOpportunity(
        row,
        byOpportunity.get(row.id) ?? [],
        tags.get(row.id) ?? [],
      ),
    );
    return {
      items,
      nextCursor:
        rows.length > configured.limit ? items.at(-1)?.updatedAt : undefined,
    };
  }
  async getOpportunity(tenantId: string, id: string) {
    const [row, links] = await Promise.all([
      this.query<any>(
        "crm.getOpportunity",
        this.client
          .from("crm_opportunities")
          .select(
            "*,account:account_id(name),owner:owner_id(name),team:team_id(name),pipeline:pipeline_id(name),stage:stage_id(name)",
          )
          .eq("tenant_id", tenantId)
          .eq("id", id)
          .maybeSingle(),
      ),
      this.query<any[]>(
        "crm.getOpportunityContacts",
        this.client
          .from("crm_contact_opportunities")
          .select("contact_id")
          .eq("tenant_id", tenantId)
          .eq("opportunity_id", id),
      ),
    ]);
    if (!row) return null;
    const tags = await this.loadEntityTags(tenantId, "opportunity", [row.id]);
    return mapOpportunity(
      row,
      links.map((link) => link.contact_id),
      tags.get(row.id) ?? [],
    );
  }
  async createOpportunity(
    context: CrmTenantContext,
    input: CrmOpportunityInput,
  ) {
    const stage = await this.getStage(context.tenantId, input.stageId);
    const row: any = await this.query(
      "crm.createOpportunity",
      this.client
        .from("crm_opportunities")
        .insert({
          tenant_id: context.tenantId,
          workspace_id: context.workspaceId,
          account_id: input.accountId,
          owner_id: input.ownerId,
          team_id: input.teamId,
          pipeline_id: input.pipelineId,
          stage_id: input.stageId,
          name: input.name,
          description: input.description,
          amount_minor: input.amount.amountMinor,
          currency: input.amount.currency,
          probability: input.probability ?? stage?.probability ?? 0,
          forecast_category: input.forecastCategory ?? "pipeline",
          expected_close_date: input.expectedCloseDate,
          next_step: input.nextStep,
          source: input.source ?? "manual",
          source_detail: input.sourceDetail,
          recurring_value_minor: input.recurringValue?.amountMinor,
          renewal_date: input.renewalDate,
          onboarding_status: input.onboardingStatus,
          custom_values: input.customValues ?? {},
        })
        .select(
          "*,account:account_id(name),owner:owner_id(name),team:team_id(name),pipeline:pipeline_id(name),stage:stage_id(name)",
        )
        .single(),
    );
    if (input.contactIds?.length)
      await this.query(
        "crm.linkOpportunityContacts",
        this.client.from("crm_contact_opportunities").insert(
          input.contactIds.map((contactId) => ({
            tenant_id: context.tenantId,
            opportunity_id: row.id,
            contact_id: contactId,
          })),
        ),
      );
    const tags = input.tags
      ? await this.replaceEntityTags(
          context.tenantId,
          "opportunity",
          row.id,
          input.tags,
        )
      : [];
    return mapOpportunity(row, input.contactIds ?? [], tags);
  }
  async updateOpportunity(
    tenantId: string,
    id: string,
    input: Record<string, unknown>,
    expectedVersion: number,
  ) {
    const fields: Record<string, string> = {
      accountId: "account_id",
      ownerId: "owner_id",
      teamId: "team_id",
      pipelineId: "pipeline_id",
      stageId: "stage_id",
      amountMinor: "amount_minor",
      forecastCategory: "forecast_category",
      expectedCloseDate: "expected_close_date",
      nextStep: "next_step",
      sourceDetail: "source_detail",
      lossReason: "loss_reason",
      lossDetail: "loss_detail",
      futureRecontactDate: "future_recontact_date",
      recurringValueMinor: "recurring_value_minor",
      renewalDate: "renewal_date",
      onboardingStatus: "onboarding_status",
      customValues: "custom_values",
      wonAt: "won_at",
      lostAt: "lost_at",
      archivedAt: "archived_at",
    };
    const { tags: requestedTags, ...recordInput } = input;
    const update = Object.fromEntries(
      Object.entries(recordInput).map(([key, value]) => [
        fields[key] ?? key,
        value,
      ]),
    );
    const row: any = await this.query(
      "crm.updateOpportunity",
      this.client
        .from("crm_opportunities")
        .update(update)
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .eq("version", expectedVersion)
        .select(
          "*,account:account_id(name),owner:owner_id(name),team:team_id(name),pipeline:pipeline_id(name),stage:stage_id(name)",
        )
        .maybeSingle(),
    );
    if (!row) throw new Error("CRM_CONFLICT");
    const tags = Array.isArray(requestedTags)
      ? await this.replaceEntityTags(
          tenantId,
          "opportunity",
          row.id,
          requestedTags.filter((tag): tag is string => typeof tag === "string"),
        )
      : ((await this.loadEntityTags(tenantId, "opportunity", [row.id])).get(
          row.id,
        ) ?? []);
    return mapOpportunity(row, [], tags);
  }
  async listTasks(tenantId: string, options: CrmListOptions = {}) {
    let query = this.client
      .from("crm_tasks")
      .select("*,owner:owner_id(name)")
      .eq("tenant_id", tenantId);
    if (options.query) query = query.ilike("title", `%${options.query}%`);
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
    query = query.order("due_at").limit(limit + 1);
    if (options.cursor) query = query.gt("due_at", options.cursor);
    const rows: any[] = await this.query("crm.listTasks", query);
    const items = rows.slice(0, limit).map(mapTask);
    return {
      items,
      nextCursor: rows.length > limit ? items.at(-1)?.dueAt : undefined,
    };
  }
  async createTask(context: CrmTenantContext, input: CrmTaskInput) {
    const row: any = await this.query(
      "crm.createTask",
      this.client
        .from("crm_tasks")
        .insert({
          tenant_id: context.tenantId,
          workspace_id: context.workspaceId,
          owner_id: input.ownerId,
          team_id: input.teamId,
          account_id: input.accountId,
          contact_id: input.contactId,
          opportunity_id: input.opportunityId,
          type: input.type,
          title: input.title,
          description: input.description,
          priority: input.priority ?? "medium",
          start_at: input.startAt,
          due_at: input.dueAt,
          recurrence: input.recurrence,
        })
        .select("*,owner:owner_id(name)")
        .single(),
    );
    return mapTask(row);
  }
  async completeTask(
    tenantId: string,
    id: string,
    _actorId: string,
    result: string | undefined,
    expectedVersion: number,
  ) {
    const row: any = await this.query(
      "crm.completeTask",
      this.client
        .from("crm_tasks")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          completion_result: result,
        })
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .eq("version", expectedVersion)
        .select("*,owner:owner_id(name)")
        .maybeSingle(),
    );
    if (!row) throw new Error("CRM_CONFLICT");
    return mapTask(row);
  }
  async listActivities(
    tenantId: string,
    entityType: string,
    entityId: string,
    limit = 100,
  ) {
    const rows: any[] = await this.query(
      "crm.listActivities",
      this.client
        .from("crm_activities")
        .select("*,actor:actor_user_id(name)")
        .eq("tenant_id", tenantId)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("occurred_at", { ascending: false })
        .limit(Math.min(limit, 200)),
    );
    return rows.map(mapActivity);
  }
  async addActivity(
    context: CrmTenantContext,
    activity: Omit<
      CrmActivity,
      "id" | "tenantId" | "workspaceId" | "createdAt"
    >,
  ) {
    const row: any = await this.query(
      "crm.addActivity",
      this.client
        .from("crm_activities")
        .insert({
          tenant_id: context.tenantId,
          workspace_id: context.workspaceId,
          actor_user_id: activity.actorUserId,
          entity_type: activity.entityType,
          entity_id: activity.entityId,
          activity_type: activity.activityType,
          title: activity.title,
          description: activity.description,
          occurred_at: activity.occurredAt,
          provider_connection_id: activity.providerConnectionId,
          external_message_id: activity.externalMessageId,
          external_thread_id: activity.externalThreadId,
          is_ai_generated: activity.isAiGenerated,
        })
        .select("*,actor:actor_user_id(name)")
        .single(),
    );
    return mapActivity(row);
  }
  async listProducts(tenantId: string, options: CrmListOptions = {}) {
    let query = this.client
      .from("crm_products")
      .select("*")
      .eq("tenant_id", tenantId);
    if (options.query)
      query = query.or(
        `name.ilike.%${options.query}%,sku.ilike.%${options.query}%`,
      );
    const configured = this.options(query, options);
    const rows: any[] = await this.query("crm.listProducts", configured.query);
    const selected = rows.slice(0, configured.limit);
    const ids = selected.map((row) => row.id);
    const prices: any[] = ids.length
      ? await this.query(
          "crm.listProductPrices",
          this.client
            .from("crm_prices")
            .select("*,price_book:price_book_id(market_code)")
            .eq("tenant_id", tenantId)
            .in("product_id", ids),
        )
      : [];
    const items = selected.map((row) =>
      mapProduct(
        row,
        prices.filter((price) => price.product_id === row.id),
      ),
    );
    return {
      items,
      nextCursor:
        rows.length > configured.limit ? items.at(-1)?.updatedAt : undefined,
    };
  }
  async createProduct(context: CrmTenantContext, input: CrmProductInput) {
    const row: any = await this.query(
      "crm.createProduct",
      this.client
        .from("crm_products")
        .insert({
          tenant_id: context.tenantId,
          workspace_id: context.workspaceId,
          sku: input.sku,
          name: input.name,
          description: input.description,
          product_type: input.productType,
          is_active: input.isActive ?? true,
          metadata: input.metadata ?? {},
        })
        .select("*")
        .single(),
    );
    const prices: any[] = [];
    if (input.price) {
      let priceBook: any = await this.query(
        "crm.getDefaultPriceBook",
        this.client
          .from("crm_price_books")
          .select("*")
          .eq("tenant_id", context.tenantId)
          .eq("currency", input.price.amount.currency)
          .eq("market_code", input.price.marketCode ?? context.marketCode)
          .eq("is_default", true)
          .maybeSingle(),
      );
      if (!priceBook)
        priceBook = await this.query(
          "crm.createDefaultPriceBook",
          this.client
            .from("crm_price_books")
            .insert({
              tenant_id: context.tenantId,
              name: `Tarif ${input.price.marketCode ?? context.marketCode} ${input.price.amount.currency}`,
              currency: input.price.amount.currency,
              market_code: input.price.marketCode ?? context.marketCode,
              is_default: true,
            })
            .select("*")
            .single(),
        );
      const price: any = await this.query(
        "crm.createPrice",
        this.client
          .from("crm_prices")
          .insert({
            tenant_id: context.tenantId,
            price_book_id: priceBook.id,
            product_id: row.id,
            amount_minor: input.price.amount.amountMinor,
            currency: input.price.amount.currency,
            billing_interval: input.price.billingInterval,
          })
          .select("*")
          .single(),
      );
      prices.push({ ...price, price_book: priceBook });
    }
    return mapProduct(row, prices);
  }
  async updateProduct(
    tenantId: string,
    id: string,
    input: Partial<CrmProductInput>,
    expectedVersion: number,
  ) {
    const update: any = {
      sku: input.sku,
      name: input.name,
      description: input.description,
      product_type: input.productType,
      is_active: input.isActive,
      metadata: input.metadata,
    };
    Object.keys(update).forEach(
      (key) => update[key] === undefined && delete update[key],
    );
    const row: any = await this.query(
      "crm.updateProduct",
      this.client
        .from("crm_products")
        .update(update)
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .eq("version", expectedVersion)
        .select("*")
        .maybeSingle(),
    );
    if (!row) throw new Error("CRM_CONFLICT");
    const prices: any[] = await this.query(
      "crm.getUpdatedProductPrices",
      this.client
        .from("crm_prices")
        .select("*,price_book:price_book_id(market_code)")
        .eq("tenant_id", tenantId)
        .eq("product_id", id),
    );
    return mapProduct(row, prices);
  }
  async listQuotes(
    tenantId: string,
    options: CrmListOptions & { opportunityId?: string } = {},
  ) {
    let query = this.client
      .from("crm_quotes")
      .select("*,account:account_id(name)")
      .eq("tenant_id", tenantId);
    if (options.opportunityId)
      query = query.eq("opportunity_id", options.opportunityId);
    if (options.query)
      query = query.ilike("quote_number", `%${options.query}%`);
    const configured = this.options(query, options);
    const rows: any[] = await this.query("crm.listQuotes", configured.query);
    const selected = rows.slice(0, configured.limit);
    const ids = selected.map((row) => row.id);
    const lines: any[] = ids.length
      ? await this.query(
          "crm.listQuoteLines",
          this.client
            .from("crm_quote_line_items")
            .select("*")
            .eq("tenant_id", tenantId)
            .in("quote_id", ids)
            .order("position"),
        )
      : [];
    const items = selected.map((row) =>
      mapQuote(
        row,
        lines.filter((line) => line.quote_id === row.id),
      ),
    );
    return {
      items,
      nextCursor:
        rows.length > configured.limit ? items.at(-1)?.updatedAt : undefined,
    };
  }
  async createQuote(context: CrmTenantContext, input: CrmQuoteInput) {
    const subtotalMinor = input.items.reduce(
      (sum, item) => sum + Math.round(item.quantity * item.unitAmountMinor),
      0,
    );
    const discountMinor = input.items.reduce(
      (sum, item) => sum + item.discountMinor,
      0,
    );
    const taxMinor = input.items.reduce((sum, item) => sum + item.taxMinor, 0);
    const totalMinor = Math.max(0, subtotalMinor - discountMinor + taxMinor);
    const quoteNumber = `DEV-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const row: any = await this.query(
      "crm.createQuote",
      this.client
        .from("crm_quotes")
        .insert({
          tenant_id: context.tenantId,
          account_id: input.accountId,
          opportunity_id: input.opportunityId,
          quote_number: quoteNumber,
          subtotal_minor: subtotalMinor,
          discount_minor: discountMinor,
          tax_minor: taxMinor,
          total_minor: totalMinor,
          currency: input.currency,
          valid_until: input.validUntil,
          notes: input.notes,
        })
        .select("*,account:account_id(name)")
        .single(),
    );
    const lines: any[] = await this.query(
      "crm.createQuoteLines",
      this.client
        .from("crm_quote_line_items")
        .insert(
          input.items.map((item, position) => ({
            tenant_id: context.tenantId,
            quote_id: row.id,
            product_id: item.productId,
            description: item.description,
            quantity: item.quantity,
            unit_amount_minor: item.unitAmountMinor,
            discount_minor: item.discountMinor,
            tax_minor: item.taxMinor,
            total_minor: Math.max(
              0,
              Math.round(item.quantity * item.unitAmountMinor) -
                item.discountMinor +
                item.taxMinor,
            ),
            position,
          })),
        )
        .select("*"),
    );
    return mapQuote(row, lines);
  }
  async listCustomFields(tenantId: string, entityType?: string) {
    let query = this.client
      .from("crm_custom_field_definitions")
      .select("*")
      .eq("tenant_id", tenantId)
      .neq("status", "archived")
      .order("position");
    if (entityType) query = query.eq("entity_type", entityType);
    const rows: any[] = await this.query("crm.listCustomFields", query);
    return rows.map(mapCustomField);
  }
  async createCustomField(
    context: CrmTenantContext,
    input: CrmCustomFieldInput,
  ) {
    const row: any = await this.query(
      "crm.createCustomField",
      this.client
        .from("crm_custom_field_definitions")
        .insert({
          tenant_id: context.tenantId,
          workspace_id: context.workspaceId,
          entity_type: input.entityType,
          name: input.name,
          key: input.key,
          description: input.description,
          field_type: input.fieldType,
          required: input.required ?? false,
          validation: input.validation ?? {},
          options: input.options ?? [],
          position: input.position ?? 0,
        })
        .select("*")
        .single(),
    );
    return mapCustomField(row);
  }
  async listSavedViews(
    tenantId: string,
    workspaceId: string,
    userId: string,
    entityType?: string,
  ) {
    const memberships: any[] = await this.query(
      "crm.listSavedViewTeams",
      this.client
        .from("crm_team_members")
        .select("team_id")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId),
    );
    const visibility = [
      "visibility.eq.tenant",
      `and(visibility.eq.workspace,workspace_id.eq.${workspaceId})`,
      `and(visibility.eq.personal,owner_id.eq.${userId},workspace_id.eq.${workspaceId})`,
      ...(memberships.length
        ? [
            `and(visibility.eq.team,team_id.in.(${memberships.map((item) => item.team_id).join(",")}),workspace_id.eq.${workspaceId})`,
          ]
        : []),
    ].join(",");
    let query = this.client
      .from("crm_saved_views")
      .select("*")
      .eq("tenant_id", tenantId)
      .or(visibility)
      .order("updated_at", { ascending: false });
    if (entityType) query = query.eq("entity_type", entityType);
    const rows: any[] = await this.query("crm.listSavedViews", query);
    return rows.map(mapSavedView);
  }
  async getSavedView(tenantId: string, id: string) {
    const rows: any[] = await this.query(
      "crm.getSavedView",
      this.client
        .from("crm_saved_views")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .limit(1),
    );
    return rows[0] ? mapSavedView(rows[0]) : null;
  }
  async createSavedView(
    context: CrmTenantContext,
    actorId: string,
    input: CrmSavedViewInput,
  ) {
    if (input.visibility === "team") {
      const memberships: any[] = await this.query(
        "crm.createSavedViewTeamMembership",
        this.client
          .from("crm_team_members")
          .select("team_id")
          .eq("tenant_id", context.tenantId)
          .eq("user_id", actorId)
          .eq("team_id", input.teamId)
          .limit(1),
      );
      if (!memberships.length) throw new Error("CRM_SAVED_VIEW_TEAM_FORBIDDEN");
    }
    const row: any = await this.query(
      "crm.createSavedView",
      this.client
        .from("crm_saved_views")
        .insert({
          tenant_id: context.tenantId,
          workspace_id: context.workspaceId,
          owner_id: actorId,
          entity_type: input.entityType,
          name: input.name,
          visibility: input.visibility,
          team_id: input.teamId,
          filter_definition: input.filterDefinition ?? {},
          sort_definition: input.sortDefinition ?? [],
          visible_columns: input.visibleColumns ?? [],
          column_order: input.columnOrder ?? [],
        })
        .select("*")
        .single(),
    );
    return mapSavedView(row);
  }
  async updateSavedView(
    tenantId: string,
    id: string,
    actorId: string,
    input: CrmSavedViewInput,
    expectedVersion: number,
  ) {
    if (input.visibility === "team") {
      const memberships: any[] = await this.query(
        "crm.updateSavedViewTeamMembership",
        this.client
          .from("crm_team_members")
          .select("team_id")
          .eq("tenant_id", tenantId)
          .eq("user_id", actorId)
          .eq("team_id", input.teamId)
          .limit(1),
      );
      if (!memberships.length) throw new Error("CRM_SAVED_VIEW_TEAM_FORBIDDEN");
    }
    const rows: any[] = await this.query(
      "crm.updateSavedView",
      this.client
        .from("crm_saved_views")
        .update({
          entity_type: input.entityType,
          name: input.name,
          visibility: input.visibility,
          team_id: input.teamId,
          filter_definition: input.filterDefinition ?? {},
          sort_definition: input.sortDefinition ?? [],
          visible_columns: input.visibleColumns ?? [],
          column_order: input.columnOrder ?? [],
          version: expectedVersion + 1,
        })
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .eq("version", expectedVersion)
        .select("*"),
    );
    if (!rows.length) throw new Error("CRM_CONFLICT");
    return mapSavedView(rows[0]);
  }
  async deleteSavedView(tenantId: string, id: string, expectedVersion: number) {
    const rows: any[] = await this.query(
      "crm.deleteSavedView",
      this.client
        .from("crm_saved_views")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .eq("version", expectedVersion)
        .select("id"),
    );
    if (!rows.length) throw new Error("CRM_CONFLICT");
    return true;
  }
  async addAudit(
    tenantId: string,
    actorId: string,
    action: string,
    entityType: string,
    entityId: string | undefined,
    changedFields: string[],
    correlationId: string,
  ) {
    await this.query(
      "crm.addAudit",
      this.client
        .from("crm_audit_events")
        .insert({
          tenant_id: tenantId,
          actor_id: actorId,
          action,
          entity_type: entityType,
          entity_id: entityId,
          changed_fields: changedFields,
          correlation_id: correlationId,
        })
        .select("id")
        .single(),
    );
  }
}
