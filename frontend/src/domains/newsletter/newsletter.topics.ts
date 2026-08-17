/**
 * SHONGRE NEWSLETTER TOPICS REGISTRY
 * Authoritative registry of newsletter topics, descriptions, and audience eligibility.
 */

import { NewsletterTopic } from './newsletter.types';

export interface NewsletterTopicDefinition {
  id: NewsletterTopic;
  label: string;
  description: string;
  audience: {
    individual?: boolean;
    professional?: boolean;
  };
  defaultEnabled?: boolean;
}

export const NEWSLETTER_TOPICS: NewsletterTopicDefinition[] = [
  {
    id: 'deals',
    label: 'Bons plans & Réductions exclusives',
    description: 'Recevez les meilleures affaires du moment et les baisses de prix vérifiées.',
    audience: { individual: true, professional: true },
    defaultEnabled: true,
  },
  {
    id: 'editorial',
    label: 'Sélection hebdomadaire & Coups de cœur',
    description: 'Une sélection soignée d\'annonces uniques, d\'objets vintage et de pépites locales.',
    audience: { individual: true, professional: false },
    defaultEnabled: true,
  },
  {
    id: 'seller_tips',
    label: 'Conseils pour vendre vite et mieux',
    description: 'Astuces photos, conseils de tarification et bonnes pratiques pour vos annonces.',
    audience: { individual: true, professional: false },
    defaultEnabled: false,
  },
  {
    id: 'pro_insights',
    label: 'Tendances du marché & Conseils Pro',
    description: 'Statistiques sectorielles, astuces pour booster vos ventes et actualités fiscales/légales.',
    audience: { individual: false, professional: true },
    defaultEnabled: true,
  },
  {
    id: 'new_features',
    label: 'Nouveautés & Évolutions Shongre',
    description: 'Découvrez les nouvelles fonctionnalités, options de livraison et améliorations produit.',
    audience: { individual: true, professional: true },
    defaultEnabled: true,
  },
  {
    id: 'local_trends',
    label: 'Tendances & Bonnes affaires régionales',
    description: 'L\'actualité des annonces et rassemblements locaux autour de votre ville.',
    audience: { individual: true, professional: true },
    defaultEnabled: false,
  },
];

export class NewsletterTopicsService {
  getAllTopics(): NewsletterTopicDefinition[] {
    return NEWSLETTER_TOPICS;
  }

  getTopicsForAudience(isPro: boolean): NewsletterTopicDefinition[] {
    return NEWSLETTER_TOPICS.filter((t) => (isPro ? t.audience.professional : t.audience.individual));
  }

  getDefaultTopics(isPro: boolean): NewsletterTopic[] {
    return this.getTopicsForAudience(isPro)
      .filter((t) => t.defaultEnabled)
      .map((t) => t.id);
  }

  getTopic(topicId: NewsletterTopic): NewsletterTopicDefinition | undefined {
    return NEWSLETTER_TOPICS.find((t) => t.id === topicId);
  }
}

export const newsletterTopicsService = new NewsletterTopicsService();
