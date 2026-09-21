import { immoOptions } from "./immo-format";
import { PAGE_SIZES } from "../../configuration/pagination.config";
import { useTranslation } from "../../i18n/I18nProvider";
import React, { useEffect, useMemo, useState } from "react";
import { Bell } from "lucide-react";
import type {
  EnergyClass,
  PropertyPublic,
  PropertySearchQuery,
  RealEstateCatalog,
} from "@shongre/contracts/real-estate";
import { useNavigate, useSearchParams } from "react-router-dom";
import { services } from "../../api/client/service-registry";
import { routes } from "../../configuration/routes";
import { useAuth } from "../../app/providers/AuthProvider";
import { useFavorites } from "../../app/providers/FavoritesProvider";
import { useToast } from "../../app/providers/ToastProvider";
import {
  Button,
  Container,
  DropdownMenu,
  FilterChip,
  FilterPanel,
  Input,
  ListingCardSkeleton,
  ListingGrid,
  LocationSelector,
  SearchActiveFiltersBar,
  SearchMapResultsLayout,
  SearchResultsToolbar,
  SearchFilterDrawer,
  SearchSortControl,
  Skeleton,
  StatePanel,
  ViewModeToggle,
  countActiveSearchParams,
  useSearchFilterDisclosure,
} from "../../design-system";
import type { LocationSelectorValue } from "../../design-system";
import { usePageMeta } from "../../hooks/usePageMeta";
// Leaflet reads `window` when its module body runs, so a static import puts the
// map engine in the server graph: every render of /immo threw
// "window is not defined" and the route silently degraded to a client-only
// shell — on a listings vertical that costs SSR, LCP and indexability. It is
// also the heaviest optional dependency in the product, and list view does not
// need it. `SearchPage` already loads its map this way; this route did not.
const ImmoMap = React.lazy(() =>
  import("./components/ImmoMap").then((module) => ({
    default: module.ImmoMap,
  })),
);
import { PropertyCard } from "./components/PropertyCard";
import { formatCurrencySymbol } from "../../utilities/formatters";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";

const csv = (value: string | null) => (value || "").split(",").filter(Boolean);
const number = (value: string | null, multiplier = 1) =>
  value ? Number(value) * multiplier : undefined;

const IMMO_FILTER_KEYS = [
  "types",
  "minPrice",
  "maxPrice",
  "minSurface",
  "maxSurface",
  "minPricePerSquareMeter",
  "maxPricePerSquareMeter",
  "rooms",
  "bedrooms",
  "dpe",
  "seller",
  "furnished",
  "amenities",
] as const;

const IMMO_SUMMARY_FILTER_KEYS = ["transaction", ...IMMO_FILTER_KEYS] as const;

const ImmoFilters: React.FC<{
  panelId: string;
  catalog: RealEstateCatalog;
  params: URLSearchParams;
  setParam: (key: string, value?: string) => void;
  updateLocation: (value: LocationSelectorValue) => void;
  locationSelectorId: string;
  onReset: () => void;
  onApply?: () => void;
  resultCount?: number;
  activeSectionId?: string;
}> = ({
  panelId,
  catalog,
  params,
  setParam,
  updateLocation,
  locationSelectorId,
  onReset,
  onApply,
  resultCount = 0,
  activeSectionId,
}) => {
  const { currentLocale } = useMarketLocation();
  const currencySymbol = formatCurrencySymbol(
    catalog.config.currency,
    currentLocale,
  );
  const selectedTypes = csv(params.get("types"));
  const selectedAmenities = csv(params.get("amenities"));
  const toggleType = (type: string) => {
    const next = selectedTypes.includes(type)
      ? selectedTypes.filter((item) => item !== type)
      : [...selectedTypes, type];
    setParam("types", next.length ? next.join(",") : undefined);
  };
  const toggleAmenity = (amenity: string) => {
    const next = selectedAmenities.includes(amenity)
      ? selectedAmenities.filter((item) => item !== amenity)
      : [...selectedAmenities, amenity];
    setParam("amenities", next.length ? next.join(",") : undefined);
  };
  return (
    <FilterPanel
      id={panelId}
      activeSectionId={activeSectionId}
      onReset={onReset}
      footer={
        onApply ? (
          <Button fullWidth onClick={onApply}>
            Voir {resultCount} bien{resultCount > 1 ? "s" : ""}
          </Button>
        ) : undefined
      }
    >
      <fieldset data-filter-section="immo-project">
        <legend className="mb-2 text-xs font-bold text-text-main">
          Projet
        </legend>
        <DropdownMenu
          ariaLabel="Projet immobilier"
          headerTitle="Projet"
          fullWidth
          value={params.get("transaction") || "sale"}
          onChange={(value) => setParam("transaction", value)}
          options={immoOptions(
            catalog,
            "property_transaction",
            currentLocale,
          ).filter((option) =>
            catalog.propertyTypes.some((type) =>
              type.transactionTypes.some(
                (transaction) => transaction === option.value,
              ),
            ),
          )}
        />
      </fieldset>
      <fieldset data-filter-section="immo-location">
        <legend className="mb-2 text-xs font-bold text-text-main">
          Localisation
        </legend>
        <LocationSelector
          id={locationSelectorId}
          city={params.get("city") || ""}
          radiusKm={
            params.get("radius") ? Number(params.get("radius")) : undefined
          }
          onChange={updateLocation}
        />
      </fieldset>
      <fieldset data-filter-section="immo-type">
        <legend className="mb-2 text-xs font-bold text-text-main">
          Type de bien
        </legend>
        <div className="space-y-2">
          {catalog.propertyTypes.slice(0, 7).map((type) => (
            <label
              key={type.type}
              className="flex min-h-8 cursor-pointer items-center gap-2 text-xs text-text-main"
            >
              <input
                type="checkbox"
                checked={selectedTypes.includes(type.type)}
                onChange={() => toggleType(type.type)}
                className="h-4 w-4 accent-primary"
              />
              {type.label}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset data-filter-section="immo-budget">
        <legend className="mb-2 text-xs font-bold text-text-main">
          Budget
        </legend>
        <div className="grid grid-cols-2 gap-2">
          <Input
            aria-label="Budget minimum"
            inputMode="numeric"
            className="w-full"
            placeholder={`Min. ${currencySymbol}`}
            value={params.get("minPrice") || ""}
            onChange={(event) =>
              setParam("minPrice", event.target.value || undefined)
            }
          />
          <Input
            aria-label="Budget maximum"
            inputMode="numeric"
            className="w-full"
            placeholder={`Max. ${currencySymbol}`}
            value={params.get("maxPrice") || ""}
            onChange={(event) =>
              setParam("maxPrice", event.target.value || undefined)
            }
          />
          <Input
            aria-label="Prix minimum par mètre carré"
            inputMode="numeric"
            className="w-full"
            placeholder={`Min. ${currencySymbol}/m²`}
            value={params.get("minPricePerSquareMeter") || ""}
            onChange={(event) =>
              setParam(
                "minPricePerSquareMeter",
                event.target.value || undefined,
              )
            }
          />
          <Input
            aria-label="Prix maximum par mètre carré"
            inputMode="numeric"
            className="w-full"
            placeholder={`Max. ${currencySymbol}/m²`}
            value={params.get("maxPricePerSquareMeter") || ""}
            onChange={(event) =>
              setParam(
                "maxPricePerSquareMeter",
                event.target.value || undefined,
              )
            }
          />
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-xs font-bold text-text-main">
          Surface et pièces
        </legend>
        <div className="grid grid-cols-2 gap-2">
          <Input
            aria-label="Surface minimum"
            inputMode="numeric"
            className="w-full"
            placeholder="Min. m²"
            value={params.get("minSurface") || ""}
            onChange={(event) =>
              setParam("minSurface", event.target.value || undefined)
            }
          />
          <Input
            aria-label="Surface maximum"
            inputMode="numeric"
            className="w-full"
            placeholder="Max. m²"
            value={params.get("maxSurface") || ""}
            onChange={(event) =>
              setParam("maxSurface", event.target.value || undefined)
            }
          />
          <DropdownMenu
            ariaLabel="Nombre minimum de pièces"
            headerTitle="Pièces"
            fullWidth
            value={params.get("rooms") || ""}
            onChange={(value) => setParam("rooms", value || undefined)}
            options={[
              { value: "", label: "Pièces" },
              ...[1, 2, 3, 4, 5].map((value) => ({
                value: String(value),
                label: `${value}+`,
              })),
            ]}
          />
          <DropdownMenu
            ariaLabel="Nombre minimum de chambres"
            headerTitle="Chambres"
            fullWidth
            value={params.get("bedrooms") || ""}
            onChange={(value) => setParam("bedrooms", value || undefined)}
            options={[
              { value: "", label: "Chambres" },
              ...[1, 2, 3, 4, 5].map((value) => ({
                value: String(value),
                label: `${value}+`,
              })),
            ]}
          />
        </div>
      </fieldset>
      <div>
        <span className="mb-2 block text-xs font-bold text-text-main">
          Location meublée
        </span>
        <DropdownMenu
          ariaLabel="Location meublée"
          headerTitle="Location meublée"
          fullWidth
          value={params.get("furnished") || ""}
          onChange={(value) => setParam("furnished", value || undefined)}
          options={[
            { value: "", label: "Indifférent" },
            { value: "true", label: "Meublé" },
            { value: "false", label: "Non meublé" },
          ]}
        />
      </div>
      <fieldset>
        <legend className="mb-2 text-xs font-bold text-text-main">
          Équipements
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            catalog.attributes.find((item) => item.id === "amenities")
              ?.options || []
          ).map((option) => (
            <label
              key={option.value}
              className="flex min-h-8 items-center gap-2 text-xs"
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={selectedAmenities.includes(option.value)}
                onChange={() => toggleAmenity(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <span className="mb-2 block text-xs font-bold text-text-main">
          Performance énergétique
        </span>
        <DropdownMenu
          ariaLabel="Performance énergétique"
          headerTitle="Performance énergétique"
          fullWidth
          value={params.get("dpe") || ""}
          onChange={(value) => setParam("dpe", value || undefined)}
          options={[
            { value: "", label: "Toutes les classes" },
            ...(catalog.attributes.find((field) => field.id === "dpe")
              ?.options ?? []),
          ]}
        />
      </div>
      <div>
        <span className="mb-2 block text-xs font-bold text-text-main">
          Annonceur
        </span>
        <DropdownMenu
          ariaLabel="Annonceur"
          headerTitle="Annonceur"
          fullWidth
          value={params.get("seller") || ""}
          onChange={(value) => setParam("seller", value || undefined)}
          options={[
            { value: "", label: "Tous" },
            { value: "owner", label: "Particulier" },
            { value: "agency", label: "Agence" },
            { value: "developer", label: "Promoteur" },
          ]}
        />
      </div>
    </FilterPanel>
  );
};

export const ImmoSearchPage: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { activeMarket } = useMarketLocation();
  const toast = useToast();
  const navigate = useNavigate();
  const { favoriteIds, favoriteLoadState, refreshFavorites, toggleFavorite } =
    useFavorites();
  const [params, setParams] = useSearchParams();
  const [catalog, setCatalog] = useState<RealEstateCatalog | null>(null);
  const [items, setItems] = useState<PropertyPublic[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [selectedId, setSelectedId] = useState<string>();
  const {
    filtersExpanded: mobileFilters,
    activeFilterSection,
    openFilters,
    closeFilters,
  } = useSearchFilterDisclosure();
  const view = params.get("view") === "list" ? "list" : "map";
  const queryText = params.get("q") || "";
  const visibleItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        isFavorite: favoriteIds.includes(item.listingId),
      })),
    [favoriteIds, items],
  );

  usePageMeta({
    title: "Immobilier à Lyon : ventes et locations",
    description:
      "Trouvez un appartement, une maison ou un local avec carte, filtres et annonces structurées.",
    canonicalPath: "/immo",
    noIndex: Boolean(queryText),
  });

  const query = useMemo<PropertySearchQuery>(() => {
    const city = params.get("city") || undefined;
    const latitude = number(params.get("lat"));
    const longitude = number(params.get("lng"));
    const north = number(params.get("north"));
    const east = number(params.get("east"));
    const south = number(params.get("south"));
    const west = number(params.get("west"));
    return {
      marketCode: activeMarket.code,
      query: queryText || undefined,
      city,
      center:
        !city && latitude !== undefined && longitude !== undefined
          ? { latitude, longitude }
          : undefined,
      radiusKm: number(params.get("radius")),
      boundingBox:
        !city &&
        north !== undefined &&
        east !== undefined &&
        south !== undefined &&
        west !== undefined
          ? { north, east, south, west }
          : undefined,
      transactionTypes: [
        (params.get("transaction") ||
          "sale") as PropertySearchQuery["transactionTypes"] extends
          (infer T)[] | undefined
          ? T
          : never,
      ],
      propertyTypes: csv(params.get("types")) as NonNullable<
        PropertySearchQuery["propertyTypes"]
      >,
      minPriceMinor: number(params.get("minPrice"), 100),
      maxPriceMinor: number(params.get("maxPrice"), 100),
      minSurfaceSquareMeters: number(params.get("minSurface")),
      maxSurfaceSquareMeters: number(params.get("maxSurface")),
      minPricePerSquareMeterMinor: number(
        params.get("minPricePerSquareMeter"),
        100,
      ),
      maxPricePerSquareMeterMinor: number(
        params.get("maxPricePerSquareMeter"),
        100,
      ),
      minRooms: number(params.get("rooms")),
      minBedrooms: number(params.get("bedrooms")),
      furnished:
        params.get("furnished") === "true"
          ? true
          : params.get("furnished") === "false"
            ? false
            : undefined,
      dpeClasses: csv(params.get("dpe")) as EnergyClass[],
      amenities: csv(params.get("amenities")),
      sellerTypes: csv(params.get("seller")) as NonNullable<
        PropertySearchQuery["sellerTypes"]
      >,
      sort: (params.get("sort") || "promoted") as PropertySearchQuery["sort"],
      limit: PAGE_SIZES.verticalSearch,
    };
  }, [activeMarket.code, params, queryText]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(undefined);
    Promise.all([
      services.realEstate.getCatalog(activeMarket.code),
      services.realEstate.searchProperties(query),
    ])
      .then(([nextCatalog, result]) => {
        if (!active) return;
        setCatalog(nextCatalog);
        setItems(result.items);
        setTotal(result.total);
        setSelectedId((current) =>
          current && result.items.some((item) => item.id === current)
            ? current
            : result.items[0]?.id,
        );
      })
      .catch(
        (cause) =>
          active &&
          setError(
            cause instanceof Error
              ? cause.message
              : "La recherche est indisponible.",
          ),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [query, currentUser?.id]);

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
        if (value.city) next.set("city", value.city);
        else next.delete("city");
        if (value.radiusKm) next.set("radius", String(value.radiusKm));
        else next.delete("radius");
        ["lat", "lng", "north", "east", "south", "west"].forEach((key) =>
          next.delete(key),
        );
        return next;
      },
      { replace: true },
    );
  };

  const resetFilters = () => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        IMMO_FILTER_KEYS.forEach((key) => next.delete(key));
        return next;
      },
      { replace: true },
    );
  };

  const clearAllSearch = () => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        [
          "q",
          "city",
          "radius",
          "lat",
          "lng",
          "north",
          "east",
          "south",
          "west",
          ...IMMO_SUMMARY_FILTER_KEYS,
        ].forEach((key) => next.delete(key));
        return next;
      },
      { replace: true },
    );
  };

  const activeFacetCount = countActiveSearchParams(
    params,
    IMMO_SUMMARY_FILTER_KEYS,
  );
  const activeLocation = params.get("city");
  const activeRadius = params.get("radius");
  const activeFilterCount =
    (queryText ? 1 : 0) +
    (activeLocation || activeRadius ? 1 : 0) +
    activeFacetCount;

  const setMapBounds = (
    bounds: { north: number; east: number; south: number; west: number },
    center: { latitude: number; longitude: number },
  ) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        const values = {
          north: bounds.north,
          east: bounds.east,
          south: bounds.south,
          west: bounds.west,
          lat: center.latitude,
          lng: center.longitude,
        };
        for (const [key, value] of Object.entries(values))
          next.set(key, value.toFixed(5));
        return next.toString() === current.toString() ? current : next;
      },
      { replace: true },
    );
  };

  const favorite = async (property: PropertyPublic) => {
    try {
      const active = await toggleFavorite(property.listingId);
      toast.success(
        active ? "Bien ajouté aux favoris." : "Bien retiré des favoris.",
      );
    } catch {
      if (!currentUser) {
        const redirect = encodeURIComponent(
          `${window.location.pathname}${window.location.search}`,
        );
        navigate(`/connexion?redirect=${redirect}`);
        return;
      }
      toast.error("Le favori n’a pas pu être enregistré.");
    }
  };

  const saveAlert = async () => {
    if (!catalog) {
      toast.error(t("watch.immo.catalogLoading"));
      return;
    }
    if (!currentUser) {
      navigate(routes.auth.login(routes.immo.search()));
      return;
    }
    const id = `immo-${Date.now()}`;
    const title = t("watch.immo.title", {
      transaction:
        query.transactionTypes?.[0] === "sale"
          ? t("watch.immo.sale")
          : t("watch.immo.rental"),
      location: query.city || t("watch.immo.defaultLocation"),
    });
    try {
      await services.watchSubscriptions.createOrReplace({
        marketCode: activeMarket.code,
        targetType: "saved_search",
        targetId: id,
        title,
        frequency: "daily",
        channels: { inApp: true, email: true, push: false },
        searchFilter: {
          categoryId: catalog.activation.categoryIds[0],
          ...(query.query ? { query: query.query } : {}),
          ...(query.city ? { city: query.city } : {}),
          ...(query.minPriceMinor !== undefined
            ? { minPriceMinor: query.minPriceMinor }
            : {}),
          ...(query.maxPriceMinor !== undefined
            ? { maxPriceMinor: query.maxPriceMinor }
            : {}),
        },
      });
      toast.success(t("watch.immo.success"));
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : t("watch.immo.error"),
      );
    }
  };

  return (
    <div className="min-h-screen bg-bg-subtle pb-12">
      <section className="border-b border-border-base bg-bg-surface py-4 sm:py-6">
        <Container>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">
              Shongre Immo
            </p>
            <h1 className="mt-1 text-xl font-bold text-text-main sm:text-2xl">
              Trouvez le bien qui vous ressemble
            </h1>
            <p className="mt-1 hidden text-xs text-text-secondary sm:block">
              Adresse précise protégée · annonces structurées · demandes
              qualifiées
            </p>
          </div>
          {activeFilterCount > 0 ? (
            <SearchActiveFiltersBar
              className="mt-4 mb-0 sm:mt-5 sm:mb-0"
              onClear={clearAllSearch}
            >
              {queryText ? (
                <FilterChip
                  tone="query"
                  label={queryText}
                  onRemove={() => setParam("q", undefined)}
                >
                  “{queryText}”
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

      <Container width="results" className="py-5">
        <SearchResultsToolbar
          resultLabel={loading ? "Recherche…" : `${total} biens`}
          resultDescription="Localisation volontairement approximative sur la carte."
          filterPanelId="immo-filter-panel"
          filtersExpanded={mobileFilters}
          activeFilterSection={activeFilterSection}
          filterTriggers={[
            {
              sectionId: "immo-project",
              label: t("ui.filterPanel.quick.project"),
              active: Boolean(params.get("transaction")),
            },
            {
              sectionId: "immo-location",
              label: t("ui.filterPanel.quick.location"),
              active: Boolean(params.get("city")),
            },
            {
              sectionId: "immo-type",
              label: t("ui.filterPanel.quick.propertyType"),
              active: Boolean(params.get("types")),
            },
            {
              sectionId: "immo-budget",
              label: t("ui.filterPanel.quick.budget"),
              active: Boolean(params.get("minPrice") || params.get("maxPrice")),
            },
          ]}
          activeFilterCount={activeFilterCount}
          onOpenFilters={openFilters}
          actions={
            <Button
              aria-label="Créer une alerte"
              data-marketplace-action="saved-search.create"
              variant="outline"
              size="md"
              onClick={saveAlert}
              leftIcon={<Bell className="h-icon-md w-icon-md" />}
            >
              <span className="hidden sm:inline">Créer une alerte</span>
            </Button>
          }
          viewControls={
            <ViewModeToggle
              viewMode={view}
              onChange={(mode) => setParam("view", mode)}
              modes={["list", "map"]}
              size="md"
            />
          }
          sortControl={
            <SearchSortControl>
              <DropdownMenu
                ariaLabel="Trier les biens"
                headerTitle="Trier par"
                placement="bottom-right"
                size="md"
                value={query.sort}
                onChange={(value) => setParam("sort", value)}
                options={[
                  { value: "promoted", label: "Sélection Shongre" },
                  { value: "newest", label: "Plus récentes" },
                  { value: "price_asc", label: "Prix croissant" },
                  { value: "price_desc", label: "Prix décroissant" },
                  { value: "surface_desc", label: "Plus grandes surfaces" },
                ]}
              />
            </SearchSortControl>
          }
        />

        {error ? (
          <StatePanel
            variant="error"
            title="Recherche indisponible"
            description={error}
            action={
              <Button onClick={() => setParams(params)}>Réessayer</Button>
            }
          />
        ) : null}
        {!error && catalog ? (
          <div className="grid items-start gap-6 lg:grid-cols-1">
            <h2 className="sr-only">{t("search.resultsHeading")}</h2>
            {view === "map" ? (
              <SearchMapResultsLayout
                resultsLabel="Biens immobiliers sur la carte"
                narrowView="results"
                results={
                  loading ? (
                    <ListingGrid variant="list">
                      {Array.from({ length: 3 }, (_, index) => (
                        <div key={index} className="min-w-0">
                          <ListingCardSkeleton />
                        </div>
                      ))}
                    </ListingGrid>
                  ) : items.length ? (
                    <ListingGrid variant="list">
                      {visibleItems.map((property) => (
                        <div
                          key={property.id}
                          data-search-map-result-card="true"
                          className="min-w-0"
                        >
                          <PropertyCard
                            property={property}
                            displayVariant="list"
                            selected={selectedId === property.id}
                            onSelect={(item) => setSelectedId(item.id)}
                            onFavorite={favorite}
                            favoriteState={favoriteIds.includes(
                              property.listingId,
                            )}
                            favoriteLoadState={favoriteLoadState}
                            onFavoriteRetry={refreshFavorites}
                          />
                        </div>
                      ))}
                    </ListingGrid>
                  ) : (
                    <StatePanel
                      variant="notFound"
                      title="Aucun bien ne correspond"
                      description="Essayez une zone plus large ou retirez un filtre."
                    />
                  )
                }
                map={
                  <div
                    data-search-results-map
                    className="h-full overflow-hidden rounded-listing-card border border-border-base bg-bg-surface shadow-xs"
                  >
                    {loading ? (
                      <div
                        role="status"
                        aria-label={t("common.loadingMap")}
                        className="h-full w-full p-3"
                      >
                        <Skeleton className="h-full w-full rounded-listing-card" />
                      </div>
                    ) : (
                      <React.Suspense
                        fallback={
                          <div
                            role="status"
                            aria-label={t("common.loadingMap")}
                            className="h-full w-full p-3"
                          >
                            <Skeleton className="h-full w-full rounded-listing-card" />
                          </div>
                        }
                      >
                        <ImmoMap
                          properties={visibleItems}
                          selectedId={selectedId}
                          onSelect={(property) => setSelectedId(property.id)}
                          onBoundsChange={setMapBounds}
                        />
                      </React.Suspense>
                    )}
                  </div>
                }
              />
            ) : (
              <section aria-label="Résultats immobiliers" className="min-w-0">
                {loading ? (
                  <ListingGrid variant="list">
                    {Array.from({ length: 6 }, (_, index) => (
                      <div key={index} className="min-w-0">
                        <ListingCardSkeleton />
                      </div>
                    ))}
                  </ListingGrid>
                ) : items.length ? (
                  <ListingGrid variant="list">
                    {visibleItems.map((property, index) => (
                      <PropertyCard
                        key={property.id}
                        property={property}
                        imagePriority={index === 0}
                        displayVariant="list"
                        selected={selectedId === property.id}
                        onSelect={(item) => setSelectedId(item.id)}
                        onFavorite={favorite}
                        favoriteState={favoriteIds.includes(property.listingId)}
                        favoriteLoadState={favoriteLoadState}
                        onFavoriteRetry={refreshFavorites}
                      />
                    ))}
                  </ListingGrid>
                ) : (
                  <StatePanel
                    variant="notFound"
                    title="Aucun bien ne correspond"
                    description="Essayez une zone plus large ou retirez un filtre."
                    action={
                      <Button
                        variant="outline"
                        onClick={() => setParams({ transaction: "sale" })}
                      >
                        Effacer les filtres
                      </Button>
                    }
                  />
                )}
              </section>
            )}
          </div>
        ) : null}
      </Container>

      {catalog ? (
        <SearchFilterDrawer
          isOpen={mobileFilters}
          onClose={closeFilters}
          title="Filtres immobiliers"
        >
          <ImmoFilters
            panelId="immo-filter-panel"
            catalog={catalog}
            params={params}
            setParam={setParam}
            updateLocation={updateLocation}
            locationSelectorId="immo-location-selector"
            onReset={resetFilters}
            resultCount={total}
            onApply={closeFilters}
            activeSectionId={activeFilterSection}
          />
        </SearchFilterDrawer>
      ) : null}
    </div>
  );
};
