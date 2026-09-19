import { PAGE_SIZES } from "../../configuration/pagination.config";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, BriefcaseBusiness, ShieldCheck } from "lucide-react";
import type {
  EmploymentCatalog,
  EmploymentSearchQuery,
  JobPostingCard,
} from "@shongre/contracts/employment";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { services } from "../../api/client/service-registry";
import { useAuth } from "../../app/providers/AuthProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { useToast } from "../../app/providers/ToastProvider";
import {
  Button,
  Container,
  Drawer,
  DropdownMenu,
  FilterChip,
  FilterPanel,
  Input,
  ListingCardSkeleton,
  ListingGrid,
  ListingRail,
  LocationSelector,
  SearchActiveFiltersBar,
  SearchMapResultsLayout,
  SearchResultsToolbar,
  SearchSortControl,
  Skeleton,
  StatePanel,
  ViewModeToggle,
  countActiveSearchParams,
  useSearchFilterDisclosure,
} from "../../design-system";
import type {
  FilterPanelPresentation,
  LocationSelectorValue,
} from "../../design-system";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useTranslation } from "../../i18n/I18nProvider";
import { routes } from "../../configuration/routes";
import { JobCard } from "./components/JobCard";
import {
  readRecentEmploymentJobIds,
  selectRecentEmploymentJobs,
} from "./employment-recent-jobs";
import { usePublicRouteData } from "../../app/providers/PublicRouteDataProvider";
import {
  pageMetaForPolicy,
  resolveSeoPolicy,
} from "../../platform/seo/seo-policy";
import { resolvePublicMapCoordinates } from "../../configuration/geoCoordinates";
import type { SearchMapItem } from "../search/SearchResultsMap";

const SearchResultsMap = React.lazy(() =>
  import("../search/SearchResultsMap").then((module) => ({
    default: module.SearchResultsMap,
  })),
);

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

const EMPLOYMENT_SUMMARY_FILTER_KEYS = EMPLOYMENT_FILTER_KEYS.filter(
  (key) => key !== "radius",
);

const EmploymentFilters: React.FC<{
  panelId: string;
  catalog: EmploymentCatalog;
  params: URLSearchParams;
  setParam: (key: string, value?: string) => void;
  updateLocation: (value: LocationSelectorValue) => void;
  locationSelectorId: string;
  onReset: () => void;
  presentation?: FilterPanelPresentation;
  onApply?: () => void;
  resultCount?: number;
}> = ({
  panelId,
  catalog,
  params,
  setParam,
  updateLocation,
  locationSelectorId,
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
      id={panelId}
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
      <fieldset>
        <legend className="mb-2 text-xs font-bold text-text-main">
          Localisation
        </legend>
        <LocationSelector
          id={locationSelectorId}
          city={params.get("location") || ""}
          radiusKm={
            params.get("radius") ? Number(params.get("radius")) : undefined
          }
          onChange={updateLocation}
        />
      </fieldset>

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
          className="mb-2 block text-xs font-semibold text-text-main"
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
  const { currentUser, isRestoring } = useAuth();
  const { activeMarket, marketContext } = useMarketLocation();
  const toast = useToast();
  const navigate = useNavigate();
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
  const {
    desktopFiltersExpanded: showDesktopFilters,
    mobileFiltersExpanded: mobileFilters,
    toggleDesktopFilters,
    openMobileFilters,
    closeMobileFilters,
  } = useSearchFilterDisclosure();
  const requestedView = params.get("view");
  const viewMode =
    requestedView === "list" || requestedView === "map"
      ? requestedView
      : "grid";
  const [savingAlert, setSavingAlert] = useState(false);
  const accountId = currentUser?.id;
  const savedScope = `${accountId || "guest"}:${activeMarket.code}`;
  const [savedState, setSavedState] = useState<{
    scope: string;
    ids: string[];
    loadState: "loading" | "ready" | "error";
  }>(() => ({ scope: "", ids: [], loadState: "loading" }));
  const savedJobIds = useMemo(
    () => new Set(savedState.scope === savedScope ? savedState.ids : []),
    [savedScope, savedState],
  );
  const savedJobsLoadState =
    savedState.scope === savedScope ? savedState.loadState : "loading";

  const loadSavedJobs = useCallback(async () => {
    const scope = savedScope;
    setSavedState((current) => ({
      scope,
      ids: current.scope === scope ? current.ids : [],
      loadState: "loading",
    }));
    if (!accountId) {
      setSavedState({ scope, ids: [], loadState: "ready" });
      return;
    }
    try {
      const ids = await services.employment.getSavedJobIds(activeMarket.code);
      setSavedState((current) =>
        current.scope === scope
          ? { scope, ids: Array.from(new Set(ids)), loadState: "ready" }
          : current,
      );
    } catch (reason) {
      setSavedState((current) =>
        current.scope === scope ? { ...current, loadState: "error" } : current,
      );
      throw reason;
    }
  }, [accountId, activeMarket.code, savedScope]);

  useEffect(() => {
    void loadSavedJobs().catch(() => undefined);
  }, [loadSavedJobs]);

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

  const clearAllSearch = () => {
    const next = new URLSearchParams(params);
    ["q", "location", ...EMPLOYMENT_FILTER_KEYS].forEach((key) =>
      next.delete(key),
    );
    setParams(next, { replace: true });
  };

  const activeFacetCount = countActiveSearchParams(
    params,
    EMPLOYMENT_SUMMARY_FILTER_KEYS,
  );
  const activeLocation = params.get("location");
  const activeRadius = params.get("radius");
  const activeFilterCount =
    (params.get("q") ? 1 : 0) +
    (activeLocation || activeRadius ? 1 : 0) +
    activeFacetCount;
  // "Recently viewed" is a device preference read once the session is known,
  // so a signed-in reader never sees the guest list of the same browser. It
  // is picked from the board already on the page — no extra request — and
  // only shown on the unfiltered board, where it is a shortcut rather than a
  // competing result set.
  const [recentJobIds, setRecentJobIds] = useState<string[]>([]);
  useEffect(() => {
    if (isRestoring) return;
    setRecentJobIds(
      readRecentEmploymentJobIds(accountId, activeMarket.code).slice(0, 4),
    );
  }, [accountId, activeMarket.code, isRestoring]);
  const recentJobs = useMemo(
    () => selectRecentEmploymentJobs(recentJobIds, items),
    [items, recentJobIds],
  );
  const recentlyViewedLabel = t("employment.search.recentlyViewed");
  const mapItems = useMemo<SearchMapItem[]>(
    () =>
      items.flatMap((job) => {
        if (
          !job.primaryLocation.isPublic ||
          job.workingArrangementId.endsWith(".remote")
        ) {
          return [];
        }
        const coordinates = resolvePublicMapCoordinates({
          id: job.id,
          city: job.primaryLocation.city,
          latitude: job.primaryLocation.latitude,
          longitude: job.primaryLocation.longitude,
          marketCode: activeMarket.code,
        });
        if (!coordinates) return [];
        return [
          {
            id: job.id,
            title: job.title,
            href: routes.employment.job(job.slug),
            locationLabel: job.primaryLocation.label,
            latitude: coordinates.lat,
            longitude: coordinates.lng,
            eyebrow: job.employer.name,
            detail: `${job.contractTypeLabel} · ${job.workingArrangementLabel}`,
          },
        ];
      }),
    [activeMarket.code, items],
  );
  const mappedJobIds = useMemo(
    () => new Set(mapItems.map(({ id }) => id)),
    [mapItems],
  );

  const save = async (job: JobPostingCard) => {
    if (savedJobsLoadState !== "ready") return;
    if (!currentUser) {
      navigate(
        routes.auth.login(
          `${window.location.pathname}${window.location.search}`,
        ),
      );
      return;
    }
    try {
      const isSaved = await services.employment.setSavedJob(
        job.id,
        activeMarket.code,
        !savedJobIds.has(job.id),
      );
      setSavedState((current) =>
        current.scope === savedScope
          ? {
              ...current,
              ids: isSaved
                ? Array.from(new Set([...current.ids, job.id]))
                : current.ids.filter((id) => id !== job.id),
            }
          : current,
      );
      toast.success(
        isSaved ? "Offre enregistrée" : "Offre retirée des favoris",
      );
    } catch {
      toast.error(t("ui.listingCard.favoriErreur"));
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
    <div className="min-h-screen bg-bg-base">
      <section className="border-b border-border-base bg-surface-inverse text-text-inverse">
        <Container className="py-5 sm:py-8">
          <div className="max-w-3xl">
            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-text-inverse-faint">
              <BriefcaseBusiness
                className="h-icon-sm w-icon-sm"
                aria-hidden="true"
              />
              {t("employment.search.eyebrow")}
            </p>
            <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl">
              {t("employment.search.title")}
            </h1>
            <p className="mt-2 hidden max-w-2xl text-sm text-text-inverse/75 sm:block sm:text-base">
              {t("employment.search.subtitle")}
            </p>
          </div>
          {activeFilterCount > 0 ? (
            <SearchActiveFiltersBar
              className="mt-4 mb-0 text-text-main sm:mt-6 sm:mb-0"
              onClear={clearAllSearch}
            >
              {params.get("q") ? (
                <FilterChip
                  tone="query"
                  label={params.get("q") || ""}
                  onRemove={() => setParam("q", undefined)}
                >
                  “{params.get("q")}”
                </FilterChip>
              ) : null}
              {activeLocation || activeRadius ? (
                <FilterChip onRemove={() => updateLocation({})}>
                  {activeLocation || t("ui.searchControls.zoneSelected")}
                  {activeRadius ? ` (+${activeRadius} km)` : ""}
                </FilterChip>
              ) : null}
              {activeFacetCount > 0 ? (
                <FilterChip
                  label={t(
                    activeFacetCount === 1
                      ? "ui.searchControls.criterion"
                      : "ui.searchControls.criteria",
                    { count: activeFacetCount },
                  )}
                  onRemove={resetFilters}
                >
                  {t(
                    activeFacetCount === 1
                      ? "ui.searchControls.criterion"
                      : "ui.searchControls.criteria",
                    { count: activeFacetCount },
                  )}
                </FilterChip>
              ) : null}
            </SearchActiveFiltersBar>
          ) : null}
        </Container>
      </section>

      <Container width="results" className="py-5 sm:py-6">
        {recentJobs.length > 0 && !params.toString() && catalog ? (
          <section className="mb-7" aria-labelledby="employment-recent-title">
            <h2
              id="employment-recent-title"
              className="text-lg font-bold text-text-main"
            >
              {recentlyViewedLabel}
            </h2>
            <ListingRail label={recentlyViewedLabel} className="mt-3">
              {recentJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={{ ...job, saved: savedJobIds.has(job.id) }}
                  catalog={catalog}
                  onSave={save}
                  favoriteLoadState={savedJobsLoadState}
                  onFavoriteRetry={loadSavedJobs}
                  compact
                />
              ))}
            </ListingRail>
          </section>
        ) : null}
        <SearchResultsToolbar
          resultLabel={loading ? "Recherche…" : `${total} offres`}
          resultDescription={
            <span className="flex items-center gap-1.5">
              <ShieldCheck
                className="h-icon-xs w-icon-xs text-success"
                aria-hidden="true"
              />
              {t("employment.trust.sponsoredTransparency")}
            </span>
          }
          desktopFilterPanelId="employment-filter-panel-desktop"
          mobileFilterPanelId="employment-filter-panel-mobile"
          desktopFiltersExpanded={showDesktopFilters}
          mobileFiltersExpanded={mobileFilters}
          activeFilterCount={activeFilterCount}
          onToggleDesktopFilters={toggleDesktopFilters}
          onOpenMobileFilters={openMobileFilters}
          actions={
            <Button
              aria-label={savingAlert ? "Création…" : "Créer une alerte"}
              variant="outline"
              size="md"
              leftIcon={<Bell className="h-icon-sm w-icon-sm" />}
              onClick={createAlert}
              disabled={savingAlert}
            >
              <span className="hidden sm:inline">
                {savingAlert ? "Création…" : "Créer une alerte"}
              </span>
            </Button>
          }
          viewControls={
            <ViewModeToggle
              viewMode={viewMode}
              onChange={(mode) =>
                setParam("view", mode === "grid" ? undefined : mode)
              }
              showMap
              size="md"
            />
          }
          sortControl={
            <SearchSortControl>
              <DropdownMenu
                ariaLabel="Trier les offres"
                headerTitle="Trier par"
                placement="bottom-right"
                size="md"
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
            </SearchSortControl>
          }
        />

        {recommendationFactors.length > 0 && (
          <p className="mb-4 rounded-control border border-border-subtle bg-bg-subtle px-3 py-2 text-xs text-text-secondary">
            Résultats expliqués par : {recommendationFactors.join(", ")}. Aucun
            critère protégé n’est utilisé.
          </p>
        )}

        <div
          className={`grid gap-6 ${showDesktopFilters ? "lg:grid-cols-sidebar" : "lg:grid-cols-1"}`}
        >
          {showDesktopFilters ? (
            <aside
              className="hidden self-start lg:sticky lg:top-24 lg:block"
              aria-label="Filtres emploi"
            >
              {catalog ? (
                <EmploymentFilters
                  panelId="employment-filter-panel-desktop"
                  catalog={catalog}
                  params={params}
                  setParam={setParam}
                  updateLocation={updateLocation}
                  locationSelectorId="employment-location-selector-desktop"
                  onReset={resetFilters}
                />
              ) : (
                <Skeleton className="h-96" />
              )}
            </aside>
          ) : null}
          <section aria-live="polite" aria-busy={loading} className="min-w-0">
            <h2 className="sr-only">{t("search.resultsHeading")}</h2>
            {loading && viewMode === "map" ? (
              <div
                role="status"
                aria-label={t("common.loadingMap")}
                className="h-search-map rounded-card border border-border-base bg-bg-surface p-3"
              >
                <Skeleton className="h-full w-full rounded-card" />
              </div>
            ) : loading ? (
              <ListingGrid
                fluid={viewMode === "grid"}
                variant={viewMode === "list" ? "list" : "grid"}
              >
                {Array.from({ length: 6 }, (_, index) => (
                  <div key={index} className="min-w-0">
                    <ListingCardSkeleton />
                  </div>
                ))}
              </ListingGrid>
            ) : error ? (
              <StatePanel
                variant="error"
                title="La recherche est temporairement indisponible"
                description="Réessayez dans quelques instants. Vos filtres sont conservés."
                action={
                  <Button onClick={() => setParams(params)}>Réessayer</Button>
                }
              />
            ) : items.length && viewMode === "map" ? (
              mapItems.length ? (
                <SearchMapResultsLayout
                  resultsLabel="Offres d’emploi sur la carte"
                  results={
                    <ListingGrid variant="list">
                      {items
                        .filter((job) => mappedJobIds.has(job.id))
                        .map((job) => (
                          <div
                            key={job.id}
                            data-search-map-result-card="true"
                            className="min-w-0"
                          >
                            <JobCard
                              job={{
                                ...job,
                                saved: savedJobIds.has(job.id),
                              }}
                              displayVariant="list"
                              catalog={catalog}
                              onSave={save}
                              favoriteLoadState={savedJobsLoadState}
                              onFavoriteRetry={loadSavedJobs}
                            />
                          </div>
                        ))}
                    </ListingGrid>
                  }
                  map={
                    <React.Suspense
                      fallback={
                        <div
                          role="status"
                          aria-label={t("common.loadingMap")}
                          className="h-full rounded-card border border-border-base bg-bg-surface p-3"
                        >
                          <Skeleton className="h-full w-full rounded-card" />
                        </div>
                      }
                    >
                      <SearchResultsMap items={mapItems} layout="split" />
                    </React.Suspense>
                  }
                />
              ) : (
                <StatePanel
                  variant="notFound"
                  title={t("ui.searchResultsMap.emptyTitle")}
                  description={t("ui.searchResultsMap.emptyDescription")}
                />
              )
            ) : items.length ? (
              <ListingGrid
                fluid={viewMode === "grid"}
                variant={viewMode === "list" ? "list" : "grid"}
              >
                {items.map((job, index) => (
                  <JobCard
                    key={job.id}
                    job={{ ...job, saved: savedJobIds.has(job.id) }}
                    /* The first result is above the fold on every viewport,
                       and it is the page's LCP candidate. Lazy-loading it put
                       its cover behind every other request on the page. */
                    imagePriority={index === 0}
                    displayVariant={viewMode === "list" ? "list" : "grid"}
                    catalog={catalog}
                    onSave={save}
                    favoriteLoadState={savedJobsLoadState}
                    onFavoriteRetry={loadSavedJobs}
                  />
                ))}
              </ListingGrid>
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
          onClose={closeMobileFilters}
          title="Filtres emploi"
        >
          <EmploymentFilters
            panelId="employment-filter-panel-mobile"
            catalog={catalog}
            params={params}
            setParam={setParam}
            updateLocation={updateLocation}
            locationSelectorId="employment-location-selector-mobile"
            onReset={resetFilters}
            presentation="drawer"
            resultCount={total}
            onApply={closeMobileFilters}
          />
        </Drawer>
      ) : null}
    </div>
  );
};
