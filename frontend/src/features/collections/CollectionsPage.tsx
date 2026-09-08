import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, Layers, Search } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { IMAGE_SIZES } from "@shongre/shared";
import { PAGE_SIZES } from "../../configuration/pagination.config";
import { routes } from "../../configuration/routes";
import { collectionService } from "../../domains/collection/collection.service";
import type {
  Collection,
  CollectionResolution,
} from "../../domains/collection/collection.types";
import {
  Breadcrumbs,
  Button,
  Container,
  EmptyState,
  Heading,
  Input,
  ListingCardSkeleton,
  ListingRail,
  StatePanel,
} from "../../design-system";
import { Image } from "../../design-system/primitives/Image";
import { ListingCard } from "../../design-system/primitives/ListingCard";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useTranslation } from "../../i18n/I18nProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { usePublicRouteData } from "../../app/providers/PublicRouteDataProvider";
import {
  pageMetaForPolicy,
  resolveSeoPolicy,
  structuredDataForPolicy,
} from "../../platform/seo/seo-policy";

type LoadState<T> =
  | { status: "loading"; data: null }
  | { status: "success"; data: T }
  | { status: "not_found"; data: null }
  | { status: "error"; data: null };

export const CollectionsPage: React.FC = () => {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug?: string }>();
  const { activeMarket, currentLocale, marketContext } = useMarketLocation();
  const publicRouteData = usePublicRouteData();
  const serverResolution =
    publicRouteData?.kind === "collection" &&
    publicRouteData.collection.slug === slug
      ? {
          collection: publicRouteData.collection,
          listings: publicRouteData.listings,
        }
      : null;
  const [search, setSearch] = useState("");
  const [retry, setRetry] = useState(0);
  const [catalog, setCatalog] = useState<LoadState<Collection[]>>({
    status: "loading",
    data: null,
  });
  const [detail, setDetail] = useState<LoadState<CollectionResolution>>(() =>
    serverResolution
      ? { status: "success", data: serverResolution }
      : { status: "loading", data: null },
  );

  useEffect(() => {
    if (!marketContext) return;
    let cancelled = false;
    if (slug) {
      if (serverResolution && retry === 0) return;
      setDetail({ status: "loading", data: null });
      void collectionService
        .getCollection(
          slug,
          marketContext,
          currentLocale,
          PAGE_SIZES.collectionListings,
        )
        .then((result) => {
          if (!cancelled) {
            setDetail(
              result
                ? { status: "success", data: result }
                : { status: "not_found", data: null },
            );
          }
        })
        .catch(() => {
          if (!cancelled) setDetail({ status: "error", data: null });
        });
    } else {
      setCatalog({ status: "loading", data: null });
      void collectionService
        .getCollections(marketContext, currentLocale)
        .then((items) => {
          if (!cancelled) setCatalog({ status: "success", data: items });
        })
        .catch(() => {
          if (!cancelled) setCatalog({ status: "error", data: null });
        });
    }
    return () => {
      cancelled = true;
    };
  }, [currentLocale, marketContext, retry, serverResolution, slug]);

  const selectedCollection = detail.data?.collection;
  const listings = detail.data?.listings ?? [];
  const filteredCollections = useMemo(() => {
    const query = search.trim().toLocaleLowerCase(currentLocale);
    if (!query) return catalog.data ?? [];
    return (catalog.data ?? []).filter(
      (collection) =>
        collection.title.toLocaleLowerCase(currentLocale).includes(query) ||
        collection.description
          ?.toLocaleLowerCase(currentLocale)
          .includes(query) ||
        collection.tags.some((tag) =>
          tag.toLocaleLowerCase(currentLocale).includes(query),
        ),
    );
  }, [catalog.data, currentLocale, search]);

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
            availableCountryCodes: listings.length ? [activeMarket.code] : [],
          },
        }
      : ({ status: "not_applicable", data: null } as const);
    const policy = resolveSeoPolicy({
      pathname: selectedCollection
        ? routes.collections.detail(selectedCollection.slug)
        : slug
          ? routes.collections.detail(slug)
          : routes.collections.list(),
      marketContext,
      routeData,
    });
    return pageMetaForPolicy(
      policy,
      structuredDataForPolicy(policy, marketContext, routeData),
    );
  }, [activeMarket.code, listings, marketContext, selectedCollection, slug]);
  usePageMeta(pageMeta);

  if (slug && detail.status === "not_found") {
    return (
      <Container className="py-12">
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
        />
      </Container>
    );
  }

  if (slug && detail.status === "error") {
    return (
      <Container className="py-12">
        <StatePanel
          variant="error"
          headingLevel={1}
          title={t("collections.collectionsPage.loadErrorTitle")}
          description={t("collections.collectionsPage.loadErrorDescription")}
          action={
            <Button
              variant="primary"
              onClick={() => setRetry((value) => value + 1)}
            >
              {t("common.retry")}
            </Button>
          }
        />
      </Container>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base pb-20">
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

      {slug ? (
        <>
          {detail.status === "loading" ? (
            <Container className="py-10">
              <ListingRail label="Chargement">
                {Array.from({ length: 4 }).map((_, index) => (
                  <ListingCardSkeleton key={index} />
                ))}
              </ListingRail>
            </Container>
          ) : selectedCollection ? (
            <>
              <section className="bg-surface-inverse py-10 text-text-inverse">
                <Container className="grid items-center gap-8 lg:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-inverse-muted">
                      {selectedCollection.itemCountLabel} annonces
                    </p>
                    <Heading as="h1" size="display-md" tone="inverse">
                      {selectedCollection.title}
                    </Heading>
                    {selectedCollection.description ? (
                      <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-inverse-muted">
                        {selectedCollection.description}
                      </p>
                    ) : null}
                  </div>
                  <Image
                    src={selectedCollection.coverImageUrl}
                    alt=""
                    sizes={IMAGE_SIZES.card}
                    className="aspect-16/9 w-full rounded-card object-cover"
                  />
                </Container>
              </section>
              <Container className="pt-8">
                {listings.length ? (
                  <ListingRail
                    label={t(
                      "collections.collectionsPage.annoncesDeLaCollection",
                    )}
                  >
                    {listings.map((listing) => (
                      <ListingCard key={listing.id} listing={listing} />
                    ))}
                  </ListingRail>
                ) : (
                  <EmptyState
                    icon={<Layers className="h-icon-xl w-icon-xl" />}
                    title={t(
                      "collections.collectionsPage.aucuneAnnonceTrouvee",
                    )}
                    description={t(
                      "collections.collectionsPage.aucuneAnnonceNeCorrespondAux",
                    )}
                    action={null}
                  />
                )}
              </Container>
            </>
          ) : null}
        </>
      ) : (
        <Container className="py-10">
          <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <Heading as="h1" size="display-md">
                {t("collections.collectionsPage.toutesNosCollections")}
              </Heading>
              <p className="mt-2 max-w-2xl text-sm text-text-supporting">
                {t(
                  "collections.collectionsPage.decouvrezDesUniversThematiquesPenses",
                )}
              </p>
            </div>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t(
                "collections.collectionsPage.chercherUneThematique",
              )}
              aria-label={t(
                "collections.collectionsPage.chercherUneThematique",
              )}
              leftIcon={<Search className="h-icon-md w-icon-md" />}
              className="w-full sm:w-80"
            />
          </div>

          {catalog.status === "loading" ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <ListingCardSkeleton key={index} />
              ))}
            </div>
          ) : catalog.status === "error" ? (
            <StatePanel
              variant="error"
              title={t("collections.collectionsPage.loadErrorTitle")}
              description={t(
                "collections.collectionsPage.loadErrorDescription",
              )}
              action={
                <Button
                  variant="primary"
                  onClick={() => setRetry((value) => value + 1)}
                >
                  {t("common.retry")}
                </Button>
              }
            />
          ) : filteredCollections.length ? (
            <div
              className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"
              data-testid="collections-grid"
            >
              {filteredCollections.map((collection) => (
                <Link
                  key={collection.id}
                  to={routes.collections.detail(collection.slug)}
                  className="group overflow-hidden rounded-card border border-border-base bg-bg-surface shadow-xs motion-surface hover:-translate-y-0.5 hover:border-primary-border hover:shadow-md"
                >
                  <Image
                    src={collection.coverImageUrl}
                    alt=""
                    sizes={IMAGE_SIZES.compact}
                    className="aspect-4/3 w-full object-cover motion-surface group-hover:scale-105"
                  />
                  <div className="p-3">
                    <p className="text-micro font-semibold text-text-secondary">
                      {collection.itemCountLabel} annonces
                    </p>
                    <h2 className="mt-1 line-clamp-2 text-sm font-bold text-text-main">
                      {collection.shortTitle}
                    </h2>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary">
                      Explorer <ArrowRight className="h-icon-xs w-icon-xs" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Search className="h-icon-xl w-icon-xl" />}
              title={t("collections.collectionsPage.aucuneCollectionTrouvee")}
              description={t(
                "collections.collectionsPage.decouvrezDesUniversThematiquesPenses",
              )}
              action={null}
            />
          )}
        </Container>
      )}
    </div>
  );
};
