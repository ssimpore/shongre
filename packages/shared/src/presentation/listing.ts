export type ListingLifecycle =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "PUBLISHED"
  | "RESERVED"
  | "SOLD"
  | "EXPIRED"
  | "SUSPENDED"
  | "REJECTED"
  | "REMOVED"
  | "ARCHIVED";

export const listingStatusPresentation: Record<
  ListingLifecycle,
  { label: string; tone: "neutral" | "warning" | "success" | "danger" }
> = {
  DRAFT: { label: "Brouillon", tone: "neutral" },
  PENDING_REVIEW: { label: "En cours d’examen", tone: "warning" },
  PUBLISHED: { label: "Publiée", tone: "success" },
  RESERVED: { label: "Réservée", tone: "warning" },
  SOLD: { label: "Vendue", tone: "neutral" },
  EXPIRED: { label: "Expirée", tone: "neutral" },
  SUSPENDED: { label: "Suspendue", tone: "danger" },
  REJECTED: { label: "Refusée", tone: "danger" },
  REMOVED: { label: "Retirée", tone: "danger" },
  ARCHIVED: { label: "Archivée", tone: "neutral" },
};

export const getInitials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
