import { describe, expect, it, vi } from "vitest";
import { DemoAuthRepository } from "../../src/infrastructure/database/repositories/auth.repository.js";
import { DemoUserRepository } from "../../src/infrastructure/database/repositories/user.repository.js";
import type { OrganizationProvisioningRepository } from "../../src/infrastructure/database/repositories/organization-provisioning.repository.js";
import { DemoKYCProvider } from "../../src/integrations/providers/kyc.provider.js";
import { AuthEmailSender } from "../../src/modules/auth/auth-email.sender.js";
import { AuthService } from "../../src/modules/auth/auth.service.js";
import { SessionService } from "../../src/modules/auth/session.service.js";

describe("Facturation direct registration", () => {
  it("provisions the shared organization but does not grant product access", async () => {
    const users = new DemoUserRepository({});
    const authRepository = new DemoAuthRepository();
    const provisioner: OrganizationProvisioningRepository = {
      ensureOwnedOrganization: vi.fn(async (input) => ({
        id: "organization-1",
        ownerId: input.ownerId,
        legalName: input.legalName,
        countryCode: input.countryCode,
      })),
    };
    const emailSender = new AuthEmailSender();
    vi.spyOn(emailSender, "send").mockResolvedValue();
    const service = new AuthService(
      users,
      new DemoKYCProvider(),
      new SessionService(authRepository),
      authRepository,
      emailSender,
      provisioner,
    );

    const result = await service.register({
      email: "owner@facturation-only.example",
      name: "Mariam Diallo",
      password: "StrongPassword2026!",
      role: "pro_seller",
      companyName: "Studio Littoral",
      professionalVertical: "generic",
      siret: "81234567800012",
      legalForm: "SARL",
      vatNumber: "FR12812345678",
      businessAddress: "18 rue du Littoral",
      city: "Lyon",
      postalCode: "69003",
      country: "FR",
      productIntent: "facturation",
    });

    expect(result.user.accountType).toBe("professional");
    expect(result.user.enabledProducts).toBeUndefined();
    expect(provisioner.ensureOwnedOrganization).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: result.user.id,
        legalName: "Studio Littoral",
        businessIdentifier: "81234567800012",
        countryCode: "FR",
      }),
    );
  });

  it("rejects an incomplete Facturation organization before persisting the account", async () => {
    const users = new DemoUserRepository({});
    const authRepository = new DemoAuthRepository();
    const provisioner: OrganizationProvisioningRepository = {
      ensureOwnedOrganization: vi.fn(),
    };
    const service = new AuthService(
      users,
      new DemoKYCProvider(),
      new SessionService(authRepository),
      authRepository,
      new AuthEmailSender(),
      provisioner,
    );

    await expect(
      service.register({
        email: "incomplete@facturation-only.example",
        name: "Incomplete Owner",
        password: "StrongPassword2026!",
        role: "pro_seller",
        companyName: "Incomplete SARL",
        siret: "81234567800012",
        productIntent: "facturation",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(
      await users.findByEmail("incomplete@facturation-only.example"),
    ).toBeNull();
    expect(provisioner.ensureOwnedOrganization).not.toHaveBeenCalled();
  });
});
