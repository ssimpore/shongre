import { CheckCircle, LoaderCircle, Scale, ShieldAlert } from "lucide-react";
import { MODERATION_CONSTRAINTS } from "@shongre/contracts";
import React, { useCallback, useEffect, useState } from "react";
import { services } from "../../api/client/service-registry";
import type { AdminReportSummary } from "../../api/contracts/admin.contract";
import type {
  ModerationAppeal,
  OwnModerationCase,
} from "../../api/contracts/moderation.contract";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { Badge } from "../../design-system/primitives/Badge";
import { Button } from "../../design-system/primitives/Button";
import { Modal } from "../../design-system/primitives/Modal";
import { routes } from "../../configuration/routes";
import { PromptModal } from "../../design-system/primitives/PromptModal";
import { StatePanel } from "../../design-system/primitives/StatePanel";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useTranslation } from "../../i18n/I18nProvider";
import { labelIdentifier } from "../../utilities/identifier-label";
import { adminCatalogueFr } from "../../i18n/admin.catalogue.fr";

type AppealDecision = "upheld" | "overturned" | "rejected";

const REPORT_TARGET_LABELS: Record<AdminReportSummary["targetType"], string> = {
  listing: "Annonce",
  user: "Compte",
  delivery_request: "Demande de livraison",
  review: "Avis",
};

export const AdminModerationPage: React.FC = () => {
  const { t } = useTranslation(adminCatalogueFr);
  const { can } = useAuth();
  const toast = useToast();
  const canReviewReports = can("report.review");
  const canReviewCases = can("moderation.review");
  const canTakeAction = can("moderation.action");
  usePageMeta({
    title: t("meta.adminModeration.title"),
    description: t("meta.adminModeration.description"),
    canonicalPath: "/admin/moderation",
    noIndex: true,
  });

  const [activeTab, setActiveTab] = useState<"reports" | "appeals">("reports");
  const [reports, setReports] = useState<AdminReportSummary[]>([]);
  const [cases, setCases] = useState<OwnModerationCase[]>([]);
  const [appeals, setAppeals] = useState<ModerationAppeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportDecision, setReportDecision] = useState<{
    reportId: string;
    targetLabel: string;
    action: "dismiss" | "remove_listing" | "remove_review";
  } | null>(null);
  const [inspection, setInspection] = useState<AdminReportSummary | null>(null);
  const [inspectionItem, setInspectionItem] = useState<{
    id: string;
    title: string;
    description: string;
  } | null>(null);
  const [inspectionLoading, setInspectionLoading] = useState(false);
  const [inspectionUnavailable, setInspectionUnavailable] = useState(false);
  useEffect(() => {
    let active = true;
    setInspectionItem(null);
    setInspectionUnavailable(false);
    if (!inspection || inspection.targetType !== "listing") {
      setInspectionLoading(false);
      return;
    }
    setInspectionLoading(true);
    void services.listings
      .getListingById(inspection.targetId)
      .then((item) => {
        if (!active) return;
        setInspectionItem(
          item
            ? { id: item.id, title: item.title, description: item.description }
            : null,
        );
        setInspectionUnavailable(!item);
      })
      .catch(() => {
        if (active) setInspectionUnavailable(true);
      })
      .finally(() => {
        if (active) setInspectionLoading(false);
      });
    return () => {
      active = false;
    };
  }, [inspection]);
  const [appealDecision, setAppealDecision] = useState<{
    appealId: string;
    decision: AppealDecision;
  } | null>(null);

  const load = useCallback(async () => {
    if (!canReviewReports) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [nextReports, nextCases, nextAppeals] = await Promise.all([
        services.admin.getPendingReports(),
        canReviewCases ? services.moderation.listCases() : [],
        canReviewCases ? services.moderation.listAppeals() : [],
      ]);
      setReports(nextReports);
      setCases(nextCases);
      setAppeals(nextAppeals);
      setError(null);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "La file de modération est indisponible.",
      );
    } finally {
      setLoading(false);
    }
  }, [canReviewCases, canReviewReports]);

  useEffect(() => {
    void load();
  }, [load]);

  const resolveReport = async (reason: string) => {
    if (!reportDecision) return;
    try {
      await services.admin.resolveReport(
        reportDecision.reportId,
        reportDecision.action,
        reason,
      );
      await load();
      toast.success("Décision de modération enregistrée.");
    } catch (caught) {
      toast.error(
        caught instanceof Error
          ? caught.message
          : "La décision n’a pas pu être enregistrée.",
      );
    } finally {
      setReportDecision(null);
    }
  };

  const decideAppeal = async (reason: string) => {
    if (!appealDecision) return;
    try {
      await services.moderation.decideAppeal(
        appealDecision.appealId,
        appealDecision.decision,
        reason,
      );
      await load();
      toast.success("Décision de recours enregistrée.");
    } catch (caught) {
      toast.error(
        caught instanceof Error
          ? caught.message
          : "La décision n’a pas pu être enregistrée.",
      );
    } finally {
      setAppealDecision(null);
    }
  };

  if (!canReviewReports) {
    return (
      <StatePanel
        variant="restricted"
        title="Accès restreint"
        description="La permission de révision des signalements est requise."
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="rounded-card border border-border-base bg-bg-surface p-6 shadow-xs">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">
          Sécurité des contenus et profils
        </p>
        <h1 className="mt-1 text-2xl font-bold text-text-main">
          {t("admin.adminModerationPage.fileDeModerationSignalements")}
        </h1>
        <p className="mt-1 text-xs text-text-secondary">
          Les décisions affichées et exécutées ici proviennent du registre
          serveur.
        </p>
      </header>

      <div className="flex gap-4 overflow-x-auto border-b border-border-base text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab("reports")}
          className={`flex items-center gap-2 border-b-2 pb-3 ${
            activeTab === "reports"
              ? "border-primary text-primary"
              : "border-transparent text-text-tertiary"
          }`}
        >
          <ShieldAlert className="h-icon-md w-icon-md" />
          Signalements ({reports.length})
        </button>
        {canReviewCases && (
          <button
            type="button"
            onClick={() => setActiveTab("appeals")}
            className={`flex items-center gap-2 border-b-2 pb-3 ${
              activeTab === "appeals"
                ? "border-primary text-primary"
                : "border-transparent text-text-tertiary"
            }`}
          >
            <Scale className="h-icon-md w-icon-md" />
            Dossiers et recours ({appeals.length})
          </button>
        )}
      </div>

      {loading ? (
        <div
          className="flex min-h-48 items-center justify-center"
          role="status"
        >
          <LoaderCircle className="h-icon-lg w-icon-lg animate-spin text-primary" />
          <span className="ml-2 text-xs text-text-secondary">Chargement…</span>
        </div>
      ) : error ? (
        <StatePanel
          variant="error"
          title="File indisponible"
          description={error}
          action={<Button onClick={() => void load()}>Réessayer</Button>}
        />
      ) : activeTab === "reports" ? (
        <section className="overflow-hidden rounded-card border border-border-base bg-bg-surface shadow-xs">
          {reports.length === 0 ? (
            <div className="p-12 text-center text-text-tertiary">
              <CheckCircle className="mx-auto mb-2 h-10 w-10 text-success" />
              <p className="text-sm font-bold text-text-strong">
                {t("admin.adminModerationPage.aucunSignalementEnAttente")}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {reports.map((report) => (
                <article
                  key={report.id}
                  className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="urgent">{report.reason}</Badge>
                      <time
                        className="text-micro text-text-tertiary"
                        dateTime={report.createdAt}
                      >
                        {new Intl.DateTimeFormat(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(report.createdAt))}
                      </time>
                    </div>
                    <p className="text-xs text-text-secondary">
                      {REPORT_TARGET_LABELS[report.targetType]}{" "}
                      {report.targetId} · signalé par {report.reporterName}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setInspection(report)}
                    >
                      {t("admin.moderation.inspect")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setReportDecision({
                          reportId: report.id,
                          targetLabel: `${REPORT_TARGET_LABELS[report.targetType]} ${report.targetId}`,
                          action: "dismiss",
                        })
                      }
                    >
                      Classer sans suite
                    </Button>
                    {canTakeAction && report.targetType === "listing" && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() =>
                          setReportDecision({
                            reportId: report.id,
                            targetLabel: `${REPORT_TARGET_LABELS[report.targetType]} ${report.targetId}`,
                            action: "remove_listing",
                          })
                        }
                      >
                        Retirer l’annonce
                      </Button>
                    )}
                    {canTakeAction && report.targetType === "review" && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() =>
                          setReportDecision({
                            reportId: report.id,
                            targetLabel: `${REPORT_TARGET_LABELS[report.targetType]} ${report.targetId}`,
                            action: "remove_review",
                          })
                        }
                      >
                        Retirer l’avis
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <section className="overflow-hidden rounded-card border border-border-base bg-bg-surface shadow-xs">
            <h2 className="border-b border-border-subtle p-4 text-sm font-bold text-text-main">
              Dossiers de modération
            </h2>
            <div className="divide-y divide-border-subtle">
              {cases.length === 0 ? (
                <p className="p-5 text-xs text-text-tertiary">Aucun dossier.</p>
              ) : (
                cases.map((moderationCase) => (
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
                    {moderationCase.resolutionReason ? (
                      <p className="rounded-control bg-bg-base p-3 text-xs text-text-emphasis">
                        {moderationCase.resolutionReason}
                      </p>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-card border border-border-base bg-bg-surface shadow-xs">
            <h2 className="border-b border-border-subtle p-4 text-sm font-bold text-text-main">
              Recours à examiner
            </h2>
            <div className="divide-y divide-border-subtle">
              {appeals.length === 0 ? (
                <p className="p-5 text-xs text-text-tertiary">Aucun recours.</p>
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
                      {pending && canTakeAction ? (
                        <div className="flex flex-wrap gap-2">
                          {(["upheld", "overturned", "rejected"] as const).map(
                            (decision) => (
                              <Button
                                key={decision}
                                size="sm"
                                variant={
                                  decision === "rejected" ? "ghost" : "outline"
                                }
                                onClick={() =>
                                  setAppealDecision({
                                    appealId: appeal.id,
                                    decision,
                                  })
                                }
                              >
                                {labelIdentifier(decision)}
                              </Button>
                            ),
                          )}
                        </div>
                      ) : null}
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </div>
      )}

      <Modal
        isOpen={inspection !== null}
        onClose={() => setInspection(null)}
        title={t("admin.moderation.inspect")}
      >
        {inspection && (
          <div className="space-y-4">
            <p className="text-sm font-semibold">
              {REPORT_TARGET_LABELS[inspection.targetType]}{" "}
              {inspection.targetId}
            </p>
            <p className="text-sm text-text-secondary">
              {t("admin.moderation.inspectionReason", {
                reason: inspection.reason,
                name: inspection.reporterName,
              })}
            </p>
            {inspectionLoading ? (
              <p role="status">{t("admin.moderation.loadingListing")}</p>
            ) : inspectionItem ? (
              <>
                <h3 className="font-bold text-text-main">
                  {inspectionItem.title}
                </h3>
                <p className="whitespace-pre-wrap text-sm text-text-secondary">
                  {inspectionItem.description}
                </p>
                <Button
                  to={routes.listing.detail(inspectionItem.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outline"
                >
                  {t("admin.moderation.fullListing")}
                </Button>
              </>
            ) : (
              <p role="status" className="text-sm text-text-secondary">
                {inspectionUnavailable
                  ? t("admin.moderation.listingUnavailable")
                  : t("admin.moderation.contentUnavailable")}
              </p>
            )}
            <Button onClick={() => setInspection(null)}>
              {t("admin.moderation.returnToQueue")}
            </Button>
          </div>
        )}
      </Modal>
      <PromptModal
        isOpen={reportDecision !== null}
        onClose={() => setReportDecision(null)}
        onSubmit={(reason) => void resolveReport(reason)}
        title={t(
          reportDecision?.action === "dismiss"
            ? "admin.moderation.dismissTarget"
            : "admin.moderation.removeTarget",
          { target: reportDecision?.targetLabel ?? "" },
        )}
        label="Motif d’audit"
        multiline
        minLength={MODERATION_CONSTRAINTS.appealReviewReasonMinLength}
      />
      <PromptModal
        isOpen={appealDecision !== null}
        onClose={() => setAppealDecision(null)}
        onSubmit={(reason) => void decideAppeal(reason)}
        title="Décider le recours"
        label="Motif de la décision"
        multiline
        minLength={MODERATION_CONSTRAINTS.appealReviewReasonMinLength}
      />
    </div>
  );
};
