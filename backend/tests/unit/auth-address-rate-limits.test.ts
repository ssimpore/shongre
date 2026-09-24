import { describe, expect, it, vi } from "vitest";
import { DemoAuthRepository } from "../../src/infrastructure/database/repositories/auth.repository.js";
import { DemoUserRepository } from "../../src/infrastructure/database/repositories/user.repository.js";
import { DemoKYCProvider } from "../../src/integrations/providers/kyc.provider.js";
import { AuthEmailSender } from "../../src/modules/auth/auth-email.sender.js";
import { AuthService } from "../../src/modules/auth/auth.service.js";
import type { PasswordIdentityProvider } from "../../src/modules/auth/password-identity.provider.js";
import { SessionService } from "../../src/modules/auth/session.service.js";
import { config } from "../../src/app/config/index.js";

const CORRECT_PASSWORD = "CorrectHorse2026!";

function harness() {
  const users = new DemoUserRepository();
  const authRepository = new DemoAuthRepository();
  const passwordIdentity: PasswordIdentityProvider = {
    authenticate: async (user, _email, password) =>
      Boolean(user) && password === CORRECT_PASSWORD,
    provision: async (user) => user.id,
    hasPassword: async () => true,
    setPassword: async () => undefined,
    confirmEmail: async () => undefined,
    deleteAuthUser: async () => undefined,
  };
  const emailSender = new AuthEmailSender();
  const sent = vi.spyOn(emailSender, "send").mockResolvedValue();
  const service = new AuthService(
    users,
    new DemoKYCProvider(),
    new SessionService(authRepository),
    authRepository,
    emailSender,
    undefined,
    passwordIdentity,
  );
  return { users, authRepository, service, sent };
}

describe("per-address credential budgets", () => {
  it("locks an address that sprays failed passwords across many accounts", async () => {
    const { service } = harness();
    const attacker = { ipPrefix: "203.0.113" };
    // Each account sees one failure, far below its own ten-attempt limit;
    // only the address budget can notice the pattern.
    for (let index = 0; index <= config.loginAddressFailureLimit; index += 1) {
      await expect(
        service.login(
          { email: `target-${index}@example.test`, password: "Summer2026!" },
          attacker,
        ),
      ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    }
    await expect(
      service.login(
        { email: "one-more@example.test", password: "Summer2026!" },
        attacker,
      ),
    ).rejects.toMatchObject({
      code: "RATE_LIMITED",
      details: { retryAfterSeconds: expect.any(Number) },
    });
    // Another network is unaffected.
    await expect(
      service.login(
        { email: "target-0@example.test", password: "Summer2026!" },
        { ipPrefix: "198.51.100" },
      ),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });

  it("never spends the address budget on successful sign-ins", async () => {
    const { service, users } = harness();
    const member = (await users.getAll()).find(
      (user) =>
        user.status === "active" && (user.staffStatus ?? "none") === "none",
    );
    expect(member).toBeDefined();
    const sharedNetwork = { ipPrefix: "192.0.2" };
    for (
      let index = 0;
      index <= config.loginAddressFailureLimit + 1;
      index += 1
    ) {
      await expect(
        service.login(
          { email: member!.email, password: CORRECT_PASSWORD },
          sharedNetwork,
        ),
      ).resolves.toBeDefined();
    }
  });

  it("bounds registrations from one address even when every email differs", async () => {
    const { service } = harness();
    const network = { ipPrefix: "203.0.113" };
    const attempt = (index: number) =>
      service.register(
        {
          email: `new-member-${index}@example.test`,
          name: `Membre ${index}`,
          password: CORRECT_PASSWORD,
          country: "FR",
        } as Parameters<AuthService["register"]>[0],
        network,
      );
    const outcomes: string[] = [];
    for (let index = 0; index <= config.registrationAddressLimit; index += 1) {
      outcomes.push(
        await attempt(index).then(
          () => "ok",
          (error: { code?: string }) => error.code || "error",
        ),
      );
    }
    expect(outcomes.slice(0, -1)).toEqual(
      Array(config.registrationAddressLimit).fill("ok"),
    );
    expect(outcomes.at(-1)).toBe("RATE_LIMITED");
  });

  it("caps reset emails to one member across addresses, without saying so", async () => {
    const { service, users, sent } = harness();
    const member = (await users.getAll()).find(
      (user) =>
        user.status === "active" && (user.staffStatus ?? "none") === "none",
    )!;
    const outcomes = [];
    for (let index = 0; index <= config.authEmailRecipientLimit + 1; index += 1)
      outcomes.push(
        await service.requestPasswordReset(member.email, {
          ipPrefix: `198.51.${index}`,
        }),
      );
    // Every caller gets the same generic answer; only the budget's worth of
    // emails actually leaves.
    expect(outcomes.every((outcome) => outcome.accepted)).toBe(true);
    expect(sent).toHaveBeenCalledTimes(config.authEmailRecipientLimit);
  });

  it("throttles one address sending verification emails to many recipients", async () => {
    const { service } = harness();
    const caller = { ipPrefix: "203.0.113" };
    for (let index = 0; index < config.authEmailAddressLimit; index += 1)
      await expect(
        service.sendEmailVerification(`someone-${index}@example.test`, caller),
      ).resolves.toMatchObject({ accepted: true });
    await expect(
      service.sendEmailVerification("one-more@example.test", caller),
    ).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });
});
