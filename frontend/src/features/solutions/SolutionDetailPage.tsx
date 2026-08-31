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
import { SOLUTION_LIFECYCLE_PRESENTATION } from "../../domains/solutions/solutions.presentation";
import { resolveSolutionLaunch } from "../../domains/solutions/solutions.launch";
import type { SolutionDefinition } from "../../domains/solutions/solutions.types";
import { usePageMeta } from "../../hooks/usePageMeta";
import { applicationHref } from "../../platform/applications/use-application-href";
import { getPublicRuntimeConfig } from "../../platform/runtime-config/public-runtime-config";
import { SolutionIcon } from "./SolutionIcon";
import { SolutionPreview } from "./SolutionPreview";

export function SolutionDetailPage() {
  const { solutionSlug = "" } = useParams();
  const { currentUser } = useAuth();
  const { activeMarket, currentLocale } = useMarketLocation();
  const [solution, setSolution] = useState<SolutionDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const canonicalUrl = applicationHref("solutions", `/${solutionSlug}`);
  usePageMeta({
    title: solution
      ? `${solution.name} — Shongre Solutions`
      : "Solution introuvable — Shongre",
    description:
      solution?.description || "Cette solution Shongre n’est pas disponible.",
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
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Chargement impossible.",
      );
    } finally {
      setLoading(false);
    }
  }, [activeMarket.code, currentLocale, solutionSlug]);

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
          title="Solution indisponible"
          description={error}
          action={<Button onClick={() => void load()}>Réessayer</Button>}
        />
      </Container>
    );
  }
  if (!solution) {
    return (
      <Container className="py-12">
        <StatePanel
          variant="notFound"
          title="Solution introuvable"
          description="Cette adresse ne correspond à aucune solution publique du catalogue."
          action={
            <a
              href={applicationHref("solutions")}
              className="inline-flex min-h-control-touch items-center rounded-control bg-primary px-4 text-sm font-bold text-white"
            >
              Voir toutes les solutions
            </a>
          }
        />
      </Container>
    );
  }

  const lifecycle = SOLUTION_LIFECYCLE_PRESENTATION[solution.lifecycle];
  const launch = resolveSolutionLaunch({
    solution,
    marketCode: activeMarket.code,
    user: currentUser,
    applications: getPublicRuntimeConfig().applications,
  });
  const latestNote = solution.releaseNotes[0];

  return (
    <div className="bg-white">
      <Container className="py-8 sm:py-10">
        <a
          href={applicationHref("solutions")}
          className="inline-flex min-h-8 items-center gap-2 rounded-control text-xs font-bold text-primary hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <ArrowLeft className="h-icon-sm w-icon-sm" aria-hidden="true" />{" "}
          Toutes les solutions
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
              <h1 className="text-3xl font-black tracking-tight text-text-main sm:text-4xl">
                {solution.name}
              </h1>
              <p
                className={`mt-3 text-sm font-bold ${solution.lifecycle === "AVAILABLE" ? "text-success" : "text-primary"}`}
              >
                {lifecycle.label}
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
                    {launch.actionLabel}{" "}
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
                    {launch.actionLabel}
                  </span>
                )}
              </div>
              <p className="mt-4 text-xs text-text-secondary">
                Disponible en{" "}
                {solution.markets
                  .map(
                    (code) =>
                      ({ FR: "France", BE: "Belgique", LU: "Luxembourg" })[
                        code
                      ] || code,
                  )
                  .join(", ")}
              </p>
            </div>
          </div>
          <SolutionPreview icon={solution.icon} variant="detail" />
        </section>

        <section className="grid gap-8 border-b border-border-base py-8 lg:grid-cols-2 lg:divide-x lg:divide-border-base">
          <div>
            <h2 className="text-lg font-black text-text-main">
              Ce que vous pouvez faire
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
            <h2 className="text-lg font-black text-text-main">
              Accès et disponibilité
            </h2>
            <dl className="mt-4 divide-y divide-border-base text-sm">
              {[
                ["Audience", solution.audiences.join(", ")],
                ["Marchés", solution.markets.join(", ")],
                ["Langues", solution.languages.join(", ")],
                ["Accès", solution.entitlementKey || "Accès public"],
              ].map(([term, value]) => (
                <div key={term} className="grid min-w-0 grid-cols-2 gap-4 py-3">
                  <dt className="font-medium text-text-secondary">{term}</dt>
                  <dd className="min-w-0 break-words text-text-main">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {solution.notice || launch.message ? (
          <aside
            className="mt-6 flex gap-4 rounded-xl border border-primary-border bg-primary-light p-5"
            aria-label={`Information ${lifecycle.label}`}
          >
            <Info
              className="h-6 w-6 shrink-0 text-primary"
              aria-hidden="true"
            />
            <div>
              <h2 className="text-sm font-black text-primary">
                {solution.lifecycle === "BETA"
                  ? "Version bêta"
                  : lifecycle.label}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                {launch.message || solution.notice}
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
              Dernière mise à jour —{" "}
              {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(
                new Date(latestNote.publishedAt),
              )}
            </span>
            {solution.documentationUrl ? (
              <a
                href={solution.documentationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-bold text-primary"
              >
                Consulter les notes de version{" "}
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
