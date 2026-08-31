import { BarChart3, FileText, Grid2X2, ScanSearch, Store } from "lucide-react";
import type { SolutionIconId } from "../../domains/solutions/solutions.types";

const ICONS = {
  prospects: ScanSearch,
  facturation: FileText,
  marketplace: Store,
  pilotage: BarChart3,
  apps: Grid2X2,
} as const;

export function SolutionIcon({
  icon,
  className = "h-8 w-8",
}: {
  icon: SolutionIconId;
  className?: string;
}) {
  const Icon = ICONS[icon];
  return <Icon className={className} strokeWidth={1.75} aria-hidden="true" />;
}
