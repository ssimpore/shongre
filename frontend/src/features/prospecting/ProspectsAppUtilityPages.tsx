import { useEffect, useState } from "react";
import {
  CircleAlert,
  CreditCard,
  History,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import type { ProspectingUsage } from "@shongre/contracts/prospecting";
import { services } from "../../api/client/service-registry";
import { useAuth } from "../../app/providers/AuthProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { Badge, ProgressBar, Skeleton, StatePanel } from "../../design-system";
import { ActivityTimeline } from "./components/ProspectsCrmPanels";
import { useProspectingWorkspaceController } from "./useProspectingWorkspaceController";
import { usePageMeta } from "../../hooks/usePageMeta";
import { prospectsPaths } from "../crm/CrmSurfaceContext";

function useProspectsUsage() {
  const { activeMarket } = useMarketLocation();
  const [usage, setUsage] = useState<ProspectingUsage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void services.crmProspecting
      .getUsage(activeMarket.code)
      .then((value) => {
        if (active) setUsage(value);
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error ? cause.message : "Usage indisponible.",
          );
      });
    return () => {
      active = false;
    };
  }, [activeMarket.code]);

  return { usage, error };
}

export function ProspectsActivitiesPage() {
  usePageMeta({
    title: "Activités CRM | Shongre Prospects",
    description: "Historique commercial de l’organisation active.",
    canonicalPath: prospectsPaths.activities,
    noIndex: true,
  });
  const controller = useProspectingWorkspaceController("SUBSCRIBER", "/app");

  if (controller.loading) return <Skeleton className="h-96 rounded-card" />;
  if (controller.error && !controller.activities.length) {
    return (
      <StatePanel
        variant="error"
        title="Historique indisponible"
        description={controller.error}
        action={null}
      />
    );
  }

  return (
    <section className="overflow-hidden rounded-card border border-border-base bg-bg-surface shadow-xs">
      <header className="flex items-start gap-3 border-b border-border-base p-4 sm:p-5">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-control bg-primary-light text-primary">
          <History className="h-icon-md w-icon-md" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-lg font-bold text-text-main">
            Activités commerciales
          </h1>
          <p className="mt-1 text-xs text-text-muted">
            Historique append-only des imports, tâches, opportunités et
            échanges.
          </p>
        </div>
      </header>
      <ActivityTimeline
        activities={controller.activities}
        locale={controller.currentLocale}
      />
    </section>
  );
}

export function ProspectsTeamPage() {
  usePageMeta({
    title: "Équipe | Shongre Prospects",
    description: "Membres, sièges et permissions de l’organisation active.",
    canonicalPath: prospectsPaths.team,
    noIndex: true,
  });
  const { currentUser } = useAuth();
  const { usage, error } = useProspectsUsage();

  if (error) {
    return (
      <StatePanel
        variant="error"
        title="Équipe indisponible"
        description={error}
        action={null}
      />
    );
  }
  if (!usage) return <Skeleton className="h-72 rounded-card" />;

  return (
    <div className="grid gap-4 lg:grid-cols-agency-content-aside-secondary">
      <section className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-control bg-primary-light text-primary">
            <UsersRound className="h-icon-md w-icon-md" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-text-main">Équipe</h1>
            <p className="mt-1 text-xs text-text-muted">
              Membres et permissions de l’organisation active.
            </p>
          </div>
        </div>
        <article className="mt-5 flex min-w-0 flex-col items-start gap-3 rounded-control border border-border-base p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-text-main">
              {currentUser?.name ?? "Membre connecté"}
            </p>
            <p className="truncate text-xs text-text-muted">
              {currentUser?.email}
            </p>
          </div>
          <Badge variant="success">Membre actif</Badge>
        </article>
      </section>
      <aside className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs">
        <h2 className="text-sm font-bold text-text-main">Capacité du plan</h2>
        <p className="mt-2 text-2xl font-bold text-primary">
          {usage.entitlements.seats} sièges
        </p>
        <p className="mt-2 text-xs leading-relaxed text-text-muted">
          Les invitations et rôles restent gérés par l’organisation Shongre afin
          de conserver une seule identité et une seule appartenance par membre.
        </p>
        <div className="mt-4 flex items-start gap-2 rounded-control bg-bg-subtle p-3 text-micro text-text-secondary">
          <ShieldCheck
            className="mt-0.5 h-icon-sm w-icon-sm shrink-0 text-success"
            aria-hidden="true"
          />
          Les autorisations CRM sont aussi vérifiées par le backend et la RLS.
        </div>
      </aside>
    </div>
  );
}

export function ProspectsBillingPage() {
  usePageMeta({
    title: "Facturation | Shongre Prospects",
    description: "Offre, droits effectifs et usage Shongre Prospects.",
    canonicalPath: prospectsPaths.billing,
    noIndex: true,
  });
  const { usage, error } = useProspectsUsage();
  if (error) {
    return (
      <StatePanel
        variant="error"
        title="Facturation indisponible"
        description={error}
        action={null}
      />
    );
  }
  if (!usage) return <Skeleton className="h-80 rounded-card" />;

  const meters = [
    [
      "Découvertes",
      usage.discoveriesUsed,
      usage.entitlements.monthlyDiscoveries,
    ],
    [
      "Enrichissements",
      usage.enrichmentsUsed,
      usage.entitlements.monthlyEnrichments,
    ],
    ["Crédits IA", usage.aiCreditsUsed, usage.entitlements.monthlyAiCredits],
    ["Outreach", usage.outreachUsed, usage.entitlements.monthlyOutreach],
  ] as const;

  return (
    <div className="grid gap-4 lg:grid-cols-agency-content-aside-secondary">
      <section className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-control bg-primary-light text-primary">
            <CreditCard className="h-icon-md w-icon-md" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-lg font-bold text-text-main">Offre et usage</h1>
            <p className="mt-1 text-xs text-text-muted">
              Droits effectifs calculés par le système d’entitlements Shongre.
            </p>
          </div>
        </div>
        <div className="mt-6 space-y-5">
          {meters.map(([label, used, limit]) => (
            <div key={label}>
              <div className="mb-1.5 flex justify-between gap-3 text-xs">
                <span className="font-bold text-text-secondary">{label}</span>
                <span className="tabular-nums text-text-muted">
                  {used.toLocaleString()} / {limit.toLocaleString()}
                </span>
              </div>
              <ProgressBar
                value={used}
                max={Math.max(limit, 1)}
                label={label}
                variant={used >= limit ? "danger" : "primary"}
              />
            </div>
          ))}
        </div>
      </section>
      <aside className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs">
        <Badge variant={usage.status === "AVAILABLE" ? "success" : "warning"}>
          {usage.status === "AVAILABLE" ? "Actif" : "Attention requise"}
        </Badge>
        <h2 className="mt-3 text-base font-bold text-text-main">
          {usage.planName}
        </h2>
        <dl className="mt-4 divide-y divide-border-subtle text-xs">
          <div className="flex justify-between gap-3 py-3">
            <dt className="text-text-muted">Mode d’accès</dt>
            <dd className="font-bold text-text-main">{usage.accessMode}</dd>
          </div>
          <div className="flex justify-between gap-3 py-3">
            <dt className="text-text-muted">Prospects maximum</dt>
            <dd className="font-bold text-text-main">
              {usage.entitlements.maxProspectRecords.toLocaleString()}
            </dd>
          </div>
          <div className="flex justify-between gap-3 py-3">
            <dt className="text-text-muted">Rétention</dt>
            <dd className="font-bold text-text-main">
              {usage.entitlements.retentionDays} jours
            </dd>
          </div>
        </dl>
        {usage.status !== "AVAILABLE" && (
          <div className="mt-4 flex gap-2 rounded-control bg-warning-surface p-3 text-micro text-warning">
            <CircleAlert
              className="h-icon-sm w-icon-sm shrink-0"
              aria-hidden="true"
            />
            Vérifiez le quota ou l’état de l’abonnement avant une nouvelle
            opération.
          </div>
        )}
      </aside>
    </div>
  );
}
