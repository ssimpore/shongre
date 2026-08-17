import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createHttpServer } from '../../src/app/server/index.js';
import { Server } from 'http';

describe('API v1 Endpoints Integration', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createHttpServer();
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const address = server.address() as any;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
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
    expect(data).toBeDefined();
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
    expect(data.items).toBeDefined();
    expect(Array.isArray(data.items)).toBe(true);
  });

  it('POST /api/v1/auth/login logs in a user and returns token', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'thomas.laurent@example.fr' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user).toBeDefined();
    expect(data.token).toBeDefined();
    expect(data.user.email).toBe('thomas.laurent@example.fr');
  });

  it('POST /api/v1/orders/direct-purchase creates order and calculates escrow', async () => {
    const res = await fetch(`${baseUrl}/api/v1/orders/direct-purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listingId: 'list_1',
        buyerId: 'user_thomas',
        deliveryMethod: 'hand_delivery',
        paymentMethod: 'card',
      }),
    });
    expect(res.status).toBe(200);
    const order = await res.json();
    expect(order.id).toBeDefined();
    expect(order.totalCharged).toBeGreaterThan(0);
    expect(order.status).toBe('escrow_funded');
  });

  it('GET /api/v1/promotions/boosts returns boost offers', async () => {
    const res = await fetch(`${baseUrl}/api/v1/promotions/boosts`);
    expect(res.status).toBe(200);
    const boosts = await res.json();
    expect(Array.isArray(boosts)).toBe(true);
    expect(boosts.length).toBeGreaterThanOrEqual(3);
  });

  it('GET /api/v1/verification/status/user_thomas returns verification status', async () => {
    const res = await fetch(`${baseUrl}/api/v1/verification/status/user_thomas`);
    expect(res.status).toBe(200);
    const status = await res.json();
    expect(status.state).toBeDefined();
    expect(status.isPhoneVerified).toBe(true);
  });

  it('GET /api/v1/admin/stats returns platform statistics', async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/stats`);
    expect(res.status).toBe(200);
    const stats = await res.json();
    expect(stats.totalUsers).toBeGreaterThan(0);
    expect(stats.activeTransactions).toBeGreaterThan(0);
  });

  it('POST /api/v1/payments/intent generates payment intent', async () => {
    const res = await fetch(`${baseUrl}/api/v1/payments/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 150, currency: 'EUR' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.clientSecret).toBeDefined();
    expect(data.amount).toBe(150);
  });
});
