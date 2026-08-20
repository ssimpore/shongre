import { describe, it, expect } from 'vitest';
import { newsletterTopicsService } from './newsletter.topics';
import { newsletterCapabilitiesService } from './newsletter.capabilities';
import { DEMO_USERS } from '../../mocks/initialDemoData';

describe('Newsletter Topics & Capabilities', () => {
  it('retrieves topics correctly', () => {
    const dealsTopic = newsletterTopicsService.getTopic('deals');
    expect(dealsTopic).toBeDefined();
    expect(dealsTopic?.label).toContain('Bons plans');
  });

  it('filters topics by audience (individual vs professional)', () => {
    const individualTopics = newsletterTopicsService.getTopicsForAudience(false);
    expect(individualTopics.some((t) => t.id === 'pro_insights')).toBe(false);
    expect(individualTopics.some((t) => t.id === 'editorial')).toBe(true);

    const proTopics = newsletterTopicsService.getTopicsForAudience(true);
    expect(proTopics.some((t) => t.id === 'pro_insights')).toBe(true);
    expect(proTopics.some((t) => t.id === 'editorial')).toBe(false);
  });

  it('resolves capabilities correctly for different roles', () => {
    const buyerCaps = newsletterCapabilitiesService.resolve({ viewer: DEMO_USERS.buyer_thomas });
    expect(buyerCaps.isPro).toBe(false);
    expect(buyerCaps.canAdminCampaigns).toBe(false);

    const proCaps = newsletterCapabilitiesService.resolve({ viewer: DEMO_USERS.pro_atelier });
    expect(proCaps.isPro).toBe(true);

    const adminCaps = newsletterCapabilitiesService.resolve({ viewer: DEMO_USERS.admin_antoine });
    expect(adminCaps.canAdminCampaigns).toBe(true);
  });
});
