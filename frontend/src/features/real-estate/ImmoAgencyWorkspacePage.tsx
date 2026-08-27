import React, { useEffect, useState } from "react";
import {
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Download,
  FileSpreadsheet,
  Globe2,
  Inbox,
  MessageSquarePlus,
  PlugZap,
  ReceiptText,
  RefreshCw,
  Settings2,
  Users,
} from "lucide-react";
import type {
  AgencyWorkspace,
  PropertyLead,
} from "@shongre/contracts/real-estate";
import { REAL_ESTATE_CONSTRAINTS } from "@shongre/contracts/real-estate";
import { services } from "../../api/client/service-registry";
import { useToast } from "../../app/providers/ToastProvider";
import {
  Badge,
  Button,
  ScrollableRegion,
  Select,
  Skeleton,
  StatePanel,
} from "../../design-system";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useRegionalFormatters } from "../../hooks/useRegionalFormatters";
import { formatImmoMoney } from "./immo-format";
import { labelIdentifier } from "../../utilities/identifier-label";

type Tab =
  | "overview"
  | "properties"
  | "leads"
  | "visits"
  | "imports"
  | "team"
  | "profile"
  | "billing";

const statusLabels: Record<PropertyLead["status"], string> = {
  new: "Nouveau",
  contacted: "Contacté",
  qualified: "Qualifié",
  visit_planned: "Visite planifiée",
  won: "Gagné",
  lost: "Perdu",
  spam: "Indésirable",
};

export const ImmoAgencyWorkspacePage: React.FC = () => {
  const {
    currentLocale,
    formatDate,
    formatDateTime,
    formatMoney,
    formatNumber,
  } = useRegionalFormatters();
  const toast = useToast();
  const [workspace, setWorkspace] = useState<AgencyWorkspace | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const organizationId = "agency_canopee";

  usePageMeta({
    title: "Espace agence immobilière",
    description:
      "Gérez les biens, leads, visites, imports et performances de votre agence.",
    canonicalPath: "/compte/immo",
    noIndex: true,
  });

  const load = () => {
    setLoading(true);
    services.realEstate
      .getAgencyWorkspace(organizationId)
      .then(setWorkspace)
      .catch((cause) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "Espace agence indisponible.",
        ),
      )
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const updateLead = async (
    lead: PropertyLead,
    status: PropertyLead["status"],
  ) => {
    try {
      const updated = await services.realEstate.updateLead(
        organizationId,
        lead.id,
        { status },
      );
      setWorkspace((current) =>
        current
          ? {
              ...current,
              leads: current.leads.map((item) =>
                item.id === lead.id ? updated : item,
              ),
            }
          : current,
      );
      toast.success("Statut du lead mis à jour.");
    } catch {
      toast.error("Le lead n’a pas pu être mis à jour.");
    }
  };

  const requestImport = async (type: "csv" | "xml") => {
    try {
      const job = await services.realEstate.requestPropertyImport(
        organizationId,
        type,
        `portefeuille-lyon.${type}`,
        `agency-canopee-${type}-20260822`,
      );
      setWorkspace((current) =>
        current
          ? {
              ...current,
              imports: [
                job,
                ...current.imports.filter((item) => item.id !== job.id),
              ],
            }
          : current,
      );
      toast.success(`Import ${labelIdentifier(type)} mis en file d’attente.`);
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Import impossible.",
      );
    }
  };

  const addLeadNote = async (leadId: string) => {
    const body = noteDrafts[leadId]?.trim();
    if (!body) return;
    try {
      const note = await services.realEstate.addLeadNote(
        organizationId,
        leadId,
        body,
      );
      setWorkspace((current) =>
        current
          ? { ...current, leadNotes: [note, ...current.leadNotes] }
          : current,
      );
      setNoteDrafts((current) => ({ ...current, [leadId]: "" }));
      toast.success("Note privée ajoutée.");
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Note non enregistrée.",
      );
    }
  };

  const exportLeads = async () => {
    try {
      const exported =
        await services.realEstate.exportAgencyLeads(organizationId);
      const url = URL.createObjectURL(
        new Blob([`\uFEFF${exported.content}`], { type: exported.mimeType }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = exported.fileName;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Export des leads préparé.");
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Export indisponible.",
      );
    }
  };

  if (loading)
    return (
      <div className="p-5">
        <Skeleton className="h-168 rounded-card" />
      </div>
    );
  if (error || !workspace)
    return (
      <StatePanel
        variant="error"
        title="Espace agence indisponible"
        description={error || "Réessayez plus tard."}
        action={<Button onClick={load}>Réessayer</Button>}
      />
    );

  const nav: [Tab, string, React.ElementType][] = [
    ["overview", "Vue d’ensemble", BarChart3],
    ["properties", "Biens", Building2],
    ["leads", "Leads", Inbox],
    ["visits", "Visites", CalendarDays],
    ["imports", "Imports", FileSpreadsheet],
    ["team", "Équipe", Users],
    ["profile", "Profil & agences", Globe2],
    ["billing", "Offre & crédits", CircleDollarSign],
  ];
  const metrics = [
    ["Biens actifs", workspace.metrics.activeProperties, Building2],
    ["Nouveaux leads", workspace.metrics.newLeads, Inbox],
    ["Visites à venir", workspace.metrics.upcomingVisits, CalendarDays],
    [
      "Taux de réponse",
      `${workspace.metrics.responseRatePercent} %`,
      RefreshCw,
    ],
  ] as const;

  return (
    <div className="space-y-5">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-text-main">
              {workspace.organization.name}
            </h1>
            <Badge variant="success">
              <CheckCircle2 className="mr-1 h-icon-xs w-icon-xs" />
              Agence vérifiée
            </Badge>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            Plan {workspace.organization.planId.replace("immo_agency_", "")} ·{" "}
            {workspace.organization.branchCount} agences ·{" "}
            {workspace.organization.memberCount} membres
          </p>
        </div>
        <Button to="/deposer/immo" variant="primary">
          Publier un bien
        </Button>
      </header>

      <nav
        aria-label="Navigation espace agence"
        className="flex gap-1 overflow-x-auto rounded-card border border-border-base bg-bg-surface p-1.5"
      >
        {nav.map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex min-w-max items-center gap-2 rounded-control px-3 py-2 text-xs font-bold ${tab === id ? "bg-primary text-white" : "text-text-secondary hover:bg-bg-subtle"}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>

      {tab === "overview" ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(([label, value, Icon]) => (
              <article
                key={label}
                className="rounded-card border border-border-base bg-bg-surface p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-text-muted">{label}</p>
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <p className="mt-3 text-2xl font-black text-text-main">
                  {String(value)}
                </p>
              </article>
            ))}
          </section>
          <section className="grid gap-4 xl:grid-cols-agency-content-aside">
            <div className="rounded-card border border-border-base bg-bg-surface p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black">Leads récents</h2>
                  <p className="text-micro text-text-muted">
                    Coordonnées protégées jusqu’à l’ouverture autorisée du lead.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setTab("leads")}
                >
                  Tout voir
                </Button>
              </div>
              <div className="mt-4 divide-y divide-border-subtle">
                {workspace.leads.slice(0, 4).map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="text-xs font-black">
                        {lead.requesterName} ·{" "}
                        {lead.type === "visit" ? "Visite" : "Information"}
                      </p>
                      <p className="mt-0.5 text-micro text-text-muted">
                        {lead.contactDetailsReleased
                          ? lead.requesterEmail
                          : "Coordonnées masquées"}
                      </p>
                    </div>
                    <Badge
                      variant={lead.status === "new" ? "warning" : "neutral"}
                    >
                      {statusLabels[lead.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-card border border-border-base bg-bg-surface p-5">
              <h2 className="text-sm font-black">Performance</h2>
              <dl className="mt-4 space-y-4 text-xs">
                <div className="flex justify-between">
                  <dt className="text-text-muted">Vues</dt>
                  <dd className="font-black">
                    {formatNumber(workspace.metrics.views)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-muted">Recherche → contact</dt>
                  <dd className="font-black">
                    {workspace.metrics.searchToContactRatePercent} %
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-muted">Réponse médiane</dt>
                  <dd className="font-black">
                    {workspace.metrics.medianResponseMinutes} min
                  </dd>
                </div>
              </dl>
              <p className="mt-5 rounded-control bg-bg-subtle p-3 text-micro text-text-secondary">
                Métriques agrégées et minimisées. Aucun score de fraude n’est
                exposé ici.
              </p>
            </div>
          </section>
        </>
      ) : null}

      {tab === "properties" ? (
        <div className="space-y-4">
          <section className="overflow-hidden rounded-card border border-border-base bg-bg-surface">
            <div className="flex items-center justify-between border-b border-border-base p-4">
              <div>
                <h2 className="text-sm font-black">Portefeuille immobilier</h2>
                <p className="text-micro text-text-muted">
                  Publication, visibilité et disponibilité.
                </p>
              </div>
              <Button size="sm" to="/deposer/immo">
                Ajouter
              </Button>
            </div>
            <ScrollableRegion aria-label="Tableau du portefeuille immobilier">
              <table className="w-full min-w-168 text-left text-xs">
                <thead className="bg-bg-subtle text-text-muted">
                  <tr>
                    <th className="p-3">Bien</th>
                    <th className="p-3">Prix</th>
                    <th className="p-3">Statut</th>
                    <th className="p-3">Promotion</th>
                    <th className="p-3">Agence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {workspace.properties.map((property) => (
                    <tr key={property.id}>
                      <td className="p-3">
                        <p className="font-black">{property.title}</p>
                        <p className="text-micro text-text-muted">
                          {property.address.publicLabel}
                        </p>
                      </td>
                      <td className="p-3 font-bold">
                        {formatImmoMoney(
                          property.financials.price,
                          currentLocale,
                        )}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            property.lifecycle === "published"
                              ? "success"
                              : "warning"
                          }
                        >
                          {property.lifecycle === "published"
                            ? "Publié"
                            : property.lifecycle}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {property.promotion.featured
                          ? "À la une"
                          : property.promotion.urgent
                            ? "Urgent"
                            : "Standard"}
                      </td>
                      <td className="p-3">
                        {workspace.branches.find(
                          (item) => item.id === property.branchId,
                        )?.name || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollableRegion>
          </section>
          <section className="rounded-card border border-border-base bg-bg-surface p-4">
            <h2 className="text-sm font-black">Brouillons de l’agence</h2>
            <p className="mt-1 text-micro text-text-muted">
              Reprenez une publication au dernier écran enregistré.
            </p>
            {workspace.drafts.length ? (
              <div className="mt-3 divide-y divide-border-subtle">
                {workspace.drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center"
                  >
                    <div>
                      <p className="text-xs font-black">
                        {(draft.data.title as string) || "Bien sans titre"}
                      </p>
                      <p className="text-micro text-text-muted">
                        Étape {draft.currentStep}/10 · enregistré le{" "}
                        {formatDateTime(draft.updatedAt)}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" to="/deposer/immo">
                      Reprendre
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-text-muted">
                Aucun brouillon partagé.
              </p>
            )}
          </section>
        </div>
      ) : null}

      {tab === "leads" ? (
        <section className="rounded-card border border-border-base bg-bg-surface p-4">
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-sm font-black">
                Boîte de réception des leads
              </h2>
              <p className="text-micro text-text-muted">
                Assignation, rappel, notes privées et pipeline commercial.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Download className="h-icon-md w-icon-md" />}
              onClick={exportLeads}
            >
              Exporter en CSV
            </Button>
          </div>
          <div className="space-y-3">
            {workspace.leads.map((lead) => (
              <article
                key={lead.id}
                className="grid gap-3 rounded-control border border-border-base p-4 md:grid-cols-agency-fields"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black">{lead.requesterName}</p>
                    <Badge
                      variant={lead.status === "new" ? "warning" : "neutral"}
                    >
                      {statusLabels[lead.status]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">
                    {lead.message}
                  </p>
                  <p className="mt-2 text-micro text-text-muted">
                    {lead.contactDetailsReleased
                      ? `${lead.requesterEmail} · ${lead.requesterPhone || "sans téléphone"}`
                      : "Coordonnées masquées — accès soumis aux règles du plan et du lead"}
                  </p>
                </div>
                <label className="text-micro font-bold">
                  Statut
                  <Select
                    size="compact"
                    className="mt-1 w-full"
                    labelledByAncestor
                    value={lead.status}
                    onChange={(event) =>
                      updateLead(
                        lead,
                        event.target.value as PropertyLead["status"],
                      )
                    }
                  >
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="text-micro font-bold">
                  Assigné à
                  <Select
                    size="compact"
                    className="mt-1 w-full"
                    labelledByAncestor
                    value={lead.assignedUserId || ""}
                    onChange={async (event) => {
                      const updated = await services.realEstate.updateLead(
                        organizationId,
                        lead.id,
                        { assignedUserId: event.target.value || undefined },
                      );
                      setWorkspace({
                        ...workspace,
                        leads: workspace.leads.map((item) =>
                          item.id === lead.id ? updated : item,
                        ),
                      });
                    }}
                  >
                    <option value="">Non assigné</option>
                    {workspace.members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </Select>
                </label>
                <div className="grid gap-3 border-t border-border-subtle pt-3 md:col-span-3 md:grid-cols-media-content-md">
                  <label className="text-micro font-bold">
                    Prochain rappel
                    <input
                      type="datetime-local"
                      className="mt-1 h-control-md w-full rounded-control border border-border-base bg-white px-2 text-xs"
                      value={lead.nextReminderAt?.slice(0, 16) || ""}
                      onChange={async (event) => {
                        const value = event.target.value;
                        const updated = await services.realEstate.updateLead(
                          organizationId,
                          lead.id,
                          {
                            nextReminderAt: value
                              ? new Date(value).toISOString()
                              : undefined,
                          },
                        );
                        setWorkspace({
                          ...workspace,
                          leads: workspace.leads.map((item) =>
                            item.id === lead.id ? updated : item,
                          ),
                        });
                      }}
                    />
                  </label>
                  <div>
                    <label
                      className="text-micro font-bold"
                      htmlFor={`note-${lead.id}`}
                    >
                      Note privée
                    </label>
                    <div className="mt-1 flex gap-2">
                      <input
                        id={`note-${lead.id}`}
                        className="h-control-md min-w-0 flex-1 rounded-control border border-border-base bg-white px-3 text-xs"
                        value={noteDrafts[lead.id] || ""}
                        maxLength={REAL_ESTATE_CONSTRAINTS.leadNote.maxLength}
                        placeholder="Ex. rappeler après 18 h"
                        onChange={(event) =>
                          setNoteDrafts((current) => ({
                            ...current,
                            [lead.id]: event.target.value,
                          }))
                        }
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label={`Ajouter une note pour ${lead.requesterName}`}
                        disabled={!noteDrafts[lead.id]?.trim()}
                        onClick={() => addLeadNote(lead.id)}
                      >
                        <MessageSquarePlus className="h-icon-md w-icon-md" />
                      </Button>
                    </div>
                    {workspace.leadNotes
                      .filter((note) => note.leadId === lead.id)
                      .slice(0, 2)
                      .map((note) => (
                        <p
                          key={note.id}
                          className="mt-2 rounded-control bg-bg-subtle px-3 py-2 text-micro text-text-secondary"
                        >
                          {note.body}
                        </p>
                      ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "visits" ? (
        <section className="rounded-card border border-border-base bg-bg-surface p-4">
          <h2 className="text-sm font-black">Visites et rendez-vous</h2>
          <div className="mt-4 space-y-3">
            {workspace.appointments.map((visit) => (
              <article
                key={visit.id}
                className="flex flex-col justify-between gap-3 rounded-control border border-border-base p-4 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="text-sm font-black">
                    {formatDate(visit.startsAt, {
                      dateStyle: "full",
                      timeStyle: "short",
                    })}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    Bien {visit.propertyId} · durée 30 min
                  </p>
                </div>
                <Badge
                  variant={visit.status === "confirmed" ? "success" : "warning"}
                >
                  {visit.status === "confirmed" ? "Confirmée" : "À confirmer"}
                </Badge>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "imports" ? (
        <section className="grid gap-4 lg:grid-cols-sidebar-wide">
          <div className="rounded-card border border-border-base bg-bg-surface p-5">
            <h2 className="text-sm font-black">Importer un portefeuille</h2>
            <p className="mt-2 text-xs text-text-muted">
              Les quotas, formats et droits proviennent de votre offre.
            </p>
            <div className="mt-4 space-y-2">
              <Button
                className="w-full"
                variant="outline"
                onClick={() => requestImport("csv")}
                leftIcon={<FileSpreadsheet className="h-icon-md w-icon-md" />}
              >
                Importer un CSV
              </Button>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => requestImport("xml")}
                leftIcon={<Download className="h-icon-md w-icon-md" />}
              >
                Déclarer un flux XML
              </Button>
            </div>
            <dl className="mt-5 space-y-2 border-t border-border-subtle pt-4 text-micro">
              {[
                ["CSV", workspace.integrationSettings.csvImportEnabled],
                ["XML", workspace.integrationSettings.xmlImportEnabled],
                [
                  "Synchronisation",
                  workspace.integrationSettings.automaticSyncEnabled,
                ],
                ["API", workspace.integrationSettings.apiAccessEnabled],
              ].map(([label, enabled]) => (
                <div key={String(label)} className="flex justify-between gap-3">
                  <dt className="text-text-muted">{String(label)}</dt>
                  <dd className="font-bold">
                    {enabled ? "Activé" : "Non inclus"}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="rounded-card border border-border-base bg-bg-surface p-5">
            <h2 className="text-sm font-black">Historique</h2>
            <div className="mt-4 divide-y divide-border-subtle">
              {workspace.imports.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p className="text-xs font-black">
                      {job.fileName ||
                        `${labelIdentifier(job.type)} automatique`}
                    </p>
                    <p className="text-micro text-text-muted">
                      {job.importedCount} importés · {job.rejectedCount} rejetés
                    </p>
                  </div>
                  <Badge
                    variant={
                      job.status === "completed"
                        ? "success"
                        : job.status === "failed"
                          ? "urgent"
                          : "warning"
                    }
                  >
                    {labelIdentifier(job.status)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {tab === "team" ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-card border border-border-base bg-bg-surface p-5">
            <h2 className="text-sm font-black">Membres</h2>
            <div className="mt-4 divide-y divide-border-subtle">
              {workspace.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="text-xs font-black">{member.name}</p>
                    <p className="text-micro text-text-muted">
                      {member.branchIds.length} agence(s)
                    </p>
                  </div>
                  <Badge>{labelIdentifier(member.role)}</Badge>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-card border border-border-base bg-bg-surface p-5">
            <h2 className="text-sm font-black">Agences</h2>
            <div className="mt-4 divide-y divide-border-subtle">
              {workspace.branches.map((branch) => (
                <div
                  key={branch.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="text-xs font-black">{branch.name}</p>
                    <p className="text-micro text-text-muted">{branch.city}</p>
                  </div>
                  <span className="text-xs font-bold">
                    {branch.activePropertyCount} biens
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {tab === "profile" ? (
        <section className="grid gap-4 lg:grid-cols-agency-content-aside-secondary">
          <div className="rounded-card border border-border-base bg-bg-surface p-5">
            <Globe2 className="h-icon-xl w-icon-xl text-primary" />
            <h2 className="mt-3 text-sm font-black">
              Profil public de l’agence
            </h2>
            <p className="mt-3 text-xs leading-relaxed text-text-secondary">
              {workspace.organization.profile.description ||
                "Aucune présentation publique enregistrée."}
            </p>
            <dl className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">Site</dt>
                <dd className="font-bold">
                  {workspace.organization.profile.website || "Non renseigné"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">E-mail public</dt>
                <dd className="font-bold">
                  {workspace.organization.profile.publicEmail ||
                    "Non renseigné"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">Téléphone public</dt>
                <dd className="font-bold">
                  {workspace.organization.profile.publicPhone ||
                    "Non renseigné"}
                </dd>
              </div>
            </dl>
          </div>
          <div className="rounded-card border border-border-base bg-bg-surface p-5">
            <PlugZap className="h-icon-xl w-icon-xl text-primary" />
            <h2 className="mt-3 text-sm font-black">Import & API</h2>
            <p className="mt-2 text-xs text-text-secondary">
              Les capacités sont résolues depuis l’offre active, sans test sur
              le nom du plan.
            </p>
            <p className="mt-4 text-micro text-text-muted">
              Dernière synchronisation réussie :{" "}
              {workspace.integrationSettings.lastSuccessfulSyncAt
                ? formatDateTime(
                    workspace.integrationSettings.lastSuccessfulSyncAt,
                  )
                : "aucune"}
            </p>
          </div>
        </section>
      ) : null}

      {tab === "billing" ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-card border border-border-base bg-bg-surface p-5">
            <Settings2 className="h-icon-xl w-icon-xl text-primary" />
            <h2 className="mt-3 text-sm font-black">
              {workspace.subscription.offerName}
            </h2>
            <p className="mt-2 text-xs text-text-secondary">
              Statut : {labelIdentifier(workspace.subscription.status)}. Les
              droits effectifs restent issus du catalogue d’entitlements du
              marché.
            </p>
            {workspace.subscription.renewsAt ? (
              <p className="mt-3 text-micro text-text-muted">
                Prochaine échéance :{" "}
                {formatDate(workspace.subscription.renewsAt, {
                  dateStyle: "long",
                })}
              </p>
            ) : null}
          </div>
          <div className="rounded-card border border-border-base bg-bg-surface p-5">
            <CircleDollarSign className="h-icon-xl w-icon-xl text-primary" />
            <h2 className="mt-3 text-sm font-black">Crédits visibilité</h2>
            <p className="mt-2 text-3xl font-black">
              {formatNumber(workspace.visibilityCredits.available)}
            </p>
            <p className="text-xs text-text-muted">
              sur {formatNumber(workspace.visibilityCredits.included)} inclus ce
              mois
            </p>
          </div>
          <div className="rounded-card border border-border-base bg-bg-surface p-5 lg:col-span-2">
            <div className="flex items-center gap-2">
              <ReceiptText className="h-icon-lg w-icon-lg text-primary" />
              <h2 className="text-sm font-black">Factures</h2>
            </div>
            {workspace.invoices.length ? (
              <div className="mt-4 divide-y divide-border-subtle">
                {workspace.invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between gap-3 py-3 text-xs"
                  >
                    <div>
                      <p className="font-black">{invoice.invoiceId}</p>
                      <p className="text-micro text-text-muted">
                        {formatDate(invoice.issuedAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-black">{formatMoney(invoice.total)}</p>
                      <Badge
                        variant={
                          invoice.status === "paid" ? "success" : "neutral"
                        }
                      >
                        {invoice.status === "paid" ? "Payée" : "Remboursée"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-text-muted">
                Aucune facture disponible.
              </p>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
};
