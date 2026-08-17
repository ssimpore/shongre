/**
 * SHONGRE AI PROSPECT RESEARCH SERVICE
 * Replaceable contract and deterministic demo implementation for AI-assisted
 * public web research, prospect fit scoring, and public source provenance.
 */

import {
  ProspectResearchQuery,
  ProspectResearchResult,
  ProspectResearchCandidate,
  CompanyEnrichmentDiff,
} from '../domains/crm/crm.types';
import { providerService } from '../domains/providers/provider.service';

export interface IProspectResearchService {
  searchProspects(query: ProspectResearchQuery): Promise<ProspectResearchResult>;
  enrichCompany(companyId: string): Promise<CompanyEnrichmentDiff>;
}

const DEMO_FURNITURE_PROSPECTS: ProspectResearchCandidate[] = [
  {
    id: 'ai-cand-1',
    company: {
      name: 'Maison Déco & Mobilier Parisien',
      website: 'https://maison-deco-paris.fr',
      domain: 'maison-deco-paris.fr',
      location: 'Paris 11e • Île-de-France',
      industry: 'Mobilier & Décoration vintage',
      description: 'Boutique spécialisée dans le mobilier scandinave des années 50-70 et l\'éclairage vintage.',
      estimatedSize: '5 à 10 salariés',
    },
    suggestedTaxonomySlugs: ['furniture', 'home-appliances'],
    fit: {
      score: 92,
      level: 'high',
      reasons: [
        'Important catalogue de mobilier vintage compatible avec la communauté Shongre',
        'Vente e-commerce active avec stock disponible',
        'Magasin physique réputé à Paris propice à la remise en main propre sécurisée',
      ],
      caveats: ['Tarification positionnée moyen/haut de gamme'],
    },
    sources: [
      {
        id: 'src-1',
        url: 'https://maison-deco-paris.fr/a-propos',
        title: 'Maison Déco Paris — Boutique officielle & Histoire',
        snippet: 'Spécialistes du design vintage scandinave depuis 2014 dans le 11ème arrondissement de Paris...',
        sourceType: 'Site web officiel',
        retrievedAt: '2026-08-17T00:00:00Z',
      },
      {
        id: 'src-2',
        url: 'https://societe.com/societe/maison-deco-paris',
        title: 'Fiche Entreprise — Maison Déco Paris SAS',
        snippet: 'Commerce de détail de meubles. SIREN 814 291 002. Chiffre d\'affaires en croissance...',
        sourceType: 'Registre public',
        retrievedAt: '2026-08-17T00:00:00Z',
      },
    ],
    status: 'discovered',
  },
  {
    id: 'ai-cand-2',
    company: {
      name: 'Atelier Boiseries & Métal',
      website: 'https://atelier-boiseries-idf.com',
      domain: 'atelier-boiseries-idf.com',
      location: 'Montreuil • Seine-Saint-Denis',
      industry: 'Mobilier artisanal & Décoration industrielle',
      description: 'Créateur et restaurateur de tables sur mesure en chêne massif et acier.',
      estimatedSize: '2 à 5 salariés',
    },
    suggestedTaxonomySlugs: ['furniture'],
    fit: {
      score: 86,
      level: 'high',
      reasons: [
        'Fabrication artisanale française très demandée sur les marketplaces',
        'Photos haute résolution prêtes pour la vitrine Shongre Pro',
        'Expéditions volumineuses adaptées au transporteur partenaire Cocolis',
      ],
    },
    sources: [
      {
        id: 'src-3',
        url: 'https://atelier-boiseries-idf.com/catalogue',
        title: 'Atelier Boiseries — Catalogue Tables & Meubles',
        snippet: 'Créations sur mesure et pièces uniques fabriquées en Île-de-France...',
        sourceType: 'Site web officiel',
        retrievedAt: '2026-08-17T00:00:00Z',
      },
    ],
    status: 'discovered',
  },
  {
    id: 'ai-cand-3',
    company: {
      name: 'Galerie Rive Gauche Antiquités',
      website: 'https://galerie-rive-gauche.fr',
      domain: 'galerie-rive-gauche.fr',
      location: 'Boulogne-Billancourt • Hauts-de-Seine',
      industry: 'Antiquités & Objets d\'art',
      description: 'Antiquaire généraliste proposant miroirs anciens, pendules et commodes d\'époque.',
      estimatedSize: '1 à 3 salariés',
    },
    suggestedTaxonomySlugs: ['art-collectibles', 'furniture'],
    fit: {
      score: 74,
      level: 'medium',
      reasons: [
        'Catalogue haut de gamme valorisant pour la catégorie Art & Collections',
        'Certificats d\'authenticité délivrés',
      ],
      caveats: ['Présence e-commerce limitée, nécessite un accompagnement à la publication'],
    },
    sources: [
      {
        id: 'src-4',
        url: 'https://galerie-rive-gauche.fr/contact',
        title: 'Galerie Rive Gauche — Contact & Horaires',
        snippet: 'Boutique d\'antiquités ouverte du mardi au samedi...',
        sourceType: 'Annuaire professionnel',
        retrievedAt: '2026-08-17T00:00:00Z',
      },
    ],
    status: 'discovered',
  },
];

const DEMO_EV_PROSPECTS: ProspectResearchCandidate[] = [
  {
    id: 'ai-cand-ev-1',
    company: {
      name: 'VoltExpert Mobilité France',
      website: 'https://voltexpert-france.fr',
      domain: 'voltexpert-france.fr',
      location: 'Lyon • Rhône-Alpes',
      industry: 'Bornes de recharge & Mobilité électrique',
      description: 'Distributeur et installateur certifié IRVE de bornes de recharge pour particuliers et pros.',
      estimatedSize: '15 à 25 salariés',
    },
    suggestedTaxonomySlugs: ['vehicles', 'tools'],
    fit: {
      score: 95,
      level: 'high',
      reasons: [
        'Catalogue matériel professionnel à forte valeur ajoutée',
        'Recherche active de canaux de distribution marketplace',
        'Garantie fabricant 3 ans et certification IRVE',
      ],
    },
    sources: [
      {
        id: 'src-ev-1',
        url: 'https://voltexpert-france.fr/produits',
        title: 'VoltExpert — Gamme de bornes 7.4kW à 22kW',
        snippet: 'Vente directe et packs installation pour véhicules électriques...',
        sourceType: 'Site web officiel',
        retrievedAt: '2026-08-17T00:00:00Z',
      },
    ],
    status: 'discovered',
  },
  {
    id: 'ai-cand-ev-2',
    company: {
      name: 'Éco-Recharge Solutions',
      website: 'https://eco-recharge-solutions.com',
      domain: 'eco-recharge-solutions.com',
      location: 'Nantes • Loire-Atlantique',
      industry: 'Énergie & Bornes solaires',
      description: 'Solutions de recharge couplées au solaire pour maisons individuelles et copropriétés.',
      estimatedSize: '8 à 12 salariés',
    },
    suggestedTaxonomySlugs: ['tools', 'home-appliances'],
    fit: {
      score: 81,
      level: 'high',
      reasons: [
        'Offres innovantes en plein essor',
        'Intérêt pour la vitrine Shongre Pro locale',
      ],
    },
    sources: [
      {
        id: 'src-ev-2',
        url: 'https://eco-recharge-solutions.com',
        title: 'Éco-Recharge Solutions — Accueil & Devis',
        snippet: 'Installateur qualifié en Pays de la Loire...',
        sourceType: 'Site web officiel',
        retrievedAt: '2026-08-17T00:00:00Z',
      },
    ],
    status: 'discovered',
  },
];

export class DemoProspectResearchService implements IProspectResearchService {
  async searchProspects(query: ProspectResearchQuery): Promise<ProspectResearchResult> {
    // Check if AI / search capability is enabled
    const isAiAvailable = providerService.isCapabilityAvailable('ai.prospect_research');
    if (!isAiAvailable) {
      return {
        query,
        candidates: [],
        totalFound: 0,
        researchedAt: new Date().toISOString(),
      };
    }

    // Simulate brief network / AI reasoning latency
    await new Promise((resolve) => setTimeout(resolve, 650));

    const q = query.naturalLanguageQuery.toLowerCase();

    let candidates: ProspectResearchCandidate[] = [];

    if (q.includes('borne') || q.includes('recharge') || q.includes('véhicule') || q.includes('auto') || q.includes('énergie')) {
      candidates = DEMO_EV_PROSPECTS;
    } else {
      candidates = DEMO_FURNITURE_PROSPECTS;
    }

    return {
      query,
      candidates,
      totalFound: candidates.length,
      researchedAt: new Date().toISOString(),
    };
  }

  async enrichCompany(companyId: string): Promise<CompanyEnrichmentDiff> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      companyId,
      suggestedIndustry: 'Mobilier design & Restauration vintage',
      suggestedWebsite: 'https://atelier-nordique.fr',
      suggestedCatalogSize: 140,
      suggestedSummary: 'Atelier artisanal spécialisé dans le mobilier d\'exception avec vitrine e-commerce et atelier physique.',
      suggestedTaxonomySlugs: ['furniture', 'art-collectibles'],
      sources: [
        {
          id: 'src-enrich-1',
          url: 'https://atelier-nordique.fr/a-propos',
          title: 'Atelier Nordique — Présentation officielle',
          snippet: 'Créateurs et restaurateurs de mobilier scandinave...',
          sourceType: 'Site officiel',
          retrievedAt: new Date().toISOString(),
        },
      ],
    };
  }
}

export const prospectResearchService: IProspectResearchService = new DemoProspectResearchService();
