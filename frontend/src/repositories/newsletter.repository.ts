/**
 * SHONGRE NEWSLETTER REPOSITORY
 * Data-access contract and mock implementation for newsletter subscriptions,
 * preferences, confirmation states, and admin marketing campaigns.
 */

import {
  NewsletterSubscription,
  SubscribeNewsletterInput,
  NewsletterTopic,
  NewsletterCampaign,
  NewsletterAudienceDefinition,
} from '../domains/newsletter/newsletter.types';
import {
  newsletterService,
  CURRENT_NEWSLETTER_CONSENT_VERSION,
} from '../domains/newsletter/newsletter.service';
import { newsletterTopicsService } from '../domains/newsletter/newsletter.topics';
import { storageService } from '../services/storage.service';

export interface INewsletterRepository {
  getSubscription(email: string, marketCode?: string): Promise<NewsletterSubscription | null>;
  getSubscriptionByUserId(userId: string): Promise<NewsletterSubscription | null>;
  subscribe(input: SubscribeNewsletterInput): Promise<NewsletterSubscription>;
  confirmSubscription(tokenOrId: string): Promise<NewsletterSubscription>;
  updatePreferences(subscriptionId: string, topics: NewsletterTopic[]): Promise<NewsletterSubscription>;
  unsubscribe(emailOrId: string): Promise<NewsletterSubscription>;
  resubscribe(subscriptionId: string, topics?: NewsletterTopic[]): Promise<NewsletterSubscription>;
  listCampaigns(): Promise<NewsletterCampaign[]>;
  getCampaignById(id: string): Promise<NewsletterCampaign | null>;
  createCampaign(campaign: Partial<NewsletterCampaign>): Promise<NewsletterCampaign>;
  scheduleCampaign(id: string, scheduledAt: string): Promise<NewsletterCampaign>;
  simulateSendCampaign(id: string): Promise<NewsletterCampaign>;
  cancelCampaign(id: string): Promise<NewsletterCampaign>;
  getAudienceEstimate(audience: NewsletterAudienceDefinition): Promise<number>;
}

const INITIAL_SUBSCRIPTIONS: NewsletterSubscription[] = [
  {
    id: 'sub-1',
    subscriberId: 'user_thomas',
    email: 'thomas@example.fr',
    marketCode: 'FR',
    locale: 'fr-FR',
    status: 'subscribed',
    topics: ['deals', 'editorial', 'new_features'],
    accountType: 'individual',
    consent: {
      consented: true,
      consentedAt: '2026-08-01T10:00:00Z',
      version: CURRENT_NEWSLETTER_CONSENT_VERSION,
      source: 'account',
    },
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-01T10:00:00Z',
    confirmedAt: '2026-08-01T10:05:00Z',
  },
  {
    id: 'sub-2',
    subscriberId: 'user_pro_vintage',
    email: 'contact@atelier-nordique.fr',
    marketCode: 'FR',
    locale: 'fr-FR',
    status: 'subscribed',
    topics: ['deals', 'pro_insights', 'new_features'],
    accountType: 'pro',
    consent: {
      consented: true,
      consentedAt: '2026-07-15T08:30:00Z',
      version: CURRENT_NEWSLETTER_CONSENT_VERSION,
      source: 'pro_workspace',
    },
    createdAt: '2026-07-15T08:30:00Z',
    updatedAt: '2026-07-15T08:30:00Z',
    confirmedAt: '2026-07-15T08:35:00Z',
  },
];

const INITIAL_CAMPAIGNS: NewsletterCampaign[] = [
  {
    id: 'camp-1',
    name: 'Sélection Design & Mobilier d\'Automne',
    marketCode: 'FR',
    locale: 'fr-FR',
    audience: {
      marketCode: 'FR',
      accountTypes: ['individual'],
      topicIds: ['editorial', 'deals'],
    },
    topic: 'editorial',
    status: 'sent',
    subject: '🍂 Les plus beaux meubles scandinaves de la semaine',
    previewText: 'Découvrez notre sélection exclusive de pièces vintage vérifiées.',
    content: {
      heroTitle: 'Le design scandinave à l\'honneur',
      heroSubtitle: 'Des pièces chinées et garanties par nos vendeurs vérifiés.',
      introText: 'Cette semaine, notre équipe éditoriale a sélectionné pour vous les plus belles pépites de la communauté Shongre.',
      ctaText: 'Découvrir la sélection',
      ctaUrl: '/recherche?category=furniture',
    },
    sentAt: '2026-08-15T10:00:00Z',
    createdAt: '2026-08-14T09:00:00Z',
    updatedAt: '2026-08-15T10:00:00Z',
    stats: {
      recipientsCount: 4250,
      openedCount: 2180,
      clickedCount: 640,
      unsubscribedCount: 4,
    },
  },
  {
    id: 'camp-2',
    name: 'Flash Bons Plans Électronique & Mobilité',
    marketCode: 'FR',
    locale: 'fr-FR',
    audience: {
      marketCode: 'FR',
      topicIds: ['deals'],
    },
    topic: 'deals',
    status: 'scheduled',
    subject: '⚡ Jusqu\'à -40% sur les smartphones et vélos électriques',
    previewText: 'Offres limitées avec livraison sécurisée sous séquestre.',
    content: {
      heroTitle: 'Les baisses de prix du week-end',
      heroSubtitle: 'Transactions 100% sécurisées avec notre protection acheteur.',
      introText: 'Profitez de tarifs réduits sur une sélection d\'articles reconditionnés et d\'occasion.',
      ctaText: 'Voir tous les bons plans',
      ctaUrl: '/bons-plans',
    },
    scheduledAt: '2026-08-20T08:00:00Z',
    createdAt: '2026-08-16T14:00:00Z',
    updatedAt: '2026-08-16T14:00:00Z',
  },
];

export class MockNewsletterRepository implements INewsletterRepository {
  private getSubscriptions(): NewsletterSubscription[] {
    return storageService.get<NewsletterSubscription[]>('shongre_newsletter_subs', INITIAL_SUBSCRIPTIONS);
  }

  private saveSubscriptions(list: NewsletterSubscription[]): void {
    storageService.set('shongre_newsletter_subs', list);
  }

  private getCampaigns(): NewsletterCampaign[] {
    return storageService.get<NewsletterCampaign[]>('shongre_newsletter_campaigns', INITIAL_CAMPAIGNS);
  }

  private saveCampaigns(list: NewsletterCampaign[]): void {
    storageService.set('shongre_newsletter_campaigns', list);
  }

  async getSubscription(email: string, marketCode = 'FR'): Promise<NewsletterSubscription | null> {
    const normalized = newsletterService.normalizeEmail(email);
    const list = this.getSubscriptions();
    return list.find((s) => s.email === normalized && s.marketCode === marketCode) || null;
  }

  async getSubscriptionByUserId(userId: string): Promise<NewsletterSubscription | null> {
    const list = this.getSubscriptions();
    return list.find((s) => s.subscriberId === userId) || null;
  }

  async subscribe(input: SubscribeNewsletterInput): Promise<NewsletterSubscription> {
    const normalized = newsletterService.normalizeEmail(input.email);
    const market = input.marketCode || 'FR';
    const isPro = input.accountType === 'pro';
    const list = this.getSubscriptions();

    const existingIndex = list.findIndex((s) => s.email === normalized && s.marketCode === market);
    const now = new Date().toISOString();

    const topicsToAssign = input.topics && input.topics.length > 0
      ? input.topics
      : newsletterTopicsService.getDefaultTopics(isPro);

    if (existingIndex >= 0) {
      const existing = list[existingIndex];
      existing.status = 'subscribed';
      existing.topics = topicsToAssign;
      existing.updatedAt = now;
      existing.unsubscribedAt = undefined;
      if (input.subscriberId) existing.subscriberId = input.subscriberId;
      if (input.accountType) existing.accountType = input.accountType;

      this.saveSubscriptions(list);
      return existing;
    }

    const newSub: NewsletterSubscription = {
      id: `sub-${Date.now()}`,
      subscriberId: input.subscriberId,
      email: normalized,
      marketCode: market,
      locale: input.locale || 'fr-FR',
      status: 'subscribed',
      topics: topicsToAssign,
      accountType: input.accountType || 'individual',
      consent: {
        consented: true,
        consentedAt: now,
        version: CURRENT_NEWSLETTER_CONSENT_VERSION,
        source: input.source || 'homepage',
      },
      createdAt: now,
      updatedAt: now,
      confirmedAt: now,
    };

    list.unshift(newSub);
    this.saveSubscriptions(list);
    return newSub;
  }

  async confirmSubscription(tokenOrId: string): Promise<NewsletterSubscription> {
    const list = this.getSubscriptions();
    const sub = list.find((s) => s.id === tokenOrId || s.email === tokenOrId);
    if (!sub) throw new Error('Abonnement introuvable.');

    sub.status = 'subscribed';
    sub.confirmedAt = new Date().toISOString();
    sub.updatedAt = new Date().toISOString();

    this.saveSubscriptions(list);
    return sub;
  }

  async updatePreferences(subscriptionId: string, topics: NewsletterTopic[]): Promise<NewsletterSubscription> {
    const list = this.getSubscriptions();
    const sub = list.find((s) => s.id === subscriptionId);
    if (!sub) throw new Error('Abonnement introuvable.');

    sub.topics = topics;
    sub.updatedAt = new Date().toISOString();

    this.saveSubscriptions(list);
    return sub;
  }

  async unsubscribe(emailOrId: string): Promise<NewsletterSubscription> {
    const normalized = newsletterService.normalizeEmail(emailOrId);
    const list = this.getSubscriptions();
    const sub = list.find((s) => s.id === emailOrId || s.email === normalized);
    if (!sub) throw new Error('Abonnement introuvable.');

    sub.status = 'unsubscribed';
    sub.unsubscribedAt = new Date().toISOString();
    sub.updatedAt = new Date().toISOString();

    this.saveSubscriptions(list);
    return sub;
  }

  async resubscribe(subscriptionId: string, topics?: NewsletterTopic[]): Promise<NewsletterSubscription> {
    const list = this.getSubscriptions();
    const sub = list.find((s) => s.id === subscriptionId);
    if (!sub) throw new Error('Abonnement introuvable.');

    const isPro = sub.accountType === 'pro';
    sub.status = 'subscribed';
    sub.unsubscribedAt = undefined;
    sub.topics = topics && topics.length > 0 ? topics : newsletterTopicsService.getDefaultTopics(isPro);
    sub.updatedAt = new Date().toISOString();

    this.saveSubscriptions(list);
    return sub;
  }

  async listCampaigns(): Promise<NewsletterCampaign[]> {
    const list = this.getCampaigns();
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getCampaignById(id: string): Promise<NewsletterCampaign | null> {
    const list = this.getCampaigns();
    return list.find((c) => c.id === id) || null;
  }

  async createCampaign(campaign: Partial<NewsletterCampaign>): Promise<NewsletterCampaign> {
    const list = this.getCampaigns();
    const now = new Date().toISOString();

    const newCamp: NewsletterCampaign = {
      id: `camp-${Date.now()}`,
      name: campaign.name || 'Nouvelle Campagne',
      marketCode: campaign.marketCode || 'FR',
      locale: campaign.locale || 'fr-FR',
      audience: campaign.audience || { marketCode: 'FR' },
      topic: campaign.topic,
      status: campaign.status || 'draft',
      subject: campaign.subject || 'Actualités Shongre',
      previewText: campaign.previewText || '',
      content: campaign.content || {},
      scheduledAt: campaign.scheduledAt,
      createdAt: now,
      updatedAt: now,
    };

    list.unshift(newCamp);
    this.saveCampaigns(list);
    return newCamp;
  }

  async scheduleCampaign(id: string, scheduledAt: string): Promise<NewsletterCampaign> {
    const list = this.getCampaigns();
    const camp = list.find((c) => c.id === id);
    if (!camp) throw new Error('Campagne introuvable.');

    camp.status = 'scheduled';
    camp.scheduledAt = scheduledAt;
    camp.updatedAt = new Date().toISOString();

    this.saveCampaigns(list);
    return camp;
  }

  async simulateSendCampaign(id: string): Promise<NewsletterCampaign> {
    const list = this.getCampaigns();
    const camp = list.find((c) => c.id === id);
    if (!camp) throw new Error('Campagne introuvable.');

    const count = await this.getAudienceEstimate(camp.audience);

    camp.status = 'sent';
    camp.sentAt = new Date().toISOString();
    camp.updatedAt = new Date().toISOString();
    camp.stats = {
      recipientsCount: count > 0 ? count : 380,
      openedCount: Math.round(count * 0.45) || 170,
      clickedCount: Math.round(count * 0.12) || 45,
      unsubscribedCount: 1,
    };

    this.saveCampaigns(list);
    return camp;
  }

  async cancelCampaign(id: string): Promise<NewsletterCampaign> {
    const list = this.getCampaigns();
    const camp = list.find((c) => c.id === id);
    if (!camp) throw new Error('Campagne introuvable.');

    camp.status = 'cancelled';
    camp.updatedAt = new Date().toISOString();

    this.saveCampaigns(list);
    return camp;
  }

  async getAudienceEstimate(audience: NewsletterAudienceDefinition): Promise<number> {
    const subs = this.getSubscriptions().filter((s) => s.status === 'subscribed');
    const filtered = subs.filter((s) => {
      if (s.marketCode !== audience.marketCode) return false;
      if (audience.accountTypes && audience.accountTypes.length > 0) {
        if (!audience.accountTypes.includes(s.accountType || 'individual')) return false;
      }
      if (audience.topicIds && audience.topicIds.length > 0) {
        const hasTopic = s.topics.some((t) => audience.topicIds?.includes(t));
        if (!hasTopic) return false;
      }
      return true;
    });

    // Return realistic estimated audience based on active subs multiplier
    return Math.max(filtered.length * 250 + 120, 150);
  }
}

export const newsletterRepository: INewsletterRepository = new MockNewsletterRepository();
