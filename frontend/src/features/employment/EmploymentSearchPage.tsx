import { PAGE_SIZES } from "../../configuration/pagination.config";
import React, { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BriefcaseBusiness,
  Filter,
  Search,
  ShieldCheck,
} from "lucide-react";
import type {
  EmploymentCatalog,
  EmploymentSearchQuery,
  JobPostingCard,
} from "@shongre/contracts/employment";
import { useParams, useSearchParams } from "react-router-dom";
import { services } from "../../api/client/service-registry";
import { useAuth } from "../../app/providers/AuthProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { useToast } from "../../app/providers/ToastProvider";
import {
  Button,
  Container,
  Drawer,
  DropdownMenu,
  FilterPanel,
  Input,
  LocationSelector,
  Skeleton,
  StatePanel,
} from "../../design-system";
import type {
  FilterPanelPresentation,
  LocationSelectorValue,
} from "../../design-system";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useTranslation } from "../../i18n/I18nProvider";
import { storageService } from "../../services/storage.service";
import { JobCard } from "./components/JobCard";
import { usePublicRouteData } from "../../app/providers/PublicRouteDataProvider";
import {
  pageMetaForPolicy,
  resolveSeoPolicy,
} from "../../platform/seo/seo-policy";

const csv = (value: string | null) => (value || "").split(",").filter(Boolean);

const EMPLOYMENT_FILTER_KEYS = [
  "profession",
  "jobFamily",
  "industry",
  "arrangement",
  "contract",
  "workingTime",
  "experience",
  "education",
  "language",
  "schedule",
  "employerType",
  "published",
  "salary",
  "salaryFrequency",
  "verified",
  "accessible",
  "radius",
] as const;

const EmploymentFilters: React.FC<{
  catalog: EmploymentCatalog;
  params: URLSearchParams;
  setParam: (key: string, value?: string) => void;
  onReset: () => void;
  presentation?: FilterPanelPresentation;
  onApply?: () => void;
  resultCount?: number;
}> = ({
  catalog,
  params,
  setParam,
  onReset,
  presentation = "surface",
  onApply,
  resultCount = 0,
}) => {
  const { currencySymbol, currentLocale } = useMarketLocation();
  const dictionaries = (
    kind: EmploymentCatalog["dictionaries"][number]["kind"],
  ) =>
    catalog.dictionaries.filter(
      (entry) => entry.kind === kind && entry.isActive,
    );
  return (
    <FilterPanel
      title="Filtres"
      presentation={presentation}
      onReset={onReset}
      footer={
        onApply ? (
          <Button fullWidth onClick={onApply}>
            Voir {resultCount} offre{resultCount > 1 ? "s" : ""}
          </Button>
        ) : undefined
      }
    >
      {[
        ["profession", "Métier", "profession"],
        ["jobFamily", "Famille de métiers", "job_family"],
        ["industry", "Secteur", "sector"],
        ["contract", "Type de contrat", "contract_type"],
        ["arrangement", "Lieu de travail", "working_arrangement"],
        ["workingTime", "Temps de travail", "work_schedule"],
        ["experience", "Expérience", "seniority"],
        ["education", "Formation", "education_level"],
        ["language", "Niveau de langue", "language_level"],
        ["schedule", "Horaires", "work_schedule"],
        ["employerType", "Type d’employeur", "employer_type"],
      ].map(([param, label, kind]) => (
        <div key={param}>
          <span className="mb-2 block text-xs font-bold text-text-main">
            {label}
          </span>
          <DropdownMenu
            ariaLabel={label}
            headerTitle={label}
            fullWidth
            value={params.get(param) || ""}
            onChange={(value) => setParam(param, value || undefined)}
            options={[
              { value: "", label: "Tous" },
              ...dictionaries(
                kind as EmploymentCatalog["dictionaries"][number]["kind"],
              ).map((entry) => ({
                value: entry.id,
                label: entry.label,
              })),
            ]}
          />
        </div>
      ))}
      <div>
        <span className="mb-2 block text-xs font-bold text-text-main">
          Date de publication
        </span>
        <DropdownMenu
          ariaLabel="Date de publication"
          headerTitle="Date de publication"
          fullWidth
          value={params.get("published") || ""}
          onChange={(value) => setParam("published", value || undefined)}
          options={[
            { value: "", label: "Toutes les dates" },
            { value: "1", label: "Depuis 24 heures" },
            { value: "7", label: "Depuis 7 jours" },
            { value: "30", label: "Depuis 30 jours" },
          ]}
        />
      </div>
      <div>
        <label
          className="mb-2 block text-xs font-bold text-text-main"
          htmlFor="employment-salary"
        >
          Rémunération minimale annuelle
        </label>
        <Input
          id="employment-salary"
          inputMode="numeric"
          className="w-full"
          placeholder={`Ex. ${new Intl.NumberFormat(currentLocale).format(35_000)} ${currencySymbol}`}
          value={params.get("salary") || ""}
          onChange={(event) =>
            setParam("salary", event.target.value || undefined)
          }
        />
      </div>
      <div>
        <span className="mb-2 block text-xs font-bold text-text-main">
          Période de rémunération
        </span>
        <DropdownMenu
          ariaLabel="Période de rémunération"
          headerTitle="Période de rémunération"
          fullWidth
          value={params.get("salaryFrequency") || ""}
          onChange={(value) => setParam("salaryFrequency", value || undefined)}
          options={[
            { value: "", label: "Toutes" },
            ...dictionaries("salary_frequency").map((entry) => ({
              value: entry.id,
              label: entry.label,
            })),
          ]}
        />
      </div>
      <label className="flex min-h-8 cursor-pointer items-center gap-2 text-xs text-text-main">
        <input
          type="checkbox"
          className="h-4 w-4 accent-primary"
          checked={params.get("verified") === "true"}
          onChange={(event) =>
            setParam("verified", event.target.checked ? "true" : undefined)
          }
        />
        Employeur vérifié uniquement
      </label>
      <label className="flex min-h-8 cursor-pointer items-center gap-2 text-xs text-text-main">
        <input
          type="checkbox"
          className="h-4 w-4 accent-primary"
          checked={params.get("accessible") === "true"}
          onChange={(event) =>
            setParam("accessible", event.target.checked ? "true" : undefined)
          }
        />
        Information d’accessibilité renseignée
      </label>
    </FilterPanel>
  );
};

export const EmploymentSearchPage: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { activeMarket, marketContext } = useMarketLocation();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const { professionSlug, sectorSlug, locationSlug } = useParams<{
    professionSlug?: string;
    sectorSlug?: string;
    locationSlug?: string;
  }>();
  const publicRouteData = usePublicRouteData();
  const initialData =
    publicRouteData?.kind === "employment_search" ? publicRouteData : null;
  const initialDataPending = React.useRef(Boolean(initialData));
  const [catalog, setCatalog] = useState<EmploymentCatalog | null>(
    initialData?.catalog ?? null,
  );
  const [items, setItems] = useState<JobPostingCard[]>(
    initialData?.items ?? [],
  );
  const [total, setTotal] = useState(initialData?.total ?? 0);
  const [recommendationFactors, setRecommendationFactors] = useState<string[]>(
    initialData?.recommendationFactors ?? [],
  );
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState(false);
  const [mobileFilters, setMobileFilters] = useState(false);
  const [savingAlert, setSavingAlert] = useState(false);
  const [recentJobs, setRecentJobs] = useState<JobPostingCard[]>([]);

  useEffect(() => {
    const recentKey = `shongre_employment_recent_jobs:${currentUser?.id || "guest"}`;
    const ids = storageService.get<string[]>(recentKey, []).slice(0, 4);
    Promise.all(
      ids.map((id) => services.employment.getJob(id).catch(() => null)),
    ).then((jobs) => setRecentJobs(jobs.filter((job) => job !== null)));
  }, [currentUser?.id]);

  const query = useMemo<EmploymentSearchQuery>(
    () => ({
      marketCode: activeMarket.code,
      keywords: params.get("q") || undefined,
      professionIds: csv(params.get("profession")),
      jobFamilyIds: csv(params.get("jobFamily")),
      industryIds: csv(params.get("industry")),
      location: params.get("location") || undefined,
      radiusKm: params.get("radius") ? Number(params.get("radius")) : undefined,
      workingArrangementIds: csv(params.get("arrangement")),
      contractTypeIds: csv(params.get("contract")),
      workingTimeIds: csv(params.get("workingTime")),
      salaryMinimumMinor: params.get("salary")
        ? Number(params.get("salary")?.replace(/\s/g, "")) * 100
        : undefined,
      salaryFrequencyId: params.get("salaryFrequency") || undefined,
      experienceLevelIds: csv(params.get("experience")),
      educationLevelIds: csv(params.get("education")),
      languageIds: csv(params.get("language")),
      scheduleIds: csv(params.get("schedule")),
      publishedSince: params.get("published")
        ? new Date(
            Date.now() - Number(params.get("published")) * 86_400_000,
          ).toISOString()
        : undefined,
      employerTypeIds: csv(params.get("employerType")),
      verifiedEmployerOnly: params.get("verified") === "true",
      accessibilityOnly: params.get("accessible") === "true",
      sort:
        (params.get("sort") as EmploymentSearchQuery["sort"]) || "relevance",
      limit: PAGE_SIZES.marketplaceSearch,
    }),
    [activeMarket.code, params],
  );

  useEffect(() => {
    if (initialDataPending.current) {
      initialDataPending.current = false;
      return;
    }
    let active = true;
    setLoading(true);
    setError(false);
    Promise.all([
      services.employment.getCatalog(query.marketCode),
      services.employment.searchJobs(query),
    ])
      .then(([nextCatalog, result]) => {
        if (!active) return;
        setCatalog(nextCatalog);
        setItems(result.items);
        setTotal(result.total);
        setRecommendationFactors(result.recommendationFactors);
      })
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [query]);

  useEffect(() => {
    if (!catalog || (!professionSlug && !sectorSlug && !locationSlug)) return;
    const toSlug = (value: string) =>
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    const next = new URLSearchParams(params);
    if (professionSlug) {
      const profession = catalog.dictionaries.find(
        (entry) =>
          entry.kind === "profession" &&
          (entry.id.endsWith(`.${professionSlug}`) ||
            toSlug(entry.label) === professionSlug),
      );
      if (profession) next.set("profession", profession.id);
    }
    if (sectorSlug) {
      const sector = catalog.dictionaries.find(
        (entry) =>
          entry.kind === "sector" &&
          (entry.id.endsWith(`.${sectorSlug}`) ||
            toSlug(entry.label) === sectorSlug),
      );
      if (sector) next.set("industry", sector.id);
    }
    if (locationSlug) next.set("location", locationSlug.replace(/-/g, " "));
    if (next.toString() !== params.toString())
      setParams(next, { replace: true });
  }, [catalog, locationSlug, params, professionSlug, sectorSlug, setParams]);

  const routePath = professionSlug
    ? `/emploi/metier/${professionSlug}`
    : sectorSlug
      ? `/emploi/secteur/${sectorSlug}`
      : locationSlug
        ? `/emploi/lieu/${locationSlug}`
        : "/emploi";
  const pageMeta = React.useMemo(() => {
    if (!marketContext) {
      return { title: "Emploi & Recrutement", noIndex: true, follow: true };
    }
    const routeData = catalog
      ? {
          status: "found" as const,
          data: {
            kind: "employment_search" as const,
            catalog,
            items,
            total,
            recommendationFactors,
            availableCountryCodes:
              initialData?.availableCountryCodes ||
              (total > 0 ? [activeMarket.code] : []),
          },
        }
      : ({ status: "not_applicable", data: null } as const);
    const policy = resolveSeoPolicy({
      pathname: routePath,
      query: Object.fromEntries(params.entries()),
      marketContext,
      routeData,
    });
    return pageMetaForPolicy(policy);
  }, [
    activeMarket.code,
    catalog,
    initialData?.availableCountryCodes,
    items,
    marketContext,
    params,
    recommendationFactors,
    routePath,
    total,
  ]);
  usePageMeta(pageMeta);

  const setParam = (key: string, value?: string) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  };

  const updateLocation = (value: LocationSelectorValue) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value.city) next.set("location", value.city);
        else next.delete("location");
        if (value.radiusKm) next.set("radius", String(value.radiusKm));
        else next.delete("radius");
        return next;
      },
      { replace: true },
    );
  };

  const resetFilters = () => {
    const next = new URLSearchParams(params);
    EMPLOYMENT_FILTER_KEYS.forEach((key) => next.delete(key));
    setParams(next, { replace: true });
  };

  const save = async (job: JobPostingCard) => {
    try {
      const result = await services.employment.toggleSavedJob(job.id);
      setItems((current) =>
        current.map((item) =>
          item.id === job.id ? { ...item, saved: result.saved } : item,
        ),
      );
      toast.success(
        result.saved ? "Offre enregistrée" : "Offre retirée des favoris",
      );
    } catch {
      toast.info("Connectez-vous pour enregistrer cette offre.");
    }
  };

  const createAlert = async () => {
    setSavingAlert(true);
    try {
      const label = [query.keywords || "Offres d’emploi", query.location]
        .filter(Boolean)
        .join(" · ");
      await services.employment.saveJobAlert({
        label,
        query,
        frequency: "daily",
      });
      toast.success("Alerte Emploi quotidienne créée.");
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Alerte non enregistrée.",
      );
    } finally {
      setSavingAlert(false);
    }
  };

  return (
    <main className="min-h-screen bg-bg-base">
      <section className="border-b border-border-base bg-text-main text-white">
        <Container className="py-8 sm:py-10">
          <div className="max-w-3xl">
            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary-light">
              <BriefcaseBusiness
                className="h-icon-sm w-icon-sm"
                aria-hidden="true"
              />
              {t("employment.search.eyebrow")}
            </p>
            <h1 className="text-2xl font-black sm:text-3xl lg:text-4xl">
              {t("employment.search.title")}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/75 sm:text-base">
              {t("employment.search.subtitle")}
            </p>
            <form
              className="mt-6 grid gap-2 rounded-card bg-bg-surface p-2 sm:grid-cols-search-fields"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                setParam("q", String(form.get("q") || "") || undefined);
              }}
            >
              <label className="sr-only" htmlFor="employment-query">
                {t("employment.search.queryLabel")}
              </label>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 h-icon-sm w-icon-sm -translate-y-1/2 text-text-muted"
                  aria-hidden="true"
                />
                <input
                  id="employment-query"
                  name="q"
                  defaultValue={params.get("q") || ""}
                  className="h-control-touch w-full rounded-control border border-border-base bg-bg-surface pl-10 pr-3 text-sm text-text-main outline-none focus:border-primary"
                  placeholder={t("employment.search.queryPlaceholder")}
                />
              </div>
              <LocationSelector
                id="employment-location-selector"
                variant="field"
                city={params.get("location") || ""}
                radiusKm={
                  params.get("radius")
                    ? Number(params.get("radius"))
                    : undefined
                }
                onChange={updateLocation}
              />
              <Button
                type="submit"
                variant="primary"
                className="w-full sm:w-auto"
              >
                Rechercher
              </Button>
            </form>
          </div>
        </Container>
      </section>

      <Container className="py-6">
        {recentJobs.length > 0 && !params.toString() && (
          <section className="mb-7" aria-labelledby="employment-recent-title">
            <h2
              id="employment-recent-title"
              className="text-lg font-black text-text-main"
            >
              Offres consultées récemment
            </h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {recentJobs.map((job) => (
                <JobCard key={job.id} job={job} catalog={catalog} compact />
              ))}
            </div>
          </section>
        )}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-text-main">
              {loading ? "Recherche…" : `${total} offres`}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-micro text-text-secondary">
              <ShieldCheck
                className="h-icon-xs w-icon-xs text-success"
                aria-hidden="true"
              />
              {t("employment.trust.sponsoredTransparency")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Bell className="h-icon-sm w-icon-sm" />}
              onClick={createAlert}
              disabled={savingAlert}
            >
              {savingAlert ? "Création…" : "Créer une alerte"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden"
              leftIcon={<Filter className="h-icon-sm w-icon-sm" />}
              onClick={() => setMobileFilters(true)}
            >
              Filtres
            </Button>
            <div className="hidden sm:block">
              <DropdownMenu
                ariaLabel="Trier les offres"
                headerTitle="Trier par"
                placement="bottom-right"
                size="sm"
                value={query.sort}
                onChange={(value) => setParam("sort", value)}
                options={[
                  { value: "relevance", label: "Pertinence" },
                  { value: "newest", label: "Plus récentes" },
                  { value: "salary", label: "Rémunération" },
                  { value: "distance", label: "Distance" },
                  { value: "deadline", label: "Date limite" },
                  { value: "promoted", label: "Placements sponsorisés" },
                ]}
              />
            </div>
          </div>
        </div>

        {recommendationFactors.length > 0 && (
          <p className="mb-4 rounded-control border border-border-subtle bg-bg-subtle px-3 py-2 text-xs text-text-secondary">
            Résultats expliqués par : {recommendationFactors.join(", ")}. Aucun
            critère protégé n’est utilisé.
          </p>
        )}

        <div className="grid gap-6 lg:grid-cols-sidebar">
          <aside
            className="hidden self-start lg:sticky lg:top-24 lg:block"
            aria-label="Filtres emploi"
          >
            {catalog ? (
              <EmploymentFilters
                catalog={catalog}
                params={params}
                setParam={setParam}
                onReset={resetFilters}
              />
            ) : (
              <Skeleton className="h-96" />
            )}
          </aside>
          <section
            aria-live="polite"
            aria-busy={loading}
            className="min-w-0 space-y-3"
          >
            {loading ? (
              Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-52 rounded-card" />
              ))
            ) : error ? (
              <StatePanel
                variant="error"
                title="La recherche est temporairement indisponible"
                description="Réessayez dans quelques instants. Vos filtres sont conservés."
                action={
                  <Button onClick={() => setParams(params)}>Réessayer</Button>
                }
              />
            ) : items.length ? (
              items.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  catalog={catalog}
                  onSave={save}
                />
              ))
            ) : (
              <StatePanel
                variant="notFound"
                title="Aucune offre ne correspond"
                description="Essayez une autre zone ou retirez un filtre."
                action={
                  <Button variant="outline" onClick={() => setParams({})}>
                    Effacer les filtres
                  </Button>
                }
              />
            )}
          </section>
        </div>
      </Container>

      {catalog ? (
        <Drawer
          isOpen={mobileFilters}
          onClose={() => setMobileFilters(false)}
          title="Filtres emploi"
        >
          <EmploymentFilters
            catalog={catalog}
            params={params}
            setParam={setParam}
            onReset={resetFilters}
            presentation="drawer"
            resultCount={total}
            onApply={() => setMobileFilters(false)}
          />
        </Drawer>
      ) : null}
    </main>
  );
};
