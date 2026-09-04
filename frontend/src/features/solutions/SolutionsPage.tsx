import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Grid2X2, Globe2, Puzzle, ShieldCheck, Users } from "lucide-react";
import { Button, Container, Skeleton, StatePanel } from "../../design-system";
import { services } from "../../api/client/service-registry";
import type { SolutionDefinition } from "../../domains/solutions/solutions.types";
import { useAuth } from "../../app/providers/AuthProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useTranslation } from "../../i18n/I18nProvider";
import type { MessageKey } from "../../i18n/messages.fr";
import { applicationHref } from "../../platform/applications/use-application-href";
import { SolutionCatalogRow } from "./SolutionCatalogRow";
import { useSolutionsMarket } from "./useSolutionsMarket";

const ecosystem = [
  {
    icon: ShieldCheck,
    titleKey: "solutions.catalog.securityTitle",
    bodyKey: "solutions.catalog.securityDescription",
  },
  {
    icon: Users,
    titleKey: "solutions.catalog.collaborationTitle",
    bodyKey: "solutions.catalog.collaborationDescription",
  },
  {
    icon: Puzzle,
    titleKey: "solutions.catalog.evolutionTitle",
    bodyKey: "solutions.catalog.evolutionDescription",
  },
] as const satisfies readonly {
  icon: typeof ShieldCheck;
  titleKey: MessageKey;
  bodyKey: MessageKey;
}[];

/** Matches the rendered row height closely enough that the swap does not jump. */
const ROW_SKELETON_HEIGHT = "h-52 lg:h-56";
const DEFAULT_SKELETON_ROWS = 4;

export function SolutionsPage() {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { activeMarket, availableMarkets, currentLocale } = useMarketLocation();
  const { marketCode, setMarketCode } = useSolutionsMarket();
  const [solutions, setSolutions] = useState<SolutionDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  /**
   * The first catalogue that came back, kept so the market selector can say how
   * many solutions each market holds. Every solution carries its own `markets`
   * array, so one payload answers the question for all of them — no extra
   * request, and no guessing before the reader commits to a choice.
   */
  const [coverageSample, setCoverageSample] = useState<SolutionDefinition[]>(
    [],
  );

  usePageMeta({
    title: t("solutions.catalog.metaTitle"),
    description: t("solutions.catalog.metaDescription"),
    canonicalUrl: applicationHref("solutions"),
    alternateCountries: [],
    structuredData: solutions.length
      ? [
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: t("solutions.catalog.title"),
            itemListElement: solutions.map((solution, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: solution.name,
              description: solution.shortDescription,
              url: applicationHref("solutions", `/${solution.slug}`),
            })),
          },
        ]
      : [],
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const values = await services.solutions.listPublicSolutions({
        marketCode,
        language: currentLocale,
      });
      setSolutions(values);
      // Only the first non-empty answer seeds the coverage map; a later empty
      // market must not erase what we already know about the others.
      setCoverageSample((current) =>
        current.length === 0 && values.length > 0 ? values : current,
      );
    } catch {
      setError(t("solutions.catalog.errorDescription"));
    } finally {
      setLoading(false);
    }
  }, [currentLocale, marketCode, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const solutionsPerMarket = useMemo(() => {
    if (coverageSample.length === 0) return null;
    const counts: Record<string, number> = {};
    for (const market of availableMarkets) {
      counts[market.code] = coverageSample.filter((solution) =>
        solution.markets.includes(market.code),
      ).length;
    }
    return counts;
  }, [availableMarkets, coverageSample]);

  const coveredMarketNames = useMemo(
    () =>
      availableMarkets
        .filter((market) => (solutionsPerMarket?.[market.code] ?? 0) > 0)
        .map((market) => market.name),
    [availableMarkets, solutionsPerMarket],
  );

  /**
   * Keeps the catalogue from collapsing between the skeleton and the rows. The
   * skeleton block unmounted a frame before the rows mounted, so the section
   * dropped from 544px to zero and back to 821px — a visible flash on top of a
   * shift. Holding the tallest height it has reached absorbs the swap.
   */
  const catalogRef = useRef<HTMLDivElement>(null);
  const [reservedHeight, setReservedHeight] = useState(0);
  useEffect(() => {
    const measured = catalogRef.current?.getBoundingClientRect().height ?? 0;
    if (measured > 0)
      setReservedHeight((current) => Math.max(current, measured));
  }, [loading, solutions]);

  const skeletonRows = Math.max(
    solutions.length || coverageSample.length,
    DEFAULT_SKELETON_ROWS,
  );

  return (
    <div className="overflow-hidden bg-white">
      <section className="border-b border-border-base py-10">
        <Container>
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold leading-none tracking-tight text-text-main sm:text-5xl lg:text-6xl">
              {t("solutions.catalog.heroTitle")}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-text-secondary">
              {t("solutions.catalog.heroDescription")}
            </p>
          </div>
          <div className="mt-7 inline-grid min-h-control-touch grid-cols-2 divide-x divide-border-base overflow-hidden rounded-control border border-border-base bg-white text-sm font-semibold text-text-main">
            <span className="flex items-center gap-2 px-4">
              <Grid2X2 className="h-icon-sm w-icon-sm" aria-hidden="true" />
              {/* An unresolved catalogue is unknown, not empty. Counting `[]`
                  told every visitor "0 solution" for the whole load. */}
              {loading
                ? t("solutions.catalog.countPending")
                : t("solutions.catalog.count", { count: solutions.length })}
            </span>
            <label className="flex items-center gap-2 px-4">
              <Globe2 className="h-icon-sm w-icon-sm" aria-hidden="true" />
              <span className="sr-only">
                {t("solutions.catalog.marketLabel")}
              </span>
              <select
                value={marketCode}
                onChange={(event) => setMarketCode(event.target.value)}
                className="min-h-control-md bg-transparent text-sm font-semibold focus-visible:outline-2 focus-visible:outline-primary"
              >
                {availableMarkets.map((market) => (
                  <option key={market.code} value={market.code}>
                    {/* Half the markets hold nothing. Saying so in the option
                        turns a dead end into a choice made with information. */}
                    {solutionsPerMarket
                      ? `${market.name} (${solutionsPerMarket[market.code] ?? 0})`
                      : market.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </Container>
      </section>

      <section
        id="catalogue"
        aria-labelledby="catalogue-title"
        className="scroll-mt-20 bg-white"
      >
        <Container className="py-2 sm:py-4">
          <h2 id="catalogue-title" className="sr-only">
            {t("solutions.catalog.title")}
          </h2>
          <div
            ref={catalogRef}
            style={
              reservedHeight ? { minHeight: `${reservedHeight}px` } : undefined
            }
          >
            {loading ? (
              <div
                className="space-y-4 py-6"
                aria-busy="true"
                aria-label={t("solutions.catalog.loading")}
              >
                {Array.from({ length: skeletonRows }, (_, index) => (
                  <Skeleton
                    key={index}
                    className={`${ROW_SKELETON_HEIGHT} rounded-xl`}
                  />
                ))}
              </div>
            ) : error ? (
              <StatePanel
                variant="error"
                title={t("solutions.catalog.errorTitle")}
                description={error}
                action={
                  <Button onClick={() => void load()}>
                    {t("common.retry")}
                  </Button>
                }
              />
            ) : solutions.length === 0 ? (
              <StatePanel
                variant="notFound"
                title={t("solutions.catalog.emptyTitle")}
                description={
                  coveredMarketNames.length
                    ? t("solutions.catalog.emptyAvailableIn", {
                        markets: coveredMarketNames.join(", "),
                      })
                    : t("solutions.catalog.emptyDescription")
                }
                action={
                  // An empty market used to be a dead end: a title, a sentence
                  // and no way back except finding the selector again.
                  marketCode === activeMarket.code ? undefined : (
                    <Button onClick={() => setMarketCode(activeMarket.code)}>
                      {t("solutions.catalog.emptyReset", {
                        market: activeMarket.name,
                      })}
                    </Button>
                  )
                }
              />
            ) : (
              solutions.map((solution) => (
                <SolutionCatalogRow
                  key={solution.id}
                  solution={solution}
                  marketCode={marketCode}
                  user={currentUser}
                />
              ))
            )}
          </div>
        </Container>
      </section>

      <section
        id="ecosysteme"
        aria-labelledby="ecosystem-title"
        className="scroll-mt-20 border-t border-border-base bg-bg-subtle py-10 sm:py-12"
      >
        <Container className="grid gap-8 lg:grid-cols-3 lg:items-start">
          <h2
            id="ecosystem-title"
            className="text-3xl font-bold leading-tight tracking-tight text-text-main"
          >
            {t("solutions.catalog.ecosystemTitle")}
          </h2>
          <div className="grid gap-0 sm:grid-cols-3 sm:divide-x sm:divide-border-base lg:col-span-2">
            {ecosystem.map(({ icon: Icon, titleKey, bodyKey }) => (
              <article
                key={titleKey}
                className="flex gap-4 border-t border-border-base py-5 first:border-t-0 sm:border-t-0 sm:px-6 sm:py-0 sm:first:pl-0 sm:last:pr-0"
              >
                <Icon
                  className="h-7 w-7 shrink-0 text-text-main"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <div>
                  <h3 className="text-sm font-bold text-text-main">
                    {t(titleKey)}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                    {t(bodyKey)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>
    </div>
  );
}
