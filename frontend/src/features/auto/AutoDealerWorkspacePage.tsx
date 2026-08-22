import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ArrowRightLeft,
  Building2,
  CalendarDays,
  CarFront,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CloudUpload,
  FileClock,
  KeyRound,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Plus,
  RefreshCcw,
  ShieldAlert,
  UsersRound,
} from "lucide-react";
import type {
  AutoCatalog,
  AutoLead,
  DealerWorkspace,
  InventoryImport,
} from "@shongre/contracts/auto";
import { services } from "../../api/client/service-registry";
import { useToast } from "../../app/providers/ToastProvider";
import {
  Badge,
  Button,
  Container,
  Skeleton,
  StatePanel,
} from "../../design-system";
import { usePageMeta } from "../../hooks/usePageMeta";
import { formatAutoMileage, formatAutoMoney } from "./auto-format";

const TABS = [
  "Vue d’ensemble",
  "Stock",
  "Transferts",
  "Leads",
  "Rendez-vous",
  "Imports",
  "Équipe",
  "Sites",
  "Promotions",
  "Abonnement",
  "Factures",
  "Profil",
  "Statistiques",
  "API",
  "Journaux",
] as const;
type Tab = (typeof TABS)[number];
const leadStatusLabels: Record<AutoLead["status"], string> = {
  new: "Nouveau",
  qualified: "Qualifié",
  in_progress: "En cours",
  appointment: "Rendez-vous",
  won: "Gagné",
  lost: "Perdu",
  spam: "Indésirable",
};

const Metric = ({
  icon: Icon,
  value,
  label,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string | number;
  label: string;
  hint: string;
}) => (
  <div className="rounded-card border border-border-base bg-bg-surface p-4 shadow-xs">
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-card bg-primary-light text-primary">
        <Icon className="h-icon-md w-icon-md" />
      </span>
      <div>
        <p className="text-xl font-black text-text-main">{value}</p>
        <p className="text-xs font-semibold text-text-secondary">{label}</p>
        <p className="mt-1 text-micro text-text-muted">{hint}</p>
      </div>
    </div>
  </div>
);

export const AutoDealerWorkspacePage: React.FC = () => {
  const toast = useToast();
  const [workspace, setWorkspace] = useState<DealerWorkspace | null>(null);
  const [catalog, setCatalog] = useState<AutoCatalog | null>(null);
  const [tab, setTab] = useState<Tab>("Vue d’ensemble");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [importing, setImporting] = useState(false);

  usePageMeta({
    title: "Espace Auto professionnel",
    description:
      "Gérez le stock, les demandes, les imports et l’activité de votre concession.",
    canonicalPath: "/compte/auto",
    noIndex: true,
  });
  const load = () => {
    setLoading(true);
    Promise.all([
      services.auto.getDealerWorkspace("dealer_auto_select_lyon"),
      services.auto.getCatalog("FR"),
    ])
      .then(([nextWorkspace, nextCatalog]) => {
        setWorkspace(nextWorkspace);
        setCatalog(nextCatalog);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const plan = useMemo(
    () =>
      catalog?.plans.find(
        (candidate) => candidate.id === workspace?.organization.planId,
      ),
    [catalog, workspace?.organization.planId],
  );
  const latestImport = workspace?.imports[0];
  const startImport = async (type: InventoryImport["type"] = "csv") => {
    if (!workspace) return;
    setImporting(true);
    try {
      const job = await services.auto.requestInventoryImport(
        workspace.organization.id,
        type,
        type === "csv" ? "stock_auto_demo.csv" : undefined,
        crypto.randomUUID(),
      );
      setWorkspace({ ...workspace, imports: [job, ...workspace.imports] });
      toast.success(
        "Import mis en file d’attente. Le fichier sera contrôlé hors requête.",
      );
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Import indisponible.",
      );
    } finally {
      setImporting(false);
    }
  };
  const moveLead = async (lead: AutoLead, status: AutoLead["status"]) => {
    if (!workspace) return;
    const next = await services.auto.updateLead(
      workspace.organization.id,
      lead.id,
      { status },
    );
    setWorkspace({
      ...workspace,
      leads: workspace.leads.map((row) => (row.id === next.id ? next : row)),
    });
    toast.success("Statut de la demande mis à jour.");
  };

  if (loading)
    return (
      <Container className="py-7">
        <Skeleton className="h-[48rem] rounded-card" />
      </Container>
    );
  if (error || !workspace || !plan)
    return (
      <Container className="py-10">
        <StatePanel
          variant="error"
          title="Espace Auto indisponible"
          description="Vérifiez votre appartenance à la concession puis réessayez."
          action={<Button onClick={load}>Réessayer</Button>}
        />
      </Container>
    );

  const inventory = (
    <section className="overflow-hidden rounded-card border border-border-base bg-bg-surface shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
        <h2 className="text-sm font-black">
          Stock actif ({workspace.vehicles.length})
        </h2>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost">
            Exporter
          </Button>
          <Button size="sm" variant="outline">
            Filtres
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[50rem] text-left text-xs">
          <thead className="bg-bg-subtle text-micro uppercase tracking-wide text-text-muted">
            <tr>
              <th className="px-4 py-3">Réf. stock</th>
              <th className="px-4 py-3">Véhicule</th>
              <th className="px-4 py-3">Prix TTC</th>
              <th className="px-4 py-3">Vues / Leads</th>
              <th className="px-4 py-3">Documents</th>
              <th className="px-4 py-3">Modération</th>
              <th className="px-4 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {workspace.vehicles.map((vehicle) => {
              const vehicleMetric = workspace.vehicleMetrics.find(
                (metric) => metric.vehicleId === vehicle.id,
              );
              return (
              <tr key={vehicle.id}>
                <td className="px-4 py-3 font-mono text-micro">
                  {vehicle.stockReference}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={vehicle.mediaUrls[0]}
                      alt=""
                      className="h-10 w-14 rounded-control object-cover"
                    />
                    <div>
                      <p className="font-bold text-text-main">
                        {vehicle.makeLabel} {vehicle.modelLabel}{" "}
                        {vehicle.trimLabel}
                      </p>
                      <p className="text-micro text-text-muted">
                        {vehicle.technical.modelYear} ·{" "}
                        {formatAutoMileage(vehicle)}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-bold">
                  {formatAutoMoney(vehicle.price)}
                </td>
                <td className="px-4 py-3">
                  {vehicleMetric
                    ? `${vehicleMetric.views30d} / ${vehicleMetric.leads30d}`
                    : "— / —"}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={vehicle.documents.length ? "success" : "warning"}
                  >
                    {vehicle.documents.length ? "Complet" : "À compléter"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="success">Approuvé</Badge>
                </td>
                <td className="px-4 py-3">
                  <button aria-label={`Actions pour ${vehicle.title}`}>
                    <MoreHorizontal className="h-icon-sm w-icon-sm" />
                  </button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );

  const stockTransfers = (
    <section className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-card bg-primary-light text-primary">
          <ArrowRightLeft className="h-icon-md w-icon-md" />
        </span>
        <div>
          <h2 className="text-base font-black">Transferts de stock</h2>
          <p className="mt-1 text-xs text-text-secondary">
            Déplacement auditable d’un véhicule entre deux sites de la même
            organisation.
          </p>
        </div>
      </div>
      {!plan.entitlements.stockTransfers ? (
        <div className="mt-5 rounded-card border border-border-base bg-bg-subtle p-4 text-xs text-text-secondary">
          Cette capacité n’est pas incluse dans votre formule actuelle.
        </div>
      ) : workspace.stockTransfers.length ? (
        <div className="mt-5 divide-y divide-border-subtle">
          {workspace.stockTransfers.map((transfer) => (
            <div
              key={transfer.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs"
            >
              <span className="font-mono text-micro">{transfer.vehicleId}</span>
              <span>
                {transfer.fromLocationId} → {transfer.toLocationId}
              </span>
              <Badge variant="neutral">{transfer.status}</Badge>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 text-xs text-text-muted">
          Aucun transfert de stock en cours.
        </p>
      )}
    </section>
  );

  const leads = (
    <section className="overflow-hidden rounded-card border border-border-base bg-bg-surface shadow-xs">
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
        <h2 className="text-sm font-black">
          Demandes qualifiées à traiter ({workspace.leads.length})
        </h2>
        <button
          type="button"
          onClick={() => setTab("Leads")}
          className="text-xs font-bold text-primary"
        >
          Voir toutes
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[45rem] text-left text-xs">
          <thead className="bg-bg-subtle text-micro uppercase text-text-muted">
            <tr>
              <th className="px-4 py-3">Intention</th>
              <th className="px-4 py-3">Véhicule</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Affectation</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Rappel</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {workspace.leads.map((lead) => {
              const vehicle = workspace.vehicles.find(
                (row) => row.id === lead.vehicleId,
              );
              return (
                <tr key={lead.id}>
                  <td className="px-4 py-3">
                    <Badge>
                      {lead.intention === "purchase"
                        ? "Achat"
                        : lead.intention === "test_drive"
                          ? "Essai"
                          : "Information"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold">
                      {vehicle
                        ? `${vehicle.makeLabel} ${vehicle.modelLabel}`
                        : lead.vehicleId}
                    </p>
                    <p className="text-micro text-text-muted">
                      {vehicle?.stockReference}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{lead.contactName}</p>
                    <p className="text-micro text-text-muted">
                      {lead.contactEmail}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={lead.assignedUserId || ""}
                      onChange={(event) =>
                        services.auto
                          .updateLead(workspace.organization.id, lead.id, {
                            assignedUserId: event.target.value || undefined,
                          })
                          .then(load)
                      }
                      className="h-control-compact rounded-control border border-border-base px-2 h-control-touch"
                    >
                      <option value="">Non assigné</option>
                      {workspace.members
                        .filter((row) => row.status === "active")
                        .map((member) => (
                          <option key={member.userId} value={member.userId}>
                            {member.displayName}
                          </option>
                        ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={lead.status}
                      onChange={(event) =>
                        moveLead(lead, event.target.value as AutoLead["status"])
                      }
                      className="h-control-compact rounded-control border border-border-base px-2 h-control-touch"
                    >
                      <option value="new">Nouveau</option>
                      <option value="qualified">Qualifié</option>
                      <option value="in_progress">En cours</option>
                      <option value="appointment">Rendez-vous</option>
                      <option value="won">Gagné</option>
                      <option value="lost">Perdu</option>
                      <option value="spam">Indésirable</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {lead.nextReminderAt ? "Demain 14:00" : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );

  const imports = (
    <section className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 className="text-base font-black">Imports & synchronisation</h2>
          <p className="mt-1 text-xs text-text-secondary">
            CSV et XML sont validés par un travail asynchrone. L’API reste
            désactivée par marché.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="compact"
            onClick={() => startImport("csv")}
            isLoading={importing}
            leftIcon={<CloudUpload className="h-icon-sm w-icon-sm" />}
          >
            Importer un CSV
          </Button>
          <Button
            size="compact"
            variant="outline"
            onClick={() => startImport("xml")}
          >
            Importer un XML
          </Button>
        </div>
      </div>
      <div className="mt-5 divide-y divide-border-subtle rounded-card border border-border-base">
        {workspace.imports.map((item) => (
          <article
            key={item.id}
            className="grid gap-3 p-4 text-xs sm:grid-cols-[minmax(0,1fr)_auto]"
          >
            <div>
              <p className="font-bold">
                {item.fileName || `Synchronisation ${item.type.toUpperCase()}`}
              </p>
              <p className="mt-1 text-text-muted">
                Demandé le {new Date(item.requestedAt).toLocaleString("fr-FR")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  item.status === "failed"
                    ? "urgent"
                    : item.status === "completed_with_errors"
                      ? "warning"
                      : item.status === "completed"
                        ? "success"
                        : "neutral"
                }
              >
                {item.status === "completed_with_errors"
                  ? "Terminé avec erreurs"
                  : item.status}
              </Badge>
              <span>
                {item.createdCount} créés · {item.updatedCount} mis à jour ·{" "}
                {item.errorCount} erreur
              </span>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-4 rounded-card border border-warning-border bg-warning-surface p-4 text-xs">
        <p className="flex items-center gap-2 font-black">
          <ShieldAlert className="h-icon-sm w-icon-sm text-warning" /> Doublons
          et erreurs isolés
        </p>
        <p className="mt-1 text-text-secondary">
          Une ligne en conflit de VIN est mise en revue ; elle n’écrase jamais
          automatiquement un véhicule actif.
        </p>
      </div>
    </section>
  );

  const team = (
    <section className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black">Équipe</h2>
          <p className="mt-1 text-xs text-text-secondary">
            Les rôles limitent stock, leads, facturation, sites et statistiques.
          </p>
        </div>
        <Button
          size="compact"
          leftIcon={<Plus className="h-icon-sm w-icon-sm" />}
        >
          Inviter
        </Button>
      </div>
      <div className="mt-5 divide-y divide-border-subtle">
        {workspace.members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between gap-4 py-3"
          >
            <div>
              <p className="text-xs font-bold">{member.displayName}</p>
              <p className="text-micro text-text-muted">
                {member.email} · {member.locationIds.length} site
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge>{member.role}</Badge>
              <Badge
                variant={member.status === "active" ? "success" : "warning"}
              >
                {member.status === "active" ? "Actif" : member.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </section>
  );

  const subscription = (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs">
        <p className="text-xs font-bold text-primary">Formule actuelle</p>
        <h2 className="mt-1 text-xl font-black">{plan.name}</h2>
        <p className="mt-2 text-xs text-text-secondary">
          {workspace.usage.activeVehicles} /{" "}
          {plan.entitlements.maxActiveVehicles} véhicules ·{" "}
          {workspace.usage.remainingPromotionCredits} crédits de visibilité
          restants
        </p>
        <progress
          className="mt-4 h-2 w-full accent-primary"
          value={workspace.usage.activeVehicles}
          max={Math.max(1, plan.entitlements.maxActiveVehicles)}
          aria-label="Utilisation du quota de véhicules"
        />
        <Button className="mt-5" variant="outline" size="compact">
          Gérer l’abonnement
        </Button>
      </div>
      <div className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs">
        <h2 className="text-base font-black">Facturation</h2>
        <p className="mt-2 text-xs text-text-secondary">
          Les prix sont configurés par marché. Aucun paiement réel n’est émis en
          mode démo.
        </p>
        <dl className="mt-4 space-y-2 text-xs">
          <div className="flex justify-between">
            <dt>Prix catalogue mensuel</dt>
            <dd className="font-bold">
              {plan.monthlyPrice
                ? formatAutoMoney(plan.monthlyPrice)
                : "Sur devis"}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );

  const api = (
    <section className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs">
      <div className="flex gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-card bg-bg-subtle">
          <KeyRound className="h-icon-md w-icon-md" />
        </span>
        <div>
          <h2 className="text-base font-black">API d’inventaire</h2>
          <p className="mt-1 text-xs text-text-secondary">
            {plan?.entitlements.inventoryApiSync
              ? "Incluse dans votre formule, mais désactivée par le drapeau marché actuel."
              : "Non incluse dans votre formule et désactivée par le drapeau marché actuel."}
          </p>
        </div>
      </div>
      <div className="mt-5 rounded-card border border-border-base p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold">Aucun identifiant actif</p>
            <p className="mt-1 text-micro text-text-muted">
              Les secrets ne sont affichés qu’une seule fois à la création et ne
              sont stockés que sous forme de hash.
            </p>
          </div>
          <Badge variant="warning">Inactif</Badge>
        </div>
      </div>
    </section>
  );

  const analytics = (
    <section>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric
          icon={BarChart3}
          value={new Intl.NumberFormat("fr-FR").format(
            workspace.analytics.views30d,
          )}
          label="vues sur 30 jours"
          hint="Mesure agrégée"
        />
        <Metric
          icon={MessageSquare}
          value={workspace.analytics.leads30d}
          label="demandes"
          hint="Sources attribuées"
        />
        <Metric
          icon={CalendarDays}
          value={workspace.analytics.appointments30d}
          label="rendez-vous"
          hint="Statuts vérifiables"
        />
        <Metric
          icon={CarFront}
          value={workspace.analytics.sold30d}
          label="véhicules vendus"
          hint="Déclarés vendus"
        />
        <Metric
          icon={BarChart3}
          value={`${workspace.analytics.conversionRatePercent}%`}
          label="conversion"
          hint="Lead vers vendu"
        />
      </div>
      <div className="mt-4 rounded-card border border-border-base bg-bg-surface p-5 shadow-xs">
        <h2 className="text-base font-black">Entonnoir Auto</h2>
        <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
          <div className="rounded-card bg-bg-subtle p-4">
            <strong className="block text-lg">12 840</strong>Vues
          </div>
          <div className="rounded-card bg-bg-subtle p-4">
            <strong className="block text-lg">126</strong>Leads
          </div>
          <div className="rounded-card bg-bg-subtle p-4">
            <strong className="block text-lg">31</strong>RDV
          </div>
          <div className="rounded-card bg-bg-subtle p-4">
            <strong className="block text-lg">18</strong>Vendus
          </div>
        </div>
      </div>
    </section>
  );

  const generic = (
    <section className="rounded-card border border-border-base bg-bg-surface p-6 shadow-xs">
      <h2 className="text-lg font-black">{tab}</h2>
      <p className="mt-2 text-sm text-text-secondary">
        Cette zone utilise les mêmes droits d’organisation, le même catalogue
        marché et les mêmes journaux d’audit que le reste de l’espace Auto.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Metric
          icon={
            tab === "Rendez-vous"
              ? CalendarDays
              : tab === "Sites"
                ? MapPin
                : tab === "Promotions"
                  ? CircleDollarSign
                  : FileClock
          }
          value={
            tab === "Rendez-vous"
              ? 3
              : tab === "Sites"
                ? workspace.locations.length
                : tab === "Promotions"
                  ? workspace.usage.remainingPromotionCredits
                  : 12
          }
          label={tab.toLowerCase()}
          hint="Données structurées"
        />
      </div>
    </section>
  );
  const content =
    tab === "Vue d’ensemble" ? (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            icon={CarFront}
            value={workspace.usage.activeVehicles}
            label="véhicules actifs"
            hint={`${workspace.usage.remainingVehicleSlots} emplacement(s) restant(s)`}
          />
          <Metric
            icon={UsersRound}
            value={workspace.analytics.leads30d}
            label="leads reçus"
            hint="30 derniers jours"
          />
          <Metric
            icon={Clock3}
            value={`${workspace.usage.medianResponseMinutes} min`}
            label="réponse médiane"
            hint="Mesure du service Auto"
          />
          <Metric
            icon={CalendarDays}
            value={workspace.analytics.appointments30d}
            label="rendez-vous"
            hint="30 derniers jours"
          />
        </div>
        {inventory}
        {leads}
      </div>
    ) : tab === "Stock" ? (
      inventory
    ) : tab === "Transferts" ? (
      stockTransfers
    ) : tab === "Leads" ? (
      leads
    ) : tab === "Imports" ? (
      imports
    ) : tab === "Équipe" ? (
      team
    ) : ["Abonnement", "Factures"].includes(tab) ? (
      subscription
    ) : tab === "API" ? (
      api
    ) : tab === "Statistiques" ? (
      analytics
    ) : (
      generic
    );

  return (
    <Container className="py-5 sm:py-7">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <p className="text-xs font-bold text-primary">Shongre Auto Pro</p>
          <h1 className="mt-1 text-2xl font-black">Espace Auto</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <strong>{workspace.organization.name}</strong>
            <Badge variant="verified">Entreprise vérifiée</Badge>
            <span className="text-text-muted">· Lyon Centre</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            to="/deposer/auto"
            size="compact"
            leftIcon={<Plus className="h-icon-sm w-icon-sm" />}
          >
            Ajouter un véhicule
          </Button>
          <Button
            size="compact"
            variant="outline"
            onClick={() => startImport("csv")}
            isLoading={importing}
            leftIcon={<CloudUpload className="h-icon-sm w-icon-sm" />}
          >
            Importer le stock
          </Button>
        </div>
      </div>
      <nav
        aria-label="Sections de l’espace Auto"
        className="mt-5 overflow-x-auto border-b border-border-base"
      >
        <div className="flex min-w-max gap-5">
          {TABS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`border-b-2 px-1 py-3 text-xs font-bold ${tab === item ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text-main"}`}
            >
              {item}
            </button>
          ))}
        </div>
      </nav>
      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <main className="min-w-0">{content}</main>
        <aside className="self-start space-y-4 xl:sticky xl:top-24">
          <section className="rounded-card border border-border-base bg-bg-surface p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black">Plan {plan.name}</p>
              <button
                type="button"
                onClick={() => setTab("Abonnement")}
                className="text-micro font-bold text-primary"
              >
                Gérer
              </button>
            </div>
            <p className="mt-3 text-micro text-text-secondary">
              Véhicules {workspace.usage.activeVehicles} /{" "}
              {plan.entitlements.maxActiveVehicles}
            </p>
            <progress
              className="mt-1 h-1.5 w-full accent-primary"
              value={workspace.usage.activeVehicles}
              max={Math.max(1, plan.entitlements.maxActiveVehicles)}
              aria-label="Utilisation du stock Auto"
            />
            <p className="mt-3 text-micro text-text-secondary">
              Crédits {workspace.usage.remainingPromotionCredits} /{" "}
              {plan.entitlements.monthlyPromotionCredits}
            </p>
            <progress
              className="mt-1 h-1.5 w-full accent-primary"
              value={workspace.usage.remainingPromotionCredits}
              max={Math.max(1, plan.entitlements.monthlyPromotionCredits)}
              aria-label="Crédits de visibilité restants"
            />
          </section>
          <section className="rounded-card border border-border-base bg-bg-surface p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black">Import & synchronisation</p>
              <span className="flex items-center gap-1 text-micro font-bold text-success">
                <CheckCircle2 className="h-icon-xs w-icon-xs" /> Connecté
              </span>
            </div>
            <p className="mt-3 text-micro text-text-muted">
              {latestImport
                ? `Dernier import : ${latestImport.createdCount} ajoutés, ${latestImport.updatedCount} mis à jour, ${latestImport.errorCount} erreur(s) isolée(s).`
                : "Aucun import exécuté pour le moment."}
            </p>
            <Button
              className="mt-3"
              fullWidth
              size="sm"
              variant="outline"
              onClick={() => setTab("Imports")}
              leftIcon={<RefreshCcw className="h-icon-xs w-icon-xs" />}
            >
              Voir les imports
            </Button>
          </section>
          <section className="rounded-card border border-border-base bg-bg-surface p-4 shadow-xs">
            <p className="text-xs font-black">Parrainages partenaires</p>
            <Badge className="mt-2" variant="neutral">
              Phase 2 · inactif
            </Badge>
            <p className="mt-2 text-micro leading-relaxed text-text-muted">
              Aucun partenaire n’est présenté comme approuvé ou disponible.
            </p>
          </section>
        </aside>
      </div>
    </Container>
  );
};
