import { UserProfile } from "../../types";
import {
  VerificationDimensionId,
  VerificationState,
  VerificationRequirement,
  KycSubmissionData,
  KybSubmissionData,
  VerificationAuditEntry,
  UserVerificationSummary,
} from "./verification.types";
import { storageService } from "../../services/storage.service";
import { calculateVatNumber } from "../../configuration/market.config";
import { deterministicRuntimeId } from "../../utilities/deterministic-id";
import { DEFAULT_MARKET_CODE } from "../../configuration/market-baseline";

const VERIFICATION_AUDIT_KEY = "shongre_verification_audit_logs";

export interface CompanyRegistryResult {
  siren: string;
  siret: string;
  companyName: string;
  legalForm: string;
  tradeName?: string;
  vatNumber: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  nafCode: string;
  nafLabel: string;
  registrationDate: string;
  isActive: boolean;
  capital?: string;
  rcsNumber?: string;
}

export class VerificationService {
  // -------------------------------------------------------------
  // Audit Logs Persistence
  // -------------------------------------------------------------
  public getAuditLogs(userId?: string): VerificationAuditEntry[] {
    const all = storageService.get<VerificationAuditEntry[]>(
      VERIFICATION_AUDIT_KEY,
      [],
    );
    if (userId) {
      return all
        .filter((l) => l.userId === userId)
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );
    }
    return all.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  public logAudit(
    entry: Omit<VerificationAuditEntry, "id" | "timestamp">,
  ): VerificationAuditEntry {
    const logs = this.getAuditLogs();
    const newEntry: VerificationAuditEntry = {
      ...entry,
      id: deterministicRuntimeId("valog", [entry]),
      timestamp: new Date().toISOString(),
    };
    logs.unshift(newEntry);
    storageService.set(VERIFICATION_AUDIT_KEY, logs.slice(0, 200));
    return newEntry;
  }

  // -------------------------------------------------------------
  // Summary & Capabilities Calculation
  // -------------------------------------------------------------
  public getUserVerificationSummary(
    user: UserProfile | null,
  ): UserVerificationSummary {
    if (!user) {
      return {
        dimensions: this.getDefaultDimensions(),
        pendingReviewsCount: 0,
      };
    }

    const emailState: VerificationState = user.isEmailVerified
      ? "verified"
      : "not_started";
    const phoneState: VerificationState = user.isPhoneVerified
      ? "verified"
      : user.phone
        ? "pending"
        : "not_started";

    // Identity KYC state
    let identityState: VerificationState = "not_started";
    if (user.identityVerification?.status) {
      identityState = user.identityVerification.status as VerificationState;
    } else if (user.isIdentityVerified) {
      identityState = "verified";
    }

    // Business KYB state
    let businessState: VerificationState = "not_started";
    if (user.professionalVerification?.status) {
      businessState = user.professionalVerification.status as VerificationState;
    } else if (user.accountType === "professional" && user.isVerified) {
      businessState = "verified";
    }

    // Bank Payout state
    let bankPayoutState: VerificationState = "not_started";
    if (user.bankPayoutVerification?.status) {
      bankPayoutState = user.bankPayoutVerification.status as VerificationState;
    }

    // MFA state
    const mfaState: VerificationState =
      user.mfaEnabled || user.mfa?.isEnabled ? "verified" : "not_started";

    const dimensions: Record<VerificationDimensionId, VerificationRequirement> =
      {
        email: {
          id: "email",
          label: "Adresse email",
          shortLabel: "Email",
          description:
            "Vérification de réception pour les notifications de commandes et messages.",
          state: emailState,
          completedAt: user.isEmailVerified
            ? user.createdAt || new Date().toISOString()
            : undefined,
          actionLabel:
            emailState === "verified" ? "Vérifié" : "Confirmer mon email",
        },
        phone: {
          id: "phone",
          label: "Numéro de téléphone portable (SMS)",
          shortLabel: "Téléphone",
          description:
            "Confirmation du numéro lorsqu’une action ou un contrôle de sécurité le demande.",
          state: phoneState,
          completedAt: user.isPhoneVerified
            ? new Date().toISOString()
            : undefined,
          actionLabel:
            phoneState === "verified" ? "Certifié" : "Vérifier par SMS",
        },
        identity: {
          id: "identity",
          label: "Identité personnelle (KYC)",
          shortLabel: "Pièce d'identité",
          description:
            "Résultat d’un contrôle d’identité réalisé dans l’espace sécurisé du prestataire.",
          state: identityState,
          completedAt: user.identityVerification?.verifiedAt,
          rejectionReason: user.identityVerification?.rejectionReason,
          actionLabel:
            identityState === "verified"
              ? "Identité validée"
              : identityState === "pending"
                ? "Examen en cours"
                : "Vérifier mon identité",
        },
        business: {
          id: "business",
          label: "Entreprise & Immatriculation (KYB)",
          shortLabel: "Extrait KBIS / SIREN",
          description:
            "Vérification légale du registre du commerce et des sociétés (RCS/INSEE).",
          state: businessState,
          completedAt: user.professionalVerification?.reviewedAt,
          rejectionReason: user.professionalVerification?.rejectionReason,
          actionLabel:
            businessState === "verified"
              ? "Boutique certifiée"
              : businessState === "pending"
                ? "Dossier en revue"
                : "Valider mon entreprise",
        },
        bank_payout: {
          id: "bank_payout",
          label: "Compte de versement chez le prestataire de paiement",
          shortLabel: "Compte de virement",
          description:
            "Statut d’activation du compte de versement, sans conserver ses coordonnées dans le profil.",
          state: bankPayoutState,
          completedAt: user.bankPayoutVerification?.verifiedAt,
          rejectionReason: user.bankPayoutVerification?.rejectionReason,
          actionLabel:
            bankPayoutState === "verified"
              ? "Versements activés"
              : "Configurer chez le prestataire",
        },
        mfa: {
          id: "mfa",
          label: "Double authentification (2FA)",
          shortLabel: "Sécurité 2FA",
          description:
            "Protection renforcée du compte contre les tentatives d'accès non autorisées.",
          state: mfaState,
          actionLabel: mfaState === "verified" ? "Actif" : "Activer le 2FA",
        },
      };

    const pendingReviewsCount = [
      identityState,
      businessState,
      bankPayoutState,
    ].filter((s) => s === "pending").length;

    return {
      dimensions,
      pendingReviewsCount,
    };
  }

  // -------------------------------------------------------------
  // KYC / Identity Verification Submission
  // -------------------------------------------------------------
  public submitIdentityVerification(
    userId: string,
    data: KycSubmissionData,
    instantApprove = false,
  ): { success: boolean; message: string; user?: UserProfile } {
    const user = storageService.getUser(userId);
    if (!user) {
      return { success: false, message: "Utilisateur introuvable." };
    }

    const now = new Date().toISOString();
    const previousState = (user.identityVerification?.status ||
      "not_started") as VerificationState;
    const nextState: VerificationState = instantApprove
      ? "verified"
      : "pending";

    user.identityVerification = {
      status: nextState,
      submittedAt: now,
      reviewedAt: instantApprove ? now : undefined,
      reviewedBy: instantApprove ? "Automated OCR & Liveness Check" : undefined,
      documentType: data.documentType,
      issuingCountry:
        data.issuingCountry || user.country || DEFAULT_MARKET_CODE,
      providerReference: `identity_demo_${userId}`,
      verificationMethod: "hosted_provider_session",
      notes: instantApprove
        ? "Validation biométrique instantanée réussie."
        : "Dossier soumis pour examen de conformité.",
    };

    if (instantApprove) {
      user.isIdentityVerified = true;
      user.isVerified = true;
    }

    storageService.saveUser(user);

    this.logAudit({
      userId,
      dimension: "identity",
      previousState,
      newState: nextState,
      performedBy: "user",
      notes: `Session de vérification d'identité (${data.documentType.toUpperCase()} - ${data.issuingCountry})`,
    });

    return {
      success: true,
      message: instantApprove
        ? "Votre pièce d'identité a été validée avec succès !"
        : "Votre pièce d'identité a été transmise à notre équipe de conformité. Délai habituel : moins de 2 heures.",
      user,
    };
  }

  public reviewIdentityVerification(
    userId: string,
    decision: "approve" | "reject" | "request_action",
    options?: { reason?: string; notes?: string; reviewerName?: string },
  ): { success: boolean; message: string; user?: UserProfile } {
    const user = storageService.getUser(userId);
    if (!user) {
      return { success: false, message: "Utilisateur introuvable." };
    }

    const now = new Date().toISOString();
    const previousState = (user.identityVerification?.status ||
      "pending") as VerificationState;
    let nextState: VerificationState = "verified";

    if (decision === "reject") nextState = "rejected";
    if (decision === "request_action") nextState = "requires_action";

    user.identityVerification = {
      ...(user.identityVerification || { status: nextState }),
      status: nextState,
      reviewedAt: now,
      reviewedBy: options?.reviewerName || "Équipe Conformité Shongre",
      rejectionReason: decision !== "approve" ? options?.reason : undefined,
      notes: options?.notes || user.identityVerification?.notes,
    };

    if (decision === "approve") {
      user.isIdentityVerified = true;
      user.isVerified = true;
    } else {
      user.isIdentityVerified = false;
    }

    storageService.saveUser(user);

    this.logAudit({
      userId,
      dimension: "identity",
      previousState,
      newState: nextState,
      performedBy: options?.reviewerName || "Admin Conformité",
      reason: options?.reason,
      notes: options?.notes,
    });

    return {
      success: true,
      message:
        decision === "approve"
          ? "Identité approuvée avec succès."
          : "Statut de l'identité mis à jour.",
      user,
    };
  }

  // -------------------------------------------------------------
  // KYB / Business Verification Submission
  // -------------------------------------------------------------
  public submitBusinessVerification(
    userId: string,
    data: KybSubmissionData,
    instantApprove = false,
  ): { success: boolean; message: string; user?: UserProfile } {
    const user = storageService.getUser(userId);
    if (!user) {
      return { success: false, message: "Utilisateur introuvable." };
    }

    const cleanSiret = data.siret.replace(/\s+/g, "");
    const now = new Date().toISOString();
    const previousState = (user.professionalVerification?.status ||
      "not_started") as VerificationState;
    const nextState: VerificationState = instantApprove
      ? "verified"
      : "pending";

    const calculatedVat =
      data.vatNumber?.trim() ||
      calculateVatNumber(cleanSiret, data.country || DEFAULT_MARKET_CODE);

    user.accountType = "professional";
    user.primaryRole = "pro_seller";
    user.role = "pro_seller";
    user.sellerType = "pro";
    user.companyName = data.companyName.trim();
    user.sirenSiret = cleanSiret;
    user.siret = cleanSiret;
    user.legalForm = data.legalForm;
    user.vatNumber = calculatedVat;
    user.businessAddress = `${data.businessAddress.trim()}, ${data.postalCode} ${data.city}`;
    user.storeSlug =
      user.storeSlug ||
      data.companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    user.professionalVerification = {
      status: nextState,
      submittedAt: now,
      reviewedAt: instantApprove ? now : undefined,
      reviewedBy: instantApprove
        ? "Automated INSEE / Sirene Validation"
        : undefined,
      documentType: "kbis",
      companyName: data.companyName.trim(),
      siret: cleanSiret,
      legalForm: data.legalForm,
      vatNumber: calculatedVat,
      notes: instantApprove
        ? "Immatriculation validée automatiquement."
        : "Dossier KBIS soumis à examen.",
    };

    if (instantApprove) {
      user.isVerified = true;
    }

    storageService.saveUser(user);

    this.logAudit({
      userId,
      dimension: "business",
      previousState,
      newState: nextState,
      performedBy: "user",
      notes: `Soumission KYB (${data.companyName} - SIRET: ${cleanSiret})`,
    });

    return {
      success: true,
      message: instantApprove
        ? "Votre statut professionnel a été validé !"
        : "Votre dossier d'immatriculation a été soumis avec succès. Validation sous 24h ouvrées.",
      user,
    };
  }

  public reviewBusinessVerification(
    userId: string,
    decision: "approve" | "reject" | "request_action",
    options?: { reason?: string; notes?: string; reviewerName?: string },
  ): { success: boolean; message: string; user?: UserProfile } {
    const user = storageService.getUser(userId);
    if (!user) {
      return { success: false, message: "Utilisateur introuvable." };
    }

    const now = new Date().toISOString();
    const previousState = (user.professionalVerification?.status ||
      "pending") as VerificationState;
    let nextState: VerificationState = "verified";

    if (decision === "reject") nextState = "rejected";
    if (decision === "request_action") nextState = "requires_action";

    user.professionalVerification = {
      ...(user.professionalVerification || { status: nextState }),
      status: nextState,
      reviewedAt: now,
      reviewedBy: options?.reviewerName || "Équipe Conformité Entreprises",
      rejectionReason: decision !== "approve" ? options?.reason : undefined,
      notes: options?.notes || user.professionalVerification?.notes,
    };

    if (decision === "approve") {
      user.isVerified = true;
    }

    storageService.saveUser(user);

    this.logAudit({
      userId,
      dimension: "business",
      previousState,
      newState: nextState,
      performedBy: options?.reviewerName || "Admin KYB",
      reason: options?.reason,
      notes: options?.notes,
    });

    return {
      success: true,
      message:
        decision === "approve"
          ? "Dossier entreprise approuvé avec succès."
          : "Statut KYB mis à jour.",
      user,
    };
  }

  // -------------------------------------------------------------
  // Simulated Sirene / French Business Registry API Lookup
  // -------------------------------------------------------------
  public lookupCompanyBySiret(input: string): CompanyRegistryResult | null {
    const clean = input.replace(/[^0-9]/g, "");
    if (clean.length < 9) return null;

    const siren = clean.slice(0, 9);
    const siret = clean.length >= 14 ? clean.slice(0, 14) : `${siren}00018`;

    // Realistic simulation dataset for demo / known SIRETs
    const mockRegistries: Record<string, Partial<CompanyRegistryResult>> = {
      "98765432100012": {
        companyName: "Atelier Nordique SAS",
        legalForm: "Société par actions simplifiée (SAS)",
        tradeName: "L'Atelier Nordique",
        address: "14 rue de l'Artisanat",
        city: "Lyon",
        postalCode: "69002",
        nafCode: "31.09B",
        nafLabel: "Fabrication d'autres meubles et industries connexes",
        registrationDate: "2018-04-12",
        capital: "25 000 €",
        rcsNumber: "RCS Lyon B 987 654 321",
      },
      "44332211000045": {
        companyName: "Sophie Vintage & Brocante",
        legalForm: "Micro-entreprise / Auto-entrepreneur",
        tradeName: "Sophie Brocante",
        address: "8 boulevard de la Liberté",
        city: "Nantes",
        postalCode: "44000",
        nafCode: "47.79Z",
        nafLabel: "Commerce de détail de biens d'occasion en magasin",
        registrationDate: "2021-09-01",
        capital: "0 €",
        rcsNumber: "RCS Nantes 443 322 110",
      },
      "84930219800015": {
        companyName: "Cycle Expert Solutions SARL",
        legalForm: "Société à responsabilité limitée (SARL)",
        tradeName: "Cycle Expert",
        address: "32 avenue des Gobelins",
        city: "Paris",
        postalCode: "75013",
        nafCode: "47.64Z",
        nafLabel: "Commerce de détail d'articles de sport",
        registrationDate: "2019-11-20",
        capital: "50 000 €",
        rcsNumber: "RCS Paris B 849 302 198",
      },
    };

    const preset = mockRegistries[siret] || mockRegistries[clean];
    if (preset) {
      return {
        siren,
        siret,
        companyName: preset.companyName || "Société Enregistrée",
        legalForm: preset.legalForm || "SAS",
        tradeName: preset.tradeName,
        vatNumber: `FR ${calculateVatNumber(siret, "FR").replace("FR", "").trim()}`,
        address: preset.address || "10 avenue de la République",
        city: preset.city || "Paris",
        postalCode: preset.postalCode || "75011",
        country: "FR",
        nafCode: preset.nafCode || "47.91B",
        nafLabel:
          preset.nafLabel || "Vente à distance sur catalogue spécialisé",
        registrationDate: preset.registrationDate || "2020-01-15",
        isActive: true,
        capital: preset.capital || "10 000 €",
        rcsNumber: preset.rcsNumber || `RCS Paris ${siren}`,
      };
    }

    // Dynamic fallback generation for any valid 9/14 digits
    return {
      siren,
      siret,
      companyName: `Entreprise ${siren}`,
      legalForm: "Société par actions simplifiée (SAS)",
      tradeName: `Commerce ${siren.slice(0, 4)}`,
      vatNumber: calculateVatNumber(siret, "FR"),
      address: "25 avenue des Champs-Élysées",
      city: "Paris",
      postalCode: "75008",
      country: "FR",
      nafCode: "47.91A",
      nafLabel: "Vente à distance sur catalogue général",
      registrationDate: "2022-03-10",
      isActive: true,
      capital: "15 000 €",
      rcsNumber: `RCS Paris B ${siren}`,
    };
  }

  // -------------------------------------------------------------
  // Demo State Preset Simulator
  // -------------------------------------------------------------
  public setDemoVerificationState(
    userId: string,
    preset:
      | "tier_0_unverified"
      | "tier_1_email_only"
      | "tier_2_phone_verified"
      | "kyc_pending"
      | "tier_3_kyc_verified"
      | "kyc_rejected"
      | "kyb_pending"
      | "tier_4_kyb_verified"
      | "kyb_rejected"
      | "full_trust_pro",
  ): { success: boolean; user: UserProfile } {
    const user = storageService.getUser(userId);
    if (!user) {
      throw new Error(`Utilisateur ${userId} introuvable`);
    }

    const now = new Date().toISOString();

    switch (preset) {
      case "tier_0_unverified":
        user.isEmailVerified = false;
        user.isPhoneVerified = false;
        user.isIdentityVerified = false;
        user.isVerified = false;
        delete user.identityVerification;
        delete user.professionalVerification;
        delete user.bankPayoutVerification;
        break;

      case "tier_1_email_only":
        user.isEmailVerified = true;
        user.isPhoneVerified = false;
        user.isIdentityVerified = false;
        user.isVerified = false;
        delete user.identityVerification;
        delete user.professionalVerification;
        delete user.bankPayoutVerification;
        break;

      case "tier_2_phone_verified":
        user.isEmailVerified = true;
        user.isPhoneVerified = true;
        user.isIdentityVerified = false;
        user.isVerified = false;
        delete user.identityVerification;
        delete user.professionalVerification;
        break;

      case "kyc_pending":
        user.isEmailVerified = true;
        user.isPhoneVerified = true;
        user.isIdentityVerified = false;
        user.isVerified = false;
        user.identityVerification = {
          status: "pending",
          submittedAt: now,
          documentType: "national_id",
          issuingCountry: "FR",
          providerReference: `identity_demo_${userId}`,
          verificationMethod: "hosted_provider_session",
          notes: "Dossier soumis pour vérification manuelle.",
        };
        break;

      case "tier_3_kyc_verified":
        user.isEmailVerified = true;
        user.isPhoneVerified = true;
        user.isIdentityVerified = true;
        user.isVerified = true;
        user.identityVerification = {
          status: "verified",
          submittedAt: now,
          verifiedAt: now,
          reviewedBy: "Contrôle Automatisé ACPR",
          documentType: "national_id",
          issuingCountry: "FR",
          providerReference: `identity_demo_${userId}`,
          verificationMethod: "hosted_provider_session",
        };
        user.bankPayoutVerification = {
          status: "verified",
          submittedAt: now,
          verifiedAt: now,
          providerReference: `payment_demo_${userId}`,
          accountLast4: "4589",
          verificationMethod: "hosted_provider_onboarding",
        };
        break;

      case "kyc_rejected":
        user.isEmailVerified = true;
        user.isPhoneVerified = true;
        user.isIdentityVerified = false;
        user.isVerified = false;
        user.identityVerification = {
          status: "rejected",
          submittedAt: now,
          reviewedAt: now,
          reviewedBy: "Équipe Conformité",
          documentType: "national_id",
          rejectionReason:
            "Document illisible ou reflets masquant la bande MRZ.",
          notes:
            "Veuillez reprendre une photo nette et non tronquée de votre document original.",
        };
        break;

      case "kyb_pending":
        user.accountType = "professional";
        user.primaryRole = "pro_seller";
        user.role = "pro_seller";
        user.sellerType = "pro";
        user.companyName = user.companyName || "Atelier Design & Vintage";
        user.siret = user.siret || "98765432100012";
        user.isEmailVerified = true;
        user.isPhoneVerified = true;
        user.isVerified = false;
        user.professionalVerification = {
          status: "pending",
          submittedAt: now,
          companyName: user.companyName,
          siret: user.siret,
          legalForm: "SAS",
          documentType: "kbis",
          notes: "Extrait KBIS en cours d'analyse par nos juristes.",
        };
        break;

      case "tier_4_kyb_verified":
        user.accountType = "professional";
        user.primaryRole = "pro_seller";
        user.role = "pro_seller";
        user.sellerType = "pro";
        user.companyName = user.companyName || "Atelier Nordique SAS";
        user.siret = user.siret || "98765432100012";
        user.sirenSiret = user.siret;
        user.legalForm = "SAS";
        user.vatNumber = `FR 54 ${user.siret.slice(0, 9)}`;
        user.isEmailVerified = true;
        user.isPhoneVerified = true;
        user.isIdentityVerified = true;
        user.isVerified = true;
        user.professionalVerification = {
          status: "verified",
          submittedAt: now,
          reviewedAt: now,
          reviewedBy: "Pôle Juridique Shongre",
          companyName: user.companyName,
          siret: user.siret,
          legalForm: "SAS",
          documentType: "kbis",
          notes: "Immatriculation RCS vérifiée et active.",
        };
        break;

      case "kyb_rejected":
        user.accountType = "professional";
        user.isVerified = false;
        user.professionalVerification = {
          status: "rejected",
          submittedAt: now,
          reviewedAt: now,
          reviewedBy: "Pôle Juridique Shongre",
          companyName: user.companyName || "Société Test",
          siret: user.siret || "00000000000000",
          rejectionReason:
            "Numéro SIRET radié ou non concordant avec la raison sociale déclarée.",
          notes:
            "Merci de fournir un extrait KBIS à jour datant de moins de 3 mois.",
        };
        break;

      case "full_trust_pro":
        user.accountType = "professional";
        user.primaryRole = "pro_seller";
        user.role = "pro_seller";
        user.sellerType = "pro";
        user.companyName = user.companyName || "Atelier Nordique SAS";
        user.siret = "98765432100012";
        user.sirenSiret = "98765432100012";
        user.legalForm = "Société par actions simplifiée (SAS)";
        user.vatNumber = "FR 54 987654321";
        user.isEmailVerified = true;
        user.isPhoneVerified = true;
        user.isIdentityVerified = true;
        user.isVerified = true;
        user.mfaEnabled = true;
        user.mfa = { isEnabled: true };
        user.professionalVerification = {
          status: "verified",
          submittedAt: now,
          reviewedAt: now,
          reviewedBy: "Conformité Pro",
          companyName: "Atelier Nordique SAS",
          siret: "98765432100012",
          legalForm: "SAS",
        };
        user.identityVerification = {
          status: "verified",
          submittedAt: now,
          verifiedAt: now,
          reviewedBy: "Automated Biometrics",
          documentType: "passport",
        };
        user.bankPayoutVerification = {
          status: "verified",
          submittedAt: now,
          verifiedAt: now,
          providerReference: `payment_demo_${userId}`,
          accountLast4: "9812",
          verificationMethod: "hosted_provider_onboarding",
        };
        break;
    }

    storageService.saveUser(user);
    this.logAudit({
      userId,
      dimension: "identity",
      previousState: "not_started",
      newState: "verified",
      performedBy: "demo_switcher",
      notes: `Basculement vers scénario de démonstration : ${preset}`,
    });

    return { success: true, user };
  }

  // -------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------
  private getDefaultDimensions(): Record<
    VerificationDimensionId,
    VerificationRequirement
  > {
    return {
      email: {
        id: "email",
        label: "Adresse email",
        shortLabel: "Email",
        description: "Vérification de réception.",
        state: "not_started",
      },
      phone: {
        id: "phone",
        label: "Numéro de téléphone portable (SMS)",
        shortLabel: "Téléphone",
        description: "Authentification 2FA par SMS.",
        state: "not_started",
      },
      identity: {
        id: "identity",
        label: "Identité personnelle (KYC)",
        shortLabel: "Pièce d'identité",
        description: "Contrôle officiel de la CNI / Passeport.",
        state: "not_started",
      },
      business: {
        id: "business",
        label: "Entreprise & Immatriculation (KYB)",
        shortLabel: "Extrait KBIS / SIREN",
        description: "Vérification légale RCS.",
        state: "not_started",
      },
      bank_payout: {
        id: "bank_payout",
        label: "Compte de versement chez le prestataire de paiement",
        shortLabel: "Compte de virement",
        description: "Statut du compte de versement géré par le prestataire.",
        state: "not_started",
      },
      mfa: {
        id: "mfa",
        label: "Double authentification (2FA)",
        shortLabel: "Sécurité 2FA",
        description: "Protection renforcée du compte.",
        state: "not_started",
      },
    };
  }
}

export const verificationService = new VerificationService();
