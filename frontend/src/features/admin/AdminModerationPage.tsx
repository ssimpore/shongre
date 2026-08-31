import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  CheckCircle,
  Eye,
  Lock,
  Unlock,
  Trash2,
  Sparkles,
  Scale,
} from "lucide-react";
import { useToast } from "../../app/providers/ToastProvider";
import { storageService } from "../../services/storage.service";
import { listingRepository } from "../../repositories/listing.repository";
import { userRepository } from "../../repositories/user.repository";
import { services } from "../../api/client/service-registry";
import { ListingSafetyAnalysis } from "../../api/contracts/ai.contract";
import { Listing, UserProfile } from "../../types";
import { Button } from "../../design-system/primitives/Button";
import { Badge } from "../../design-system/primitives/Badge";
import { Modal } from "../../design-system/primitives/Modal";
import { ConfirmModal } from "../../design-system/primitives/ConfirmModal";
import { PromptModal } from "../../design-system/primitives/PromptModal";
import { Image } from "../../design-system/primitives/Image";
import { useTranslation } from "../../i18n/I18nProvider";
import { usePageMeta } from "../../hooks/usePageMeta";
import { getListingCategoryLabel } from "../../domains/taxonomy/taxonomy.display";
import { useAuth } from "../../app/providers/AuthProvider";
import { labelIdentifier } from "../../utilities/identifier-label";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import type {
  ModerationAppeal,
  OwnModerationCase,
} from "../../api/contracts/moderation.contract";
import { MODERATION_CONSTRAINTS } from "@shongre/contracts";

type AppealDecision = "upheld" | "overturned" | "rejected";

export const AdminModerationPage: React.FC = () => {
  const { t } = useTranslation();
  const { formatPrice } = useMarketLocation();
  usePageMeta({
    title: t("meta.adminModeration.title"),
    description: t("meta.adminModeration.description"),
    canonicalPath: "/admin/moderation",
    noIndex: true,
  });

  const toast = useToast();
  const { can } = useAuth();
  const canReviewReports = can("report.review");
  const canModerateListings = can("listing.moderate");
  const canSuspendUsers = can("user.suspend");
  const canReactivateUsers = can("user.reactivate");

  const [activeTab, setActiveTab] = useState<
    "reports" | "appeals" | "listings" | "users"
  >("reports");
  const [reports, setReports] = useState<any[]>([]);
  const [moderationCases, setModerationCases] = useState<OwnModerationCase[]>(
    [],
  );
  const [appeals, setAppeals] = useState<ModerationAppeal[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  // Modals state
  const [deleteListingId, setDeleteListingId] = useState<string | null>(null);
  const [suspendUserId, setSuspendUserId] = useState<string | null>(null);
  const [appealDecision, setAppealDecision] = useState<{
    appealId: string;
    decision: AppealDecision;
  } | null>(null);

  // AI Safety Analysis modal state
  const [selectedListingForAI, setSelectedListingForAI] =
    useState<Listing | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<ListingSafetyAnalysis | null>(
    null,
  );
  const [isAiLoading, setIsAiLoading] = useState(false);

  const loadData = () => {
    setReports(canReviewReports ? storageService.getUserReports() : []);
    setListings(canModerateListings ? storageService.getListings() : []);
    setUsers(
      canSuspendUsers || canReactivateUsers
        ? Object.values(storageService.getUsers())
        : [],
    );
  };

  const loadCasework = async () => {
    if (!canReviewReports) {
      setModerationCases([]);
      setAppeals([]);
      return;
    }
    try {
      const [nextCases, nextAppeals] = await Promise.all([
        services.moderation.listCases(),
        services.moderation.listAppeals(),
      ]);
      setModerationCases(nextCases);
      setAppeals(nextAppeals);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Les dossiers de recours sont indisponibles.",
      );
    }
  };

  useEffect(() => {
    loadData();
    void loadCasework();
  }, [
    canModerateListings,
    canReactivateUsers,
    canReviewReports,
    canSuspendUsers,
  ]);

  const handleAppealDecision = async (reason: string) => {
    if (!appealDecision) return;
    try {
      await services.moderation.decideAppeal(
        appealDecision.appealId,
        appealDecision.decision,
        reason,
      );
      await loadCasework();
      toast.success("Décision de recours enregistrée dans le journal d’audit.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "La décision n’a pas pu être enregistrée.",
      );
    } finally {
      setAppealDecision(null);
    }
  };

  const handleResolveReport = async (reportId: string) => {
    try {
      await services.admin.resolveReport(
        reportId,
        "dismiss",
        "Signalement classé sans suite après examen manuel.",
      );
      loadData();
      await loadCasework();
      toast.success("Signalement classé et marqué comme traité.");
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Impossible de traiter ce signalement.",
      );
    }
  };

  const handleToggleListingStatus = async (
    listingId: string,
    currentStatus: string,
  ) => {
    try {
      const nextAction = currentStatus === "active" ? "hide" : "approve";
      await listingRepository.moderateListing(
        listingId,
        nextAction,
        "Vérification modérateur Shongre",
      );
      loadData();
      toast.success(
        `Statut de l'annonce mis à jour (${nextAction === "hide" ? "masquée" : "rétablie"}).`,
      );
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la modération de l'annonce");
    }
  };

  const handleConfirmDeleteListing = async () => {
    if (!deleteListingId) return;
    try {
      await listingRepository.moderateListing(
        deleteListingId,
        "delete",
        "Violation des conditions de modération",
      );
      loadData();
      toast.success("Annonce supprimée définitivement du catalogue.");
      setDeleteListingId(null);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la suppression de l'annonce");
    }
  };

  const handleConfirmSuspendUser = async (reason: string) => {
    if (!suspendUserId) return;
    try {
      await userRepository.suspendUser(suspendUserId, reason);
      loadData();
      toast.success(
        "Compte utilisateur suspendu avec motif consigné au registre.",
      );
      setSuspendUserId(null);
    } catch (err: any) {
      toast.error(
        err.message || "Erreur lors de la suspension de l'utilisateur",
      );
    }
  };

  const handleReactivateUser = async (userId: string) => {
    try {
      await userRepository.reactivateUser(userId);
      loadData();
      toast.success("Compte utilisateur réactivé avec succès.");
    } catch (err: any) {
      toast.error(
        err.message || "Erreur lors de la réactivation de l'utilisateur",
      );
    }
  };

  const handleRunAISafetyAudit = async (listing: Listing) => {
    setSelectedListingForAI(listing);
    setIsAiLoading(true);
    setAiAnalysis(null);
    try {
      const result = await services.ai.analyzeListingSafety({
        title: listing.title,
        description: listing.description,
        price: listing.price,
        sellerName: listing.sellerName,
      });
      setAiAnalysis(result);
    } catch (err: any) {
      toast.error("Échec de l'analyse IA");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-bg-surface rounded-2xl border border-border-base p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            {t("admin.adminModerationPage.moderationSecurite")}
          </span>
          <span className="text-stone-300">•</span>
          <span className="text-xs text-stone-500 font-medium">
            {t("admin.adminModerationPage.controleDesContenusEtProfils")}
          </span>
        </div>
        <h1 className="text-2xl font-black text-text-main tracking-tight">
          {t("admin.adminModerationPage.fileDeModerationSignalements")}
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          {t("admin.adminModerationPage.surveillanceEnTempsReelDes")}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-base gap-4 text-xs font-bold overflow-x-auto no-scrollbar">
        {canReviewReports && (
          <button
            type="button"
            onClick={() => setActiveTab("reports")}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === "reports"
                ? "border-primary text-primary"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <ShieldAlert className="w-icon-md h-icon-md" />
            <span>
              {t("admin.adminModerationPage.signalementsRecus")}
              {reports.filter((r) => r.status !== "resolved").length})
            </span>
          </button>
        )}

        {canModerateListings && (
          <button
            type="button"
            onClick={() => setActiveTab("listings")}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === "listings"
                ? "border-primary text-primary"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <Eye className="w-icon-md h-icon-md" />
            <span>
              {t("admin.adminModerationPage.controleAuditIaAnnonces")}
              {listings.length})
            </span>
          </button>
        )}

        {canReviewReports && (
          <button
            type="button"
            onClick={() => setActiveTab("appeals")}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === "appeals"
                ? "border-primary text-primary"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <Scale className="w-icon-md h-icon-md" />
            <span>
              Dossiers & recours (
              {
                appeals.filter((appeal) =>
                  ["submitted", "under_review"].includes(appeal.status),
                ).length
              }
              )
            </span>
          </button>
        )}

        {(canSuspendUsers || canReactivateUsers) && (
          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={`pb-3 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === "users"
                ? "border-primary text-primary"
                : "border-transparent text-stone-500 hover:text-stone-800"
            }`}
          >
            <Lock className="w-icon-md h-icon-md" />
            <span>
              Comptes Suspendus ({users.filter((u) => u.isSuspended).length})
            </span>
          </button>
        )}
      </div>

      {/* Tab: Reports */}
      {activeTab === "reports" && canReviewReports && (
        <div className="bg-bg-surface rounded-2xl border border-border-base shadow-xs overflow-hidden">
          {reports.filter((r) => r.status !== "resolved").length === 0 ? (
            <div className="p-12 text-center text-stone-500">
              <CheckCircle className="w-10 h-10 text-success mx-auto mb-2" />
              <div className="text-sm font-bold text-stone-800">
                {t("admin.adminModerationPage.aucunSignalementEnAttente")}
              </div>
              <div className="text-xs text-stone-500 mt-1">
                {t(
                  "admin.adminModerationPage.laFileDeSignalementsCommunautaires",
                )}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {reports
                .filter((r) => r.status !== "resolved")
                .map((rep) => (
                  <div
                    key={rep.id}
                    className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="urgent">
                          {rep.reason || "Signalement"}
                        </Badge>
                        <span className="text-xs font-semibold text-text-main">
                          Cible : {rep.targetUserName || rep.targetUserId}
                        </span>
                        <span className="text-micro text-stone-500">
                          {new Date(rep.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {rep.comment && (
                        <p className="text-xs text-text-secondary bg-bg-base p-2.5 rounded-control border border-border-base">
                          "{rep.comment}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleResolveReport(rep.id)}
                        className="text-xs text-stone-700"
                      >
                        {t("admin.adminModerationPage.classerSansSuite")}
                      </Button>
                      {canSuspendUsers && rep.targetUserId && (
                        <Button
                          size="sm"
                          onClick={() => setSuspendUserId(rep.targetUserId)}
                          className="text-xs bg-danger hover:bg-danger text-text-inverse"
                        >
                          {t("admin.adminModerationPage.suspendreLeProfil")}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "appeals" && canReviewReports && (
        <div className="grid gap-4 xl:grid-cols-trending-columns">
          <section
            aria-labelledby="moderation-cases-title"
            className="overflow-hidden rounded-2xl border border-border-base bg-bg-surface shadow-xs"
          >
            <div className="border-b border-border-subtle p-4">
              <h2
                id="moderation-cases-title"
                className="text-sm font-black text-text-main"
              >
                {t("admin.adminModerationPage.dossiersDeModeration")}
              </h2>
              <p className="mt-1 text-xs text-stone-500">
                {t(
                  "admin.adminModerationPage.historiqueCanoniqueDesSignalementsEtDecisionsAppliquees",
                )}
              </p>
            </div>
            <div className="divide-y divide-border-subtle">
              {moderationCases.length === 0 ? (
                <p className="p-5 text-xs text-stone-500">
                  {t("admin.adminModerationPage.aucunDossierEnregistre")}
                </p>
              ) : (
                moderationCases.map((moderationCase) => (
                  <article key={moderationCase.id} className="space-y-2 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-text-main">
                        {moderationCase.id}
                      </span>
                      <Badge variant="neutral" size="sm">
                        {labelIdentifier(moderationCase.status)}
                      </Badge>
                    </div>
                    <p className="text-xs text-text-secondary">
                      {labelIdentifier(moderationCase.targetType)} ·{" "}
                      {labelIdentifier(moderationCase.category)}
                    </p>
                    {moderationCase.resolutionReason && (
                      <p className="rounded-control bg-bg-base p-3 text-xs text-stone-700">
                        {moderationCase.resolutionReason}
                      </p>
                    )}
                  </article>
                ))
              )}
            </div>
          </section>

          <section
            aria-labelledby="moderation-appeals-title"
            className="overflow-hidden rounded-2xl border border-border-base bg-bg-surface shadow-xs"
          >
            <div className="border-b border-border-subtle p-4">
              <h2
                id="moderation-appeals-title"
                className="text-sm font-black text-text-main"
              >
                {t("admin.adminModerationPage.recoursAExaminer")}
              </h2>
              <p className="mt-1 text-xs text-stone-500">
                {t(
                  "admin.adminModerationPage.leBackendInterditQuUnModerateurReviseSaPropreDecision",
                )}
              </p>
            </div>
            <div className="divide-y divide-border-subtle">
              {appeals.length === 0 ? (
                <p className="p-5 text-xs text-stone-500">
                  {t("admin.adminModerationPage.aucunRecoursEnregistre")}
                </p>
              ) : (
                appeals.map((appeal) => {
                  const pending = ["submitted", "under_review"].includes(
                    appeal.status,
                  );
                  return (
                    <article key={appeal.id} className="space-y-3 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-text-main">
                          {appeal.id}
                        </span>
                        <Badge
                          variant={pending ? "warning" : "neutral"}
                          size="sm"
                        >
                          {labelIdentifier(appeal.status)}
                        </Badge>
                      </div>
                      <p className="text-xs text-text-secondary">
                        {appeal.reason}
                      </p>
                      {appeal.decisionReason && (
                        <p className="rounded-control bg-bg-base p-3 text-xs text-stone-700">
                          {t("admin.adminModerationPage.decision")}{" "}
                          {appeal.decisionReason}
                        </p>
                      )}
                      {pending && (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setAppealDecision({
                                appealId: appeal.id,
                                decision: "upheld",
                              })
                            }
                          >
                            Confirmer
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setAppealDecision({
                                appealId: appeal.id,
                                decision: "overturned",
                              })
                            }
                          >
                            {t("admin.adminModerationPage.annulerLaDecision")}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setAppealDecision({
                                appealId: appeal.id,
                                decision: "rejected",
                              })
                            }
                          >
                            Rejeter
                          </Button>
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </div>
      )}

      {/* Tab: Listings with AI Audit */}
      {activeTab === "listings" && canModerateListings && (
        <div className="bg-bg-surface rounded-2xl border border-border-base shadow-xs overflow-hidden">
          <div className="p-3.5 border-b border-border-subtle bg-bg-base text-xs font-semibold text-text-secondary flex justify-between items-center">
            <span>
              {t("admin.adminModerationPage.catalogueDAnnoncesShongre")}
              {listings.length} {t("admin.adminModerationPage.auTotal")}
            </span>
            <span className="text-micro text-stone-500">
              {t("admin.adminModerationPage.cliquezSurAuditIaPour")}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-700 font-bold border-b border-border-base">
                <tr>
                  <th scope="col" className="p-3.5">
                    {t("admin.adminModerationPage.annonce")}
                  </th>
                  <th scope="col" className="p-3.5">
                    {t("admin.adminModerationPage.vendeur")}
                  </th>
                  <th scope="col" className="p-3.5">
                    Prix
                  </th>
                  <th scope="col" className="p-3.5">
                    Statut
                  </th>
                  <th scope="col" className="p-3.5 text-right">
                    {t("admin.adminModerationPage.actionsDeModeration")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {listings.slice(0, 15).map((list) => (
                  <tr
                    key={list.id}
                    className="hover:bg-bg-base transition-colors"
                  >
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <Image
                          src={list.coverImageUrl || list.photos?.[0]?.url}
                          alt={list.title}
                          sizes="40px"
                          className="w-10 h-10 rounded-control object-cover border border-border-base shrink-0"
                        />
                        <div>
                          <div className="font-bold text-text-main line-clamp-1">
                            {list.title}
                          </div>
                          <div className="text-xs text-stone-500">
                            {getListingCategoryLabel(list)} • {list.city}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 font-medium text-stone-800">
                      {list.sellerName}
                    </td>
                    <td className="p-3.5 font-bold text-text-main">
                      {formatPrice(list.price, {
                        isFreeDonation: list.isFreeDonation,
                      })}
                    </td>
                    <td className="p-3.5">
                      <Badge
                        variant={
                          list.status === "active" ? "success" : "warning"
                        }
                      >
                        {labelIdentifier(list.status)}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRunAISafetyAudit(list)}
                          className="text-xs flex items-center gap-1 text-primary border-primary/30 hover:bg-primary-light"
                        >
                          <Sparkles className="w-icon-xs h-icon-xs text-primary" />
                          <span>Audit IA</span>
                        </Button>
                        <Button
                          aria-label={t(
                            "admin.adminModerationPage.supprimerCetteAnnonce",
                          )}
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleToggleListingStatus(list.id, list.status)
                          }
                          className="text-xs"
                        >
                          {list.status === "active" ? "Masquer" : "Rétablir"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteListingId(list.id)}
                          className="text-danger hover:bg-danger-surface text-xs"
                        >
                          <Trash2 className="w-icon-sm h-icon-sm" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Suspended Users */}
      {activeTab === "users" && (canSuspendUsers || canReactivateUsers) && (
        <div className="bg-bg-surface rounded-2xl border border-border-base shadow-xs overflow-hidden">
          <div className="divide-y divide-border-subtle">
            {users
              .filter((u) => u.isSuspended)
              .map((u) => (
                <div
                  key={u.id}
                  className="p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <Image
                      src={
                        u.avatarUrl ||
                        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120"
                      }
                      alt={u.name}
                      sizes="40px"
                      className="w-10 h-10 rounded-pill object-cover border border-danger-border"
                    />
                    <div>
                      <div className="text-xs font-bold text-text-main flex items-center gap-2">
                        <span>{u.name}</span>
                        <Badge variant="urgent">SUSPENDU</Badge>
                      </div>
                      <div className="text-xs text-stone-500 mt-0.5">
                        {t("admin.adminModerationPage.motifLegal")}{" "}
                        {u.suspendedReason ||
                          "Mesure conservatoire de sécurité"}
                      </div>
                    </div>
                  </div>

                  {canReactivateUsers && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReactivateUser(u.id)}
                      className="text-xs text-success border-success-border hover:bg-success-surface"
                    >
                      <Unlock className="w-icon-sm h-icon-sm mr-1" />
                      {t("admin.adminModerationPage.leverLaSuspension")}
                    </Button>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* AI Safety Analysis Result Modal */}
      {selectedListingForAI && (
        <Modal
          isOpen={Boolean(selectedListingForAI)}
          onClose={() => setSelectedListingForAI(null)}
          title={t("admin.adminModerationPage.auditDeSecuriteIaGemini")}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-bg-base rounded-control border border-border-base">
              <div className="font-bold text-xs text-text-main">
                {selectedListingForAI.title}
              </div>
              <div className="text-xs text-stone-500 mt-0.5">
                {formatPrice(selectedListingForAI.price, {
                  isFreeDonation: selectedListingForAI.isFreeDonation,
                })}{" "}
                {t("admin.adminModerationPage.vendeur2")}{" "}
                {selectedListingForAI.sellerName}
              </div>
            </div>

            {isAiLoading ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-8 h-8 rounded-pill border-2 border-primary border-t-transparent animate-spin mx-auto" />
                <p className="text-xs font-medium text-text-secondary">
                  {t(
                    "admin.adminModerationPage.analyseDeConformiteEtDetection",
                  )}
                </p>
              </div>
            ) : aiAnalysis ? (
              <div className="space-y-4">
                <div
                  className={`p-4 rounded-control border flex items-center justify-between ${
                    aiAnalysis.riskScore > 50
                      ? "bg-danger-surface border-danger-border text-danger"
                      : aiAnalysis.riskScore > 20
                        ? "bg-warning-surface border-warning-border text-warning"
                        : "bg-success-surface border-success-border text-success"
                  }`}
                >
                  <div>
                    <div className="text-xs uppercase font-bold tracking-wider">
                      {t("admin.adminModerationPage.scoreDeRisqueDetecte")}
                    </div>
                    <div className="text-2xl font-black">
                      {aiAnalysis.riskScore}/100
                    </div>
                  </div>
                  <Badge
                    variant={
                      aiAnalysis.riskScore > 50
                        ? "urgent"
                        : aiAnalysis.riskScore > 20
                          ? "warning"
                          : "verified"
                    }
                  >
                    {labelIdentifier(aiAnalysis.verdict)}
                  </Badge>
                </div>

                <div className="text-xs text-stone-700 space-y-1">
                  <span className="font-bold block text-text-main">
                    {t("admin.adminModerationPage.syntheseDeLAgentIa")}
                  </span>
                  <p className="leading-relaxed bg-stone-50 p-3 rounded-control border border-border-subtle">
                    {aiAnalysis.summary}
                  </p>
                </div>

                {aiAnalysis.flaggedKeywords &&
                  aiAnalysis.flaggedKeywords.length > 0 && (
                    <div>
                      <span className="text-xs font-bold text-text-main block mb-1.5">
                        {t("admin.adminModerationPage.elementsSignales")}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {aiAnalysis.flaggedKeywords.map((kw, i) => (
                          <span
                            key={i}
                            className="text-micro font-semibold bg-danger-surface text-danger px-2 py-0.5 rounded"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedListingForAI(null)}
                  >
                    Fermer
                  </Button>
                  {aiAnalysis.riskScore > 30 && (
                    <Button
                      variant="primary"
                      size="sm"
                      className="bg-danger hover:bg-danger text-text-inverse"
                      onClick={() => {
                        handleToggleListingStatus(
                          selectedListingForAI.id,
                          selectedListingForAI.status,
                        );
                        setSelectedListingForAI(null);
                      }}
                    >
                      {t("admin.adminModerationPage.masquerLAnnonce")}
                    </Button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </Modal>
      )}

      {/* Confirmation Modal for Delete Listing */}
      <ConfirmModal
        isOpen={Boolean(deleteListingId)}
        onClose={() => setDeleteListingId(null)}
        onConfirm={handleConfirmDeleteListing}
        title={t("admin.adminModerationPage.supprimerDefinitivementLAnnonce")}
        message="Cette action retirera irréversiblement l'annonce du catalogue public et notifiera le vendeur."
        confirmText="Supprimer l'annonce"
        variant="danger"
      />

      {/* Prompt Modal for User Suspension */}
      <PromptModal
        isOpen={Boolean(suspendUserId)}
        onClose={() => setSuspendUserId(null)}
        onSubmit={handleConfirmSuspendUser}
        title={t("admin.adminModerationPage.suspendreLeCompteUtilisateur")}
        label={t("admin.adminModerationPage.motifLegalEtContractuelDe")}
        placeholder={t(
          "admin.adminModerationPage.exSignalementsMultiplesPourNon",
        )}
        confirmText="Confirmer la suspension"
        required
      />
      <PromptModal
        isOpen={Boolean(appealDecision)}
        onClose={() => setAppealDecision(null)}
        onSubmit={(reason) => void handleAppealDecision(reason)}
        title={t("admin.adminModerationPage.deciderLeRecours")}
        label={t("admin.adminModerationPage.motifIndependantEtVerifiable")}
        placeholder={t(
          "admin.adminModerationPage.expliquezLesElementsExaminesEtLaJustificationDeLaDecision",
        )}
        confirmText="Enregistrer la décision"
        multiline
        minLength={MODERATION_CONSTRAINTS.appealReviewReasonMinLength}
        required
      />
    </div>
  );
};
