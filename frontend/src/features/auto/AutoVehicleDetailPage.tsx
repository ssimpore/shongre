import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  BadgeCheck,
  BatteryCharging,
  CalendarDays,
  CarFront,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Fuel,
  Gauge,
  GitCompareArrows,
  Heart,
  MapPin,
  MessageSquare,
  ShieldCheck,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import type { AutoLead, VehiclePublic } from "@shongre/contracts/auto";
import { services } from "../../api/client/service-registry";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { routes } from "../../configuration/routes";
import {
  Badge,
  Button,
  Checkbox,
  Container,
  FormField,
  Image,
  Input,
  Modal,
  Skeleton,
  StatePanel,
  Textarea,
} from "../../design-system";
import { usePageMeta } from "../../hooks/usePageMeta";
import { AutoVehicleCard } from "./components/AutoVehicleCard";
import {
  formatAutoMileage,
  formatAutoMoney,
  fuelLabels,
  transmissionLabels,
} from "./auto-format";

type LeadFormState = {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  intention: AutoLead["intention"];
  message: string;
  marketingConsent: boolean;
};

export const AutoVehicleDetailPage: React.FC = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const { currentUser } = useAuth();
  const toast = useToast();
  const [vehicle, setVehicle] = useState<VehiclePublic | null>(null);
  const [similar, setSimilar] = useState<VehiclePublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lead, setLead] = useState<LeadFormState>({
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    intention: "availability",
    message: "Bonjour, ce véhicule est-il toujours disponible ?",
    marketingConsent: false,
  });

  useEffect(() => {
    setLoading(true);
    setError(false);
    services.auto
      .getVehicle(slug)
      .then((result) => {
        setVehicle(result);
        return services.auto.searchVehicles({
          marketCode: "FR",
          makeIds: result.makeId ? [result.makeId] : undefined,
          sort: "relevance",
          limit: 4,
        });
      })
      .then((result) =>
        setSimilar(result.items.filter((row) => row.slug !== slug).slice(0, 3)),
      )
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  usePageMeta({
    title: vehicle?.title || "Véhicule d’occasion",
    description: vehicle
      ? `${vehicle.technical.modelYear}, ${formatAutoMileage(vehicle)}, ${fuelLabels[vehicle.technical.fuelType]}. ${vehicle.locationLabel}.`
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
            fuelType: fuelLabels[vehicle.technical.fuelType],
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
    if (!vehicle) return;
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
    try {
      const isFavorite = await services.auto.toggleFavoriteVehicle(
        currentUser?.id || "guest",
        vehicle.id,
      );
      setVehicle({ ...vehicle, isFavorite });
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
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <Skeleton className="h-[42rem] rounded-card" />
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

  const characteristicRows: Array<[LucideIcon, string, React.ReactNode]> = [
    [CalendarDays, "Année", vehicle.technical.modelYear],
    [Gauge, "Kilométrage", formatAutoMileage(vehicle)],
    [Fuel, "Énergie", fuelLabels[vehicle.technical.fuelType]],
    [CarFront, "Boîte", transmissionLabels[vehicle.technical.transmission]],
    [
      Gauge,
      "Puissance",
      vehicle.technical.powerHp
        ? `${vehicle.technical.powerHp} ch`
        : "Non indiquée",
    ],
    [CarFront, "Carrosserie", vehicle.technical.bodyType || "Non indiquée"],
    [ShieldCheck, "Crit’Air", vehicle.technical.critAirClass || "Non indiquée"],
    [
      BatteryCharging,
      "Autonomie",
      vehicle.technical.electricRangeKm
        ? `${vehicle.technical.electricRangeKm} km`
        : "Non applicable",
    ],
  ];

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
        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <main className="min-w-0 space-y-5">
            <section className="overflow-hidden rounded-card border border-border-base bg-bg-surface shadow-xs">
              <div className="relative aspect-[16/9] bg-bg-subtle">
                <Image
                  src={vehicle.mediaUrls[0]}
                  alt={vehicle.title}
                  className="h-full w-full object-cover"
                  sizes="(min-width: 1024px) 760px, 100vw"
                  priority
                />
                <div className="absolute right-3 top-3 flex gap-2">
                  <button
                    type="button"
                    onClick={toggleFavorite}
                    aria-pressed={vehicle.isFavorite}
                    className="rounded-control bg-bg-surface p-2 shadow-xs"
                    aria-label={
                      vehicle.isFavorite
                        ? "Retirer des favoris"
                        : "Ajouter aux favoris"
                    }
                  >
                    <Heart
                      className={`h-icon-md w-icon-md ${vehicle.isFavorite ? "fill-primary text-primary" : ""}`}
                    />
                  </button>
                  <Link
                    to={routes.auto.compare([
                      vehicle.id,
                      "vehicle_3008_petrol",
                    ])}
                    className="rounded-control bg-bg-surface p-2 shadow-xs"
                    aria-label="Comparer ce véhicule"
                  >
                    <GitCompareArrows className="h-icon-md w-icon-md" />
                  </Link>
                </div>
              </div>
              <div className="p-5 sm:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      {vehicle.promotionLabels.includes("sponsored") && (
                        <Badge>Sponsorisé</Badge>
                      )}
                      {vehicle.trust.publicBadges.map((badge) => (
                        <Badge key={badge} variant="verified">
                          {badge}
                        </Badge>
                      ))}
                    </div>
                    <h1 className="text-xl font-black tracking-tight text-text-main sm:text-2xl">
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
                    <p className="text-2xl font-black text-primary">
                      {formatAutoMoney(vehicle.price)}
                    </p>
                    {vehicle.financingMonthlyEstimate && (
                      <p className="mt-1 text-sm font-bold text-text-main">
                        ou {formatAutoMoney(vehicle.financingMonthlyEstimate)} /
                        mois
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
                      <p className="text-xs font-black text-success">
                        Prix estimé dans la moyenne
                      </p>
                      <p className="mt-1 text-micro leading-relaxed text-text-secondary">
                        Entre{" "}
                        {vehicle.priceEstimate.low &&
                          formatAutoMoney(vehicle.priceEstimate.low)}{" "}
                        et{" "}
                        {vehicle.priceEstimate.high &&
                          formatAutoMoney(vehicle.priceEstimate.high)}
                        , selon {vehicle.priceEstimate.sampleSize} annonces
                        comparables. {vehicle.priceEstimate.disclaimer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs sm:p-6">
              <h2 className="text-base font-black text-text-main">
                Caractéristiques principales
              </h2>
              <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border-subtle bg-border-subtle sm:grid-cols-4">
                {characteristicRows.map(([Icon, label, value]) => (
                  <div key={label} className="bg-bg-surface p-4">
                    <dt className="flex items-center gap-1.5 text-micro font-bold uppercase tracking-wide text-text-muted">
                      <Icon
                        className="h-icon-xs w-icon-xs"
                        aria-hidden="true"
                      />{" "}
                      {label}
                    </dt>
                    <dd className="mt-1.5 text-xs font-bold text-text-main">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs sm:p-6">
              <h2 className="text-base font-black text-text-main">
                État, historique et équipements
              </h2>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <div>
                  <h3 className="text-xs font-bold">Historique déclaré</h3>
                  <ul className="mt-2 space-y-2 text-xs text-text-secondary">
                    <li className="flex gap-2">
                      <CheckCircle2 className="h-icon-sm w-icon-sm text-success" />{" "}
                      Carnet d’entretien{" "}
                      {vehicle.history.maintenanceBookStatus === "complete"
                        ? "complet"
                        : "partiel"}
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle2 className="h-icon-sm w-icon-sm text-success" />{" "}
                      {vehicle.history.previousOwnerCount ?? "Nombre de"}{" "}
                      propriétaire précédent
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle2 className="h-icon-sm w-icon-sm text-success" />{" "}
                      Aucun accident déclaré
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-xs font-bold">Équipements</h3>
                  <ul className="mt-2 grid grid-cols-2 gap-2 text-xs text-text-secondary">
                    {vehicle.equipment.map((equipment) => (
                      <li key={equipment} className="flex gap-1.5">
                        <CheckCircle2 className="h-icon-xs w-icon-xs text-success" />{" "}
                        {equipment}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <h3 className="mt-5 text-xs font-bold">Description</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {vehicle.description}
              </p>
            </section>

            <section className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs sm:p-6">
              <h2 className="flex items-center gap-2 text-base font-black">
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
                    <span
                      className={`inline-flex items-center gap-1.5 font-bold ${status === "verified" ? "text-success" : "text-text-muted"}`}
                    >
                      {status === "verified" ? (
                        <CheckCircle2 className="h-icon-xs w-icon-xs" />
                      ) : (
                        <Clock3 className="h-icon-xs w-icon-xs" />
                      )}
                      {status === "verified"
                        ? "Vérifié"
                        : "Disponible en privé / à contrôler"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {similar.length > 0 && (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-base font-black">Véhicules similaires</h2>
                  <Link
                    to={`/auto?make=${vehicle.makeId || ""}`}
                    className="text-xs font-bold text-primary"
                  >
                    Voir plus
                  </Link>
                </div>
                <div className="space-y-3">
                  {similar.map((row) => (
                    <AutoVehicleCard key={row.id} vehicle={row} compact />
                  ))}
                </div>
              </section>
            )}
          </main>

          <aside className="self-start space-y-4 lg:sticky lg:top-24">
            <section className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-card bg-text-main text-sm font-black text-white">
                  ASL
                </div>
                <div>
                  <p className="text-sm font-black">
                    {vehicle.seller.displayName}
                  </p>
                  <p className="text-micro text-text-muted">
                    {vehicle.seller.type === "dealer"
                      ? "Professionnel"
                      : "Particulier"}
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-xs text-text-secondary">
                <p className="flex items-center gap-2">
                  <BadgeCheck className="h-icon-sm w-icon-sm text-success" />{" "}
                  Entreprise vérifiée
                </p>
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
                fullWidth
                className="mt-5"
                leftIcon={<MessageSquare className="h-icon-sm w-icon-sm" />}
                onClick={() => setLeadOpen(true)}
              >
                Contacter le vendeur
              </Button>
              <Button
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
              <h2 className="flex items-center gap-2 text-xs font-black text-text-main">
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
              <p className="text-xs font-black">Services partenaires</p>
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
        <form onSubmit={sendLead} className="space-y-4">
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
            <select
              value={lead.intention}
              onChange={(event) =>
                setLead({
                  ...lead,
                  intention: event.target.value as typeof lead.intention,
                })
              }
              className="h-control-touch w-full rounded-control border border-border-base px-3 text-sm"
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
            </select>
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
            <Button type="submit" fullWidth isLoading={submitting}>
              Envoyer la demande
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};
