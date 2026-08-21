import { UserProfile } from "../../types";
import {
  VerificationDimensionId,
  VerificationState,
  VerificationRequirement,
  KycSubmissionData,
  KybSubmissionData,
  BankPayoutSubmissionData,
  VerificationAuditEntry,
  MarketplaceCapabilityStatus,
  UserVerificationSummary,
  TrustLevel,
} from "./verification.types";
import { storageService } from "../../services/storage.service";
import { calculateVatNumber } from "../../configuration/market.config";

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
      id: `valog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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
        trustLevel: "tier_0_visitor",
        trustScore: 0,
        trustLevelLabel: "Visiteur non identifié",
        dimensions: this.getDefaultDimensions(),
        capabilities: this.getZeroCapabilities(),
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
          isRequiredForPro: true,
          isRequiredForHighValue: true,
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
            "Authentification 2FA par SMS pour la sécurisation des remises en main propre.",
          state: phoneState,
          isRequiredForPro: true,
          isRequiredForHighValue: true,
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
            "Contrôle officiel de la CNI, du Passeport ou du Titre de séjour (norme ACPR).",
          state: identityState,
          isRequiredForPro: true,
          isRequiredForHighValue: true,
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
          isRequiredForPro: true,
          isRequiredForHighValue: false,
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
          label: "Coordonnées bancaires (IBAN SEPA)",
          shortLabel: "Compte de virement",
          description:
            "Vérification du compte bancaire récepteur pour le virement des fonds de séquestre.",
          state: bankPayoutState,
          isRequiredForPro: true,
          isRequiredForHighValue: true,
          completedAt: user.bankPayoutVerification?.verifiedAt,
          rejectionReason: user.bankPayoutVerification?.rejectionReason,
          actionLabel:
            bankPayoutState === "verified" ? "IBAN vérifié" : "Ajouter un IBAN",
        },
        mfa: {
          id: "mfa",
          label: "Double authentification (2FA)",
          shortLabel: "Sécurité 2FA",
          description:
            "Protection renforcée du compte contre les tentatives d'accès non autorisées.",
          state: mfaState,
          isRequiredForPro: false,
          isRequiredForHighValue: false,
          actionLabel: mfaState === "verified" ? "Actif" : "Activer le 2FA",
        },
      };

    // Calculate score (0 - 100)
    let score = 0;
    if (emailState === "verified") score += 15;
    if (phoneState === "verified") score += 20;
    if (identityState === "verified") score += 30;
    if (businessState === "verified") score += 15;
    if (bankPayoutState === "verified") score += 10;
    if (mfaState === "verified") score += 10;
    score = Math.min(100, score);

    // Calculate Trust Level
    let trustLevel: TrustLevel = "tier_1_starter";
    let trustLevelLabel = "Niveau 1 — Membre Débutant";

    if (user.accountType === "professional" && businessState === "verified") {
      trustLevel = "tier_4_verified_pro";
      trustLevelLabel = "Niveau 4 — Professionnel Certifié RCS";
    } else if (
      identityState === "verified" &&
      (phoneState === "verified" || bankPayoutState === "verified")
    ) {
      trustLevel = "tier_3_trusted_seller";
      trustLevelLabel = "Niveau 3 — Vendeur de Confiance";
    } else if (emailState === "verified" && phoneState === "verified") {
      trustLevel = "tier_2_verified_member";
      trustLevelLabel = "Niveau 2 — Membre Vérifié";
    }

    // Calculate capabilities
    const isEmailOk = emailState === "verified";
    const isPhoneOk = phoneState === "verified";
    const isIdentityOk = identityState === "verified";
    const isBusinessOk = businessState === "verified";
    const isBankOk = bankPayoutState === "verified";

    const capabilities: MarketplaceCapabilityStatus = {
      canBrowse: true,
      canContact: isEmailOk || isPhoneOk || isIdentityOk,
      canBuyStandard: isEmailOk,
      canBuyHighValue: (isEmailOk && isPhoneOk) || isIdentityOk,
      canPublishIndividualLow: isEmailOk && isPhoneOk,
      canPublishIndividualHigh: isEmailOk && isPhoneOk && isIdentityOk,
      canPublishPro: user.accountType === "professional" && isBusinessOk,
      canReceivePayouts: (isIdentityOk || isBusinessOk) && isBankOk,
      canAccessProStorefront:
        user.accountType === "professional" && isBusinessOk,
    };

    // Calculate next recommended step
    let nextRecommendedStep: VerificationRequirement | undefined;
    if (!isEmailOk) {
      nextRecommendedStep = dimensions.email;
    } else if (!isPhoneOk) {
      nextRecommendedStep = dimensions.phone;
    } else if (!isIdentityOk && user.accountType !== "professional") {
      nextRecommendedStep = dimensions.identity;
    } else if (user.accountType === "professional" && !isBusinessOk) {
      nextRecommendedStep = dimensions.business;
    } else if (!isBankOk) {
      nextRecommendedStep = dimensions.bank_payout;
    } else if (mfaState !== "verified") {
      nextRecommendedStep = dimensions.mfa;
    }

    const pendingReviewsCount = [
      identityState,
      businessState,
      bankPayoutState,
    ].filter((s) => s === "pending").length;

    return {
      trustLevel,
      trustScore: score,
      trustLevelLabel,
      dimensions,
      capabilities,
      nextRecommendedStep,
      pendingReviewsCount,
    };
  }

  // -------------------------------------------------------------
  // Trust Score Computation
  // -------------------------------------------------------------
  public computeTrustScore(user: UserProfile | null): {
    score: number;
    level: "bronze" | "silver" | "gold" | "platinum";
    levelLabel: string;
    breakdown: Record<string, number>;
  } {
    const summary = this.getUserVerificationSummary(user);
    let level: "bronze" | "silver" | "gold" | "platinum" = "bronze";
    if (summary.trustScore >= 90) level = "platinum";
    else if (summary.trustScore >= 75) level = "gold";
    else if (summary.trustScore >= 50) level = "silver";

    return {
      score: summary.trustScore,
      level,
      levelLabel: summary.trustLevelLabel,
      breakdown: {
        email: summary.dimensions.email.state === "verified" ? 10 : 0,
        phone: summary.dimensions.phone.state === "verified" ? 15 : 0,
        identity: summary.dimensions.identity.state === "verified" ? 30 : 0,
        business: summary.dimensions.business.state === "verified" ? 25 : 0,
        bank_payout:
          summary.dimensions.bank_payout.state === "verified" ? 10 : 0,
        mfa: summary.dimensions.mfa.state === "verified" ? 10 : 0,
      },
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
      documentNumber:
        data.documentNumber ||
        `ID-${Math.floor(10000000 + Math.random() * 90000000)}`,
      issuingCountry: data.issuingCountry || user.country || "FR",
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      birthDate: data.birthDate,
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
      notes: `Soumission pièce d'identité (${data.documentType.toUpperCase()} - ${data.issuingCountry})`,
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
      calculateVatNumber(cleanSiret, data.country || "FR");

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
  // Bank Payout / IBAN Verification
  // -------------------------------------------------------------
  public submitBankPayoutVerification(
    userId: string,
    data: BankPayoutSubmissionData,
  ): { success: boolean; message: string; user?: UserProfile } {
    const user = storageService.getUser(userId);
    if (!user) {
      return { success: false, message: "Utilisateur introuvable." };
    }

    const cleanIban = data.iban.replace(/\s+/g, "").toUpperCase();
    const cleanBic = data.bic.replace(/\s+/g, "").toUpperCase();

    if (cleanIban.length < 15 || !/^[A-Z]{2}[0-9A-Z]+$/.test(cleanIban)) {
      return { success: false, message: "Format IBAN SEPA invalide." };
    }

    const now = new Date().toISOString();
    const previousState = (user.bankPayoutVerification?.status ||
      "not_started") as VerificationState;

    user.bankPayoutVerification = {
      status: "verified",
      submittedAt: now,
      verifiedAt: now,
      accountHolderName: data.accountHolderName.trim(),
      iban: cleanIban,
      bic: cleanBic,
      bankName: data.bankName || "Banque SEPA Validée",
    };

    storageService.saveUser(user);

    this.logAudit({
      userId,
      dimension: "bank_payout",
      previousState,
      newState: "verified",
      performedBy: "system",
      notes: `Vérification compte bancaire SEPA (${cleanIban.slice(0, 4)}...${cleanIban.slice(-4)})`,
    });

    return {
      success: true,
      message:
        "Coordonnées bancaires enregistrées et validées pour vos virements de séquestre.",
      user,
    };
  }

  public saveBankPayoutDetails(
    userId: string,
    data: BankPayoutSubmissionData,
  ): { success: boolean; message: string; user?: UserProfile } {
    return this.submitBankPayoutVerification(userId, data);
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
          firstName: user.name.split(" ")[0] || "Jean",
          lastName: user.name.split(" ")[1] || "Dupont",
          birthDate: "1988-06-14",
          issuingCountry: "FR",
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
          firstName: user.name.split(" ")[0] || "Jean",
          lastName: user.name.split(" ")[1] || "Dupont",
          birthDate: "1988-06-14",
          issuingCountry: "FR",
        };
        user.bankPayoutVerification = {
          status: "verified",
          submittedAt: now,
          verifiedAt: now,
          accountHolderName: user.name,
          iban: "FR76 •••• •••• 4589",
          bic: "BNPAFRPP",
          bankName: "BNP Paribas",
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
          accountHolderName: "Atelier Nordique SAS",
          iban: "FR76 •••• •••• 9812",
          bic: "BNPAFRPP",
          bankName: "BNP Paribas Entreprises",
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
        isRequiredForPro: true,
        isRequiredForHighValue: true,
      },
      phone: {
        id: "phone",
        label: "Numéro de téléphone portable (SMS)",
        shortLabel: "Téléphone",
        description: "Authentification 2FA par SMS.",
        state: "not_started",
        isRequiredForPro: true,
        isRequiredForHighValue: true,
      },
      identity: {
        id: "identity",
        label: "Identité personnelle (KYC)",
        shortLabel: "Pièce d'identité",
        description: "Contrôle officiel de la CNI / Passeport.",
        state: "not_started",
        isRequiredForPro: true,
        isRequiredForHighValue: true,
      },
      business: {
        id: "business",
        label: "Entreprise & Immatriculation (KYB)",
        shortLabel: "Extrait KBIS / SIREN",
        description: "Vérification légale RCS.",
        state: "not_started",
        isRequiredForPro: true,
        isRequiredForHighValue: false,
      },
      bank_payout: {
        id: "bank_payout",
        label: "Coordonnées bancaires (IBAN SEPA)",
        shortLabel: "Compte de virement",
        description: "Vérification du compte bancaire pour le virement.",
        state: "not_started",
        isRequiredForPro: true,
        isRequiredForHighValue: true,
      },
      mfa: {
        id: "mfa",
        label: "Double authentification (2FA)",
        shortLabel: "Sécurité 2FA",
        description: "Protection renforcée du compte.",
        state: "not_started",
        isRequiredForPro: false,
        isRequiredForHighValue: false,
      },
    };
  }

  private getZeroCapabilities(): MarketplaceCapabilityStatus {
    return {
      canBrowse: true,
      canContact: false,
      canBuyStandard: false,
      canBuyHighValue: false,
      canPublishIndividualLow: false,
      canPublishIndividualHigh: false,
      canPublishPro: false,
      canReceivePayouts: false,
      canAccessProStorefront: false,
    };
  }
}

export const verificationService = new VerificationService();
