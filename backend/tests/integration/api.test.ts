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
});
