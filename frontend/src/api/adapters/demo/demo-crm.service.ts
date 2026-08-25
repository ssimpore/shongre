import type {
  CrmAccount,
  CrmAccountDuplicateCheck,
  CrmAccountInput,
  CrmActivity,
  CrmContact,
  CrmContactInput,
  CrmDashboard,
  CrmCustomField,
  CrmCustomFieldInput,
  CrmDuplicateMatch,
  CrmOpportunity,
  CrmOpportunityInput,
  CrmOpportunityTransition,
  CrmPipeline,
  CrmPipelineInput,
  CrmProduct,
  CrmProductInput,
  CrmQuote,
  CrmQuoteInput,
  CrmSavedView,
  CrmSavedViewInput,
  CrmShongreIntelligence,
  CrmTask,
  CrmTaskInput,
} from "@shongre/contracts/crm";
import type {
  CrmListOptions,
  CrmPage,
  CrmServiceContract,
} from "../../contracts/crm.contract";

const TENANT_ID = "10000000-0000-4000-8000-000000000001";
const WORKSPACE_ID = "10000000-0000-4000-8000-000000000002";
const PIPELINE_ID = "10000000-0000-4000-8000-000000000003";
const OWNER_ID = "10000000-0000-4000-8000-000000000004";
const TEAM_ID = "10000000-0000-4000-8000-000000000005";
const SEEDED_AT = "2026-08-25T08:00:00.000Z";

const stageSeeds = [
  ["10000000-0000-4000-8000-000000000010", "Nouveau", 10, "blue"],
  ["10000000-0000-4000-8000-000000000011", "Qualifié", 25, "teal"],
  ["10000000-0000-4000-8000-000000000012", "Contacté", 40, "amber"],
  ["10000000-0000-4000-8000-000000000013", "Proposition", 60, "orange"],
  ["10000000-0000-4000-8000-000000000014", "Négociation", 80, "red"],
  ["10000000-0000-4000-8000-000000000015", "Gagné", 100, "green"],
  ["10000000-0000-4000-8000-000000000016", "Perdu", 0, "neutral"],
] as const;

const pipeline: CrmPipeline = {
  id: PIPELINE_ID,
  tenantId: TENANT_ID,
  workspaceId: WORKSPACE_ID,
  name: "Ventes Shongre Pro",
  description: "Acquisition et développement des vendeurs professionnels",
  isDefault: true,
  isActive: true,
  stages: stageSeeds.map(([id, name, probability, colorToken], position) => ({
    id,
    pipelineId: PIPELINE_ID,
    name,
    position,
    defaultProbability: probability,
    colorToken,
    isOpen: position < 5,
    isWon: position === 5,
    isLost: position === 6,
    requiredFields: position === 6 ? ["lossReason"] : [],
    version: 1,
  })),
  version: 1,
  createdAt: SEEDED_AT,
  updatedAt: SEEDED_AT,
};

const context = {
  tenantId: TENANT_ID,
  workspaceId: WORKSPACE_ID,
};

const accountSeeds: CrmAccount[] = [
  {
    id: "20000000-0000-4000-8000-000000000001",
    ...context,
    ownerId: OWNER_ID,
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
    ...context,
    ownerId: OWNER_ID,
    name: "VoltExpert Mobilité France",
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
    ...context,
    ownerId: OWNER_ID,
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

const contactSeeds: CrmContact[] = [
  {
    id: "30000000-0000-4000-8000-000000000001",
    ...context,
    ownerId: OWNER_ID,
    accountIds: [accountSeeds[0].id],
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
    ...context,
    ownerId: OWNER_ID,
    accountIds: [accountSeeds[1].id],
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

function opportunity(
  sequence: number,
  account: CrmAccount,
  stagePosition: number,
  name: string,
  amountMinor: number,
  closeDate: string,
  nextStep: string,
): CrmOpportunity {
  const stage = pipeline.stages[stagePosition];
  return {
    id: `40000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`,
    ...context,
    accountId: account.id,
    accountName: account.name,
    contactIds: contactSeeds
      .filter((contact) => contact.accountIds.includes(account.id))
      .map((contact) => contact.id),
    ownerId: OWNER_ID,
    ownerName: "Léa Bertin",
    teamId: TEAM_ID,
    teamName: "Ventes France",
    pipelineId: PIPELINE_ID,
    pipelineName: pipeline.name,
    stageId: stage.id,
    stageName: stage.name,
    name,
    amount: { amountMinor, currency: "EUR" },
    probability: stage.defaultProbability,
    forecastCategory: stagePosition >= 4 ? "commit" : "pipeline",
    expectedCloseDate: closeDate,
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

const opportunitySeeds = [
  opportunity(
    1,
    accountSeeds[0],
    4,
    "Abonnement Shongre Pro Business",
    118800,
    "2026-08-31",
    "Relancer la proposition",
  ),
  opportunity(
    2,
    accountSeeds[1],
    3,
    "Ouverture vitrine Pro Mobilité",
    58800,
    "2026-09-15",
    "Préparer la démonstration",
  ),
  opportunity(
    3,
    accountSeeds[2],
    0,
    "Campagne visibilité Déco",
    35000,
    "2026-09-30",
    "Appel de découverte",
  ),
  opportunity(
    4,
    accountSeeds[0],
    2,
    "Extension catalogue Belgique",
    72000,
    "2026-09-12",
    "Valider les marchés",
  ),
  opportunity(
    5,
    accountSeeds[1],
    1,
    "Pack recrutement partenaires",
    42000,
    "2026-10-05",
    "Qualifier le budget",
  ),
];

const taskSeeds: CrmTask[] = [
  {
    id: "50000000-0000-4000-8000-000000000001",
    ...context,
    ownerId: OWNER_ID,
    ownerName: "Léa Bertin",
    teamId: TEAM_ID,
    opportunityId: opportunitySeeds[0].id,
    accountId: accountSeeds[0].id,
    type: "call",
    title: "Relancer la proposition Atelier Nordique",
    priority: "urgent",
    status: "pending",
    dueAt: "2026-08-25T10:30:00.000Z",
    version: 1,
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
  {
    id: "50000000-0000-4000-8000-000000000002",
    ...context,
    ownerId: OWNER_ID,
    ownerName: "Léa Bertin",
    opportunityId: opportunitySeeds[1].id,
    accountId: accountSeeds[1].id,
    type: "meeting",
    title: "Préparer la démonstration VoltExpert",
    priority: "high",
    status: "pending",
    dueAt: "2026-08-26T09:00:00.000Z",
    version: 1,
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
  {
    id: "50000000-0000-4000-8000-000000000003",
    ...context,
    ownerId: OWNER_ID,
    ownerName: "Léa Bertin",
    opportunityId: opportunitySeeds[2].id,
    accountId: accountSeeds[2].id,
    type: "email",
    title: "Envoyer le dossier visibilité",
    priority: "medium",
    status: "pending",
    dueAt: "2026-08-27T13:00:00.000Z",
    version: 1,
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
];

const activitySeeds: CrmActivity[] = [
  {
    id: "60000000-0000-4000-8000-000000000001",
    ...context,
    actorName: "Léa Bertin",
    entityType: "opportunity",
    entityId: opportunitySeeds[0].id,
    activityType: "CALL_COMPLETED",
    title: "Appel de suivi",
    description: "Discussion sur les besoins et l’offre Pro Business.",
    occurredAt: "2026-08-24T14:30:00.000Z",
    isAiGenerated: false,
    createdAt: "2026-08-24T14:30:00.000Z",
  },
];

const productSeeds: CrmProduct[] = [
  {
    id: "71000000-0000-4000-8000-000000000001",
    ...context,
    sku: "PRO-BUSINESS-M",
    name: "Shongre Pro Business",
    description:
      "Abonnement mensuel pour vendeurs professionnels en croissance.",
    productType: "subscription",
    isActive: true,
    metadata: { entitlement: "pro_business" },
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
  {
    id: "71000000-0000-4000-8000-000000000002",
    ...context,
    sku: "VISI-PREMIUM-30",
    name: "Visibilité Premium 30 jours",
    description: "Pack de mise en avant multi-annonces.",
    productType: "advertising",
    isActive: true,
    metadata: { durationDays: 30 },
    prices: [
      {
        id: "72000000-0000-4000-8000-000000000002",
        priceBookId: "72000000-0000-4000-8000-000000000010",
        productId: "71000000-0000-4000-8000-000000000002",
        marketCode: "FR",
        amount: { amountMinor: 24900, currency: "EUR" },
        billingInterval: "one_time",
      },
    ],
    version: 1,
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
];

const quoteSeeds: CrmQuote[] = [
  {
    id: "73000000-0000-4000-8000-000000000001",
    tenantId: TENANT_ID,
    accountId: accountSeeds[0].id,
    accountName: accountSeeds[0].name,
    opportunityId: opportunitySeeds[0].id,
    quoteNumber: "DEV-2026-0042",
    subtotalMinor: 118800,
    discountMinor: 0,
    taxMinor: 23760,
    totalMinor: 142560,
    currency: "EUR",
    status: "sent",
    validUntil: "2026-09-05",
    notes: "Offre annuelle Shongre Pro Business.",
    items: [
      {
        id: "74000000-0000-4000-8000-000000000001",
        productId: productSeeds[0].id,
        description: "Shongre Pro Business · 12 mois",
        quantity: 12,
        unitAmountMinor: 9900,
        discountMinor: 0,
        taxMinor: 23760,
        totalMinor: 142560,
        position: 0,
      },
    ],
    version: 1,
    createdAt: "2026-08-22T09:00:00.000Z",
    updatedAt: "2026-08-24T09:00:00.000Z",
    sentAt: "2026-08-24T09:00:00.000Z",
  },
];

const customFieldSeeds: CrmCustomField[] = [
  {
    id: "75000000-0000-4000-8000-000000000001",
    ...context,
    entityType: "account",
    name: "Taille du catalogue",
    key: "catalogue_size",
    description: "Nombre estimé d’annonces publiables.",
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

const savedViewSeeds: CrmSavedView[] = [
  {
    id: "76000000-0000-4000-8000-000000000001",
    ...context,
    ownerId: OWNER_ID,
    entityType: "account",
    name: "Clients qualifiés",
    visibility: "personal",
    filterDefinition: { lifecycle: "qualified" },
    sortDefinition: [{ field: "updatedAt", direction: "desc" }],
    visibleColumns: [],
    columnOrder: [],
    version: 1,
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
];

function page<T extends { updatedAt?: string }>(
  values: T[],
  options: CrmListOptions = {},
): CrmPage<T> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
  const query = options.query?.trim().toLocaleLowerCase("fr");
  const filtered = query
    ? values.filter((item) =>
        JSON.stringify(item).toLocaleLowerCase("fr").includes(query),
      )
    : values;
  const afterCursor = options.cursor
    ? filtered.filter((item) => (item.updatedAt ?? "") < options.cursor!)
    : filtered;
  const items = afterCursor.slice(0, limit);
  const nextCursor =
    afterCursor.length > limit ? items.at(-1)?.updatedAt : undefined;
  return {
    items: structuredClone(items),
    pageInfo: {
      hasNextPage: Boolean(nextCursor),
      ...(nextCursor ? { nextCursor } : {}),
    },
  };
}

let sequence = 100;
function nextId(namespace: number) {
  sequence += 1;
  return `${namespace}0000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`;
}

function normalizeTags(tags: string[] = []) {
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

export class DemoCrmService implements CrmServiceContract {
  private pipelines = [structuredClone(pipeline)];
  private accounts = structuredClone(accountSeeds);
  private contacts = structuredClone(contactSeeds);
  private opportunities = structuredClone(opportunitySeeds);
  private tasks = structuredClone(taskSeeds);
  private activities = structuredClone(activitySeeds);
  private products = structuredClone(productSeeds);
  private quotes = structuredClone(quoteSeeds);
  private customFields = structuredClone(customFieldSeeds);
  private savedViews = structuredClone(savedViewSeeds);

  async getDashboard(): Promise<CrmDashboard> {
    const defaultPipeline =
      this.pipelines.find((item) => item.isDefault) ?? this.pipelines[0];
    const open = this.opportunities.filter((item) => item.status === "open");
    const amount = (items: CrmOpportunity[]) =>
      items.reduce((sum, item) => sum + item.amount.amountMinor, 0);
    const current = "2026-08-25T12:00:00.000Z";
    return {
      marketCode: "FR",
      currency: "EUR",
      activeProspects: new Set(
        open.flatMap((item) => (item.accountId ? [item.accountId] : [])),
      ).size,
      openOpportunities: open.length,
      openPipelineMinor: amount(open),
      weightedPipelineMinor: open.reduce(
        (sum, item) =>
          sum + Math.round((item.amount.amountMinor * item.probability) / 100),
        0,
      ),
      forecastMinor: amount(
        open.filter((item) =>
          ["best_case", "commit"].includes(item.forecastCategory),
        ),
      ),
      wonRevenueMinor: amount(
        this.opportunities.filter((item) => item.status === "won"),
      ),
      lostValueMinor: amount(
        this.opportunities.filter((item) => item.status === "lost"),
      ),
      overdueTasks: this.tasks.filter(
        (item) => item.status !== "completed" && item.dueAt < current,
      ).length,
      tasksDueToday: this.tasks.filter(
        (item) =>
          item.status !== "completed" && item.dueAt.startsWith("2026-08-25"),
      ).length,
      opportunities: structuredClone(this.opportunities.slice(0, 12)),
      priorityTasks: structuredClone(
        this.tasks.filter((item) => item.status !== "completed").slice(0, 8),
      ),
      stages: defaultPipeline.stages.map((stage) => {
        const items = open.filter((item) => item.stageId === stage.id);
        return {
          stageId: stage.id,
          stageName: stage.name,
          position: stage.position,
          opportunityCount: items.length,
          amountMinor: amount(items),
          weightedAmountMinor: items.reduce(
            (sum, item) =>
              sum +
              Math.round((item.amount.amountMinor * item.probability) / 100),
            0,
          ),
        };
      }),
    };
  }

  async listAccounts(options?: CrmListOptions) {
    return page(this.accounts, options);
  }
  async getAccount(id: string) {
    return this.required(
      this.accounts.find((item) => item.id === id),
      "Compte CRM introuvable.",
    );
  }
  async findAccountDuplicates(
    input: CrmAccountDuplicateCheck,
  ): Promise<CrmDuplicateMatch[]> {
    const domain = input.domain
      ?.trim()
      .toLocaleLowerCase("en-US")
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0];
    const name = input.name?.trim().toLocaleLowerCase("fr");
    return this.accounts
      .map((account) => {
        const signals: CrmDuplicateMatch["signals"] = [];
        if (
          domain &&
          account.domain?.trim().toLocaleLowerCase("en-US") === domain
        ) {
          signals.push({ kind: "domain", value: domain, confidence: 100 });
        }
        if (name && account.name.trim().toLocaleLowerCase("fr") === name) {
          signals.push({ kind: "name", value: input.name!, confidence: 90 });
        }
        if (
          input.email &&
          account.email?.toLocaleLowerCase("en-US") ===
            input.email.toLocaleLowerCase("en-US")
        ) {
          signals.push({
            kind: "email",
            value: input.email,
            confidence: 100,
          });
        }
        if (!signals.length) return undefined;
        return {
          entityId: account.id,
          displayName: account.name,
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
  async getAccountShongreIntelligence(
    id: string,
  ): Promise<CrmShongreIntelligence> {
    if (id !== accountSeeds[0].id) {
      return {
        linked: false,
        sourceSystem: "shongre",
        professional: { availability: "not_linked" },
        listings: {
          availability: "not_linked",
          total: 0,
          published: 0,
          recent: [],
        },
        subscription: { availability: "not_linked" },
        advertising: { availability: "not_linked" },
        leads: { availability: "not_linked" },
        marketplaceActivity: { availability: "not_linked" },
      };
    }
    return {
      linked: true,
      sourceSystem: "shongre",
      organization: {
        id: TENANT_ID,
        name: "L'Atelier Nordique",
        legalName: "L'Atelier Nordique SAS",
        verified: true,
        marketCode: "FR",
        city: "Paris",
      },
      professional: {
        availability: "available",
        ownerUserId: OWNER_ID,
        ownerName: "Camille Durand",
        emailVerified: true,
        phoneVerified: true,
        businessVerified: true,
      },
      listings: {
        availability: "available",
        total: 34,
        published: 28,
        recent: [
          {
            id: "93000000-0000-4000-8000-000000000001",
            title: "Buffet scandinave restauré",
            status: "published",
            marketCode: "FR",
            updatedAt: "2026-08-24T15:30:00.000Z",
          },
          {
            id: "93000000-0000-4000-8000-000000000002",
            title: "Fauteuil lounge en teck",
            status: "published",
            marketCode: "FR",
            updatedAt: "2026-08-23T10:15:00.000Z",
          },
        ],
      },
      subscription: {
        availability: "available",
        id: "94000000-0000-4000-8000-000000000001",
        productId: "shongre-pro-business",
        status: "active",
        currentPeriodEndsAt: "2026-09-30T21:59:59.000Z",
        cancelAtPeriodEnd: false,
      },
      advertising: { availability: "not_connected" },
      leads: { availability: "not_connected" },
      marketplaceActivity: { availability: "not_connected" },
      lastSynchronizedAt: SEEDED_AT,
    };
  }
  async createAccount(input: CrmAccountInput) {
    const now = new Date().toISOString();
    const value: CrmAccount = {
      id: nextId(2),
      ...context,
      ...input,
      country: input.country ?? "FR",
      marketCode: input.marketCode ?? "FR",
      lifecycle: input.lifecycle ?? "prospect",
      source: input.source ?? "manual",
      tags: normalizeTags(input.tags),
      customValues: input.customValues ?? {},
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    this.accounts.unshift(value);
    return structuredClone(value);
  }
  async updateAccount(
    id: string,
    expectedVersion: number,
    changes: Partial<CrmAccountInput>,
  ) {
    const value = this.versioned(this.accounts, id, expectedVersion);
    Object.assign(value, changes, {
      ...(changes.tags ? { tags: normalizeTags(changes.tags) } : {}),
      version: value.version + 1,
      updatedAt: new Date().toISOString(),
    });
    return structuredClone(value);
  }

  async listContacts(options?: CrmListOptions) {
    return page(this.contacts, options);
  }
  async getContact(id: string) {
    return this.required(
      this.contacts.find((item) => item.id === id),
      "Contact CRM introuvable.",
    );
  }
  async createContact(input: CrmContactInput) {
    const now = new Date().toISOString();
    const value: CrmContact = {
      id: nextId(3),
      ...context,
      ...input,
      accountIds: input.accountIds ?? [],
      fullName: `${input.firstName} ${input.lastName}`.trim(),
      country: input.country ?? "FR",
      lifecycle: input.lifecycle ?? "prospect",
      source: input.source ?? "manual",
      doNotContact: input.doNotContact ?? false,
      tags: normalizeTags(input.tags),
      customValues: input.customValues ?? {},
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    this.contacts.unshift(value);
    return structuredClone(value);
  }
  async updateContact(
    id: string,
    expectedVersion: number,
    changes: Partial<CrmContactInput>,
  ) {
    const value = this.versioned(this.contacts, id, expectedVersion);
    Object.assign(value, changes, {
      ...(changes.tags ? { tags: normalizeTags(changes.tags) } : {}),
      fullName:
        `${changes.firstName ?? value.firstName} ${changes.lastName ?? value.lastName}`.trim(),
      version: value.version + 1,
      updatedAt: new Date().toISOString(),
    });
    return structuredClone(value);
  }

  async listPipelines() {
    return structuredClone(this.pipelines);
  }
  async createPipeline(input: CrmPipelineInput) {
    const now = new Date().toISOString();
    const id = nextId(8);
    const created: CrmPipeline = {
      id,
      ...context,
      name: input.name,
      description: input.description,
      isDefault: input.isDefault,
      isActive: true,
      stages: input.stages.map((stage) => ({
        ...stage,
        id: stage.id ?? nextId(9),
        pipelineId: id,
        version: 1,
      })),
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    if (created.isDefault) {
      this.pipelines.forEach((item) => {
        item.isDefault = false;
      });
    }
    this.pipelines.push(created);
    return structuredClone(created);
  }
  async updatePipeline(
    id: string,
    expectedVersion: number,
    input: CrmPipelineInput,
  ) {
    const pipelineIndex = this.pipelines.findIndex((item) => item.id === id);
    const current = this.pipelines[pipelineIndex];
    if (!current || current.version !== expectedVersion) {
      throw new Error(
        "Cette fiche a été modifiée. Rechargez-la avant de réessayer.",
      );
    }
    if (input.isDefault) {
      this.pipelines.forEach((item) => {
        item.isDefault = false;
      });
    }
    const existingStageVersions = new Map(
      current.stages.map((stage) => [stage.id, stage.version]),
    );
    const updated: CrmPipeline = {
      ...current,
      name: input.name,
      description: input.description,
      isDefault: input.isDefault,
      stages: input.stages.map((stage) => ({
        ...stage,
        id: stage.id ?? nextId(9),
        pipelineId: id,
        version:
          ((stage.id ? existingStageVersions.get(stage.id) : 0) ?? 0) + 1,
      })),
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
    };
    this.pipelines[pipelineIndex] = updated;
    return structuredClone(updated);
  }
  async listOpportunities(options?: CrmListOptions) {
    return page(this.opportunities, options);
  }
  async getOpportunity(id: string) {
    return this.required(
      this.opportunities.find((item) => item.id === id),
      "Opportunité introuvable.",
    );
  }
  async createOpportunity(input: CrmOpportunityInput) {
    const now = new Date().toISOString();
    const selectedPipeline = this.required(
      this.pipelines.find((item) => item.id === input.pipelineId),
      "Pipeline introuvable.",
    );
    const stage = this.required(
      selectedPipeline.stages.find((item) => item.id === input.stageId),
      "Étape introuvable.",
    );
    const account = this.accounts.find((item) => item.id === input.accountId);
    const value: CrmOpportunity = {
      id: nextId(4),
      ...context,
      ...input,
      accountName: account?.name,
      contactIds: input.contactIds ?? [],
      ownerName: input.ownerId ? "Léa Bertin" : undefined,
      teamName: input.teamId ? "Ventes France" : undefined,
      pipelineName: selectedPipeline.name,
      stageName: stage.name,
      probability: input.probability ?? stage.defaultProbability,
      forecastCategory: input.forecastCategory ?? "pipeline",
      source: input.source ?? "manual",
      status: "open",
      tags: normalizeTags(input.tags),
      customValues: input.customValues ?? {},
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    this.opportunities.unshift(value);
    return structuredClone(value);
  }
  async transitionOpportunity(id: string, input: CrmOpportunityTransition) {
    const value = this.versioned(this.opportunities, id, input.expectedVersion);
    const selectedPipeline = this.required(
      this.pipelines.find((item) => item.id === value.pipelineId),
      "Pipeline introuvable.",
    );
    const stage = this.required(
      selectedPipeline.stages.find((item) => item.id === input.stageId),
      "Étape introuvable.",
    );
    if (stage.isLost && !input.lossReason)
      throw new Error("Le motif de perte est obligatoire.");
    const now = new Date().toISOString();
    Object.assign(value, {
      stageId: stage.id,
      stageName: stage.name,
      probability: stage.defaultProbability,
      status: stage.isWon ? "won" : stage.isLost ? "lost" : "open",
      forecastCategory:
        stage.isWon || stage.isLost ? "closed" : value.forecastCategory,
      lossReason: stage.isLost ? input.lossReason : undefined,
      lossDetail: stage.isLost ? input.lossDetail : undefined,
      wonAt: stage.isWon ? now : undefined,
      lostAt: stage.isLost ? now : undefined,
      amount: input.contractValue ?? value.amount,
      recurringValue: input.recurringValue ?? value.recurringValue,
      renewalDate: input.renewalDate ?? value.renewalDate,
      onboardingStatus: input.onboardingStatus ?? value.onboardingStatus,
      version: value.version + 1,
      updatedAt: now,
    });
    return structuredClone(value);
  }

  async listTasks(options?: CrmListOptions) {
    return page(this.tasks, options);
  }
  async createTask(input: CrmTaskInput) {
    const now = new Date().toISOString();
    const value: CrmTask = {
      id: nextId(5),
      ...context,
      ...input,
      ownerName: input.ownerId ? "Léa Bertin" : undefined,
      priority: input.priority ?? "medium",
      status: "pending",
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.unshift(value);
    return structuredClone(value);
  }
  async completeTask(id: string, expectedVersion: number, result?: string) {
    const value = this.versioned(this.tasks, id, expectedVersion);
    const now = new Date().toISOString();
    Object.assign(value, {
      status: "completed",
      completedAt: now,
      completionResult: result,
      version: value.version + 1,
      updatedAt: now,
    });
    return structuredClone(value);
  }

  async listActivities(
    entityType: "account" | "contact" | "opportunity" | "task",
    entityId: string,
    limit = 100,
  ) {
    return structuredClone(
      this.activities
        .filter(
          (item) =>
            item.entityType === entityType && item.entityId === entityId,
        )
        .slice(0, limit),
    );
  }
  async createActivity(
    input: Pick<
      CrmActivity,
      "entityType" | "entityId" | "activityType" | "title"
    > &
      Partial<Pick<CrmActivity, "description" | "occurredAt">>,
  ) {
    const now = input.occurredAt ?? new Date().toISOString();
    const value: CrmActivity = {
      id: nextId(6),
      ...context,
      ...input,
      actorName: "Léa Bertin",
      occurredAt: now,
      isAiGenerated: false,
      createdAt: now,
    };
    this.activities.unshift(value);
    return structuredClone(value);
  }

  async listProducts(options?: CrmListOptions) {
    return page(this.products, options);
  }
  async createProduct(input: CrmProductInput) {
    const now = new Date().toISOString();
    const id = nextId(7);
    const value: CrmProduct = {
      id,
      ...context,
      sku: input.sku,
      name: input.name,
      description: input.description,
      productType: input.productType,
      isActive: input.isActive ?? true,
      metadata: input.metadata ?? {},
      prices: input.price
        ? [
            {
              id: nextId(8),
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
    id: string,
    expectedVersion: number,
    changes: Partial<CrmProductInput>,
  ) {
    const value = this.versioned(this.products, id, expectedVersion);
    Object.assign(value, changes, {
      version: value.version + 1,
      updatedAt: new Date().toISOString(),
    });
    if (changes.price)
      value.prices = [
        {
          id: value.prices[0]?.id ?? nextId(8),
          priceBookId:
            value.prices[0]?.priceBookId ??
            "72000000-0000-4000-8000-000000000010",
          productId: value.id,
          marketCode: changes.price.marketCode,
          amount: changes.price.amount,
          billingInterval: changes.price.billingInterval,
        },
      ];
    return structuredClone(value);
  }
  async listQuotes(options: CrmListOptions & { opportunityId?: string } = {}) {
    const values = options.opportunityId
      ? this.quotes.filter(
          (item) => item.opportunityId === options.opportunityId,
        )
      : this.quotes;
    return page(values, options);
  }
  async createQuote(input: CrmQuoteInput) {
    const now = new Date().toISOString();
    const account = this.required(
      this.accounts.find((item) => item.id === input.accountId),
      "Compte introuvable.",
    );
    const items = input.items.map((item, position) => ({
      ...item,
      id: nextId(9),
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
      id: nextId(9),
      tenantId: TENANT_ID,
      accountId: input.accountId,
      accountName: account.name,
      opportunityId: input.opportunityId,
      quoteNumber: `DEV-2026-${String(this.quotes.length + 43).padStart(4, "0")}`,
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
  async listCustomFields(
    entityType?: "account" | "contact" | "opportunity" | "task",
  ) {
    return structuredClone(
      entityType
        ? this.customFields.filter((item) => item.entityType === entityType)
        : this.customFields,
    );
  }
  async createCustomField(input: CrmCustomFieldInput) {
    if (
      this.customFields.some(
        (item) =>
          item.entityType === input.entityType && item.key === input.key,
      )
    )
      throw new Error("Cette clé de champ existe déjà.");
    const now = new Date().toISOString();
    const value: CrmCustomField = {
      id: nextId(7),
      ...context,
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
    entityType?: "account" | "contact" | "opportunity" | "task",
  ) {
    return structuredClone(
      entityType
        ? this.savedViews.filter((view) => view.entityType === entityType)
        : this.savedViews,
    );
  }
  async createSavedView(input: CrmSavedViewInput) {
    const now = new Date().toISOString();
    const value: CrmSavedView = {
      id: nextId(6),
      ...context,
      ownerId: OWNER_ID,
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
    id: string,
    expectedVersion: number,
    input: CrmSavedViewInput,
  ) {
    const value = this.savedViews.find((item) => item.id === id);
    if (!value) throw new Error("Vue CRM introuvable.");
    if (value.version !== expectedVersion)
      throw new Error("Cette vue a été modifiée. Rechargez-la.");
    Object.assign(value, input, {
      version: value.version + 1,
      updatedAt: new Date().toISOString(),
    });
    return structuredClone(value);
  }
  async deleteSavedView(id: string, expectedVersion: number) {
    const value = this.versioned(this.savedViews, id, expectedVersion);
    this.savedViews = this.savedViews.filter((item) => item.id !== value.id);
  }

  private required<T>(value: T | undefined, message: string): T {
    if (!value) throw new Error(message);
    return structuredClone(value);
  }

  private versioned<T extends { id: string; version: number }>(
    values: T[],
    id: string,
    expectedVersion: number,
  ): T {
    const value = values.find((item) => item.id === id);
    if (!value) throw new Error("Ressource CRM introuvable.");
    if (value.version !== expectedVersion)
      throw new Error(
        "Cette fiche a été modifiée. Rechargez-la avant de réessayer.",
      );
    return value;
  }
}

export const demoCrmService = new DemoCrmService();
