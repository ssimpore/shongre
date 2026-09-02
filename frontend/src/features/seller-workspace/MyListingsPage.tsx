import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  PlusCircle,
  List,
  Eye,
  Trash2,
  Zap,
  Download,
  Upload,
  Globe,
} from "lucide-react";
import { listingRepository } from "../../repositories/listing.repository";
import { Listing } from "../../types";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { marketService } from "../../domains/market/market.service";
import { formatRelativeDate } from "../../utilities/formatters";
import { Button } from "../../design-system/primitives/Button";
import { Badge } from "../../design-system/primitives/Badge";
import { Image } from "../../design-system/primitives/Image";
import { Tabs, TabPanel, EmptyState, Skeleton } from "../../design-system";
import { Modal } from "../../design-system/primitives/Modal";
import { DataTable } from "../../design-system/primitives/DataTable";
import { BulkImportModal } from "./components/BulkImportModal";
import { usePublishCta } from "../../security/usePublishCta";
import { useTranslation } from "../../i18n/I18nProvider";
import { usePageMeta } from "../../hooks/usePageMeta";
import { getListingCategoryLabel } from "../../domains/taxonomy/taxonomy.display";
import type { ListingBoostOption } from "../../configuration/plans.config";
import { useMarketPromotions } from "../../domains/monetization/useMarketPromotions";
import { useRegionalFormatters } from "../../hooks/useRegionalFormatters";

const BOOST_STYLES: Record<
  ListingBoostOption["id"],
  {
    swatchClass: string;
    hoverClass: string;
    spanClass: string;
  }
> = {
  urgent: {
    swatchClass: "bg-danger text-white",
    hoverClass: "hover:border-danger hover:bg-danger-surface",
    spanClass: "",
  },
  top_of_list: {
    swatchClass: "bg-primary text-white",
    hoverClass: "hover:border-primary hover:bg-primary-light",
    spanClass: "",
  },
  highlight: {
    swatchClass: "bg-indigo-600 text-white",
    hoverClass: "hover:border-indigo-500 hover:bg-indigo-50",
    spanClass: "sm:col-span-2",
  },
  gallery_boost: {
    swatchClass: "bg-indigo-600 text-white",
    hoverClass: "hover:border-indigo-500 hover:bg-indigo-50",
    spanClass: "sm:col-span-2",
  },
  spotlight: {
    swatchClass: "bg-indigo-700 text-white",
    hoverClass: "hover:border-indigo-600 hover:bg-indigo-50",
    spanClass: "sm:col-span-2",
  },
};

function getPhotoUrl(photo: any): string {
  if (typeof photo === "string") return photo;
  if (photo && typeof photo.url === "string") return photo.url;
  return "https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400&auto=format&fit=crop&q=80";
}

export const MyListingsPage: React.FC = () => {
  const { t } = useTranslation();
  const marketPromotions = useMarketPromotions();
  const publishLabel = t("sellerworkspace.myListingsPage.deposerUneAnnonce");
  usePageMeta({
    title: t("meta.myListings.title"),
    description: t("meta.myListings.description"),
    canonicalPath: "/compte/annonces",
    noIndex: true,
  });

  const { currentUser } = useAuth();
  const toast = useToast();
  const { activeMarket, currentLocale, formatPrice } = useMarketLocation();
  const { formatMoney } = useRegionalFormatters();
  const publishCta = usePublishCta();

  const [activeTab, setActiveTab] = useState<string>("all");
  const [boostModalListing, setBoostModalListing] = useState<Listing | null>(
    null,
  );
  const [boostOffers, setBoostOffers] = useState<ListingBoostOption[]>([]);
  const [boostOffersState, setBoostOffersState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [activatingBoostId, setActivatingBoostId] = useState<string>();
  const promotionSequence = useRef(0);
  const [marketsModalListing, setMarketsModalListing] =
    useState<Listing | null>(null);
  const [selectedMarketsInModal, setSelectedMarketsInModal] = useState<
    string[]
  >([]);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchListings = async () => {
    if (!currentUser?.id) {
      setMyListings([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const items = await listingRepository.getListingsBySeller(currentUser.id);
      setMyListings(items || []);
    } catch {
      setMyListings([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [currentUser?.id]);

  const filteredListings = myListings.filter((l) => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return l.status === "active";
    if (activeTab === "sold") return l.status === "sold";
    return true;
  });

  const handleMarkAsSold = async (listingId: string) => {
    await listingRepository.updateListingStatus(listingId, "sold");
    toast.success("L'annonce a été marquée comme vendue.");
    await fetchListings();
  };

  const handleDeleteListing = async (listingId: string) => {
    await listingRepository.deleteListing(listingId);
    toast.info("L'annonce a été supprimée.");
    await fetchListings();
  };

  const openBoostModal = async (listing: Listing) => {
    setBoostModalListing(listing);
    setBoostOffers([]);
    setBoostOffersState("loading");
    try {
      const offers = await marketPromotions.getAvailableBoosts(listing.id);
      setBoostOffers(offers);
      setBoostOffersState("ready");
    } catch {
      setBoostOffersState("error");
    }
  };

  const handleApplyBoost = async (
    listingId: string,
    offer: ListingBoostOption,
  ) => {
    setActivatingBoostId(offer.id);
    promotionSequence.current += 1;
    try {
      const result = await marketPromotions.applyBoost(
        listingId,
        offer.productId,
        {
          paymentMethod: "card",
          idempotencyKey: `listing-promotion:${listingId}:${offer.productId}:${promotionSequence.current}`,
        },
      );
      if (result.providerCheckoutUrl) {
        window.location.assign(result.providerCheckoutUrl);
        return;
      }
      if (!result.success)
        throw new Error("Le paiement doit être confirmé avant l’activation.");
      toast.success("Option de visibilité activée avec succès !");
      setBoostModalListing(null);
      await fetchListings();
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "L’option de visibilité n’a pas pu être activée.",
      );
    } finally {
      setActivatingBoostId(undefined);
    }
  };

  const handleExportCsv = () => {
    if (myListings.length === 0) {
      toast.info("Aucune annonce à exporter.");
      return;
    }

    const headers = [
      "ID",
      "Titre",
      "Categorie",
      "SousCategorie",
      "Prix",
      "Statut",
      "Vues",
      "DateCreation",
    ];
    const rows = myListings.map((l) => [
      l.id,
      `"${(l.title || "").replace(/"/g, '""')}"`,
      l.categorySlug,
      l.subCategorySlug || "",
      l.price,
      l.status,
      l.viewsCount ?? l.viewCount ?? 0,
      new Date(l.createdAt).toLocaleDateString(currentLocale),
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map((r) => r.join(";")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `catalogue_annonces_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`${myListings.length} annonces exportées au format CSV.`);
  };

  const tabs = [
    { id: "all", label: "Toutes", count: myListings.length },
    {
      id: "active",
      label: "En ligne",
      count: myListings.filter((l) => l.status === "active").length,
    },
    {
      id: "sold",
      label: "Vendues",
      count: myListings.filter((l) => l.status === "sold").length,
    },
  ];

  const emptyStateCopy =
    myListings.length === 0
      ? {
          title: "Vous n’avez pas encore d’annonce",
          description:
            "Publiez votre première annonce pour la rendre visible auprès des acheteurs de votre région.",
        }
      : activeTab === "active"
        ? {
            title: "Aucune annonce en ligne",
            description:
              "Vos annonces vendues restent consultables dans l’onglet « Vendues ». Publiez-en une nouvelle pour continuer à vendre.",
          }
        : {
            title: "Aucune annonce vendue",
            description:
              "Vos ventes finalisées apparaîtront ici avec leur historique de transaction.",
          };

  const getListingMarkets = (listing: Listing) =>
    listing.marketCodes && listing.marketCodes.length > 0
      ? listing.marketCodes
      : [listing.marketCode || activeMarket.code];

  const renderListingStatus = (listing: Listing) => (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge
        variant={listing.status === "active" ? "success" : "neutral"}
        size="sm"
      >
        {listing.status === "active" ? "En ligne" : "Vendu"}
      </Badge>
      {listing.isBoosted && (
        <Badge variant="featured" size="sm">
          Vedette
        </Badge>
      )}
    </div>
  );

  const renderMarketsButton = (listing: Listing) => {
    const markets = getListingMarkets(listing);
    return (
      <button
        type="button"
        onClick={() => {
          setMarketsModalListing(listing);
          setSelectedMarketsInModal(markets);
        }}
        className="inline-flex min-h-control-sm items-center gap-1.5 rounded-control border border-border-base bg-bg-surface px-2.5 py-1 text-xs font-semibold text-stone-700 motion-interactive hover:bg-bg-subtle"
        title={t("sellerworkspace.myListingsPage.gererLesPaysDePublication")}
      >
        <Globe
          className="h-icon-sm w-icon-sm text-primary"
          aria-hidden="true"
        />
        <span>{markets.join(", ")}</span>
        <span className="text-micro font-normal text-stone-500">
          ({markets.length})
        </span>
      </button>
    );
  };

  const renderListingActions = (listing: Listing, compact = false) => (
    <div className="flex min-w-0 items-center justify-end gap-1.5">
      {listing.status === "active" && (
        <>
          <button
            type="button"
            onClick={() => openBoostModal(listing)}
            className="inline-flex min-h-control-sm items-center gap-1 rounded-control border border-warning-border bg-warning-surface px-2 text-xs font-bold text-warning motion-interactive hover:bg-warning-surface"
            title={t("sellerworkspace.myListingsPage.boosterLAnnonce")}
            aria-label={t("sellerworkspace.myListingsPage.boosterLAnnonce")}
          >
            <Zap
              className="h-icon-sm w-icon-sm fill-amber-500 text-warning"
              aria-hidden="true"
            />
            <span className={compact ? "" : "hidden lg:inline"}>Booster</span>
          </button>

          <button
            type="button"
            onClick={() => handleMarkAsSold(listing.id)}
            className="min-h-control-sm rounded-control bg-stone-100 px-2.5 text-xs font-semibold text-stone-700 motion-interactive hover:bg-stone-200"
            title="Marquer comme vendu"
          >
            Vendu
          </button>
        </>
      )}

      <button
        type="button"
        onClick={() => handleDeleteListing(listing.id)}
        className="inline-flex h-control-sm w-control-sm items-center justify-center rounded-control text-text-muted motion-interactive hover:bg-danger-surface hover:text-danger"
        title={t("sellerworkspace.myListingsPage.supprimerLAnnonce")}
        aria-label={t("sellerworkspace.myListingsPage.supprimerLAnnonce")}
      >
        <Trash2 className="h-icon-md w-icon-md" aria-hidden="true" />
      </button>
    </div>
  );

  const renderCompactListing = (listing: Listing) => (
    <article
      data-compact-listing-row={listing.id}
      className="rounded-control border border-border-subtle bg-bg-base p-3"
    >
      <div className="flex min-w-0 gap-3">
        <Image
          src={getPhotoUrl(listing.coverImageUrl || listing.photos?.[0])}
          alt=""
          sizes="64px"
          className="h-16 w-16 shrink-0 rounded-control border border-border-base object-cover"
        />
        <div className="min-w-0 flex-1">
          <Link
            to={`/annonce/${listing.id}`}
            title={listing.title}
            className="line-clamp-2 text-sm font-bold leading-snug text-stone-900 hover:text-primary"
          >
            {listing.title}
          </Link>
          <p className="mt-0.5 truncate text-xs text-text-muted">
            {getListingCategoryLabel(listing)}
          </p>
          <div className="mt-1.5">{renderListingStatus(listing)}</div>
        </div>
      </div>

      <dl
        data-compact-listing-metrics
        className="mt-3 grid grid-cols-3 rounded-control border border-border-subtle bg-bg-surface px-3 py-2"
      >
        <div className="min-w-0 pr-2">
          <dt className="text-micro font-semibold uppercase tracking-wide text-text-muted">
            Prix
          </dt>
          <dd className="truncate text-sm font-extrabold text-stone-900">
            {formatPrice(listing.price, {
              sourceCurrency: listing.currency,
            })}
          </dd>
        </div>
        <div className="min-w-0 border-l border-border-subtle px-3">
          <dt className="text-micro font-semibold uppercase tracking-wide text-text-muted">
            Vues
          </dt>
          <dd className="flex items-center gap-1 text-xs font-semibold text-stone-700">
            <Eye
              className="h-icon-sm w-icon-sm text-stone-400"
              aria-hidden="true"
            />
            <span>{listing.viewsCount ?? listing.viewCount ?? 0}</span>
          </dd>
        </div>
        <div className="min-w-0 border-l border-border-subtle pl-3">
          <dt className="text-micro font-semibold uppercase tracking-wide text-text-muted">
            Publiée
          </dt>
          <dd className="text-micro font-medium leading-tight text-stone-700">
            {formatRelativeDate(listing.createdAt)}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-3">
        {renderMarketsButton(listing)}
        {renderListingActions(listing, true)}
      </div>
    </article>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900">
            {t("sellerworkspace.myListingsPage.gestionDeMesAnnonces")}
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            {t("sellerworkspace.myListingsPage.suivezLesVuesActivezDes")}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            leftIcon={<Download className="w-icon-sm h-icon-sm" />}
          >
            Exporter (CSV)
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsBulkImportOpen(true)}
            leftIcon={<Upload className="w-icon-sm h-icon-sm" />}
          >
            Importer (CSV)
          </Button>

          <Button
            to={publishCta.to}
            variant="primary"
            size="sm"
            aria-label={publishLabel}
            title={publishLabel}
            className="w-control-sm shrink-0 px-0 sm:w-auto sm:px-3"
            leftIcon={
              <PlusCircle
                className="h-icon-sm w-icon-sm shrink-0"
                aria-hidden="true"
              />
            }
          >
            <span className="sr-only sm:not-sr-only">{publishLabel}</span>
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="bg-white rounded-2xl border border-border-base p-4 sm:p-6 shadow-xs space-y-4">
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          label={t(
            "sellerworkspace.myListingsPage.filtrerMesAnnoncesParStatut",
          )}
          idPrefix="my-listings"
        />

        <TabPanel tab={activeTab} idPrefix="my-listings">
          {isLoading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ) : (
            <DataTable
              rows={filteredListings}
              getRowKey={(listing) => listing.id}
              caption="Mes annonces"
              renderCompactRow={renderCompactListing}
              empty={
                <EmptyState
                  icon={<List className="w-8 h-8 text-stone-500" />}
                  title={emptyStateCopy.title}
                  description={emptyStateCopy.description}
                  action={
                    <Button
                      to={publishCta.to}
                      variant="primary"
                      size="compact"
                      leftIcon={<PlusCircle className="h-icon-md w-icon-md" />}
                    >
                      {t("sellerworkspace.myListingsPage.deposerUneAnnonce")}
                    </Button>
                  }
                />
              }
              columns={[
                {
                  id: "Annonce",
                  header: "Annonce",
                  isRowTitle: true,
                  cell: (listing) => (
                    <div className="flex items-center gap-3 min-w-0">
                      <Image
                        src={getPhotoUrl(
                          listing.coverImageUrl || listing.photos?.[0],
                        )}
                        alt=""
                        sizes="48px"
                        className="w-12 h-12 rounded-lg object-cover border border-border-base shrink-0"
                      />
                      <div className="min-w-0">
                        {/* `line-clamp-2` sets `display: -webkit-box`; the `block`
                            that used to follow it overrode that back to `block`,
                            which silently disabled the clamp entirely. The title
                            attribute keeps the full text reachable on hover. */}
                        <Link
                          to={`/annonce/${listing.id}`}
                          title={listing.title}
                          className="font-bold text-sm text-stone-900 hover:text-primary line-clamp-2"
                        >
                          {listing.title}
                        </Link>
                        <span className="text-xs text-stone-500 block truncate">
                          {getListingCategoryLabel(listing)}
                        </span>
                      </div>
                    </div>
                  ),
                },
                {
                  id: "Statut",
                  header: "Statut",
                  cell: renderListingStatus,
                },
                {
                  id: "Marches",
                  header: "Marchés",
                  cell: renderMarketsButton,
                },
                {
                  id: "Prix",
                  header: "Prix",
                  cell: (listing) => (
                    <span className="font-extrabold text-sm text-stone-900">
                      {formatPrice(listing.price, {
                        sourceCurrency: listing.currency,
                      })}
                    </span>
                  ),
                },
                {
                  id: "Vues",
                  header: "Vues",
                  cell: (listing) => (
                    <div className="flex items-center gap-1.5 text-xs text-stone-600">
                      <Eye className="w-icon-sm h-icon-sm text-stone-400" />
                      <span>
                        {listing.viewsCount ?? listing.viewCount ?? 0}
                      </span>
                    </div>
                  ),
                },
                {
                  id: "Date",
                  header: "Date",
                  cell: (listing) => (
                    <span className="text-xs text-stone-500">
                      {formatRelativeDate(listing.createdAt)}
                    </span>
                  ),
                },
                {
                  id: "Actions",
                  header: "Actions",
                  align: "right",
                  cell: renderListingActions,
                },
              ]}
            />
          )}
        </TabPanel>
      </div>

      {/* Boost Modal */}
      {boostModalListing && (
        <Modal
          isOpen={true}
          onClose={() => setBoostModalListing(null)}
          title={`Booster : ${boostModalListing.title}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-stone-600">
              {t(
                "sellerworkspace.myListingsPage.choisissezUneOptionDeVisibilite",
              )}
            </p>

            {boostOffersState === "loading" && (
              <p className="text-xs text-text-muted" role="status">
                Chargement des options disponibles…
              </p>
            )}
            {boostOffersState === "error" && (
              <p className="rounded-card border border-warning-border bg-warning-surface p-3 text-xs text-warning">
                Les options de visibilité sont temporairement indisponibles.
              </p>
            )}
            {boostOffersState === "ready" && boostOffers.length === 0 && (
              <p className="rounded-card border border-border-base bg-bg-subtle p-3 text-xs text-text-secondary">
                Aucune option de visibilité n’est disponible pour cette annonce.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {boostOffers.map((offer) => {
                const style = BOOST_STYLES[offer.id];
                return (
                  <button
                    key={offer.productId}
                    type="button"
                    onClick={() =>
                      handleApplyBoost(boostModalListing.id, offer)
                    }
                    disabled={Boolean(activatingBoostId)}
                    className={`p-4 rounded-xl border border-border-base text-left w-full cursor-pointer transition-all duration-fast space-y-2 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60 ${style.hoverClass} ${style.spanClass}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full font-black text-micro uppercase tracking-wider ${style.swatchClass}`}
                      >
                        {offer.badgeLabel}
                      </span>
                      <span className="font-black text-sm text-stone-900 shrink-0">
                        {formatMoney(offer.price)}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600">
                      {offer.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </Modal>
      )}

      {/* Markets Management Modal */}
      {marketsModalListing && (
        <Modal
          isOpen={true}
          onClose={() => setMarketsModalListing(null)}
          title={`Marchés de diffusion : ${marketsModalListing.title}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-stone-600">
              {t(
                "sellerworkspace.myListingsPage.selectionnezLesPaysEuropeensDans",
              )}
            </p>

            <div className="space-y-2">
              {marketService.getMarkets().map((m) => {
                const isChecked = selectedMarketsInModal.includes(m.code);
                return (
                  <label
                    key={m.code}
                    className="flex items-center justify-between p-3 rounded-xl border border-border-base hover:bg-bg-subtle cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{m.flag}</span>
                      <div>
                        <span className="font-bold text-sm text-stone-900">
                          {m.name}
                        </span>
                        <span className="text-xs text-stone-500 block">
                          Devise : {m.currency}
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedMarketsInModal([
                            ...selectedMarketsInModal,
                            m.code,
                          ]);
                        } else {
                          if (selectedMarketsInModal.length > 1) {
                            setSelectedMarketsInModal(
                              selectedMarketsInModal.filter(
                                (c) => c !== m.code,
                              ),
                            );
                          } else {
                            toast.warning(
                              "Au moins un marché doit être sélectionné.",
                            );
                          }
                        }
                      }}
                      className="rounded text-primary focus:ring-primary h-4 w-4"
                    />
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border-subtle">
              <Button
                variant="ghost"
                onClick={() => setMarketsModalListing(null)}
              >
                Annuler
              </Button>
              <Button
                variant="primary"
                onClick={async () => {
                  await listingRepository.updateListingMarkets(
                    marketsModalListing.id,
                    selectedMarketsInModal,
                  );
                  toast.success(
                    "Marchés de publication mis à jour avec succès.",
                  );
                  setMarketsModalListing(null);
                  await fetchListings();
                }}
              >
                {t("sellerworkspace.myListingsPage.enregistrerLesMarches")}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk CSV Import Modal */}
      {isBulkImportOpen && currentUser && (
        <BulkImportModal
          isOpen={isBulkImportOpen}
          currentUser={currentUser}
          onClose={() => setIsBulkImportOpen(false)}
          onImportCompleted={async () => {
            await fetchListings();
          }}
        />
      )}
    </div>
  );
};
