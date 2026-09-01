import { ArrowRight, Bell, CheckCircle2, ExternalLink } from "lucide-react";
import { applicationHref } from "../../platform/applications/use-application-href";
import { getPublicRuntimeConfig } from "../../platform/runtime-config/public-runtime-config";
import { resolveSolutionLaunch } from "../../domains/solutions/solutions.launch";
import {
  presentSolutionLaunch,
  solutionLifecycleLabel,
} from "../../domains/solutions/solutions.presentation";
import type { SolutionDefinition } from "../../domains/solutions/solutions.types";
import { useTranslation } from "../../i18n/I18nProvider";
import type { UserProfile } from "../../types";
import { SolutionIcon } from "./SolutionIcon";
import { SolutionPreview } from "./SolutionPreview";

export function SolutionCatalogRow({
  solution,
  marketCode,
  user,
}: {
  solution: SolutionDefinition;
  marketCode: string;
  user: UserProfile | null;
}) {
  const { t } = useTranslation();
  const launch = resolveSolutionLaunch({
    solution,
    marketCode,
    user,
    applications: getPublicRuntimeConfig().applications,
  });
  const launchCopy = presentSolutionLaunch(t, solution, launch);
  const detailHref = applicationHref("solutions", `/${solution.slug}`);
  const comingSoon = launch.reason === "COMING_SOON";

  return (
    <article className="solutions-catalog-row grid gap-5 border-t border-border-base py-7 first:border-t-0 lg:items-center lg:gap-8">
      <div className="flex min-w-0 gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary sm:h-20 sm:w-20">
          <SolutionIcon icon={solution.icon} className="h-9 w-9" />
        </span>
        <div className="min-w-0 pt-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="text-xl font-black tracking-tight text-text-main sm:text-2xl">
              <a
                href={detailHref}
                className="rounded-control hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {solution.name}
              </a>
            </h2>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-bold ${solution.lifecycle === "AVAILABLE" ? "text-success" : solution.lifecycle === "BETA" ? "text-primary" : "text-text-muted"}`}
            >
              {solution.lifecycle === "AVAILABLE" ? (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              ) : null}
              {solutionLifecycleLabel(t, solution.lifecycle)}
            </span>
          </div>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
            {solution.shortDescription}
          </p>
          <a
            href={detailHref}
            className="mt-3 inline-flex min-h-8 items-center gap-2 rounded-control text-xs font-bold text-primary hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {t("solutions.catalog.learnMore")}{" "}
            <ArrowRight className="h-icon-sm w-icon-sm" aria-hidden="true" />
          </a>
        </div>
      </div>

      <div className="ml-20 sm:ml-24 lg:ml-0">
        <SolutionPreview icon={solution.icon} />
      </div>

      <div className="ml-20 flex flex-col items-stretch sm:ml-24 lg:ml-0 lg:items-end">
        {launch.allowed && launch.href ? (
          <a
            href={launch.href}
            className={`inline-flex min-h-control-touch items-center justify-center gap-2 rounded-control px-4 text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${solution.lifecycle === "AVAILABLE" ? "bg-primary text-white shadow-sm hover:bg-primary-hover" : "border border-primary bg-white text-primary hover:bg-primary-light"}`}
          >
            {launchCopy.actionLabel}
            <ExternalLink className="h-icon-sm w-icon-sm" aria-hidden="true" />
          </a>
        ) : (
          <span
            aria-disabled="true"
            className="inline-flex min-h-control-touch items-center justify-center gap-2 rounded-control border border-border-base bg-bg-subtle px-4 text-xs font-bold text-text-muted"
          >
            {comingSoon ? (
              <Bell className="h-icon-sm w-icon-sm" aria-hidden="true" />
            ) : null}
            {launchCopy.actionLabel}
          </span>
        )}
        {launchCopy.message ? (
          <p className="mt-2 text-center text-micro leading-relaxed text-text-muted lg:max-w-48">
            {launchCopy.message}
          </p>
        ) : null}
      </div>
    </article>
  );
}
