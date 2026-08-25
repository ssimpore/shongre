import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  marketingAudienceDefinitionSchema,
  marketingCampaignInputSchema,
  marketingListInputSchema,
  marketingProfileInputSchema,
  marketingPublicActionSchema,
  marketingPublicPreferencesUpdateSchema,
  marketingPublicSubscriptionInputSchema,
  marketingSegmentInputSchema,
  marketingTemplateInputSchema,
  type MarketingAudienceDefinition,
  type MarketingAudienceEstimate,
  type MarketingCampaign,
  type MarketingPreflight,
  type MarketingProfile,
  type MarketingSubscriptionView,
  type MarketingSegmentCondition,
  type MarketingSegmentGroup,
} from "@shongre/contracts/marketing";
import { z } from "zod";
import {
  type IMarketingRepository,
  DemoMarketingOperationsRepository,
  PostgresMarketingOperationsRepository,
  type IMarketingOperationsRepository,
  type MarketingListOptions,
  type MarketingTenantContext,
  repositories,
} from "../../infrastructure/database/repositories/index.js";
import { capabilityGateways } from "../../integrations/providers/gateways/index.js";
import type { Principal } from "../../shared/auth/principal.js";
import { requireAuthenticated, requirePermission } from "../../shared/auth/principal.js";
import { AppError } from "../../shared/errors/app-error.js";
import { providerConnectionService } from "../providers/provider-connection.service.js";
import { config } from "../../app/config/index.js";
import { logger } from "../../infrastructure/logging/logger.js";

const MARKETING_CONSENT_VERSION = "2026-08-25";

const listOptionsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().min(1).optional(),
  query: z.string().trim().max(255).optional(),
  status: z.string().trim().max(80).optional(),
});

const scheduleSchema = z.object({
  scheduledAt: z.string().datetime({ offset: true }),
});

const testSendSchema = z.object({
  recipient: z.string().email(),
  personalization: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
});

const accountSubscriptionSchema = z.object({
  marketCode: z.string().regex(/^[A-Z]{2}$/).default("FR"),
  locale: z.string().trim().min(2).max(16).default("fr-FR"),
  topics: z.array(z.string().trim().min(1).max(80)).max(100).default([]),
  consentGiven: z.literal(true),
});

const accountPreferencesSchema = accountSubscriptionSchema.pick({ marketCode: true, topics: true });

const allowedSegmentFields = new Set([
  "status",
  "locale",
  "country",
  "source",
  "topics",
  "lastEngagedAt",
  "customValues.accountType",
  "customValues.lifecycle",
  "customValues.doNotContact",
  "customValues.industry",
  "customValues.customerStatus",
]);

function notFound(message: string): never {
  throw new AppError({ code: "NOT_FOUND", message });
}

function normalizedEmail(email: string) {
  return email.trim().toLowerCase();
}

function getValue(profile: MarketingProfile, field: string): unknown {
  if (!allowedSegmentFields.has(field)) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: `Champ de segmentation non autorisé : ${field}.`,
    });
  }
  if (field.startsWith("customValues.")) {
    return profile.customValues[field.slice("customValues.".length)];
  }
  return profile[field as keyof MarketingProfile];
}

function compare(actual: unknown, condition: MarketingSegmentCondition): boolean {
  const expected = condition.value;
  switch (condition.operator) {
    case "EQUALS": return actual === expected;
    case "NOT_EQUALS": return actual !== expected;
    case "EXISTS": return actual !== undefined && actual !== null && actual !== "";
    case "CONTAINS": return Array.isArray(actual) ? actual.includes(expected) : String(actual ?? "").toLowerCase().includes(String(expected ?? "").toLowerCase());
    case "IN": return Array.isArray(expected) && expected.includes(actual as never);
    case "NOT_IN": return Array.isArray(expected) && !expected.includes(actual as never);
    case "GREATER_THAN": return Number(actual) > Number(expected);
    case "LESS_THAN": return Number(actual) < Number(expected);
    case "BEFORE": return new Date(String(actual)).getTime() < new Date(String(expected)).getTime();
    case "AFTER": return new Date(String(actual)).getTime() > new Date(String(expected)).getTime();
  }
}

function matchesGroup(profile: MarketingProfile, group: MarketingSegmentGroup): boolean {
  const values = [
    ...group.conditions.map((condition) => compare(getValue(profile, condition.field), condition)),
    ...(group.groups ?? []).map((nested) => matchesGroup(profile, nested)),
  ];
  if (!values.length) return true;
  return group.combinator === "AND" ? values.every(Boolean) : values.some(Boolean);
}

function validateSegmentGroup(group: MarketingSegmentGroup): void {
  group.conditions.forEach((condition) => getValue({ customValues: {} } as MarketingProfile, condition.field));
  (group.groups ?? []).forEach(validateSegmentGroup);
}

function renderText(campaign: MarketingCampaign, personalization: Record<string, string | number | boolean> = {}) {
  const replace = (value: string) => value.replace(/\{\{\s*([a-zA-Z0-9_]+)(?:\s*\|\s*([^}]+))?\s*\}\}/g, (_match, key, fallback) => String(personalization[key] ?? fallback?.trim() ?? ""));
  const text = campaign.content.plainText ?? campaign.content.blocks.map((block) => {
    if (block.type === "HEADING" || block.type === "PARAGRAPH") return block.text;
    if (block.type === "BUTTON") return `${block.label}: ${block.href}`;
    if (block.type === "UNSUBSCRIBE") return block.text ?? "Se désabonner : {{ unsubscribe_url }}";
    if (block.type === "PREFERENCE_CENTER") return block.text ?? "Gérer mes préférences : {{ preferences_url }}";
    if (block.type === "FOOTER") return block.text ?? "";
    return "";
  }).filter(Boolean).join("\n\n");
  return replace(text);
}

function stableSendKey(campaign: MarketingCampaign, profileId: string, variant = "default") {
  return createHash("sha256")
    .update(`${campaign.tenantId}:${campaign.id}:${campaign.currentVersion}:${profileId}:${variant}`)
    .digest("hex");
}

function selectVariant(campaign: MarketingCampaign, profileId: string) {
  const experiment = campaign.experiment;
  if (!experiment?.enabled) return "default";
  const bucket = Number.parseInt(createHash("sha256").update(`${campaign.id}:${campaign.currentVersion}:${profileId}`).digest("hex").slice(0, 8), 16) % 100;
  if (bucket >= experiment.testPercentage) return experiment.variants[0].id;
  const weightedBucket = Math.floor((bucket / experiment.testPercentage) * 100);
  let cumulative = 0;
  for (const variant of experiment.variants) {
    cumulative += variant.weight;
    if (weightedBucket < cumulative) return variant.id;
  }
  return experiment.variants[0].id;
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function subscriptionView(profile: MarketingProfile, marketCode: string): MarketingSubscriptionView {
  return {
    id: profile.id,
    email: profile.email,
    marketCode,
    locale: profile.locale,
    status: profile.status,
    topics: profile.topics,
    subscribedAt: profile.subscribedAt,
    confirmedAt: profile.confirmedAt,
    unsubscribedAt: profile.unsubscribedAt,
  };
}

export class MarketingService {
  constructor(
    private readonly repository: IMarketingRepository = repositories.marketing,
    private readonly operationsRepository: IMarketingOperationsRepository = config.dataMode === "database" ? new PostgresMarketingOperationsRepository() : new DemoMarketingOperationsRepository(),
  ) {}

  private async context(principal: Principal): Promise<MarketingTenantContext> {
    requireAuthenticated(principal);
    const existing = await this.repository.resolveTenantContext(principal.userId);
    if (existing) return existing;
    const tenantMembership = await this.repository.resolveTenantId(principal.userId);
    if (!tenantMembership) {
      throw new AppError({ code: "FORBIDDEN", message: "Aucun espace professionnel actif n’est associé à ce compte." });
    }
    return this.repository.provisionTenant(tenantMembership, principal.userId);
  }

  private async publicContext(marketCode: string) {
    const context = await this.repository.resolvePublicContext(marketCode);
    if (!context) {
      throw new AppError({ code: "NOT_FOUND", message: "Le programme newsletter n’est pas disponible pour ce marché." });
    }
    return context;
  }

  private async usage(context: MarketingTenantContext) {
    return this.operationsRepository.usage(context.tenantId, context.marketCode);
  }

  private requireMarketingEntitlement(enabled: boolean, entitlement: string) {
    if (!enabled) throw new AppError({ code: "FORBIDDEN", message: "Cette capacité Marketing n’est pas incluse dans les droits actifs.", details: { entitlement } });
  }

  private async emitJourneyEvent(context: MarketingTenantContext, type: "SUBSCRIBER_CREATED" | "SUBSCRIBER_CONFIRMED" | "LIST_JOINED", eventId: string, profileId: string, safeContext: Record<string, unknown> = {}) {
    await this.operationsRepository.enqueueJourneyEvent(context.tenantId, { type, eventId, profileId, safeContext });
  }

  private async actionProfile(rawToken: string, purpose: "CONFIRM" | "PREFERENCES" | "UNSUBSCRIBE", consume: boolean) {
    const token = await this.repository.getActionToken(tokenHash(rawToken), purpose);
    if (!token || new Date(token.expiresAt).getTime() <= Date.now() || (consume && token.usedAt)) {
      throw new AppError({ code: "NOT_FOUND", message: "Ce lien est invalide ou a expiré." });
    }
    const profile = await this.repository.getProfile(token.tenantId, token.profileId);
    if (!profile) throw new AppError({ code: "NOT_FOUND", message: "Ce lien est invalide ou a expiré." });
    if (consume) await this.repository.markActionTokenUsed(token.id);
    return { token, profile };
  }

  private async createPublicToken(tenantId: string, profileId: string, purpose: "CONFIRM" | "PREFERENCES" | "UNSUBSCRIBE", lifetimeDays: number) {
    const raw = randomBytes(32).toString("base64url");
    await this.repository.createActionToken(tenantId, profileId, purpose, tokenHash(raw), new Date(Date.now() + lifetimeDays * 86_400_000).toISOString());
    return raw;
  }

  private async sendDoubleOptIn(context: MarketingTenantContext, profile: MarketingProfile, locale: string) {
    const rawToken = await this.createPublicToken(context.tenantId, profile.id, "CONFIRM", 2);
    const sender = (await this.repository.listSenderIdentities(context.tenantId)).find((item) => item.status === "VERIFIED");
    if (!context.defaultProviderConnectionId || !sender) return;
    try {
      const connection = await providerConnectionService.resolve({ tenantId: context.tenantId, marketCode: context.marketCode }, { capability: "email.marketing", explicitConnectionId: context.defaultProviderConnectionId, feature: "marketing.double_opt_in" });
      const confirmationUrl = `${config.frontendUrl.replace(/\/$/, "")}/newsletter/confirmer?token=${encodeURIComponent(rawToken)}`;
      await capabilityGateways.emailDelivery.send({ tenantId: context.tenantId, connectionId: connection.id, providerId: connection.providerId, capability: "email.marketing", feature: "marketing.double_opt_in", correlationId: randomUUID(), marketCode: context.marketCode, locale }, { to: [profile.email], from: { email: sender.email, name: sender.displayName }, replyTo: sender.replyTo, subject: "Confirmez votre inscription à la newsletter Shongre", textBody: `Confirmez votre inscription : ${confirmationUrl}`, purpose: "TRANSACTIONAL", headers: { "X-Shongre-Consent-Version": MARKETING_CONSENT_VERSION }, idempotencyKey: createHash("sha256").update(`marketing-confirm:${profile.id}:${MARKETING_CONSENT_VERSION}`).digest("hex") });
    } catch (error) {
      logger.error("Marketing double opt-in delivery failed", { errorType: error instanceof Error ? error.name : "UnknownError", profileId: profile.id, tenantId: context.tenantId });
    }
  }

  async subscribePublic(input: unknown) {
    const parsed = marketingPublicSubscriptionInputSchema.parse(input);
    const context = await this.publicContext(parsed.marketCode);
    const email = normalizedEmail(parsed.email);
    const existing = await this.repository.findProfileByEmail(context.tenantId, email);
    if (existing && ["UNSUBSCRIBED", "SUPPRESSED", "BOUNCED", "COMPLAINED", "INVALID"].includes(existing.status)) {
      return { accepted: true as const, status: "UNCHANGED" as const, message: "Si cette adresse est éligible, des instructions lui seront envoyées." };
    }
    if (existing?.status === "SUBSCRIBED") {
      return { accepted: true as const, status: "UNCHANGED" as const, message: "Si cette adresse est éligible, des instructions lui seront envoyées." };
    }
    const profile = await this.repository.saveProfile(context, { email, locale: parsed.locale, country: parsed.marketCode, source: parsed.source, topics: parsed.topics });
    if (!existing) await this.emitJourneyEvent(context, "SUBSCRIBER_CREATED", `profile.created:${profile.id}`, profile.id, { source: parsed.source, marketCode: parsed.marketCode });
    await this.repository.appendConsent(context.tenantId, { subjectId: profile.id, normalizedEmail: profile.normalizedEmail, status: "GRANTED", source: parsed.source, consentVersion: MARKETING_CONSENT_VERSION, ...(context.doubleOptIn ? {} : { confirmedAt: new Date().toISOString() }) });
    if (!context.doubleOptIn) {
      await this.emitJourneyEvent(context, "SUBSCRIBER_CONFIRMED", `profile.confirmed:${profile.id}`, profile.id, { source: parsed.source, marketCode: parsed.marketCode });
      return { accepted: true as const, status: "SUBSCRIBED" as const, message: "Votre inscription a été enregistrée." };
    }
    await this.sendDoubleOptIn(context, profile, parsed.locale);
    return { accepted: true as const, status: "PENDING_CONFIRMATION" as const, message: "Consultez votre messagerie pour confirmer votre inscription." };
  }

  async confirmPublic(input: unknown) {
    const parsed = marketingPublicActionSchema.parse(input);
    const { token, profile } = await this.actionProfile(parsed.token, "CONFIRM", true);
    if ((await this.repository.getActiveSuppressedEmails(token.tenantId)).has(profile.normalizedEmail)) {
      throw new AppError({ code: "CONFLICT", message: "Cette adresse ne peut pas être réactivée automatiquement." });
    }
    const updated = await this.repository.setProfileStatus(token.tenantId, profile.id, "SUBSCRIBED");
    await this.repository.appendConsent(token.tenantId, { subjectId: updated.id, normalizedEmail: updated.normalizedEmail, status: "GRANTED", source: "DOUBLE_OPT_IN", consentVersion: MARKETING_CONSENT_VERSION, confirmedAt: new Date().toISOString() });
    const context = await this.repository.resolvePublicContext(updated.country);
    if (context) await this.emitJourneyEvent(context, "SUBSCRIBER_CONFIRMED", `profile.confirmed:${updated.id}`, updated.id, { source: "DOUBLE_OPT_IN", marketCode: updated.country });
    return subscriptionView(updated, updated.country);
  }

  async getPublicPreferences(rawToken: string) {
    const parsed = marketingPublicActionSchema.parse({ token: rawToken });
    const { profile } = await this.actionProfile(parsed.token, "PREFERENCES", false);
    return subscriptionView(profile, profile.country);
  }

  async updatePublicPreferences(input: unknown) {
    const parsed = marketingPublicPreferencesUpdateSchema.parse(input);
    const { token, profile } = await this.actionProfile(parsed.token, "PREFERENCES", false);
    return subscriptionView(await this.repository.updateProfileTopics(token.tenantId, profile.id, parsed.topics), profile.country);
  }

  async unsubscribePublic(input: unknown) {
    const parsed = marketingPublicActionSchema.parse(input);
    const { token, profile } = await this.actionProfile(parsed.token, "UNSUBSCRIBE", false);
    const updated = profile.status === "UNSUBSCRIBED" ? profile : await this.repository.setProfileStatus(token.tenantId, profile.id, "UNSUBSCRIBED");
    await this.repository.suppress(token.tenantId, updated, "UNSUBSCRIBED", "PUBLIC_TOKEN");
    if (profile.status !== "UNSUBSCRIBED") await this.repository.appendConsent(token.tenantId, { subjectId: updated.id, normalizedEmail: updated.normalizedEmail, status: "WITHDRAWN", source: "UNSUBSCRIBE_LINK", consentVersion: MARKETING_CONSENT_VERSION, withdrawnAt: new Date().toISOString() });
    return { accepted: true as const, status: "UNCHANGED" as const, message: "La désinscription marketing a été prise en compte." };
  }

  async getAccountSubscription(principal: Principal, marketCodeInput: unknown) {
    requireAuthenticated(principal);
    const marketCode = z.string().regex(/^[A-Z]{2}$/).default("FR").parse(marketCodeInput);
    const context = await this.publicContext(marketCode);
    const profile = await this.repository.findProfileByAccountUserId(context.tenantId, principal.userId)
      ?? await this.repository.findProfileByEmail(context.tenantId, normalizedEmail(principal.email));
    return profile ? subscriptionView(profile, context.marketCode) : null;
  }

  async subscribeAccount(principal: Principal, input: unknown) {
    requireAuthenticated(principal);
    const parsed = accountSubscriptionSchema.parse(input);
    const context = await this.publicContext(parsed.marketCode);
    const email = normalizedEmail(principal.email);
    const existing = await this.repository.findProfileByAccountUserId(context.tenantId, principal.userId)
      ?? await this.repository.findProfileByEmail(context.tenantId, email);
    if (existing?.accountUserId && existing.accountUserId !== principal.userId) {
      throw new AppError({ code: "CONFLICT", message: "Cette adresse est déjà liée à un autre profil marketing." });
    }
    if (existing && ["BOUNCED", "COMPLAINED", "SUPPRESSED", "INVALID"].includes(existing.status)) {
      throw new AppError({ code: "CONFLICT", message: "Ce profil ne peut pas être réactivé automatiquement." });
    }
    if (existing?.status === "UNSUBSCRIBED") {
      await this.repository.releaseSuppression(context.tenantId, existing.normalizedEmail, "UNSUBSCRIBED", principal.userId);
    }
    const saved = await this.repository.saveProfile(context, { accountUserId: principal.userId, email, locale: parsed.locale, country: parsed.marketCode, source: "ACCOUNT", topics: parsed.topics });
    if (!existing) await this.emitJourneyEvent(context, "SUBSCRIBER_CREATED", `profile.created:${saved.id}`, saved.id, { source: "ACCOUNT", marketCode: parsed.marketCode });
    const updated = await this.repository.setProfileStatus(context.tenantId, saved.id, context.doubleOptIn ? "PENDING" : "SUBSCRIBED");
    await this.repository.appendConsent(context.tenantId, { subjectId: updated.id, normalizedEmail: updated.normalizedEmail, status: "GRANTED", source: "ACCOUNT", consentVersion: MARKETING_CONSENT_VERSION, ...(context.doubleOptIn ? {} : { confirmedAt: new Date().toISOString() }) });
    if (!context.doubleOptIn) await this.emitJourneyEvent(context, "SUBSCRIBER_CONFIRMED", `profile.confirmed:${updated.id}`, updated.id, { source: "ACCOUNT", marketCode: parsed.marketCode });
    if (context.doubleOptIn) await this.sendDoubleOptIn(context, updated, parsed.locale);
    return subscriptionView(updated, context.marketCode);
  }

  async updateAccountPreferences(principal: Principal, input: unknown) {
    requireAuthenticated(principal);
    const parsed = accountPreferencesSchema.parse(input);
    const context = await this.publicContext(parsed.marketCode);
    const profile = await this.repository.findProfileByAccountUserId(context.tenantId, principal.userId)
      ?? await this.repository.findProfileByEmail(context.tenantId, normalizedEmail(principal.email));
    if (!profile) return notFound("Abonnement marketing introuvable.");
    return subscriptionView(await this.repository.updateProfileTopics(context.tenantId, profile.id, parsed.topics), context.marketCode);
  }

  async unsubscribeAccount(principal: Principal, marketCodeInput: unknown) {
    requireAuthenticated(principal);
    const marketCode = z.string().regex(/^[A-Z]{2}$/).default("FR").parse(marketCodeInput);
    const context = await this.publicContext(marketCode);
    const profile = await this.repository.findProfileByAccountUserId(context.tenantId, principal.userId)
      ?? await this.repository.findProfileByEmail(context.tenantId, normalizedEmail(principal.email));
    if (!profile) return notFound("Abonnement marketing introuvable.");
    const updated = await this.repository.setProfileStatus(context.tenantId, profile.id, "UNSUBSCRIBED");
    await this.repository.suppress(context.tenantId, updated, "UNSUBSCRIBED", "ACCOUNT");
    await this.repository.appendConsent(context.tenantId, { subjectId: updated.id, normalizedEmail: updated.normalizedEmail, status: "WITHDRAWN", source: "ACCOUNT", consentVersion: MARKETING_CONSENT_VERSION, withdrawnAt: new Date().toISOString() });
    return subscriptionView(updated, context.marketCode);
  }

  async dashboard(principal: Principal) {
    requirePermission(principal, "marketing.dashboard.read");
    const context = await this.context(principal);
    return this.repository.dashboard(context.tenantId);
  }

  async listProfiles(principal: Principal, input: unknown) {
    requirePermission(principal, "marketing.profiles.read");
    const context = await this.context(principal);
    const options = listOptionsSchema.parse(input) as MarketingListOptions;
    const result = await this.repository.listProfiles(context.tenantId, options);
    return { items: result.items, pageInfo: { hasNextPage: Boolean(result.nextCursor), ...(result.nextCursor ? { nextCursor: result.nextCursor } : {}) } };
  }

  async createProfile(principal: Principal, input: unknown) {
    requirePermission(principal, "marketing.profiles.manage");
    const context = await this.context(principal);
    const parsed = marketingProfileInputSchema.parse(input);
    const existing = await this.repository.findProfileByEmail(context.tenantId, normalizedEmail(parsed.email));
    const usage = await this.usage(context);
    this.requireMarketingEntitlement(usage.entitlements.enabled, "marketing.enabled");
    if (!existing && usage.activeProfiles >= usage.entitlements.maxContacts) this.requireMarketingEntitlement(false, "marketing.max_contacts");
    if (existing && ["SUPPRESSED", "BOUNCED", "COMPLAINED", "UNSUBSCRIBED"].includes(existing.status)) {
      throw new AppError({ code: "CONFLICT", message: "Ce profil existe déjà dans un état qui interdit sa réactivation automatique.", details: { status: existing.status } });
    }
    const profile = await this.repository.saveProfile(context, parsed, principal.userId);
    await this.repository.addAudit(context.tenantId, principal.userId, existing ? "marketing.profile.updated" : "marketing.profile.created", "profile", profile.id, Object.keys(parsed));
    return profile;
  }

  async confirmProfile(principal: Principal, id: string) {
    requirePermission(principal, "marketing.profiles.manage");
    const context = await this.context(principal);
    const profile = await this.repository.getProfile(context.tenantId, id);
    if (!profile) return notFound("Profil marketing introuvable.");
    if ((await this.repository.getActiveSuppressedEmails(context.tenantId)).has(profile.normalizedEmail)) {
      throw new AppError({ code: "CONFLICT", message: "Une suppression active interdit la confirmation de ce profil." });
    }
    const updated = await this.repository.setProfileStatus(context.tenantId, id, "SUBSCRIBED");
    await this.repository.addAudit(context.tenantId, principal.userId, "marketing.profile.confirmed", "profile", id, ["status", "confirmedAt"]);
    return updated;
  }

  async unsubscribeProfile(principal: Principal, id: string) {
    requirePermission(principal, "marketing.profiles.manage");
    const context = await this.context(principal);
    const profile = await this.repository.getProfile(context.tenantId, id);
    if (!profile) return notFound("Profil marketing introuvable.");
    const updated = await this.repository.setProfileStatus(context.tenantId, id, "UNSUBSCRIBED");
    await this.repository.suppress(context.tenantId, updated, "UNSUBSCRIBED", "MARKETING_PROFILE");
    await this.repository.addAudit(context.tenantId, principal.userId, "marketing.profile.unsubscribed", "profile", id, ["status", "unsubscribedAt"]);
    return updated;
  }

  async listLists(principal: Principal) {
    requirePermission(principal, "marketing.lists.read");
    const context = await this.context(principal);
    return { items: await this.repository.listLists(context.tenantId) };
  }
  async createList(principal: Principal, input: unknown) {
    requirePermission(principal, "marketing.lists.manage");
    const context = await this.context(principal);
    const [usage, existingLists] = await Promise.all([this.usage(context), this.repository.listLists(context.tenantId)]);
    this.requireMarketingEntitlement(usage.entitlements.enabled, "marketing.enabled");
    if (existingLists.length >= usage.entitlements.maxLists) this.requireMarketingEntitlement(false, "marketing.max_lists");
    const value = await this.repository.createList(context, marketingListInputSchema.parse(input));
    await this.repository.addAudit(context.tenantId, principal.userId, "marketing.list.created", "list", value.id, ["name", "description", "status"]);
    return value;
  }
  async addListMember(principal: Principal, listId: string, profileId: string) {
    requirePermission(principal, "marketing.lists.manage");
    const context = await this.context(principal);
    const profile = await this.repository.getProfile(context.tenantId, profileId);
    if (!profile) return notFound("Profil marketing introuvable.");
    await this.repository.addListMember(context.tenantId, listId, profileId, "MANUAL");
    await this.emitJourneyEvent(context, "LIST_JOINED", `list.joined:${listId}:${profileId}`, profileId, { listId });
    await this.repository.addAudit(context.tenantId, principal.userId, "marketing.list.member_added", "list", listId, ["profileId"]);
    return { success: true };
  }

  async listSegments(principal: Principal) {
    requirePermission(principal, "marketing.segments.read");
    const context = await this.context(principal);
    return { items: await this.repository.listSegments(context.tenantId) };
  }
  async createSegment(principal: Principal, input: unknown) {
    requirePermission(principal, "marketing.segments.manage");
    const context = await this.context(principal);
    const [usage, existingSegments] = await Promise.all([this.usage(context), this.repository.listSegments(context.tenantId)]);
    this.requireMarketingEntitlement(usage.entitlements.enabled, "marketing.enabled");
    if (existingSegments.length >= usage.entitlements.maxSegments) this.requireMarketingEntitlement(false, "marketing.max_segments");
    const parsed = marketingSegmentInputSchema.parse(input);
    validateSegmentGroup(parsed.definition);
    const value = await this.repository.createSegment(context, parsed);
    const count = (await this.repository.listAllProfiles(context.tenantId)).filter((profile) => matchesGroup(profile, parsed.definition)).length;
    await this.repository.updateSegmentEstimate(context.tenantId, value.id, count);
    await this.repository.addAudit(context.tenantId, principal.userId, "marketing.segment.created", "segment", value.id, ["name", "definition"]);
    return { ...value, estimatedCount: count, lastEstimatedAt: new Date().toISOString() };
  }

  async listTemplates(principal: Principal) {
    requirePermission(principal, "marketing.templates.read");
    const context = await this.context(principal);
    return { items: await this.repository.listTemplates(context.tenantId) };
  }
  async createTemplate(principal: Principal, input: unknown) {
    requirePermission(principal, "marketing.templates.manage");
    const context = await this.context(principal);
    const usage = await this.usage(context);
    this.requireMarketingEntitlement(usage.entitlements.enabled && usage.entitlements.templates, "marketing.templates");
    const value = await this.repository.createTemplate(context, marketingTemplateInputSchema.parse(input), principal.userId);
    await this.repository.addAudit(context.tenantId, principal.userId, "marketing.template.created", "template", value.id, ["name", "content"]);
    return value;
  }

  async listCampaigns(principal: Principal) {
    requirePermission(principal, "marketing.campaigns.read");
    const context = await this.context(principal);
    return { items: await this.repository.listCampaigns(context.tenantId) };
  }
  async getCampaign(principal: Principal, id: string) {
    requirePermission(principal, "marketing.campaigns.read");
    const context = await this.context(principal);
    return (await this.repository.getCampaign(context.tenantId, id)) ?? notFound("Campagne marketing introuvable.");
  }
  async createCampaign(principal: Principal, input: unknown) {
    requirePermission(principal, "marketing.campaigns.create");
    const context = await this.context(principal);
    const parsed = marketingCampaignInputSchema.parse(input);
    const usage = await this.usage(context);
    this.requireMarketingEntitlement(usage.entitlements.enabled, "marketing.enabled");
    if (parsed.experiment?.enabled) this.requireMarketingEntitlement(usage.entitlements.abTesting, "marketing.ab_testing");
    const value = await this.repository.createCampaign(context, parsed, principal.userId);
    await this.repository.addAudit(context.tenantId, principal.userId, "marketing.campaign.created", "campaign", value.id, Object.keys(parsed));
    return value;
  }

  private async selectedProfiles(context: MarketingTenantContext, audienceInput: MarketingAudienceDefinition) {
    const audience = marketingAudienceDefinitionSchema.parse(audienceInput);
    const [profiles, segments, includeListIds, excludeListIds, suppressedEmails, dayCounts, weekCounts] = await Promise.all([
      this.repository.listAllProfiles(context.tenantId),
      this.repository.listSegments(context.tenantId),
      this.repository.getListMemberIds(context.tenantId, audience.includeListIds),
      this.repository.getListMemberIds(context.tenantId, audience.excludeListIds),
      this.repository.getActiveSuppressedEmails(context.tenantId),
      this.repository.getRecipientCounts(context.tenantId, new Date(Date.now() - 86_400_000).toISOString()),
      this.repository.getRecipientCounts(context.tenantId, new Date(Date.now() - 7 * 86_400_000).toISOString()),
    ]);
    const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
    const includeIds = new Set([...audience.includeProfileIds, ...includeListIds]);
    const excludeIds = new Set([...audience.excludeProfileIds, ...excludeListIds]);
    for (const segment of segments) {
      if (audience.includeSegmentIds.includes(segment.id)) profiles.filter((profile) => matchesGroup(profile, segment.definition)).forEach((profile) => includeIds.add(profile.id));
      if (audience.excludeSegmentIds.includes(segment.id)) profiles.filter((profile) => matchesGroup(profile, segment.definition)).forEach((profile) => excludeIds.add(profile.id));
    }
    const recent = audience.recentRecipientDays
      ? await this.repository.getRecentRecipientProfileIds(context.tenantId, new Date(Date.now() - audience.recentRecipientDays * 86_400_000).toISOString())
      : new Set<string>();
    const seen = new Set<string>();
    const selected = [...includeIds].map((id) => profileById.get(id)).filter((profile): profile is MarketingProfile => Boolean(profile));
    const classified = selected.map((profile) => {
      let exclusionReason: string | undefined;
      if (excludeIds.has(profile.id)) exclusionReason = "CAMPAIGN_EXCLUSION";
      else if (profile.status === "UNSUBSCRIBED") exclusionReason = "UNSUBSCRIBED";
      else if (["SUPPRESSED", "BOUNCED", "COMPLAINED"].includes(profile.status) || suppressedEmails.has(profile.normalizedEmail)) exclusionReason = "SUPPRESSED";
      else if (profile.status === "INVALID" || profile.status === "PENDING") exclusionReason = "INVALID";
      else if (profile.customValues.doNotContact === true) exclusionReason = "DO_NOT_CONTACT";
      else if ((dayCounts.get(profile.id) ?? 0) >= context.frequencyCapDay || (weekCounts.get(profile.id) ?? 0) >= context.frequencyCapWeek) exclusionReason = "FREQUENCY_CAP";
      else if (seen.has(profile.normalizedEmail)) exclusionReason = "DUPLICATE";
      else if (recent.has(profile.id)) exclusionReason = "RECENT_RECIPIENT";
      seen.add(profile.normalizedEmail);
      return { profile, exclusionReason };
    });
    return classified;
  }

  async estimateAudience(principal: Principal, input: unknown): Promise<MarketingAudienceEstimate> {
    requirePermission(principal, "marketing.campaigns.read");
    const context = await this.context(principal);
    const classified = await this.selectedProfiles(context, marketingAudienceDefinitionSchema.parse(input));
    const count = (reason: string) => classified.filter((entry) => entry.exclusionReason === reason).length;
    const excluded = classified.filter((entry) => Boolean(entry.exclusionReason)).length;
    return { selected: classified.length, eligible: classified.length - excluded, excluded, unsubscribed: count("UNSUBSCRIBED"), suppressed: count("SUPPRESSED"), invalid: count("INVALID"), doNotContact: count("DO_NOT_CONTACT"), duplicate: count("DUPLICATE"), frequencyCapped: count("FREQUENCY_CAP"), calculatedAt: new Date().toISOString() };
  }

  async preflight(principal: Principal, id: string): Promise<MarketingPreflight> {
    requirePermission(principal, "marketing.campaigns.read");
    const context = await this.context(principal);
    const campaign = (await this.repository.getCampaign(context.tenantId, id)) ?? notFound("Campagne marketing introuvable.");
    const audience = await this.estimateAudience(principal, campaign.audience);
    const blockers: MarketingPreflight["blockers"] = [];
    const warnings: MarketingPreflight["warnings"] = [];
    const info: MarketingPreflight["info"] = [];
    const connectionId = campaign.providerConnectionId ?? context.defaultProviderConnectionId;
    if (!connectionId) blockers.push({ code: "PROVIDER_REQUIRED", message: "Configurez un fournisseur Email Delivery pour envoyer cette campagne.", actionHref: "/admin/fournisseurs" });
    else {
      try {
        const connection = await providerConnectionService.resolve({ tenantId: context.tenantId, userId: principal.userId, marketCode: context.marketCode }, { capability: "email.marketing", explicitConnectionId: connectionId, feature: "marketing.campaign_send" });
        const usage = await this.operationsRepository.usage(context.tenantId, context.marketCode);
        if (connection.ownerType === "PLATFORM" && !usage.entitlements.platformEmail) blockers.push({ code: "PLATFORM_EMAIL_NOT_ENTITLED", message: "Les crédits Email Shongre ne sont pas inclus dans les droits actifs." });
        if (connection.ownerType !== "PLATFORM" && !usage.entitlements.byoEmail) blockers.push({ code: "BYO_EMAIL_NOT_ENTITLED", message: "Les fournisseurs Email appartenant au tenant ne sont pas inclus dans les droits actifs." });
        const health = await capabilityGateways.emailDelivery.testConnection({ tenantId: context.tenantId, userId: principal.userId, connectionId: connection.id, providerId: connection.providerId, capability: "email.marketing", feature: "marketing.campaign_preflight", correlationId: randomUUID(), marketCode: context.marketCode, locale: campaign.locale });
        if (health.status !== "HEALTHY") blockers.push({ code: "PROVIDER_UNHEALTHY", message: health.message ?? "Le fournisseur d’envoi n’est pas disponible." });
      } catch {
        blockers.push({ code: "PROVIDER_UNAVAILABLE", message: "La connexion Email Delivery sélectionnée n’est pas utilisable.", actionHref: "/admin/fournisseurs" });
      }
    }
    const senders = await this.repository.listSenderIdentities(context.tenantId);
    const sender = senders.find((item) => item.id === campaign.senderIdentityId);
    if (!sender || sender.status !== "VERIFIED") blockers.push({ code: "SENDER_REQUIRED", message: "Sélectionnez une identité d’expéditeur vérifiée.", field: "senderIdentityId" });
    if (!campaign.subject.trim()) blockers.push({ code: "SUBJECT_REQUIRED", message: "Ajoutez un objet à la campagne.", field: "subject" });
    if (!campaign.content.blocks.length) blockers.push({ code: "CONTENT_REQUIRED", message: "Ajoutez au moins un bloc de contenu.", field: "content" });
    if (!campaign.content.blocks.some((block) => block.type === "UNSUBSCRIBE")) blockers.push({ code: "UNSUBSCRIBE_REQUIRED", message: "Le contenu marketing doit inclure un lien de désabonnement.", field: "content" });
    if (!renderText(campaign).trim()) blockers.push({ code: "PLAIN_TEXT_REQUIRED", message: "Une version texte lisible doit pouvoir être générée.", field: "content" });
    if (!audience.selected) blockers.push({ code: "AUDIENCE_REQUIRED", message: "Sélectionnez au moins une liste, un segment ou un profil." });
    else if (!audience.eligible) blockers.push({ code: "AUDIENCE_INELIGIBLE", message: "Aucun destinataire sélectionné n’est éligible après consentement et suppression." });
    if (audience.excluded) warnings.push({ code: "AUDIENCE_EXCLUSIONS", message: `${audience.excluded} destinataire(s) seront exclus par les règles obligatoires.` });
    const usage = await this.operationsRepository.usage(context.tenantId, context.marketCode);
    if (!usage.entitlements.enabled) blockers.push({ code: "MARKETING_DISABLED", message: "La capacité Marketing n’est pas active pour ce tenant." });
    if (usage.attemptedSends + audience.eligible > usage.entitlements.maxMonthlySends) blockers.push({ code: "MONTHLY_SEND_LIMIT", message: "Cet envoi dépasserait le quota mensuel autorisé." });
    if (campaign.experiment?.enabled && !usage.entitlements.abTesting) blockers.push({ code: "AB_TESTING_NOT_ENTITLED", message: "Les tests A/B ne sont pas inclus dans les droits actifs." });
    if (context.approvalRequired && campaign.status !== "APPROVED") blockers.push({ code: "APPROVAL_REQUIRED", message: "Cette campagne doit être approuvée avant programmation ou envoi." });
    if (!["DRAFT", "APPROVED"].includes(campaign.status)) blockers.push({ code: "CAMPAIGN_ALREADY_DISPATCHED", message: "Cette campagne a déjà été soumise, programmée ou envoyée." });
    info.push({ code: "IDEMPOTENCY_ENABLED", message: "Chaque destinataire utilise une clé d’envoi déterministe." });
    return { campaignId: campaign.id, blockers, warnings, info, audience, checkedAt: new Date().toISOString(), canSend: blockers.length === 0 };
  }

  async testSend(principal: Principal, id: string, input: unknown) {
    requirePermission(principal, "marketing.campaigns.send");
    const context = await this.context(principal);
    const campaign = (await this.repository.getCampaign(context.tenantId, id)) ?? notFound("Campagne marketing introuvable.");
    const parsed = testSendSchema.parse(input);
    const connection = await providerConnectionService.resolve({ tenantId: context.tenantId, userId: principal.userId, marketCode: context.marketCode }, { capability: "email.marketing", explicitConnectionId: campaign.providerConnectionId ?? context.defaultProviderConnectionId, feature: "marketing.test_send" });
    const sender = (await this.repository.listSenderIdentities(context.tenantId)).find((item) => item.id === campaign.senderIdentityId);
    if (!sender || sender.status !== "VERIFIED") throw new AppError({ code: "VALIDATION_ERROR", message: "Une identité d’expéditeur vérifiée est requise." });
    return capabilityGateways.emailDelivery.send({ tenantId: context.tenantId, userId: principal.userId, connectionId: connection.id, providerId: connection.providerId, capability: "email.marketing", feature: "marketing.test_send", correlationId: randomUUID(), marketCode: context.marketCode, locale: campaign.locale }, { to: [parsed.recipient], from: { email: sender.email, name: sender.displayName }, replyTo: sender.replyTo, subject: `[TEST] ${campaign.subject}`, textBody: renderText(campaign, { first_name: "Test", ...parsed.personalization, unsubscribe_url: "https://demo.shongre.local/preferences", preferences_url: "https://demo.shongre.local/preferences" }), purpose: "MARKETING", headers: { "X-Shongre-Test-Send": "true" }, idempotencyKey: createHash("sha256").update(`${campaign.id}:${parsed.recipient}:${campaign.currentVersion}`).digest("hex") });
  }

  async send(principal: Principal, id: string) {
    requirePermission(principal, "marketing.campaigns.send");
    const context = await this.context(principal);
    const preflight = await this.preflight(principal, id);
    if (!preflight.canSend) throw new AppError({ code: "VALIDATION_ERROR", message: "Le pré-vol contient des blocages.", details: preflight });
    const campaign = (await this.repository.getCampaign(context.tenantId, id))!;
    const classified = await this.selectedProfiles(context, campaign.audience);
    const recipients = classified.map(({ profile, exclusionReason }) => { const variantId = selectVariant(campaign, profile.id); return { profileId: profile.id, variantId, idempotencyKey: stableSendKey(campaign, profile.id, variantId), eligibilityStatus: exclusionReason ? "EXCLUDED" as const : "ELIGIBLE" as const, exclusionReason }; });
    await this.repository.createAudienceSnapshot(context.tenantId, campaign, recipients);
    await this.repository.enqueueCampaign(context.tenantId, campaign.id, `campaign-send:${campaign.id}:${campaign.currentVersion}`);
    const updated = await this.repository.setCampaignStatus(context.tenantId, id, "QUEUED", { startedAt: new Date().toISOString() });
    await this.repository.addAudit(context.tenantId, principal.userId, "marketing.campaign.queued", "campaign", id, ["status", "startedAt"]);
    return { campaign: updated, queuedRecipients: preflight.audience.eligible, excludedRecipients: preflight.audience.excluded };
  }

  async schedule(principal: Principal, id: string, input: unknown) {
    requirePermission(principal, "marketing.campaigns.send");
    const context = await this.context(principal);
    const parsed = scheduleSchema.parse(input);
    if (new Date(parsed.scheduledAt).getTime() <= Date.now()) throw new AppError({ code: "VALIDATION_ERROR", message: "La date de programmation doit être future." });
    const preflight = await this.preflight(principal, id);
    if (!preflight.canSend) throw new AppError({ code: "VALIDATION_ERROR", message: "Le pré-vol contient des blocages.", details: preflight });
    const campaign = (await this.repository.getCampaign(context.tenantId, id))!;
    const classified = await this.selectedProfiles(context, campaign.audience);
    const recipients = classified.map(({ profile, exclusionReason }) => { const variantId = selectVariant(campaign, profile.id); return { profileId: profile.id, variantId, idempotencyKey: stableSendKey(campaign, profile.id, variantId), eligibilityStatus: exclusionReason ? "EXCLUDED" as const : "ELIGIBLE" as const, exclusionReason }; });
    await this.repository.createAudienceSnapshot(context.tenantId, campaign, recipients);
    await this.repository.enqueueCampaign(context.tenantId, campaign.id, `campaign-send:${campaign.id}:${campaign.currentVersion}`, parsed.scheduledAt);
    const updated = await this.repository.setCampaignStatus(context.tenantId, id, "SCHEDULED", { scheduledAt: parsed.scheduledAt });
    await this.repository.addAudit(context.tenantId, principal.userId, "marketing.campaign.scheduled", "campaign", id, ["status", "scheduledAt"]);
    return updated;
  }

  async pause(principal: Principal, id: string) {
    requirePermission(principal, "marketing.campaigns.pause");
    const context = await this.context(principal);
    const campaign = (await this.repository.getCampaign(context.tenantId, id)) ?? notFound("Campagne marketing introuvable.");
    if (!["QUEUED", "SENDING"].includes(campaign.status)) throw new AppError({ code: "CONFLICT", message: "Seule une campagne en file ou en cours peut être suspendue." });
    return this.repository.setCampaignStatus(context.tenantId, id, "PAUSED");
  }

  async resume(principal: Principal, id: string) {
    requirePermission(principal, "marketing.campaigns.pause");
    const context = await this.context(principal);
    const campaign = (await this.repository.getCampaign(context.tenantId, id)) ?? notFound("Campagne marketing introuvable.");
    if (campaign.status !== "PAUSED") throw new AppError({ code: "CONFLICT", message: "Seule une campagne suspendue peut être reprise." });
    await this.repository.resumeCampaign(context.tenantId, id);
    const updated = await this.repository.setCampaignStatus(context.tenantId, id, "QUEUED");
    await this.repository.addAudit(context.tenantId, principal.userId, "marketing.campaign.resumed", "campaign", id, ["status"]);
    return updated;
  }

  async submitForReview(principal: Principal, id: string) {
    requirePermission(principal, "marketing.campaigns.update");
    const context = await this.context(principal);
    const campaign = (await this.repository.getCampaign(context.tenantId, id)) ?? notFound("Campagne marketing introuvable.");
    if (campaign.status !== "DRAFT") throw new AppError({ code: "CONFLICT", message: "Seul un brouillon peut être soumis à validation." });
    const updated = await this.repository.setCampaignApproval(context.tenantId, id, "REVIEW");
    await this.repository.addAudit(context.tenantId, principal.userId, "marketing.campaign.review_requested", "campaign", id, ["status"]);
    return updated;
  }

  async approve(principal: Principal, id: string) {
    requirePermission(principal, "marketing.campaigns.approve");
    const context = await this.context(principal);
    const campaign = (await this.repository.getCampaign(context.tenantId, id)) ?? notFound("Campagne marketing introuvable.");
    if (campaign.status !== "REVIEW") throw new AppError({ code: "CONFLICT", message: "Seule une campagne en validation peut être approuvée." });
    const updated = await this.repository.setCampaignApproval(context.tenantId, id, "APPROVED", principal.userId);
    await this.repository.addAudit(context.tenantId, principal.userId, "marketing.campaign.approved", "campaign", id, ["status", "approvedBy"]);
    return updated;
  }

  async selectExperimentWinner(principal: Principal, id: string, input: unknown) {
    requirePermission(principal, "marketing.campaigns.update");
    const context = await this.context(principal);
    const campaign = (await this.repository.getCampaign(context.tenantId, id)) ?? notFound("Campagne marketing introuvable.");
    const experiment = campaign.experiment;
    if (!experiment?.enabled) throw new AppError({ code: "CONFLICT", message: "Cette campagne ne contient pas de test A/B." });
    if (campaign.winningVariantId) return campaign;
    const parsed = z.object({ variantId: z.string().max(80).optional() }).parse(input ?? {});
    let variantId = parsed.variantId;
    if (variantId) {
      if (!experiment.variants.some((variant) => variant.id === variantId)) throw new AppError({ code: "VALIDATION_ERROR", message: "La variante sélectionnée n’appartient pas à cette campagne." });
    } else {
      if (experiment.winnerMode !== "AUTOMATIC") throw new AppError({ code: "VALIDATION_ERROR", message: "Une variante doit être sélectionnée pour ce test manuel." });
      if (!campaign.startedAt || Date.now() < new Date(campaign.startedAt).getTime() + experiment.durationMinutes * 60_000) throw new AppError({ code: "CONFLICT", message: "La fenêtre de mesure du test A/B n’est pas terminée." });
      const analytics = await this.operationsRepository.analytics(context.tenantId, id);
      const score = (variant: typeof analytics.variants[number]) => experiment.winnerMetric === "CONVERSION_RATE" ? variant.conversionRate : experiment.winnerMetric === "OPEN_RATE" ? (variant.delivered ? variant.uniqueOpens / variant.delivered : 0) : variant.clickThroughRate;
      variantId = [...analytics.variants].sort((left, right) => score(right) - score(left) || right.delivered - left.delivered)[0]?.variantId ?? experiment.variants[0].id;
    }
    const updated = await this.repository.setCampaignWinner(context.tenantId, id, variantId);
    await this.repository.addAudit(context.tenantId, principal.userId, "marketing.campaign.experiment_winner_selected", "campaign", id, ["winningVariantId"]);
    return updated;
  }

  async cancel(principal: Principal, id: string) {
    requirePermission(principal, "marketing.campaigns.cancel");
    const context = await this.context(principal);
    const campaign = (await this.repository.getCampaign(context.tenantId, id)) ?? notFound("Campagne marketing introuvable.");
    if (["COMPLETED", "CANCELLED"].includes(campaign.status)) throw new AppError({ code: "CONFLICT", message: "Cette campagne est déjà terminée." });
    await this.repository.cancelCampaignDispatch(context.tenantId, id);
    const updated = await this.repository.setCampaignStatus(context.tenantId, id, "CANCELLED", { completedAt: new Date().toISOString() });
    await this.repository.addAudit(context.tenantId, principal.userId, "marketing.campaign.cancelled", "campaign", id, ["status", "completedAt"]);
    return updated;
  }

  async listSuppressions(principal: Principal) {
    requirePermission(principal, "marketing.compliance.read");
    const context = await this.context(principal);
    return { items: await this.repository.listSuppressions(context.tenantId) };
  }

  async generateCampaignDraft(principal: Principal, input: unknown) {
    requirePermission(principal, "marketing.campaigns.create");
    const context = await this.context(principal);
    const parsed = z.object({ instructions: z.string().trim().min(10).max(5_000), locale: z.string().min(2).max(16).default(context.locale) }).parse(input);
    const connection = await providerConnectionService.resolve({ tenantId: context.tenantId, userId: principal.userId, marketCode: context.marketCode }, { capability: "ai.marketing_drafting", feature: "marketing.campaign_draft" });
    return capabilityGateways.ai.generate({ tenantId: context.tenantId, userId: principal.userId, connectionId: connection.id, providerId: connection.providerId, capability: "ai.marketing_drafting", feature: "marketing.campaign_draft", correlationId: randomUUID(), marketCode: context.marketCode, locale: parsed.locale }, { task: "marketing.campaign_draft", instructions: parsed.instructions, safeContext: { locale: parsed.locale }, outputSchema: { type: "object", required: ["subject", "previewText", "contentBlocks"] }, maxOutputTokens: 1_500 });
  }
}

export const marketingService = new MarketingService();
