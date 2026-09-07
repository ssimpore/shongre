import { createHmac } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { z } from "zod";
import {
  browserApi,
  loginWithForm,
  refreshSessionAndReload,
} from "./browser-api";
import { useEstablishedConsent } from "./personas";

const account = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
});
const fixturesSchema = z.object({
  environment: z.literal("staging"),
  release: z.string().regex(/^[a-f0-9]{40}$/),
  providerMode: z.literal("sandbox"),
  buyer: account,
  seller: account,
  outsider: account,
  finance: account.extend({ totpSecret: z.string().regex(/^[A-Z2-7]+=*$/) }),
  favoriteListingId: z.string().min(1),
  conversationListingId: z.string().min(1),
  checkoutListingId: z.string().min(1),
  refundableOrderId: z.string().min(1),
  publicationDraft: z.record(z.string(), z.unknown()),
  invoiceInput: z.record(z.string(), z.unknown()),
});
type Fixtures = z.infer<typeof fixturesSchema>;

test.use({ trace: "off", screenshot: "off", video: "off" });

// RFC 6238 client code for the dedicated staging Staff account. Server MFA,
// replay protection and recent-authentication checks remain fully enabled.
function totp(secret: string) {
  const bits = secret
    .replace(/=+$/, "")
    .split("")
    .map((character) =>
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
        .indexOf(character)
        .toString(2)
        .padStart(5, "0"),
    )
    .join("");
  const key = Buffer.from(
    (bits.match(/.{8}/g) || []).map((byte) => parseInt(byte, 2)),
  );
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const digest = createHmac("sha1", key).update(counter).digest();
  const offset = digest[digest.length - 1] & 15;
  return String(
    (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000,
  ).padStart(6, "0");
}

test.describe("authenticated staging certification", () => {
  test.skip(
    !process.env.PLAYWRIGHT_BASE_URL,
    "Hosted deployment variables are required.",
  );
  test.describe.configure({ mode: "serial", retries: 0, timeout: 120_000 });
  // No credential-bearing DOM, session tokens or private responses in artifacts.
  let fixtures: Fixtures;
  let france: string;
  let international: string;
  const release = process.env.PLAYWRIGHT_EXPECTED_RELEASE;

  test.beforeAll(async ({ request }) => {
    expect(process.env.PLAYWRIGHT_EXPECTED_ENVIRONMENT).toBe("staging");
    expect(process.env.PLAYWRIGHT_ALLOW_STAGING_WRITES).toBe("true");
    // Validate without rendering secret input in a Playwright assertion/error.
    try {
      fixtures = fixturesSchema.parse(
        JSON.parse(process.env.STAGING_JOURNEY_FIXTURES_JSON || ""),
      );
    } catch {
      throw new Error(
        "A valid protected staging journey fixture is required; see docs/operations/release.md.",
      );
    }
    expect(fixtures.release).toBe(release);
    expect(
      new Set([
        fixtures.buyer.id,
        fixtures.seller.id,
        fixtures.outsider.id,
        fixtures.finance.id,
      ]).size,
    ).toBe(4);
    france = new URL(process.env.PLAYWRIGHT_FR_URL!).origin;
    international = new URL(process.env.PLAYWRIGHT_BASE_URL!).origin;
    const origins = [
      france,
      international,
      new URL(process.env.PLAYWRIGHT_FACTURATION_URL!).origin,
    ];
    expect(new Set(origins).size).toBe(3);
    for (const origin of origins) {
      expect(new URL(origin).protocol).toBe("https:");
      // Require the exact Web artifact on every participating site before writes.
      const response = await request.get(`${origin}/healthz`);
      expect(response.status()).toBe(200);
      const web = await response.json();
      expect(web.release).toBe(release);
    }
    const live = await request.get(
      new URL("/livez", process.env.PLAYWRIGHT_API_URL!).toString(),
    );
    expect(live.status()).toBe(200);
    const deployment = await live.json();
    expect(deployment.environment).toBe("staging");
    expect(deployment.release).toBe(release);
  });
  test.beforeEach(async ({ page }) => {
    await useEstablishedConsent(page);
  });

  async function login(
    page: Page,
    who: "buyer" | "seller" | "outsider",
    origin = france,
    prefix = "",
  ) {
    await loginWithForm(page, origin, fixtures[who], prefix);
  }
  async function logout(page: Page) {
    expect(
      (await browserApi(page, "/auth/logout", { method: "POST", body: {} }))
        .status,
    ).toBe(200);
    expect((await browserApi(page, "/auth/me")).body.id).toBeUndefined();
  }

  test("authenticates, refreshes, mutates and logs out on both marketplace origins", async ({
    page,
    context,
  }) => {
    for (const [origin, prefix, market] of [
      [france, "", "FR"],
      [international, "/be", "BE"],
    ]) {
      await login(page, "buyer", origin, prefix);
      const cookie = (await context.cookies(origin)).find(
        (value) => value.name === "shongre_access",
      );
      expect(cookie?.httpOnly).toBe(true);
      expect(cookie?.secure).toBe(true);
      expect(cookie?.domain).toBe(new URL(origin).hostname);
      expect(
        (
          await browserApi(page, "/listing-drafts", {
            method: "POST",
            market,
            csrf: false,
          })
        ).status,
      ).toBe(403);
      expect(
        (await browserApi(page, "/listing-drafts", { method: "POST", market }))
          .status,
      ).toBe(200);
      await refreshSessionAndReload(page, market);
      expect((await browserApi(page, "/auth/me", { market })).body.id).toBe(
        fixtures.buyer.id,
      );
      await logout(page);
    }
  });

  test("isolates favorites by account and market", async ({ page }) => {
    await login(page, "buyer");
    const path = `/listings/${encodeURIComponent(fixtures.favoriteListingId)}/favorite`;
    expect(
      (
        await browserApi(page, path, {
          method: "PUT",
          body: { isFavorite: true },
        })
      ).status,
    ).toBe(200);
    expect((await browserApi(page, "/favorites")).body.listingIds).toContain(
      fixtures.favoriteListingId,
    );
    await logout(page);
    await login(page, "outsider");
    expect(
      (await browserApi(page, "/favorites")).body.listingIds,
    ).not.toContain(fixtures.favoriteListingId);
    await logout(page);
    await login(page, "buyer", international, "/be");
    expect(
      (await browserApi(page, "/favorites", { market: "BE" })).body.listingIds,
    ).not.toContain(fixtures.favoriteListingId);
    await logout(page);
    await login(page, "buyer");
    expect(
      (
        await browserApi(page, path, {
          method: "PUT",
          body: { isFavorite: false },
        })
      ).status,
    ).toBe(200);
    await logout(page);
  });

  test("publishes a listing and enforces conversation ownership", async ({
    page,
  }) => {
    await login(page, "seller");
    const publication = await browserApi(page, "/listings/publish", {
      method: "POST",
      body: { draft: fixtures.publicationDraft },
    });
    expect(publication.status).toBe(200);
    expect(typeof publication.body.id).toBe("string");
    expect(publication.body.sellerId).toBe(fixtures.seller.id);
    await logout(page);
    await login(page, "buyer");
    const conversation = await browserApi(page, "/messaging/conversations", {
      method: "POST",
      body: {
        listingId: fixtures.conversationListingId,
        initialMessage: `Staging certification ${release}`,
      },
    });
    expect(conversation.status).toBe(200);
    expect(typeof conversation.body.id).toBe("string");
    const messages = `/messaging/conversations/${encodeURIComponent(String(conversation.body.id))}/messages`;
    expect((await browserApi(page, messages)).status).toBe(200);
    await logout(page);
    await login(page, "seller");
    expect((await browserApi(page, messages)).status).toBe(200);
    await logout(page);
    await login(page, "outsider");
    expect([403, 404]).toContain((await browserApi(page, messages)).status);
    await logout(page);
  });

  test("creates an invoice idempotently and denies another tenant", async ({
    page,
  }) => {
    const origin = new URL(process.env.PLAYWRIGHT_FACTURATION_URL!).origin;
    await login(page, "seller", origin);
    const options = {
      method: "POST",
      body: fixtures.invoiceInput,
      idempotencyKey: `staging-invoice-${release}`,
    };
    const first = await browserApi(page, "/invoicing/invoices", options);
    expect([200, 201]).toContain(first.status);
    expect(typeof first.body.id).toBe("string");
    const second = await browserApi(page, "/invoicing/invoices", options);
    expect([200, 201]).toContain(second.status);
    expect(second.body.id).toBe(first.body.id);
    await logout(page);
    await login(page, "outsider", origin);
    expect([403, 404]).toContain(
      (
        await browserApi(
          page,
          `/invoicing/invoices/${encodeURIComponent(String(first.body.id))}`,
        )
      ).status,
    );
    await logout(page);
  });

  test("creates a sandbox checkout and processes an authorized refund", async ({
    page,
  }) => {
    await login(page, "buyer");
    const checkout = await browserApi(page, "/orders/direct-purchase", {
      method: "POST",
      body: {
        listingId: fixtures.checkoutListingId,
        deliveryMethod: "hand_delivery",
        idempotencyKey: `staging-checkout-${release}`,
      },
    });
    expect(checkout.status).toBe(200);
    const session = checkout.body.checkout as Record<string, unknown>;
    expect(String(session.id).startsWith("cs_test_")).toBe(true);
    expect(new URL(String(session.url)).hostname).toBe("checkout.stripe.com");
    const refundPath = `/orders/${encodeURIComponent(fixtures.refundableOrderId)}/refund`;
    const refundOptions = {
      method: "POST",
      body: { idempotencyKey: `staging-refund-${release}` },
    };
    expect((await browserApi(page, refundPath, refundOptions)).status).toBe(
      403,
    );
    await logout(page);
    const authentication = await browserApi(page, "/auth/login", {
      method: "POST",
      body: {
        email: fixtures.finance.email,
        password: fixtures.finance.password,
      },
    });
    expect(authentication.status).toBe(200);
    expect(authentication.body.requiresMfa).toBe(true);
    const challenge = await browserApi(page, "/auth/mfa/challenge", {
      method: "POST",
      body: {
        tempMfaToken: authentication.body.tempMfaToken,
        code: totp(fixtures.finance.totpSecret),
      },
    });
    expect(challenge.status).toBe(200);
    expect((await browserApi(page, "/auth/me")).body.id).toBe(
      fixtures.finance.id,
    );
    const refunded = await browserApi(page, refundPath, refundOptions);
    expect(refunded.status).toBe(200);
    const providerRefund = refunded.body.providerRefund as Record<
      string,
      unknown
    >;
    expect(String(providerRefund.id).startsWith("re_")).toBe(true);
    await expect
      .poll(
        async () => {
          const repeated = await browserApi(page, refundPath, refundOptions);
          expect(repeated.status).toBe(200);
          const provider = repeated.body.providerRefund as Record<
            string,
            unknown
          >;
          expect(provider.id).toBe(providerRefund.id);
          return provider.status;
        },
        { timeout: 60_000, intervals: [1000, 3000, 5000] },
      )
      .toBe("succeeded");
    await logout(page);
  });
});
