import { getSupabaseAdminClient } from '../../supabase/supabase-client.js';
import { logger } from '../../logging/logger.js';

export interface ListingBoostOption {
  id: string;
  name: string;
  type: 'urgent' | 'search_bump' | 'featured';
  durationDays: number;
  price: number;
  currency: string;
  description: string;
  badgeLabel?: string;
  multiplierText?: string;
}

export interface ProPlan {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  maxListings: number;
  highlighted?: boolean;
}

export const CANONICAL_DEMO_BOOSTS: ListingBoostOption[] = [
  {
    id: 'boost_urgent_7d',
    name: 'Badge Urgent',
    type: 'urgent',
    durationDays: 7,
    price: 3.99,
    currency: 'EUR',
    description: 'Affichez un badge "Urgent" rouge vif sur votre annonce pendant 7 jours.',
    badgeLabel: 'Urgent',
    multiplierText: 'x3 plus de contacts',
  },
  {
    id: 'boost_bump_1x',
    name: 'Remontée en tête immédiate',
    type: 'search_bump',
    durationDays: 1,
    price: 1.99,
    currency: 'EUR',
    description: 'Repositionnez votre annonce en toute première position des résultats de recherche.',
    badgeLabel: 'Remontée',
    multiplierText: 'x2 de visibilité',
  },
  {
    id: 'boost_featured_7d',
    name: 'À la une (7 jours)',
    type: 'featured',
    durationDays: 7,
    price: 7.99,
    currency: 'EUR',
    description: "Mise en avant sur la page d'accueil et en tête de sa catégorie pendant 7 jours.",
    badgeLabel: 'À la Une',
    multiplierText: 'x5 de visites',
  },
  {
    id: 'boost_featured_30d',
    name: 'À la une Premium (30 jours)',
    type: 'featured',
    durationDays: 30,
    price: 19.99,
    currency: 'EUR',
    description: 'Visibilité maximale pendant un mois complet sur tous les canaux.',
    badgeLabel: 'Ultra Vedette',
    multiplierText: 'x10 de visites',
  },
];

export const CANONICAL_DEMO_PRO_PLANS: ProPlan[] = [
  {
    id: 'starter',
    name: 'Pack Starter Pro',
    priceMonthly: 19.9,
    priceYearly: 199.0,
    maxListings: 50,
    features: [
      "Jusqu'à 50 annonces actives simultanées",
      'Badge Vendeur Professionnel vérifié',
      'Support client prioritaire 7j/7',
      'Statistiques de base des vues',
    ],
  },
  {
    id: 'pro',
    name: 'Pack Performance Pro',
    priceMonthly: 49.9,
    priceYearly: 499.0,
    maxListings: 500,
    highlighted: true,
    features: [
      'Annonces illimitées',
      'Boutique en ligne dédiée (vitrine Pro avec logo & bannière)',
      'Statistiques avancées des conversions',
      '5 boosts "Remontée en tête" offerts chaque mois',
    ],
  },
  {
    id: 'enterprise',
    name: 'Pack Entreprise Sur-Mesure',
    priceMonthly: 99.9,
    priceYearly: 999.0,
    maxListings: 99999,
    features: [
      'Gestion multi-comptes et collaborateurs',
      'Accès API CRM & synchronisation de catalogue automatique',
      'Gestionnaire de compte dédié Shongre',
      'Visibilité prioritaire multi-marchés (FR, BE, CH, LU)',
    ],
  },
];

export interface IMonetizationRepository {
  getBoosts(listingId?: string): Promise<ListingBoostOption[]>;
  getPlans(): Promise<ProPlan[]>;
  applyBoost(listingId: string, boostId: string, paymentMethod: string): Promise<{ success: boolean; expiresAt: string }>;
  subscribe(sellerId: string, planId: string): Promise<{ success: boolean; plan: ProPlan }>;
}

export class DemoMonetizationRepository implements IMonetizationRepository {
  async getBoosts(listingId?: string): Promise<ListingBoostOption[]> {
    return CANONICAL_DEMO_BOOSTS;
  }

  async getPlans(): Promise<ProPlan[]> {
    return CANONICAL_DEMO_PRO_PLANS;
  }

  async applyBoost(listingId: string, boostId: string, paymentMethod: string): Promise<{ success: boolean; expiresAt: string }> {
    const boost = CANONICAL_DEMO_BOOSTS.find((b) => b.id === boostId) || CANONICAL_DEMO_BOOSTS[0];
    const expiresAt = new Date(Date.now() + boost.durationDays * 24 * 60 * 60 * 1000).toISOString();
    return { success: true, expiresAt };
  }

  async subscribe(sellerId: string, planId: string): Promise<{ success: boolean; plan: ProPlan }> {
    const plan = CANONICAL_DEMO_PRO_PLANS.find((p) => p.id === planId) || CANONICAL_DEMO_PRO_PLANS[1];
    return { success: true, plan };
  }
}

export class PostgresMonetizationRepository implements IMonetizationRepository {
  async getBoosts(listingId?: string): Promise<ListingBoostOption[]> {
    return CANONICAL_DEMO_BOOSTS;
  }

  async getPlans(): Promise<ProPlan[]> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase.from('subscription_plans').select('*').eq('is_active', true);
      if (error || !data || data.length === 0) {
        return CANONICAL_DEMO_PRO_PLANS;
      }
      return data.map((d: any) => ({
        id: d.id,
        name: d.name,
        priceMonthly: Number(d.price_monthly),
        priceYearly: Number(d.price_yearly),
        features: Array.isArray(d.features) ? d.features : [],
        maxListings: d.id === 'starter' ? 50 : d.id === 'pro' ? 500 : 99999,
        highlighted: d.id === 'pro',
      }));
    } catch {
      return CANONICAL_DEMO_PRO_PLANS;
    }
  }

  async applyBoost(listingId: string, boostId: string, paymentMethod: string): Promise<{ success: boolean; expiresAt: string }> {
    const boost = CANONICAL_DEMO_BOOSTS.find((b) => b.id === boostId) || CANONICAL_DEMO_BOOSTS[0];
    const expiresAt = new Date(Date.now() + boost.durationDays * 24 * 60 * 60 * 1000).toISOString();

    try {
      const supabase = getSupabaseAdminClient();
      const updates: any = {};
      if (boost.type === 'urgent') {
        updates.is_urgent = true;
        updates.urgent_expires_at = expiresAt;
      } else if (boost.type === 'featured') {
        updates.is_featured = true;
        updates.featured_expires_at = expiresAt;
      } else if (boost.type === 'search_bump') {
        updates.bumped_at = new Date().toISOString();
      }

      await (supabase.from('listings' as any) as any).update(updates).eq('id', listingId);
    } catch (err: any) {
      logger.warn(`PostgresMonetizationRepository.applyBoost DB update skipped: ${err.message}`);
    }

    return { success: true, expiresAt };
  }

  async subscribe(sellerId: string, planId: string): Promise<{ success: boolean; plan: ProPlan }> {
    const plan = (await this.getPlans()).find((p) => p.id === planId) || CANONICAL_DEMO_PRO_PLANS[1];
    try {
      const supabase = getSupabaseAdminClient();
      await (supabase.from('subscriptions' as any) as any).insert({
        seller_id: sellerId,
        plan_id: plan.id,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      } as any);
    } catch (err: any) {
      logger.warn(`PostgresMonetizationRepository.subscribe DB insert skipped: ${err.message}`);
    }
    return { success: true, plan };
  }
}
