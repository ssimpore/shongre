import { describe, it, expect } from 'vitest';
import { demoAiService } from './demo-ai.service';

describe('DemoAiService - Listing Assistance & Anti-Fraud Safety Analysis', () => {
  it('generates structured listing content with title, description, category and price range', async () => {
    const result = await demoAiService.generateListingAssistance({
      rawInput: 'Vélo de route Trek Emonda carbone',
      condition: 'excellent',
      existingPrice: 950,
    });

    expect(result).toBeDefined();
    expect(result.title.length).toBeGreaterThan(5);
    expect(result.description.length).toBeGreaterThan(20);
    expect(result.suggestedCategorySlug).toBeTruthy();
    expect(result.estimatedPrice.recommended).toBeGreaterThan(0);
    expect(result.tips.length).toBeGreaterThan(0);
  });

  it('detects prohibited items or scam keywords in listing safety audit', async () => {
    const suspiciousListing = {
      title: 'iPhone 15 Pro Max 1TB Neuf',
      description: 'Paiement uniquement par coupon PCS ou mandat cash western union sans voir le produit.',
      price: 25,
    };

    const analysis = await demoAiService.analyzeListingSafety(suspiciousListing);

    expect(analysis.riskScore).toBeGreaterThan(50);
    expect(analysis.verdict).not.toBe('compliant');
    expect(['hide', 'delete']).toContain(analysis.recommendedAction);
    expect(analysis.flaggedKeywords.length).toBeGreaterThan(0);
  });

  it('marks a legitimate listing as compliant with low risk score', async () => {
    const legitListing = {
      title: 'Table basse vintage en chêne massif',
      description: 'Très belle table basse en chêne des années 70, quelques traces d\'usage normales. Remise en main propre sur Bordeaux.',
      price: 120,
    };

    const analysis = await demoAiService.analyzeListingSafety(legitListing);

    expect(analysis.riskScore).toBeLessThan(25);
    expect(analysis.verdict).toBe('compliant');
    expect(analysis.recommendedAction).toBe('approve');
  });
});
