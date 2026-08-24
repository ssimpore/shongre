import { describe, it, expect } from "vitest";
import { verificationService } from "../../src/modules/verification/verification.service.js";
import { validateSiretLuhn } from "../../src/integrations/business-registry/siret-resolver.js";

describe("Progressive Verification & KYB/KYC", () => {
  it("validates French SIRET numbers with Luhn checksum", () => {
    // Valid SIRET (La Poste)
    expect(validateSiretLuhn("73282932000074")).toBe(true);
    // Invalid SIRET
    expect(validateSiretLuhn("12345678901234")).toBe(false);
    expect(validateSiretLuhn("abc")).toBe(false);
  });

  it("performs company lookup for valid SIRET numbers", async () => {
    const company =
      await verificationService.lookupCompanyBySiret("73282932000074");
    expect(company).not.toBeNull();
    expect(company?.name).toBe("SHONGRE TECHNOLOGIES SAS");
    expect(company?.isActive).toBe(true);
  });
});
