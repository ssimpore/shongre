import { describe, it, expect } from "vitest";
import {
  resolveIdentity,
  evaluateLinkRequest,
  evaluateUnlinkRequest,
  reconcileProfileFields,
  normalizeEmail,
  isApplePrivateRelay,
  maskEmail,
  type ProviderProfile,
  type AccountSnapshot,
  type LinkedIdentity,
} from "../../src/shared/auth/identity.js";
import {
  resolveSafeRedirect,
  isAllowedCallbackOrigin,
  buildStatePayload,
  DEFAULT_RETURN_PATH,
} from "../../src/shared/auth/safe-redirect.js";
import { AppError } from "../../src/shared/errors/app-error.js";

const googleProfile: ProviderProfile = {
  provider: "google",
  subject: "google-sub-12345",
  email: "Chloe.Martin@Example.FR",
  emailVerified: true,
  displayName: "Chloé Martin",
  avatarUrl: "https://lh3.googleusercontent.com/a/abc",
};

function account(overrides: Partial<AccountSnapshot> = {}): AccountSnapshot {
  return {
    userId: "user_chloe",
    email: "chloe.martin@example.fr",
    status: "active",
    isEmailVerified: true,
    hasPassword: true,
    linkedProviders: ["password"],
    ...overrides,
  };
}

describe("Email normalization", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  Chloe.Martin@Example.FR ")).toBe(
      "chloe.martin@example.fr",
    );
  });

  it("rejects values that are not addresses", () => {
    for (const bad of [
      "",
      "   ",
      "not-an-email",
      "@example.fr",
      "user@",
      null,
      undefined,
      42 as never,
    ]) {
      expect(normalizeEmail(bad as string)).toBeNull();
    }
  });

  it("detects Apple private relay addresses", () => {
    expect(isApplePrivateRelay("abc123@privaterelay.appleid.com")).toBe(true);
    expect(isApplePrivateRelay("chloe@example.fr")).toBe(false);
    expect(isApplePrivateRelay(null)).toBe(false);
  });

  it("masks an address without revealing it", () => {
    const masked = maskEmail("chloe.martin@example.fr");
    expect(masked).toContain("@example.fr");
    expect(masked).not.toContain("chloe.martin");
    expect(masked.startsWith("c")).toBe(true);
  });
});

describe("resolveIdentity — rule 1: exact identity match", () => {
  it("signs in the linked account", () => {
    const linked: LinkedIdentity = {
      userId: "user_chloe",
      provider: "google",
      subject: "google-sub-12345",
    };
    const result = resolveIdentity(googleProfile, linked, null);
    expect(result).toEqual({
      outcome: "authenticate",
      userId: "user_chloe",
      identityMatched: true,
    });
  });

  it("wins even when the provider email now belongs to a different account", () => {
    // The user changed their Google address to one somebody else registered
    // with. The subject is what identifies them, so they must land on their own
    // account and must not be offered the other one.
    const linked: LinkedIdentity = {
      userId: "user_chloe",
      provider: "google",
      subject: "google-sub-12345",
    };
    const someoneElse = account({
      userId: "user_intruder",
      email: "chloe.martin@example.fr",
    });
    const result = resolveIdentity(googleProfile, linked, someoneElse);
    expect(result).toEqual({
      outcome: "authenticate",
      userId: "user_chloe",
      identityMatched: true,
    });
  });

  it("rejects a mismatched identity row rather than trusting it", () => {
    const wrong: LinkedIdentity = {
      userId: "user_chloe",
      provider: "facebook",
      subject: "other",
    };
    expect(() => resolveIdentity(googleProfile, wrong, null)).toThrow(AppError);
  });
});

describe("resolveIdentity — new accounts", () => {
  it("creates an account when nothing matches", () => {
    const result = resolveIdentity(googleProfile, null, null);
    expect(result).toEqual({
      outcome: "create_account",
      email: "chloe.martin@example.fr",
      emailVerified: true,
    });
  });

  it("creates an account with no email when Facebook withholds one", () => {
    const facebook: ProviderProfile = {
      provider: "facebook",
      subject: "fb-app-scoped-9",
      email: null,
    };
    const result = resolveIdentity(facebook, null, null);
    expect(result).toEqual({
      outcome: "create_account",
      email: null,
      emailVerified: false,
    });
  });

  it("creates an account for an Apple private-relay address", () => {
    const apple: ProviderProfile = {
      provider: "apple",
      subject: "apple-sub-77",
      email: "xyz@privaterelay.appleid.com",
      emailVerified: true,
    };
    const result = resolveIdentity(apple, null, null);
    expect(result).toEqual({
      outcome: "create_account",
      email: "xyz@privaterelay.appleid.com",
      emailVerified: true,
    });
  });
});

describe("resolveIdentity — rules 2-4: never merge on email alone", () => {
  it("requires linking when a verified email matches an existing account", () => {
    const result = resolveIdentity(googleProfile, null, account());
    expect(result.outcome).toBe("require_account_linking");
    if (result.outcome !== "require_account_linking")
      throw new Error("unreachable");
    expect(result.userId).toBe("user_chloe");
    expect(result.reason).toBe("account_has_password_login");
    // The challenge must not echo the full address back to the caller.
    expect(result.maskedEmail).not.toContain("chloe.martin");
  });

  it("does NOT merge when the provider did not verify the email", () => {
    // This is the account-takeover case: anyone can create a provider account
    // claiming an address. Without a verification claim it proves nothing, so
    // a separate account is created instead of touching the existing one.
    const unverified: ProviderProfile = {
      ...googleProfile,
      emailVerified: false,
    };
    const result = resolveIdentity(unverified, null, account());
    expect(result).toEqual({
      outcome: "create_account",
      email: null,
      emailVerified: false,
    });
  });

  it("treats a missing emailVerified claim as unverified", () => {
    const noClaim: ProviderProfile = {
      ...googleProfile,
      emailVerified: undefined,
    };
    const result = resolveIdentity(noClaim, null, account());
    expect(result.outcome).toBe("create_account");
  });

  it("never matches on name, avatar or phone", () => {
    // Same display name and avatar, different subject, no usable email.
    const impostor: ProviderProfile = {
      provider: "google",
      subject: "google-sub-different",
      email: null,
      displayName: "Chloé Martin",
      avatarUrl: "https://lh3.googleusercontent.com/a/abc",
    };
    const result = resolveIdentity(impostor, null, account());
    expect(result.outcome).toBe("create_account");
  });
});

describe("resolveIdentity — blocked accounts cannot be reached via social login", () => {
  for (const status of [
    "suspended",
    "banned",
    "deleted",
    "archived",
  ] as const) {
    it(`blocks a ${status} account`, () => {
      const result = resolveIdentity(googleProfile, null, account({ status }));
      expect(result).toEqual({
        outcome: "blocked",
        userId: "user_chloe",
        status,
      });
    });
  }
});

describe("resolveIdentity — malformed provider responses", () => {
  it("rejects a missing subject", () => {
    expect(() =>
      resolveIdentity({ ...googleProfile, subject: "" }, null, null),
    ).toThrow(AppError);
    expect(() =>
      resolveIdentity({ ...googleProfile, subject: "   " }, null, null),
    ).toThrow(AppError);
  });

  it("rejects an unsupported provider", () => {
    const bogus = {
      ...googleProfile,
      provider: "twitter",
    } as unknown as ProviderProfile;
    expect(() => resolveIdentity(bogus, null, null)).toThrow(AppError);
  });
});

describe("evaluateLinkRequest", () => {
  const base = {
    actingUserId: "user_chloe",
    profile: googleProfile,
    existingIdentity: null,
    actingAccountProviders: ["password"] as const,
    hasRecentAuthentication: true,
  };

  it("links a fresh provider to the acting account", () => {
    expect(evaluateLinkRequest({ ...base })).toEqual({ decision: "link" });
  });

  it("requires recent authentication", () => {
    expect(
      evaluateLinkRequest({ ...base, hasRecentAuthentication: false }),
    ).toEqual({
      decision: "rejected",
      reason: "recent_authentication_required",
    });
  });

  it("rule 6: refuses to move an identity between accounts", () => {
    const owned: LinkedIdentity = {
      userId: "user_someone_else",
      provider: "google",
      subject: "google-sub-12345",
    };
    expect(evaluateLinkRequest({ ...base, existingIdentity: owned })).toEqual({
      decision: "rejected",
      reason: "identity_belongs_to_another_account",
    });
  });

  it("is idempotent when already linked to the caller", () => {
    const mine: LinkedIdentity = {
      userId: "user_chloe",
      provider: "google",
      subject: "google-sub-12345",
    };
    expect(evaluateLinkRequest({ ...base, existingIdentity: mine })).toEqual({
      decision: "already_linked_to_caller",
    });
  });

  it("refuses a second identity for a provider already linked", () => {
    expect(
      evaluateLinkRequest({
        ...base,
        actingAccountProviders: ["password", "google"],
      }),
    ).toEqual({ decision: "rejected", reason: "provider_already_linked" });
  });
});

describe("evaluateUnlinkRequest — nobody may lock themselves out", () => {
  it("unlinks when a password remains", () => {
    expect(
      evaluateUnlinkRequest({
        provider: "google",
        linkedProviders: ["password", "google"],
        hasPassword: true,
        hasRecentAuthentication: true,
      }),
    ).toEqual({ decision: "unlink" });
  });

  it("unlinks when another provider remains", () => {
    expect(
      evaluateUnlinkRequest({
        provider: "google",
        linkedProviders: ["google", "apple"],
        hasPassword: false,
        hasRecentAuthentication: true,
      }),
    ).toEqual({ decision: "unlink" });
  });

  it("refuses to remove the only sign-in method", () => {
    expect(
      evaluateUnlinkRequest({
        provider: "google",
        linkedProviders: ["google"],
        hasPassword: false,
        hasRecentAuthentication: true,
      }),
    ).toEqual({
      decision: "rejected",
      reason: "would_remove_last_login_method",
    });
  });

  it("requires recent authentication", () => {
    expect(
      evaluateUnlinkRequest({
        provider: "google",
        linkedProviders: ["password", "google"],
        hasPassword: true,
        hasRecentAuthentication: false,
      }),
    ).toEqual({
      decision: "rejected",
      reason: "recent_authentication_required",
    });
  });

  it("rejects unlinking a provider that is not linked", () => {
    expect(
      evaluateUnlinkRequest({
        provider: "facebook",
        linkedProviders: ["password", "google"],
        hasPassword: true,
        hasRecentAuthentication: true,
      }),
    ).toEqual({ decision: "rejected", reason: "not_linked" });
  });
});

describe("reconcileProfileFields — the provider never overwrites user choices", () => {
  const current = {
    name: "Chloé M.",
    avatarUrl: "https://cdn.shongre.fr/avatars/chloe.jpg",
    isEmailVerified: true,
    hasUserEditedProfile: true,
  };

  it("leaves an existing name and avatar alone", () => {
    expect(reconcileProfileFields(current, googleProfile)).toEqual({});
  });

  it("fills a missing name", () => {
    const update = reconcileProfileFields(
      { ...current, name: null },
      googleProfile,
    );
    expect(update.name).toBe("Chloé Martin");
  });

  it("does not clear a name when Apple omits it on a return visit", () => {
    // Apple sends the name only on first authorization. The second sign-in must
    // not be read as "the user no longer has a name".
    const appleReturning: ProviderProfile = {
      provider: "apple",
      subject: "apple-sub-77",
      displayName: null,
    };
    const update = reconcileProfileFields(current, appleReturning);
    expect(update).not.toHaveProperty("name");
  });

  it("promotes unverified email to verified, but never the reverse", () => {
    expect(
      reconcileProfileFields(
        { ...current, isEmailVerified: false },
        googleProfile,
      ).isEmailVerified,
    ).toBe(true);
    const unverified: ProviderProfile = {
      ...googleProfile,
      emailVerified: false,
    };
    expect(reconcileProfileFields(current, unverified)).not.toHaveProperty(
      "isEmailVerified",
    );
  });

  it("does not adopt a provider avatar once the user has edited their profile", () => {
    const update = reconcileProfileFields(
      {
        name: "Chloé M.",
        avatarUrl: null,
        isEmailVerified: true,
        hasUserEditedProfile: true,
      },
      googleProfile,
    );
    expect(update).not.toHaveProperty("avatarUrl");
  });
});

describe("resolveSafeRedirect — open redirect protection", () => {
  it("accepts ordinary internal paths", () => {
    expect(resolveSafeRedirect("/annonces/velo-de-course")).toBe(
      "/annonces/velo-de-course",
    );
    expect(resolveSafeRedirect("/recherche?q=velo&page=2")).toBe(
      "/recherche?q=velo&page=2",
    );
  });

  const hostile = [
    "https://evil.com",
    "http://evil.com/path",
    "//evil.com",
    "///evil.com",
    "\\\\evil.com",
    "/\\evil.com",
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "/../../etc/passwd",
    "%2F%2Fevil.com",
    "%5C%5Cevil.com",
    "https:/evil.com",
    " //evil.com",
    "mailto:someone@example.com",
  ];

  for (const value of hostile) {
    it(`rejects ${JSON.stringify(value)}`, () => {
      expect(resolveSafeRedirect(value)).toBe(DEFAULT_RETURN_PATH);
    });
  }

  it("rejects a duplicated parameter rather than picking one", () => {
    expect(resolveSafeRedirect(["/safe", "https://evil.com"])).toBe(
      DEFAULT_RETURN_PATH,
    );
  });

  it("falls back for empty and non-string values", () => {
    for (const value of ["", "   ", null, undefined, 42 as never]) {
      expect(resolveSafeRedirect(value as string)).toBe(DEFAULT_RETURN_PATH);
    }
  });

  it("refuses to bounce back into the auth flow", () => {
    for (const value of [
      "/login",
      "/connexion?next=/x",
      "/auth/callback",
      "/inscription",
    ]) {
      expect(resolveSafeRedirect(value)).toBe(DEFAULT_RETURN_PATH);
    }
  });

  it("honours a custom fallback", () => {
    expect(
      resolveSafeRedirect("https://evil.com", { fallback: "/vendeur" }),
    ).toBe("/vendeur");
  });

  it("preserves the locale the user started in", () => {
    expect(resolveSafeRedirect("/annonces", { locale: "fr" })).toBe(
      "/fr/annonces",
    );
    expect(resolveSafeRedirect("/fr/annonces", { locale: "fr" })).toBe(
      "/fr/annonces",
    );
    expect(resolveSafeRedirect("/", { locale: "fr" })).toBe("/fr");
  });

  it("ignores a malformed locale rather than building a broken path", () => {
    expect(resolveSafeRedirect("/annonces", { locale: "../evil" })).toBe(
      "/annonces",
    );
  });
});

describe("isAllowedCallbackOrigin", () => {
  const allowed = [
    "https://shongre.fr",
    "https://staging.shongre.fr",
    "http://localhost:3000",
  ];

  it("accepts an exact configured origin", () => {
    expect(isAllowedCallbackOrigin("https://shongre.fr", allowed)).toBe(true);
    expect(isAllowedCallbackOrigin("http://localhost:3000", allowed)).toBe(
      true,
    );
  });

  it("rejects lookalike and suffix origins", () => {
    for (const origin of [
      "https://shongre.fr.evil.com",
      "https://evil-shongre.fr",
      "http://shongre.fr",
      "https://shongre.fr:8443",
      null,
      undefined,
      "not-a-url",
    ]) {
      expect(isAllowedCallbackOrigin(origin as string, allowed)).toBe(false);
    }
  });
});

describe("buildStatePayload", () => {
  it("sanitizes the return path before it enters signed state", () => {
    const state = buildStatePayload({
      nonce: "n1",
      returnTo: "https://evil.com",
      locale: "fr",
    });
    expect(state.returnTo).toBe("/fr");
    expect(state.intent).toBe("sign_in");
    expect(state.nonce).toBe("n1");
  });

  it("carries a link intent through", () => {
    const state = buildStatePayload({
      nonce: "n2",
      returnTo: "/compte/securite",
      intent: "link",
    });
    expect(state.intent).toBe("link");
    expect(state.returnTo).toBe("/compte/securite");
  });
});
