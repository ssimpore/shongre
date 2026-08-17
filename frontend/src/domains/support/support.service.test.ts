import { describe, it, expect } from 'vitest';
import { supportService } from './support.service';

describe('SupportService', () => {
  it('generates a valid Shongre reference code', () => {
    const ref = supportService.generateReference();
    expect(ref).toMatch(/^SHG-\d{6}$/);
  });

  it('formats status information into clear French copy', () => {
    const submitted = supportService.getStatusInfo('submitted');
    expect(submitted.label).toBe('Demande envoyée');
    expect(submitted.variant).toBe('primary');

    const waiting = supportService.getStatusInfo('waiting_for_user');
    expect(waiting.label).toContain('Réponse attendue');
    expect(waiting.variant).toBe('urgent');
  });

  it('validates support form inputs thoroughly', () => {
    const invalidRes = supportService.validateSupportInput({});
    expect(invalidRes.isValid).toBe(false);
    expect(invalidRes.errors.category).toBeDefined();
    expect(invalidRes.errors.requesterEmail).toBeDefined();

    const validRes = supportService.validateSupportInput({
      category: 'payment',
      reason: 'payment_refused',
      requesterName: 'Thomas Laurent',
      requesterEmail: 'thomas@example.fr',
      subject: 'Carte refusée lors du paiement',
      description: 'Mon paiement de 450 € a été refusé par ma banque alors que le solde est suffisant.',
    });
    expect(validRes.isValid).toBe(true);
    expect(Object.keys(validRes.errors).length).toBe(0);
  });
});
