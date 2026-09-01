import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  BadgeCheck,
  BedDouble,
  CalendarDays,
  CheckCircle2,
  Heart,
  KeyRound,
  MapPin,
  Maximize2,
  MessageSquare,
  Phone,
  ShieldCheck,
} from "lucide-react";
import type {
  PropertyLead,
  PropertyPublic,
} from "@shongre/contracts/real-estate";
import { services } from "../../api/client/service-registry";
import { useAuth } from "../../app/providers/AuthProvider";
import { useFavorites } from "../../app/providers/FavoritesProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { useToast } from "../../app/providers/ToastProvider";
import {
  Badge,
  Button,
  Checkbox,
  Container,
  FormField,
  Image,
  Input,
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
  propertyTypeLabels,
  transactionLabels,
} from "./immo-format";

type LeadForm = {
  type: PropertyLead["type"];
  name: string;
  email: string;
  phone: string;
  message: string;
  preferredContactChannel: PropertyLead["preferredContactChannel"];
  consent: boolean;
};

const amenityLabels: Record<string, string> = {
  lift: "Ascenseur",
  balcony: "Balcon",
  terrace: "Terrasse",
  garden: "Jardin",
  parking: "Parking",
  cellar: "Cave",
  accessible: "Accessible PMR",
};

export const ImmoPropertyDetailPage: React.FC = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const { currentUser } = useAuth();
  const { currentLocale } = useMarketLocation();
  const toast = useToast();
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [property, setProperty] = useState<PropertyPublic | null>(null);
  const [comparables, setComparables] = useState<PropertyPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentLeadId, setSentLeadId] = useState<string>();
  const [appointmentAt, setAppointmentAt] = useState("2026-08-26T14:30");
  const [form, setForm] = useState<LeadForm>({
    type: "information",
    name: currentUser?.name || "",
    email: currentUser?.email || "",
    phone: currentUser?.phone || "",
    message: "Bonjour, ce bien est-il toujours disponible ?",
    preferredContactChannel: "message",
    consent: false,
  });

  useEffect(() => {
    setLoading(true);
    services.realEstate
      .getProperty(slug)
      .then(async (result) => {
        setProperty(result);
        await services.realEstate.markRecentlyViewed(
          currentUser?.id || "guest",
          result.id,
        );
        setComparables(
          await services.realEstate.getComparableProperties(result.id),
        );
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug, currentUser?.id]);

  usePageMeta({
    title: property?.title || "Bien immobilier",
    description: property
      ? `${propertyTypeLabels[property.propertyType]} de ${property.characteristics.livingAreaSquareMeters} m² à ${property.address.publicLabel}, proposé à ${formatImmoMoney(property.financials.price, currentLocale)}.`
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
    try {
      await services.realEstate.requestAppointment(
        sentLeadId,
        new Date(appointmentAt).toISOString(),
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

  return (
    <div className="bg-bg-subtle pb-14">
      <Container className="py-5">
        <nav aria-label="Fil d’Ariane" className="mb-4 text-xs text-text-muted">
          Immobilier / {propertyTypeLabels[property.propertyType]} /{" "}
          {property.address.city}
        </nav>
        <div className="grid items-start gap-5 lg:grid-cols-content-aside-lg">
          <div className="min-w-0 space-y-5">
            <section className="overflow-hidden rounded-card border border-border-base bg-bg-surface">
              <div className="relative aspect-video bg-bg-subtle">
                <Image
                  src={property.media.photos[0]}
                  alt={property.title}
                  className="h-full w-full object-cover"
                  sizes="(min-width: 1024px) 760px, 100vw"
                />
                <div className="absolute left-3 top-3 flex gap-2">
                  {property.promotion.featured ? (
                    <Badge variant="featured">À la une</Badge>
                  ) : null}
                  {property.promotion.urgent ? (
                    <Badge variant="urgent">Urgent</Badge>
                  ) : null}
                </div>
                <Button
                  data-marketplace-action="favorite.manage"
                  variant="secondary"
                  size="sm"
                  className="absolute right-3 top-3"
                  onClick={favorite}
                  leftIcon={
                    <Heart
                      className={`h-icon-md w-icon-md ${isFavorite(property.listingId) ? "fill-primary" : ""}`}
                    />
                  }
                >
                  {isFavorite(property.listingId) ? "Enregistré" : "Favori"}
                </Button>
              </div>
              <div className="p-5 sm:p-6">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-primary">
                      {transactionLabels[property.transactionType]} ·{" "}
                      {propertyTypeLabels[property.propertyType]}
                    </p>
                    <h1 className="mt-1 text-xl font-black text-text-main sm:text-2xl">
                      {property.title}
                    </h1>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-text-secondary">
                      <MapPin className="h-icon-md w-icon-md" />
                      {property.address.publicLabel} · position approximative
                    </p>
                  </div>
                  <p className="shrink-0 text-xl font-black text-primary">
                    {formatImmoMoney(property.financials.price, currentLocale)}
                    {pricePeriodSuffix[property.financials.period]}
                  </p>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 border-y border-border-subtle py-4 text-center">
                  <div>
                    <Maximize2 className="mx-auto h-icon-lg w-icon-lg text-primary" />
                    <p className="mt-1 text-sm font-black">
                      {property.characteristics.livingAreaSquareMeters} m²
                    </p>
                    <p className="text-micro text-text-muted">Surface</p>
                  </div>
                  <div>
                    <KeyRound className="mx-auto h-icon-lg w-icon-lg text-primary" />
                    <p className="mt-1 text-sm font-black">
                      {property.characteristics.rooms}
                    </p>
                    <p className="text-micro text-text-muted">Pièces</p>
                  </div>
                  <div>
                    <BedDouble className="mx-auto h-icon-lg w-icon-lg text-primary" />
                    <p className="mt-1 text-sm font-black">
                      {property.characteristics.bedrooms}
                    </p>
                    <p className="text-micro text-text-muted">Chambres</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-card border border-border-base bg-bg-surface p-5 sm:p-6">
              <h2 className="text-base font-black text-text-main">
                À propos de ce bien
              </h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-text-secondary">
                {property.description}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {property.characteristics.amenities.map((item) => (
                  <Badge key={item}>{amenityLabels[item] || item}</Badge>
                ))}
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-card border border-border-base bg-bg-surface p-5">
                <h2 className="flex items-center gap-2 text-sm font-black">
                  <ShieldCheck className="h-icon-lg w-icon-lg text-primary" />
                  Performance & réglementation
                </h2>
                <dl className="mt-4 space-y-3 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-text-muted">DPE</dt>
                    <dd className="font-black">
                      {property.energy.dpeClass || "En attente"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-muted">GES</dt>
                    <dd className="font-black">
                      {property.energy.gesClass || "En attente"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-muted">Copropriété</dt>
                    <dd className="font-black">
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
                <h2 className="flex items-center gap-2 text-sm font-black">
                  <BadgeCheck className="h-icon-lg w-icon-lg text-primary" />
                  Annonceur
                </h2>
                <p className="mt-4 font-black text-text-main">
                  {property.seller.displayName}
                </p>
                <p className="text-xs text-text-secondary">
                  {property.seller.type === "owner"
                    ? "Particulier"
                    : "Professionnel"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {property.seller.verificationLabels.map((label) => (
                    <Badge key={label} variant="success">
                      {label}
                    </Badge>
                  ))}
                </div>
                <p className="mt-3 text-xs text-text-muted">
                  {property.seller.responseTimeLabel}
                </p>
              </div>
            </section>
          </div>

          <aside className="sticky top-24 rounded-card border border-border-base bg-bg-surface p-5 shadow-sm">
            {!sentLeadId ? (
              <form
                data-marketplace-action="message.send"
                onSubmit={submitLead}
                className="space-y-3"
              >
                <div>
                  <p className="text-sm font-black text-text-main">
                    Contacter l’annonceur
                  </p>
                  <p className="mt-1 text-micro text-text-muted">
                    Demande structurée, sans accès à l’adresse exacte.
                  </p>
                </div>
                <label className="block text-xs font-bold">
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
                <Button
                  data-marketplace-action="message.send"
                  type="submit"
                  variant="primary"
                  className="w-full"
                  isLoading={sending}
                  leftIcon={<MessageSquare className="h-icon-md w-icon-md" />}
                >
                  Envoyer la demande
                </Button>
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
                  <p className="mt-2 text-sm font-black text-success">
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
                <Button
                  data-marketplace-action="appointment.request"
                  variant="primary"
                  className="w-full"
                  onClick={requestVisit}
                  leftIcon={<CalendarDays className="h-icon-md w-icon-md" />}
                >
                  Demander ce créneau
                </Button>
              </div>
            )}
          </aside>
        </div>

        {comparables.length ? (
          <section className="mt-8">
            <h2 className="text-lg font-black text-text-main">
              Biens comparables
            </h2>
            <p className="mt-1 text-xs text-text-muted">
              Même type de bien et même projet, sans estimation de valeur.
            </p>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {comparables.map((item) => (
                <PropertyCard key={item.id} property={item} compact />
              ))}
            </div>
          </section>
        ) : null}
      </Container>
    </div>
  );
};
