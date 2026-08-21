import { describe, it, expect, beforeEach } from "vitest";
import { verificationService } from "./verification.service";
import { storageService } from "../../services/storage.service";
import { UserProfile } from "../../types";

describe("VerificationService - KYC / KYB / Payout & Trust Score", () => {
  const mockUser: UserProfile = {
    id: "test-user-verification-1",
    name: "Alice Martin",
    email: "alice@example.com",
    role: "buyer",
    sellerType: "individual",
    city: "Paris",
    postalCode: "75001",
    country: "FR",
    isVerified: false,
    rating: 4.8,
    reviewCount: 15,
    responseRatePercent: 95,
    responseTimeText: "En moins d'une heure",
    isEmailVerified: true,
    isPhoneVerified: true,
    mfaEnabled: true,
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    // Reset or seed user in storage
    const users = storageService.getUsers();
    users[mockUser.id] = { ...mockUser };
    storageService.saveUsers(users);
  });

  describe("Trust Score Calculation", () => {
    it("calculates baseline score with phone, email, and 2fa", () => {
      const result = verificationService.computeTrustScore(mockUser);
      // Email (15) + Phone (20) + MFA (10) = 45
      expect(result.score).toBe(45);
      expect(result.level).toBe("bronze");
    });

    it("calculates full gold/platinum score for fully verified pro seller with KYC, KYB and bank payout", () => {
      const fullProUser: UserProfile = {
        ...mockUser,
        accountType: "professional",
        role: "pro_seller",
        sellerType: "pro",
        isVerified: true,
        isIdentityVerified: true,
        identityVerification: {
          status: "verified",
          documentType: "passport",
          submittedAt: new Date().toISOString(),
          verifiedAt: new Date().toISOString(),
        },
        professionalVerification: {
          status: "verified",
          siret: "12345678900012",
          legalForm: "SAS",
          companyName: "Boutique Pro SARL",
          submittedAt: new Date().toISOString(),
          reviewedAt: new Date().toISOString(),
        },
        bankPayoutVerification: {
          status: "verified",
          accountHolderName: "Boutique Pro SARL",
          iban: "FR7630004000011234567890143",
          bic: "BNPAFRPP",
          verifiedAt: new Date().toISOString(),
        },
      };

      const result = verificationService.computeTrustScore(fullProUser);
      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.level).toBe("platinum");
    });
  });

  describe("Identity Verification (KYC)", () => {
    it("submits identity verification document and sets status to pending", () => {
      const res = verificationService.submitIdentityVerification(mockUser.id, {
        documentType: "national_id",
        firstName: "Alice",
        lastName: "Martin",
        birthDate: "1990-05-12",
        issuingCountry: "FR",
      });

      expect(res.success).toBe(true);
      expect(res.user?.identityVerification?.status).toBe("pending");
      expect(res.user?.identityVerification?.documentType).toBe("national_id");

      // Check audit log
      const logs = verificationService.getAuditLogs(mockUser.id);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].dimension).toBe("identity");
      expect(logs[0].newState).toBe("pending");
    });

    it("approves identity verification and marks identity as verified", () => {
      verificationService.submitIdentityVerification(mockUser.id, {
        documentType: "passport",
        firstName: "Alice",
        lastName: "Martin",
        birthDate: "1990-05-12",
        issuingCountry: "FR",
      });

      const approval = verificationService.reviewIdentityVerification(
        mockUser.id,
        "approve",
        {
          reviewerName: "Agent Conformité",
          notes: "Passeport valide",
        },
      );

      expect(approval.success).toBe(true);
      expect(approval.user?.identityVerification?.status).toBe("verified");
      expect(approval.user?.isIdentityVerified).toBe(true);

      const logs = verificationService.getAuditLogs(mockUser.id);
      const approveLog = logs.find((l) => l.newState === "verified");
      expect(approveLog).toBeDefined();
      expect(approveLog?.performedBy).toBe("Agent Conformité");
    });

    it("rejects identity verification and stores rejection reason", () => {
      verificationService.submitIdentityVerification(mockUser.id, {
        documentType: "national_id",
        firstName: "Alice",
        lastName: "Martin",
        birthDate: "1990-05-12",
        issuingCountry: "FR",
      });

      const rejection = verificationService.reviewIdentityVerification(
        mockUser.id,
        "reject",
        {
          reviewerName: "Agent KYC",
          reason: "Document flou et illisible.",
        },
      );

      expect(rejection.success).toBe(true);
      expect(rejection.user?.identityVerification?.status).toBe("rejected");
      expect(rejection.user?.identityVerification?.rejectionReason).toBe(
        "Document flou et illisible.",
      );
    });
  });

  describe("Business Verification (KYB)", () => {
    it("submits business verification details and verifies SIRET format", () => {
      const res = verificationService.submitBusinessVerification(mockUser.id, {
        companyName: "Atelier Artisan Pro",
        siret: "98765432100019",
        legalForm: "SASU",
        businessAddress: "12 rue des Artisans",
        city: "Lyon",
        postalCode: "69001",
        country: "FR",
        legalRepresentativeName: "Alice Martin",
        legalRepresentativeRole: "Présidente",
        vatNumber: "FR12987654321",
        uboDeclarationAccepted: true,
      });

      expect(res.success).toBe(true);
      expect(res.user?.professionalVerification?.status).toBe("pending");
      expect(res.user?.professionalVerification?.siret).toBe("98765432100019");
    });

    it("approves business verification and sets pro certification", () => {
      verificationService.submitBusinessVerification(mockUser.id, {
        companyName: "Atelier Artisan Pro",
        siret: "98765432100019",
        legalForm: "SASU",
        businessAddress: "12 rue des Artisans",
        city: "Lyon",
        postalCode: "69001",
        country: "FR",
        legalRepresentativeName: "Alice Martin",
        legalRepresentativeRole: "Présidente",
        uboDeclarationAccepted: true,
      });

      const approval = verificationService.reviewBusinessVerification(
        mockUser.id,
        "approve",
        {
          reviewerName: "Admin KYB",
          notes: "KBIS conforme au registre du commerce.",
        },
      );

      expect(approval.success).toBe(true);
      expect(approval.user?.professionalVerification?.status).toBe("verified");
      expect(approval.user?.accountType).toBe("professional");
      expect(approval.user?.isVerified).toBe(true);
    });
  });

  describe("Bank Payout Setup (IBAN)", () => {
    it("validates and registers bank payout details for escrow withdrawals", () => {
      const res = verificationService.saveBankPayoutDetails(mockUser.id, {
        accountHolderName: "Alice Martin",
        iban: "FR76 3000 4000 0112 3456 7890 143",
        bic: "BNPAFRPP",
        bankName: "BNP Paribas",
      });

      expect(res.success).toBe(true);
      expect(res.user?.bankPayoutVerification?.status).toBe("verified");
      expect(res.user?.bankPayoutVerification?.iban).toBe(
        "FR7630004000011234567890143",
      );
    });

    it("rejects invalid IBAN format", () => {
      const res = verificationService.saveBankPayoutDetails(mockUser.id, {
        accountHolderName: "Alice Martin",
        iban: "INVALID_IBAN_123",
        bic: "BNPAFRPP",
      });

      expect(res.success).toBe(false);
    });
  });
});
