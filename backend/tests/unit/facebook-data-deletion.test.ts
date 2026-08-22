import { createHmac } from 'crypto';
import { describe, expect, it } from 'vitest';
import { DemoAuthRepository } from '../../src/infrastructure/database/repositories/auth.repository.js';
import { FacebookDataDeletionService } from '../../src/modules/auth/facebook-data-deletion.service.js';

const secret = 'facebook-test-secret-that-never-leaves-the-test';

function signedRequest(subject = 'facebook-app-scoped-user-42', issuedAt = Math.floor(Date.now() / 1000)): string {
  const payload = Buffer.from(JSON.stringify({
    algorithm: 'HMAC-SHA256',
    issued_at: issuedAt,
    user_id: subject,
  })).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${signature}.${payload}`;
}

describe('Facebook provider-data deletion callback', () => {
  it('validates the signed request, queues a minimal record, and exposes opaque status', async () => {
    const repository = new DemoAuthRepository();
    await repository.linkIdentity({
      userId: '5ca1d180-7817-4b93-bfbe-f588bcc6bb4e',
      provider: 'facebook',
      providerSubject: 'facebook-app-scoped-user-42',
      providerEmail: null,
      providerEmailVerified: false,
      providerDisplayName: null,
      isPrivateRelay: false,
    });
    const service = new FacebookDataDeletionService(
      repository,
      secret,
      'https://api.shongre.test/api/v1/auth/oauth/facebook/data-deletion/status',
      { deleteFromVerifiedProvider: async () => ({ status: 'completed' }) },
    );

    const result = await service.request(signedRequest());
    expect(result.confirmation_code).toBeTruthy();
    expect(result.url).toContain(encodeURIComponent(result.confirmation_code));
    await expect(service.status(result.confirmation_code)).resolves.toEqual({ status: 'completed' });
    expect(repository.events[0]).toMatchObject({
      eventType: 'account_deletion_requested',
      provider: 'facebook',
    });
    expect(JSON.stringify(repository.events)).not.toContain('facebook-test-secret');
  });

  it('rejects a forged or stale request without queuing it', async () => {
    const repository = new DemoAuthRepository();
    const service = new FacebookDataDeletionService(repository, secret);
    await expect(service.request(`forged.${signedRequest().split('.')[1]}`)).rejects.toThrow('invalide');
    await expect(service.request(signedRequest('old-user', Math.floor(Date.now() / 1000) - 90_000))).rejects.toThrow('invalide');
    expect(repository.events).toEqual([]);
  });
});
