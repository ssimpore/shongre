import React from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Heart,
  Laptop,
  MapPin,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import type { TutorSearchItem } from "@shongre/contracts/courses";
import { Badge, Button, Image } from "../../../design-system";

interface CourseTutorCardProps {
  item: TutorSearchItem;
  isCompared: boolean;
  isSaved: boolean;
  onToggleCompare: (id: string) => void;
  onToggleSaved: (id: string) => void;
}

const priceFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function responseLabel(minutes?: number) {
  if (minutes === undefined) return "Non renseigné";
  if (minutes < 60) return `${minutes} min en moyenne`;
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours.toLocaleString("fr-FR")} h en moyenne`;
}

export const CourseTutorCard: React.FC<CourseTutorCardProps> = ({
  item,
  isCompared,
  isSaved,
  onToggleCompare,
  onToggleSaved,
}) => {
  const { tutor, offer } = item;
  const isIdentityVerified = tutor.verifications.identity === "verified";
  const verifiedQualification = tutor.qualifications.find(
    (qualification) => qualification.verificationStatus === "verified",
  );

  return (
    <article className="relative overflow-hidden rounded-card border border-border-base bg-bg-surface shadow-xs motion-surface hover:border-border-hover hover:shadow-sm">
      <div className="grid min-w-0 gap-4 p-4 sm:grid-cols-[9rem_minmax(0,1fr)_10rem] sm:p-5">
        <div className="min-w-0">
          <div className="relative aspect-[4/3] overflow-hidden rounded-card bg-bg-subtle sm:aspect-square">
            <Image
              src={tutor.avatarUrl}
              alt={`Portrait de ${tutor.displayName}`}
              className="h-full w-full object-cover"
              sizes="(max-width: 640px) 100vw, 144px"
            />
            <button
              type="button"
              aria-label={
                isSaved
                  ? `Retirer ${tutor.displayName} des favoris`
                  : `Ajouter ${tutor.displayName} aux favoris`
              }
              aria-pressed={isSaved}
              onClick={() => onToggleSaved(tutor.id)}
              className="touch-square absolute right-2 top-2 h-control-sm w-control-sm rounded-pill border border-border-base bg-bg-surface/95 text-text-main shadow-xs motion-interactive hover:bg-primary-light hover:text-primary"
            >
              <Heart
                className={`h-icon-sm w-icon-sm ${isSaved ? "fill-primary text-primary" : ""}`}
                aria-hidden="true"
              />
            </button>
          </div>
          <label className="mt-2 flex min-h-control-target cursor-pointer items-center gap-2 text-xs font-medium text-text-secondary">
            <input
              type="checkbox"
              checked={isCompared}
              onChange={() => onToggleCompare(tutor.id)}
            />
            Comparer
          </label>
        </div>

        <div className="min-w-0 space-y-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-black text-text-main sm:text-lg">
                <Link
                  to={`/cours/professeur/${tutor.slug}`}
                  className="hover:text-primary"
                >
                  {tutor.displayName}
                </Link>
              </h2>
              {isIdentityVerified && (
                <span
                  className="inline-flex text-success"
                  title="Identité vérifiée par Shongre"
                >
                  <ShieldCheck className="h-icon-sm w-icon-sm" aria-hidden="true" />
                  <span className="sr-only">Identité vérifiée</span>
                </span>
              )}
              {tutor.organizationId && (
                <Badge variant="pro" size="sm">
                  Organisme
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-sm font-semibold text-text-main">
              {item.subjectLabel} · {item.levelLabels.join(", ")}
            </p>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-text-secondary">
            {offer.deliveryModes.includes("online") && (
              <span className="inline-flex items-center gap-1.5">
                <Laptop className="h-icon-xs w-icon-xs" aria-hidden="true" />
                En ligne
              </span>
            )}
            {offer.deliveryModes.includes("in_person") && (
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-icon-xs w-icon-xs" aria-hidden="true" />
                En présentiel
              </span>
            )}
            {tutor.serviceArea && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-icon-xs w-icon-xs" aria-hidden="true" />
                {tutor.serviceArea.publicLocationLabel}
                {item.distanceKm !== undefined && ` · ${item.distanceKm} km`}
              </span>
            )}
          </div>

          <p className="line-clamp-2 text-xs leading-relaxed text-text-secondary">
            {tutor.teachingApproach}
          </p>

          <div className="grid gap-2 border-t border-border-subtle pt-3 text-xs sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <Clock3 className="mt-0.5 h-icon-xs w-icon-xs shrink-0 text-text-muted" aria-hidden="true" />
              <div>
                <span className="block text-text-muted">Réponse</span>
                <span className="font-semibold text-text-main">
                  {responseLabel(tutor.responseTimeMinutes)}
                </span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CalendarDays className="mt-0.5 h-icon-xs w-icon-xs shrink-0 text-text-muted" aria-hidden="true" />
              <div>
                <span className="block text-text-muted">Disponibilités</span>
                <span className="font-semibold text-text-main">
                  {offer.availabilitySummary}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-control border border-border-subtle bg-bg-subtle p-3 text-xs">
            <p className="font-bold text-text-main">Confiance et qualifications</p>
            <div className="mt-2 space-y-1.5">
              <p className="flex items-center gap-1.5 text-text-secondary">
                {isIdentityVerified ? (
                  <CheckCircle2 className="h-icon-xs w-icon-xs text-success" aria-hidden="true" />
                ) : (
                  <span className="h-2 w-2 rounded-pill bg-text-disabled" />
                )}
                Identité {isIdentityVerified ? "vérifiée" : "non vérifiée"}
              </p>
              <p className="text-text-secondary">
                {verifiedQualification
                  ? verifiedQualification.publicLabel
                  : tutor.qualifications[0]?.publicLabel ||
                    "Aucune qualification renseignée"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col border-t border-border-subtle pt-4 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <p className="text-xl font-black text-text-main">
            {priceFormatter.format(item.fromPrice.amountMinor / 100)}
            <span className="ml-1 text-xs font-medium text-text-muted">/ h</span>
          </p>
          {tutor.ratingIsStatisticallyMeaningful && tutor.rating ? (
            <p className="mt-1 flex items-center gap-1 text-xs text-text-secondary">
              <Star className="h-icon-xs w-icon-xs fill-warning text-warning" aria-hidden="true" />
              <span className="font-bold text-text-main">{tutor.rating}</span>
              <span>({tutor.reviewCount} avis vérifiés)</span>
            </p>
          ) : (
            <p className="mt-1 text-xs text-text-muted">
              Note affichée à partir de 5 avis vérifiés
            </p>
          )}
          <div className="mt-4 space-y-2 sm:mt-auto">
            <Button
              to={`/cours/professeur/${tutor.slug}`}
              size="compact"
              fullWidth
            >
              Voir le profil
            </Button>
            <Button
              to={`/cours/demande?subject=${offer.subjectId}&tutor=${tutor.id}`}
              variant="outline"
              size="compact"
              fullWidth
            >
              Contacter
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
};
