import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Eye,
  Globe2,
  Grid2X2,
  History,
  ListOrdered,
  Plus,
  Save,
  Search,
} from "lucide-react";
import {
  Badge,
  Button,
  IconButton,
  Modal,
  Select,
  Skeleton,
  Switch,
  ScrollableRegion,
} from "../../design-system";
import { ConfirmModal } from "../../design-system/primitives/ConfirmModal";
import {
  FormField,
  Input,
  Textarea,
} from "../../design-system/primitives/FormField";
import { services } from "../../api/client/service-registry";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";
import {
  SOLUTION_LIFECYCLE_PRESENTATION,
} from "../../domains/solutions/solutions.presentation";
import {
  SOLUTION_LIFECYCLES,
  type SolutionDefinition,
  type SolutionLifecycle,
  type SolutionLifecycleHistoryEntry,
  type SolutionsAdminActor,
} from "../../domains/solutions/solutions.types";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useTranslation } from "../../i18n/I18nProvider";
import { applicationHref } from "../../platform/applications/use-application-href";
import type { ShongreApplicationId } from "../../platform/applications/application-registry";

type Draft = Omit<
  SolutionDefinition,
  "id" | "createdAt" | "updatedAt"
>;

const MARKET_OPTIONS = ["FR", "BE", "LU"] as const;
const DESTINATIONS: Array<{ value: "" | ShongreApplicationId; label: string }> = [
  { value: "", label: "Aucune destination" },
  { value: "marketplace", label: "marketplace" },
  { value: "prospects", label: "prospects" },
  { value: "facturation", label: "facturation" },
];

function toDraft(solution: SolutionDefinition): Draft {
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...draft } = solution;
  return structuredClone(draft);
}

function blankDraft(): Draft {
  return {
    name: "",
    slug: "",
    shortDescription: "",
    description: "",
    icon: "apps",
    category: "Organisation",
    lifecycle: "DRAFT",
    markets: ["FR"],
    languages: ["fr-FR"],
    audiences: ["Organisations professionnelles"],
    capabilities: [],
    requiresAuthentication: true,
    requiresEntitlement: true,
    releaseNotes: [],
    sortOrder: 50,
    catalogVisible: false,
    featured: false,
  };
}

function lifecycleVariant(lifecycle: SolutionLifecycle) {
  if (lifecycle === "AVAILABLE") return "success" as const;
  if (lifecycle === "RETIRED") return "warning" as const;
  if (lifecycle === "MAINTENANCE") return "warning" as const;
  return "neutral" as const;
}

export function AdminSolutionsPage() {
  const { currentUser, can } = useAuth();
  const toast = useToast();
  const { t } = useTranslation();
  const [solutions, setSolutions] = useState<SolutionDefinition[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | SolutionLifecycle>("ALL");
  const [transition, setTransition] = useState<SolutionLifecycle>("AVAILABLE");
  const [explanation, setExplanation] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<SolutionLifecycleHistoryEntry[]>([]);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [visibilitySavingId, setVisibilitySavingId] = useState<string | null>(
    null,
  );

  usePageMeta({
    title: t("admin.adminSolutionsPage.catalogueDesSolutionsConsoleShongre"),
    description: t("admin.adminSolutionsPage.gouvernanceDuCycleDeVieEtDesDestinationsDesApplications"),
    canonicalPath: "/admin/solutions",
    noIndex: true,
  });

  const actor = useMemo<SolutionsAdminActor>(
    () => ({
      id: currentUser?.id || "anonymous",
      name: currentUser?.name || "Utilisateur non identifié",
      canManage: can("admin.configuration.manage"),
    }),
    [can, currentUser?.id, currentUser?.name],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const values = await services.solutions.listAdminSolutions(actor);
      setSolutions(values);
      setSelectedId((current) => current || values[0]?.id || "");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Catalogue non chargé.");
    } finally {
      setLoading(false);
    }
  }, [actor, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = solutions.find((solution) => solution.id === selectedId) || null;
  useEffect(() => {
    if (!creating && selected) setDraft(toDraft(selected));
  }, [creating, selected]);

  const filtered = useMemo(
    () =>
      solutions.filter(
        (solution) =>
          (filter === "ALL" || solution.lifecycle === filter) &&
          (!query.trim() ||
            `${solution.name} ${solution.slug}`
              .toLowerCase()
              .includes(query.trim().toLowerCase())),
      ),
    [filter, query, solutions],
  );

  const counts = {
    public: solutions.filter(
      (value) =>
        value.catalogVisible &&
        [
          "AVAILABLE",
          "BETA",
          "COMING_SOON",
          "MAINTENANCE",
          "DEPRECATED",
        ].includes(value.lifecycle),
    ).length,
    draft: solutions.filter((value) => value.lifecycle === "DRAFT").length,
    retired: solutions.filter((value) => value.lifecycle === "RETIRED").length,
  };

  const hasUnsavedDraft = Boolean(
    creating ||
      (selected &&
        draft &&
        JSON.stringify(draft) !== JSON.stringify(toDraft(selected))),
  );

  const moveSolution = async (solutionId: string, direction: -1 | 1) => {
    const currentIndex = solutions.findIndex(
      (solution) => solution.id === solutionId,
    );
    const targetIndex = currentIndex + direction;
    if (
      currentIndex < 0 ||
      targetIndex < 0 ||
      targetIndex >= solutions.length ||
      reorderingId ||
      hasUnsavedDraft
    ) {
      return;
    }

    const reordered = [...solutions];
    [reordered[currentIndex], reordered[targetIndex]] = [
      reordered[targetIndex],
      reordered[currentIndex],
    ];
    setReorderingId(solutionId);
    try {
      const saved = await services.solutions.reorderSolutions(
        reordered.map((solution) => solution.id),
        actor,
      );
      setSolutions(saved);
      toast.success(t("admin.solutions.order.saved"));
    } catch (reason) {
      toast.error(
        reason instanceof Error
          ? reason.message
          : t("admin.solutions.order.error"),
      );
    } finally {
      setReorderingId(null);
    }
  };

  const setCatalogVisibility = async (
    solutionId: string,
    catalogVisible: boolean,
  ) => {
    if (visibilitySavingId || reorderingId || hasUnsavedDraft) return;
    setVisibilitySavingId(solutionId);
    try {
      const updated = await services.solutions.updateSolution(
        solutionId,
        { catalogVisible },
        actor,
      );
      setSolutions((current) =>
        current.map((solution) =>
          solution.id === updated.id ? updated : solution,
        ),
      );
      toast.success(t("admin.solutions.visibility.saved"));
    } catch (reason) {
      toast.error(
        reason instanceof Error
          ? reason.message
          : t("admin.solutions.visibility.error"),
      );
    } finally {
      setVisibilitySavingId(null);
    }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    setSaving(true);
    try {
      if (creating) {
        const created = await services.solutions.createSolution(
          draft,
          actor,
        );
        setCreating(false);
        setSelectedId(created.id);
        toast.success("Solution créée dans le catalogue de démonstration.");
      } else if (selected) {
        const { lifecycle: _lifecycle, ...changes } = draft;
        await services.solutions.updateSolution(selected.id, changes, actor);
        toast.success("Solution enregistrée.");
      }
      await load();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const requestTransition = () => {
    if (!selected) return;
    if (transition === selected.lifecycle) {
      toast.error("Choisissez un nouveau cycle de vie.");
      return;
    }
    if (explanation.trim().length < 10) {
      toast.error("Indiquez un motif d’au moins 10 caractères.");
      return;
    }
    setConfirmOpen(true);
  };

  const applyTransition = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      if (transition === "MAINTENANCE") {
        await services.solutions.updateSolution(
          selected.id,
          { maintenanceMessage: explanation.trim() },
          actor,
        );
      }
      await services.solutions.transitionLifecycle(selected.id, transition, {
        explanation,
        actor,
      });
      toast.success("Transition enregistrée dans l’historique.");
      setConfirmOpen(false);
      setExplanation("");
      await load();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Transition impossible.");
    } finally {
      setSaving(false);
    }
  };

  const openHistory = async () => {
    if (!selected) return;
    try {
      setHistory(await services.solutions.listLifecycleHistory(selected.id, actor));
      setHistoryOpen(true);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Historique indisponible.");
    }
  };

  const toggleMarket = (market: string) => {
    if (!draft) return;
    setDraft({
      ...draft,
      markets: draft.markets.includes(market)
        ? draft.markets.filter((value) => value !== market)
        : [...draft.markets, market],
    });
  };

  const updateReleaseNote = (
    field: "title" | "body" | "publishedAt",
    value: string,
  ) => {
    if (!draft) return;
    const current = draft.releaseNotes[0] || {
      id: `release-${draft.slug || "new-solution"}`,
      title: "",
      body: "",
      publishedAt: "",
    };
    setDraft({
      ...draft,
      releaseNotes: [{ ...current, [field]: value }, ...draft.releaseNotes.slice(1)],
    });
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-text-main">{t("admin.adminSolutionsPage.catalogueDesSolutions")}</h1>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-text-secondary">
            {t("admin.adminSolutionsPage.pilotezLaVisibiliteLesDestinationsEtLeCycleDeVie")}
          </p>
        </div>
        <Button
          onClick={() => {
            setCreating(true);
            setSelectedId("");
            setDraft(blankDraft());
          }}
          leftIcon={<Plus className="h-icon-sm w-icon-sm" />}
        >
          Nouvelle solution
        </Button>
      </header>

      <section aria-label={t("admin.adminSolutionsPage.resumeDuCatalogue")} className="grid divide-y divide-border-base rounded-control border border-border-base bg-bg-surface shadow-xs sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {[
          [Globe2, `${counts.public} publiques`],
          [Grid2X2, `${counts.draft} brouillon${counts.draft > 1 ? "s" : ""}`],
          [Archive, `${counts.retired} retirée${counts.retired > 1 ? "s" : ""}`],
        ].map(([Icon, label]) => (
          <div key={String(label)} className="flex min-h-16 items-center gap-3 px-5">
            <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
            <span className="text-sm font-bold text-text-main">{String(label)}</span>
          </div>
        ))}
      </section>

      {!loading && solutions.length > 0 ? (
        <section
          aria-labelledby="solutions-order-title"
          className="rounded-control border border-border-base bg-bg-surface p-4 shadow-xs"
        >
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-primary-light text-primary">
            <ListOrdered className="h-icon-md w-icon-md" aria-hidden="true" />
          </span>
          <div>
            <h2
              id="solutions-order-title"
              className="text-sm font-black text-text-main"
            >
              {t("admin.solutions.order.title")}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-text-secondary">
              {t("admin.solutions.order.description")}
            </p>
          </div>
        </div>

        <ol className="mt-4 grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
          {solutions.map((solution, index) => {
            const controlsDisabled = Boolean(
              reorderingId || visibilitySavingId || hasUnsavedDraft,
            );
            return (
              <li
                key={solution.id}
                className="flex min-h-control-touch min-w-0 items-center gap-3 rounded-control border border-border-subtle bg-bg-subtle px-3 py-2"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-pill bg-bg-surface text-xs font-black text-primary shadow-xs">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-text-main">
                    {solution.name}
                  </span>
                  <span className="text-micro text-text-secondary">
                    {SOLUTION_LIFECYCLE_PRESENTATION[solution.lifecycle].label}
                    {" · "}
                    {t(
                      solution.catalogVisible
                        ? "admin.solutions.visibility.enabled"
                        : "admin.solutions.visibility.hidden",
                    )}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <Switch
                    checked={solution.catalogVisible}
                    aria-label={t("admin.solutions.visibility.label", {
                      name: solution.name,
                    })}
                    disabled={controlsDisabled}
                    onChange={(checked) =>
                      void setCatalogVisibility(solution.id, checked)
                    }
                  />
                  <IconButton
                    size="sm"
                    variant="ghost"
                    ariaLabel={t("admin.solutions.order.moveUp", {
                      name: solution.name,
                    })}
                    disabled={controlsDisabled || index === 0}
                    onClick={() => void moveSolution(solution.id, -1)}
                  >
                    <ArrowUp className="h-icon-sm w-icon-sm" aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    ariaLabel={t("admin.solutions.order.moveDown", {
                      name: solution.name,
                    })}
                    disabled={
                      controlsDisabled || index === solutions.length - 1
                    }
                    onClick={() => void moveSolution(solution.id, 1)}
                  >
                    <ArrowDown className="h-icon-sm w-icon-sm" aria-hidden="true" />
                  </IconButton>
                </span>
              </li>
            );
          })}
        </ol>

        {hasUnsavedDraft ? (
          <p className="mt-3 text-xs font-semibold text-warning" role="status">
            {t("admin.solutions.order.saveDraftFirst")}
          </p>
        ) : null}
        </section>
      ) : null}

      {loading ? (
        <div className="grid gap-4 xl:grid-cols-5"><Skeleton className="h-160 rounded-control xl:col-span-2" /><Skeleton className="h-160 rounded-control xl:col-span-3" /></div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-5">
          <section className="overflow-hidden rounded-control border border-border-base bg-bg-surface shadow-xs xl:col-span-2" aria-labelledby="solutions-list-title">
            <div className="border-b border-border-base p-4">
              <h2 id="solutions-list-title" className="text-base font-black text-text-main">{t("admin.adminSolutionsPage.toutesLesSolutions")}</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <label className="flex h-control-touch items-center gap-2 rounded-control border border-border-base px-3">
                  <Search className="h-icon-sm w-icon-sm text-stone-500" aria-hidden="true" />
                  <span className="sr-only">{t("admin.adminSolutionsPage.rechercherUneSolution")}</span>
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("admin.adminSolutionsPage.rechercherUneSolution")} className="min-w-0 flex-1 bg-transparent text-xs outline-none h-control-touch" />
                </label>
                <Select value={filter} onChange={(event) => setFilter(event.target.value as "ALL" | SolutionLifecycle)} aria-label={t("admin.adminSolutionsPage.filtrerParCycleDeVie")}>
                  <option value="ALL">{t("admin.providerCatalogTable.tousLesStatuts")}</option>
                  {SOLUTION_LIFECYCLES.map((value) => <option key={value} value={value}>{SOLUTION_LIFECYCLE_PRESENTATION[value].label}</option>)}
                </Select>
              </div>
            </div>
            <ScrollableRegion aria-label={t("admin.solutions.catalogTableLabel")}>
              <table className="w-full min-w-120 text-left text-xs">
                <thead className="border-b border-border-base bg-bg-subtle text-stone-500"><tr><th className="px-4 py-3">Solution</th><th className="px-3 py-3">{t("admin.adminFeatureFlagsPage.cycleDeVie")}</th><th className="px-3 py-3">{t("admin.adminSolutionsPage.marches")}</th><th className="px-3 py-3">Destination</th></tr></thead>
                <tbody className="divide-y divide-border-subtle">
                  {filtered.map((solution) => (
                    <tr key={solution.id} className={selectedId === solution.id ? "bg-primary-light" : "hover:bg-bg-subtle"}>
                      <td className={`border-l-4 px-3 py-4 font-bold text-text-main ${selectedId === solution.id ? "border-primary" : "border-transparent"}`}>
                        <button type="button" onClick={() => { setCreating(false); setSelectedId(solution.id); }} className="rounded text-left focus-visible:outline-2 focus-visible:outline-primary">{solution.name}</button>
                      </td>
                      <td className="px-3 py-4"><Badge size="sm" variant={lifecycleVariant(solution.lifecycle)}>{SOLUTION_LIFECYCLE_PRESENTATION[solution.lifecycle].label}</Badge></td>
                      <td className="px-3 py-4 text-text-secondary">{solution.markets.join(", ")}</td>
                      <td className="px-3 py-4 font-mono text-micro text-text-secondary">{solution.launchApplicationId || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollableRegion>
          </section>

          {draft ? (
            <div className="space-y-4 xl:col-span-3">
              <form onSubmit={save} className="space-y-4 rounded-control border border-border-base bg-bg-surface p-4 shadow-xs sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle pb-4">
                  <h2 className="text-lg font-black text-text-main">{creating ? "Nouvelle solution" : selected?.name}</h2>
                  {!creating && selected ? <Badge variant={lifecycleVariant(selected.lifecycle)}>{SOLUTION_LIFECYCLE_PRESENTATION[selected.lifecycle].label}</Badge> : null}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Nom" required><Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></FormField>
                  <FormField label="Slug" required><Input value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value.toLowerCase() })} /></FormField>
                  <FormField label="Description courte" required><Textarea value={draft.shortDescription} onChange={(event) => setDraft({ ...draft, shortDescription: event.target.value })} /></FormField>
                  <FormField label={t("publishing.publishWizard.categorie")} required><Input value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} /></FormField>
                  <FormField label={t("admin.adminSolutionsPage.icone")}><Select labelledByAncestor value={draft.icon} onChange={(event) => setDraft({ ...draft, icon: event.target.value as SolutionDefinition["icon"] })}><option value="apps">Application</option><option value="prospects">Prospects</option><option value="facturation">Facturation</option><option value="marketplace">Marketplace</option><option value="pilotage">Pilotage</option></Select></FormField>
                  <FormField label={t("admin.adminFeatureFlagsPage.cycleDeVie")}><Select labelledByAncestor value={draft.lifecycle} disabled={!creating} onChange={(event) => setDraft({ ...draft, lifecycle: event.target.value as SolutionLifecycle })}>{SOLUTION_LIFECYCLES.map((value) => <option key={value} value={value}>{SOLUTION_LIFECYCLE_PRESENTATION[value].label}</option>)}</Select></FormField>
                  <FormField label={t("admin.adminSolutionsPage.disponibleAPartirDu")}><Input type="datetime-local" value={draft.availableFrom?.slice(0, 16) || ""} onChange={(event) => setDraft({ ...draft, availableFrom: event.target.value ? new Date(event.target.value).toISOString() : undefined })} /></FormField>
                  <FormField label={t("admin.adminSolutionsPage.disponibleJusquAu")}><Input type="datetime-local" value={draft.availableUntil?.slice(0, 16) || ""} onChange={(event) => setDraft({ ...draft, availableUntil: event.target.value ? new Date(event.target.value).toISOString() : undefined })} /></FormField>
                  <FormField label="Langues" hint="Codes BCP 47 séparés par des virgules"><Input value={draft.languages.join(", ")} onChange={(event) => setDraft({ ...draft, languages: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) })} /></FormField>
                  <FormField label="Audiences" hint="Séparées par des virgules"><Input value={draft.audiences.join(", ")} onChange={(event) => setDraft({ ...draft, audiences: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) })} /></FormField>
                  <FormField label={t("invoicing.product.nav.features")} hint="Séparées par des virgules"><Textarea value={draft.capabilities.join(", ")} onChange={(event) => setDraft({ ...draft, capabilities: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) })} /></FormField>
                  <FormField label="Entitlement"><Input value={draft.entitlementKey || ""} onChange={(event) => setDraft({ ...draft, entitlementKey: event.target.value || undefined })} /></FormField>
                  <FormField label="Destination applicative"><Select labelledByAncestor value={draft.launchApplicationId || ""} onChange={(event) => setDraft({ ...draft, launchApplicationId: (event.target.value || undefined) as ShongreApplicationId | undefined })}>{DESTINATIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select></FormField>
                  <FormField label="Documentation HTTPS"><Input type="url" value={draft.documentationUrl || ""} onChange={(event) => setDraft({ ...draft, documentationUrl: event.target.value || undefined })} placeholder="https://docs.shongre.fr/…" /></FormField>
                  <FormField label={t("admin.adminSolutionsPage.solutionDeRemplacement")} hint="Slug interne, sans URL"><Input value={draft.replacementSlug || ""} onChange={(event) => setDraft({ ...draft, replacementSlug: event.target.value || undefined })} /></FormField>
                </div>
                <FormField label={t("admin.adminSolutionsPage.descriptionComplete")} required><Textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></FormField>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Notice publique"><Textarea value={draft.notice || ""} onChange={(event) => setDraft({ ...draft, notice: event.target.value || undefined })} /></FormField>
                  <FormField label={t("admin.adminSolutionsPage.messageDeMaintenance")} hint="Obligatoire avant le passage en maintenance"><Textarea value={draft.maintenanceMessage || ""} onChange={(event) => setDraft({ ...draft, maintenanceMessage: event.target.value || undefined })} /></FormField>
                </div>
                <fieldset>
                  <legend className="text-xs font-bold text-stone-800">{t("admin.adminSolutionsPage.marches")}</legend>
                  <div className="mt-2 flex flex-wrap gap-4">{MARKET_OPTIONS.map((market) => <label key={market} className="inline-flex min-h-8 items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={draft.markets.includes(market)} onChange={() => toggleMarket(market)} className="h-4 w-4 accent-primary" />{market}</label>)}</div>
                </fieldset>
                <div className="rounded-control border border-info-border bg-info-surface px-3 py-2 text-xs text-info">
                  {t("admin.adminSolutionsPage.lesNomsDHoteSontResolusParLaConfigurationD")}
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="inline-flex min-h-control-touch items-center gap-2 text-xs font-bold"><input type="checkbox" checked={draft.featured} onChange={(event) => setDraft({ ...draft, featured: event.target.checked })} className="h-4 w-4 accent-primary" /> Mise en avant</label>
                  <label className="inline-flex min-h-control-touch items-center gap-2 text-xs font-bold"><input type="checkbox" checked={draft.requiresAuthentication} onChange={(event) => setDraft({ ...draft, requiresAuthentication: event.target.checked })} className="h-4 w-4 accent-primary" /> Connexion requise</label>
                  <label className="inline-flex min-h-control-touch items-center gap-2 text-xs font-bold"><input type="checkbox" checked={draft.requiresEntitlement} onChange={(event) => setDraft({ ...draft, requiresEntitlement: event.target.checked })} className="h-4 w-4 accent-primary" /> Entitlement requis</label>
                </div>
                <FormField label={t("admin.adminSolutionsPage.cheminDeLancement")} hint="Chemin local uniquement, par exemple /app"><Input value={draft.launchPath || "/"} onChange={(event) => setDraft({ ...draft, launchPath: event.target.value || "/" })} /></FormField>

                <fieldset className="space-y-3 rounded-control border border-border-base p-4">
                  <legend className="px-1 text-xs font-bold text-stone-800">{t("admin.adminSolutionsPage.derniereNoteDeVersionFacultatif")}</legend>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label={t("admin.adminSolutionsPage.titreDeLaNote")}><Input value={draft.releaseNotes[0]?.title || ""} onChange={(event) => updateReleaseNote("title", event.target.value)} /></FormField>
                    <FormField label={t("admin.adminSolutionsPage.dateDePublication")}><Input type="datetime-local" value={draft.releaseNotes[0]?.publishedAt.slice(0, 16) || ""} onChange={(event) => updateReleaseNote("publishedAt", event.target.value ? new Date(event.target.value).toISOString() : "")} /></FormField>
                  </div>
                  <FormField label={t("admin.adminSolutionsPage.contenuDeLaNote")}><Textarea value={draft.releaseNotes[0]?.body || ""} onChange={(event) => updateReleaseNote("body", event.target.value)} /></FormField>
                  {draft.releaseNotes.length ? <Button type="button" variant="ghost" onClick={() => setDraft({ ...draft, releaseNotes: draft.releaseNotes.slice(1) })}>{t("admin.adminSolutionsPage.retirerCetteNote")}</Button> : null}
                </fieldset>
                <div className="flex flex-wrap justify-end gap-2 border-t border-border-subtle pt-4">
                  {!creating && selected ? <a href={applicationHref("solutions", `/${selected.slug}`)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-control-touch items-center gap-2 rounded-control border border-border-base px-4 text-xs font-bold text-stone-800"><Eye className="h-icon-sm w-icon-sm" aria-hidden="true" /> {t("admin.adminNewsletterPage.apercu")}</a> : null}
                  {!creating ? <Button type="button" variant="outline" onClick={() => void openHistory()} leftIcon={<History className="h-icon-sm w-icon-sm" />}>Historique</Button> : null}
                  <Button type="submit" isLoading={saving} leftIcon={<Save className="h-icon-sm w-icon-sm" />}>Enregistrer</Button>
                </div>
              </form>

              {!creating && selected ? (
                <section className="rounded-control border border-border-base bg-bg-surface p-4 shadow-xs sm:p-5" aria-labelledby="transition-title">
                  <h2 id="transition-title" className="text-sm font-black text-text-main">{t("admin.adminSolutionsPage.faireEvoluerLeCycleDeVie")}</h2>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Select value={transition} onChange={(event) => setTransition(event.target.value as SolutionLifecycle)} aria-label={t("admin.adminSolutionsPage.nouveauCycleDeVie")}>{SOLUTION_LIFECYCLES.map((value) => <option key={value} value={value}>{SOLUTION_LIFECYCLE_PRESENTATION[value].label}</option>)}</Select>
                    <Input value={explanation} onChange={(event) => setExplanation(event.target.value)} placeholder={t("admin.adminSolutionsPage.motifOperationnel10CaracteresMinimum")} aria-label={t("admin.monetization.transitionReason")} />
                  </div>
                  <div className="mt-3 flex justify-end"><Button type="button" onClick={requestTransition}>{t("admin.adminSolutionsPage.appliquerLaTransition")}</Button></div>
                </section>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void applyTransition()}
        title={`Passer à « ${SOLUTION_LIFECYCLE_PRESENTATION[transition].label} » ?`}
        message={transition === "RETIRED" ? "La solution disparaîtra immédiatement du catalogue public. Son historique sera conservé." : `Cette transition sera attribuée à ${actor.name} et horodatée dans le registre de démonstration.`}
        confirmText="Appliquer la transition"
        variant={transition === "RETIRED" ? "danger" : "warning"}
        isLoading={saving}
      />

      <Modal isOpen={historyOpen} onClose={() => setHistoryOpen(false)} title={`Historique — ${selected?.name || "Solution"}`} maxWidth="lg">
        {history.length ? (
          <ol className="divide-y divide-border-base">{history.map((entry) => <li key={entry.id} className="py-4"><p className="text-sm font-bold text-text-main">{entry.from ? SOLUTION_LIFECYCLE_PRESENTATION[entry.from].label : "Création"} → {SOLUTION_LIFECYCLE_PRESENTATION[entry.to].label}</p><p className="mt-1 text-xs text-text-secondary">{entry.explanation}</p><p className="mt-2 text-micro text-text-muted">{entry.actorName} · {new Date(entry.occurredAt).toLocaleString("fr-FR")}</p></li>)}</ol>
        ) : (
          <p className="py-8 text-center text-sm text-text-muted">{t("admin.adminSolutionsPage.aucuneTransitionEnregistree")}</p>
        )}
      </Modal>
    </div>
  );
}
