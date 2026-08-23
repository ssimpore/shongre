import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Building2,
  CreditCard,
  Check,
  X,
  History,
} from "lucide-react";
import { storageService } from "../../services/storage.service";
import { verificationService } from "../../domains/verification/verification.service";
import { UserProfile } from "../../types";
import { Button } from "../../design-system/primitives/Button";
import { useToast } from "../../app/providers/ToastProvider";
import { Image } from "../../design-system/primitives/Image";
import { PromptModal } from "../../design-system/primitives/PromptModal";
import { Tabs, TabPanel } from "../../design-system";
import { useTranslation } from "../../i18n/I18nProvider";
import { usePageMeta } from "../../hooks/usePageMeta";
import { labelIdentifier } from "../../utilities/identifier-label";

export const AdminVerificationsPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: t("meta.adminVerifications.title"),
    description: t("meta.adminVerifications.description"),
    canonicalPath: "/admin/verifications",
    noIndex: true,
  });

  const toast = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = useState<"kyc" | "kyb" | "bank" | "audit">(
    "kyc",
  );
  const [] = useState("");

  // Review modals
  const [rejectModal, setRejectModal] = useState<{
    user: UserProfile;
    dimension: "identity" | "business";
  } | null>(null);

  const loadData = () => {
    const list = storageService.getUsers();
    setUsers(Object.values(list));
  };

  useEffect(() => {
    loadData();
  }, []);

  const pendingKycUsers = users.filter(
    (u) =>
      u.identityVerification?.status === "pending" ||
      (u.identityVerification && u.identityVerification.status !== "verified"),
  );

  const pendingKybUsers = users.filter(
    (u) =>
      u.professionalVerification?.status === "pending" ||
      (u.professionalVerification &&
        u.professionalVerification.status !== "verified"),
  );

  const pendingBankUsers = users.filter(
    (u) =>
      u.bankPayoutVerification?.status === "pending" ||
      (u.bankPayoutVerification &&
        u.bankPayoutVerification.status === "verified"),
  );

  const auditLogs = verificationService.getAuditLogs();

  const handleApproveIdentity = (u: UserProfile) => {
    const res = verificationService.reviewIdentityVerification(
      u.id,
      "approve",
      {
        reviewerName: "Admin Conformité",
        notes: "Pièce d'identité conforme validée manuellement.",
      },
    );
    if (res.success) {
      toast.success(`Identité de ${u.name} approuvée avec succès.`);
      loadData();
    }
  };

  const handleApproveBusiness = (u: UserProfile) => {
    const res = verificationService.reviewBusinessVerification(
      u.id,
      "approve",
      {
        reviewerName: "Admin KYB",
        notes: "KBIS vérifié au greffe du tribunal de commerce.",
      },
    );
    if (res.success) {
      toast.success(`Entreprise ${u.companyName || u.name} certifiée Pro RCS.`);
      loadData();
    }
  };

  const handleConfirmReject = (reason: string) => {
    if (!rejectModal) return;
    const { user, dimension } = rejectModal;

    if (dimension === "identity") {
      verificationService.reviewIdentityVerification(user.id, "reject", {
        reason: reason || "Document non conforme ou illisible.",
        reviewerName: "Admin Conformité",
      });
      toast.info(`Vérification d'identité de ${user.name} refusée.`);
    } else {
      verificationService.reviewBusinessVerification(user.id, "reject", {
        reason: reason || "Extrait KBIS non valide ou SIRET caduc.",
        reviewerName: "Admin KYB",
      });
      toast.info(`Vérification entreprise de ${user.name} refusée.`);
    }

    setRejectModal(null);
    loadData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-micro font-black uppercase tracking-wider text-success bg-success-surface px-2 py-0.5 rounded-full border border-success-border">
            {t("admin.adminVerificationsPage.conformiteLcbFt")}
          </span>
          <span className="text-stone-300">•</span>
          <span className="text-xs text-stone-500 font-bold">
            {t("admin.adminVerificationsPage.fileDeModerationKycKyb")}
          </span>
        </div>
        <h1 className="text-2xl font-black text-stone-900 tracking-tight">
          {t("admin.adminVerificationsPage.poleDeVerificationSecurite")}
        </h1>
        <p className="text-xs text-stone-600 mt-1">
          {t("admin.adminVerificationsPage.examinezLesPiecesDIdentite")}
        </p>
      </div>

      {/* Navigation Tabs */}
      <Tabs
        variant="segmented"
        label={t("admin.adminVerificationsPage.filesDAttenteDeVerification")}
        idPrefix="admin-verifications"
        activeTab={activeTab}
        onChange={(tab) => setActiveTab(tab as typeof activeTab)}
        tabs={[
          {
            id: "kyc",
            label: "Identités KYC",
            count: pendingKycUsers.length,
            icon: <ShieldCheck className="w-4 h-4" />,
          },
          {
            id: "kyb",
            label: "Entreprises KYB",
            count: pendingKybUsers.length,
            icon: <Building2 className="w-4 h-4" />,
          },
          {
            id: "bank",
            label: "Comptes IBAN",
            count: pendingBankUsers.length,
            icon: <CreditCard className="w-4 h-4" />,
          },
          {
            id: "audit",
            label: "Journal d'audit",
            count: auditLogs.length,
            icon: <History className="w-4 h-4" />,
          },
        ]}
      />

      <TabPanel tab={activeTab} idPrefix="admin-verifications">
        {/* Tab: KYC Identity */}
        {activeTab === "kyc" && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between">
              <h2 className="text-xs font-bold text-stone-900">
                {t("admin.adminVerificationsPage.dossiersDIdentiteEnFile")}
              </h2>
              <span className="text-micro text-stone-500">
                {pendingKycUsers.length} dossier(s)
              </span>
            </div>

            {pendingKycUsers.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500 font-semibold">
                {t("admin.adminVerificationsPage.aucunDossierKycEnAttente")}
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {pendingKycUsers.map((u) => {
                  const kyc = u.identityVerification;
                  const isPending = kyc?.status === "pending";
                  const isVerified = kyc?.status === "verified";

                  return (
                    <div
                      key={u.id}
                      className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3">
                        <Image
                          src={
                            u.avatarUrl ||
                            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120"
                          }
                          alt={u.name}
                          sizes="44px"
                          className="w-11 h-11 rounded-full object-cover border border-stone-200 shrink-0"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-stone-900">
                              {u.name}
                            </span>
                            <span className="text-micro text-stone-500 font-mono">
                              ({u.email})
                            </span>
                            <span
                              className={`text-micro px-2 py-0.5 rounded-full font-bold uppercase ${
                                isVerified
                                  ? "bg-success-surface text-success"
                                  : isPending
                                    ? "bg-warning-surface text-warning"
                                    : "bg-danger-surface text-danger"
                              }`}
                            >
                              {kyc?.status || "Non commencé"}
                            </span>
                          </div>
                          <div className="text-xs text-stone-600">
                            <strong>
                              {t("admin.adminVerificationsPage.piece")}
                            </strong>{" "}
                            {kyc?.documentType?.toUpperCase() || "CNI"} •{" "}
                            <strong>Pays :</strong>{" "}
                            {kyc?.issuingCountry || "FR"} •{" "}
                            <strong>Date naiss. :</strong>{" "}
                            {kyc?.birthDate || "Non spécifiée"}
                          </div>
                          {kyc?.notes && (
                            <div className="text-micro text-stone-500 bg-stone-50 p-2 rounded-lg border border-stone-200">
                              {kyc.notes}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setRejectModal({ user: u, dimension: "identity" })
                          }
                          leftIcon={<X className="w-3.5 h-3.5" />}
                        >
                          Refuser
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={() => handleApproveIdentity(u)}
                          leftIcon={<Check className="w-3.5 h-3.5" />}
                        >
                          {t("admin.adminVerificationsPage.validerLIdentite")}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab: KYB Business */}
        {activeTab === "kyb" && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between">
              <h2 className="text-xs font-bold text-stone-900">
                Dossiers d'immatriculation Pro & KBIS
              </h2>
              <span className="text-micro text-stone-500">
                {pendingKybUsers.length} dossier(s)
              </span>
            </div>

            {pendingKybUsers.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500 font-semibold">
                {t("admin.adminVerificationsPage.aucunDossierKybEnAttente")}
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {pendingKybUsers.map((u) => {
                  const kyb = u.professionalVerification;
                  const isPending = kyb?.status === "pending";
                  const isVerified = kyb?.status === "verified";

                  return (
                    <div
                      key={u.id}
                      className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-xl bg-warning-surface text-warning flex items-center justify-center shrink-0">
                          <Building2 className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-stone-900">
                              {kyb?.companyName || u.companyName || u.name}
                            </span>
                            <span
                              className={`text-micro px-2 py-0.5 rounded-full font-bold uppercase ${
                                isVerified
                                  ? "bg-success-surface text-success"
                                  : isPending
                                    ? "bg-warning-surface text-warning"
                                    : "bg-danger-surface text-danger"
                              }`}
                            >
                              {kyb?.status || "Non commencé"}
                            </span>
                          </div>
                          <div className="text-xs text-stone-600">
                            <strong>SIRET :</strong>{" "}
                            {kyb?.siret || u.siret || "N/A"} •{" "}
                            <strong>Forme :</strong>{" "}
                            {kyb?.legalForm || u.legalForm || "SAS"} •{" "}
                            <strong>TVA :</strong> {kyb?.vatNumber || "FR --"}
                          </div>
                          <div className="text-micro text-stone-500">
                            Contact : {u.name} ({u.email})
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setRejectModal({ user: u, dimension: "business" })
                          }
                          leftIcon={<X className="w-3.5 h-3.5" />}
                        >
                          Refuser
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={() => handleApproveBusiness(u)}
                          leftIcon={<Check className="w-3.5 h-3.5" />}
                        >
                          Certifier KBIS
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab: Bank Payouts */}
        {activeTab === "bank" && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between">
              <h2 className="text-xs font-bold text-stone-900">
                {t(
                  "admin.adminVerificationsPage.comptesBancairesDeSequestreEnregistres",
                )}
              </h2>
              <span className="text-micro text-stone-500">
                {pendingBankUsers.length} compte(s)
              </span>
            </div>

            <div className="divide-y divide-stone-100">
              {pendingBankUsers.map((u) => {
                const bank = u.bankPayoutVerification;
                return (
                  <div
                    key={u.id}
                    className="p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-800 flex items-center justify-center">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-stone-900">
                          {bank?.accountHolderName || u.name} •{" "}
                          {bank?.bankName || "Banque SEPA"}
                        </div>
                        <div className="text-micro font-mono text-stone-500">
                          IBAN : {bank?.iban || "FR76 ••••"} • BIC :{" "}
                          {bank?.bic || "BNPAFRPP"}
                        </div>
                      </div>
                    </div>
                    <span className="text-micro font-bold text-success bg-success-surface px-2 py-0.5 rounded-full border border-success-border">
                      {t("admin.adminVerificationsPage.verifiePourVirements")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab: Global Audit Trail */}
        {activeTab === "audit" && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between">
              <h2 className="text-xs font-bold text-stone-900">
                {t("admin.adminVerificationsPage.journalDAuditInalterableDes")}
              </h2>
              <span className="text-micro text-stone-500">
                {auditLogs.length} événement(s)
              </span>
            </div>

            <div className="divide-y divide-stone-100">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 flex items-start justify-between gap-4"
                >
                  <div>
                    <div className="text-xs font-bold text-stone-900">
                      {labelIdentifier(log.dimension)} :{" "}
                      {labelIdentifier(log.previousState)} ➔{" "}
                      {labelIdentifier(log.newState)}
                    </div>
                    <div className="text-micro text-stone-500">
                      Utilisateur ID: {log.userId} • Par: {log.performedBy}
                    </div>
                    {log.notes && (
                      <div className="text-micro text-stone-600 mt-0.5">
                        {log.notes}
                      </div>
                    )}
                    {log.reason && (
                      <div className="text-micro text-danger font-semibold mt-0.5">
                        Motif: {log.reason}
                      </div>
                    )}
                  </div>
                  <span className="text-micro text-stone-500 shrink-0">
                    {new Date(log.timestamp).toLocaleString("fr-FR")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </TabPanel>

      {/* Prompt modal for rejection */}
      <PromptModal
        isOpen={Boolean(rejectModal)}
        onClose={() => setRejectModal(null)}
        onSubmit={handleConfirmReject}
        title={t("admin.adminVerificationsPage.motifDuRefusDeVerification")}
        label={t("admin.adminVerificationsPage.indiquezLaRaisonPreciseDu")}
        hint="L'utilisateur recevra cette notification pour corriger ses justificatifs."
        placeholder={t("admin.adminVerificationsPage.exDocumentFlouDateDe")}
        confirmText="Confirmer le refus"
        multiline
      />
    </div>
  );
};
