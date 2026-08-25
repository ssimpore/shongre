import type {
  AiGenerationResult,
  MarketingAudienceDefinition,
  MarketingAudienceEstimate,
  MarketingCampaign,
  MarketingCampaignInput,
  MarketingConversionInput,
  MarketingDashboard,
  MarketingAnalytics,
  MarketingJourney,
  MarketingJourneyExecution,
  MarketingJourneyInput,
  MarketingUsage,
  MarketingWebhookSubscription,
  MarketingWebhookSubscriptionInput,
  MarketingAiAssistInput,
  MarketingList,
  MarketingListInput,
  MarketingPreflight,
  MarketingProfile,
  MarketingProfileInput,
  MarketingPublicPreferencesUpdate,
  MarketingPublicSubscriptionInput,
  MarketingSegment,
  MarketingSegmentInput,
  MarketingSuppression,
  MarketingTemplate,
  MarketingTemplateInput,
} from "@shongre/contracts";
import type {
  MarketingAccountIdentity,
  MarketingAccountSubscriptionInput,
  MarketingServiceContract,
} from "../../contracts/marketing.contract";

const TENANT_ID = "10000000-0000-4000-8000-000000000001";
const WORKSPACE_ID = "10000000-0000-4000-8000-000000000101";
const PROVIDER_ID = "70000000-0000-4000-8000-000000000001";
const ACTOR_ID = "10000000-0000-4000-8000-000000000301";
const NOW = "2026-08-25T12:00:00.000Z";
let sequence = 900;
const nextUuid = () =>
  `19000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`;

const profilesSeed: MarketingProfile[] = [
  {
    id: "11000000-0000-4000-8000-000000000001",
    tenantId: TENANT_ID,
    workspaceId: WORKSPACE_ID,
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
    customValues: { accountType: "professional", lifecycle: "customer" },
    subscribedAt: "2026-06-10T09:00:00.000Z",
    confirmedAt: "2026-06-10T09:05:00.000Z",
    lastEngagedAt: "2026-08-22T08:10:00.000Z",
    version: 1,
    createdAt: "2026-06-10T09:00:00.000Z",
    updatedAt: "2026-08-22T08:10:00.000Z",
  },
  {
    id: "11000000-0000-4000-8000-000000000002",
    tenantId: TENANT_ID,
    workspaceId: WORKSPACE_ID,
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
    tenantId: TENANT_ID,
    workspaceId: WORKSPACE_ID,
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
];

const listsSeed: MarketingList[] = [
  {
    id: "12000000-0000-4000-8000-000000000001",
    tenantId: TENANT_ID,
    workspaceId: WORKSPACE_ID,
    name: "Newsletter hebdomadaire",
    description: "Sélections éditoriales et nouveautés Shongre.",
    status: "ACTIVE",
    memberCount: 4680,
    version: 1,
    createdAt: "2026-06-01T08:00:00.000Z",
    updatedAt: NOW,
  },
  {
    id: "12000000-0000-4000-8000-000000000002",
    tenantId: TENANT_ID,
    workspaceId: WORKSPACE_ID,
    name: "Professionnels Shongre",
    description: "Produits et conseils pour développer son activité.",
    status: "ACTIVE",
    memberCount: 824,
    version: 1,
    createdAt: "2026-06-01T08:00:00.000Z",
    updatedAt: NOW,
  },
];

const segmentsSeed: MarketingSegment[] = [
  {
    id: "13000000-0000-4000-8000-000000000001",
    tenantId: TENANT_ID,
    workspaceId: WORKSPACE_ID,
    name: "Professionnels engagés",
    description: "Profils Pro abonnés avec engagement récent.",
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
    estimatedCount: 612,
    lastEstimatedAt: NOW,
    version: 1,
    createdAt: "2026-08-01T09:00:00.000Z",
    updatedAt: NOW,
  },
  {
    id: "13000000-0000-4000-8000-000000000002",
    tenantId: TENANT_ID,
    workspaceId: WORKSPACE_ID,
    name: "Particuliers · bons plans",
    description: "Abonnés aux bons plans pour la France.",
    definition: {
      combinator: "AND",
      conditions: [
        { field: "topics", operator: "CONTAINS", value: "deals" },
        { field: "country", operator: "EQUALS", value: "FR" },
      ],
    },
    status: "ACTIVE",
    estimatedCount: 2940,
    lastEstimatedAt: NOW,
    version: 1,
    createdAt: "2026-08-02T09:00:00.000Z",
    updatedAt: NOW,
  },
];

const content = {
  blocks: [
    {
      id: "heading",
      type: "HEADING" as const,
      level: "H1" as const,
      text: "Cette semaine sur Shongre",
    },
    {
      id: "intro",
      type: "PARAGRAPH" as const,
      text: "Une sélection éditoriale préparée pour vous.",
    },
    {
      id: "cta",
      type: "BUTTON" as const,
      label: "Découvrir la sélection",
      href: "https://shongre.example/recherche",
    },
    {
      id: "unsubscribe",
      type: "UNSUBSCRIBE" as const,
      text: "Gérer mes préférences ou me désabonner",
    },
  ],
};

const templatesSeed: MarketingTemplate[] = [
  {
    id: "14000000-0000-4000-8000-000000000001",
    tenantId: TENANT_ID,
    workspaceId: WORKSPACE_ID,
    name: "Sélection Shongre",
    category: "NEWSLETTER",
    locale: "fr-FR",
    status: "ACTIVE",
    currentVersion: 1,
    subject: "Les nouveautés Shongre choisies pour vous",
    previewText: "Découvrez nos sélections, conseils et nouveautés.",
    content,
    createdAt: "2026-08-01T09:00:00.000Z",
    updatedAt: NOW,
  },
];

const campaignsSeed: MarketingCampaign[] = [
  {
    id: "15000000-0000-4000-8000-000000000001",
    tenantId: TENANT_ID,
    workspaceId: WORKSPACE_ID,
    name: "Sélection design — août",
    campaignType: "NEWSLETTER",
    status: "COMPLETED",
    locale: "fr-FR",
    timezone: "Europe/Paris",
    subject: "Les pièces design qui ont marqué la semaine",
    previewText: "Notre sélection éditoriale Shongre.",
    content,
    audience: {
      includeListIds: [listsSeed[0].id],
      includeSegmentIds: [],
      includeProfileIds: [],
      excludeListIds: [],
      excludeSegmentIds: [],
      excludeProfileIds: [],
    },
    templateId: templatesSeed[0].id,
    templateVersion: 1,
    senderIdentityId: "16000000-0000-4000-8000-000000000001",
    providerConnectionId: PROVIDER_ID,
    currentVersion: 1,
    createdBy: ACTOR_ID,
    startedAt: "2026-08-20T08:00:00.000Z",
    completedAt: "2026-08-20T08:02:00.000Z",
    createdAt: "2026-08-18T09:00:00.000Z",
    updatedAt: "2026-08-20T08:02:00.000Z",
  },
  {
    id: "15000000-0000-4000-8000-000000000002",
    tenantId: TENANT_ID,
    workspaceId: WORKSPACE_ID,
    name: "Nouveautés Pro — septembre",
    campaignType: "ANNOUNCEMENT",
    status: "DRAFT",
    locale: "fr-FR",
    timezone: "Europe/Paris",
    subject: "De nouveaux outils pour développer votre activité",
    previewText: "Découvrez les prochaines évolutions de Shongre Pro.",
    content,
    audience: {
      includeListIds: [],
      includeSegmentIds: [segmentsSeed[0].id],
      includeProfileIds: [],
      excludeListIds: [],
      excludeSegmentIds: [],
      excludeProfileIds: [],
    },
    senderIdentityId: "16000000-0000-4000-8000-000000000001",
    providerConnectionId: PROVIDER_ID,
    currentVersion: 1,
    createdBy: ACTOR_ID,
    createdAt: "2026-08-24T09:00:00.000Z",
    updatedAt: "2026-08-24T09:00:00.000Z",
  },
];

export class DemoMarketingService implements MarketingServiceContract {
  private profiles = structuredClone(profilesSeed);
  private lists = structuredClone(listsSeed);
  private segments = structuredClone(segmentsSeed);
  private templates = structuredClone(templatesSeed);
  private campaigns = structuredClone(campaignsSeed);
  private suppressions: MarketingSuppression[] = [];
  private journeys: MarketingJourney[] = [
    {
      id: "18000000-0000-4000-8000-000000000001",
      tenantId: TENANT_ID,
      workspaceId: WORKSPACE_ID,
      name: "Bienvenue après confirmation",
      description: "Accueil versionné après double opt-in.",
      status: "ACTIVE",
      currentVersion: 1,
      definition: {
        trigger: { type: "SUBSCRIBER_CONFIRMED", configuration: {} },
        entryNodeId: "welcome",
        nodes: [
          {
            id: "welcome",
            type: "SEND_EMAIL",
            nextNodeId: "wait",
            configuration: { templateId: templatesSeed[0].id },
          },
          {
            id: "wait",
            type: "WAIT",
            nextNodeId: "end",
            configuration: { durationMinutes: 1440 },
          },
          { id: "end", type: "END", configuration: {} },
        ],
        maxExecutionDepth: 50,
      },
      createdBy: ACTOR_ID,
      createdAt: NOW,
      updatedAt: NOW,
    },
  ];
  private journeyExecutions: MarketingJourneyExecution[] = [];
  private webhookSubscriptions: MarketingWebhookSubscription[] = [];
  private actionTokens = new Map<
    string,
    { profileId: string; purpose: "CONFIRM" | "PREFERENCES" | "UNSUBSCRIBE" }
  >([
    [
      "demo-confirm-pending-example-fr-00000000000000000000",
      { profileId: profilesSeed[2].id, purpose: "CONFIRM" },
    ],
    [
      "demo-preferences-camille-example-fr-0000000000000000",
      { profileId: profilesSeed[1].id, purpose: "PREFERENCES" },
    ],
    [
      "demo-unsubscribe-camille-example-fr-0000000000000000",
      { profileId: profilesSeed[1].id, purpose: "UNSUBSCRIBE" },
    ],
  ]);
  private subscriptionView(profile: MarketingProfile) {
    return {
      id: profile.id,
      email: profile.email,
      marketCode: profile.country,
      locale: profile.locale,
      status: profile.status,
      topics: [...profile.topics],
      subscribedAt: profile.subscribedAt,
      confirmedAt: profile.confirmedAt,
      unsubscribedAt: profile.unsubscribedAt,
    };
  }
  async subscribePublic(input: MarketingPublicSubscriptionInput) {
    const email = input.email.trim().toLowerCase();
    const existing = this.profiles.find(
      (profile) => profile.normalizedEmail === email,
    );
    if (existing)
      return {
        accepted: true as const,
        status: "UNCHANGED" as const,
        message:
          "Si cette adresse est éligible, des instructions lui seront envoyées.",
      };
    const profile = await this.createProfile({
      email,
      locale: input.locale,
      country: input.marketCode,
      source: input.source,
      topics: input.topics,
    });
    this.actionTokens.set(
      `demo-confirm-${profile.id}-00000000000000000000000000000000`,
      { profileId: profile.id, purpose: "CONFIRM" },
    );
    return {
      accepted: true as const,
      status: "PENDING_CONFIRMATION" as const,
      message: "Consultez votre messagerie pour confirmer votre inscription.",
    };
  }
  async confirmPublic(token: string) {
    const action = this.actionTokens.get(token);
    if (!action || action.purpose !== "CONFIRM")
      throw new Error("Ce lien est invalide ou a expiré.");
    return this.subscriptionView(await this.confirmProfile(action.profileId));
  }
  async getPublicPreferences(token: string) {
    const action = this.actionTokens.get(token);
    const profile =
      action && action.purpose === "PREFERENCES"
        ? this.profiles.find((item) => item.id === action.profileId)
        : undefined;
    if (!profile) throw new Error("Ce lien est invalide ou a expiré.");
    return this.subscriptionView(profile);
  }
  async updatePublicPreferences(input: MarketingPublicPreferencesUpdate) {
    const action = this.actionTokens.get(input.token);
    const profile =
      action && action.purpose === "PREFERENCES"
        ? this.profiles.find((item) => item.id === action.profileId)
        : undefined;
    if (!profile) throw new Error("Ce lien est invalide ou a expiré.");
    profile.topics = [...new Set(input.topics)];
    profile.updatedAt = NOW;
    return this.subscriptionView(profile);
  }
  async unsubscribePublic(token: string) {
    const action = this.actionTokens.get(token);
    if (!action || action.purpose !== "UNSUBSCRIBE")
      throw new Error("Ce lien est invalide ou a expiré.");
    await this.unsubscribeProfile(action.profileId);
    return {
      accepted: true as const,
      status: "UNCHANGED" as const,
      message: "La désinscription marketing a été prise en compte.",
    };
  }
  private accountProfile(identity: MarketingAccountIdentity) {
    const email = identity.email.trim().toLowerCase();
    return this.profiles.find(
      (profile) =>
        profile.accountUserId === identity.userId ||
        profile.normalizedEmail === email,
    );
  }
  async getAccountSubscription(identity: MarketingAccountIdentity) {
    const profile = this.accountProfile(identity);
    return profile ? this.subscriptionView(profile) : null;
  }
  async subscribeAccount(input: MarketingAccountSubscriptionInput) {
    let profile = this.accountProfile(input);
    if (!profile)
      profile = await this.createProfile({
        accountUserId: input.userId,
        email: input.email,
        locale: input.locale,
        country: input.marketCode ?? "FR",
        source: "ACCOUNT",
        topics: input.topics,
      });
    else {
      profile.accountUserId = input.userId;
      profile.topics = [...new Set(input.topics)];
      profile.status = "PENDING";
      profile.unsubscribedAt = undefined;
      profile.updatedAt = NOW;
      this.suppressions.forEach((item) => {
        if (
          item.normalizedEmail === profile!.normalizedEmail &&
          item.reason === "UNSUBSCRIBED"
        )
          item.releasedAt = NOW;
      });
    }
    return this.subscriptionView(profile);
  }
  async updateAccountPreferences(
    input: MarketingAccountIdentity & { topics: string[] },
  ) {
    const profile = this.accountProfile(input);
    if (!profile) throw new Error("Abonnement introuvable.");
    profile.topics = [...new Set(input.topics)];
    profile.updatedAt = NOW;
    return this.subscriptionView(profile);
  }
  async unsubscribeAccount(identity: MarketingAccountIdentity) {
    const profile = this.accountProfile(identity);
    if (!profile) throw new Error("Abonnement introuvable.");
    return this.subscriptionView(await this.unsubscribeProfile(profile.id));
  }
  async getDashboard(): Promise<MarketingDashboard> {
    return {
      activeProfiles: 4680,
      pendingProfiles: 17,
      suppressedProfiles: 23,
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
  async listProfiles(
    options: { limit?: number; query?: string; status?: string } = {},
  ) {
    const filtered = this.profiles.filter(
      (profile) =>
        (!options.query ||
          profile.email.includes(options.query.toLowerCase())) &&
        (!options.status || profile.status === options.status),
    );
    return {
      items: structuredClone(filtered.slice(0, options.limit ?? 50)),
      pageInfo: { hasNextPage: false },
    };
  }
  async createProfile(input: MarketingProfileInput) {
    const email = input.email.trim().toLowerCase();
    const existing = this.profiles.find(
      (profile) => profile.normalizedEmail === email,
    );
    if (existing) {
      Object.assign(existing, input, {
        email,
        normalizedEmail: email,
        version: existing.version + 1,
        updatedAt: NOW,
      });
      return structuredClone(existing);
    }
    const value: MarketingProfile = {
      id: nextUuid(),
      tenantId: TENANT_ID,
      workspaceId: WORKSPACE_ID,
      ...input,
      email,
      normalizedEmail: email,
      status: "PENDING",
      locale: input.locale ?? "fr-FR",
      timezone: input.timezone ?? "Europe/Paris",
      country: input.country ?? "FR",
      source: input.source ?? "API",
      topics: input.topics ?? [],
      customValues: input.customValues ?? {},
      version: 1,
      createdAt: NOW,
      updatedAt: NOW,
    };
    this.profiles.unshift(value);
    return structuredClone(value);
  }
  async confirmProfile(id: string) {
    const value = this.profiles.find((profile) => profile.id === id);
    if (!value) throw new Error("Profil introuvable.");
    value.status = "SUBSCRIBED";
    value.confirmedAt = NOW;
    value.subscribedAt = NOW;
    return structuredClone(value);
  }
  async unsubscribeProfile(id: string) {
    const value = this.profiles.find((profile) => profile.id === id);
    if (!value) throw new Error("Profil introuvable.");
    value.status = "UNSUBSCRIBED";
    value.unsubscribedAt = NOW;
    this.suppressions.unshift({
      id: nextUuid(),
      tenantId: TENANT_ID,
      normalizedEmail: value.normalizedEmail,
      profileId: value.id,
      reason: "UNSUBSCRIBED",
      source: "DEMO",
      occurredAt: NOW,
      createdAt: NOW,
      updatedAt: NOW,
    });
    return structuredClone(value);
  }
  async listLists() {
    return structuredClone(this.lists);
  }
  async createList(input: MarketingListInput) {
    const value: MarketingList = {
      id: nextUuid(),
      tenantId: TENANT_ID,
      workspaceId: WORKSPACE_ID,
      ...input,
      memberCount: 0,
      version: 1,
      createdAt: NOW,
      updatedAt: NOW,
    };
    this.lists.unshift(value);
    return structuredClone(value);
  }
  async addListMember() {
    return;
  }
  async listSegments() {
    return structuredClone(this.segments);
  }
  async createSegment(input: MarketingSegmentInput) {
    const value: MarketingSegment = {
      id: nextUuid(),
      tenantId: TENANT_ID,
      workspaceId: WORKSPACE_ID,
      ...input,
      estimatedCount: 0,
      lastEstimatedAt: NOW,
      version: 1,
      createdAt: NOW,
      updatedAt: NOW,
    };
    this.segments.unshift(value);
    return structuredClone(value);
  }
  async listTemplates() {
    return structuredClone(this.templates);
  }
  async createTemplate(input: MarketingTemplateInput) {
    const value: MarketingTemplate = {
      id: nextUuid(),
      tenantId: TENANT_ID,
      workspaceId: WORKSPACE_ID,
      ...input,
      currentVersion: 1,
      createdAt: NOW,
      updatedAt: NOW,
    };
    this.templates.unshift(value);
    return structuredClone(value);
  }
  async listCampaigns() {
    return structuredClone(this.campaigns);
  }
  async getCampaign(id: string) {
    return structuredClone(
      this.campaigns.find((campaign) => campaign.id === id) ?? null,
    );
  }
  async createCampaign(input: MarketingCampaignInput) {
    const value: MarketingCampaign = {
      id: nextUuid(),
      tenantId: TENANT_ID,
      workspaceId: WORKSPACE_ID,
      campaignType: input.campaignType ?? "NEWSLETTER",
      status: "DRAFT",
      locale: input.locale ?? "fr-FR",
      timezone: input.timezone ?? "Europe/Paris",
      currentVersion: 1,
      createdBy: ACTOR_ID,
      createdAt: NOW,
      updatedAt: NOW,
      ...input,
    };
    this.campaigns.unshift(value);
    return structuredClone(value);
  }
  async estimateAudience(
    audience: MarketingAudienceDefinition,
  ): Promise<MarketingAudienceEstimate> {
    const selected = audience.includeSegmentIds.includes(segmentsSeed[0].id)
      ? 612
      : audience.includeSegmentIds.includes(segmentsSeed[1].id)
        ? 2940
        : audience.includeListIds.includes(listsSeed[0].id)
          ? 4680
          : audience.includeListIds.includes(listsSeed[1].id)
            ? 824
            : audience.includeProfileIds.length;
    const excluded = Math.min(selected, selected ? 27 : 0);
    return {
      selected,
      eligible: selected - excluded,
      excluded,
      unsubscribed: selected ? 8 : 0,
      suppressed: selected ? 11 : 0,
      invalid: selected ? 3 : 0,
      doNotContact: selected ? 5 : 0,
      duplicate: 0,
      frequencyCapped: 0,
      calculatedAt: NOW,
    };
  }
  async preflight(id: string): Promise<MarketingPreflight> {
    const campaign = await this.getCampaign(id);
    if (!campaign) throw new Error("Campagne introuvable.");
    const audience = await this.estimateAudience(campaign.audience);
    const blockers = [] as MarketingPreflight["blockers"];
    if (!campaign.senderIdentityId)
      blockers.push({
        code: "SENDER_REQUIRED",
        message: "Sélectionnez une identité d’expéditeur vérifiée.",
      });
    if (!campaign.content.blocks.some((block) => block.type === "UNSUBSCRIBE"))
      blockers.push({
        code: "UNSUBSCRIBE_REQUIRED",
        message: "Ajoutez un lien de désabonnement.",
      });
    if (!audience.eligible)
      blockers.push({
        code: "AUDIENCE_INELIGIBLE",
        message: "Aucun destinataire éligible.",
      });
    return {
      campaignId: id,
      blockers,
      warnings: audience.excluded
        ? [
            {
              code: "AUDIENCE_EXCLUSIONS",
              message: `${audience.excluded} destinataires seront exclus.`,
            },
          ]
        : [],
      info: [
        {
          code: "DEMO_PROVIDER",
          message: "Envoi déterministe : aucune requête externe.",
        },
      ],
      audience,
      checkedAt: NOW,
      canSend: blockers.length === 0,
    };
  }
  async testSend(id: string, recipient: string) {
    return {
      externalMessageId: `demo_test_${id}_${recipient.length}`,
      acceptedAt: NOW,
    };
  }
  async send(id: string) {
    const campaign = this.campaigns.find((item) => item.id === id);
    if (!campaign) throw new Error("Campagne introuvable.");
    const validation = await this.preflight(id);
    if (!validation.canSend)
      throw new Error("Le pré-vol contient des blocages.");
    campaign.status = "QUEUED";
    campaign.startedAt = NOW;
    return {
      campaign: structuredClone(campaign),
      queuedRecipients: validation.audience.eligible,
      excludedRecipients: validation.audience.excluded,
    };
  }
  async schedule(id: string, scheduledAt: string) {
    const campaign = this.campaigns.find((item) => item.id === id);
    if (!campaign) throw new Error("Campagne introuvable.");
    campaign.status = "SCHEDULED";
    campaign.scheduledAt = scheduledAt;
    return structuredClone(campaign);
  }
  async pause(id: string) {
    const campaign = this.campaigns.find((item) => item.id === id);
    if (!campaign) throw new Error("Campagne introuvable.");
    campaign.status = "PAUSED";
    return structuredClone(campaign);
  }
  async resume(id: string) {
    const campaign = this.campaigns.find((item) => item.id === id);
    if (!campaign) throw new Error("Campagne introuvable.");
    campaign.status = "QUEUED";
    return structuredClone(campaign);
  }
  async submitForReview(id: string) {
    const campaign = this.campaigns.find((item) => item.id === id);
    if (!campaign) throw new Error("Campagne introuvable.");
    campaign.status = "REVIEW";
    return structuredClone(campaign);
  }
  async approve(id: string) {
    const campaign = this.campaigns.find((item) => item.id === id);
    if (!campaign) throw new Error("Campagne introuvable.");
    campaign.status = "APPROVED";
    campaign.approvedBy = ACTOR_ID;
    return structuredClone(campaign);
  }
  async selectExperimentWinner(id: string, variantId?: string) {
    const campaign = this.campaigns.find((item) => item.id === id);
    if (!campaign) throw new Error("Campagne introuvable.");
    const selected = variantId ?? campaign.experiment?.variants[0]?.id;
    if (!selected) throw new Error("Aucune variante disponible.");
    campaign.winningVariantId = selected;
    return structuredClone(campaign);
  }
  async cancel(id: string) {
    const campaign = this.campaigns.find((item) => item.id === id);
    if (!campaign) throw new Error("Campagne introuvable.");
    campaign.status = "CANCELLED";
    campaign.completedAt = NOW;
    return structuredClone(campaign);
  }
  async listSuppressions() {
    return structuredClone(this.suppressions);
  }
  async generateCampaignDraft(): Promise<AiGenerationResult> {
    return {
      text: "Proposition déterministe : une introduction concise, une preuve concrète et un appel à l’action unique.",
      model: "shongre-demo-deterministic-v1",
      inputUnits: 0,
      outputUnits: 0,
    };
  }
  async aiAssist(input: MarketingAiAssistInput) {
    return {
      text: `Proposition déterministe pour ${input.task}.`,
      model: "shongre-demo-deterministic-v1",
      inputUnits: 0,
      outputUnits: 0,
      draftOnly: true as const,
    };
  }
  async getAnalytics(): Promise<MarketingAnalytics> {
    return {
      audienceSize: 4680,
      eligibleRecipients: 4653,
      attempted: 4653,
      accepted: 4612,
      delivered: 4531,
      deliveryRate: 0.982,
      softBounces: 42,
      hardBounces: 8,
      complaints: 1,
      unsubscribes: 4,
      uniqueOpens: 2104,
      uniqueClicks: 642,
      clickThroughRate: 0.142,
      conversions: 89,
      conversionRate: 0.0196,
      openMetricCaveat:
        "Les ouvertures sont indicatives et peuvent être amplifiées par les protections de confidentialité.",
      variants: [],
      calculatedAt: NOW,
    };
  }
  async recordConversion(_input: MarketingConversionInput) {
    return { accepted: true as const, duplicate: false };
  }
  async getUsage(): Promise<MarketingUsage> {
    return {
      period: "2026-08",
      activeProfiles: 4680,
      attemptedSends: 12840,
      campaignCount: 8,
      automationExecutions: 327,
      apiRequests: 0,
      entitlements: {
        enabled: true,
        maxContacts: 100000,
        maxMonthlySends: 1000000,
        maxLists: 1000,
        maxSegments: 1000,
        maxUsers: 100,
        templates: true,
        automation: true,
        abTesting: true,
        advancedAnalytics: true,
        byoEmail: true,
        platformEmail: false,
        customDomain: true,
        api: true,
        webhooks: true,
        ai: true,
      },
    };
  }
  async listJourneys() {
    return structuredClone(this.journeys);
  }
  async createJourney(input: MarketingJourneyInput) {
    const journey: MarketingJourney = {
      id: nextUuid(),
      tenantId: TENANT_ID,
      workspaceId: WORKSPACE_ID,
      ...input,
      status: "DRAFT",
      currentVersion: 1,
      createdBy: ACTOR_ID,
      createdAt: NOW,
      updatedAt: NOW,
    };
    this.journeys.unshift(journey);
    return structuredClone(journey);
  }
  async activateJourney(id: string) {
    const journey = this.journeys.find((item) => item.id === id);
    if (!journey) throw new Error("Parcours introuvable.");
    journey.status = "ACTIVE";
    return structuredClone(journey);
  }
  async pauseJourney(id: string) {
    const journey = this.journeys.find((item) => item.id === id);
    if (!journey) throw new Error("Parcours introuvable.");
    journey.status = "PAUSED";
    return structuredClone(journey);
  }
  async listJourneyExecutions(journeyId?: string) {
    return structuredClone(
      this.journeyExecutions.filter(
        (item) => !journeyId || item.journeyId === journeyId,
      ),
    );
  }
  async listWebhookSubscriptions() {
    return structuredClone(this.webhookSubscriptions);
  }
  async createWebhookSubscription(input: MarketingWebhookSubscriptionInput) {
    const subscription: MarketingWebhookSubscription = {
      id: nextUuid(),
      tenantId: TENANT_ID,
      workspaceId: WORKSPACE_ID,
      url: input.url,
      eventTypes: input.eventTypes,
      status: "ACTIVE",
      signingSecretHint: "••••DEMO",
      createdAt: NOW,
      updatedAt: NOW,
    };
    this.webhookSubscriptions.unshift(subscription);
    return {
      subscription: structuredClone(subscription),
      signingSecret: "demo-signing-secret-returned-once",
    };
  }
}

export const demoMarketingService = new DemoMarketingService();
