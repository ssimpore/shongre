import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  CarFront,
  FileClock,
  Layers3,
  MessageSquare,
  Settings2,
  ShieldCheck,
  Store,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import type {
  AutoAdminOverview,
  AutoAddOn,
  AutoPlan,
  VehicleTypeConfig,
} from "@shongre/contracts/auto";
import { services } from "../../api/client/service-registry";
import { useToast } from "../../app/providers/ToastProvider";
import { Badge, Button, Skeleton, StatePanel } from "../../design-system";
import { usePageMeta } from "../../hooks/usePageMeta";
import { routes } from "../../configuration/routes";
import { formatAutoMoney } from "./auto-format";

const TABS = [
  "Vue d’ensemble",
  "Types & attributs",
  "Formules",
  "Modération",
  "Imports",
  "Partenaires",
  "Journaux",
] as const;
type Tab = (typeof TABS)[number];

export const AdminAutoPage: React.FC = () => {
  const toast = useToast();
  const [overview, setOverview] = useState<AutoAdminOverview | null>(null);
  const [tab, setTab] = useState<Tab>("Vue d’ensemble");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  usePageMeta({
    title: "Administration Shongre Auto",
    description:
      "Configuration des marchés, schémas, offres, modération et opérations de Shongre Auto.",
    canonicalPath: "/admin/auto",
    noIndex: true,
  });
  const load = () => {
    setLoading(true);
    services.auto
      .getAdminOverview("FR")
      .then(setOverview)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);
  if (loading) return <Skeleton className="h-[46rem] rounded-card" />;
  if (error || !overview)
    return (
      <StatePanel
        variant="error"
        title="Administration Auto indisponible"
        description="Le catalogue administratif n’a pas pu être chargé."
        action={<Button onClick={load}>Réessayer</Button>}
      />
    );

  const updateType = async (type: VehicleTypeConfig) => {
    try {
      const next = await services.auto.updateVehicleType("FR", type.type, {
        isActive: !type.isActive,
      });
      setOverview({
        ...overview,
        catalog: {
          ...overview.catalog,
          vehicleTypes: overview.catalog.vehicleTypes.map((row) =>
            row.type === next.type ? next : row,
          ),
        },
      });
      toast.success(`${type.label} ${next.isActive ? "activé" : "désactivé"}.`);
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Modification refusée.",
      );
    }
  };

  const togglePlan = async (plan: AutoPlan) => {
    try {
      const next = await services.auto.updatePlan("FR", plan.id, {
        isActive: !plan.isActive,
      });
      setOverview({
        ...overview,
        catalog: {
          ...overview.catalog,
          plans: overview.catalog.plans.map((candidate) =>
            candidate.id === next.id ? next : candidate,
          ),
        },
      });
      toast.success(
        `${plan.name} ${next.isActive ? "activée" : "désactivée"}.`,
      );
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Modification refusée.",
      );
    }
  };

  const toggleAddOn = async (addOn: AutoAddOn) => {
    try {
      const next = await services.auto.updateAddOn("FR", addOn.id, {
        isActive: !addOn.isActive,
      });
      setOverview({
        ...overview,
        catalog: {
          ...overview.catalog,
          addOns: overview.catalog.addOns.map((candidate) =>
            candidate.id === next.id ? next : candidate,
          ),
        },
      });
      toast.success(
        `${addOn.name} ${next.isActive ? "activée" : "désactivée"}.`,
      );
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Modification refusée.",
      );
    }
  };

  const metrics = [
    [CarFront, overview.metrics.activeVehicles, "véhicules actifs"],
    [
      AlertTriangle,
      overview.metrics.pendingModeration,
      "en attente de modération",
    ],
    [Store, overview.metrics.dealers, "concessions"],
    [MessageSquare, overview.metrics.newLeads30d, "leads sur 30 jours"],
    [ShieldCheck, overview.metrics.duplicateSignals30d, "signaux de doublon"],
  ] as const;

  const content =
    tab === "Vue d’ensemble" ? (
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {metrics.map(([Icon, value, label]) => (
            <div
              key={label}
              className="rounded-card border border-border-base bg-bg-surface p-4 shadow-xs"
            >
              <Icon className="h-icon-md w-icon-md text-primary" />
              <p className="mt-3 text-2xl font-black">
                {new Intl.NumberFormat("fr-FR").format(value)}
              </p>
              <p className="text-xs text-text-secondary">{label}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <section className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs">
            <h2 className="text-base font-black">Configuration du marché FR</h2>
            <dl className="mt-4 divide-y divide-border-subtle text-xs">
              {Object.entries(overview.catalog.config.featureFlags).map(
                ([flag, enabled]) => (
                  <div
                    key={flag}
                    className="flex items-center justify-between py-2.5"
                  >
                    <dt className="font-mono text-micro text-text-secondary">
                      {flag}
                    </dt>
                    <dd>
                      <Badge variant={enabled ? "success" : "neutral"}>
                        {enabled ? "Actif" : "Inactif"}
                      </Badge>
                    </dd>
                  </div>
                ),
              )}
            </dl>
          </section>
          <section className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs">
            <h2 className="text-base font-black">Garde-fous actifs</h2>
            <ul className="mt-4 space-y-3 text-xs text-text-secondary">
              <li className="flex gap-2">
                <ShieldCheck className="h-icon-sm w-icon-sm text-success" /> VIN
                et immatriculation privés, recherchés par hash.
              </li>
              <li className="flex gap-2">
                <ShieldCheck className="h-icon-sm w-icon-sm text-success" />{" "}
                Prix, droits et activation pilotés par marché.
              </li>
              <li className="flex gap-2">
                <ShieldCheck className="h-icon-sm w-icon-sm text-success" />{" "}
                Paiements et parrainages partenaires désactivés.
              </li>
              <li className="flex gap-2">
                <ShieldCheck className="h-icon-sm w-icon-sm text-success" />{" "}
                Imports asynchrones et conflits isolés.
              </li>
            </ul>
          </section>
        </div>
      </div>
    ) : tab === "Types & attributs" ? (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="rounded-card border border-border-base bg-bg-surface shadow-xs">
          <div className="border-b border-border-subtle p-4">
            <h2 className="text-base font-black">Types de véhicules</h2>
            <p className="mt-1 text-xs text-text-secondary">
              Version de schéma, champs requis et filtres sont configurables par
              type.
            </p>
          </div>
          <div className="divide-y divide-border-subtle">
            {overview.catalog.vehicleTypes.map((type) => (
              <div
                key={type.type}
                className="flex items-center justify-between gap-4 p-4"
              >
                <div>
                  <p className="text-xs font-bold">{type.label}</p>
                  <p className="mt-1 text-micro text-text-muted">
                    Schéma v{type.schemaVersion} ·{" "}
                    {type.requiredFieldIds.length} requis ·{" "}
                    {type.filterFieldIds.length} filtres
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateType(type)}
                  aria-label={`${type.isActive ? "Désactiver" : "Activer"} ${type.label}`}
                  className={type.isActive ? "text-success" : "text-text-muted"}
                >
                  {type.isActive ? (
                    <ToggleRight className="h-icon-lg w-icon-lg" />
                  ) : (
                    <ToggleLeft className="h-icon-lg w-icon-lg" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-card border border-border-base bg-bg-surface p-4 shadow-xs">
          <h2 className="text-sm font-black">Registre d’attributs</h2>
          <div className="mt-3 space-y-2">
            {overview.catalog.attributes.map((attribute) => (
              <div
                key={attribute.id}
                className="rounded-control bg-bg-subtle p-3"
              >
                <p className="text-xs font-bold">{attribute.label}</p>
                <p className="mt-1 text-micro text-text-muted">
                  {attribute.fieldType}
                  {attribute.unit ? ` · ${attribute.unit}` : ""} ·{" "}
                  {attribute.isFilterable ? "filtrable" : "non filtrable"}
                </p>
              </div>
            ))}
          </div>
          <Button
            to={routes.admin.taxonomy({ tab: "attributes", node: "vehicles" })}
            className="mt-4"
            fullWidth
            variant="outline"
            size="compact"
          >
            Gérer les attributs
          </Button>
        </section>
      </div>
    ) : tab === "Formules" ? (
      <section className="rounded-card border border-border-base bg-bg-surface shadow-xs">
        <div className="border-b border-border-subtle p-4">
          <h2 className="text-base font-black">Formules et droits</h2>
          <p className="mt-1 text-xs text-text-secondary">
            Les montants sont en unités mineures et les composants ne
            contiennent aucun prix commercial.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] text-left text-xs">
            <thead className="bg-bg-subtle text-micro uppercase text-text-muted">
              <tr>
                <th className="px-4 py-3">Formule</th>
                <th className="px-4 py-3">Audience</th>
                <th className="px-4 py-3">Mensuel</th>
                <th className="px-4 py-3">Véhicules</th>
                <th className="px-4 py-3">Équipe / Sites</th>
                <th className="px-4 py-3">Imports</th>
                <th className="px-4 py-3">État</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {overview.catalog.plans.map((plan) => (
                <tr key={plan.id}>
                  <td className="px-4 py-3 font-bold">{plan.name}</td>
                  <td className="px-4 py-3">{plan.audience}</td>
                  <td className="px-4 py-3">
                    {plan.monthlyPrice
                      ? formatAutoMoney(plan.monthlyPrice)
                      : "Gratuit"}
                  </td>
                  <td className="px-4 py-3">
                    {plan.entitlements.maxActiveVehicles}
                  </td>
                  <td className="px-4 py-3">
                    {plan.entitlements.maxTeamMembers} /{" "}
                    {plan.entitlements.maxLocations}
                  </td>
                  <td className="px-4 py-3">
                    {[
                      plan.entitlements.inventoryCsvImport && "CSV",
                      plan.entitlements.inventoryXmlImport && "XML",
                      plan.entitlements.inventoryApiSync && "API",
                    ]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => togglePlan(plan)}
                      aria-label={`${plan.isActive ? "Désactiver" : "Activer"} ${plan.name}`}
                      className={
                        plan.isActive ? "text-success" : "text-text-muted"
                      }
                    >
                      {plan.isActive ? (
                        <ToggleRight className="h-icon-lg w-icon-lg" />
                      ) : (
                        <ToggleLeft className="h-icon-lg w-icon-lg" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border-subtle p-4">
          <h3 className="text-sm font-black">Options et parrainages</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {overview.catalog.addOns.map((addOn) => (
              <div
                key={addOn.id}
                className="flex items-center justify-between gap-3 rounded-control bg-bg-subtle p-3 text-xs"
              >
                <div>
                  <p className="font-bold">{addOn.name}</p>
                  <p className="mt-1 text-micro text-text-muted">
                    {formatAutoMoney(addOn.price)} · {addOn.type}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleAddOn(addOn)}
                  aria-label={`${addOn.isActive ? "Désactiver" : "Activer"} ${addOn.name}`}
                  className={
                    addOn.isActive ? "text-success" : "text-text-muted"
                  }
                >
                  {addOn.isActive ? (
                    <ToggleRight className="h-icon-lg w-icon-lg" />
                  ) : (
                    <ToggleLeft className="h-icon-lg w-icon-lg" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    ) : tab === "Imports" ? (
      <section className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs">
        <h2 className="text-base font-black">Derniers imports</h2>
        <div className="mt-4 divide-y divide-border-subtle">
          {overview.recentImports.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs"
            >
              <div>
                <p className="font-bold">
                  {item.fileName || item.type.toUpperCase()}
                </p>
                <p className="text-micro text-text-muted">{item.requestedAt}</p>
              </div>
              <p>
                {item.createdCount} créés · {item.updatedCount} mis à jour ·{" "}
                {item.errorCount} erreur
              </p>
              <Badge variant={item.errorCount ? "warning" : "success"}>
                {item.status}
              </Badge>
            </div>
          ))}
        </div>
      </section>
    ) : tab === "Partenaires" ? (
      <section className="rounded-card border border-warning-border bg-warning-surface p-5">
        <h2 className="text-base font-black">
          Parrainages partenaires — inactifs
        </h2>
        <p className="mt-2 max-w-3xl text-xs leading-relaxed text-text-secondary">
          Financement, assurance, inspection, garantie, livraison et reprise
          sont modélisés comme des enregistrements de parrainage consentis.
          Aucun routage n’est activé et aucun partenaire n’est présenté comme
          approuvé tant que contrat, base légale, texte de consentement et
          contrôle opérationnel ne sont pas validés.
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            "Financement",
            "Assurance",
            "Inspection",
            "Garantie",
            "Livraison",
            "Reprise",
          ].map((label) => (
            <div key={label} className="rounded-card bg-bg-surface p-4">
              <dt className="text-xs font-bold">{label}</dt>
              <dd className="mt-2">
                <Badge variant="neutral">Inactif</Badge>
              </dd>
            </div>
          ))}
        </dl>
      </section>
    ) : (
      <section className="rounded-card border border-border-base bg-bg-surface p-6 shadow-xs">
        <div className="flex gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-card bg-primary-light text-primary">
            {tab === "Modération" ? (
              <ShieldCheck className="h-icon-md w-icon-md" />
            ) : tab === "Journaux" ? (
              <FileClock className="h-icon-md w-icon-md" />
            ) : (
              <Layers3 className="h-icon-md w-icon-md" />
            )}
          </span>
          <div>
            <h2 className="text-base font-black">{tab}</h2>
            <p className="mt-1 text-xs text-text-secondary">
              Vue opérationnelle spécialisée Auto, filtrée par marché et
              protégée par la permission sensible <code>auto.admin.manage</code>
              .
            </p>
          </div>
        </div>
      </section>
    );

  return (
    <div>
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold text-primary">
            <Settings2 className="h-icon-sm w-icon-sm" /> Verticale spécialisée
          </p>
          <h1 className="mt-1 text-2xl font-black">
            Administration Shongre Auto
          </h1>
          <p className="mt-1 text-xs text-text-secondary">
            Marché France · schéma v{overview.catalog.config.schemaVersion}
          </p>
        </div>
        <Badge
          variant={overview.catalog.config.isEnabled ? "success" : "warning"}
        >
          {overview.catalog.config.isEnabled
            ? "Verticale active"
            : "Verticale inactive"}
        </Badge>
      </div>
      <nav
        aria-label="Sections d’administration Auto"
        className="mb-5 overflow-x-auto border-b border-border-base"
      >
        <div className="flex min-w-max gap-5">
          {TABS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`border-b-2 px-1 py-3 text-xs font-bold ${tab === item ? "border-primary text-primary" : "border-transparent text-text-secondary"}`}
            >
              {item}
            </button>
          ))}
        </div>
      </nav>
      {content}
    </div>
  );
};
