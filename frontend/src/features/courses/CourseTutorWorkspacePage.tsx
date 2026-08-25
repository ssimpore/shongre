import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BookOpen,
  Building2,
  CheckCircle2,
  Coins,
  CreditCard,
  Eye,
  FileCheck2,
  Inbox,
  Lock,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  ShieldCheck,
} from "lucide-react";
import type {
  CourseLead,
  LearnerRequest,
  TutorWorkspace,
} from "@shongre/contracts/courses";
import { services } from "../../api/client/service-registry";
import { useAuth } from "../../app/providers/AuthProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { useToast } from "../../app/providers/ToastProvider";
import {
  Badge,
  Button,
  Image,
  Skeleton,
  StatePanel,
} from "../../design-system";
import { routes } from "../../configuration/routes";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useRegionalFormatters } from "../../hooks/useRegionalFormatters";
import { useTranslation } from "../../i18n/I18nProvider";

function requestForLead(
  lead: CourseLead,
  requests: LearnerRequest[],
): LearnerRequest | undefined {
  return requests.find((request) => request.id === lead.learnerRequestId);
}

export const CourseTutorWorkspacePage: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const toast = useToast();
  const { activeMarket } = useMarketLocation();
  const { formatDate, formatMoney, formatNumber } = useRegionalFormatters();
  const [workspace, setWorkspace] = useState<TutorWorkspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeLeadTab, setActiveLeadTab] = useState<"new" | "history">("new");

  usePageMeta({
    title: t("verticals.education.workspace"),
    description:
      "Gérez votre profil professeur, vos cours, disponibilités et demandes d’élèves.",
    canonicalPath: "/compte/education",
    noIndex: true,
  });

  useEffect(() => {
    // Demo personas currently map to one deterministic tutor workspace. The
    // HTTP adapter resolves ownership from the authenticated session.
    const tutorId = "tutor_sophie";
    services.courses
      .getTutorWorkspace(tutorId)
      .then(setWorkspace)
      .catch(() => setError(true))
      .finally(() => setIsLoading(false));
  }, [currentUser?.id]);

  const visibleLeads = useMemo(() => {
    if (!workspace) return [];
    return workspace.leads.filter((lead) =>
      activeLeadTab === "new"
        ? ["offered", "viewed"].includes(lead.state)
        : !["offered", "viewed"].includes(lead.state),
    );
  }, [activeLeadTab, workspace]);

  const respondToLead = async (
    lead: CourseLead,
    decision: "accept" | "decline" | "invalid",
  ) => {
    if (!workspace) return;
    try {
      const updated = await services.courses.respondToLead(
        workspace.tutor.id,
        lead.id,
        decision,
        decision === "decline"
          ? "Créneaux incompatibles"
          : decision === "invalid"
            ? "Demande incomplète ou invalide"
            : undefined,
      );
      setWorkspace({
        ...workspace,
        leads: workspace.leads.map((item) =>
          item.id === updated.id ? updated : item,
        ),
      });
      toast.success(
        decision === "accept"
          ? "Demande acceptée. Le contact est désormais disponible."
          : decision === "invalid"
            ? "La demande est transmise à l’administration pour examen."
            : "Demande refusée.",
      );
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Action impossible.",
      );
    }
  };

  if (isLoading) {
    return <Skeleton className="h-168 w-full rounded-card" />;
  }

  if (error || !workspace) {
    return (
      <StatePanel
        title={t("verticals.education.workspaceUnavailable")}
        description="Ce compte n’a pas de profil professeur accessible ou le service est momentanément indisponible."
        action={
          <Button to="/deposer/education">Créer mon profil professeur</Button>
        }
      />
    );
  }

  const { tutor, analytics, plan } = workspace;
  const openLeads = workspace.leads.filter((lead) =>
    ["offered", "viewed"].includes(lead.state),
  ).length;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-black text-text-main sm:text-2xl">
              {t("verticals.education.workspace")}
            </h1>
            {tutor.organizationId && (
              <Badge variant="pro" icon>
                Collège Lumière
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-text-secondary">
            Profil, cours, disponibilités et demandes réunis dans votre espace
            Shongre.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            to="/deposer/education"
            variant="outline"
            size="compact"
            leftIcon={<Plus className="h-icon-sm w-icon-sm" />}
          >
            Créer un cours
          </Button>
          <Button to={`/education/professeur/${tutor.slug}`} size="compact">
            Voir mon profil public
          </Button>
        </div>
      </header>

      <div className="grid min-w-0 gap-5 xl:grid-cols-content-aside-sm">
        <main className="min-w-0 space-y-5">
          <section className="grid gap-4 rounded-card border border-border-base bg-bg-surface p-5 shadow-xs sm:grid-cols-action-content sm:items-center 2xl:grid-cols-workspace-metrics">
            <Image
              src={tutor.avatarUrl}
              alt={`Portrait de ${tutor.displayName}`}
              className="h-20 w-20 rounded-pill object-cover"
              sizes="80px"
            />
            <div className="min-w-0">
              <h2 className="text-base font-black text-text-main">
                {tutor.displayName}
              </h2>
              <p className="mt-0.5 text-xs font-semibold leading-relaxed text-text-secondary">
                {tutor.headline}
              </p>
              <p className="mt-2 text-micro text-text-muted">
                {tutor.serviceArea?.publicLocationLabel}
              </p>
            </div>
            <div className="border-t border-border-subtle pt-4 sm:col-span-2 2xl:col-span-1 2xl:border-l 2xl:border-t-0 2xl:pl-5 2xl:pt-0">
              <p className="text-micro font-bold uppercase tracking-wide text-text-muted">
                Profil complété
              </p>
              <div className="mt-2 flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-pill border-4 border-primary text-xs font-black text-text-main">
                  {tutor.profileCompletionPercent}%
                </span>
                <Button to="/deposer/education?mode=profile" size="sm">
                  Compléter mon profil
                </Button>
              </div>
            </div>
            <div className="border-t border-border-subtle pt-4 sm:col-span-2 2xl:col-span-1 2xl:border-l 2xl:border-t-0 2xl:pl-5 2xl:pt-0">
              <p className="text-micro font-bold uppercase tracking-wide text-text-muted">
                Statut de modération
              </p>
              <p className="mt-2 flex items-center gap-2 text-xs font-bold text-success">
                <CheckCircle2
                  className="h-icon-md w-icon-md"
                  aria-hidden="true"
                />
                Profil approuvé
              </p>
              <p className="mt-1 text-micro text-text-muted">
                Visible dans la recherche
              </p>
            </div>
          </section>

          <section className="grid grid-cols-2 overflow-hidden rounded-card border border-border-base bg-bg-surface shadow-xs sm:grid-cols-5">
            {[
              [Eye, "Vues du profil", formatNumber(analytics.profileViews)],
              [Inbox, "Demandes reçues", String(analytics.requestsReceived)],
              [
                MessageSquare,
                "Réponse médiane",
                analytics.medianResponseMinutes
                  ? `${Math.round(analytics.medianResponseMinutes / 60)} h`
                  : "—",
              ],
              [
                BarChart3,
                "Conversion contact",
                analytics.contactConversionRate !== undefined
                  ? `${Math.round(analytics.contactConversionRate * 100)} %`
                  : "—",
              ],
              [
                BookOpen,
                "Cours actifs",
                String(
                  workspace.offers.filter(
                    (offer) => offer.status === "published",
                  ).length,
                ),
              ],
            ].map(([Icon, label, value], index) => {
              const MetricIcon = Icon as React.ComponentType<{
                className?: string;
              }>;
              return (
                <div
                  key={String(label)}
                  className={`p-4 ${index > 0 ? "border-l border-border-subtle" : ""} ${index === 4 ? "col-span-2 border-t sm:col-span-1 sm:border-t-0" : ""}`}
                >
                  <p className="flex items-center gap-1.5 text-micro font-semibold text-text-muted">
                    <MetricIcon
                      className="h-icon-xs w-icon-xs"
                      aria-hidden="true"
                    />{" "}
                    {String(label)}
                  </p>
                  <p className="mt-1 text-lg font-black text-text-main">
                    {String(value)}
                  </p>
                  <p className="text-micro text-text-muted">
                    30 derniers jours
                  </p>
                </div>
              );
            })}
          </section>

          <section className="overflow-hidden rounded-card border border-border-base bg-bg-surface shadow-xs">
            <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
              <div>
                <h2 className="text-sm font-black text-text-main">Mes cours</h2>
                <p className="text-micro text-text-muted">
                  {workspace.offers.length} offre
                  {workspace.offers.length > 1 ? "s" : ""}
                </p>
              </div>
              <Button to="/deposer/education" variant="ghost" size="sm">
                Voir tous mes cours
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-168 text-left text-xs">
                <thead className="bg-bg-subtle text-micro font-bold uppercase tracking-wide text-text-muted">
                  <tr>
                    <th className="px-4 py-2.5">Cours</th>
                    <th className="px-4 py-2.5">Format</th>
                    <th className="px-4 py-2.5">Tarif</th>
                    <th className="px-4 py-2.5">Capacité</th>
                    <th className="px-4 py-2.5">Statut</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {workspace.offers.map((offer) => (
                    <tr key={offer.id}>
                      <td className="px-4 py-3">
                        <p className="font-bold text-text-main">
                          {offer.title}
                        </p>
                        <p className="mt-0.5 text-micro text-text-muted">
                          {offer.availabilitySummary}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {offer.deliveryModes.includes("online") &&
                        offer.deliveryModes.includes("in_person")
                          ? "Présentiel & visio"
                          : offer.deliveryModes.includes("online")
                            ? "Visio"
                            : "Présentiel"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-text-main">
                        {offer.pricingOptions[0]
                          ? formatMoney(offer.pricingOptions[0].price)
                          : "—"}{" "}
                        / h
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {offer.capacityStatus === "available"
                          ? "Disponible"
                          : "Limitée"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            offer.status === "published" ? "success" : "warning"
                          }
                        >
                          {offer.status === "published"
                            ? "En ligne"
                            : "En revue"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            to={routes.courses.publish({
                              mode: "profile",
                              step: "expertise",
                            })}
                            variant="outline"
                            size="sm"
                            aria-label={`Modifier ${offer.title}`}
                            className="touch-square h-control-sm w-control-sm p-0"
                          >
                            <Pencil
                              className="h-icon-xs w-icon-xs"
                              aria-hidden="true"
                            />
                          </Button>
                          <Button
                            to={routes.courses.publish({
                              mode: "profile",
                              step: "offer",
                            })}
                            variant="outline"
                            size="sm"
                            aria-label={`Plus d’actions pour ${offer.title}`}
                            className="touch-square h-control-sm w-control-sm p-0"
                          >
                            <MoreHorizontal
                              className="h-icon-xs w-icon-xs"
                              aria-hidden="true"
                            />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="overflow-hidden rounded-card border border-border-base bg-bg-surface shadow-xs">
            <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
              <div>
                <h2 className="text-sm font-black text-text-main">
                  Disponibilités
                </h2>
                <p className="text-micro text-text-muted">
                  Cette semaine · {activeMarket.timezone}
                </p>
              </div>
              <Button
                to={routes.courses.availability()}
                variant="ghost"
                size="sm"
              >
                Modifier
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-176 text-center text-xs">
                <thead className="bg-bg-subtle text-micro font-bold text-text-muted">
                  <tr>
                    <th className="px-3 py-2 text-left">Créneau</th>
                    {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(
                      (day) => (
                        <th key={day} className="px-3 py-2">
                          {day}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle text-text-secondary">
                  {[
                    [
                      "Matin",
                      ["—", "9h–12h", "—", "9h–12h", "—", "9h–12h", "—"],
                    ],
                    [
                      "Après-midi",
                      [
                        "14h–18h",
                        "14h–18h",
                        "14h–18h",
                        "14h–18h",
                        "14h–17h",
                        "14h–17h",
                        "—",
                      ],
                    ],
                    [
                      "Soirée",
                      [
                        "18h–21h",
                        "18h–21h",
                        "18h–21h",
                        "—",
                        "18h–21h",
                        "—",
                        "—",
                      ],
                    ],
                  ].map(([label, values]) => (
                    <tr key={String(label)}>
                      <th className="px-3 py-3 text-left font-bold text-text-main">
                        {String(label)}
                      </th>
                      {(values as string[]).map((value, index) => (
                        <td key={`${label}-${index}`} className="px-3 py-3">
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="overflow-hidden rounded-card border border-border-base bg-bg-surface shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
              <div>
                <h2 className="text-sm font-black text-text-main">
                  Demandes d’élèves
                </h2>
                <p className="text-micro text-text-muted">
                  Les coordonnées restent masquées avant acceptation.
                </p>
              </div>
              <Badge variant={openLeads ? "primary" : "neutral"}>
                {openLeads} nouvelle{openLeads > 1 ? "s" : ""}
              </Badge>
            </div>
            <div className="flex gap-5 border-b border-border-subtle px-4">
              {[
                ["new", "Leads"],
                ["history", "Historique"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setActiveLeadTab(value as "new" | "history")}
                  className={`min-h-control-touch border-b-2 text-xs font-bold ${activeLeadTab === value ? "border-primary text-primary" : "border-transparent text-text-muted"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {visibleLeads.length === 0 ? (
              <div className="p-8 text-center">
                <Inbox
                  className="mx-auto h-7 w-7 text-text-disabled"
                  aria-hidden="true"
                />
                <p className="mt-2 text-xs font-semibold text-text-secondary">
                  Aucune demande dans cette vue.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border-subtle">
                {visibleLeads.map((lead) => {
                  const request = requestForLead(
                    lead,
                    workspace.learnerRequests,
                  );
                  return (
                    <article
                      key={lead.id}
                      className="grid gap-3 p-4 sm:grid-cols-content-action sm:items-center"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xs font-black text-text-main">
                            {request?.objective ||
                              "Demande de cours de mathématiques"}
                          </h3>
                          <Badge
                            variant={
                              lead.relevanceScore >= 0.9 ? "success" : "neutral"
                            }
                          >
                            {Math.round(lead.relevanceScore * 100)} % pertinent
                          </Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-micro text-text-muted">
                          <span>
                            {request?.levelId === "middle_school"
                              ? "Collège"
                              : "Lycée"}
                          </span>
                          <span>{request?.city || "En ligne"}</span>
                          <span>
                            {request?.budgetMin && request?.budgetMax
                              ? `${formatMoney(request.budgetMin)}–${formatMoney(request.budgetMax)} / h`
                              : "Budget non précisé"}
                          </span>
                          <span className="text-warning">
                            Expire le {formatDate(lead.expiresAt)}
                          </span>
                        </div>
                        <p className="mt-2 text-micro text-text-secondary">
                          {lead.relevanceReasons.join(" · ")}
                        </p>
                      </div>
                      {["offered", "viewed"].includes(lead.state) ? (
                        <div className="flex flex-wrap gap-2 sm:justify-end">
                          <Button
                            size="sm"
                            onClick={() => respondToLead(lead, "accept")}
                          >
                            Accepter
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => respondToLead(lead, "decline")}
                          >
                            Refuser
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => respondToLead(lead, "invalid")}
                          >
                            Signaler invalide
                          </Button>
                        </div>
                      ) : (
                        <Badge
                          variant={
                            lead.state === "accepted" ? "success" : "neutral"
                          }
                        >
                          {lead.state === "accepted"
                            ? "Acceptée"
                            : lead.state === "declined"
                              ? "Refusée"
                              : "En examen"}
                        </Badge>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </main>

        <aside className="min-w-0 space-y-4">
          <section className="rounded-card border border-border-base bg-bg-surface p-4 shadow-xs">
            <h2 className="flex items-center gap-2 text-sm font-black text-text-main">
              <CreditCard className="h-icon-sm w-icon-sm" aria-hidden="true" />
              Abonnement et visibilité
            </h2>
            <dl className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">Formule</dt>
                <dd className="text-right font-bold text-text-main">
                  {plan.name}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">Cours actifs</dt>
                <dd className="font-bold text-text-main">
                  {workspace.offers.length} /{" "}
                  {plan.entitlements.maxActiveOffers}
                </dd>
              </div>
            </dl>
            <div className="mt-4 border-t border-border-subtle pt-4">
              <p className="flex items-center gap-2 text-xs font-bold text-text-main">
                <Coins
                  className="h-icon-sm w-icon-sm text-primary"
                  aria-hidden="true"
                />
                Crédits de visibilité
              </p>
              <p className="mt-2 text-lg font-black text-text-main">
                {workspace.creditsRemaining}
                <span className="ml-1 text-xs font-medium text-text-muted">
                  restants
                </span>
              </p>
            </div>
            <Button
              to={routes.workspace.pro.subscriptions()}
              variant="ghost"
              size="sm"
              className="mt-3"
            >
              Gérer mon abonnement
            </Button>
          </section>

          <section className="rounded-card border border-border-base bg-bg-surface p-4 shadow-xs">
            <h2 className="flex items-center gap-2 text-sm font-black text-text-main">
              <ShieldCheck
                className="h-icon-sm w-icon-sm text-success"
                aria-hidden="true"
              />
              Vérifications
            </h2>
            <ul className="mt-3 divide-y divide-border-subtle text-xs">
              {[
                ["Adresse e-mail", tutor.verifications.email],
                ["Téléphone", tutor.verifications.phone],
                ["Identité", tutor.verifications.identity],
                ["Qualifications", tutor.verifications.qualifications],
              ].map(([label, status]) => (
                <li
                  key={label}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <span className="text-text-secondary">{label}</span>
                  <span
                    className={
                      status === "verified"
                        ? "font-bold text-success"
                        : "font-semibold text-warning"
                    }
                  >
                    {status === "verified" ? "Vérifié" : "À compléter"}
                  </span>
                </li>
              ))}
            </ul>
            <Button
              to="/compte/verification"
              variant="ghost"
              size="sm"
              className="mt-2"
            >
              Voir toutes les vérifications
            </Button>
          </section>

          <section className="rounded-card border border-border-base bg-bg-surface p-4 shadow-xs">
            <h2 className="flex items-center gap-2 text-sm font-black text-text-main">
              <FileCheck2 className="h-icon-sm w-icon-sm" aria-hidden="true" />
              Qualifications
            </h2>
            <div className="mt-3 space-y-3">
              {tutor.qualifications.map((qualification) => (
                <div key={qualification.id}>
                  <p className="text-xs font-bold text-text-main">
                    {qualification.label}
                  </p>
                  <p className="mt-0.5 text-micro text-text-muted">
                    {qualification.publicLabel}
                  </p>
                  <p
                    className={`mt-1 text-micro font-semibold ${qualification.verificationStatus === "verified" ? "text-success" : "text-info"}`}
                  >
                    {qualification.evidenceStatus === "self_declared"
                      ? "Déclaré par vous"
                      : qualification.verificationStatus === "verified"
                        ? "Vérifié par Shongre"
                        : "Preuve privée téléversée"}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-border-subtle pt-3">
              <p className="text-xs font-bold text-text-main">
                Éligibilité services fiscaux
              </p>
              <p className="mt-1 text-micro font-semibold text-warning">
                Non vérifiée / conditionnelle
              </p>
            </div>
          </section>

          {tutor.organizationId && (
            <section className="rounded-card border border-border-base bg-bg-surface p-4 shadow-xs">
              <h2 className="flex items-center gap-2 text-sm font-black text-text-main">
                <Building2
                  className="h-icon-sm w-icon-sm text-primary"
                  aria-hidden="true"
                />
                Collège Lumière
              </h2>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-text-muted">Professeurs</dt>
                  <dd className="mt-1 font-black text-text-main">8</dd>
                </div>
                <div>
                  <dt className="text-text-muted">Lieux</dt>
                  <dd className="mt-1 font-black text-text-main">2</dd>
                </div>
              </dl>
              <Button
                to="/compte/education/organisation"
                variant="ghost"
                size="sm"
                className="mt-3"
              >
                Ouvrir l’espace organisme
              </Button>
            </section>
          )}

          <section className="rounded-card border border-warning-border bg-warning-surface p-4">
            <h2 className="flex items-center gap-2 text-sm font-black text-text-main">
              <Lock
                className="h-icon-sm w-icon-sm text-warning"
                aria-hidden="true"
              />
              Réservations et paiements
            </h2>
            <p className="mt-3 text-xs font-bold text-text-main">
              Fonctionnalité non activée sur ce marché
            </p>
            <p className="mt-1 text-micro leading-relaxed text-text-secondary">
              Les cours, paiements et versements ne sont pas disponibles tant
              que l’onboarding prestataire, la fiscalité, la facturation et les
              obligations réglementaires ne sont pas validés.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
};
