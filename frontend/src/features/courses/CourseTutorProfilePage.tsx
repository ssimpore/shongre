import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Languages,
  Laptop,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import type {
  CoursePublicOffer,
  TutorPublicProfile,
} from "@shongre/contracts/courses";
import { services } from "../../api/client/service-registry";
import {
  Badge,
  Button,
  Container,
  Image,
  Skeleton,
  StatePanel,
} from "../../design-system";
import { usePageMeta } from "../../hooks/usePageMeta";

const priceFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function VerificationRow({ label, status }: { label: string; status: string }) {
  const verified = status === "verified";
  const pending = status === "pending";
  return (
    <li className="flex items-center justify-between gap-3 py-2 text-xs">
      <span className="text-text-secondary">{label}</span>
      <span
        className={`inline-flex items-center gap-1.5 font-semibold ${verified ? "text-success" : pending ? "text-warning" : "text-text-muted"}`}
      >
        {verified && (
          <CheckCircle2 className="h-icon-xs w-icon-xs" aria-hidden="true" />
        )}
        {verified ? "Vérifié" : pending ? "En cours" : "Non vérifié"}
      </span>
    </li>
  );
}

export const CourseTutorProfilePage: React.FC = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const [tutor, setTutor] = useState<TutorPublicProfile | null>(null);
  const [offers, setOffers] = useState<CoursePublicOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    services.courses
      .getTutorProfile(slug)
      .then((result) => {
        setTutor(result.tutor);
        setOffers(result.offers);
      })
      .catch(() => setError(true))
      .finally(() => setIsLoading(false));
  }, [slug]);

  const canonicalPath = `/cours/professeur/${slug}`;
  usePageMeta({
    title: tutor
      ? `${tutor.displayName} — Professeur particulier`
      : "Profil professeur",
    description:
      tutor?.headline ||
      "Découvrez le profil, les cours, les disponibilités et les informations vérifiées de ce professeur.",
    canonicalPath,
    type: "profile",
    image: tutor?.avatarUrl,
    structuredData: tutor
      ? [
          {
            "@context": "https://schema.org",
            "@type": "Person",
            name: tutor.displayName,
            description: tutor.headline,
            image: tutor.avatarUrl,
            knowsLanguage: tutor.languages,
            knowsAbout: offers.map((offer) => offer.title),
          },
        ]
      : [],
  });

  if (isLoading) {
    return (
      <Container className="py-7">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Skeleton className="h-[34rem] rounded-card" />
          <Skeleton className="h-96 rounded-card" />
        </div>
      </Container>
    );
  }

  if (error || !tutor) {
    return (
      <Container className="py-10">
        <StatePanel
          variant="notFound"
          title="Profil professeur introuvable"
          description="Ce profil a peut-être été retiré, suspendu ou n’est plus publié."
          action={<Button to="/cours">Voir les professeurs</Button>}
        />
      </Container>
    );
  }

  const primaryOffer = offers[0];
  const hourlyPrice = primaryOffer?.pricingOptions.find(
    (price) => price.type === "hourly",
  );

  return (
    <Container className="py-5 sm:py-7">
      <nav aria-label="Fil d’Ariane" className="mb-4 text-xs text-text-muted">
        <Link to="/cours" className="hover:text-primary">
          Shongre Cours
        </Link>{" "}
        <span aria-hidden="true">/</span> {tutor.displayName}
      </nav>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <main className="min-w-0 space-y-5">
          <section className="overflow-hidden rounded-card border border-border-base bg-bg-surface shadow-xs">
            <div className="grid gap-5 p-5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:p-6">
              <div className="aspect-square overflow-hidden rounded-card bg-bg-subtle">
                <Image
                  src={tutor.avatarUrl}
                  alt={`Portrait de ${tutor.displayName}`}
                  className="h-full w-full object-cover"
                  sizes="160px"
                  priority
                />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-black tracking-tight text-text-main sm:text-2xl">
                    {tutor.displayName}
                  </h1>
                  {tutor.verifications.identity === "verified" && (
                    <Badge variant="verified" icon>
                      Identité vérifiée
                    </Badge>
                  )}
                  {tutor.organizationId && (
                    <Badge variant="pro">Organisme</Badge>
                  )}
                </div>
                <p className="mt-1 text-sm font-semibold text-text-main">
                  {tutor.headline}
                </p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-text-secondary">
                  {tutor.serviceArea && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin
                        className="h-icon-xs w-icon-xs"
                        aria-hidden="true"
                      />
                      {tutor.serviceArea.publicLocationLabel}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3
                      className="h-icon-xs w-icon-xs"
                      aria-hidden="true"
                    />
                    Répond en moyenne en{" "}
                    {Math.max(
                      1,
                      Math.round((tutor.responseTimeMinutes || 60) / 60),
                    )}{" "}
                    h
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Languages
                      className="h-icon-xs w-icon-xs"
                      aria-hidden="true"
                    />
                    {tutor.languages
                      .map((language) => language.toUpperCase())
                      .join(", ")}
                  </span>
                </div>
                {tutor.ratingIsStatisticallyMeaningful && tutor.rating ? (
                  <p className="mt-4 flex items-center gap-1.5 text-xs text-text-secondary">
                    <Star
                      className="h-icon-sm w-icon-sm fill-warning text-warning"
                      aria-hidden="true"
                    />
                    <strong className="text-text-main">{tutor.rating}</strong>
                    <span>
                      · {tutor.reviewCount} avis issus d’interactions vérifiées
                    </span>
                  </p>
                ) : (
                  <p className="mt-4 text-xs text-text-muted">
                    La note sera affichée après 5 interactions vérifiées.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs sm:p-6">
            <h2 className="text-base font-black text-text-main">À propos</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-text-secondary">
              {tutor.biography}
            </p>
            <h3 className="mt-5 text-sm font-bold text-text-main">
              Approche pédagogique
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              {tutor.teachingApproach}
            </p>
          </section>

          <section className="rounded-card border border-border-base bg-bg-surface shadow-xs">
            <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
              <h2 className="flex items-center gap-2 text-base font-black text-text-main">
                <BookOpen
                  className="h-icon-md w-icon-md text-primary"
                  aria-hidden="true"
                />
                Cours proposés
              </h2>
              <span className="text-xs text-text-muted">
                {offers.length} offre{offers.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="divide-y divide-border-subtle">
              {offers.map((offer) => {
                const price = offer.pricingOptions.find(
                  (option) => option.type === "hourly",
                );
                return (
                  <article
                    key={offer.id}
                    className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <div>
                      <h3 className="text-sm font-bold text-text-main">
                        {offer.title}
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                        {offer.description}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-micro font-semibold text-text-secondary">
                        {offer.deliveryModes.includes("online") && (
                          <span className="inline-flex items-center gap-1 rounded-pill border border-border-base px-2 py-1">
                            <Laptop
                              className="h-icon-xs w-icon-xs"
                              aria-hidden="true"
                            />{" "}
                            En ligne
                          </span>
                        )}
                        {offer.deliveryModes.includes("in_person") && (
                          <span className="inline-flex items-center gap-1 rounded-pill border border-border-base px-2 py-1">
                            <Users
                              className="h-icon-xs w-icon-xs"
                              aria-hidden="true"
                            />{" "}
                            Présentiel
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 rounded-pill border border-border-base px-2 py-1">
                          <CalendarDays
                            className="h-icon-xs w-icon-xs"
                            aria-hidden="true"
                          />{" "}
                          {offer.availabilitySummary}
                        </span>
                      </div>
                    </div>
                    {price && (
                      <div className="text-left sm:text-right">
                        <p className="text-lg font-black text-text-main">
                          {priceFormatter.format(price.price.amountMinor / 100)}
                          <span className="text-xs font-medium text-text-muted">
                            {" "}
                            / h
                          </span>
                        </p>
                        {offer.trialLessonAvailable && (
                          <p className="mt-1 text-xs font-semibold text-success">
                            Séance d’essai proposée
                          </p>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          <section className="grid gap-5 md:grid-cols-2">
            <div className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs">
              <h2 className="flex items-center gap-2 text-sm font-black text-text-main">
                <Award
                  className="h-icon-sm w-icon-sm text-primary"
                  aria-hidden="true"
                />
                Qualifications
              </h2>
              <div className="mt-3 space-y-3">
                {tutor.qualifications.map((qualification) => (
                  <div
                    key={qualification.id}
                    className="rounded-control border border-border-subtle bg-bg-subtle p-3"
                  >
                    <p className="text-xs font-bold text-text-main">
                      {qualification.label}
                    </p>
                    <p className="mt-1 text-micro text-text-muted">
                      {qualification.publicLabel}
                    </p>
                    <Badge
                      className="mt-2"
                      variant={
                        qualification.verificationStatus === "verified"
                          ? "verified"
                          : "neutral"
                      }
                    >
                      {qualification.evidenceStatus === "self_declared"
                        ? "Déclaré par le professeur"
                        : qualification.verificationStatus === "verified"
                          ? "Vérifié par Shongre"
                          : "Preuve privée transmise"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs">
              <h2 className="flex items-center gap-2 text-sm font-black text-text-main">
                <ShieldCheck
                  className="h-icon-sm w-icon-sm text-success"
                  aria-hidden="true"
                />
                Vérifications
              </h2>
              <ul className="mt-2 divide-y divide-border-subtle">
                <VerificationRow
                  label="Adresse e-mail"
                  status={tutor.verifications.email}
                />
                <VerificationRow
                  label="Téléphone"
                  status={tutor.verifications.phone}
                />
                <VerificationRow
                  label="Identité"
                  status={tutor.verifications.identity}
                />
                <VerificationRow
                  label="Qualifications"
                  status={tutor.verifications.qualifications}
                />
              </ul>
              <div className="mt-4 rounded-control border border-warning-border bg-warning-surface p-3">
                <p className="text-xs font-bold text-text-main">
                  Services à la personne
                </p>
                <p className="mt-1 text-micro leading-relaxed text-text-secondary">
                  {tutor.taxEligibility.publicWording} Aucun avantage fiscal
                  n’est garanti par cette fiche.
                </p>
              </div>
            </div>
          </section>
        </main>

        <aside className="self-start lg:sticky lg:top-24">
          <div className="rounded-card border border-border-base bg-bg-surface p-5 shadow-sm">
            {hourlyPrice && (
              <p className="text-2xl font-black text-text-main">
                {priceFormatter.format(hourlyPrice.price.amountMinor / 100)}
                <span className="ml-1 text-xs font-medium text-text-muted">
                  / h
                </span>
              </p>
            )}
            <p className="mt-2 text-xs leading-relaxed text-text-secondary">
              Échangez dans la messagerie Shongre avant de partager des
              coordonnées personnelles.
            </p>
            <div className="mt-4 space-y-2">
              <Button
                to={`/cours/demande?tutor=${tutor.id}&subject=${primaryOffer?.subjectId || ""}`}
                fullWidth
                leftIcon={<MessageSquare className="h-icon-sm w-icon-sm" />}
              >
                Contacter {tutor.displayName.split(" ")[0]}
              </Button>
              <Button to="/cours" variant="outline" fullWidth>
                Voir d’autres professeurs
              </Button>
            </div>
          </div>

          <div className="mt-4 rounded-card border border-border-base bg-bg-subtle p-4">
            <h2 className="text-xs font-black text-text-main">
              Premier cours en sécurité
            </h2>
            <ul className="mt-2 space-y-2 text-xs leading-relaxed text-text-secondary">
              <li>
                • Pour un mineur, le responsable légal organise l’échange.
              </li>
              <li>• Choisissez un lieu connu pour une première rencontre.</li>
              <li>• Signalez tout comportement ou demande inhabituelle.</li>
            </ul>
          </div>
        </aside>
      </div>
    </Container>
  );
};
