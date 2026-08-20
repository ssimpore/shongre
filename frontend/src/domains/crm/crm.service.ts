/**
 * SHONGRE CRM SERVICE
 * Utilities for pipeline stages, lifecycle formatting, money calculations, and deduplication.
 */

import {
  OpportunityStage,
  OpportunityType,
  ContactLifecycle,
  CompanyLifecycle,
  ContactQualification,
  CrmMoney,
  CrmCompany
  
} from './crm.types';

export interface StageMetadata {
  id: OpportunityStage;
  label: string;
  order: number;
  color: string;
  description: string;
}

export const PIPELINE_STAGES: StageMetadata[] = [
  { id: 'new', label: 'Nouveau', order: 1, color: 'bg-stone-100 text-stone-700', description: 'Opportunité identifiée' },
  { id: 'qualified', label: 'Qualifié', order: 2, color: 'bg-blue-100 text-blue-800', description: 'Intérêt confirmé et fit validé' },
  { id: 'contacted', label: 'Contacté', order: 3, color: 'bg-purple-100 text-purple-800', description: 'Premier échange ou démo planifiée' },
  { id: 'proposal', label: 'Proposition', order: 4, color: 'bg-amber-100 text-amber-800', description: 'Devis ou offre Pro soumise' },
  { id: 'negotiation', label: 'Négociation', order: 5, color: 'bg-indigo-100 text-indigo-800', description: 'Discussion contractuelle en cours' },
  { id: 'won', label: 'Gagné (Converti)', order: 6, color: 'bg-emerald-100 text-emerald-800', description: 'Vendeur Pro actif / contrat signé' },
  { id: 'lost', label: 'Perdu', order: 7, color: 'bg-rose-100 text-rose-800', description: 'Sans suite ou refus' },
];

export class CrmService {
  getStage(stage: OpportunityStage): StageMetadata {
    return PIPELINE_STAGES.find((s) => s.id === stage) || PIPELINE_STAGES[0];
  }

  getLifecycleInfo(lifecycle: ContactLifecycle | CompanyLifecycle): {
    label: string;
    variant: 'neutral' | 'primary' | 'pro' | 'verified' | 'urgent' | 'deal' | 'warning' | 'success';
  } {
    switch (lifecycle) {
      case 'lead':
        return { label: 'Piste brute', variant: 'neutral' };
      case 'prospect':
        return { label: 'Prospect', variant: 'primary' };
      case 'qualified':
        return { label: 'Qualifié', variant: 'deal' };
      case 'customer':
        return { label: 'Client / Pro', variant: 'success' };
      case 'partner':
        return { label: 'Partenaire', variant: 'pro' };
      case 'do_not_contact':
        return { label: 'Ne pas contacter', variant: 'urgent' };
      case 'archived':
        return { label: 'Archivé', variant: 'neutral' };
    }
  }

  getQualificationInfo(qualification: ContactQualification): {
    label: string;
    badgeClass: string;
  } {
    switch (qualification) {
      case 'high':
        return { label: 'Priorité Haute', badgeClass: 'bg-emerald-100 text-emerald-800' };
      case 'medium':
        return { label: 'Priorité Moyenne', badgeClass: 'bg-amber-100 text-amber-800' };
      case 'low':
        return { label: 'Priorité Basse', badgeClass: 'bg-stone-100 text-stone-700' };
      case 'unqualified':
        return { label: 'Non qualifié', badgeClass: 'bg-stone-100 text-stone-500' };
    }
  }

  getOpportunityTypeLabel(type: OpportunityType): string {
    switch (type) {
      case 'pro_seller_acquisition':
        return 'Acquisition Vendeur Pro';
      case 'pro_subscription_upgrade':
        return 'Upgrade Forfait Pro (Business/Entreprise)';
      case 'advertising':
        return 'Campagne Publicitaire & Visibilité';
      case 'partnership':
        return 'Partenariat Stratégique';
      case 'enterprise_account':
        return 'Compte Clé Grands Comptes';
    }
  }

  formatCrmMoney(money: CrmMoney): string {
    const euros = money.amountMinor / 100;
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: money.currency,
      maximumFractionDigits: 0,
    }).format(euros);
  }

  normalizeDomain(urlOrDomain: string): string {
    let clean = urlOrDomain.trim().toLowerCase();
    clean = clean.replace(/^https?:\/\//, '');
    clean = clean.replace(/^www\./, '');
    clean = clean.split('/')[0];
    return clean;
  }

  detectDuplicate(
    candidate: { name: string; website?: string; domain?: string },
    existingCompanies: CrmCompany[]
  ): { isDuplicate: boolean; matchedCompany?: CrmCompany } {
    const candDomain = candidate.domain || (candidate.website ? this.normalizeDomain(candidate.website) : '');
    const candName = candidate.name.toLowerCase().trim();

    for (const company of existingCompanies) {
      const compDomain = company.domain || (company.website ? this.normalizeDomain(company.website) : '');
      if (candDomain && compDomain && candDomain === compDomain) {
        return { isDuplicate: true, matchedCompany: company };
      }
      if (company.name.toLowerCase().trim() === candName) {
        return { isDuplicate: true, matchedCompany: company };
      }
    }

    return { isDuplicate: false };
  }
}

export const crmService = new CrmService();
