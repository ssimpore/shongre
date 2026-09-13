import { Link } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  Check,
  FileText,
  Search,
  ShieldCheck,
} from "lucide-react";

interface ProspectsLandingPreviewProps {
  workspaceDestination: string;
  variant?: "hero" | "dossier";
}

function CandidateList() {
  return (
    <div className="hidden min-w-0 border-r border-border-base md:col-span-2 md:block">
      <div className="border-b border-border-base p-4">
        <div className="flex h-control-md items-center gap-2 rounded-control border border-border-base bg-bg-surface px-3 text-xs text-text-secondary">
          <Search className="h-icon-sm w-icon-sm shrink-0" aria-hidden="true" />
          <span className="truncate">Critères de recherche</span>
        </div>
        <div className="mt-3 flex items-center justify-between text-micro font-bold text-text-muted">
          <span>RÉSULTATS</span>
          <span>ADÉQUATION</span>
        </div>
      </div>
      <div className="divide-y divide-border-subtle">
        {[true, false, false].map((selected, index) => (
          <div
            key={index}
            aria-hidden="true"
            className={`flex items-center gap-3 p-4 ${
              selected
                ? "border-l-2 border-primary bg-primary-light"
                : "border-l-2 border-transparent bg-bg-surface"
            }`}
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-xs font-bold ${
                selected
                  ? "bg-surface-inverse text-text-inverse"
                  : "bg-bg-muted text-text-secondary"
              }`}
            />
            <span className="min-w-0 flex-1 space-y-2">
              <span className="block h-2.5 w-3/4 rounded-full bg-bg-muted" />
              <span className="block h-2 w-1/2 rounded-full bg-bg-subtle" />
            </span>
            <span className="h-2.5 w-8 rounded-full bg-success-surface" />
          </div>
        ))}
      </div>
      <div className="border-t border-border-base p-4 text-xs font-semibold text-text-secondary">
        Voir les résultats
        <ArrowRight
          className="ml-1 inline h-icon-sm w-icon-sm"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

function CompanyHeader() {
  return (
    <div className="flex items-start gap-3 border-b border-border-base p-4 sm:p-5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-surface-inverse text-text-inverse">
        <Building2 className="h-icon-md w-icon-md" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-text-main sm:text-base">
          Dossier d’entreprise
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-text-muted">
          Identité, activité et provenance
        </p>
      </div>
      <div className="text-right">
        <p className="text-micro font-semibold uppercase tracking-wide text-text-muted">
          Score calculé
        </p>
        <span className="mt-2 block h-2.5 w-14 rounded-full bg-success-surface" />
      </div>
    </div>
  );
}

function EvidenceTimeline({ compact = false }: { compact?: boolean }) {
  return (
    <div className="relative space-y-4 p-4 before:absolute before:bottom-5 before:left-7 before:top-5 before:w-px before:bg-primary-border sm:p-5 sm:before:left-9">
      {!compact && (
        <div className="relative flex gap-3">
          <span className="z-raised flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary-border bg-bg-surface text-primary">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold text-text-main">
              Critères d’adéquation
            </p>
            <p className="mt-1 text-xs leading-relaxed text-text-secondary">
              Les critères appliqués et les preuves correspondantes sont fournis
              par le backend pour chaque résultat.
            </p>
          </div>
        </div>
      )}

      <div className="relative flex gap-3">
        <span className="z-raised flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary-border bg-bg-surface text-primary">
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-text-main">Faits connus</p>
          <ul className="mt-2 space-y-1.5 text-xs text-text-secondary">
            <li className="flex gap-2">
              <Check
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success"
                aria-hidden="true"
              />
              Informations issues des sources autorisées
            </li>
            <li className="flex gap-2">
              <Check
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success"
                aria-hidden="true"
              />
              Provenance et date de collecte conservées
            </li>
          </ul>
        </div>
      </div>

      <div className="relative flex gap-3">
        <span className="z-raised flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary-border bg-bg-surface text-primary">
          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-text-main">Preuve actuelle</p>
          <p className="mt-1 text-xs leading-relaxed text-text-secondary">
            Source vérifiée par le backend
          </p>
          <p className="mt-0.5 text-micro font-semibold text-success">
            Horodatage fourni avec le résultat
          </p>
        </div>
      </div>
    </div>
  );
}

function HeroPreview({ workspaceDestination }: ProspectsLandingPreviewProps) {
  return (
    <div className="overflow-hidden rounded-card border border-border-base bg-bg-surface shadow-lg">
      <div className="border-b border-border-base p-3 md:hidden">
        <div className="flex h-control-md items-center gap-2 rounded-control border border-border-base bg-bg-surface px-3 text-xs text-text-secondary">
          <Search className="h-icon-sm w-icon-sm shrink-0" aria-hidden="true" />
          <span className="truncate">ateliers automobiles multimarques</span>
        </div>
      </div>
      <div className="md:grid md:grid-cols-5">
        <CandidateList />
        <div className="min-w-0 md:col-span-3">
          <CompanyHeader />
          <EvidenceTimeline />
          <div className="border-t border-border-base p-4 sm:p-5">
            <Link
              to={workspaceDestination}
              className="inline-flex min-h-control-touch w-full items-center justify-center gap-2 rounded-control border border-primary px-4 text-xs font-bold text-primary transition-colors hover:bg-primary-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-auto"
            >
              Voir le dossier
              <ArrowRight className="h-icon-sm w-icon-sm" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function DossierPreview({
  workspaceDestination,
}: ProspectsLandingPreviewProps) {
  return (
    <div className="overflow-hidden rounded-card border border-border-base bg-bg-surface shadow-md">
      <div className="flex items-center gap-2 border-b border-border-base px-4 py-3 text-micro font-semibold text-text-muted sm:px-5">
        <span>Prospects</span>
        <span aria-hidden="true">/</span>
        <span className="text-text-main">Dossier d’entreprise</span>
      </div>
      <CompanyHeader />
      <div className="flex items-center gap-2 border-b border-border-base px-4 py-2.5 text-xs font-semibold text-success sm:px-5">
        <Check className="h-icon-sm w-icon-sm shrink-0" aria-hidden="true" />
        Contrôle des doublons et des preuves
      </div>
      <div className="grid gap-px border-b border-border-base bg-border-base sm:grid-cols-3">
        {[
          "Score d’adéquation",
          "Score d’opportunité",
          "Confiance des données",
        ].map((label) => (
          <div key={label} className="bg-bg-surface px-4 py-3 sm:px-5">
            <p className="text-micro font-semibold text-text-muted">{label}</p>
            <span className="mt-2 block h-2.5 w-16 rounded-full bg-bg-muted" />
          </div>
        ))}
      </div>
      <EvidenceTimeline compact />
      <div className="grid gap-3 border-t border-border-base bg-bg-base p-4 sm:grid-cols-content-action sm:items-center sm:p-5">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-bold text-text-main">
              Information manquante
            </p>
            <p className="mt-0.5 text-xs text-text-secondary">
              Rôle du décideur
            </p>
          </div>
          <div>
            <p className="text-xs font-bold text-text-main">Prochaine action</p>
            <p className="mt-0.5 max-w-md text-xs leading-relaxed text-text-secondary">
              Valider les preuves puis ajouter l’entreprise à une liste ciblée.
            </p>
          </div>
        </div>
        <Link
          to={workspaceDestination}
          className="inline-flex min-h-control-touch items-center justify-center gap-2 rounded-control bg-primary px-4 text-xs font-bold text-on-primary transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Importer dans le CRM
          <ArrowRight className="h-icon-sm w-icon-sm" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

export function ProspectsLandingPreview(props: ProspectsLandingPreviewProps) {
  return props.variant === "dossier" ? (
    <DossierPreview {...props} />
  ) : (
    <HeroPreview {...props} />
  );
}
