import { localizeTaxonomyLabels } from "@shongre/contracts/taxonomy-labels";
import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Building2,
  BedDouble,
  CheckCircle2,
  KeyRound,
  MapPin,
  Maximize2,
  Phone,
  ShieldCheck,
} from "lucide-react";
import type {
  PropertyLead,
  PropertyPublic,
} from "@shongre/contracts/real-estate";
import { isActiveMarketResolvedListingPromotion } from "@shongre/contracts";
import { useListingPromotionRefresh } from "@shongre/features/listings/web";
import { VerificationBadge } from "@shongre/ui/web";
import { services } from "../../api/client/service-registry";
import { useAuth } from "../../app/providers/AuthProvider";
import { useFavorites } from "../../app/providers/FavoritesProvider";
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
  Image,
  Input,
  SellerIdentityLink,
  Select,
  Skeleton,
  StatePanel,
  Textarea,
} from "../../design-system";
import { usePageMeta } from "../../hooks/usePageMeta";
import { PropertyCard } from "./components/PropertyCard";
import {
  formatImmoMoney,
  pricePeriodSuffix,
  formatImmoField,
} from "./immo-format";
import { useTranslation } from "../../i18n/I18nProvider";
import {
  DetailFactList,
  DetailSection,
} from "../../design-system/primitives/DetailFacts";
import { ListingLocationSection } from "../listings/components/ListingLocationSection";
import { ListingDiscoveryRail } from "../listings/components/ListingDiscoveryRail";
import { PAGE_SIZES } from "../../configuration/pagination.config";
import { iconForFact } from "@shongre/features/listings/facts";
import {
  PROPERTY_LEAD_FORM_ID,
  PropertyPrimaryActionButton,
  PropertyStickyHeader,
} from "./components/PropertyStickyHeader";

type LeadForm = {
  type: PropertyLead["type"];
  name: string;
  email: string;
  phone: string;
  message: string;
  preferredContactChannel: PropertyLead["preferredContactChannel"];
  consent: boolean;
};

export const ImmoPropertyDetailPage: React.FC = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const { currentUser, effectivePermissions } = useAuth();
  const canRecordRecentlyViewed = effectivePermissions.includes(
    "marketplace.customer.access",
  );
  const { activeMarket, currentLocale, convertMoney } = useMarketLocation();
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const { favoriteLoadState, isFavorite, refreshFavorites, toggleFavorite } =
    useFavorites();
  const [property, setProperty] = useState<PropertyPublic | null>(null);
  const [comparables, setComparables] = useState<PropertyPublic[]>([]);
  const [sellerProperties, setSellerProperties] = useState<PropertyPublic[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentLeadId, setSentLeadId] = useState<string>();
  const [appointmentAt, setAppointmentAt] = useState("");
  const originalListingHeaderRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<LeadForm>({
    type: "information",
    name: currentUser?.name || "",
    email: currentUser?.email || "",
    phone: currentUser?.phone || "",
    message: "Bonjour, ce bien est-il toujours disponible ?",
    preferredContactChannel: "message",
    consent: false,
  });
  useListingPromotionRefresh(property?.resolvedPromotion);
  const hasActivePromotion = isActiveMarketResolvedListingPromotion(
    property?.resolvedPromotion,
    activeMarket.code,
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setProperty(null);
    setComparables([]);
    setSellerProperties([]);
    services.realEstate
      .getProperty(slug, activeMarket.code)
      .then((result) => {
        if (cancelled) return;
        setProperty(result);
        // Account history and recommendations must not gate public discovery.
        if (currentUser && canRecordRecentlyViewed) {
          void services.realEstate
            .markRecentlyViewed(currentUser.id, result.id)
            .catch(() => undefined);
        }
        void services.realEstate
          .getComparableProperties(result.id, activeMarket.code)
          .then((items) => {
            if (!cancelled) setComparables(items);
          })
          .catch(() => undefined);
        // What else this agency or owner has listed, filtered by the API.
        if (result.seller?.id) {
          void services.realEstate
            .searchProperties({
              marketCode: activeMarket.code,
              sellerId: result.seller.id,
              sort: "newest",
              limit: PAGE_SIZES.similarVerticalListings,
            })
            .then((found) => {
              if (cancelled) return;
              setSellerProperties(
                found.items.filter((row) => row.id !== result.id).slice(0, 8),
              );
            })
            .catch(() => undefined);
        }
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
  }, [activeMarket.code, canRecordRecentlyViewed, currentUser?.id, slug]);

  usePageMeta({
    title: property?.title || "Bien immobilier",
    description: property
      ? `${formatImmoField(property, "property_type", currentLocale)} de ${property.characteristics.livingAreaSquareMeters} m² à ${property.address.publicLabel}, proposé à ${formatImmoMoney(property.financials.price, currentLocale)}.`
      : "Découvrez ce bien immobilier et contactez son annonceur.",
    canonicalPath: `/immo/bien/${slug}`,
    type: "product",
    image: property?.media.photos[0],
    structuredData: property
      ? [
          {
            "@context": "https://schema.org",
            "@type": "RealEstateListing",
            name: property.title,
            description: property.description,
            image: property.media.photos,
            datePosted: property.publishedAt,
            address: {
              "@type": "PostalAddress",
              addressLocality: property.address.city,
              postalCode: property.address.postalCode,
              addressCountry: property.address.countryCode,
            },
            geo: {
              "@type": "GeoCoordinates",
              latitude: property.address.latitude,
              longitude: property.address.longitude,
            },
            offers: {
              "@type": "Offer",
              price: property.financials.price.amountMinor / 100,
              priceCurrency: property.financials.price.currency,
              availability: "https://schema.org/InStock",
            },
            floorSize: {
              "@type": "QuantitativeValue",
              value: property.characteristics.livingAreaSquareMeters,
              unitCode: "MTK",
            },
          },
        ]
      : [],
  });

  const favorite = async () => {
    if (!property) return;
    try {
      const active = await toggleFavorite(property.listingId);
      toast.success(
        active ? "Bien ajouté aux favoris." : "Bien retiré des favoris.",
      );
    } catch {
      if (!currentUser) {
        navigate(
          `/connexion?redirect=${encodeURIComponent(`/immo/bien/${slug}`)}`,
        );
        return;
      }
      toast.error("Le favori n’a pas pu être enregistré.");
    }
  };

  const favoriteComparable = async (target: PropertyPublic) => {
    try {
      const active = await toggleFavorite(target.listingId);
      setComparables((current) =>
        current.map((item) =>
          item.id === target.id ? { ...item, isFavorite: active } : item,
        ),
      );
      toast.success(
        active ? "Bien ajouté aux favoris." : "Bien retiré des favoris.",
      );
    } catch {
      if (!currentUser) {
        navigate(
          `/connexion?redirect=${encodeURIComponent(`/immo/bien/${slug}`)}`,
        );
        return;
      }
      toast.error("Le favori n’a pas pu être enregistré.");
    }
  };

  const submitLead = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!property) return;
    setSending(true);
    try {
      const lead = await services.realEstate.submitLead({
        propertyId: property.id,
        type: form.type,
        requesterName: form.name,
        requesterEmail: form.email,
        requesterPhone: form.phone || undefined,
        message: form.message,
        preferredContactChannel: form.preferredContactChannel,
        consentGiven: form.consent,
        qualificationAnswers: {
          financing: "not_shared",
          source: "property_page",
        },
      });
      setSentLeadId(lead.id);
      toast.success(
        "Votre demande a été transmise sans révéler davantage de données que nécessaire.",
      );
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "La demande n’a pas pu être envoyée.",
      );
    } finally {
      setSending(false);
    }
  };

  const requestVisit = async () => {
    if (!sentLeadId) return;
    const startsAt = new Date(appointmentAt);
    if (
      !Number.isFinite(startsAt.getTime()) ||
      startsAt.getTime() <= Date.now()
    ) {
      toast.error(t("immo.propertyDetail.chooseFutureAppointment"));
      return;
    }
    try {
      await services.realEstate.requestAppointment(
        sentLeadId,
        startsAt.toISOString(),
      );
      toast.success("Créneau demandé. L’annonceur doit encore le confirmer.");
    } catch {
      toast.error("Le créneau n’a pas pu être demandé.");
    }
  };

  if (loading)
    return (
      <Container className="py-8">
        <div className="grid gap-5 lg:grid-cols-content-aside-lg">
          <Skeleton className="h-168 rounded-card" />
          <Skeleton className="h-136 rounded-card" />
        </div>
      </Container>
    );
  if (error || !property)
    return (
      <Container className="py-10">
        <StatePanel
          variant="notFound"
          title="Bien introuvable"
          description="Cette annonce n’est plus disponible ou son accès est restreint."
          action={<Button to="/immo">Voir les biens disponibles</Button>}
        />
      </Container>
    );

  const sellerPublicUrl = routes.seller.publicPage({
    id: property.seller.id,
    slug: property.seller.slug,
    isProfessional: property.seller.type !== "owner",
  });
  const isProfessionalSeller = property.seller.type !== "owner";
  const sellerKindLabel = t(
    isProfessionalSeller
      ? "immo.propertyDetail.professionalAdvertiser"
      : "immo.propertyDetail.individualAdvertiser",
  );
  const formattedPrice = `${formatImmoMoney(
    property.financials.price,
    currentLocale,
    convertMoney,
  )}${pricePeriodSuffix[property.financials.period]}`;
  return (
    <div className="bg-bg-subtle pb-14">
      <PropertyStickyHeader
        originalHeaderRef={originalListingHeaderRef}
        eyebrow={`${formatImmoField(property, "property_transaction", currentLocale)} · ${formatImmoField(property, "property_type", currentLocale)} · ${property.address.publicLabel}`}
        title={property.title}
        price={formattedPrice}
        phase={sentLeadId ? "appointment" : "lead"}
        isSending={sending}
        onRequestVisit={requestVisit}
      />
      <Container className="py-5">
        <nav aria-label="Fil d’Ariane" className="mb-4 text-xs text-text-muted">
          Immobilier /{" "}
          {formatImmoField(property, "property_type", currentLocale)} /{" "}
          {property.address.city}
        </nav>
        <div className="grid items-start gap-5 lg:grid-cols-content-aside-lg">
          <div className="min-w-0 space-y-5">
            <section className="overflow-hidden rounded-card border border-border-base bg-bg-surface">
              <div className="relative aspect-video bg-bg-subtle">
                <Image
                  src={property.media.photos[0]}
                  alt={property.title}
                  width={1600}
                  height={900}
                  priority
                  className="h-full w-full object-cover"
                  sizes="(min-width: 1024px) 760px, 100vw"
                />
                <div className="absolute left-3 top-3 flex gap-2">
                  {hasActivePromotion ? (
                    <Badge
                      data-testid="immo-property-promotion"
                      variant={
                        property.resolvedPromotion?.type === "urgent_badge"
                          ? "urgent"
                          : "featured"
                      }
                    >
                      {t("ui.listingCard.boosted")}
                    </Badge>
                  ) : null}
                </div>
                <div
                  data-listing-gallery-actions="true"
                  className="absolute right-3 top-3 z-raised flex items-center gap-2"
                >
                  <FavoriteButton
                    isFavorite={isFavorite(property.listingId)}
                    interactionState={favoriteLoadState}
                    label={`${
                      favoriteLoadState === "loading"
                        ? t("ui.listingCard.favorisChargement")
                        : favoriteLoadState === "error"
                          ? t("ui.listingCard.favorisReessayer")
                          : t(
                              isFavorite(property.listingId)
                                ? "ui.listingCard.retirerDesFavoris"
                                : "ui.listingCard.ajouterAuxFavoris",
                            )
                    } : ${property.title}`}
                    onToggle={favorite}
                    onRetry={async () => {
                      try {
                        await refreshFavorites();
                      } catch {
                        toast.error(
                          t("ui.listingCard.favorisChargementErreur"),
                        );
                      }
                    }}
                    size="md"
                    variant="floating"
                  />
                </div>
              </div>
              <div className="p-5 sm:p-6">
                <div
                  ref={originalListingHeaderRef}
                  data-testid="immo-original-listing-header"
                  className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"
                >
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-primary">
                      {formatImmoField(
                        property,
                        "property_transaction",
                        currentLocale,
                      )}{" "}
                      ·{" "}
                      {formatImmoField(
                        property,
                        "property_type",
                        currentLocale,
                      )}
                    </p>
                    <h1 className="mt-1 text-xl font-bold text-text-main sm:text-2xl">
                      {property.title}
                    </h1>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-text-secondary">
                      <MapPin className="h-icon-md w-icon-md" />
                      {property.address.publicLabel} · position approximative
                    </p>
                  </div>
                  <p className="shrink-0 text-xl font-bold text-primary">
                    {formattedPrice}
                  </p>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 border-y border-border-subtle py-4 text-center">
                  <div>
                    <Maximize2 className="mx-auto h-icon-lg w-icon-lg text-primary" />
                    <p className="mt-1 text-sm font-bold">
                      {property.characteristics.livingAreaSquareMeters} m²
                    </p>
                    <p className="text-micro text-text-muted">Surface</p>
                  </div>
                  <div>
                    <KeyRound className="mx-auto h-icon-lg w-icon-lg text-primary" />
                    <p className="mt-1 text-sm font-bold">
                      {property.characteristics.rooms}
                    </p>
                    <p className="text-micro text-text-muted">Pièces</p>
                  </div>
                  <div>
                    <BedDouble className="mx-auto h-icon-lg w-icon-lg text-primary" />
                    <p className="mt-1 text-sm font-bold">
                      {property.characteristics.bedrooms}
                    </p>
                    <p className="text-micro text-text-muted">Chambres</p>
                  </div>
                </div>
              </div>
            </section>

            {/*
             * Description and facts are two different reads and get two
             * sections, in the shape every category uses — the property specs
             * were previously a bare definition list stapled under the prose.
             */}
            {property.taxonomy?.detailCharacteristics?.length ? (
              <DetailSection
                title={t("listings.characteristics.keyInformation")}
              >
                <DetailFactList
                  facts={property.taxonomy.detailCharacteristics.map(
                    (field) => ({
                      code: field.code,
                      label: localizeTaxonomyLabels(
                        field.labels,
                        currentLocale,
                      ),
                      value: localizeTaxonomyLabels(
                        field.values,
                        currentLocale,
                      ),
                      icon: iconForFact("grp.property_specs", field.code),
                    }),
                  )}
                />
              </DetailSection>
            ) : null}

            <DetailSection title="Description">
              <p className="whitespace-pre-line text-sm leading-loose text-text-supporting">
                {property.description}
              </p>
            </DetailSection>

            <ListingLocationSection
              marketCode={activeMarket.code}
              city={property.address.city}
              postalCode={property.address.postalCode}
              latitude={property.address.latitude}
              longitude={property.address.longitude}
              precision={property.address.precision}
            />

            <section className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-card border border-border-base bg-bg-surface p-5">
                <h2 className="flex items-center gap-2 text-sm font-bold">
                  <ShieldCheck className="h-icon-lg w-icon-lg text-primary" />
                  Performance & réglementation
                </h2>
                <dl className="mt-4 space-y-3 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-text-muted">DPE</dt>
                    <dd className="font-bold">
                      {property.energy.dpeClass || "En attente"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-muted">GES</dt>
                    <dd className="font-bold">
                      {property.energy.gesClass || "En attente"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-muted">Copropriété</dt>
                    <dd className="font-bold">
                      {property.regulatory.coOwnershipApplicable
                        ? `${property.regulatory.coOwnershipLots || "—"} lots`
                        : "Non"}
                    </dd>
                  </div>
                </dl>
                {property.energy.warningText ? (
                  <p className="mt-4 rounded-control bg-warning-surface p-3 text-xs text-warning">
                    {property.energy.warningText}
                  </p>
                ) : null}
              </div>
              <div className="rounded-card border border-border-base bg-bg-surface p-5">
                <h2 className="flex items-center gap-2 text-sm font-bold">
                  <Building2 className="h-icon-lg w-icon-lg text-primary" />
                  Annonceur
                </h2>
                <Link
                  to={sellerPublicUrl}
                  className="group mt-4 block w-fit rounded-control focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                >
                  <span className="block font-bold text-text-main transition-colors group-hover:text-primary">
                    {property.seller.displayName}
                  </span>
                  <span className="block text-xs text-text-secondary">
                    {sellerKindLabel}
                  </span>
                </Link>
                <div className="mt-3 flex flex-wrap gap-2">
                  {property.seller.verificationLabels.map((label) => (
                    <VerificationBadge key={label} label={label} />
                  ))}
                </div>
                <p className="mt-3 text-xs text-text-muted">
                  {property.seller.responseTimeLabel}
                </p>
              </div>
            </section>
          </div>

          <aside className="sticky top-24 rounded-card border border-border-base bg-bg-surface p-5 shadow-sm">
            <SellerIdentityLink
              to={sellerPublicUrl}
              name={property.seller.displayName}
              avatarUrl={property.seller.logoUrl}
              isVerified={property.seller.verificationLabels.length > 0}
              isProfessional={isProfessionalSeller}
              rating={property.seller.rating}
              reviewCount={property.seller.reviewCount}
              locationLabel={property.address.city}
              className="mb-4 border-b border-border-subtle pb-4"
            />
            {!sentLeadId ? (
              <form
                id={PROPERTY_LEAD_FORM_ID}
                data-marketplace-action="message.send"
                onSubmit={submitLead}
                className="space-y-3"
              >
                <div>
                  <p className="text-sm font-bold text-text-main">
                    Contacter l’annonceur
                  </p>
                  <p className="mt-1 text-micro text-text-muted">
                    Demande structurée, sans accès à l’adresse exacte.
                  </p>
                </div>
                <label className="block text-xs font-semibold">
                  Votre demande
                  <Select
                    className="mt-1 w-full"
                    labelledByAncestor
                    value={form.type}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        type: event.target.value as LeadForm["type"],
                      })
                    }
                  >
                    <option value="information">Plus d’informations</option>
                    <option value="visit">Organiser une visite</option>
                    <option value="call">Être rappelé</option>
                    <option value="financing">Parler financement</option>
                  </Select>
                </label>
                <FormField label="Nom">
                  <Input
                    required
                    value={form.name}
                    onChange={(event) =>
                      setForm({ ...form, name: event.target.value })
                    }
                  />
                </FormField>
                <FormField label="E-mail">
                  <Input
                    required
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm({ ...form, email: event.target.value })
                    }
                  />
                </FormField>
                <FormField label="Téléphone (facultatif)">
                  <Input
                    type="tel"
                    value={form.phone}
                    onChange={(event) =>
                      setForm({ ...form, phone: event.target.value })
                    }
                  />
                </FormField>
                <FormField label="Message">
                  <Textarea
                    required
                    rows={4}
                    value={form.message}
                    onChange={(event) =>
                      setForm({ ...form, message: event.target.value })
                    }
                  />
                </FormField>
                <label className="flex items-start gap-2 text-micro text-text-secondary">
                  <Checkbox
                    checked={form.consent}
                    onChange={(event) =>
                      setForm({ ...form, consent: event.target.checked })
                    }
                  />
                  <span>
                    J’accepte que mes coordonnées soient transmises à cet
                    annonceur pour répondre à cette demande.
                  </span>
                </label>
                <PropertyPrimaryActionButton
                  phase="lead"
                  isSending={sending}
                  placement="panel"
                  onRequestVisit={requestVisit}
                />
                <Button
                  data-marketplace-action="message.prepare"
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    setForm({
                      ...form,
                      type: "call",
                      message:
                        "Bonjour, je souhaite être rappelé au sujet de ce bien.",
                    })
                  }
                  leftIcon={<Phone className="h-icon-md w-icon-md" />}
                >
                  Demander un rappel
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="rounded-control bg-success-surface p-4">
                  <CheckCircle2 className="h-icon-xl w-icon-xl text-success" />
                  <p className="mt-2 text-sm font-bold text-success">
                    Demande envoyée
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">
                    Choisissez maintenant un créneau indicatif si vous souhaitez
                    visiter.
                  </p>
                </div>
                <FormField label="Créneau souhaité">
                  <Input
                    type="datetime-local"
                    value={appointmentAt}
                    onChange={(event) => setAppointmentAt(event.target.value)}
                  />
                </FormField>
                <PropertyPrimaryActionButton
                  phase="appointment"
                  isSending={sending}
                  placement="panel"
                  onRequestVisit={requestVisit}
                />
              </div>
            )}
          </aside>
        </div>

        <div className="mt-8 space-y-7">
          <ListingDiscoveryRail
            kind="seller"
            title={t(
              isProfessionalSeller
                ? "listings.discovery.fromThisPro"
                : "listings.discovery.fromThisSeller",
            )}
            subtitle={t("listings.discovery.fromThisSellerSubtitle")}
            moreHref={sellerPublicUrl}
            moreLabel={t("listings.discovery.seeMoreFromSeller")}
          >
            {sellerProperties.map((item) => (
              <PropertyCard
                key={item.id}
                property={item}
                favoriteState={isFavorite(item.listingId)}
                favoriteLoadState={favoriteLoadState}
                onFavorite={favoriteComparable}
                onFavoriteRetry={refreshFavorites}
                compact
              />
            ))}
          </ListingDiscoveryRail>

          {/* "Comparables" rather than "similar": the wording is a claim about
              what the set is — same type of property, same project — and it
              deliberately stops short of implying a valuation. */}
          <ListingDiscoveryRail
            kind="comparables"
            title="Biens comparables"
            subtitle="Même type de bien et même projet, sans estimation de valeur."
          >
            {comparables.map((item) => (
              <PropertyCard
                key={item.id}
                property={item}
                favoriteState={isFavorite(item.listingId)}
                favoriteLoadState={favoriteLoadState}
                onFavorite={favoriteComparable}
                onFavoriteRetry={refreshFavorites}
                compact
              />
            ))}
          </ListingDiscoveryRail>
        </div>
      </Container>
    </div>
  );
};
