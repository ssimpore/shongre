import { describe, it, expect } from 'vitest';
import { supportCategoriesService, SUPPORT_CATEGORIES } from './support.categories';
import { supportCapabilitiesService } from './support.capabilities';
import { DEMO_USERS } from '../../mocks/initialDemoData';

describe('Support Categories & Capabilities', () => {
  it('retrieves categories and hierarchical reasons correctly', () => {
    const paymentCat = supportCategoriesService.getCategory('payment');
    expect(paymentCat).toBeDefined();
    expect(paymentCat?.label).toContain('Paiement');
    expect(paymentCat?.reasons.length).toBeGreaterThan(0);

    const specificReason = supportCategoriesService.getReason('payment', 'payment_refused');
    expect(specificReason).toBeDefined();
    expect(specificReason?.label).toContain('refusé');
  });

  it('correctly identifies dispute and report handoffs', () => {
    const disputeReason = supportCategoriesService.getReason('purchase', 'purchase_item_not_received');
    expect(disputeReason?.isDisputeHandoff).toBe(true);

    const reportReason = supportCategoriesService.getReason('safety', 'safety_report_user');
    expect(reportReason?.isReportHandoff).toBe(true);

    const messagingReason = supportCategoriesService.getReason('purchase', 'purchase_contact_seller');
    expect(messagingReason?.isMessagingHandoff).toBe(true);
  });

  it('filters pro categories for individual users and displays them for pro users', () => {
    const individualCaps = supportCapabilitiesService.resolve({ viewer: DEMO_USERS.buyer_thomas });
    expect(individualCaps.isPro).toBe(false);
    expect(individualCaps.availableCategories.some((c) => c.id === 'pro_account')).toBe(false);

    const proCaps = supportCapabilitiesService.resolve({ viewer: DEMO_USERS.pro_atelier });
    expect(proCaps.isPro).toBe(true);
    expect(proCaps.availableCategories.some((c) => c.id === 'pro_account')).toBe(true);
  });
});
