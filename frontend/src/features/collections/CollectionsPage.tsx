import { PAGE_SIZES } from "../../configuration/pagination.config";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Sparkles,
  ChevronRight,
  Filter,
  Layers,
  ArrowLeft,
  Search,
  Home,
  Tag,
  TrendingUp,
  Shirt,
  Bike,
  MapPin,
  Heart,
} from "lucide-react";
import { collectionService } from "../../domains/collection/collection.service";
import {
  Collection,
  CollectionPillarId,
} from "../../domains/collection/collection.types";
import { listingRepository } from "../../repositories/listing.repository";
import { Listing } from "../../types";
import { ListingCard } from "../../design-system/primitives/ListingCard";
import { ListingRail } from "../../design-system/primitives/ListingRail";
import {
  Breadcrumbs,
  Button,
  Container,
  EmptyState,
  FilterChip,
  Heading,
  Input,
  ListingCardSkeleton,
  StatePanel,
} from "../../design-system";
import { Image } from "../../design-system/primitives/Image";
import { IMAGE_SIZES } from "../../design-system/primitives/responsiveImage";
import { ScrollRail } from "../../design-system/primitives/ScrollRail";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useTranslation } from "../../i18n/I18nProvider";
import { routes } from "../../configuration/routes";
import { usePublicRouteData } from "../../app/providers/PublicRouteDataProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import {
  pageMetaForPolicy,
  resolveSeoPolicy,
  structuredDataForPolicy,
} from "../../platform/seo/seo-policy";

const BADGE_STYLES: Record<string, string> = {
  terracotta: "bg-primary-light text-primary border-primary-border",
  emerald: "bg-success-surface text-success border-success-border",
  sky: "bg-info-surface text-info border-info-border",
  amber: "bg-warning-surface text-warning border-warning-border",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  rose: "bg-danger-surface text-danger border-danger-border",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
  success: "bg-success-surface text-success border-success-border",
  info: "bg-info-surface text-info border-info-border",
  warning: "bg-warning-surface text-warning border-warning-border",
  danger: "bg-danger-surface text-danger border-danger-border",
};

const PILLAR_ICONS: Record<string, React.FC<{ className?: string }>> = {
  Sparkles,
  TrendingUp,
  Tag,
  Shirt,
  Home,
  Bike,
  MapPin,
  Heart,
};

export const CollectionsPage: React.FC = () => {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug?: string }>();
  const { activeMarket, marketContext } = useMarketLocation();
  const publicRouteData = usePublicRouteData();
  const initialData =
    publicRouteData?.kind === "collection" &&
    publicRouteData.collection.slug === slug
      ? publicRouteData
      : null;
  const initialDataPending = useRef(Boolean(initialData));

  const selectedCollection: Collection | undefined = useMemo(() => {
    return slug ? collectionService.getCollection(slug) : undefined;
  }, [slug]);

  const [activePillar, setActivePillar] = useState<CollectionPillarId>("all");
  const [collectionSearch, setCollectionSearch] = useState("");
  const [detailFilters, setDetailFilters] = useState<{
    collectionId: string;
    activeTag: string | null;
    search: string;
  }>({ collectionId: "", activeTag: null, search: "" });
  const [listingState, setListingState] = useState<{
    collectionId: string;
    status: "loading" | "success" | "error";
    listings: Listing[];
  } | null>(() =>
    initialData
      ? {
          collectionId: initialData.collection.id,
          status: "success",
          listings: initialData.listings,
        }
      : null,
  );
  const [loadAttempt, setLoadAttempt] = useState(0);

  // React Router keeps this component mounted between slugs. Scope filters to
  // their collection so the next detail view is correct on its first frame.
  const activeTag =
    detailFilters.collectionId === selectedCollection?.id
      ? detailFilters.activeTag
      : null;
  const inCollectionSearch =
    detailFilters.collectionId === selectedCollection?.id
      ? detailFilters.search
      : "";
  const currentListingState =
    listingState?.collectionId === selectedCollection?.id ? listingState : null;
  const listings = currentListingState?.listings ?? [];
  const isLoading = Boolean(
    selectedCollection &&
    (!currentListingState || currentListingState.status === "loading"),
  );
  const loadError = currentListingState?.status === "error";

  const pillars = useMemo(() => collectionService.getPillars(), []);

  const pageMeta = useMemo(() => {
    if (!marketContext) {
      return { title: "Collections", noIndex: true, follow: true };
    }
    const routeData = selectedCollection
      ? {
          status: "found" as const,
          data: {
            kind: "collection" as const,
            collection: selectedCollection,
            listings,
            availableCountryCodes:
              initialData?.availableCountryCodes ||
              (listings.length ? [activeMarket.code] : []),
          },
        }
      : ({ status: "not_applicable", data: null } as const);
    const policy = resolveSeoPolicy({
      pathname: selectedCollection
        ? `/collections/${selectedCollection.slug}`
        : slug
          ? `/collections/${slug}`
          : "/collections",
      marketContext,
      routeData,
    });
    return pageMetaForPolicy(
      policy,
      structuredDataForPolicy(policy, marketContext, routeData),
    );
  }, [
    activeMarket.code,
    initialData?.availableCountryCodes,
    listings,
    marketContext,
    selectedCollection,
    slug,
  ]);
  usePageMeta(pageMeta);

  const isUnknownCollection = Boolean(slug && !selectedCollection);

  // The catalogue landing page renders collection definitions, not listings.
  // Fetch only for a real detail route so the overview has no unused request.
  useEffect(() => {
    if (!selectedCollection) {
      setListingState(null);
      return;
    }
    if (
      initialDataPending.current &&
      initialData?.collection.id === selectedCollection.id
    ) {
      initialDataPending.current = false;
      return;
    }

    let isMounted = true;
    setListingState({
      collectionId: selectedCollection.id,
      status: "loading",
      listings: [],
    });

    listingRepository
      .getListings({
        marketCode: activeMarket.code,
        limit: PAGE_SIZES.collectionListings,
        sortBy: "date_desc",
      })
      .then((res) => {
        if (!isMounted) return;
        const fetched = res.listings || [];
        const matched = collectionService.filterListingsForCollection(
          selectedCollection,
          fetched,
        );
        setListingState({
          collectionId: selectedCollection.id,
          status: "success",
          listings: matched,
        });
      })
      .catch(() => {
        if (isMounted) {
          setListingState({
            collectionId: selectedCollection.id,
            status: "error",
            listings: [],
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeMarket.code, initialData, loadAttempt, selectedCollection]);

  // Collections filtered by active pillar tab and keyword search
  const visibleCollections = useMemo(() => {
    let list = collectionService.getCollections(activePillar);
    if (collectionSearch.trim()) {
      const q = collectionSearch.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.subtitle.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [activePillar, collectionSearch]);

  // Filter listings within single collection
  const displayedListings = useMemo(() => {
    let res = listings;
    if (activeTag) {
      const tagLower = activeTag.toLowerCase();
      res = res.filter(
        (l) =>
          l.title.toLowerCase().includes(tagLower) ||
          l.description?.toLowerCase().includes(tagLower) ||
          l.categoryLabel?.toLowerCase().includes(tagLower),
      );
    }
    if (inCollectionSearch.trim()) {
      const q = inCollectionSearch.toLowerCase().trim();
      res = res.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.description?.toLowerCase().includes(q),
      );
    }
    return res;
  }, [listings, activeTag, inCollectionSearch]);

  if (isUnknownCollection) {
    return (
      <div className="min-h-screen bg-bg-base">
        <div className="border-b border-border-base bg-bg-surface">
          <Container className="py-3">
            <Breadcrumbs
              items={[
                { label: "Accueil", href: routes.home() },
                {
                  label: t("collections.collectionsPage.toutesLesCollections"),
                  href: routes.collections.list(),
                },
                { label: t("collections.collectionsPage.notFoundTitle") },
              ]}
            />
          </Container>
        </div>
        <Container className="py-10 sm:py-16">
          <StatePanel
            variant="notFound"
            headingLevel={1}
            title={t("collections.collectionsPage.notFoundTitle")}
            description={t("collections.collectionsPage.notFoundDescription")}
            action={
              <Button to={routes.collections.list()} variant="primary">
                {t("collections.collectionsPage.returnToCollections")}
              </Button>
            }
            secondaryAction={
              <Button to={routes.search()} variant="outline">
                {t("errors.notFoundPage.rechercherUneAnnonce")}
              </Button>
            }
          />
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base pb-20">
      {/* 1. Breadcrumbs */}
      <div className="border-b border-border-base bg-bg-surface">
        <Container className="py-3">
          <Breadcrumbs
            items={[
              { label: "Accueil", href: routes.home() },
              selectedCollection
                ? { label: "Collections", href: routes.collections.list() }
                : { label: "Collections" },
              ...(selectedCollection
                ? [{ label: selectedCollection.title }]
                : []),
            ]}
          />
        </Container>
      </div>

      {/* 2. Header / Hero Section */}
      {selectedCollection ? (
        <section className="relative bg-gradient-to-b from-stone-900 to-stone-950 text-white pt-8 pb-12 sm:py-14 overflow-hidden">
          <div className="collections-dot-pattern absolute inset-0 opacity-20 pointer-events-none" />

          <Container className="relative z-raised">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Column: Title, description, curator note */}
              <div className="lg:col-span-7 space-y-4">
                <Link
                  to={routes.collections.list()}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-300 hover:text-white transition-colors mb-2"
                >
                  <ArrowLeft className="w-icon-md h-icon-md" />
                  <span>
                    {t("collections.collectionsPage.toutesLesCollections")}
                  </span>
                </Link>

                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border shadow-xs ${
                      BADGE_STYLES[selectedCollection.badge.variant] ||
                      BADGE_STYLES.terracotta
                    }`}
                  >
                    {selectedCollection.badge.label}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-800 text-stone-300 text-xs font-medium border border-stone-700">
                    <Layers className="w-icon-xs h-icon-xs text-stone-400" />
                    {selectedCollection.itemCountLabel}
                  </span>
                </div>

                <Heading
                  as="h1"
                  size="display-md"
                  family="display"
                  tone="inverse"
                >
                  {selectedCollection.title}
                </Heading>

                <p className="text-sm sm:text-base text-stone-300 max-w-xl leading-relaxed">
                  {selectedCollection.description}
                </p>

                {/* Curator note */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs flex items-start gap-3 max-w-xl">
                  <Sparkles className="w-icon-md h-icon-md text-primary shrink-0 mt-0.5" />
                  <div className="text-xs text-stone-300 space-y-0.5">
                    <p className="font-bold text-white">
                      {t("collections.collectionsPage.leMotDeLaRedaction")}
                    </p>
                    <p>{selectedCollection.curatorNote}</p>
                  </div>
                </div>
              </div>

              {/* Right Column: Hero Cover Photo */}
              <div className="lg:col-span-5">
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10 aspect-4/3 max-w-md mx-auto lg:max-w-none">
                  <Image
                    src={selectedCollection.coverImageUrl}
                    alt={selectedCollection.title}
                    sizes={IMAGE_SIZES.card}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                </div>
              </div>
            </div>
          </Container>
        </section>
      ) : (
        <section className="relative bg-bg-base pt-8 pb-10 sm:py-14 border-b border-border-base">
          <Container>
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="max-w-3xl space-y-3">
                <Heading as="h1" size="display-md" family="display">
                  {t("collections.collectionsPage.toutesNosCollections")}
                </Heading>

                <p className="text-sm sm:text-base text-stone-600 leading-relaxed font-normal max-w-2xl">
                  {t(
                    "collections.collectionsPage.decouvrezDesUniversThematiquesPenses",
                  )}
                </p>
              </div>

              {/* Search collections bar */}
              <div className="relative w-full sm:w-80 shrink-0">
                <Input
                  type="text"
                  value={collectionSearch}
                  onChange={(e) => setCollectionSearch(e.target.value)}
                  placeholder={t(
                    "collections.collectionsPage.chercherUneThematique",
                  )}
                  aria-label={t(
                    "collections.collectionsPage.chercherUneThematique",
                  )}
                  leftIcon={
                    <Search
                      aria-hidden="true"
                      className="h-icon-md w-icon-md"
                    />
                  }
                  className="h-control-touch bg-white shadow-2xs"
                />
              </div>
            </div>
          </Container>
        </section>
      )}

      {/* 3. Main Content Area */}
      <Container className="mt-6 space-y-10 sm:mt-10">
        {/* ========================================================= */}
        {/* A. OVERVIEW MODE: Browse All Collections with Pillar Tabs */}
        {/* ========================================================= */}
        {!selectedCollection && (
          <div className="space-y-8">
            {/* Pillar Navigation Tabs */}
            <div
              className="rounded-card border border-border-base bg-bg-surface p-2 shadow-2xs"
              role="group"
              aria-label={t("collections.collectionsPage.toutesLesCollections")}
            >
              <ScrollRail
                label="piliers"
                className="-mx-2 px-2 sm:mx-0 sm:px-0"
              >
                <div className="flex gap-2 min-w-max">
                  {pillars.map((pillar) => {
                    const isSelected = activePillar === pillar.id;
                    const IconComponent =
                      PILLAR_ICONS[pillar.iconName] || Sparkles;

                    return (
                      <FilterChip
                        key={pillar.id}
                        onSelect={() => setActivePillar(pillar.id)}
                        selected={isSelected}
                        className="min-h-control-md gap-2 px-4 text-xs font-bold sm:text-sm"
                      >
                        <IconComponent
                          aria-hidden="true"
                          className={`h-icon-sm w-icon-sm ${isSelected ? "text-primary" : "text-text-muted"}`}
                        />
                        <span>{pillar.label}</span>
                      </FilterChip>
                    );
                  })}
                </div>
              </ScrollRail>
            </div>

            {/* Active Pillar Description */}
            <div className="flex items-center justify-between gap-4 text-xs text-stone-500 font-medium px-1">
              <span>
                {pillars.find((p) => p.id === activePillar)?.description || ""}
              </span>
              <span className="font-bold text-stone-700 shrink-0">
                {visibleCollections.length} collection
                {visibleCollections.length > 1 ? "s" : ""}
              </span>
            </div>

            {/* Collections Grid */}
            {visibleCollections.length > 0 ? (
              <div
                className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5"
                data-testid="collections-grid"
              >
                {visibleCollections.map((col) => (
                  <Link
                    key={col.id}
                    to={routes.collections.detail(col.slug)}
                    aria-label={col.title}
                    className="group relative flex h-48 min-w-0 flex-col justify-between overflow-hidden rounded-card border border-border-base bg-bg-surface shadow-xs motion-surface hover:-translate-y-0.5 hover:border-primary-border hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus active:scale-95"
                  >
                    {/* Media Well */}
                    <div className="relative h-24 w-full shrink-0 overflow-hidden bg-bg-subtle">
                      <Image
                        src={col.coverImageUrl}
                        alt={col.title}
                        sizes={IMAGE_SIZES.compact}
                        className="h-full w-full object-cover motion-surface group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10 pointer-events-none" />

                      <div className="absolute inset-x-2 top-2 z-raised">
                        <span
                          className={`inline-flex max-w-full items-center truncate rounded-pill border px-2 py-0.5 text-micro font-bold shadow-xs backdrop-blur-xs ${
                            BADGE_STYLES[col.badge.variant] ||
                            BADGE_STYLES.terracotta
                          }`}
                        >
                          {col.badge.label}
                        </span>
                      </div>

                      <div className="absolute inset-x-2 bottom-2 z-raised">
                        <span className="inline-flex max-w-full items-center gap-1 rounded-control bg-black/65 px-2 py-0.5 text-micro font-semibold text-white backdrop-blur-xs">
                          <Layers className="h-icon-xs w-icon-xs shrink-0 text-stone-300" />
                          <span className="truncate">{col.itemCountLabel}</span>
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex flex-1 flex-col justify-between gap-3 p-3">
                      <h2 className="line-clamp-2 text-sm font-bold leading-snug text-text-main motion-interactive group-hover:text-primary">
                        {col.shortTitle}
                      </h2>

                      <div className="flex items-center justify-between gap-2 border-t border-border-subtle pt-2">
                        <span className="min-w-0 flex-1 truncate rounded-control bg-bg-subtle px-2 py-0.5 text-micro font-medium text-text-secondary motion-interactive group-hover:bg-primary-light">
                          {col.tags[0]}
                        </span>

                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bg-subtle text-text-secondary motion-interactive group-hover:bg-primary group-hover:text-white">
                          <ChevronRight className="h-icon-sm w-icon-sm motion-interactive group-hover:translate-x-0.5" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                className="mx-auto max-w-md"
                icon={
                  <Search className="h-icon-xl w-icon-xl" aria-hidden="true" />
                }
                title={t("collections.collectionsPage.aucuneCollectionTrouvee")}
                description={`Aucune collection ne correspond à votre recherche « ${collectionSearch} ».`}
                action={
                  <Button
                    type="button"
                    variant="primary"
                    size="compact"
                    onClick={() => {
                      setCollectionSearch("");
                      setActivePillar("all");
                    }}
                  >
                    {t("collections.collectionsPage.voirToutesLesCollections")}
                  </Button>
                }
              />
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* B. SINGLE COLLECTION DETAIL: Filterable Inventory Showcase */}
        {/* ========================================================= */}
        {selectedCollection && (
          <div className="space-y-6">
            {/* Filter Bar with sub-tags & local search */}
            <div className="bg-white rounded-2xl border border-border-base p-4 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div
                  className="flex items-center gap-2 flex-wrap"
                  role="group"
                  aria-label={t(
                    "collections.collectionsPage.filtrerDansLaSelection",
                  )}
                >
                  <FilterChip
                    onSelect={() =>
                      setDetailFilters({
                        collectionId: selectedCollection.id,
                        activeTag: null,
                        search: inCollectionSearch,
                      })
                    }
                    selected={activeTag === null}
                    count={listings.length}
                  >
                    Tout
                  </FilterChip>
                  {selectedCollection.tags.map((tag) => (
                    <FilterChip
                      key={tag}
                      onSelect={() =>
                        setDetailFilters({
                          collectionId: selectedCollection.id,
                          activeTag: activeTag === tag ? null : tag,
                          search: inCollectionSearch,
                        })
                      }
                      selected={activeTag === tag}
                    >
                      {tag}
                    </FilterChip>
                  ))}
                </div>

                {/* In-collection search input */}
                <div className="w-full sm:w-64">
                  <Input
                    type="text"
                    value={inCollectionSearch}
                    onChange={(e) =>
                      setDetailFilters({
                        collectionId: selectedCollection.id,
                        activeTag,
                        search: e.target.value,
                      })
                    }
                    placeholder={t(
                      "collections.collectionsPage.filtrerDansLaSelection",
                    )}
                    aria-label={t(
                      "collections.collectionsPage.filtrerDansLaSelection",
                    )}
                    leftIcon={
                      <Search
                        aria-hidden="true"
                        className="h-icon-md w-icon-md"
                      />
                    }
                    className="h-control-md bg-bg-subtle text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Listings Grid */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <h2 className="text-base sm:text-lg font-bold text-stone-900">
                  {activeTag
                    ? `Sélection filtrée par "${activeTag}"`
                    : "Pièces sélectionnées"}
                  <span className="text-xs text-text-secondary font-normal ml-2">
                    ({displayedListings.length} annonce
                    {displayedListings.length > 1 ? "s" : ""})
                  </span>
                </h2>
              </div>

              {isLoading ? (
                <ListingRail
                  label={t(
                    "collections.collectionsPage.annoncesDeLaCollection",
                  )}
                >
                  {Array.from({ length: 8 }).map((_, idx) => (
                    <ListingCardSkeleton
                      key={idx}
                      className="rounded-2xl border border-border-base bg-white p-3"
                    />
                  ))}
                </ListingRail>
              ) : loadError ? (
                <StatePanel
                  variant="error"
                  title={t("collections.collectionsPage.loadErrorTitle")}
                  description={t(
                    "collections.collectionsPage.loadErrorDescription",
                  )}
                  action={
                    <Button
                      type="button"
                      variant="primary"
                      size="compact"
                      onClick={() => setLoadAttempt((attempt) => attempt + 1)}
                    >
                      {t("common.retry")}
                    </Button>
                  }
                />
              ) : displayedListings.length > 0 ? (
                <ListingRail
                  label={t(
                    "collections.collectionsPage.annoncesDeLaCollection",
                  )}
                >
                  {displayedListings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </ListingRail>
              ) : (
                <EmptyState
                  className="mx-auto max-w-lg"
                  icon={
                    <Filter
                      className="h-icon-xl w-icon-xl"
                      aria-hidden="true"
                    />
                  }
                  title={t("collections.collectionsPage.aucuneAnnonceTrouvee")}
                  description={t(
                    "collections.collectionsPage.aucuneAnnonceNeCorrespondAux",
                  )}
                  action={
                    <Button
                      type="button"
                      variant="primary"
                      size="compact"
                      onClick={() =>
                        setDetailFilters({
                          collectionId: selectedCollection.id,
                          activeTag: null,
                          search: "",
                        })
                      }
                    >
                      {t("collections.collectionsPage.reinitialiserLesFiltres")}
                    </Button>
                  }
                />
              )}
            </div>

            {/* Other Collections Rail */}
            <div className="pt-10 border-t border-border-base space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-stone-900">
                  {t("collections.collectionsPage.decouvrirDAutresCollections")}
                </h2>
                <Link
                  to={routes.collections.list()}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Voir tout ({collectionService.getCollections("all").length})
                </Link>
              </div>

              <ScrollRail
                label="autres collections"
                className="-mx-4 px-4 sm:mx-0 sm:px-0"
              >
                <div className="flex gap-4">
                  {collectionService
                    .getCollections("all")
                    .filter((c) => c.id !== selectedCollection.id)
                    .slice(0, 6)
                    .map((c) => (
                      <Link
                        key={c.id}
                        to={routes.collections.detail(c.slug)}
                        className="group flex items-center gap-3.5 p-3 rounded-2xl bg-white border border-stone-200 hover:border-stone-300 w-72 shrink-0 shadow-2xs hover:shadow-md transition-all"
                      >
                        <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-stone-100">
                          <Image
                            src={c.coverImageUrl}
                            alt={c.title}
                            sizes={IMAGE_SIZES.compact}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-micro font-bold text-primary uppercase block truncate">
                            {c.badge.label}
                          </span>
                          <h3 className="text-xs font-bold text-stone-900 truncate group-hover:text-primary transition-colors">
                            {c.title}
                          </h3>
                          <p className="text-micro text-text-secondary mt-0.5">
                            {c.itemCountLabel}
                          </p>
                        </div>
                      </Link>
                    ))}
                </div>
              </ScrollRail>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
};
