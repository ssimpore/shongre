import { describe, expect, it, vi } from "vitest";
import { DemoAuthRepository } from "../../src/infrastructure/database/repositories/auth.repository.js";
import { SessionService } from "../../src/modules/auth/session.service.js";
import type { UserProfile } from "../../src/shared/types/index.js";

const user: UserProfile = {
  id: "0d147b8a-f24b-49ad-a665-da692142fc56",
  slug: "session-test",
  email: "session@example.fr",
  name: "Session Test",
  accountType: "individual",
  primaryRole: "individual_buyer",
  role: "individual_buyer",
  status: "active",
  country: "FR",
  isVerified: false,
  isIdentityVerified: false,
  isPhoneVerified: false,
  isEmailVerified: true,
  isBusinessVerified: false,
  rating: 5,
  reviewCount: 0,
  responseRatePercent: 100,
};

describe("server-side session lifecycle", () => {
  it("stores only a refresh digest, rotates once, and revokes a replayed family", async () => {
    const repository = new DemoAuthRepository();
    const sessions = new SessionService(repository);
    const first = await sessions.create(user, "google", {
      deviceLabel: "Safari sur iOS",
      ipPrefix: "192.0.2",
    });
    const stored = await repository.findSessionById(first.sessionId);

    expect(stored?.refreshTokenHash).not.toBe(first.refreshToken);
    expect(stored?.provider).toBe("google");
    expect(await sessions.isActive(first.sessionId, user.id)).toBe(true);

    const rotated = await sessions.rotate(first.refreshToken);
    expect(rotated.tokens.refreshToken).not.toBe(first.refreshToken);
    expect(await sessions.isActive(first.sessionId, user.id)).toBe(false);
    expect(await sessions.isActive(rotated.tokens.sessionId, user.id)).toBe(
      true,
    );

    await expect(sessions.rotate(first.refreshToken)).rejects.toThrow(
      "Session invalide",
    );
    expect(await sessions.isActive(rotated.tokens.sessionId, user.id)).toBe(
      false,
    );
  });

  it("tracks recent authentication and lists only active sessions", async () => {
    const repository = new DemoAuthRepository();
    const sessions = new SessionService(repository);
    const current = await sessions.create(user, "password", {}, false);
    const other = await sessions.create(user, "apple");

    expect(await sessions.hasRecentAuthentication(current.sessionId)).toBe(
      false,
    );
    await sessions.markReauthenticated(current.sessionId);
    expect(await sessions.hasRecentAuthentication(current.sessionId)).toBe(
      true,
    );

    await sessions.revoke(other.sessionId, user.id);
    const visible = await sessions.list(user.id, current.sessionId);
    expect(visible).toHaveLength(1);
    expect(visible[0]).toMatchObject({
      id: current.sessionId,
      isCurrent: true,
      provider: "password",
    });
  });

  it.each(["suspended", "revoked"] as const)(
    "refuses to establish a session for %s Staff",
    async (staffStatus) => {
      const sessions = new SessionService(new DemoAuthRepository());
      await expect(
        sessions.create(
          {
            ...user,
            staffStatus,
            staffRole: "support_agent",
          },
          "password",
        ),
      ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    },
  );

  it("resolves a request's session facts from one read and records activity at most once per interval", async () => {
    const repository = new DemoAuthRepository();
    const sessions = new SessionService(repository);
    const created = await sessions.create(user, "password", {});
    const reads = vi.spyOn(repository, "findSessionById");
    const writes = vi.spyOn(repository, "touchSession");

    const state = await sessions.resolveActiveSession(
      created.sessionId,
      user.id,
    );
    expect(state).toMatchObject({ mfaVerified: false });
    expect(reads).toHaveBeenCalledTimes(1);

    await state!.touch();
    expect(writes).toHaveBeenCalledTimes(1);
    // The next request inside the interval reads the fresh `last_used_at`
    // and does not write again.
    await (await sessions.resolveActiveSession(
      created.sessionId,
      user.id,
    ))!.touch();
    expect(writes).toHaveBeenCalledTimes(1);

    // Someone else's session, or a revoked one, resolves to nothing.
    await expect(
      sessions.resolveActiveSession(created.sessionId, "another-user"),
    ).resolves.toBeNull();
    await repository.revokeSession(created.sessionId, "logout");
    await expect(
      sessions.resolveActiveSession(created.sessionId, user.id),
    ).resolves.toBeNull();
  });
});
