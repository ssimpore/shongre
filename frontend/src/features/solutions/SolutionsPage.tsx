import { useCallback, useEffect, useState } from "react";
import { Grid2X2, Globe2, Puzzle, ShieldCheck, Users } from "lucide-react";
import { Button, Container, Skeleton, StatePanel } from "../../design-system";
import { services } from "../../api/client/service-registry";
import type { SolutionDefinition } from "../../domains/solutions/solutions.types";
import { useAuth } from "../../app/providers/AuthProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { usePageMeta } from "../../hooks/usePageMeta";
import { applicationHref } from "../../platform/applications/use-application-href";
import { SolutionCatalogRow } from "./SolutionCatalogRow";

const ecosystem = [
  {
    icon: ShieldCheck,
    title: "Sécurité et contrôle",
    body: "Vos données sont protégées et vos accès maîtrisés.",
  },
  {
    icon: Users,
    title: "Travail collaboratif",
    body: "Invitez vos équipes et partagez les espaces de travail.",
  },
  {
    icon: Puzzle,
    title: "Des solutions qui évoluent",
    body: "De nouvelles fonctionnalités rejoignent le même socle Shongre.",
  },
] as const;

export function SolutionsPage() {
  const { currentUser } = useAuth();
  const { activeMarket, availableMarkets, currentLocale } = useMarketLocation();
  const [marketCode, setMarketCode] = useState(activeMarket.code);
  const [solutions, setSolutions] = useState<SolutionDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  usePageMeta({
    title: "Shongre Solutions — Toutes vos applications professionnelles",
    description:
      "Activez les solutions utiles à votre organisation et retrouvez chaque espace de travail avec un seul compte Shongre.",
    canonicalUrl: applicationHref("solutions"),
    alternateCountries: [],
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setSolutions(
        await services.solutions.listPublicSolutions({
          marketCode,
          language: currentLocale,
        }),
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Le catalogue n’a pas pu être chargé.",
      );
    } finally {
      setLoading(false);
    }
  }, [currentLocale, marketCode]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="overflow-hidden bg-white">
      <section className="border-b border-border-base py-10">
        <Container>
          <div className="max-w-3xl">
            <h1 className="text-4xl font-black leading-none tracking-tight text-text-main sm:text-5xl lg:text-6xl">
              Les outils Shongre,
              <br /> réunis au même endroit.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-text-secondary sm:text-lg">
              Activez les solutions utiles à votre organisation et retrouvez
              chaque espace de travail sans multiplier les comptes.
            </p>
          </div>
          <div className="mt-7 inline-grid min-h-control-touch grid-cols-2 divide-x divide-border-base overflow-hidden rounded-control border border-border-base bg-white text-sm font-semibold text-text-main">
            <span className="flex items-center gap-2 px-4">
              <Grid2X2 className="h-icon-sm w-icon-sm" aria-hidden="true" />
              {solutions.length || 3} solutions
            </span>
            <label className="flex items-center gap-2 px-4">
              <Globe2 className="h-icon-sm w-icon-sm" aria-hidden="true" />
              <span className="sr-only">Marché du catalogue</span>
              <select
                value={marketCode}
                onChange={(event) => setMarketCode(event.target.value)}
                className="min-h-control-md bg-transparent text-sm font-semibold focus-visible:outline-2 focus-visible:outline-primary"
              >
                {availableMarkets
                  .filter((market) => ["FR", "BE", "LU"].includes(market.code))
                  .map((market) => (
                    <option key={market.code} value={market.code}>
                      {market.name}
                    </option>
                  ))}
              </select>
            </label>
          </div>
        </Container>
      </section>

      <section id="catalogue" aria-labelledby="catalogue-title" className="scroll-mt-20 bg-white">
        <Container className="py-2 sm:py-4">
          <h2 id="catalogue-title" className="sr-only">Catalogue des solutions Shongre</h2>
          {loading ? (
            <div className="space-y-4 py-6" aria-label="Chargement du catalogue">
              {[0, 1, 2].map((item) => <Skeleton key={item} className="h-36 rounded-xl" />)}
            </div>
          ) : error ? (
            <StatePanel
              variant="error"
              title="Catalogue indisponible"
              description={error}
              action={<Button onClick={() => void load()}>Réessayer</Button>}
            />
          ) : solutions.length === 0 ? (
            <StatePanel
              variant="notFound"
              title="Aucune solution pour ce marché"
              description="Le catalogue s’enrichit progressivement selon les pays et les langues disponibles."
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
        </Container>
      </section>

      <section id="ecosysteme" aria-labelledby="ecosystem-title" className="scroll-mt-20 border-t border-border-base bg-bg-subtle py-10 sm:py-12">
        <Container className="grid gap-8 lg:grid-cols-3 lg:items-start">
          <h2 id="ecosystem-title" className="text-3xl font-black leading-tight tracking-tight text-text-main">
            Un compte. Une organisation. Plusieurs solutions.
          </h2>
          <div className="grid gap-0 sm:grid-cols-3 sm:divide-x sm:divide-border-base lg:col-span-2">
            {ecosystem.map(({ icon: Icon, title, body }) => (
              <article key={title} className="flex gap-4 border-t border-border-base py-5 first:border-t-0 sm:border-t-0 sm:px-6 sm:py-0 sm:first:pl-0 sm:last:pr-0">
                <Icon className="h-7 w-7 shrink-0 text-text-main" strokeWidth={1.75} aria-hidden="true" />
                <div>
                  <h3 className="text-sm font-black text-text-main">{title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary">{body}</p>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>
    </div>
  );
}
