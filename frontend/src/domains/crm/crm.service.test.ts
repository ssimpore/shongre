import { describe, it, expect } from 'vitest';
import { crmService, PIPELINE_STAGES } from './crm.service';
import { crmCapabilitiesService } from './crm.capabilities';
import { DEMO_USERS } from '../../mocks/initialDemoData';

describe('CrmService & Capabilities', () => {
  it('formats money and stages correctly', () => {
    const formatted = crmService.formatCrmMoney({ amountMinor: 118800, currency: 'EUR' });
    expect(formatted).toContain('1');
    expect(formatted).toContain('188');

    const stage = crmService.getStage('negotiation');
    expect(stage.label).toBe('Négociation');
    expect(PIPELINE_STAGES.length).toBe(7);
  });

  it('normalizes domains accurately', () => {
    expect(crmService.normalizeDomain('https://www.atelier-nordique.fr/catalogue')).toBe('atelier-nordique.fr');
    expect(crmService.normalizeDomain('http://voltexpert-france.fr/')).toBe('voltexpert-france.fr');
  });

  it('detects duplicate companies based on domain or name', () => {
    const existingCompanies: any[] = [
      { id: '1', name: 'L\'Atelier Nordique', domain: 'atelier-nordique.fr', website: 'https://atelier-nordique.fr' },
    ];

    const duplicateCand = { name: 'Atelier Nordique', website: 'https://www.atelier-nordique.fr/contact' };
    const dupCheck = crmService.detectDuplicate(duplicateCand, existingCompanies);
    expect(dupCheck.isDuplicate).toBe(true);
    expect(dupCheck.matchedCompany?.id).toBe('1');

    const freshCand = { name: 'Maison Nouvelle', website: 'https://maison-nouvelle.com' };
    const freshCheck = crmService.detectDuplicate(freshCand, existingCompanies);
    expect(freshCheck.isDuplicate).toBe(false);
  });

  it('resolves CRM capabilities based on internal roles', () => {
    const adminCaps = crmCapabilitiesService.resolve({ viewer: DEMO_USERS.admin_antoine });
    expect(adminCaps.canAccessCrm).toBe(true);
    expect(adminCaps.canManageOpportunities).toBe(true);
    expect(adminCaps.canUseAiProspecting).toBe(true);

    const buyerCaps = crmCapabilitiesService.resolve({ viewer: DEMO_USERS.buyer_thomas });
    expect(buyerCaps.canAccessCrm).toBe(false);
    expect(buyerCaps.canUseAiProspecting).toBe(false);
  });
});
