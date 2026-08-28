import { PAGE_SIZES } from "../../configuration/pagination.config";
import { useTranslation } from "../../i18n/I18nProvider";
import React, { useEffect, useMemo, useState } from "react";
import { Bell, Filter, List, Map, Search } from "lucide-react";
import type {
  EnergyClass,
  PropertyPublic,
  PropertySearchQuery,
  RealEstateCatalog,
} from "@shongre/contracts/real-estate";
import { useNavigate, useSearchParams } from "react-router-dom";
import { services } from "../../api/client/service-registry";
import { useAuth } from "../../app/providers/AuthProvider";
import { useFavorites } from "../../app/providers/FavoritesProvider";
import { useToast } from "../../app/providers/ToastProvider";
import {
  Button,
  Container,
  Drawer,
  FilterPanel,
  Input,
  Select,
  Skeleton,
  StatePanel,
} from "../../design-system";
import type { FilterPanelPresentation } from "../../design-system";
import { usePageMeta } from "../../hooks/usePageMeta";
import { storageService } from "../../services/storage.service";
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

const ImmoFilters: React.FC<{
  catalog: RealEstateCatalog;
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
      title="Filtres"
      presentation={presentation}
      onReset={onReset}
      footer={
        onApply ? (
          <Button fullWidth onClick={onApply}>
            Voir {resultCount} bien{resultCount > 1 ? "s" : ""}
          </Button>
        ) : undefined
      }
    >
      <fieldset>
        <legend className="mb-2 text-xs font-bold text-text-main">
          Projet
        </legend>
        <Select
          className="w-full"
          aria-label="Projet immobilier"
          value={params.get("transaction") || "sale"}
          onChange={(event) => setParam("transaction", event.target.value)}
        >
          <option value="sale">Acheter</option>
          <option value="long_term_rental">Louer</option>
          <option value="seasonal_rental">Location saisonnière</option>
          <option value="shared_accommodation">Colocation</option>
        </Select>
      </fieldset>
      <fieldset>
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
      <fieldset>
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
          <Select
            className="w-full"
            aria-label="Nombre minimum de pièces"
            value={params.get("rooms") || ""}
            onChange={(event) =>
              setParam("rooms", event.target.value || undefined)
            }
          >
            <option value="">Pièces</option>
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value}+
              </option>
            ))}
          </Select>
          <Select
            className="w-full"
            aria-label="Nombre minimum de chambres"
            value={params.get("bedrooms") || ""}
            onChange={(event) =>
              setParam("bedrooms", event.target.value || undefined)
            }
          >
            <option value="">Chambres</option>
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value}+
              </option>
            ))}
          </Select>
        </div>
      </fieldset>
      <label className="block text-xs font-bold text-text-main">
        Location meublée
        <Select
          className="mt-2 w-full"
          labelledByAncestor
          value={params.get("furnished") || ""}
          onChange={(event) =>
            setParam("furnished", event.target.value || undefined)
          }
        >
          <option value="">Indifférent</option>
          <option value="true">Meublé</option>
          <option value="false">Non meublé</option>
        </Select>
      </label>
      <fieldset>
        <legend className="mb-2 text-xs font-bold text-text-main">
          Équipements
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            catalog.attributes.find((item) => item.id === "amenities")
              ?.options || []
          )
            .slice(0, 6)
            .map((option) => (
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
      <label className="block text-xs font-bold text-text-main">
        Performance énergétique
        <Select
          className="mt-2 w-full"
          labelledByAncestor
          value={params.get("dpe") || ""}
          onChange={(event) => setParam("dpe", event.target.value || undefined)}
        >
          <option value="">Toutes les classes</option>
          {["A", "B", "C", "D", "E", "F", "G"].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
      </label>
      <label className="block text-xs font-bold text-text-main">
        Annonceur
        <Select
          className="mt-2 w-full"
          labelledByAncestor
          value={params.get("seller") || ""}
          onChange={(event) =>
            setParam("seller", event.target.value || undefined)
          }
        >
          <option value="">Tous</option>
          <option value="owner">Particulier</option>
          <option value="agency">Agence</option>
          <option value="developer">Promoteur</option>
        </Select>
      </label>
    </FilterPanel>
  );
};

export const ImmoSearchPage: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { activeMarket } = useMarketLocation();
  const toast = useToast();
  const navigate = useNavigate();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const [params, setParams] = useSearchParams();
  const [catalog, setCatalog] = useState<RealEstateCatalog | null>(null);
  const [items, setItems] = useState<PropertyPublic[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [selectedId, setSelectedId] = useState<string>();
  const [mobileFilters, setMobileFilters] = useState(false);
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
      radiusKm: city ? undefined : number(params.get("radius") || "25"),
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

  const saveAlert = () => {
    if (!catalog) {
      toast.error("La configuration Immo est encore en cours de chargement.");
      return;
    }
    storageService.saveSearch({
      id: `immo-${Date.now()}`,
      title: `${query.transactionTypes?.[0] === "sale" ? "Achat" : "Location"} · ${query.city || "Lyon et alentours"}`,
      filters: {
        query: query.query,
        city: query.city,
        categorySlug: catalog.activation.categoryIds[0],
        marketCode: activeMarket.code,
      },
      createdAt: new Date().toISOString(),
      hasNotifications: true,
      matchCount: total,
    });
    toast.success(
      "Alerte Immo créée. Vous pouvez la gérer depuis votre compte.",
    );
  };

  return (
    <main className="min-h-screen bg-bg-subtle pb-12">
      <section className="border-b border-border-base bg-bg-surface py-6">
        <Container>
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-primary">
                Shongre Immo
              </p>
              <h1 className="mt-1 text-xl font-black text-text-main sm:text-2xl">
                Trouvez le bien qui vous ressemble
              </h1>
              <p className="mt-1 text-xs text-text-secondary">
                Adresse précise protégée · annonces structurées · demandes
                qualifiées
              </p>
            </div>
            <div className="grid w-full gap-2 sm:grid-cols-filter-row lg:max-w-2xl">
              <label className="relative block">
                <span className="sr-only">Rechercher un bien</span>
                <Input
                  leftIcon={
                    <Search
                      className="h-icon-md w-icon-md"
                      aria-hidden="true"
                    />
                  }
                  placeholder="Appartement, terrasse…"
                  value={queryText}
                  onChange={(event) =>
                    setParam("q", event.target.value || undefined)
                  }
                />
              </label>
              <Input
                aria-label="Ville"
                className="w-full"
                placeholder="Lyon"
                value={params.get("city") || ""}
                onChange={(event) =>
                  setParam("city", event.target.value || undefined)
                }
              />
              <Select
                className="w-full"
                aria-label="Rayon"
                value={params.get("radius") || "25"}
                onChange={(event) => setParam("radius", event.target.value)}
              >
                {[5, 10, 25, 50, 100].map((radius) => (
                  <option key={radius} value={radius}>
                    {radius} km
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </Container>
      </section>

      <Container className="py-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-text-main">
              {loading ? "Recherche…" : `${total} biens`}
            </p>
            <p className="text-micro text-text-secondary">
              Localisation volontairement approximative sur la carte.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={saveAlert}
              leftIcon={<Bell className="h-icon-md w-icon-md" />}
            >
              Créer une alerte
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden"
              onClick={() => setMobileFilters(true)}
              leftIcon={<Filter className="h-icon-md w-icon-md" />}
            >
              Filtres
            </Button>
            <div className="inline-flex rounded-control border border-border-base bg-bg-surface p-1">
              <button
                type="button"
                aria-label="Vue liste"
                aria-pressed={view === "list"}
                onClick={() => setParam("view", "list")}
                className={`grid h-control-sm w-8 place-items-center rounded-control ${view === "list" ? "bg-primary text-white" : "text-text-secondary"}`}
              >
                <List className="h-icon-md w-icon-md" />
              </button>
              <button
                type="button"
                aria-label="Vue carte"
                aria-pressed={view === "map"}
                onClick={() => setParam("view", "map")}
                className={`grid h-control-sm w-8 place-items-center rounded-control ${view === "map" ? "bg-primary text-white" : "text-text-secondary"}`}
              >
                <Map className="h-icon-md w-icon-md" />
              </button>
            </div>
            <Select
              className="w-auto"
              aria-label="Trier les biens"
              value={query.sort}
              onChange={(event) => setParam("sort", event.target.value)}
            >
              <option value="promoted">Sélection Shongre</option>
              <option value="newest">Plus récentes</option>
              <option value="price_asc">Prix croissant</option>
              <option value="price_desc">Prix décroissant</option>
              <option value="surface_desc">Plus grandes surfaces</option>
            </Select>
          </div>
        </div>

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
          <div className="grid items-start gap-6 lg:grid-cols-sidebar xl:grid-cols-search-properties">
            <aside
              className="sticky top-24 hidden lg:block"
              aria-label="Filtres immobiliers"
            >
              <ImmoFilters
                catalog={catalog}
                params={params}
                setParam={setParam}
                onReset={resetFilters}
              />
            </aside>
            <section
              aria-label="Résultats immobiliers"
              className={`min-w-0 space-y-3 ${view === "map" ? "xl:max-h-search-results-panel xl:overflow-y-auto xl:pr-1" : "xl:col-span-2"}`}
            >
              {loading ? (
                Array.from({ length: 3 }, (_, index) => (
                  <Skeleton key={index} className="h-52 rounded-card" />
                ))
              ) : items.length ? (
                visibleItems.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    selected={selectedId === property.id}
                    onSelect={(item) => setSelectedId(item.id)}
                    onFavorite={favorite}
                  />
                ))
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
            {view === "map" ? (
              <aside className="sticky top-24 hidden h-search-map-panel overflow-hidden rounded-card border border-border-base bg-bg-surface xl:block">
                <React.Suspense
                  fallback={
                    <div
                      role="status"
                      aria-label={t("common.loadingMap")}
                      className="h-full w-full p-3"
                    >
                      <Skeleton className="h-full w-full rounded-card" />
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
              </aside>
            ) : null}
          </div>
        ) : null}
      </Container>

      {catalog ? (
        <Drawer
          isOpen={mobileFilters}
          onClose={() => setMobileFilters(false)}
          title="Filtres immobiliers"
        >
          <ImmoFilters
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
