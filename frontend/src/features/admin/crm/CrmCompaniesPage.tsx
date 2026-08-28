import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Bookmark,
  BookmarkPlus,
  Building2,
  ExternalLink,
  MapPin,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from "lucide-react";
import type {
  CrmAccount,
  CrmSavedView,
  CrmSavedViewVisibility,
} from "@shongre/contracts/crm";
import { CRM_FIELD_CONSTRAINTS } from "@shongre/contracts/crm";
import { services } from "../../../api/client/service-registry";
import { Button } from "../../../design-system/primitives/Button";
import { Modal } from "../../../design-system/primitives/Modal";
import {
  FormField,
  Input,
  Select,
  Textarea,
} from "../../../design-system/primitives/FormField";
import { Skeleton } from "../../../design-system";
import { useAuth } from "../../../app/providers/AuthProvider";
import { useToast } from "../../../app/providers/ToastProvider";
import { useMarketLocation } from "../../../app/providers/MarketLocationProvider";
import { usePageMeta } from "../../../hooks/usePageMeta";
import { useTranslation } from "../../../i18n/I18nProvider";
import { useCrmSurface } from "../../crm/CrmSurfaceContext";

const lifecycleLabel: Record<CrmAccount["lifecycle"], string> = {
  lead: "Lead",
  prospect: "Prospect",
  qualified: "Qualifié",
  customer: "Client",
  partner: "Partenaire",
  do_not_contact: "Ne pas contacter",
  archived: "Archivé",
};

const lifecycleTone: Record<CrmAccount["lifecycle"], string> = {
  lead: "bg-info-surface text-info",
  prospect: "bg-warning-surface text-warning",
  qualified: "bg-primary-light text-primary",
  customer: "bg-success-surface text-success",
  partner: "bg-violet-50 text-violet-700",
  do_not_contact: "bg-danger-surface text-danger",
  archived: "bg-stone-100 text-stone-600",
};

export const CrmCompaniesPage: React.FC = () => {
  const { t } = useTranslation();
  const { activeMarket, currentLocale } = useMarketLocation();
  const toast = useToast();
  const { can } = useAuth();
  const crmPaths = useCrmSurface();
  const location = useLocation();
  const isListsSurface =
    crmPaths.kind === "prospects" && location.pathname === crmPaths.lists;
  const canManageSharedViews = can("crm.configuration.manage");
  const [accounts, setAccounts] = useState<CrmAccount[]>([]);
  const [savedViews, setSavedViews] = useState<CrmSavedView[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [lifecycle, setLifecycle] = useState<CrmAccount["lifecycle"] | "all">(
    "all",
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [deleteView, setDeleteView] = useState<CrmSavedView | null>(null);
  const [selectedViewId, setSelectedViewId] = useState("");
  const [viewName, setViewName] = useState("");
  const [viewVisibility, setViewVisibility] =
    useState<CrmSavedViewVisibility>("personal");
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");

  usePageMeta({
    title: t("meta.crmCompanies.title"),
    description: t("meta.crmCompanies.description"),
    canonicalPath: isListsSurface ? crmPaths.lists : crmPaths.companies,
    noIndex: true,
  });

  const load = async () => {
    setLoading(true);
    try {
      const [accountPage, views] = await Promise.all([
        services.crm.listAccounts({ limit: 100 }),
        services.crm.listSavedViews("account"),
      ]);
      setAccounts(accountPage.items);
      setSavedViews(views);
    } catch (reason) {
      toast.error(
        reason instanceof Error
          ? reason.message
          : "Impossible de charger les entreprises.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [activeMarket.code]);

  const applySavedView = (viewId: string) => {
    setSelectedViewId(viewId);
    if (!viewId) {
      setSearch("");
      setLifecycle("all");
      return;
    }
    const view = savedViews.find((item) => item.id === viewId);
    if (!view) return;
    const configuredLifecycle = view.filterDefinition.lifecycle;
    const allowedLifecycles = new Set<CrmAccount["lifecycle"]>([
      "lead",
      "prospect",
      "qualified",
      "customer",
      "partner",
      "do_not_contact",
      "archived",
    ]);
    setLifecycle(
      typeof configuredLifecycle === "string" &&
        allowedLifecycles.has(configuredLifecycle as CrmAccount["lifecycle"])
        ? (configuredLifecycle as CrmAccount["lifecycle"])
        : "all",
    );
    setSearch(
      typeof view.filterDefinition.query === "string"
        ? view.filterDefinition.query
        : "",
    );
  };

  const saveCurrentView = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!viewName.trim()) return;
    setSubmitting(true);
    try {
      const view = await services.crm.createSavedView({
        entityType: "account",
        name: viewName.trim(),
        visibility: viewVisibility,
        filterDefinition: {
          ...(lifecycle === "all" ? {} : { lifecycle }),
          ...(search.trim() ? { query: search.trim() } : {}),
        },
        sortDefinition: [{ field: "updatedAt", direction: "desc" }],
        visibleColumns: [],
        columnOrder: [],
      });
      setSavedViews((items) => [view, ...items]);
      setSelectedViewId(view.id);
      setViewName("");
      setViewVisibility("personal");
      setSaveViewOpen(false);
      toast.success("Vue enregistrée.");
    } catch (reason) {
      toast.error(
        reason instanceof Error
          ? reason.message
          : "Impossible d’enregistrer cette vue.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const removeSavedView = async () => {
    if (!deleteView) return;
    setSubmitting(true);
    try {
      await services.crm.deleteSavedView(deleteView.id, deleteView.version);
      setSavedViews((items) =>
        items.filter((item) => item.id !== deleteView.id),
      );
      if (selectedViewId === deleteView.id) applySavedView("");
      setDeleteView(null);
      toast.success("Vue supprimée.");
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Suppression impossible.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");
    return accounts.filter(
      (account) =>
        (crmPaths.kind === "admin" ||
          account.marketCode === activeMarket.code) &&
        (lifecycle === "all" || account.lifecycle === lifecycle) &&
        (!query ||
          account.name.toLocaleLowerCase("fr").includes(query) ||
          account.industry?.toLocaleLowerCase("fr").includes(query) ||
          account.domain?.toLocaleLowerCase("fr").includes(query)),
    );
  }, [accounts, activeMarket.code, crmPaths.kind, lifecycle, search]);

  const createAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const created = await services.crm.createAccount({
        name: name.trim(),
        website: website.trim() || undefined,
        domain: website.trim()
          ? new URL(website).hostname.replace(/^www\./, "")
          : undefined,
        industry: industry.trim() || undefined,
        city: city.trim() || undefined,
        description: description.trim() || undefined,
        country: activeMarket.code,
        marketCode: activeMarket.code,
        lifecycle: "prospect",
        source: "manual",
      });
      setAccounts((items) => [created, ...items]);
      setCreateOpen(false);
      setName("");
      setWebsite("");
      setIndustry("");
      setCity("");
      setDescription("");
      toast.success("Entreprise ajoutée au CRM.");
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Création impossible.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-8">
      <section className="rounded-2xl border border-stone-800 bg-stone-950 p-5 text-white shadow-sm sm:p-6">
        <Link
          to={crmPaths.overview}
          className="inline-flex items-center gap-1 text-micro font-bold uppercase tracking-wider text-stone-400 hover:text-white"
        >
          <ArrowLeft className="h-icon-sm w-icon-sm" /> Vue d’ensemble
        </Link>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              {isListsSurface ? "Listes d’entreprises" : "Entreprises"}
            </h1>
            <p className="mt-1 text-sm text-stone-400">
              {isListsSurface
                ? "Vues personnelles et partagées de l’organisation"
                : "Comptes, prospects et clients de l’organisation"}{" "}
              · {accounts.length} fiches
            </p>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-icon-md w-icon-md" /> Nouvelle entreprise
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-border-base bg-white p-3 shadow-xs lg:flex-row lg:items-center">
        <label className="relative min-w-0 flex-1 lg:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-icon-md w-icon-md -translate-y-1/2 text-stone-400" />
          <span className="sr-only">Rechercher une entreprise</span>
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setSelectedViewId("");
            }}
            placeholder="Nom, domaine ou secteur…"
            className="h-control-md w-full rounded-control border border-stone-200 bg-stone-50 pl-9 pr-3 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </label>
        <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
          <SlidersHorizontal
            className="h-icon-md w-icon-md shrink-0 text-stone-400"
            aria-hidden="true"
          />
          {(
            ["all", "prospect", "qualified", "customer", "partner"] as const
          ).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setLifecycle(value);
                setSelectedViewId("");
              }}
              aria-pressed={lifecycle === value}
              className={`shrink-0 rounded-lg px-2.5 py-2 text-micro font-bold transition ${lifecycle === value ? "bg-stone-950 text-white" : "text-stone-600 hover:bg-stone-100"}`}
            >
              {value === "all" ? "Toutes" : lifecycleLabel[value]}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2 rounded-2xl border border-border-base bg-white p-3 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Bookmark
            className="h-icon-md w-icon-md shrink-0 text-primary"
            aria-hidden="true"
          />
          <label htmlFor="crm-account-saved-view" className="sr-only">
            Vue enregistrée
          </label>
          <Select
            size="compact"
            className="min-w-0 flex-1 sm:w-56"
            id="crm-account-saved-view"
            value={selectedViewId}
            onChange={(event) => applySavedView(event.target.value)}
          >
            <option value="">Vue standard</option>
            {savedViews.map((view) => (
              <option key={view.id} value={view.id}>
                {view.name}
                {view.visibility === "personal"
                  ? " · personnelle"
                  : " · partagée"}
              </option>
            ))}
          </Select>
          {selectedViewId &&
            (savedViews.find((view) => view.id === selectedViewId)
              ?.visibility === "personal" ||
              canManageSharedViews) && (
              <button
                type="button"
                onClick={() =>
                  setDeleteView(
                    savedViews.find((view) => view.id === selectedViewId) ??
                      null,
                  )
                }
                className="inline-flex h-control-md w-9 shrink-0 items-center justify-center rounded-control text-text-muted transition hover:bg-danger-surface hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Supprimer la vue sélectionnée"
              >
                <Trash2 className="h-icon-md w-icon-md" />
              </button>
            )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setSaveViewOpen(true)}
        >
          <BookmarkPlus className="h-icon-md w-icon-md" /> Enregistrer la vue
        </Button>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border-base bg-white shadow-xs">
        {loading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Building2 className="mx-auto h-8 w-8 text-stone-400" />
            <h2 className="mt-3 text-sm font-black text-stone-800">
              Aucune entreprise dans cette vue
            </h2>
            <p className="mt-1 text-xs text-stone-500">
              Modifiez les filtres ou créez une nouvelle fiche.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-4xl text-left text-xs">
              <thead className="bg-stone-50 text-micro font-bold uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-5 py-3">Entreprise</th>
                  <th className="px-4 py-3">Cycle de vie</th>
                  <th className="px-4 py-3">Localisation</th>
                  <th className="px-4 py-3">Propriétaire</th>
                  <th className="px-4 py-3 text-right">Fit</th>
                  <th className="px-5 py-3 text-right">Mise à jour</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filtered.map((account) => (
                  <tr
                    key={account.id}
                    className="transition hover:bg-stone-50/80"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-stone-100 font-black text-stone-700">
                          {account.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <Link
                            to={crmPaths.company(account.id)}
                            className="block truncate font-black text-stone-950 hover:text-primary"
                          >
                            {account.name}
                          </Link>
                          <span className="mt-0.5 block truncate text-micro text-stone-500">
                            {account.industry ?? "Secteur non renseigné"}
                            {account.domain && (
                              <>
                                {" "}
                                ·{" "}
                                <span className="inline-flex items-center gap-0.5">
                                  {account.domain}
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </span>
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`rounded-full px-2 py-1 text-micro font-bold ${lifecycleTone[account.lifecycle]}`}
                      >
                        {lifecycleLabel[account.lifecycle]}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-stone-600">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-icon-sm w-icon-sm text-stone-400" />{" "}
                        {[account.city, account.country]
                          .filter(Boolean)
                          .join(", ") || "Non renseignée"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-stone-600">
                      {account.ownerId ? "Léa Bertin" : "Non assignée"}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {account.fitScore !== undefined ? (
                        <span className="inline-flex items-center gap-1 font-black text-violet-700">
                          <Sparkles className="h-icon-sm w-icon-sm" />{" "}
                          {account.fitScore}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right text-micro text-stone-500">
                      {new Intl.DateTimeFormat(currentLocale, {
                        dateStyle: "medium",
                      }).format(new Date(account.updatedAt))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-border-subtle bg-stone-50/60 px-5 py-3 text-micro text-stone-500">
          <span>
            {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
          </span>
          <span>Isolation par tenant active</span>
        </div>
      </section>

      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Créer une entreprise"
        description="Ajoutez un compte CRM générique, sans créer d’organisation Shongre."
      >
        <form onSubmit={createAccount} className="space-y-4 text-xs">
          <FormField label="Nom de l’entreprise" required>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Site web">
              <Input
                type="url"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                placeholder="https://example.fr"
              />
            </FormField>
            <FormField label="Secteur">
              <Input
                value={industry}
                onChange={(event) => setIndustry(event.target.value)}
              />
            </FormField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Ville">
              <Input
                value={city}
                onChange={(event) => setCity(event.target.value)}
              />
            </FormField>
            <FormField label="Marché">
              <Select
                aria-label="Marché"
                value={activeMarket.code}
                options={[
                  {
                    value: activeMarket.code,
                    label: `${activeMarket.name} (${activeMarket.code})`,
                  },
                ]}
              />
            </FormField>
          </div>
          <FormField label="Description">
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
          </FormField>
          <div className="flex justify-end gap-2 border-t border-border-subtle pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Création…" : "Créer"}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        isOpen={saveViewOpen}
        onClose={() => setSaveViewOpen(false)}
        title="Enregistrer la vue"
        description="Conservez la recherche et le cycle de vie actuellement affichés."
      >
        <form onSubmit={saveCurrentView} className="space-y-4 text-xs">
          <FormField label="Nom de la vue" required>
            <Input
              value={viewName}
              onChange={(event) => setViewName(event.target.value)}
              maxLength={CRM_FIELD_CONSTRAINTS.savedViewNameMaxLength}
              required
            />
          </FormField>
          <FormField label="Visibilité">
            <Select
              aria-label="Visibilité de la vue"
              value={viewVisibility}
              onChange={(event) =>
                setViewVisibility(event.target.value as CrmSavedViewVisibility)
              }
              options={[
                { value: "personal", label: "Personnelle" },
                ...(canManageSharedViews
                  ? [
                      {
                        value: "workspace",
                        label: "Partagée avec le workspace",
                      },
                    ]
                  : []),
              ]}
            />
          </FormField>
          <p className="rounded-lg bg-stone-50 px-3 py-2 text-micro leading-relaxed text-stone-600">
            {canManageSharedViews
              ? "Les vues partagées sont visibles dans tout le workspace. Les vues personnelles restent privées à votre compte."
              : "Cette vue restera privée à votre compte."}
          </p>
          <div className="flex justify-end gap-2 border-t border-border-subtle pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSaveViewOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !viewName.trim()}
            >
              {submitting ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        isOpen={Boolean(deleteView)}
        onClose={() => setDeleteView(null)}
        title="Supprimer cette vue ?"
        description={
          deleteView
            ? `La vue « ${deleteView.name} » ne sera plus disponible.`
            : undefined
        }
      >
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDeleteView(null)}
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={submitting}
            onClick={() => void removeSavedView()}
          >
            {submitting ? "Suppression…" : "Supprimer"}
          </Button>
        </div>
      </Modal>
    </div>
  );
};
