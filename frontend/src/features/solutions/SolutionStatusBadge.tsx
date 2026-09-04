import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Clock,
  FlaskConical,
  Wrench,
  XCircle,
} from "lucide-react";
import {
  SOLUTION_LIFECYCLE_PRESENTATION,
  solutionLifecycleLabel,
} from "../../domains/solutions/solutions.presentation";
import type { SolutionLifecycle } from "../../domains/solutions/solutions.types";
import { useTranslation } from "../../i18n/I18nProvider";

/**
 * One icon per lifecycle, so the state is legible without relying on colour
 * alone — the catalogue is read at a glance and several states share a hue
 * family.
 */
const LIFECYCLE_ICONS: Record<SolutionLifecycle, typeof CheckCircle2> = {
  DRAFT: CircleDot,
  INTERNAL: CircleDot,
  COMING_SOON: Clock,
  BETA: FlaskConical,
  AVAILABLE: CheckCircle2,
  MAINTENANCE: Wrench,
  DEPRECATED: AlertTriangle,
  RETIRED: XCircle,
};

/**
 * The lifecycle badge for every public Solutions surface.
 *
 * Status used to be drawn three ways — check icon plus coloured text in the
 * catalogue row, plain bold text on the detail page, small grey text in the
 * header dropdown — and the detail page collapsed five distinct states onto the
 * brand colour with `lifecycle === "AVAILABLE" ? success : primary`, so a
 * retired solution read exactly like a promoted one. `tone` in
 * `SOLUTION_LIFECYCLE_PRESENTATION` already carried the right semantics and was
 * never read; this component is the thing that reads it.
 */
export function SolutionStatusBadge({
  lifecycle,
  size = "sm",
  className = "",
}: {
  lifecycle: SolutionLifecycle;
  size?: "sm" | "md";
  className?: string;
}) {
  const { t } = useTranslation();
  const Icon = LIFECYCLE_ICONS[lifecycle];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-control border font-bold ${
        size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-micro"
      } ${SOLUTION_LIFECYCLE_PRESENTATION[lifecycle].tone} ${className}`}
    >
      <Icon
        className={size === "md" ? "h-4 w-4" : "h-3 w-3"}
        aria-hidden="true"
      />
      {solutionLifecycleLabel(t, lifecycle)}
    </span>
  );
}
