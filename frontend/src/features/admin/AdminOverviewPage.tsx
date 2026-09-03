import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldAlert,
  Users,
  CheckCircle2,
  ArrowRight,
  Clock,
  TrendingUp,
  FileSpreadsheet,
  ListTodo,
} from "lucide-react";
import { useAuth } from "../../app/providers/AuthProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { formatLogTimestamp } from "../../utilities/formatters";
import {
  ROLE_DEFINITIONS,
  STAFF_ROLE_PRESENTATION,
} from "../../security/roles.config";
import { Button } from "../../design-system/primitives/Button";
import { Image } from "../../design-system/primitives/Image";
import { useTranslation } from "../../i18n/I18nProvider";
import { usePageMeta } from "../../hooks/usePageMeta";
import { services } from "../../api/client/service-registry";
import type {
  AdminAuditLogEntry,
  AdminStatsSummary,
} from "../../api/contracts/admin.contract";
import { auditActionLabel, type UserProfile } from "../../types";
import { useAuthorization } from "../../security/useAuthorization";
import { StatePanel } from "../../design-system/primitives/StatePanel";

type DashboardLoadState = "loading" | "success" | "error";

export const AdminOverviewPage: React.FC = () => {
  const { activeMarket } = useMarketLocation();
  const { t } = useTranslation();
  usePageMeta({
    title: t("meta.adminOverview.title"),
    description: t("meta.adminOverview.description"),
    canonicalPath: "/admin",
    noIndex: true,
  });

  const { currentUser, platformRole, can } = useAuth();
  const { canAccessRoute } = useAuthorization();
  const [stats, setStats] = useState<AdminStatsSummary | null>(null);
  const [pendingVerifications, setPendingVerifications] = useState<
    UserProfile[]
  >([]);
  const [reportsCount, setReportsCount] = useState<number | null>(null);
  const [recentAudits, setRecentAudits] = useState<AdminAuditLogEntry[]>([]);
  const [loadState, setLoadState] = useState<DashboardLoadState>("loading");
  const [reloadToken, setReloadToken] = useState(0);

  const canReadPlatformStats = can("admin.configuration.manage");
  const canReviewVerification = can("user.verify") || can("compliance.review");
  const canReviewReports = can("report.review");
  const canReadAudit = can("audit.read");
  const visibleMetricCount =
    Number(canReadPlatformStats) * 2 +
    Number(canReviewVerification) +
    Number(canReviewReports);
  const metricGridColumns =
    visibleMetricCount >= 4
      ? "lg:grid-cols-4"
      : visibleMetricCount === 3
        ? "lg:grid-cols-3"
        : "lg:grid-cols-2";
  const visibleOperationalPanelCount =
    Number(canReviewVerification) + Number(canReadAudit);

  useEffect(() => {
    let cancelled = false;
    const loadAuthorizedData = async () => {
      setLoadState("loading");
      try {
        const [platformStats, users, reports, logs] = await Promise.all([
          canReadPlatformStats ? services.admin.getPlatformStats() : null,
          canReviewVerification ? services.admin.getAllUsers() : [],
          canReviewReports ? services.admin.getPendingReports() : [],
          canReadAudit ? services.admin.getAuditLogs() : [],
        ]);
        if (cancelled) return;
        setStats(platformStats);
        setPendingVerifications(
          users.filter(
            (user) =>
              user.accountType === "professional" &&
              user.professionalVerification?.status === "pending",
          ),
        );
        setReportsCount(canReviewReports ? reports.length : null);
        setRecentAudits(logs.slice(0, 6));
        setLoadState("success");
      } catch {
        if (!cancelled) setLoadState("error");
      }
    };
    void loadAuthorizedData();
    return () => {
      cancelled = true;
    };
  }, [
    canReadAudit,
    canReadPlatformStats,
    canReviewReports,
    canReviewVerification,
    reloadToken,
  ]);

  const roleMeta = ROLE_DEFINITIONS[platformRole] || ROLE_DEFINITIONS.guest;
  const staffRoleMeta = currentUser?.staffRole
    ? STAFF_ROLE_PRESENTATION[currentUser.staffRole]
    : roleMeta;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-card border border-border-base bg-bg-surface p-6 shadow-sm sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Console d'Administration
            </span>
            <span className="text-stone-300">•</span>
            <span className="text-xs text-stone-500 font-medium">
              Shongre Security Core
            </span>
          </div>
          <h1 className="text-2xl font-bold text-text-main tracking-tight">
            Bonjour, {currentUser?.name || "Collaborateur"}
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            {t("admin.adminOverviewPage.vousOperezAvecLeRole")}{" "}
            <strong className="text-text-main">{staffRoleMeta.title}</strong>{" "}
            {t("admin.adminOverviewPage.surLePerimetreTerritorial")}{" "}
            <strong className="text-text-main">
              {currentUser?.marketScope?.countries.join(", ") ||
                activeMarket.code}
            </strong>
            .
          </p>
        </div>

        {/* Wraps rather than shrinks: both labels are long enough to push the
            document past a 320px viewport when forced onto one line. */}
        <div className="flex flex-wrap items-center gap-2">
          {canAccessRoute("adminRoles") && (
            <Button to="/admin/roles" variant="outline" size="sm">
              {t("admin.adminOverviewPage.verifierMesPermissions")}
            </Button>
          )}
          {canReviewReports && (
            <Button to="/admin/moderation" size="sm">
              {loadState === "success"
                ? t("admin.adminOverviewPage.traiterSignalementsCount", {
                    count: reportsCount ?? 0,
                  })
                : t("admin.adminOverviewPage.reviewReports")}
            </Button>
          )}
        </div>
      </div>

      {loadState === "error" && (
        <StatePanel
          variant="error"
          title="Impossible de charger la console"
          description="Les données opérationnelles ne sont pas disponibles pour le moment. Vos autorisations et aucune donnée n’ont été modifiées."
          action={
            <Button onClick={() => setReloadToken((value) => value + 1)}>
              Réessayer
            </Button>
          }
        />
      )}

      {loadState !== "error" && (canReviewVerification || canReviewReports) && (
        <section
          aria-labelledby="admin-action-queue"
          className="rounded-card border border-primary-border bg-primary-light p-5 shadow-sm"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2
                id="admin-action-queue"
                className="flex items-center gap-2 text-base font-bold text-text-main"
              >
                <ListTodo className="h-icon-md w-icon-md text-primary" />
                {t("admin.adminOverviewPage.actionQueueTitle")}
              </h2>
              <p className="mt-1 text-xs text-text-secondary">
                {t("admin.adminOverviewPage.actionQueueDescription")}
              </p>
            </div>
            <span className="rounded-pill border border-primary-border bg-bg-surface px-3 py-1 text-xs font-bold text-primary shadow-2xs">
              {loadState === "success"
                ? pendingVerifications.length + (reportsCount ?? 0)
                : "…"}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {canReviewReports && (
              <Link
                to="/admin/moderation"
                className="surface-interactive rounded-control border border-border-base bg-bg-surface p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-text-main">
                    {t("admin.adminOverviewPage.reviewReports")}
                  </span>
                  <ArrowRight className="h-icon-sm w-icon-sm text-primary" />
                </div>
                <p className="mt-1 text-xs text-text-secondary">
                  {loadState === "success" ? (reportsCount ?? 0) : "…"}{" "}
                  {t("admin.adminOverviewPage.openItems")}
                </p>
              </Link>
            )}
            {canReviewVerification && (
              <Link
                to="/admin/utilisateurs"
                className="surface-interactive rounded-control border border-border-base bg-bg-surface p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-text-main">
                    {t("admin.adminOverviewPage.reviewProfessionals")}
                  </span>
                  <ArrowRight className="h-icon-sm w-icon-sm text-primary" />
                </div>
                <p className="mt-1 text-xs text-text-secondary">
                  {loadState === "success" ? pendingVerifications.length : "…"}{" "}
                  {t("admin.adminOverviewPage.openItems")}
                </p>
              </Link>
            )}
          </div>
        </section>
      )}

      {/* KPI Stats Cards */}
      {loadState !== "error" &&
        (canReadPlatformStats || canReviewVerification || canReviewReports) && (
          <section
            aria-label={t("admin.adminOverviewPage.indicateursDeLaConsole")}
            className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${metricGridColumns}`}
          >
            {canReadPlatformStats && (
              <div className="motion-surface rounded-control border border-border-base bg-bg-surface p-5 shadow-xs hover:shadow-sm">
                <div className="flex items-center justify-between text-stone-500 mb-2">
                  <span className="text-xs font-semibold">
                    {t("admin.adminOverviewPage.utilisateursEnregistres")}
                  </span>
                  <Users className="w-icon-md h-icon-md text-text-disabled" />
                </div>
                <div className="text-2xl font-bold text-text-main">
                  {stats?.totalUsers ?? "…"}
                </div>
                <div className="text-xs text-stone-500 mt-1 flex items-center gap-1">
                  <span className="text-success font-bold">100%</span>{" "}
                  {t("admin.adminOverviewPage.partitionnesParRole")}
                </div>
              </div>
            )}

            {canReviewVerification && (
              <div className="motion-surface rounded-control border border-border-base bg-bg-surface p-5 shadow-xs hover:shadow-sm">
                <div className="flex items-center justify-between text-stone-500 mb-2">
                  <span className="text-xs font-semibold">
                    {t("admin.adminOverviewPage.verificationsProEnAttente")}
                  </span>
                  <Clock className="w-icon-md h-icon-md text-amber-500" />
                </div>
                <div className="text-2xl font-bold text-warning">
                  {loadState === "success" ? pendingVerifications.length : "…"}
                </div>
                <div className="text-xs text-stone-500 mt-1">
                  {loadState !== "success"
                    ? "Chargement des dossiers…"
                    : pendingVerifications.length > 0
                      ? "Dossiers KBIS à valider"
                      : "Tous les dossiers sont traités"}
                </div>
              </div>
            )}

            {canReviewReports && (
              <div className="motion-surface rounded-control border border-border-base bg-bg-surface p-5 shadow-xs hover:shadow-sm">
                <div className="flex items-center justify-between text-stone-500 mb-2">
                  <span className="text-xs font-semibold">
                    Signalements ouverts
                  </span>
                  <ShieldAlert className="w-icon-md h-icon-md text-primary" />
                </div>
                <div className="text-2xl font-bold text-primary">
                  {loadState === "success" ? (reportsCount ?? 0) : "…"}
                </div>
                <div className="text-xs text-stone-500 mt-1">
                  {t("admin.adminOverviewPage.conformiteEtSecurite")}
                </div>
              </div>
            )}

            {canReadPlatformStats && (
              <div className="motion-surface rounded-control border border-border-base bg-bg-surface p-5 shadow-xs hover:shadow-sm">
                <div className="flex items-center justify-between text-stone-500 mb-2">
                  <span className="text-xs font-semibold">
                    {t("admin.adminOverviewPage.catalogueDAnnonces")}
                  </span>
                  <TrendingUp className="w-icon-md h-icon-md text-success" />
                </div>
                <div className="text-2xl font-bold text-text-main">
                  {stats?.totalListings ?? "…"}
                </div>
                <div className="text-xs text-stone-500 mt-1">
                  {t("admin.adminOverviewPage.offresActivesEtArchivees")}
                </div>
              </div>
            )}
          </section>
        )}

      {/* Grid: Pending Pro Dossiers & Recent Audit Log */}
      {loadState !== "error" && (canReviewVerification || canReadAudit) && (
        <section
          aria-label={t("admin.adminOverviewPage.filesOperationnelles")}
          className={`grid grid-cols-1 gap-6 ${
            visibleOperationalPanelCount > 1 ? "lg:grid-cols-2" : ""
          }`}
        >
          {/* Pending Pro Verifications */}
          {canReviewVerification && (
            <div className="flex flex-col rounded-card border border-border-base bg-bg-surface p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-icon-md h-icon-md text-stone-700" />
                  <h2 className="text-sm font-bold text-text-main">
                    {t(
                      "admin.adminOverviewPage.dossiersProfessionnelsAVerifier",
                    )}
                  </h2>
                </div>
                <Link
                  to="/admin/utilisateurs"
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  {t("admin.adminOverviewPage.gerer")}
                  <ArrowRight className="w-icon-xs h-icon-xs" />
                </Link>
              </div>

              {loadState === "loading" ? (
                <div
                  role="status"
                  aria-label="Chargement des dossiers professionnels"
                  className="flex-1 space-y-3"
                >
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="skeleton-shimmer h-16 rounded-lg bg-bg-muted"
                    />
                  ))}
                </div>
              ) : pendingVerifications.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-stone-50 rounded-lg border border-dashed border-stone-200">
                  <CheckCircle2 className="w-8 h-8 text-success mb-2" />
                  <div className="text-xs font-bold text-stone-700">
                    {t("admin.adminOverviewPage.aucunDossierEnAttente")}
                  </div>
                  <div className="text-xs text-stone-500">
                    {t(
                      "admin.adminOverviewPage.toutesLesImmatriculationsKbisSoumises",
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingVerifications.map((pro) => (
                    <div
                      key={pro.id}
                      className="p-3 bg-stone-50 rounded-lg border border-stone-200 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <Image
                          src={pro.avatarUrl}
                          alt={pro.name}
                          sizes="36px"
                          className="w-9 h-9 rounded-pill object-cover border border-stone-200"
                        />
                        <div>
                          <div className="text-xs font-bold text-text-main flex items-center gap-1.5">
                            <span>{pro.companyName || pro.name}</span>
                            <span className="text-micro bg-warning-surface text-warning font-bold px-2 py-1 rounded-sm">
                              En attente
                            </span>
                          </div>
                          <div className="text-xs text-stone-500">
                            SIRET: {pro.siret || "En attente"} • {pro.city}
                          </div>
                        </div>
                      </div>

                      <Button
                        to="/admin/utilisateurs"
                        size="sm"
                        variant="outline"
                        className="text-xs"
                      >
                        Examiner
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Live Security Audit Trail */}
          {canReadAudit && (
            <div className="flex flex-col rounded-card border border-border-base bg-bg-surface p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-icon-md h-icon-md text-stone-700" />
                  <h2 className="text-sm font-bold text-text-main">
                    {t(
                      "admin.adminOverviewPage.dernieresActionsDAuditSecurite",
                    )}
                  </h2>
                </div>
                {canReadAudit && (
                  <Link
                    to="/admin/audit"
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    Journal complet{" "}
                    <ArrowRight className="w-icon-xs h-icon-xs" />
                  </Link>
                )}
              </div>

              <div className="space-y-2.5">
                {loadState === "loading" && (
                  <div
                    role="status"
                    aria-label="Chargement du journal d’audit"
                    className="space-y-2.5"
                  >
                    {[1, 2, 3, 4].map((item) => (
                      <div
                        key={item}
                        className="skeleton-shimmer h-16 rounded-lg bg-bg-muted"
                      />
                    ))}
                  </div>
                )}
                {loadState === "success" && recentAudits.length === 0 && (
                  <p className="rounded-lg border border-dashed border-border-base bg-bg-subtle p-6 text-center text-xs text-text-secondary">
                    Aucune action d’audit récente.
                  </p>
                )}
                {loadState === "success" &&
                  recentAudits.map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 bg-stone-50 rounded-lg border border-stone-200 text-xs flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-text-main flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-pill bg-primary" />
                          {auditActionLabel(log.action)}
                        </span>
                        <span className="text-micro text-stone-500 shrink-0">
                          {formatLogTimestamp(log.timestamp)}
                        </span>
                      </div>
                      <div className="text-xs text-text-secondary line-clamp-1">
                        {log.target}
                      </div>
                      <div className="text-micro text-stone-500">
                        {t("admin.adminOverviewPage.par")}
                        <strong className="text-stone-700">{log.actor}</strong>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
