import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Info,
} from "lucide-react";
import { useParams } from "react-router-dom";
import { Button, Container, Skeleton, StatePanel } from "../../design-system";
import { services } from "../../api/client/service-registry";
import { useAuth } from "../../app/providers/AuthProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import {
  presentSolutionLaunch,
  solutionLifecycleLabel,
} from "../../domains/solutions/solutions.presentation";
import { resolveSolutionLaunch } from "../../domains/solutions/solutions.launch";
import type { SolutionDefinition } from "../../domains/solutions/solutions.types";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useTranslation } from "../../i18n/I18nProvider";
import { applicationHref } from "../../platform/applications/use-application-href";
import { getPublicRuntimeConfig } from "../../platform/runtime-config/public-runtime-config";
import { SolutionIcon } from "./SolutionIcon";
import { SolutionPreview } from "./SolutionPreview";

export function SolutionDetailPage() {
  const { t } = useTranslation();
  const { solutionSlug = "" } = useParams();
  const { currentUser } = useAuth();
  const { activeMarket, availableMarkets, currentLocale } = useMarketLocation();
  const [solution, setSolution] = useState<SolutionDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const canonicalUrl = applicationHref("solutions", `/${solutionSlug}`);
  usePageMeta({
    title: solution
      ? t("solutions.detail.metaTitle", { name: solution.name })
      : t("solutions.detail.metaMissingTitle"),
    description:
      solution?.description || t("solutions.detail.metaMissingDescription"),
    canonicalUrl,
    alternateCountries: [],
    noIndex:
      solution?.lifecycle === "MAINTENANCE" ||
      solution?.lifecycle === "DEPRECATED",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setSolution(
        await services.solutions.getSolutionBySlug(solutionSlug, {
          marketCode: activeMarket.code,
          language: currentLocale,
        }),
      );
    } catch {
      setError(t("solutions.detail.loadError"));
    } finally {
      setLoading(false);
    }
  }, [activeMarket.code, currentLocale, solutionSlug, t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <Container className="space-y-6 py-10">
        <Skeleton className="h-8 w-40 rounded" />
        <Skeleton className="h-96 rounded-xl" />
      </Container>
    );
  }
  if (error) {
    return (
      <Container className="py-12">
        <StatePanel
          variant="error"
          title={t("solutions.detail.unavailableTitle")}
          description={error}
          action={
            <Button onClick={() => void load()}>{t("common.retry")}</Button>
          }
        />
      </Container>
    );
  }
  if (!solution) {
    return (
      <Container className="py-12">
        <StatePanel
          variant="notFound"
          title={t("solutions.detail.notFoundTitle")}
          description={t("solutions.detail.notFoundDescription")}
          action={
            <a
              href={applicationHref("solutions")}
              className="inline-flex min-h-control-touch items-center rounded-control bg-primary px-4 text-sm font-bold text-white"
            >
              {t("solutions.header.seeAll")}
            </a>
          }
        />
      </Container>
    );
  }

  const launch = resolveSolutionLaunch({
    solution,
    marketCode: activeMarket.code,
    user: currentUser,
    applications: getPublicRuntimeConfig().applications,
  });
  const lifecycleLabel = solutionLifecycleLabel(t, solution.lifecycle);
  const launchCopy = presentSolutionLaunch(t, solution, launch);
  const latestNote = solution.releaseNotes[0];

  return (
    <div className="bg-white">
      <Container className="py-8 sm:py-10">
        <a
          href={applicationHref("solutions")}
          className="inline-flex min-h-8 items-center gap-2 rounded-control text-xs font-bold text-primary hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <ArrowLeft className="h-icon-sm w-icon-sm" aria-hidden="true" />{" "}
          {t("solutions.detail.backToAll")}
        </a>

        <section className="mt-7 grid items-center gap-9 border-b border-border-base pb-10 lg:grid-cols-2">
          <div className="flex items-start gap-5 sm:gap-8">
            <span className="flex h-20 w-20 shrink-0 items-center justify-center text-text-main sm:h-28 sm:w-28">
              <SolutionIcon
                icon={solution.icon}
                className="h-16 w-16 sm:h-20 sm:w-20"
              />
            </span>
            <div className="min-w-0 pt-2">
              <h1 className="text-3xl font-bold tracking-tight text-text-main sm:text-4xl">
                {solution.name}
              </h1>
              <p
                className={`mt-3 text-sm font-bold ${solution.lifecycle === "AVAILABLE" ? "text-success" : "text-primary"}`}
              >
                {lifecycleLabel}
              </p>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-text-secondary">
                {solution.description}
              </p>
              <div className="mt-7">
                {launch.allowed && launch.href ? (
                  <a
                    href={launch.href}
                    className="inline-flex min-h-control-touch items-center justify-center gap-2 rounded-control bg-primary px-5 text-sm font-bold text-white shadow-sm hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {launchCopy.actionLabel}{" "}
                    <ArrowRight
                      className="h-icon-sm w-icon-sm"
                      aria-hidden="true"
                    />
                  </a>
                ) : (
                  <span
                    aria-disabled="true"
                    className="inline-flex min-h-control-touch items-center rounded-control border border-border-base bg-bg-subtle px-5 text-sm font-bold text-text-muted"
                  >
                    {launchCopy.actionLabel}
                  </span>
                )}
              </div>
              <p className="mt-4 text-xs text-text-secondary">
                {t("solutions.detail.availableIn", {
                  markets: solution.markets
                    .map(
                      (code) =>
                        availableMarkets.find((market) => market.code === code)
                          ?.name || code,
                    )
                    .join(", "),
                })}
              </p>
            </div>
          </div>
          <SolutionPreview icon={solution.icon} variant="detail" />
        </section>

        <section className="grid gap-8 border-b border-border-base py-8 lg:grid-cols-2 lg:divide-x lg:divide-border-base">
          <div>
            <h2 className="text-lg font-bold text-text-main">
              {t("solutions.detail.capabilitiesTitle")}
            </h2>
            <ul className="mt-4 divide-y divide-border-base">
              {solution.capabilities.map((capability) => (
                <li
                  key={capability}
                  className="flex min-h-11 items-center gap-3 py-2 text-sm text-text-secondary"
                >
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />{" "}
                  {capability}
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:pl-8">
            <h2 className="text-lg font-bold text-text-main">
              {t("solutions.detail.accessTitle")}
            </h2>
            <dl className="mt-4 divide-y divide-border-base text-sm">
              {[
                ["solutions.detail.audience", solution.audiences.join(", ")],
                ["solutions.detail.markets", solution.markets.join(", ")],
                ["solutions.detail.languages", solution.languages.join(", ")],
                [
                  "solutions.detail.access",
                  solution.entitlementKey || t("solutions.detail.publicAccess"),
                ],
              ].map(([term, value]) => (
                <div key={term} className="grid min-w-0 grid-cols-2 gap-4 py-3">
                  <dt className="font-medium text-text-secondary">
                    {t(term as Parameters<typeof t>[0])}
                  </dt>
                  <dd className="min-w-0 break-words text-text-main">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {solution.notice || launchCopy.message ? (
          <aside
            className="mt-6 flex gap-4 rounded-xl border border-primary-border bg-primary-light p-5"
            aria-label={t("solutions.detail.informationLabel", {
              status: lifecycleLabel,
            })}
          >
            <Info
              className="h-6 w-6 shrink-0 text-primary"
              aria-hidden="true"
            />
            <div>
              <h2 className="text-sm font-bold text-primary">
                {solution.lifecycle === "BETA"
                  ? t("solutions.detail.betaTitle")
                  : lifecycleLabel}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                {launchCopy.message || solution.notice}
              </p>
            </div>
          </aside>
        ) : null}

        {latestNote ? (
          <div className="flex flex-col gap-3 py-6 text-xs text-text-secondary sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex items-center gap-2">
              <CalendarDays
                className="h-icon-sm w-icon-sm"
                aria-hidden="true"
              />{" "}
              {t("solutions.detail.latestUpdate", {
                date: new Intl.DateTimeFormat(currentLocale, {
                  dateStyle: "long",
                }).format(new Date(latestNote.publishedAt)),
              })}
            </span>
            {solution.documentationUrl ? (
              <a
                href={solution.documentationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-bold text-primary"
              >
                {t("solutions.detail.releaseNotes")}{" "}
                <ExternalLink
                  className="h-icon-sm w-icon-sm"
                  aria-hidden="true"
                />
              </a>
            ) : (
              <span className="inline-flex items-center gap-2 font-bold text-primary">
                {latestNote.title}
              </span>
            )}
          </div>
        ) : null}
      </Container>
    </div>
  );
}
