import { randomUUID } from "node:crypto";
import type {
  MarketingCampaign,
  MarketingCampaignInput,
  MarketingCampaignStatus,
  MarketingDashboard,
  MarketingList,
  MarketingListInput,
  MarketingProfile,
  MarketingProfileInput,
  MarketingSegment,
  MarketingSegmentInput,
  MarketingSenderIdentity,
  MarketingSuppression,
  MarketingSuppressionReason,
  MarketingTemplate,
  MarketingTemplateInput,
} from "@shongre/contracts/marketing";
import { getCountryConfig } from "@shongre/contracts";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";
import { requireMarketCode } from "../../../shared/market/market-code.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { databaseFailure } from "./repository-error.js";

export interface MarketingTenantContext {
  tenantId: string;
  workspaceId: string;
  marketCode: string;
  locale: string;
  timezone: string;
  approvalRequired: boolean;
  doubleOptIn: boolean;
  frequencyCapDay: number;
  frequencyCapWeek: number;
  defaultProviderConnectionId?: string;
}

export interface MarketingPage<T> {
  items: T[];
  nextCursor?: string;
}

export interface MarketingListOptions {
  limit?: number;
  cursor?: string;
  query?: string;
  status?: string;
}

export interface MarketingRecipientSeed {
  profileId: string;
  idempotencyKey: string;
  eligibilityStatus: "ELIGIBLE" | "EXCLUDED";
  exclusionReason?: string;
  variantId?: string;
}

export type MarketingActionPurpose = "CONFIRM" | "PREFERENCES" | "UNSUBSCRIBE";

function encodeProfileCursor(row: { updated_at: string; id: string }): string {
  return Buffer.from(
    JSON.stringify({ updatedAt: row.updated_at, id: row.id }),
  ).toString("base64url");
}

function decodeProfileCursor(cursor: string): {
  updatedAt: string;
  id: string;
} {
  try {
    const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (
      typeof value.updatedAt !== "string" ||
      !Number.isFinite(Date.parse(value.updatedAt)) ||
      typeof value.id !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(value.id)
    )
      throw new Error("invalid cursor");
    return value;
  } catch {
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: "Le curseur de pagination est invalide.",
    });
  }
}

export interface MarketingActionTokenRecord {
  id: string;
  tenantId: string;
  profileId: string;
  purpose: MarketingActionPurpose;
  expiresAt: string;
  usedAt?: string;
}

export interface MarketingConsentRecord {
  subjectId: string;
  normalizedEmail: string;
  status: "GRANTED" | "REFUSED" | "WITHDRAWN" | "NOT_ASKED";
  source: string;
  consentVersion: string;
  confirmedAt?: string;
  withdrawnAt?: string;
}

export interface IMarketingRepository {
  resolveTenantId(userId: string): Promise<string | null>;
  resolveTenantContext(userId: string): Promise<MarketingTenantContext | null>;
  resolvePublicContext(
    marketCode: string,
  ): Promise<MarketingTenantContext | null>;
  provisionTenant(
    tenantId: string,
    actorId: string,
  ): Promise<MarketingTenantContext>;
  dashboard(tenantId: string): Promise<MarketingDashboard>;
  listProfiles(
    tenantId: string,
    options?: MarketingListOptions,
  ): Promise<MarketingPage<MarketingProfile>>;
  listAllProfiles(tenantId: string): Promise<MarketingProfile[]>;
  getProfile(tenantId: string, id: string): Promise<MarketingProfile | null>;
  findProfileByEmail(
    tenantId: string,
    normalizedEmail: string,
  ): Promise<MarketingProfile | null>;
  findProfileByAccountUserId(
    tenantId: string,
    accountUserId: string,
  ): Promise<MarketingProfile | null>;
  saveProfile(
    context: MarketingTenantContext,
    input: MarketingProfileInput,
    actorId?: string,
  ): Promise<MarketingProfile>;
  setProfileStatus(
    tenantId: string,
    id: string,
    status: MarketingProfile["status"],
  ): Promise<MarketingProfile>;
  updateProfileTopics(
    tenantId: string,
    id: string,
    topics: string[],
  ): Promise<MarketingProfile>;
  createActionToken(
    tenantId: string,
    profileId: string,
    purpose: MarketingActionPurpose,
    tokenHash: string,
    expiresAt: string,
  ): Promise<void>;
  getActionToken(
    tokenHash: string,
    purpose: MarketingActionPurpose,
  ): Promise<MarketingActionTokenRecord | null>;
  markActionTokenUsed(id: string): Promise<void>;
  appendConsent(
    tenantId: string,
    record: MarketingConsentRecord,
  ): Promise<void>;
  listLists(tenantId: string): Promise<MarketingList[]>;
  createList(
    context: MarketingTenantContext,
    input: MarketingListInput,
  ): Promise<MarketingList>;
  getListMemberIds(tenantId: string, listIds: string[]): Promise<string[]>;
  addListMember(
    tenantId: string,
    listId: string,
    profileId: string,
    source: string,
  ): Promise<void>;
  listSegments(tenantId: string): Promise<MarketingSegment[]>;
  createSegment(
    context: MarketingTenantContext,
    input: MarketingSegmentInput,
  ): Promise<MarketingSegment>;
  updateSegmentEstimate(
    tenantId: string,
    id: string,
    count: number,
  ): Promise<void>;
  listTemplates(tenantId: string): Promise<MarketingTemplate[]>;
  createTemplate(
    context: MarketingTenantContext,
    input: MarketingTemplateInput,
    actorId: string,
  ): Promise<MarketingTemplate>;
  listCampaigns(tenantId: string): Promise<MarketingCampaign[]>;
  getCampaign(tenantId: string, id: string): Promise<MarketingCampaign | null>;
  createCampaign(
    context: MarketingTenantContext,
    input: MarketingCampaignInput,
    actorId: string,
  ): Promise<MarketingCampaign>;
  setCampaignStatus(
    tenantId: string,
    id: string,
    status: MarketingCampaignStatus,
    timestamps?: Partial<
      Pick<MarketingCampaign, "scheduledAt" | "startedAt" | "completedAt">
    >,
  ): Promise<MarketingCampaign>;
  listSenderIdentities(tenantId: string): Promise<MarketingSenderIdentity[]>;
  listSuppressions(tenantId: string): Promise<MarketingSuppression[]>;
  suppress(
    tenantId: string,
    profile: MarketingProfile,
    reason: MarketingSuppressionReason,
    source: string,
  ): Promise<MarketingSuppression>;
  releaseSuppression(
    tenantId: string,
    normalizedEmail: string,
    reason: MarketingSuppressionReason,
    actorId: string,
  ): Promise<void>;
  getActiveSuppressedEmails(tenantId: string): Promise<Set<string>>;
  getRecentRecipientProfileIds(
    tenantId: string,
    since: string,
  ): Promise<Set<string>>;
  getRecipientCounts(
    tenantId: string,
    since: string,
  ): Promise<Map<string, number>>;
  createAudienceSnapshot(
    tenantId: string,
    campaign: MarketingCampaign,
    recipients: MarketingRecipientSeed[],
  ): Promise<{ versionId: string; recipientCount: number }>;
  enqueueCampaign(
    tenantId: string,
    campaignId: string,
    idempotencyKey: string,
    availableAt?: string,
  ): Promise<void>;
  resumeCampaign(tenantId: string, campaignId: string): Promise<void>;
  cancelCampaignDispatch(tenantId: string, campaignId: string): Promise<void>;
  setCampaignApproval(
    tenantId: string,
    campaignId: string,
    status: MarketingCampaignStatus,
    actorId?: string,
  ): Promise<MarketingCampaign>;
  setCampaignWinner(
    tenantId: string,
    campaignId: string,
    variantId: string,
  ): Promise<MarketingCampaign>;
  addAudit(
    tenantId: string,
    actorId: string | undefined,
    action: string,
    entityType: string,
    entityId?: string,
    changedFields?: string[],
  ): Promise<void>;
}

const DEMO_TENANT_ID = "10000000-0000-4000-8000-000000000001";
const DEMO_WORKSPACE_ID = "10000000-0000-4000-8000-000000000101";
const DEMO_PROVIDER_ID = "70000000-0000-4000-8000-000000000001";
const DEMO_ACTOR_ID = "10000000-0000-4000-8000-000000000301";
const DEMO_NOW = "2026-08-25T12:00:00.000Z";

const demoContext: MarketingTenantContext = {
  tenantId: DEMO_TENANT_ID,
  workspaceId: DEMO_WORKSPACE_ID,
  marketCode: "FR",
  locale: "fr-FR",
  timezone: "Europe/Paris",
  approvalRequired: false,
  doubleOptIn: true,
  frequencyCapDay: 3,
  frequencyCapWeek: 7,
  defaultProviderConnectionId: DEMO_PROVIDER_ID,
};

const demoProfiles: MarketingProfile[] = [
  {
    id: "11000000-0000-4000-8000-000000000001",
    tenantId: DEMO_TENANT_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    crmContactId: "30000000-0000-4000-8000-000000000001",
    email: "contact@atelier-nordique.fr",
    normalizedEmail: "contact@atelier-nordique.fr",
    firstName: "Marc",
    lastName: "Dumont",
    status: "SUBSCRIBED",
    locale: "fr-FR",
    timezone: "Europe/Paris",
    country: "FR",
    source: "CRM",
    topics: ["pro_insights", "new_features"],
    customValues: { lifecycle: "customer", accountType: "professional" },
    subscribedAt: "2026-06-10T09:00:00.000Z",
    confirmedAt: "2026-06-10T09:05:00.000Z",
    lastEngagedAt: "2026-08-22T08:10:00.000Z",
    version: 1,
    createdAt: "2026-06-10T09:00:00.000Z",
    updatedAt: "2026-08-22T08:10:00.000Z",
  },
  {
    id: "11000000-0000-4000-8000-000000000002",
    tenantId: DEMO_TENANT_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    email: "camille@example.fr",
    normalizedEmail: "camille@example.fr",
    firstName: "Camille",
    status: "SUBSCRIBED",
    locale: "fr-FR",
    timezone: "Europe/Paris",
    country: "FR",
    source: "FOOTER",
    topics: ["deals", "editorial"],
    customValues: { accountType: "individual" },
    subscribedAt: "2026-08-01T10:00:00.000Z",
    confirmedAt: "2026-08-01T10:04:00.000Z",
    lastEngagedAt: "2026-08-20T09:00:00.000Z",
    version: 1,
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-20T09:00:00.000Z",
  },
  {
    id: "11000000-0000-4000-8000-000000000003",
    tenantId: DEMO_TENANT_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    email: "pending@example.fr",
    normalizedEmail: "pending@example.fr",
    status: "PENDING",
    locale: "fr-FR",
    timezone: "Europe/Paris",
    country: "FR",
    source: "NEWSLETTER_PAGE",
    topics: ["editorial"],
    customValues: {},
    version: 1,
    createdAt: "2026-08-25T08:00:00.000Z",
    updatedAt: "2026-08-25T08:00:00.000Z",
  },
  {
    id: "11000000-0000-4000-8000-000000000004",
    tenantId: DEMO_TENANT_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    email: "ancien@example.fr",
    normalizedEmail: "ancien@example.fr",
    status: "UNSUBSCRIBED",
    locale: "fr-FR",
    timezone: "Europe/Paris",
    country: "FR",
    source: "IMPORT",
    topics: ["deals"],
    customValues: {},
    unsubscribedAt: "2026-08-12T11:00:00.000Z",
    version: 2,
    createdAt: "2026-05-01T10:00:00.000Z",
    updatedAt: "2026-08-12T11:00:00.000Z",
  },
];

const demoLists: MarketingList[] = [
  {
    id: "12000000-0000-4000-8000-000000000001",
    tenantId: DEMO_TENANT_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    name: "Newsletter hebdomadaire",
    description: "Sélections éditoriales et nouveautés Shongre.",
    status: "ACTIVE",
    memberCount: 2,
    version: 1,
    createdAt: "2026-06-01T08:00:00.000Z",
    updatedAt: "2026-08-20T09:00:00.000Z",
  },
  {
    id: "12000000-0000-4000-8000-000000000002",
    tenantId: DEMO_TENANT_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    name: "Professionnels Shongre",
    description: "Contenus, produits et conseils réservés aux professionnels.",
    status: "ACTIVE",
    memberCount: 1,
    version: 1,
    createdAt: "2026-06-01T08:00:00.000Z",
    updatedAt: "2026-08-22T08:10:00.000Z",
  },
];

const demoSegments: MarketingSegment[] = [
  {
    id: "13000000-0000-4000-8000-000000000001",
    tenantId: DEMO_TENANT_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    name: "Professionnels engagés",
    description: "Profils professionnels abonnés ayant récemment interagi.",
    definition: {
      combinator: "AND",
      conditions: [
        { field: "status", operator: "EQUALS", value: "SUBSCRIBED" },
        {
          field: "customValues.accountType",
          operator: "EQUALS",
          value: "professional",
        },
      ],
    },
    status: "ACTIVE",
    estimatedCount: 1,
    lastEstimatedAt: DEMO_NOW,
    version: 1,
    createdAt: "2026-08-01T09:00:00.000Z",
    updatedAt: DEMO_NOW,
  },
];

const demoTemplates: MarketingTemplate[] = [
  {
    id: "14000000-0000-4000-8000-000000000001",
    tenantId: DEMO_TENANT_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    name: "Sélection Shongre",
    category: "NEWSLETTER",
    locale: "fr-FR",
    status: "ACTIVE",
    currentVersion: 1,
    subject: "Les nouveautés Shongre choisies pour vous",
    previewText: "Découvrez nos sélections, conseils et nouveautés.",
    content: {
      blocks: [
        {
          id: "heading",
          type: "HEADING",
          level: "H1",
          text: "Cette semaine sur Shongre",
        },
        {
          id: "intro",
          type: "PARAGRAPH",
          text: "Une sélection éditoriale préparée pour vous.",
        },
        {
          id: "cta",
          type: "BUTTON",
          label: "Découvrir la sélection",
          href: "https://shongre.example/recherche",
        },
        {
          id: "unsubscribe",
          type: "UNSUBSCRIBE",
          text: "Gérer mes préférences ou me désabonner",
        },
      ],
    },
    createdAt: "2026-08-01T09:00:00.000Z",
    updatedAt: "2026-08-01T09:00:00.000Z",
  },
];

const demoCampaigns: MarketingCampaign[] = [
  {
    id: "15000000-0000-4000-8000-000000000001",
    tenantId: DEMO_TENANT_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    name: "Sélection design — août",
    campaignType: "NEWSLETTER",
    status: "COMPLETED",
    locale: "fr-FR",
    timezone: "Europe/Paris",
    subject: "Les pièces design qui ont marqué la semaine",
    previewText: "Notre sélection éditoriale Shongre.",
    content: demoTemplates[0].content,
    audience: {
      includeListIds: [demoLists[0].id],
      includeSegmentIds: [],
      includeProfileIds: [],
      excludeListIds: [],
      excludeSegmentIds: [],
      excludeProfileIds: [],
    },
    templateId: demoTemplates[0].id,
    templateVersion: 1,
    senderIdentityId: "16000000-0000-4000-8000-000000000001",
    providerConnectionId: DEMO_PROVIDER_ID,
    currentVersion: 1,
    createdBy: DEMO_ACTOR_ID,
    startedAt: "2026-08-20T08:00:00.000Z",
    completedAt: "2026-08-20T08:02:00.000Z",
    createdAt: "2026-08-18T09:00:00.000Z",
    updatedAt: "2026-08-20T08:02:00.000Z",
  },
  {
    id: "15000000-0000-4000-8000-000000000002",
    tenantId: DEMO_TENANT_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    name: "Nouveautés Pro — septembre",
    campaignType: "ANNOUNCEMENT",
    status: "DRAFT",
    locale: "fr-FR",
    timezone: "Europe/Paris",
    subject: "De nouveaux outils pour développer votre activité",
    previewText: "Découvrez les prochaines évolutions de Shongre Pro.",
    content: demoTemplates[0].content,
    audience: {
      includeListIds: [],
      includeSegmentIds: [demoSegments[0].id],
      includeProfileIds: [],
      excludeListIds: [],
      excludeSegmentIds: [],
      excludeProfileIds: [],
    },
    providerConnectionId: DEMO_PROVIDER_ID,
    senderIdentityId: "16000000-0000-4000-8000-000000000001",
    currentVersion: 1,
    createdBy: DEMO_ACTOR_ID,
    createdAt: "2026-08-24T09:00:00.000Z",
    updatedAt: "2026-08-24T09:00:00.000Z",
  },
];

const demoSenders: MarketingSenderIdentity[] = [
  {
    id: "16000000-0000-4000-8000-000000000001",
    tenantId: DEMO_TENANT_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    displayName: "L’équipe Shongre",
    email: "actualites@demo.shongre.local",
    replyTo: "contact@demo.shongre.local",
    providerConnectionId: DEMO_PROVIDER_ID,
    status: "VERIFIED",
    verifiedAt: "2026-08-01T09:00:00.000Z",
    createdAt: "2026-08-01T09:00:00.000Z",
    updatedAt: "2026-08-01T09:00:00.000Z",
  },
];

function page<T extends { id: string }>(
  items: T[],
  options: MarketingListOptions = {},
): MarketingPage<T> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
  const filtered = options.query
    ? items.filter((item) =>
        JSON.stringify(item)
          .toLowerCase()
          .includes(options.query!.toLowerCase()),
      )
    : items;
  const start = options.cursor
    ? Math.max(filtered.findIndex((item) => item.id === options.cursor) + 1, 0)
    : 0;
  const selected = filtered.slice(start, start + limit);
  return {
    items: structuredClone(selected),
    nextCursor: filtered[start + limit]?.id,
  };
}

export class DemoMarketingRepository implements IMarketingRepository {
  private profiles = structuredClone(demoProfiles);
  private lists = structuredClone(demoLists);
  private segments = structuredClone(demoSegments);
  private templates = structuredClone(demoTemplates);
  private campaigns = structuredClone(demoCampaigns);
  private suppressions: MarketingSuppression[] = [];
  private listMembers = new Map<string, Set<string>>([
    [demoLists[0].id, new Set([demoProfiles[0].id, demoProfiles[1].id])],
    [demoLists[1].id, new Set([demoProfiles[0].id])],
  ]);
  private recipientProfileIds = new Set<string>();
  private actionTokens: Array<
    MarketingActionTokenRecord & { tokenHash: string }
  > = [];

  async resolveTenantId() {
    return DEMO_TENANT_ID;
  }
  async resolveTenantContext() {
    return structuredClone(demoContext);
  }
  async resolvePublicContext(marketCode: string) {
    return marketCode === demoContext.marketCode
      ? structuredClone(demoContext)
      : null;
  }
  async provisionTenant() {
    return structuredClone(demoContext);
  }
  async dashboard(): Promise<MarketingDashboard> {
    const activeProfiles = this.profiles.filter(
      (profile) => profile.status === "SUBSCRIBED",
    ).length;
    return {
      activeProfiles: activeProfiles * 2340,
      pendingProfiles:
        this.profiles.filter((profile) => profile.status === "PENDING").length *
        17,
      suppressedProfiles:
        this.profiles.filter((profile) =>
          ["SUPPRESSED", "BOUNCED", "COMPLAINED"].includes(profile.status),
        ).length + this.suppressions.length,
      campaignsSent: this.campaigns.filter(
        (campaign) => campaign.status === "COMPLETED",
      ).length,
      scheduledCampaigns: this.campaigns.filter(
        (campaign) => campaign.status === "SCHEDULED",
      ).length,
      delivered: 4361,
      deliveryRate: 0.982,
      uniqueClicks: 642,
      clickThroughRate: 0.147,
      unsubscribes: 4,
      providerConfigured: true,
    };
  }
  async listProfiles(_tenantId: string, options?: MarketingListOptions) {
    return page(this.profiles, options);
  }
  async listAllProfiles() {
    return structuredClone(this.profiles);
  }
  async getProfile(_tenantId: string, id: string) {
    return structuredClone(
      this.profiles.find((profile) => profile.id === id) ?? null,
    );
  }
  async findProfileByEmail(_tenantId: string, email: string) {
    return structuredClone(
      this.profiles.find((profile) => profile.normalizedEmail === email) ??
        null,
    );
  }
  async findProfileByAccountUserId(_tenantId: string, accountUserId: string) {
    return structuredClone(
      this.profiles.find(
        (profile) => profile.accountUserId === accountUserId,
      ) ?? null,
    );
  }
  async saveProfile(
    context: MarketingTenantContext,
    input: MarketingProfileInput,
  ) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const existing = this.profiles.find(
      (profile) => profile.normalizedEmail === normalizedEmail,
    );
    if (existing) {
      Object.assign(existing, input, {
        email: normalizedEmail,
        normalizedEmail,
        updatedAt: DEMO_NOW,
        version: existing.version + 1,
      });
      return structuredClone(existing);
    }
    const profile: MarketingProfile = {
      id: randomUUID(),
      tenantId: context.tenantId,
      workspaceId: context.workspaceId,
      ...input,
      email: normalizedEmail,
      normalizedEmail,
      status: context.doubleOptIn ? "PENDING" : "SUBSCRIBED",
      locale: input.locale ?? context.locale,
      timezone: input.timezone ?? context.timezone,
      country: input.country ?? context.marketCode,
      source: input.source ?? "API",
      topics: input.topics ?? [],
      customValues: input.customValues ?? {},
      version: 1,
      createdAt: DEMO_NOW,
      updatedAt: DEMO_NOW,
      ...(context.doubleOptIn
        ? {}
        : { subscribedAt: DEMO_NOW, confirmedAt: DEMO_NOW }),
    };
    this.profiles.unshift(profile);
    return structuredClone(profile);
  }
  async setProfileStatus(
    _tenantId: string,
    id: string,
    status: MarketingProfile["status"],
  ) {
    const profile = this.profiles.find((item) => item.id === id);
    if (!profile) throw new Error("MARKETING_PROFILE_NOT_FOUND");
    profile.status = status;
    profile.version += 1;
    profile.updatedAt = DEMO_NOW;
    if (status === "SUBSCRIBED") {
      profile.subscribedAt = DEMO_NOW;
      profile.confirmedAt = DEMO_NOW;
      profile.unsubscribedAt = undefined;
    }
    if (status === "UNSUBSCRIBED") profile.unsubscribedAt = DEMO_NOW;
    return structuredClone(profile);
  }
  async updateProfileTopics(_tenantId: string, id: string, topics: string[]) {
    const profile = this.profiles.find((item) => item.id === id);
    if (!profile) throw new Error("MARKETING_PROFILE_NOT_FOUND");
    profile.topics = [...new Set(topics)];
    profile.version += 1;
    profile.updatedAt = DEMO_NOW;
    return structuredClone(profile);
  }
  async createActionToken(
    tenantId: string,
    profileId: string,
    purpose: MarketingActionPurpose,
    tokenHash: string,
    expiresAt: string,
  ) {
    this.actionTokens.push({
      id: randomUUID(),
      tenantId,
      profileId,
      purpose,
      tokenHash,
      expiresAt,
    });
  }
  async getActionToken(tokenHash: string, purpose: MarketingActionPurpose) {
    return structuredClone(
      this.actionTokens.find(
        (item) => item.tokenHash === tokenHash && item.purpose === purpose,
      ) ?? null,
    );
  }
  async markActionTokenUsed(id: string) {
    const token = this.actionTokens.find((item) => item.id === id);
    if (token) token.usedAt = DEMO_NOW;
  }
  async appendConsent() {
    return;
  }
  async listLists() {
    return structuredClone(this.lists);
  }
  async createList(context: MarketingTenantContext, input: MarketingListInput) {
    const value: MarketingList = {
      id: randomUUID(),
      tenantId: context.tenantId,
      workspaceId: context.workspaceId,
      ...input,
      memberCount: 0,
      version: 1,
      createdAt: DEMO_NOW,
      updatedAt: DEMO_NOW,
    };
    this.lists.unshift(value);
    this.listMembers.set(value.id, new Set());
    return structuredClone(value);
  }
  async getListMemberIds(_tenantId: string, listIds: string[]) {
    return [
      ...new Set(
        listIds.flatMap((id) => [...(this.listMembers.get(id) ?? [])]),
      ),
    ];
  }
  async addListMember(_tenantId: string, listId: string, profileId: string) {
    const members = this.listMembers.get(listId) ?? new Set<string>();
    members.add(profileId);
    this.listMembers.set(listId, members);
    const list = this.lists.find((item) => item.id === listId);
    if (list) list.memberCount = members.size;
  }
  async listSegments() {
    return structuredClone(this.segments);
  }
  async createSegment(
    context: MarketingTenantContext,
    input: MarketingSegmentInput,
  ) {
    const value: MarketingSegment = {
      id: randomUUID(),
      tenantId: context.tenantId,
      workspaceId: context.workspaceId,
      ...input,
      estimatedCount: 0,
      version: 1,
      createdAt: DEMO_NOW,
      updatedAt: DEMO_NOW,
    };
    this.segments.unshift(value);
    return structuredClone(value);
  }
  async updateSegmentEstimate(_tenantId: string, id: string, count: number) {
    const segment = this.segments.find((item) => item.id === id);
    if (segment) {
      segment.estimatedCount = count;
      segment.lastEstimatedAt = DEMO_NOW;
    }
  }
  async listTemplates() {
    return structuredClone(this.templates);
  }
  async createTemplate(
    context: MarketingTenantContext,
    input: MarketingTemplateInput,
  ) {
    const value: MarketingTemplate = {
      id: randomUUID(),
      tenantId: context.tenantId,
      workspaceId: context.workspaceId,
      ...input,
      currentVersion: 1,
      createdAt: DEMO_NOW,
      updatedAt: DEMO_NOW,
    };
    this.templates.unshift(value);
    return structuredClone(value);
  }
  async listCampaigns() {
    return structuredClone(this.campaigns);
  }
  async getCampaign(_tenantId: string, id: string) {
    return structuredClone(
      this.campaigns.find((campaign) => campaign.id === id) ?? null,
    );
  }
  async createCampaign(
    context: MarketingTenantContext,
    input: MarketingCampaignInput,
    actorId: string,
  ) {
    const value: MarketingCampaign = {
      id: randomUUID(),
      tenantId: context.tenantId,
      workspaceId: context.workspaceId,
      campaignType: input.campaignType ?? "NEWSLETTER",
      status: "DRAFT",
      locale: input.locale ?? context.locale,
      timezone: input.timezone ?? context.timezone,
      currentVersion: 1,
      createdBy: actorId || DEMO_ACTOR_ID,
      createdAt: DEMO_NOW,
      updatedAt: DEMO_NOW,
      ...input,
    };
    this.campaigns.unshift(value);
    return structuredClone(value);
  }
  async setCampaignStatus(
    _tenantId: string,
    id: string,
    status: MarketingCampaignStatus,
    timestamps: Partial<
      Pick<MarketingCampaign, "scheduledAt" | "startedAt" | "completedAt">
    > = {},
  ) {
    const campaign = this.campaigns.find((item) => item.id === id);
    if (!campaign) throw new Error("MARKETING_CAMPAIGN_NOT_FOUND");
    Object.assign(campaign, timestamps, { status, updatedAt: DEMO_NOW });
    return structuredClone(campaign);
  }
  async listSenderIdentities() {
    return structuredClone(demoSenders);
  }
  async listSuppressions() {
    return structuredClone(this.suppressions);
  }
  async suppress(
    contextTenantId: string,
    profile: MarketingProfile,
    reason: MarketingSuppressionReason,
    source: string,
  ) {
    const existing = this.suppressions.find(
      (item) =>
        item.normalizedEmail === profile.normalizedEmail &&
        item.reason === reason &&
        !item.releasedAt,
    );
    if (existing) return structuredClone(existing);
    const value: MarketingSuppression = {
      id: randomUUID(),
      tenantId: contextTenantId,
      normalizedEmail: profile.normalizedEmail,
      profileId: profile.id,
      reason,
      source,
      occurredAt: DEMO_NOW,
      createdAt: DEMO_NOW,
      updatedAt: DEMO_NOW,
    };
    this.suppressions.unshift(value);
    return structuredClone(value);
  }
  async releaseSuppression(
    _tenantId: string,
    normalizedEmail: string,
    reason: MarketingSuppressionReason,
  ) {
    this.suppressions
      .filter(
        (item) =>
          item.normalizedEmail === normalizedEmail &&
          item.reason === reason &&
          !item.releasedAt,
      )
      .forEach((item) => {
        item.releasedAt = DEMO_NOW;
      });
  }
  async getActiveSuppressedEmails() {
    return new Set(
      this.suppressions
        .filter((item) => !item.releasedAt)
        .map((item) => item.normalizedEmail),
    );
  }
  async getRecentRecipientProfileIds() {
    return new Set(this.recipientProfileIds);
  }
  async getRecipientCounts() {
    return new Map<string, number>();
  }
  async createAudienceSnapshot(
    _tenantId: string,
    campaign: MarketingCampaign,
    recipients: MarketingRecipientSeed[],
  ) {
    recipients
      .filter((item) => item.eligibilityStatus === "ELIGIBLE")
      .forEach((item) => this.recipientProfileIds.add(item.profileId));
    return {
      versionId: `demo_version_${campaign.id}_${campaign.currentVersion}`,
      recipientCount: recipients.length,
    };
  }
  async enqueueCampaign() {
    return;
  }
  async resumeCampaign() {
    return;
  }
  async cancelCampaignDispatch() {
    return;
  }
  async setCampaignApproval(
    _tenantId: string,
    campaignId: string,
    status: MarketingCampaignStatus,
    actorId?: string,
  ) {
    const campaign = this.campaigns.find((item) => item.id === campaignId);
    if (!campaign) throw new Error("MARKETING_CAMPAIGN_NOT_FOUND");
    campaign.status = status;
    campaign.approvedBy = actorId;
    campaign.updatedAt = DEMO_NOW;
    return structuredClone(campaign);
  }
  async setCampaignWinner(
    _tenantId: string,
    campaignId: string,
    variantId: string,
  ) {
    const campaign = this.campaigns.find((item) => item.id === campaignId);
    if (!campaign) throw new Error("MARKETING_CAMPAIGN_NOT_FOUND");
    campaign.winningVariantId = variantId;
    campaign.updatedAt = DEMO_NOW;
    return structuredClone(campaign);
  }
  async addAudit() {
    return;
  }
}

function mapProfile(row: any): MarketingProfile {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    workspaceId: row.workspace_id,
    accountUserId: row.account_user_id ?? undefined,
    crmContactId: row.crm_contact_id ?? undefined,
    email: row.email,
    normalizedEmail: row.normalized_email,
    firstName: row.first_name ?? undefined,
    lastName: row.last_name ?? undefined,
    status: row.status,
    locale: row.locale,
    timezone: row.timezone,
    country: row.country,
    source: row.source,
    sourceDetail: row.source_detail ?? undefined,
    topics: row.topics ?? [],
    customValues: row.custom_values ?? {},
    subscribedAt: row.subscribed_at ?? undefined,
    confirmedAt: row.confirmed_at ?? undefined,
    unsubscribedAt: row.unsubscribed_at ?? undefined,
    lastEngagedAt: row.last_engaged_at ?? undefined,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
function mapList(row: any): MarketingList {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description ?? undefined,
    status: row.status,
    memberCount: Number(row.member_count ?? 0),
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
function mapSegment(row: any): MarketingSegment {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description ?? undefined,
    definition: row.definition,
    status: row.status,
    estimatedCount: row.estimated_count,
    lastEstimatedAt: row.last_estimated_at ?? undefined,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PostgresMarketingRepository implements IMarketingRepository {
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
    const memberships: any[] = await this.query(
      "marketing.resolveTenantId",
      this.client
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at")
        .limit(1),
    );
    return memberships[0]?.organization_id ?? null;
  }
  async resolveTenantContext(userId: string) {
    const tenantId = await this.resolveTenantId(userId);
    if (!tenantId) return null;
    const rows: any[] = await this.query(
      "marketing.getWorkspace",
      this.client
        .from("marketing_workspaces")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at")
        .limit(1),
    );
    const row = rows[0];
    return row
      ? {
          tenantId,
          workspaceId: row.id,
          marketCode: row.market_code,
          locale: row.default_locale,
          timezone: row.timezone,
          approvalRequired: row.approval_required,
          doubleOptIn: row.double_opt_in,
          frequencyCapDay: row.frequency_cap_day,
          frequencyCapWeek: row.frequency_cap_week,
          defaultProviderConnectionId:
            row.default_provider_connection_id ?? undefined,
        }
      : null;
  }
  async resolvePublicContext(marketCode: string) {
    const rows: any[] = await this.query(
      "marketing.getPublicWorkspace",
      this.client
        .from("marketing_workspaces")
        .select("*")
        .eq("market_code", marketCode)
        .order("created_at")
        .limit(1),
    );
    const row = rows[0];
    return row
      ? {
          tenantId: row.tenant_id,
          workspaceId: row.id,
          marketCode: row.market_code,
          locale: row.default_locale,
          timezone: row.timezone,
          approvalRequired: row.approval_required,
          doubleOptIn: row.double_opt_in,
          frequencyCapDay: row.frequency_cap_day,
          frequencyCapWeek: row.frequency_cap_week,
          defaultProviderConnectionId:
            row.default_provider_connection_id ?? undefined,
        }
      : null;
  }
  async provisionTenant(tenantId: string) {
    const orgRows: any[] = await this.query(
      "marketing.getTenant",
      this.client
        .from("organizations")
        .select("country")
        .eq("id", tenantId)
        .limit(1),
    );
    const marketCode = requireMarketCode(orgRows[0]?.country);
    const country = getCountryConfig(marketCode)!;
    const row: any = await this.query(
      "marketing.provisionWorkspace",
      this.client
        .from("marketing_workspaces")
        .insert({
          tenant_id: tenantId,
          name: "Marketing",
          market_code: marketCode,
          default_locale: country.defaultLocale,
          timezone: country.timezone,
          settings: { isDefault: true },
        })
        .select("*")
        .single(),
    );
    return {
      tenantId,
      workspaceId: row.id,
      marketCode: row.market_code,
      locale: row.default_locale,
      timezone: row.timezone,
      approvalRequired: row.approval_required,
      doubleOptIn: row.double_opt_in,
      frequencyCapDay: row.frequency_cap_day,
      frequencyCapWeek: row.frequency_cap_week,
      defaultProviderConnectionId:
        row.default_provider_connection_id ?? undefined,
    };
  }
  async dashboard(tenantId: string): Promise<MarketingDashboard> {
    const [profiles, campaigns, recipients, events, workspaces] =
      await Promise.all([
        this.query<any[]>(
          "marketing.dashboardProfiles",
          this.client
            .from("marketing_profiles")
            .select("status")
            .eq("tenant_id", tenantId),
        ),
        this.query<any[]>(
          "marketing.dashboardCampaigns",
          this.client
            .from("marketing_campaigns")
            .select("status")
            .eq("tenant_id", tenantId),
        ),
        this.query<any[]>(
          "marketing.dashboardRecipients",
          this.client
            .from("marketing_campaign_recipients")
            .select("send_status")
            .eq("tenant_id", tenantId),
        ),
        this.query<any[]>(
          "marketing.dashboardEvents",
          this.client
            .from("marketing_delivery_events")
            .select("event_type,recipient_id")
            .eq("tenant_id", tenantId),
        ),
        this.query<any[]>(
          "marketing.dashboardWorkspace",
          this.client
            .from("marketing_workspaces")
            .select("default_provider_connection_id")
            .eq("tenant_id", tenantId)
            .limit(1),
        ),
      ]);
    const accepted = recipients.filter((row) =>
      ["ACCEPTED", "DELIVERED"].includes(row.send_status),
    ).length;
    const delivered = recipients.filter(
      (row) => row.send_status === "DELIVERED",
    ).length;
    const uniqueClicks = new Set(
      events
        .filter((row) => row.event_type === "CLICKED")
        .map((row) => row.recipient_id)
        .filter(Boolean),
    ).size;
    return {
      activeProfiles: profiles.filter((row) => row.status === "SUBSCRIBED")
        .length,
      pendingProfiles: profiles.filter((row) => row.status === "PENDING")
        .length,
      suppressedProfiles: profiles.filter((row) =>
        ["SUPPRESSED", "BOUNCED", "COMPLAINED"].includes(row.status),
      ).length,
      campaignsSent: campaigns.filter((row) => row.status === "COMPLETED")
        .length,
      scheduledCampaigns: campaigns.filter((row) => row.status === "SCHEDULED")
        .length,
      delivered,
      deliveryRate: accepted ? delivered / accepted : 0,
      uniqueClicks,
      clickThroughRate: delivered ? uniqueClicks / delivered : 0,
      unsubscribes: events.filter((row) => row.event_type === "UNSUBSCRIBED")
        .length,
      providerConfigured: Boolean(
        workspaces[0]?.default_provider_connection_id,
      ),
    };
  }
  async listProfiles(tenantId: string, options: MarketingListOptions = {}) {
    let query = this.client
      .from("marketing_profiles")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(Math.min(options.limit ?? 50, 100));
    if (options.cursor) {
      const cursor = decodeProfileCursor(options.cursor);
      query = query.or(
        `updated_at.lt.${cursor.updatedAt},and(updated_at.eq.${cursor.updatedAt},id.lt.${cursor.id})`,
      );
    }
    if (options.status) query = query.eq("status", options.status);
    if (options.query) query = query.ilike("email", `%${options.query}%`);
    const rows: any[] = await this.query("marketing.listProfiles", query);
    return {
      items: rows.map(mapProfile),
      nextCursor:
        rows.length === Math.min(options.limit ?? 50, 100)
          ? encodeProfileCursor(rows.at(-1))
          : undefined,
    };
  }
  async listAllProfiles(tenantId: string) {
    const rows: any[] = await this.query(
      "marketing.listAllProfiles",
      this.client
        .from("marketing_profiles")
        .select("*")
        .eq("tenant_id", tenantId),
    );
    return rows.map(mapProfile);
  }
  async getProfile(tenantId: string, id: string) {
    const rows: any[] = await this.query(
      "marketing.getProfile",
      this.client
        .from("marketing_profiles")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .limit(1),
    );
    return rows[0] ? mapProfile(rows[0]) : null;
  }
  async findProfileByEmail(tenantId: string, normalizedEmail: string) {
    const rows: any[] = await this.query(
      "marketing.findProfile",
      this.client
        .from("marketing_profiles")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("normalized_email", normalizedEmail)
        .limit(1),
    );
    return rows[0] ? mapProfile(rows[0]) : null;
  }
  async findProfileByAccountUserId(tenantId: string, accountUserId: string) {
    const rows: any[] = await this.query(
      "marketing.findProfileByAccount",
      this.client
        .from("marketing_profiles")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("account_user_id", accountUserId)
        .limit(1),
    );
    return rows[0] ? mapProfile(rows[0]) : null;
  }
  async saveProfile(
    context: MarketingTenantContext,
    input: MarketingProfileInput,
  ) {
    const email = input.email.trim().toLowerCase();
    const existing = await this.findProfileByEmail(context.tenantId, email);
    if (existing) {
      const payload: Record<string, unknown> = { email };
      if (input.accountUserId !== undefined)
        payload.account_user_id = input.accountUserId;
      if (input.crmContactId !== undefined)
        payload.crm_contact_id = input.crmContactId;
      if (input.firstName !== undefined) payload.first_name = input.firstName;
      if (input.lastName !== undefined) payload.last_name = input.lastName;
      if (input.locale !== undefined) payload.locale = input.locale;
      if (input.timezone !== undefined) payload.timezone = input.timezone;
      if (input.country !== undefined) payload.country = input.country;
      if (input.source !== undefined) payload.source = input.source;
      if (input.sourceDetail !== undefined)
        payload.source_detail = input.sourceDetail;
      if (input.topics !== undefined) payload.topics = input.topics;
      if (input.customValues !== undefined)
        payload.custom_values = input.customValues;
      const row: any = await this.query(
        "marketing.updateProfile",
        this.client
          .from("marketing_profiles")
          .update(payload)
          .eq("tenant_id", context.tenantId)
          .eq("id", existing.id)
          .select("*")
          .single(),
      );
      return mapProfile(row);
    }
    const payload = {
      tenant_id: context.tenantId,
      workspace_id: context.workspaceId,
      account_user_id: input.accountUserId ?? null,
      crm_contact_id: input.crmContactId ?? null,
      email,
      first_name: input.firstName ?? null,
      last_name: input.lastName ?? null,
      locale: input.locale ?? context.locale,
      timezone: input.timezone ?? context.timezone,
      country: input.country ?? context.marketCode,
      source: input.source ?? "API",
      source_detail: input.sourceDetail ?? null,
      topics: input.topics ?? [],
      custom_values: input.customValues ?? {},
      status: context.doubleOptIn ? "PENDING" : "SUBSCRIBED",
      ...(context.doubleOptIn
        ? {}
        : {
            subscribed_at: new Date().toISOString(),
            confirmed_at: new Date().toISOString(),
          }),
    };
    const row: any = await this.query(
      "marketing.saveProfile",
      this.client
        .from("marketing_profiles")
        .insert(payload)
        .select("*")
        .single(),
    );
    return mapProfile(row);
  }
  async setProfileStatus(
    tenantId: string,
    id: string,
    status: MarketingProfile["status"],
  ) {
    const now = new Date().toISOString();
    const row: any = await this.query(
      "marketing.setProfileStatus",
      this.client
        .from("marketing_profiles")
        .update({
          status,
          ...(status === "SUBSCRIBED"
            ? { subscribed_at: now, confirmed_at: now, unsubscribed_at: null }
            : {}),
          ...(status === "UNSUBSCRIBED" ? { unsubscribed_at: now } : {}),
        })
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .select("*")
        .single(),
    );
    return mapProfile(row);
  }
  async updateProfileTopics(tenantId: string, id: string, topics: string[]) {
    const row: any = await this.query(
      "marketing.updateProfileTopics",
      this.client
        .from("marketing_profiles")
        .update({ topics: [...new Set(topics)] })
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .select("*")
        .single(),
    );
    return mapProfile(row);
  }
  async createActionToken(
    tenantId: string,
    profileId: string,
    purpose: MarketingActionPurpose,
    tokenHash: string,
    expiresAt: string,
  ) {
    await this.query(
      "marketing.createActionToken",
      this.client.from("marketing_action_tokens").insert({
        tenant_id: tenantId,
        profile_id: profileId,
        purpose,
        token_hash: tokenHash,
        expires_at: expiresAt,
      }),
    );
  }
  async getActionToken(tokenHash: string, purpose: MarketingActionPurpose) {
    const rows: any[] = await this.query(
      "marketing.getActionToken",
      this.client
        .from("marketing_action_tokens")
        .select("*")
        .eq("token_hash", tokenHash)
        .eq("purpose", purpose)
        .limit(1),
    );
    const row = rows[0];
    return row
      ? {
          id: row.id,
          tenantId: row.tenant_id,
          profileId: row.profile_id,
          purpose: row.purpose,
          expiresAt: row.expires_at,
          usedAt: row.used_at ?? undefined,
        }
      : null;
  }
  async markActionTokenUsed(id: string) {
    await this.query(
      "marketing.useActionToken",
      this.client
        .from("marketing_action_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("id", id)
        .is("used_at", null),
    );
  }
  async appendConsent(tenantId: string, record: MarketingConsentRecord) {
    await this.query(
      "marketing.appendConsent",
      this.client.from("communication_consents").insert({
        tenant_id: tenantId,
        subject_type: "MARKETING_PROFILE",
        subject_id: record.subjectId,
        normalized_email: record.normalizedEmail,
        channel: "EMAIL",
        purpose: "MARKETING",
        status: record.status,
        legal_basis: "CONSENT",
        source: record.source,
        evidence: { method: "explicit_checkbox" },
        consent_version: record.consentVersion,
        confirmed_at: record.confirmedAt ?? null,
        withdrawn_at: record.withdrawnAt ?? null,
      }),
    );
  }
  async listLists(tenantId: string) {
    const rows: any[] = await this.query(
      "marketing.listLists",
      this.client
        .from("marketing_lists")
        .select("*,marketing_list_memberships(count)")
        .eq("tenant_id", tenantId)
        .order("updated_at", { ascending: false }),
    );
    return rows.map((row) =>
      mapList({
        ...row,
        member_count: row.marketing_list_memberships?.[0]?.count ?? 0,
      }),
    );
  }
  async createList(context: MarketingTenantContext, input: MarketingListInput) {
    const row: any = await this.query(
      "marketing.createList",
      this.client
        .from("marketing_lists")
        .insert({
          tenant_id: context.tenantId,
          workspace_id: context.workspaceId,
          name: input.name,
          description: input.description ?? null,
          status: input.status,
        })
        .select("*")
        .single(),
    );
    return mapList(row);
  }
  async getListMemberIds(tenantId: string, listIds: string[]) {
    if (!listIds.length) return [];
    const rows: any[] = await this.query(
      "marketing.listMembers",
      this.client
        .from("marketing_list_memberships")
        .select("profile_id")
        .eq("tenant_id", tenantId)
        .in("list_id", listIds),
    );
    return [...new Set(rows.map((row) => row.profile_id))];
  }
  async addListMember(
    tenantId: string,
    listId: string,
    profileId: string,
    source: string,
  ) {
    await this.query(
      "marketing.addListMember",
      this.client.from("marketing_list_memberships").upsert(
        {
          tenant_id: tenantId,
          list_id: listId,
          profile_id: profileId,
          source,
        },
        { onConflict: "list_id,profile_id" },
      ),
    );
  }
  async listSegments(tenantId: string) {
    const rows: any[] = await this.query(
      "marketing.listSegments",
      this.client
        .from("marketing_segments")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("updated_at", { ascending: false }),
    );
    return rows.map(mapSegment);
  }
  async createSegment(
    context: MarketingTenantContext,
    input: MarketingSegmentInput,
  ) {
    const row: any = await this.query(
      "marketing.createSegment",
      this.client
        .from("marketing_segments")
        .insert({
          tenant_id: context.tenantId,
          workspace_id: context.workspaceId,
          name: input.name,
          description: input.description ?? null,
          definition: input.definition,
          status: input.status,
        })
        .select("*")
        .single(),
    );
    return mapSegment(row);
  }
  async updateSegmentEstimate(tenantId: string, id: string, count: number) {
    await this.query(
      "marketing.segmentEstimate",
      this.client
        .from("marketing_segments")
        .update({
          estimated_count: count,
          last_estimated_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenantId)
        .eq("id", id),
    );
  }
  async listTemplates(tenantId: string) {
    const templates: any[] = await this.query(
      "marketing.listTemplates",
      this.client
        .from("marketing_templates")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("updated_at", { ascending: false }),
    );
    const templateIds = templates.map((row) => row.id);
    const versions: any[] = templateIds.length
      ? await this.query(
          "marketing.listTemplateVersions",
          this.client
            .from("marketing_template_versions")
            .select("*")
            .eq("tenant_id", tenantId)
            .in("template_id", templateIds),
        )
      : [];
    const versionsByKey = new Map(
      versions.map((version) => [
        `${version.template_id}:${version.version}`,
        version,
      ]),
    );
    return templates.map((row) => {
      const version = versionsByKey.get(`${row.id}:${row.current_version}`);
      return {
        id: row.id,
        tenantId: row.tenant_id,
        workspaceId: row.workspace_id,
        name: row.name,
        category: row.category,
        locale: row.locale,
        status: row.status,
        currentVersion: row.current_version,
        subject: version?.subject ?? "",
        previewText: version?.preview_text ?? undefined,
        content: version?.content ?? { blocks: [] },
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      } as MarketingTemplate;
    });
  }
  async createTemplate(
    context: MarketingTenantContext,
    input: MarketingTemplateInput,
    actorId: string,
  ) {
    const row: any = await this.query(
      "marketing.createTemplate",
      this.client
        .from("marketing_templates")
        .insert({
          tenant_id: context.tenantId,
          workspace_id: context.workspaceId,
          name: input.name,
          category: input.category,
          locale: input.locale,
          status: input.status,
        })
        .select("*")
        .single(),
    );
    await this.query(
      "marketing.createTemplateVersion",
      this.client.from("marketing_template_versions").insert({
        tenant_id: context.tenantId,
        template_id: row.id,
        version: 1,
        subject: input.subject,
        preview_text: input.previewText ?? null,
        content: input.content,
        created_by: actorId,
      }),
    );
    return {
      id: row.id,
      tenantId: row.tenant_id,
      workspaceId: row.workspace_id,
      name: row.name,
      category: row.category,
      locale: row.locale,
      status: row.status,
      currentVersion: 1,
      subject: input.subject,
      previewText: input.previewText,
      content: input.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
  private mapCampaignRow(row: any, version: any): MarketingCampaign {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      workspaceId: row.workspace_id,
      name: row.name,
      campaignType: row.campaign_type,
      status: row.status,
      locale: row.locale,
      timezone: row.timezone,
      subject: version?.subject ?? "",
      previewText: version?.preview_text ?? undefined,
      content: version?.content ?? { blocks: [] },
      audience: row.audience_definition,
      templateId: row.template_id ?? undefined,
      templateVersion: row.template_version ?? undefined,
      senderIdentityId: row.sender_identity_id ?? undefined,
      providerConnectionId: row.provider_connection_id ?? undefined,
      replyTo: row.reply_to ?? undefined,
      experiment: version?.experiment?.enabled ? version.experiment : undefined,
      winningVariantId: row.winning_variant_id ?? undefined,
      scheduledAt: row.scheduled_at ?? undefined,
      startedAt: row.started_at ?? undefined,
      completedAt: row.completed_at ?? undefined,
      currentVersion: row.current_version,
      createdBy: row.created_by,
      approvedBy: row.approved_by ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
  private async mapCampaign(row: any): Promise<MarketingCampaign> {
    const versions: any[] = await this.query(
      "marketing.getCampaignVersion",
      this.client
        .from("marketing_campaign_versions")
        .select("*")
        .eq("tenant_id", row.tenant_id)
        .eq("campaign_id", row.id)
        .eq("version", row.current_version)
        .limit(1),
    );
    const version = versions[0];
    return this.mapCampaignRow(row, version);
  }
  async listCampaigns(tenantId: string) {
    const rows: any[] = await this.query(
      "marketing.listCampaigns",
      this.client
        .from("marketing_campaigns")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("updated_at", { ascending: false }),
    );
    const campaignIds = rows.map((row) => row.id);
    const versions: any[] = campaignIds.length
      ? await this.query(
          "marketing.listCampaignVersions",
          this.client
            .from("marketing_campaign_versions")
            .select("*")
            .eq("tenant_id", tenantId)
            .in("campaign_id", campaignIds),
        )
      : [];
    const versionsByKey = new Map(
      versions.map((version) => [
        `${version.campaign_id}:${version.version}`,
        version,
      ]),
    );
    return rows.map((row) =>
      this.mapCampaignRow(
        row,
        versionsByKey.get(`${row.id}:${row.current_version}`),
      ),
    );
  }
  async getCampaign(tenantId: string, id: string) {
    const rows: any[] = await this.query(
      "marketing.getCampaign",
      this.client
        .from("marketing_campaigns")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .limit(1),
    );
    return rows[0] ? this.mapCampaign(rows[0]) : null;
  }
  async createCampaign(
    context: MarketingTenantContext,
    input: MarketingCampaignInput,
    actorId: string,
  ) {
    const row: any = await this.query(
      "marketing.createCampaign",
      this.client
        .from("marketing_campaigns")
        .insert({
          tenant_id: context.tenantId,
          workspace_id: context.workspaceId,
          name: input.name,
          campaign_type: input.campaignType ?? "NEWSLETTER",
          status: "DRAFT",
          locale: input.locale ?? context.locale,
          timezone: input.timezone ?? context.timezone,
          audience_definition: input.audience,
          template_id: input.templateId ?? null,
          template_version: input.templateVersion ?? null,
          sender_identity_id: input.senderIdentityId ?? null,
          provider_connection_id:
            input.providerConnectionId ??
            context.defaultProviderConnectionId ??
            null,
          reply_to: input.replyTo ?? null,
          created_by: actorId,
        })
        .select("*")
        .single(),
    );
    await this.query(
      "marketing.createCampaignVersion",
      this.client.from("marketing_campaign_versions").insert({
        tenant_id: context.tenantId,
        campaign_id: row.id,
        version: 1,
        subject: input.subject,
        preview_text: input.previewText ?? null,
        content: input.content,
        experiment: input.experiment ?? { enabled: false },
        audience_definition: input.audience,
        provider_connection_id:
          input.providerConnectionId ??
          context.defaultProviderConnectionId ??
          null,
        created_by: actorId,
      }),
    );
    return this.mapCampaign(row);
  }
  async setCampaignStatus(
    tenantId: string,
    id: string,
    status: MarketingCampaignStatus,
    timestamps: Partial<
      Pick<MarketingCampaign, "scheduledAt" | "startedAt" | "completedAt">
    > = {},
  ) {
    const row: any = await this.query(
      "marketing.setCampaignStatus",
      this.client
        .from("marketing_campaigns")
        .update({
          status,
          scheduled_at: timestamps.scheduledAt,
          started_at: timestamps.startedAt,
          completed_at: timestamps.completedAt,
        })
        .eq("tenant_id", tenantId)
        .eq("id", id)
        .select("*")
        .single(),
    );
    return this.mapCampaign(row);
  }
  async listSenderIdentities(tenantId: string) {
    const rows: any[] = await this.query(
      "marketing.listSenders",
      this.client
        .from("marketing_sender_identities")
        .select("*")
        .eq("tenant_id", tenantId),
    );
    return rows.map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      workspaceId: row.workspace_id,
      displayName: row.display_name,
      email: row.email,
      replyTo: row.reply_to ?? undefined,
      providerConnectionId: row.provider_connection_id,
      status: row.status,
      verifiedAt: row.verified_at ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }
  async listSuppressions(tenantId: string) {
    const rows: any[] = await this.query(
      "marketing.listSuppressions",
      this.client
        .from("marketing_suppressions")
        .select("*")
        .eq("tenant_id", tenantId)
        .is("released_at", null)
        .order("occurred_at", { ascending: false }),
    );
    return rows.map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      normalizedEmail: row.normalized_email,
      profileId: row.profile_id ?? undefined,
      reason: row.reason,
      source: row.source,
      providerConnectionId: row.provider_connection_id ?? undefined,
      occurredAt: row.occurred_at,
      releasedAt: row.released_at ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }
  async suppress(
    tenantId: string,
    profile: MarketingProfile,
    reason: MarketingSuppressionReason,
    source: string,
  ) {
    const existing: any[] = await this.query(
      "marketing.findSuppression",
      this.client
        .from("marketing_suppressions")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("normalized_email", profile.normalizedEmail)
        .eq("reason", reason)
        .is("released_at", null)
        .limit(1),
    );
    const row: any =
      existing[0] ??
      (await this.query(
        "marketing.suppress",
        this.client
          .from("marketing_suppressions")
          .insert({
            tenant_id: tenantId,
            normalized_email: profile.normalizedEmail,
            profile_id: profile.id,
            reason,
            source,
            occurred_at: new Date().toISOString(),
          })
          .select("*")
          .single(),
      ));
    return {
      id: row.id,
      tenantId: row.tenant_id,
      normalizedEmail: row.normalized_email,
      profileId: row.profile_id ?? undefined,
      reason: row.reason,
      source: row.source,
      occurredAt: row.occurred_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
  async releaseSuppression(
    tenantId: string,
    normalizedEmail: string,
    reason: MarketingSuppressionReason,
    actorId: string,
  ) {
    await this.query(
      "marketing.releaseSuppression",
      this.client
        .from("marketing_suppressions")
        .update({
          released_at: new Date().toISOString(),
          release_reason: "EXPLICIT_RESUBSCRIBE",
          released_by: actorId,
        })
        .eq("tenant_id", tenantId)
        .eq("normalized_email", normalizedEmail)
        .eq("reason", reason)
        .is("released_at", null),
    );
  }
  async getActiveSuppressedEmails(tenantId: string) {
    const rows: any[] = await this.query(
      "marketing.activeSuppressions",
      this.client
        .from("marketing_suppressions")
        .select("normalized_email")
        .eq("tenant_id", tenantId)
        .is("released_at", null),
    );
    return new Set(rows.map((row) => row.normalized_email));
  }
  async getRecentRecipientProfileIds(tenantId: string, since: string) {
    const rows: any[] = await this.query(
      "marketing.recentRecipients",
      this.client
        .from("marketing_campaign_recipients")
        .select("profile_id")
        .eq("tenant_id", tenantId)
        .gte("created_at", since)
        .in("send_status", ["QUEUED", "ACCEPTED", "DELIVERED"]),
    );
    return new Set(rows.map((row) => row.profile_id));
  }
  async getRecipientCounts(tenantId: string, since: string) {
    const rows: any[] = await this.query(
      "marketing.recipientCounts",
      this.client
        .from("marketing_campaign_recipients")
        .select("profile_id")
        .eq("tenant_id", tenantId)
        .gte("created_at", since)
        .in("send_status", ["QUEUED", "ACCEPTED", "DELIVERED"]),
    );
    const counts = new Map<string, number>();
    rows.forEach((row) =>
      counts.set(row.profile_id, (counts.get(row.profile_id) ?? 0) + 1),
    );
    return counts;
  }
  async createAudienceSnapshot(
    tenantId: string,
    campaign: MarketingCampaign,
    recipients: MarketingRecipientSeed[],
  ) {
    const versions: any[] = await this.query(
      "marketing.snapshotVersion",
      this.client
        .from("marketing_campaign_versions")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("campaign_id", campaign.id)
        .eq("version", campaign.currentVersion)
        .limit(1),
    );
    const versionId = versions[0]?.id;
    if (!versionId) throw new Error("MARKETING_CAMPAIGN_VERSION_NOT_FOUND");
    if (recipients.length)
      await this.query(
        "marketing.snapshotRecipients",
        this.client.from("marketing_campaign_recipients").upsert(
          recipients.map((item) => ({
            tenant_id: tenantId,
            campaign_id: campaign.id,
            campaign_version_id: versionId,
            profile_id: item.profileId,
            variant_id: item.variantId ?? "default",
            eligibility_status: item.eligibilityStatus,
            exclusion_reason: item.exclusionReason ?? null,
            send_status:
              item.eligibilityStatus === "ELIGIBLE" ? "QUEUED" : "CANCELLED",
            provider_connection_id: campaign.providerConnectionId ?? null,
            idempotency_key: item.idempotencyKey,
            queued_at:
              item.eligibilityStatus === "ELIGIBLE"
                ? new Date().toISOString()
                : null,
          })),
          { onConflict: "tenant_id,idempotency_key", ignoreDuplicates: true },
        ),
      );
    return { versionId, recipientCount: recipients.length };
  }
  async enqueueCampaign(
    tenantId: string,
    campaignId: string,
    idempotencyKey: string,
    availableAt = new Date().toISOString(),
  ) {
    await this.query(
      "marketing.enqueueCampaign",
      this.client.from("marketing_jobs").upsert(
        {
          tenant_id: tenantId,
          campaign_id: campaignId,
          job_type: "CAMPAIGN_SEND",
          status: "QUEUED",
          available_at: availableAt,
          idempotency_key: idempotencyKey,
          safe_payload: { campaignId },
          started_at: null,
          completed_at: null,
          safe_error_code: null,
        },
        { onConflict: "tenant_id,idempotency_key" },
      ),
    );
  }
  async resumeCampaign(tenantId: string, campaignId: string) {
    await this.query(
      "marketing.resumeCampaign",
      this.client
        .from("marketing_jobs")
        .update({
          status: "QUEUED",
          available_at: new Date().toISOString(),
          started_at: null,
          completed_at: null,
          safe_error_code: null,
        })
        .eq("tenant_id", tenantId)
        .eq("campaign_id", campaignId)
        .in("status", ["CANCELLED", "FAILED"]),
    );
  }
  async cancelCampaignDispatch(tenantId: string, campaignId: string) {
    await Promise.all([
      this.query(
        "marketing.cancelJobs",
        this.client
          .from("marketing_jobs")
          .update({
            status: "CANCELLED",
            completed_at: new Date().toISOString(),
          })
          .eq("tenant_id", tenantId)
          .eq("campaign_id", campaignId)
          .in("status", ["QUEUED", "FAILED"]),
      ),
      this.query(
        "marketing.cancelRecipients",
        this.client
          .from("marketing_campaign_recipients")
          .update({ send_status: "CANCELLED" })
          .eq("tenant_id", tenantId)
          .eq("campaign_id", campaignId)
          .eq("send_status", "QUEUED"),
      ),
    ]);
  }
  async setCampaignApproval(
    tenantId: string,
    campaignId: string,
    status: MarketingCampaignStatus,
    actorId?: string,
  ) {
    const row: any = await this.query(
      "marketing.setCampaignApproval",
      this.client
        .from("marketing_campaigns")
        .update({
          status,
          approved_by: status === "APPROVED" ? (actorId ?? null) : null,
        })
        .eq("tenant_id", tenantId)
        .eq("id", campaignId)
        .select("*")
        .single(),
    );
    return this.mapCampaign(row);
  }
  async setCampaignWinner(
    tenantId: string,
    campaignId: string,
    variantId: string,
  ) {
    const row: any = await this.query(
      "marketing.setCampaignWinner",
      this.client
        .from("marketing_campaigns")
        .update({ winning_variant_id: variantId })
        .eq("tenant_id", tenantId)
        .eq("id", campaignId)
        .is("winning_variant_id", null)
        .select("*")
        .single(),
    );
    return this.mapCampaign(row);
  }
  async addAudit(
    tenantId: string,
    actorId: string | undefined,
    action: string,
    entityType: string,
    entityId?: string,
    changedFields: string[] = [],
  ) {
    await this.query(
      "marketing.audit",
      this.client.from("marketing_audit_events").insert({
        tenant_id: tenantId,
        actor_id: actorId ?? null,
        action,
        entity_type: entityType,
        entity_id: entityId ?? null,
        changed_fields: changedFields,
        safe_context: {},
        correlation_id: randomUUID(),
      }),
    );
  }
}
