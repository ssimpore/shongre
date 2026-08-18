import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createHttpServer } from '../../src/app/server/index.js';
import { seedDemoCredentials, DEMO_ACCOUNT_PASSWORD } from '../../src/app/bootstrap/seed-demo-credentials.js';
import { Server } from 'http';

describe('API v1 Endpoints Integration', () => {
  let server: Server;
  let baseUrl: string;
  let buyerToken: string;
  let adminToken: string;

  async function login(email: string): Promise<string> {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: DEMO_ACCOUNT_PASSWORD }),
    });
    if (res.status !== 200) {
      throw new Error(`Login failed for ${email}: ${res.status} ${await res.text()}`);
    }
    return (await res.json()).token;
  }

  const auth = (token: string) => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });

  beforeAll(async () => {
    // The demo personas need password hashes before login can verify anything.
    await seedDemoCredentials();

    server = createHttpServer();
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const address = server.address() as any;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });

    buyerToken = await login('thomas.laurent@example.fr');
    adminToken = await login('admin@shongre.com');
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('GET /health returns 200 OK', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('shongre-backend');
  });

  // ---------------------------------------------------------------------------
  // Public surface
  // ---------------------------------------------------------------------------

  it('GET /api/v1/markets returns all markets', async () => {
    const res = await fetch(`${baseUrl}/api/v1/markets`);
    expect(res.status).toBe(200);
    const markets = await res.json();
    expect(Array.isArray(markets)).toBe(true);
    expect(markets.some((m: any) => m.code === 'FR')).toBe(true);
  });

  it('GET /api/v1/taxonomy/root returns categories', async () => {
    const res = await fetch(`${baseUrl}/api/v1/taxonomy/root`);
    expect(res.status).toBe(200);
    const categories = await res.json();
    expect(Array.isArray(categories)).toBe(true);
    expect(categories.length).toBeGreaterThan(0);
  });

  it('GET /api/v1/listings returns paginated listings', async () => {
    const res = await fetch(`${baseUrl}/api/v1/listings`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.listings).toBeDefined();
    expect(Array.isArray(data.listings)).toBe(true);
    expect(data.total).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/v1/listings/list_1 returns listing detail', async () => {
    const res = await fetch(`${baseUrl}/api/v1/listings/list_1`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe('list_1');
    expect(data.title).toContain('Vélo');
  });

  it('POST /api/v1/listings/search executes structured search query', async () => {
    const res = await fetch(`${baseUrl}/api/v1/listings/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'Vélo' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.items)).toBe(true);
  });

  it('GET /api/v1/promotions/boosts returns boost offers', async () => {
    const res = await fetch(`${baseUrl}/api/v1/promotions/boosts`);
    expect(res.status).toBe(200);
    const boosts = await res.json();
    expect(Array.isArray(boosts)).toBe(true);
    expect(boosts.length).toBeGreaterThanOrEqual(3);
  });

  // ---------------------------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------------------------

  it('POST /api/v1/auth/login authenticates with a correct password', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'thomas.laurent@example.fr', password: DEMO_ACCOUNT_PASSWORD }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.email).toBe('thomas.laurent@example.fr');
    // A signed JWT, not the previous `jwt_<random>` placeholder.
    expect(data.token.split('.')).toHaveLength(3);
  });

  it('POST /api/v1/auth/login rejects a login with no password', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'thomas.laurent@example.fr' }),
    });
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/auth/login rejects a wrong password', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'thomas.laurent@example.fr', password: 'not-the-password' }),
    });
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/auth/login does not reveal whether an account exists', async () => {
    const unknown = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@example.fr', password: 'whatever-password' }),
    });
    const wrongPassword = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'thomas.laurent@example.fr', password: 'whatever-password' }),
    });

    expect(unknown.status).toBe(wrongPassword.status);
    expect(await unknown.json()).toEqual(await wrongPassword.json());
  });

  it('GET /api/v1/auth/me returns null without a token and the profile with one', async () => {
    const anonymous = await fetch(`${baseUrl}/api/v1/auth/me`);
    expect(anonymous.status).toBe(200);
    expect(await anonymous.json()).toBeNull();

    const authenticated = await fetch(`${baseUrl}/api/v1/auth/me`, { headers: auth(buyerToken) });
    expect((await authenticated.json()).email).toBe('thomas.laurent@example.fr');
  });

  it('rejects a token with a tampered payload', async () => {
    const [header, , signature] = buyerToken.split('.');
    const forgedPayload = Buffer.from(
      JSON.stringify({
        sub: 'user_admin',
        email: 'admin@shongre.com',
        role: 'super_admin',
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    )
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const res = await fetch(`${baseUrl}/api/v1/admin/stats`, {
      headers: { Authorization: `Bearer ${header}.${forgedPayload}.${signature}` },
    });
    expect(res.status).toBe(401);
  });

  // ---------------------------------------------------------------------------
  // Authorization: unauthenticated access is refused
  // ---------------------------------------------------------------------------

  it('refuses unauthenticated access to protected endpoints', async () => {
    const protectedCalls: Array<[string, RequestInit]> = [
      ['/api/v1/admin/stats', {}],
      ['/api/v1/admin/users', {}],
      ['/api/v1/admin/audit-logs', {}],
      ['/api/v1/favorites', {}],
      ['/api/v1/verification/status/user_thomas', {}],
      ['/api/v1/orders/purchases/user_thomas', {}],
      ['/api/v1/messaging/conversations/user_camille', {}],
      ['/api/v1/notifications/user_camille', {}],
      ['/api/v1/payments/balance/user_camille', {}],
      ['/api/v1/workspace/summary/user_thomas', {}],
      [
        '/api/v1/payments/intent',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: 150 }) },
      ],
      [
        '/api/v1/orders/direct-purchase',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listingId: 'list_1', deliveryMethod: 'hand_delivery' }),
        },
      ],
    ];

    for (const [path, init] of protectedCalls) {
      const res = await fetch(`${baseUrl}${path}`, init);
      expect(res.status, path).toBe(401);
    }
  });

  // ---------------------------------------------------------------------------
  // Authorization: authenticated but insufficient
  // ---------------------------------------------------------------------------

  it('refuses admin endpoints to an ordinary buyer', async () => {
    for (const path of ['/api/v1/admin/stats', '/api/v1/admin/users', '/api/v1/admin/audit-logs']) {
      const res = await fetch(`${baseUrl}${path}`, { headers: auth(buyerToken) });
      expect(res.status, path).toBe(403);
    }
  });

  it('allows admin endpoints to an administrator', async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/stats`, { headers: auth(adminToken) });
    expect(res.status).toBe(200);
    const stats = await res.json();
    expect(stats.totalUsers).toBeGreaterThan(0);
  });

  it('refuses a privilege escalation through /auth/switch-role', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/switch-role`, {
      method: 'POST',
      headers: auth(buyerToken),
      body: JSON.stringify({ role: 'super_admin' }),
    });
    expect(res.status).toBe(403);

    // And the session must not have gained anything from the attempt.
    const after = await fetch(`${baseUrl}/api/v1/admin/stats`, { headers: auth(buyerToken) });
    expect(after.status).toBe(403);
  });

  it('allows switching to a role the account actually holds', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/switch-role`, {
      method: 'POST',
      headers: auth(buyerToken),
      body: JSON.stringify({ role: 'individual_seller' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.role).toBe('individual_seller');
    expect(data.token.split('.')).toHaveLength(3);
  });

  it('refuses registration that claims a staff role', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'escalation@example.fr',
        name: 'Escalation Attempt',
        role: 'admin',
        password: 'a-perfectly-long-password',
      }),
    });
    expect(res.status).toBe(403);
  });

  // ---------------------------------------------------------------------------
  // Authorization: cross-user access (IDOR)
  // ---------------------------------------------------------------------------

  it("refuses to return another user's conversations", async () => {
    const res = await fetch(`${baseUrl}/api/v1/messaging/conversations/user_camille`, {
      headers: auth(buyerToken),
    });
    expect(res.status).toBe(404);
  });

  it("refuses to return another user's notifications and orders", async () => {
    for (const path of [
      '/api/v1/notifications/user_camille',
      '/api/v1/orders/purchases/user_camille',
      '/api/v1/workspace/summary/user_camille',
    ]) {
      const res = await fetch(`${baseUrl}${path}`, { headers: auth(buyerToken) });
      expect(res.status, path).toBe(404);
    }
  });

  it('scopes owner-addressed routes to the caller', async () => {
    const byId = await fetch(`${baseUrl}/api/v1/notifications/user_thomas`, { headers: auth(buyerToken) });
    expect(byId.status).toBe(200);

    const byAlias = await fetch(`${baseUrl}/api/v1/notifications/me`, { headers: auth(buyerToken) });
    expect(byAlias.status).toBe(200);

    // Compare identity rather than the whole payload: the demo repository
    // stamps createdAt at call time, so two reads differ by milliseconds.
    const idsOf = (rows: any[]) => rows.map((r) => `${r.id}:${r.userId}`);
    expect(idsOf(await byAlias.json())).toEqual(idsOf(await byId.json()));
  });

  it('ignores a body-supplied identity and uses the authenticated caller', async () => {
    const res = await fetch(`${baseUrl}/api/v1/orders/direct-purchase`, {
      method: 'POST',
      headers: auth(buyerToken),
      body: JSON.stringify({
        listingId: 'list_1',
        buyerId: 'user_camille', // attacker-supplied; must be ignored
        deliveryMethod: 'hand_delivery',
        paymentMethod: 'card',
      }),
    });
    expect(res.status).toBe(200);
    const order = await res.json();
    expect(order.buyerId).toBe('user_thomas');
    expect(order.totalCharged).toBeGreaterThan(0);
  });

  it('refuses profile updates that try to change role or verification state', async () => {
    const res = await fetch(`${baseUrl}/api/v1/users/user_thomas`, {
      method: 'PUT',
      headers: auth(buyerToken),
      body: JSON.stringify({
        name: 'Thomas Renamed',
        primaryRole: 'super_admin',
        status: 'active',
        isIdentityVerified: true,
      }),
    });
    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated.name).toBe('Thomas Renamed');
    expect(updated.primaryRole).not.toBe('super_admin');
  });

  // ---------------------------------------------------------------------------
  // Authenticated happy paths
  // ---------------------------------------------------------------------------

  it('GET /api/v1/verification/status returns the caller status', async () => {
    const res = await fetch(`${baseUrl}/api/v1/verification/status/user_thomas`, { headers: auth(buyerToken) });
    expect(res.status).toBe(200);
    const status = await res.json();
    expect(status.state).toBeDefined();
    expect(status.isPhoneVerified).toBe(true);
  });

  it('POST /api/v1/payments/intent generates a payment intent for an authenticated buyer', async () => {
    const res = await fetch(`${baseUrl}/api/v1/payments/intent`, {
      method: 'POST',
      headers: auth(buyerToken),
      body: JSON.stringify({ amount: 150, currency: 'EUR' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.clientSecret).toBeDefined();
    expect(data.amount).toBe(150);
  });

  // ---------------------------------------------------------------------------
  // Webhooks
  // ---------------------------------------------------------------------------

  it('refuses an unsigned Stripe webhook', async () => {
    const res = await fetch(`${baseUrl}/api/v1/webhooks/stripe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'payment_intent.succeeded' }),
    });
    expect(res.status).toBe(403);
  });
});
