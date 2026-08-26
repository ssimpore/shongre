import { describe, expect, it } from "vitest";
import { DemoAuthRepository } from "../../src/infrastructure/database/repositories/auth.repository.js";
import { DemoUserRepository } from "../../src/infrastructure/database/repositories/user.repository.js";
import { DemoKYCProvider } from "../../src/integrations/providers/kyc.provider.js";
import { AuthService } from "../../src/modules/auth/auth.service.js";
import { SessionService } from "../../src/modules/auth/session.service.js";
import type { Principal } from "../../src/shared/auth/principal.js";
import { config } from "../../src/app/config/index.js";

describe("cross-domain Shongre identity handoff", () => {
  it("issues a short-lived one-use code and creates a distinct destination session", async () => {
    const authRepository = new DemoAuthRepository();
    const users = new DemoUserRepository();
    const sessions = new SessionService(authRepository);
    const service = new AuthService(
      users,
      new DemoKYCProvider(),
      sessions,
      authRepository,
    );
    const user = (await users.getAll())[0];
    const source = await sessions.create(user, "password", {
      deviceLabel: "Safari sur macOS",
    });
    const principal: Principal = {
      userId: user.id,
      email: user.email,
      role: user.primaryRole as Principal["role"],
      accountType: user.accountType,
      status: user.status,
      sessionId: source.sessionId,
      mfaVerified: false,
    };

    const started = await service.beginDomainHandoff(principal, {
      sourceCountry: "FR",
      targetCountry: "BE",
      returnTo: "/recherche?query=velo",
    });
    const authorizationUrl = new URL(started.authorizationUrl);
    expect(authorizationUrl.origin).toBe(
      config.environment.urls.internationalApp.origin,
    );
    expect(authorizationUrl.pathname).toBe("/be/auth/domain-handoff");
    expect(Date.parse(started.expiresAt) - Date.now()).toBeLessThanOrEqual(
      120_000,
    );

    const code = authorizationUrl.searchParams.get("code") || "";
    const exchanged = await service.exchangeDomainHandoff(
      { code, targetCountry: "BE" },
      { deviceLabel: "Safari sur macOS" },
    );
    expect(exchanged.user.id).toBe(user.id);
    expect(exchanged.returnTo).toBe("/recherche?query=velo");
    expect(exchanged.tokens.sessionId).not.toBe(source.sessionId);
    expect(await sessions.isActive(source.sessionId, user.id)).toBe(true);
    expect(await sessions.isActive(exchanged.tokens.sessionId, user.id)).toBe(
      true,
    );

    await expect(
      service.exchangeDomainHandoff({ code, targetCountry: "BE" }),
    ).rejects.toThrow("Identifiants invalides");
  });

  it("will not hand a session into a coming-soon market", async () => {
    const authRepository = new DemoAuthRepository();
    const users = new DemoUserRepository();
    const sessions = new SessionService(authRepository);
    const service = new AuthService(
      users,
      new DemoKYCProvider(),
      sessions,
      authRepository,
    );
    const user = (await users.getAll())[0];
    const source = await sessions.create(user, "password");
    await expect(
      service.beginDomainHandoff(
        {
          userId: user.id,
          email: user.email,
          role: user.primaryRole as Principal["role"],
          accountType: user.accountType,
          sessionId: source.sessionId,
        },
        { sourceCountry: "FR", targetCountry: "SN" },
      ),
    ).rejects.toThrow("pas disponible");
  });
});
