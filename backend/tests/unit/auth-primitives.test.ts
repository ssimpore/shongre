import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  assertPasswordAcceptable,
  WeakPasswordError,
  MIN_PASSWORD_LENGTH,
} from "../../src/shared/auth/password.js";
import {
  issueToken,
  verifyToken,
  TokenError,
  extractBearerToken,
} from "../../src/shared/auth/tokens.js";
import {
  GUEST_PRINCIPAL,
  Principal,
  requireAuthenticated,
  requirePermission,
  requireOwnership,
  resolveOwnerId,
} from "../../src/shared/auth/principal.js";
import {
  verifyStripeSignature,
  buildStripeSignatureHeader,
} from "../../src/integrations/stripe/webhook-signature.js";

const SECRET = "test-signing-secret-that-is-long-enough";

const buyer: Principal = {
  userId: "user_thomas",
  email: "thomas@example.fr",
  role: "individual_buyer",
};
const admin: Principal = {
  userId: "user_admin",
  email: "admin@shongre.com",
  role: "admin",
};

describe("Password hashing", () => {
  it("produces a verifiable hash", async () => {
    const hash = await hashPassword("a-perfectly-good-password");
    expect(await verifyPassword("a-perfectly-good-password", hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("a-perfectly-good-password");
    expect(await verifyPassword("a-perfectly-bad-password", hash)).toBe(false);
  });

  it("salts each hash, so identical passwords do not collide", async () => {
    const [a, b] = await Promise.all([
      hashPassword("same-password-here"),
      hashPassword("same-password-here"),
    ]);
    expect(a).not.toEqual(b);
    expect(await verifyPassword("same-password-here", a)).toBe(true);
    expect(await verifyPassword("same-password-here", b)).toBe(true);
  });

  it("never stores the password in the hash", async () => {
    const hash = await hashPassword("recognisable-secret-value");
    expect(hash).not.toContain("recognisable-secret-value");
  });

  it("returns false rather than throwing for absent or malformed hashes", async () => {
    expect(await verifyPassword("anything-at-all", null)).toBe(false);
    expect(await verifyPassword("anything-at-all", undefined)).toBe(false);
    expect(await verifyPassword("anything-at-all", "")).toBe(false);
    expect(await verifyPassword("anything-at-all", "not-a-real-hash")).toBe(
      false,
    );
    expect(await verifyPassword("anything-at-all", "scrypt$64$zz$zz")).toBe(
      false,
    );
    expect(await verifyPassword("anything-at-all", "bcrypt$64$aa$bb")).toBe(
      false,
    );
  });

  it("rejects an empty password against a real hash", async () => {
    const hash = await hashPassword("a-perfectly-good-password");
    expect(await verifyPassword("", hash)).toBe(false);
  });

  it("enforces a minimum length and rejects all-numeric passwords", () => {
    expect(() => assertPasswordAcceptable("short")).toThrow(WeakPasswordError);
    expect(() =>
      assertPasswordAcceptable("1".repeat(MIN_PASSWORD_LENGTH)),
    ).toThrow(WeakPasswordError);
    expect(() =>
      assertPasswordAcceptable("long-enough-and-mixed"),
    ).not.toThrow();
  });
});

describe("Session tokens", () => {
  const claims = {
    sub: "user_thomas",
    email: "thomas@example.fr",
    role: "individual_buyer" as const,
  };

  it("round-trips claims through sign and verify", () => {
    const token = issueToken(claims, SECRET);
    const decoded = verifyToken(token, SECRET);
    expect(decoded.sub).toBe("user_thomas");
    expect(decoded.role).toBe("individual_buyer");
    expect(decoded.exp).toBeGreaterThan(decoded.iat);
  });

  it("rejects a token signed with a different secret", () => {
    const token = issueToken(claims, SECRET);
    expect(() => verifyToken(token, "a-different-secret-entirely")).toThrow(
      TokenError,
    );
  });

  it("rejects a token whose payload was swapped for a privileged one", () => {
    const token = issueToken(claims, SECRET);
    const [header, , signature] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ ...claims, role: "super_admin", exp: 9999999999 }),
    ).toString("base64url");
    expect(() =>
      verifyToken(`${header}.${forged}.${signature}`, SECRET),
    ).toThrow(TokenError);
  });

  it("rejects the alg:none downgrade", () => {
    const header = Buffer.from(
      JSON.stringify({ alg: "none", typ: "JWT" }),
    ).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({ ...claims, exp: 9999999999 }),
    ).toString("base64url");
    expect(() => verifyToken(`${header}.${payload}.`, SECRET)).toThrow(
      TokenError,
    );
  });

  it("rejects an expired token", () => {
    const token = issueToken(claims, SECRET, -1);
    expect(() => verifyToken(token, SECRET)).toThrow(/expired/i);
  });

  it("rejects malformed input", () => {
    for (const bad of ["", "not-a-token", "a.b", "a.b.c.d"]) {
      expect(() => verifyToken(bad, SECRET)).toThrow(TokenError);
    }
  });

  it("refuses to issue or verify without a secret", () => {
    expect(() => issueToken(claims, "")).toThrow(TokenError);
    expect(() => verifyToken(issueToken(claims, SECRET), "")).toThrow(
      TokenError,
    );
  });

  it("extracts bearer tokens and ignores other schemes", () => {
    expect(extractBearerToken("Bearer abc.def.ghi")).toBe("abc.def.ghi");
    expect(extractBearerToken("bearer abc.def.ghi")).toBe("abc.def.ghi");
    expect(extractBearerToken("Basic dXNlcjpwYXNz")).toBeNull();
    expect(extractBearerToken(undefined)).toBeNull();
    expect(extractBearerToken("")).toBeNull();
  });
});

describe("Principal guards", () => {
  it("treats the guest principal as unauthenticated", () => {
    expect(() => requireAuthenticated(GUEST_PRINCIPAL)).toThrow(/connecté/i);
    expect(() => requireAuthenticated(buyer)).not.toThrow();
  });

  it("enforces permissions from the role matrix", () => {
    expect(() => requirePermission(buyer, "listing.read")).not.toThrow();
    expect(() => requirePermission(buyer, "admin.access")).toThrow(/droits/i);
    expect(() => requirePermission(admin, "admin.access")).not.toThrow();
  });

  it("rejects a guest before checking permissions", () => {
    // A guest holds 'listing.read' in the matrix, but an unauthenticated caller
    // must still fail the authentication check first.
    expect(() => requirePermission(GUEST_PRINCIPAL, "listing.read")).toThrow(
      /connecté/i,
    );
  });

  it("allows owners and refuses everyone else", () => {
    expect(() => requireOwnership(buyer, "user_thomas")).not.toThrow();
    expect(() => requireOwnership(buyer, "user_camille")).toThrow(
      /introuvable/i,
    );
  });

  it("honours an explicit staff override", () => {
    expect(() =>
      requireOwnership(admin, "user_camille", "user.manage"),
    ).not.toThrow();
    // Without naming an override, even an admin is not an owner.
    expect(() => requireOwnership(admin, "user_camille")).toThrow(
      /introuvable/i,
    );
  });

  it('resolves owner ids to the caller, accepting the "me" alias', () => {
    expect(resolveOwnerId(buyer, undefined)).toBe("user_thomas");
    expect(resolveOwnerId(buyer, "me")).toBe("user_thomas");
    expect(resolveOwnerId(buyer, "user_thomas")).toBe("user_thomas");
    expect(() => resolveOwnerId(buyer, "user_camille")).toThrow(/introuvable/i);
  });
});

describe("Stripe webhook signatures", () => {
  const secret = "whsec_test_secret";
  const payload = JSON.stringify({
    id: "evt_1",
    type: "payment_intent.succeeded",
  });
  const now = 1_700_000_000;

  it("accepts a correctly signed payload", () => {
    const header = buildStripeSignatureHeader(payload, secret, now);
    expect(
      verifyStripeSignature({
        payload,
        signatureHeader: header,
        secret,
        nowSeconds: now,
      }),
    ).toEqual({ ok: true });
  });

  it("rejects a payload modified after signing", () => {
    const header = buildStripeSignatureHeader(payload, secret, now);
    const tampered = JSON.stringify({
      id: "evt_1",
      type: "payment_intent.succeeded",
      amount: 999999,
    });
    const result = verifyStripeSignature({
      payload: tampered,
      signatureHeader: header,
      secret,
      nowSeconds: now,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a signature made with a different secret", () => {
    const header = buildStripeSignatureHeader(
      payload,
      "whsec_attacker_secret",
      now,
    );
    expect(
      verifyStripeSignature({
        payload,
        signatureHeader: header,
        secret,
        nowSeconds: now,
      }).ok,
    ).toBe(false);
  });

  it("rejects a replayed event outside the tolerance window", () => {
    const header = buildStripeSignatureHeader(payload, secret, now);
    const result = verifyStripeSignature({
      payload,
      signatureHeader: header,
      secret,
      nowSeconds: now + 3600,
    });
    expect(result).toEqual({
      ok: false,
      reason: "signature timestamp outside tolerance window",
    });
  });

  it("rejects missing, empty and malformed headers", () => {
    expect(
      verifyStripeSignature({
        payload,
        signatureHeader: undefined,
        secret,
        nowSeconds: now,
      }).ok,
    ).toBe(false);
    expect(
      verifyStripeSignature({
        payload,
        signatureHeader: "",
        secret,
        nowSeconds: now,
      }).ok,
    ).toBe(false);
    expect(
      verifyStripeSignature({
        payload,
        signatureHeader: "garbage",
        secret,
        nowSeconds: now,
      }).ok,
    ).toBe(false);
    expect(
      verifyStripeSignature({
        payload,
        signatureHeader: `t=${now}`,
        secret,
        nowSeconds: now,
      }).ok,
    ).toBe(false);
  });

  it("refuses to verify when no endpoint secret is configured", () => {
    const header = buildStripeSignatureHeader(payload, secret, now);
    expect(
      verifyStripeSignature({
        payload,
        signatureHeader: header,
        secret: "",
        nowSeconds: now,
      }).ok,
    ).toBe(false);
  });

  it("accepts one valid signature among several during secret rotation", () => {
    const valid = buildStripeSignatureHeader(payload, secret, now).split(
      "v1=",
    )[1];
    const header = `t=${now},v1=${"0".repeat(valid.length)},v1=${valid}`;
    expect(
      verifyStripeSignature({
        payload,
        signatureHeader: header,
        secret,
        nowSeconds: now,
      }).ok,
    ).toBe(true);
  });
});
