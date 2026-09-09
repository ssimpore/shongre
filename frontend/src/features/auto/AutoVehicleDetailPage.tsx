import { localizeTaxonomyLabels } from "@shongre/contracts/taxonomy-labels";
import { PAGE_SIZES } from "../../configuration/pagination.config";
import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Clock3,
  FileCheck2,
  Gauge,
  GitCompareArrows,
  MapPin,
  MessageSquare,
  TriangleAlert,
} from "lucide-react";
import type { AutoLead, VehiclePublic } from "@shongre/contracts/auto";
import { isActiveMarketResolvedListingPromotion } from "@shongre/contracts";
import { useListingPromotionRefresh } from "@shongre/features/listings/web";
import { VerificationBadge } from "@shongre/ui/web";
import { services } from "../../api/client/service-registry";
import { useAuth } from "../../app/providers/AuthProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { routes } from "../../configuration/routes";
import {
  Badge,
  Button,
  Checkbox,
  Container,
  FavoriteButton,
  FormField,
  Input,
  Modal,
  SellerIdentityLink,
  Select,
  Skeleton,
  StatePanel,
  Textarea,
} from "../../design-system";
import { ListingMediaGallery } from "../listings/components/ListingMediaGallery";
import { ListingDiscoveryRail } from "../listings/components/ListingDiscoveryRail";
import { usePageMeta } from "../../hooks/usePageMeta";
import { AutoVehicleCard } from "./components/AutoVehicleCard";
import {
  formatAutoMileage,
  formatAutoMoney,
  formatAutoField,
} from "./auto-format";
import { useTranslation } from "../../i18n/I18nProvider";
import {
  DetailFactList,
  DetailFeatureList,
  DetailSection,
} from "../../design-system/primitives/DetailFacts";
import { ListingLocationSection } from "../listings/components/ListingLocationSection";
import { iconForFact } from "../../domains/listing/listing-facts.presentation";
import { useAutoVehicleFavorites } from "./useAutoVehicleFavorites";

type LeadFormState = {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  intention: AutoLead["intention"];
  message: string;
  marketingConsent: boolean;
};

export const AutoVehicleDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { activeMarket, currentLocale, convertMoney } = useMarketLocation();
  const toast = useToast();
  const [vehicle, setVehicle] = useState<VehiclePublic | null>(null);
  const [similar, setSimilar] = useState<VehiclePublic[]>([]);
  const [sellerVehicles, setSellerVehicles] = useState<VehiclePublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const {
    favoriteIds,
    loadState: favoriteLoadState,
    refresh: refreshFavorites,
    toggleFavorite: toggleFavoriteVehicle,
  } = useAutoVehicleFavorites(currentUser?.id, activeMarket.code);
  const [lead, setLead] = useState<LeadFormState>({
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    intention: "availability",
    message: "Bonjour, ce véhicule est-il toujours disponible ?",
    marketingConsent: false,
  });
  useListingPromotionRefresh(vehicle?.resolvedPromotion);
  const hasActivePromotion = isActiveMarketResolvedListingPromotion(
    vehicle?.resolvedPromotion,
    activeMarket.code,
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    services.auto
      .getVehicle(slug, activeMarket.code)
      .then(async (result) => {
        /*
         * Both rails answer a question the visitor has on this page — what else
         * is like this, and what else does this dealer have — so they are
         * fetched together rather than one after the other. The seller filter
         * is applied by the API, not by reading the market and matching ids.
         */
        const [similarResult, sellerResult] = await Promise.all([
          services.auto.searchVehicles({
            marketCode: activeMarket.code,
            makeIds: result.makeId ? [result.makeId] : undefined,
            sort: "relevance",
            limit: PAGE_SIZES.similarVerticalListings,
          }),
          result.seller?.id
            ? services.auto
                .searchVehicles({
                  marketCode: activeMarket.code,
                  sellerId: result.seller.id,
                  sort: "relevance",
                  limit: PAGE_SIZES.similarVerticalListings,
                })
                .catch(() => null)
            : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setVehicle(result);
        setSimilar(
          similarResult.items.filter((row) => row.slug !== slug).slice(0, 3),
        );
        setSellerVehicles(
          (sellerResult?.items ?? [])
            .filter((row) => row.slug !== slug)
            .slice(0, 8),
        );
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeMarket.code, slug]);

  usePageMeta({
    title: vehicle?.title || "Véhicule d’occasion",
    description: vehicle
      ? `${vehicle.technical.modelYear}, ${formatAutoMileage(vehicle, currentLocale)}, ${formatAutoField(vehicle, "fuel_type", currentLocale)}. ${vehicle.locationLabel}.`
      : "Découvrez les caractéristiques et informations de confiance de ce véhicule.",
    canonicalPath: `/auto/vehicule/${slug}`,
    type: "product",
    image: vehicle?.mediaUrls[0],
    structuredData: vehicle
      ? [
          {
            "@context": "https://schema.org",
            "@type": "Vehicle",
            name: vehicle.title,
            description: vehicle.description,
            image: vehicle.mediaUrls,
            vehicleModelDate: String(vehicle.technical.modelYear),
            mileageFromOdometer: {
              "@type": "QuantitativeValue",
              value: vehicle.technical.mileage,
              unitCode: vehicle.technical.mileageUnit === "km" ? "KMT" : "SMI",
            },
            fuelType: formatAutoField(vehicle, "fuel_type", currentLocale),
            offers: {
              "@type": "Offer",
              price: vehicle.price.amountMinor / 100,
              priceCurrency: vehicle.price.currency,
              availability: "https://schema.org/InStock",
              url: `/auto/vehicule/${vehicle.slug}`,
            },
          },
        ]
      : [],
  });

  const sendLead = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!vehicle || favoriteLoadState !== "ready") return;
    setSubmitting(true);
    try {
      await services.auto.submitLead({
        vehicleId: vehicle.id,
        ...lead,
        source: "vehicle_page",
      });
      setLeadOpen(false);
      toast.success("Votre demande structurée a été transmise au vendeur.");
    } catch {
      toast.error("La demande n’a pas pu être transmise.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFavorite = async () => {
    if (!vehicle) return;
    if (!currentUser) {
      navigate(routes.auth.login(window.location.pathname));
      return;
    }
    try {
      const isFavorite = await toggleFavoriteVehicle(vehicle.id);
      toast.success(
        isFavorite
          ? "Véhicule ajouté aux favoris."
          : "Véhicule retiré des favoris.",
      );
    } catch {
      toast.error("Les favoris sont temporairement indisponibles.");
    }
  };

  const toggleSimilarFavorite = async (target: VehiclePublic) => {
    if (!currentUser) {
      navigate(routes.auth.login(window.location.pathname));
      return;
    }
    if (favoriteLoadState !== "ready") return;
    try {
      const isFavorite = await toggleFavoriteVehicle(target.id);
      toast.success(
        isFavorite
          ? "Véhicule ajouté aux favoris."
          : "Véhicule retiré des favoris.",
      );
    } catch {
      toast.error("Les favoris sont temporairement indisponibles.");
    }
  };

  if (loading)
    return (
      <Container className="py-7">
        <div className="grid gap-5 lg:grid-cols-content-aside-md">
          <Skeleton className="h-168 rounded-card" />
          <Skeleton className="h-96 rounded-card" />
        </div>
      </Container>
    );
  if (error || !vehicle)
    return (
      <Container className="py-10">
        <StatePanel
          variant="notFound"
          title="Véhicule introuvable"
          description="Cette annonce a peut-être été vendue, suspendue ou retirée."
          action={<Button to={routes.auto.search()}>Voir les véhicules</Button>}
        />
      </Container>
    );

  const trustDocuments = [
    [
      "Carte grise",
      vehicle.trust.documents.find(
        (row) => row.type === "registration_certificate",
      )?.status || "uploaded_private",
    ],
    [
      "Contrôle technique",
      vehicle.history.inspectionStatus === "valid" ? "verified" : "missing",
    ],
    [
      "HistoVec / non-gage",
      vehicle.trust.historyReportStatus === "verified"
        ? "verified"
        : vehicle.trust.historyReportStatus,
    ],
  ];

  const sellerPublicUrl = routes.seller.publicPage({
    id: vehicle.seller.id,
    slug: vehicle.seller.slug,
    isProfessional: vehicle.seller.type === "dealer",
  });

  return (
    <>
      <Container className="py-5 sm:py-7">
        <nav aria-label="Fil d’Ariane" className="mb-4 text-xs text-text-muted">
          <Link to={routes.auto.search()} className="hover:text-primary">
            Shongre Auto
          </Link>{" "}
          <span aria-hidden="true">/</span> {vehicle.makeLabel}{" "}
          {vehicle.modelLabel}
        </nav>
        <div className="grid min-w-0 gap-5 lg:grid-cols-content-aside-md">
          <div className="min-w-0 space-y-5">
            <section className="overflow-hidden rounded-card border border-border-base bg-bg-surface shadow-xs">
              <ListingMediaGallery
                photos={vehicle.mediaUrls}
                title={vehicle.title}
                viewportAspectClassName="aspect-video"
                className="rounded-none border-0 shadow-none"
                overlayActions={
                  <>
                    <FavoriteButton
                      isFavorite={favoriteIds.has(vehicle.id)}
                      onToggle={toggleFavorite}
                      onRetry={refreshFavorites}
                      interactionState={favoriteLoadState}
                      label={t(
                        favoriteLoadState === "loading"
                          ? "ui.listingCard.favorisChargement"
                          : favoriteLoadState === "error"
                            ? "ui.listingCard.favorisReessayer"
                            : favoriteIds.has(vehicle.id)
                              ? "ui.listingCard.retirerDesFavoris"
                              : "ui.listingCard.ajouterAuxFavoris",
                      )}
                      size="md"
                      variant="floating"
                    />
                    <Link
                      to={routes.auto.compare([vehicle.id])}
                      className="flex h-8 w-8 items-center justify-center rounded-control bg-bg-surface/90 text-text-secondary shadow-xs backdrop-blur-xs transition-colors hover:bg-bg-surface hover:text-text-main focus:outline-none focus:ring-2 focus:ring-primary"
                      aria-label="Comparer ce véhicule"
                    >
                      <GitCompareArrows className="h-icon-md w-icon-md" />
                    </Link>
                  </>
                }
              />
              <div className="p-5 sm:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      {hasActivePromotion && (
                        <Badge>{t("ui.listingCard.boosted")}</Badge>
                      )}
                      {vehicle.trust.publicBadges.map((badge) => (
                        <Badge key={badge} variant="success">
                          {badge}
                        </Badge>
                      ))}
                    </div>
                    <h1 className="text-xl font-bold tracking-tight text-text-main sm:text-2xl">
                      {vehicle.title}
                    </h1>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-text-secondary">
                      <MapPin
                        className="h-icon-sm w-icon-sm"
                        aria-hidden="true"
                      />{" "}
                      {vehicle.locationLabel}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-2xl font-bold text-primary">
                      {formatAutoMoney(
                        vehicle.price,
                        currentLocale,
                        convertMoney,
                      )}
                    </p>
                    {vehicle.financingMonthlyEstimate && (
                      <p className="mt-1 text-sm font-bold text-text-main">
                        ou{" "}
                        {formatAutoMoney(
                          vehicle.financingMonthlyEstimate,
                          currentLocale,
                          convertMoney,
                        )}{" "}
                        / mois
                      </p>
                    )}
                    {vehicle.financingMonthlyEstimate && (
                      <p className="mt-1 text-micro text-text-muted">
                        Estimation à titre indicatif
                      </p>
                    )}
                  </div>
                </div>
                {vehicle.priceEstimate && (
                  <div className="mt-5 flex gap-3 rounded-card border border-success-border bg-success-surface p-4">
                    <Gauge
                      className="h-icon-md w-icon-md shrink-0 text-success"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-xs font-bold text-success">
                        Prix estimé dans la moyenne
                      </p>
                      <p className="mt-1 text-micro leading-relaxed text-text-secondary">
                        Entre{" "}
                        {vehicle.priceEstimate.low &&
                          formatAutoMoney(
                            vehicle.priceEstimate.low,
                            currentLocale,
                            convertMoney,
                          )}{" "}
                        et{" "}
                        {vehicle.priceEstimate.high &&
                          formatAutoMoney(
                            vehicle.priceEstimate.high,
                            currentLocale,
                            convertMoney,
                          )}
                        , selon {vehicle.priceEstimate.sampleSize} annonces
                        comparables. {vehicle.priceEstimate.disclaimer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/*
             * The same fact list every category uses. A vehicle spec is not a
             * different kind of information from a rental's capacity, so it does
             * not get its own grid — a visitor arriving from search reads the
             * same shape whichever vertical published the listing.
             */}
            <DetailSection title={t("listings.characteristics.keyInformation")}>
              <DetailFactList
                facts={(vehicle.taxonomy?.detailCharacteristics ?? []).map(
                  (field) => ({
                    code: field.code,
                    label: localizeTaxonomyLabels(field.labels, currentLocale),
                    value: localizeTaxonomyLabels(field.values, currentLocale),
                    icon: iconForFact("grp.vehicle_technical", field.code),
                  }),
                )}
              />
            </DetailSection>

            {vehicle.equipment.length > 0 ? (
              <DetailSection title={t("listings.characteristics.amenities")}>
                <DetailFeatureList
                  features={vehicle.equipment.map((equipment) => ({
                    code: equipment,
                    label: equipment,
                    icon: "check" as const,
                  }))}
                />
              </DetailSection>
            ) : null}

            <DetailSection title="Description">
              <p className="whitespace-pre-line text-sm leading-loose text-text-supporting">
                {vehicle.description}
              </p>
            </DetailSection>

            {/* No coordinates are published for a vehicle, so this names the
                place and draws nothing rather than inventing a position. */}
            <ListingLocationSection
              id={vehicle.id}
              marketCode={activeMarket.code}
              city={vehicle.locationLabel}
            />

            <section className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs sm:p-6">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <FileCheck2 className="h-icon-md w-icon-md text-primary" />{" "}
                Documents et confiance
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-text-secondary">
                Les documents complets restent privés. Seul leur statut de
                contrôle est communiqué publiquement.
              </p>
              <ul className="mt-3 divide-y divide-border-subtle">
                {trustDocuments.map(([label, status]) => (
                  <li
                    key={label}
                    className="flex items-center justify-between py-3 text-xs"
                  >
                    <span>{label}</span>
                    {status === "verified" ? (
                      <VerificationBadge
                        size="xs"
                        label={t("ui.identityStatus.verification.generic")}
                      />
                    ) : (
                      <span className="inline-flex items-center gap-1.5 font-bold text-text-muted">
                        <Clock3 className="h-icon-xs w-icon-xs" />
                        Disponible en privé / à contrôler
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <ListingDiscoveryRail
              kind="seller"
              title={t(
                vehicle.seller.type === "dealer"
                  ? "listings.discovery.fromThisPro"
                  : "listings.discovery.fromThisSeller",
              )}
              subtitle={t("listings.discovery.fromThisSellerSubtitle")}
              moreHref={sellerPublicUrl}
              moreLabel={t("listings.discovery.seeMoreFromSeller")}
            >
              {sellerVehicles.map((row) => (
                <AutoVehicleCard
                  key={row.id}
                  vehicle={row}
                  isFavorite={favoriteIds.has(row.id)}
                  favoriteLoadState={favoriteLoadState}
                  onFavorite={toggleSimilarFavorite}
                  onFavoriteRetry={refreshFavorites}
                  compact
                />
              ))}
            </ListingDiscoveryRail>

            <ListingDiscoveryRail
              kind="similar"
              title={t("listings.discovery.similar")}
              subtitle={t("listings.discovery.similarSubtitleGeneric")}
              moreHref={`/auto?make=${vehicle.makeId || ""}`}
              moreLabel={t("listings.discovery.seeAllInCategory")}
            >
              {similar.map((row) => (
                <AutoVehicleCard
                  key={row.id}
                  vehicle={row}
                  isFavorite={favoriteIds.has(row.id)}
                  favoriteLoadState={favoriteLoadState}
                  onFavorite={toggleSimilarFavorite}
                  onFavoriteRetry={refreshFavorites}
                  compact
                />
              ))}
            </ListingDiscoveryRail>
          </div>

          <aside className="self-start space-y-4 lg:sticky lg:top-24">
            <section className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs">
              <SellerIdentityLink
                to={sellerPublicUrl}
                name={vehicle.seller.displayName}
                avatarUrl={vehicle.seller.logoUrl}
                isVerified={vehicle.seller.verifiedBusiness}
                isProfessional={vehicle.seller.type === "dealer"}
                rating={vehicle.seller.rating}
                reviewCount={vehicle.seller.reviewCount}
                locationLabel={vehicle.seller.locationLabel}
              />
              <div className="mt-4 space-y-2 text-xs text-text-secondary">
                {vehicle.seller.verifiedBusiness ? (
                  <VerificationBadge
                    label={t("ui.identityStatus.verification.company")}
                  />
                ) : null}
                <p className="flex items-center gap-2">
                  <Clock3 className="h-icon-sm w-icon-sm" /> Répond en moyenne
                  en {vehicle.seller.responseTimeMinutes} min
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="h-icon-sm w-icon-sm" />{" "}
                  {vehicle.seller.locationLabel}
                </p>
              </div>
              <Button
                data-marketplace-action="message.send"
                fullWidth
                className="mt-5"
                leftIcon={<MessageSquare className="h-icon-sm w-icon-sm" />}
                onClick={() => setLeadOpen(true)}
              >
                Contacter le vendeur
              </Button>
              <Button
                data-marketplace-action="appointment.request"
                fullWidth
                variant="outline"
                className="mt-2"
                onClick={() => {
                  setLead((current) => ({
                    ...current,
                    intention: "test_drive",
                    message:
                      "Bonjour, je souhaite organiser un essai de ce véhicule.",
                  }));
                  setLeadOpen(true);
                }}
              >
                Demander un essai
              </Button>
            </section>
            <section className="rounded-card border border-warning-border bg-warning-surface p-4">
              <h2 className="flex items-center gap-2 text-xs font-bold text-text-main">
                <TriangleAlert className="h-icon-sm w-icon-sm text-warning" />{" "}
                Conseils de sécurité
              </h2>
              <ul className="mt-2 space-y-2 text-micro leading-relaxed text-text-secondary">
                <li>Vérifiez les originaux et le VIN sur le véhicule.</li>
                <li>
                  N’envoyez pas d’acompte hors d’un parcours sécurisé annoncé
                  par Shongre.
                </li>
                <li>
                  Consultez les informations HistoVec communiquées par le
                  vendeur.
                </li>
              </ul>
            </section>
            <section className="rounded-card border border-border-base bg-bg-surface p-4">
              <p className="text-xs font-bold">Services partenaires</p>
              <p className="mt-2 text-micro leading-relaxed text-text-muted">
                Financement, assurance, inspection, garantie, livraison et
                reprise ne sont pas activés sur ce marché. Aucune approbation
                partenaire n’est revendiquée.
              </p>
            </section>
          </aside>
        </div>
      </Container>
      <Modal
        isOpen={leadOpen}
        onClose={() => setLeadOpen(false)}
        title="Contacter le vendeur"
        description={`À propos de ${vehicle.title}`}
      >
        <form
          data-marketplace-action="message.send"
          onSubmit={sendLead}
          className="space-y-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Nom" required>
              <Input
                value={lead.contactName}
                onChange={(event) =>
                  setLead({ ...lead, contactName: event.target.value })
                }
                required
              />
            </FormField>
            <FormField label="Email" required>
              <Input
                type="email"
                value={lead.contactEmail}
                onChange={(event) =>
                  setLead({ ...lead, contactEmail: event.target.value })
                }
                required
              />
            </FormField>
          </div>
          <FormField label="Téléphone (facultatif)">
            <Input
              type="tel"
              value={lead.contactPhone}
              onChange={(event) =>
                setLead({ ...lead, contactPhone: event.target.value })
              }
            />
          </FormField>
          <FormField label="Votre demande" required>
            <Select
              className="w-full"
              labelledByAncestor
              value={lead.intention}
              onChange={(event) =>
                setLead({
                  ...lead,
                  intention: event.target.value as typeof lead.intention,
                })
              }
            >
              <option value="availability">Disponibilité</option>
              <option value="information">Informations</option>
              <option value="callback">Être rappelé</option>
              <option value="viewing">Organiser une visite</option>
              <option value="test_drive">Essai</option>
              <option value="price_proposal">
                Proposition de prix non engageante
              </option>
              <option value="purchase">Achat</option>
              <option value="trade_in">Reprise</option>
              <option value="financing">Informations de financement</option>
              <option value="insurance">Informations d’assurance</option>
              <option value="warranty">Informations de garantie</option>
              <option value="inspection">Informations d’inspection</option>
              <option value="delivery">Informations de livraison</option>
            </Select>
          </FormField>
          <FormField label="Message" required>
            <Textarea
              value={lead.message}
              onChange={(event) =>
                setLead({ ...lead, message: event.target.value })
              }
              rows={4}
              required
            />
          </FormField>
          <Checkbox
            checked={lead.marketingConsent}
            onChange={(event) =>
              setLead({ ...lead, marketingConsent: event.target.checked })
            }
            label="J’accepte de recevoir des informations commerciales de Shongre (facultatif)."
          />
          <p className="text-micro leading-relaxed text-text-muted">
            L’envoi de cette demande autorise Shongre à transmettre vos
            coordonnées à ce vendeur pour y répondre. Le consentement commercial
            reste séparé.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={() => setLeadOpen(false)}
            >
              Annuler
            </Button>
            <Button
              data-marketplace-action="message.send"
              type="submit"
              fullWidth
              isLoading={submitting}
            >
              Envoyer la demande
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};
