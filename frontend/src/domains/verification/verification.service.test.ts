import { describe, it, expect, beforeEach } from "vitest";
import { verificationService } from "./verification.service";
import { storageService } from "../../services/storage.service";
import { UserProfile } from "../../types";

describe("VerificationService - KYC / KYB compatibility projection", () => {
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

  describe("Identity Verification (KYC)", () => {
    it("submits identity verification document and sets status to pending", () => {
      const res = verificationService.submitIdentityVerification(mockUser.id, {
        documentType: "national_id",
        issuingCountry: "FR",
      });

      expect(res.success).toBe(true);
      expect(res.user?.identityVerification?.status).toBe("pending");
      expect(res.user?.identityVerification?.documentType).toBe("national_id");
      expect(res.user?.identityVerification).not.toHaveProperty("birthDate");
      expect(res.user?.identityVerification).not.toHaveProperty("documentNumber");

      // Check audit log
      const logs = verificationService.getAuditLogs(mockUser.id);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].dimension).toBe("identity");
      expect(logs[0].newState).toBe("pending");
    });

    it("approves identity verification and marks identity as verified", () => {
      verificationService.submitIdentityVerification(mockUser.id, {
        documentType: "passport",
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
        vatNumber: "FR12987654321",
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

});
