import type { SolutionLifecycle } from "./solutions.types";

export const SOLUTION_LIFECYCLE_PRESENTATION: Record<
  SolutionLifecycle,
  { label: string; description: string; tone: string }
> = {
  DRAFT: {
    label: "Brouillon",
    description: "Visible uniquement dans la console.",
    tone: "text-stone-600 bg-stone-100 border-stone-200",
  },
  INTERNAL: {
    label: "Interne",
    description: "Réservée aux équipes Shongre.",
    tone: "text-violet-700 bg-violet-50 border-violet-200",
  },
  COMING_SOON: {
    label: "À venir",
    description: "Présentation publique sans lancement.",
    tone: "text-info bg-info-surface border-info-border",
  },
  BETA: {
    label: "Bêta",
    description: "Accessible avec un périmètre de disponibilité explicite.",
    tone: "text-primary bg-primary-light border-primary-border",
  },
  AVAILABLE: {
    label: "Disponible",
    description: "La solution peut être lancée.",
    tone: "text-success bg-success-surface border-success-border",
  },
  MAINTENANCE: {
    label: "Maintenance",
    description: "Visible, temporairement non lançable.",
    tone: "text-warning bg-warning-surface border-warning-border",
  },
  DEPRECATED: {
    label: "En fin de vie",
    description: "Accessible avec une orientation de migration.",
    tone: "text-warning bg-warning-surface border-warning-border",
  },
  RETIRED: {
    label: "Retirée",
    description: "Masquée du catalogue public et conservée en historique.",
    tone: "text-danger bg-danger-surface border-danger-border",
  },
};

export const PUBLIC_SOLUTION_LIFECYCLES: readonly SolutionLifecycle[] = [
  "COMING_SOON",
  "BETA",
  "AVAILABLE",
  "MAINTENANCE",
  "DEPRECATED",
];
