import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
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
  solutionAccessLabel,
  solutionLanguageNames,
  solutionLifecycleLabel,
  solutionMarketNames,
} from "../../domains/solutions/solutions.presentation";
import { resolveSolutionLaunch } from "../../domains/solutions/solutions.launch";
import type { SolutionDefinition } from "../../domains/solutions/solutions.types";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useTranslation } from "../../i18n/I18nProvider";
import { applicationHref } from "../../platform/applications/use-application-href";
import { getPublicRuntimeConfig } from "../../platform/runtime-config/public-runtime-config";
import { SolutionIcon } from "./SolutionIcon";
import { SolutionPreview } from "./SolutionPreview";
import { SolutionStatusBadge } from "./SolutionStatusBadge";
import { useSolutionsMarket } from "./useSolutionsMarket";

export function SolutionDetailPage() {
  const { t } = useTranslation();
  const { solutionSlug = "" } = useParams();
  const { currentUser } = useAuth();
  const { availableMarkets, currentLocale } = useMarketLocation();
  const { marketCode } = useSolutionsMarket();
  const [solution, setSolution] = useState<SolutionDefinition | null>(null);
  const [siblings, setSiblings] = useState<SolutionDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const catalogHref = applicationHref("solutions");
  const canonicalUrl = applicationHref("solutions", `/${solutionSlug}`);
  /**
   * The share image lives on the Solutions origin at a fixed server route, so
   * it is built from that origin rather than through `applicationHref` — which
   * prefixes the SPA mount path (`/solutions/...`) whenever the application
   * shares the marketplace origin, and would emit a relative `og:image` that
   * no crawler can resolve. The server renders the same absolute URL in
   * `generateMetadata`; this keeps the client pass from overwriting it.
   */
  const solutionsOrigin = /^https?:\/\//.test(catalogHref)
    ? new URL(catalogHref).origin
    : typeof window !== "undefined"
      ? window.location.origin
      : "";
  const shareImage = solutionsOrigin
    ? `${solutionsOrigin}/og/solutions/${solutionSlug}`
    : undefined;

  usePageMeta({
    title: solution
      ? t("solutions.detail.metaTitle", { name: solution.name })
      : t("solutions.detail.metaMissingTitle"),
    description:
      solution?.description || t("solutions.detail.metaMissingDescription"),
    canonicalUrl,
    image: solution && shareImage ? shareImage : undefined,
    type: "product",
    alternateCountries: [],
    noIndex:
      solution?.lifecycle === "MAINTENANCE" ||
      solution?.lifecycle === "DEPRECATED",
    // A product page that renders as a bare text card in every share, and as an
    // unlabelled result in search, was leaving the catalogue's whole reason for
    // existing on the table.
    structuredData: solution
      ? [
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: solution.name,
            description: solution.description,
            url: canonicalUrl,
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            ...(shareImage ? { image: shareImage } : {}),
            inLanguage: solution.languages,
            featureList: solution.capabilities,
            audience: solution.audiences.map((audience) => ({
              "@type": "Audience",
              audienceType: audience,
            })),
            areaServed: solution.markets.map((code) => ({
              "@type": "Country",
              identifier: code,
            })),
            provider: { "@type": "Organization", name: "SHONGRE." },
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: t("solutions.header.solutions"),
                item: catalogHref,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: solution.name,
                item: canonicalUrl,
              },
            ],
          },
        ]
      : [],
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setSolution(
        await services.solutions.getSolutionBySlug(solutionSlug, {
          marketCode,
          language: currentLocale,
        }),
      );
    } catch {
      setError(t("solutions.detail.loadError"));
    } finally {
      setLoading(false);
    }
  }, [currentLocale, marketCode, solutionSlug, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    void services.solutions
      .listPublicSolutions({ marketCode, language: currentLocale })
      .then((values) => {
        if (!cancelled) setSiblings(values);
      })
      .catch(() => {
        if (!cancelled) setSiblings([]);
      });
    return () => {
      cancelled = true;
    };
  }, [currentLocale, marketCode]);

  const related = useMemo(
    () => siblings.filter((value) => value.slug !== solutionSlug).slice(0, 3),
    [siblings, solutionSlug],
  );

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
              href={catalogHref}
              className="inline-flex min-h-control-touch items-center rounded-control bg-primary px-4 text-sm font-bold text-on-primary"
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
    marketCode,
    user: currentUser,
    applications: getPublicRuntimeConfig().applications,
  });
  const lifecycleLabel = solutionLifecycleLabel(t, solution.lifecycle);
  const launchCopy = presentSolutionLaunch(t, solution, launch);
  const latestNote = solution.releaseNotes[0];
  const marketNames = solutionMarketNames(
    solution.markets,
    (code) => availableMarkets.find((market) => market.code === code)?.name,
  );
  const languageNames = solutionLanguageNames(
    solution.languages,
    currentLocale,
  );

  const launchAction = (label: string) =>
    launch.allowed && launch.href ? (
      <a
        href={launch.href}
        className="inline-flex min-h-control-touch items-center justify-center gap-2 rounded-control bg-primary px-5 text-sm font-bold text-on-primary shadow-sm hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {label}{" "}
        <ArrowRight className="h-icon-sm w-icon-sm" aria-hidden="true" />
      </a>
    ) : (
      <span
        aria-disabled="true"
        className="inline-flex min-h-control-touch items-center rounded-control border border-border-base bg-bg-subtle px-5 text-sm font-bold text-text-muted"
      >
        {label}
      </span>
    );

  return (
    <div className="bg-bg-surface">
      <Container className="py-8 sm:py-10">
        {/* A real trail, not a lone back arrow: it names where "here" sits and
            matches the BreadcrumbList crawlers are now given. */}
        <nav aria-label={t("solutions.detail.breadcrumbLabel")}>
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
            <li>
              <a
                href={catalogHref}
                className="inline-flex min-h-8 items-center rounded-control font-bold text-primary hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {t("solutions.header.solutions")}
              </a>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-icon-xs w-icon-xs" />
            </li>
            <li aria-current="page" className="font-semibold text-text-main">
              {solution.name}
            </li>
          </ol>
        </nav>

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
              <div className="mt-3">
                <SolutionStatusBadge lifecycle={solution.lifecycle} size="md" />
              </div>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-text-secondary">
                {solution.description}
              </p>
              <div className="mt-7">{launchAction(launchCopy.actionLabel)}</div>
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
            {/* Every value here is now the form a reader recognises. The table
                used to print `FR, BE, CH` a few centimetres under "Disponible
                en France, Belgique, Suisse", `fr-FR, fr-BE, fr-CH` for one
                language, and the raw `entitlementKey` under "Accès". */}
            <dl className="mt-4 divide-y divide-border-base text-sm">
              {[
                ["solutions.detail.audience", solution.audiences.join(", ")],
                ["solutions.detail.markets", marketNames.join(", ")],
                ["solutions.detail.languages", languageNames.join(", ")],
                ["solutions.detail.access", solutionAccessLabel(t, solution)],
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
                className="inline-flex min-h-8 items-center gap-2 rounded-control font-bold text-primary hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {t("solutions.detail.releaseNotes")}{" "}
                <ExternalLink
                  className="h-icon-sm w-icon-sm"
                  aria-hidden="true"
                />
              </a>
            ) : (
              // Not a link, so it no longer dresses as one. This branch kept
              // `font-bold text-primary` and sat in the anchor's slot, which
              // made the note title look clickable on every solution that ships
              // without a documentation URL — which is all of them.
              <span className="text-text-secondary">{latestNote.title}</span>
            )}
          </div>
        ) : null}
      </Container>

      {/* The page used to stop on the date line: no second action, no way on.
          A reader who got this far had nowhere to go but the back button. */}
      <section
        aria-labelledby="solution-next-title"
        className="border-t border-border-base bg-bg-subtle py-10"
      >
        <Container>
          <div className="flex flex-col gap-5 border-b border-border-base pb-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2
                id="solution-next-title"
                className="text-xl font-bold tracking-tight text-text-main"
              >
                {t("solutions.detail.nextTitle", { name: solution.name })}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary">
                {t("solutions.detail.availableIn", {
                  markets: marketNames.join(", "),
                })}
              </p>
            </div>
            {launchAction(launchCopy.actionLabel)}
          </div>

          {related.length ? (
            <div className="pt-7">
              <h3 className="text-sm font-bold text-text-main">
                {t("solutions.detail.relatedTitle")}
              </h3>
              <ul className="mt-4 grid gap-0 sm:grid-cols-3 sm:divide-x sm:divide-border-base">
                {related.map((item) => (
                  <li
                    key={item.id}
                    className="group relative border-t border-border-base py-4 first:border-t-0 sm:border-t-0 sm:px-5 sm:py-0 sm:first:pl-0 sm:last:pr-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-primary-light text-primary">
                        <SolutionIcon
                          icon={item.icon}
                          className="h-icon-md w-icon-md"
                        />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-text-main">
                          <a
                            href={applicationHref("solutions", `/${item.slug}`)}
                            className="rounded-control stretched-link group-hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                          >
                            {item.name}
                          </a>
                        </p>
                        <SolutionStatusBadge
                          lifecycle={item.lifecycle}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-text-secondary">
                      {item.shortDescription}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Container>
      </section>
    </div>
  );
}
