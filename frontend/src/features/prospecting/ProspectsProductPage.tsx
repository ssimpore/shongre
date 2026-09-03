import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Ban,
  Building2,
  Check,
  ChevronRight,
  Database,
  FileCheck2,
  ListChecks,
  MailCheck,
  Search,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";
import { Container } from "../../design-system";
import { useAuth } from "../../app/providers/AuthProvider";
import { routes } from "../../configuration/routes";
import { usePageMeta } from "../../hooks/usePageMeta";
import { ProspectsLandingPreview } from "./components/ProspectsLandingPreview";
import { applicationHref } from "../../platform/applications/use-application-href";

const primaryCtaClass =
  "inline-flex min-h-control-lg items-center justify-center gap-2 rounded-control bg-primary px-5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

const secondaryCtaClass =
  "inline-flex min-h-control-lg items-center justify-center gap-2 rounded-control border border-primary bg-bg-surface px-5 text-sm font-bold text-primary transition-colors hover:bg-primary-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

const trustPoints = [
  [ShieldCheck, "Sources autorisées"],
  [BarChart3, "Score expliqué"],
  [FileCheck2, "Doublons signalés"],
  [Users, "Validation humaine"],
] as const;

const workflowSteps = [
  {
    number: "01",
    icon: Target,
    title: "Cibler",
    description:
      "Définissez les marchés, secteurs, signaux et exclusions de votre profil idéal.",
  },
  {
    number: "02",
    icon: Search,
    title: "Découvrir",
    description:
      "Obtenez des entreprises pertinentes à partir de sources autorisées.",
  },
  {
    number: "03",
    icon: FileCheck2,
    title: "Qualifier",
    description:
      "Comprenez le score, les faits connus et les informations manquantes.",
  },
  {
    number: "04",
    icon: MailCheck,
    title: "Activer",
    description:
      "Ajoutez le prospect à une liste ou transmettez-le à votre équipe.",
  },
] as const;

const proofRows = [
  [FileCheck2, "Preuves reliées au score"],
  [ShieldCheck, "Limites clairement indiquées"],
  [Users, "Décision humaine conservée"],
] as const;

const activationSteps = [
  [ListChecks, "Liste ciblée"],
  [Users, "CRM partagé"],
  [MailCheck, "Campagne contrôlée"],
  [BarChart3, "Suivi d’équipe"],
] as const;

export function ProspectsProductPage() {
  const { currentUser } = useAuth();

  usePageMeta({
    title: "Shongre Prospects — Trouvez et qualifiez vos prospects B2B",
    description:
      "Transformez un profil cible en entreprises qualifiées avec score explicable, preuves sourcées et validation humaine.",
    canonicalUrl: applicationHref("prospects"),
    alternateCountries: [],
  });

  const workspaceDestination = currentUser
    ? applicationHref("prospects", "/app")
    : applicationHref(
        "marketplace",
        routes.auth.registerProfessional(routes.prospects.workspace()),
      );
  const workspaceCtaLabel = currentUser
    ? "Ouvrir Shongre Prospects"
    : "Créer mon espace Prospects";

  return (
    <div className="overflow-hidden bg-bg-surface pb-14">
      <section className="border-b border-border-base bg-bg-surface py-8 sm:py-14 lg:py-16">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
            <div className="max-w-xl">
              <h1 className="text-3xl font-bold leading-none tracking-tight text-text-main sm:text-5xl">
                Trouvez les bonnes entreprises. Comprenez pourquoi.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-text-secondary sm:text-lg">
                Shongre Prospects transforme un profil cible en entreprises
                qualifiées, avec score explicable, preuves sourcées et
                validation humaine avant chaque action.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link to={workspaceDestination} className={primaryCtaClass}>
                  {workspaceCtaLabel}
                  <ArrowRight
                    className="h-icon-sm w-icon-sm"
                    aria-hidden="true"
                  />
                </Link>
                <a href="#parcours" className={secondaryCtaClass}>
                  Découvrir le parcours
                </a>
              </div>
              <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-text-secondary">
                <ShieldCheck
                  className="mt-0.5 h-icon-sm w-icon-sm shrink-0 text-success"
                  aria-hidden="true"
                />
                Données locales déterministes · Aucun fournisseur externe
                contacté
              </p>
            </div>

            <ProspectsLandingPreview
              workspaceDestination={workspaceDestination}
            />
          </div>
        </Container>
      </section>

      <section
        aria-labelledby="prospects-trust"
        className="border-b border-border-base bg-bg-surface"
      >
        <Container>
          <h2 id="prospects-trust" className="sr-only">
            Garanties de la démonstration
          </h2>
          <div className="grid grid-cols-2 divide-x divide-y divide-border-base sm:grid-cols-4 sm:divide-y-0">
            {trustPoints.map(([Icon, label]) => (
              <div
                key={label}
                className="flex min-h-20 items-center gap-3 px-3 py-4 sm:justify-center sm:px-5"
              >
                <Icon
                  className="h-5 w-5 shrink-0 text-text-main"
                  aria-hidden="true"
                />
                <span className="text-xs font-bold text-text-main sm:text-sm">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section
        id="parcours"
        aria-labelledby="prospects-workflow"
        className="scroll-mt-24 bg-bg-surface py-12 sm:py-16"
      >
        <Container>
          <h2
            id="prospects-workflow"
            className="text-2xl font-bold tracking-tight text-text-main sm:text-3xl"
          >
            De votre cible à une action vérifiable.
          </h2>
          <div className="relative mt-8 grid gap-0 md:grid-cols-4 md:gap-6">
            <div
              className="absolute bottom-8 left-4 top-4 w-px bg-primary-border md:bottom-auto md:left-4 md:right-4 md:top-4 md:h-px md:w-auto"
              aria-hidden="true"
            />
            {workflowSteps.map(({ number, icon: Icon, title, description }) => (
              <article
                key={number}
                className="relative flex gap-4 pb-8 md:block md:pb-0"
              >
                <span className="z-raised relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-micro font-bold text-white shadow-sm">
                  {number}
                </span>
                <div className="md:mt-6">
                  <Icon
                    className="hidden h-6 w-6 text-primary md:block"
                    aria-hidden="true"
                  />
                  <h3 className="text-sm font-bold text-text-main md:mt-3">
                    {title}
                  </h3>
                  <p className="mt-1 max-w-xs text-xs leading-relaxed text-text-muted">
                    {description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section
        aria-labelledby="prospects-proof"
        className="border-y border-border-base bg-bg-base py-12 sm:py-16"
      >
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-commission-content-aside lg:gap-14">
            <ProspectsLandingPreview
              workspaceDestination={workspaceDestination}
              variant="dossier"
            />
            <div>
              <h2
                id="prospects-proof"
                className="text-3xl font-bold tracking-tight text-text-main sm:text-4xl"
              >
                Chaque score vient avec son dossier.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-text-secondary">
                Les faits connus, les informations manquantes et la provenance
                restent visibles avant toute décision.
              </p>
              <div className="mt-7 divide-y divide-border-base border-y border-border-base">
                {proofRows.map(([Icon, label]) => (
                  <div
                    key={label}
                    className="flex min-h-16 items-center gap-3 py-3"
                  >
                    <Icon
                      className="h-5 w-5 shrink-0 text-text-main"
                      aria-hidden="true"
                    />
                    <span className="flex-1 text-sm font-bold text-text-main">
                      {label}
                    </span>
                    <ChevronRight
                      className="h-icon-sm w-icon-sm text-text-muted"
                      aria-hidden="true"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section
        aria-labelledby="prospects-activation"
        className="bg-bg-surface py-12 sm:py-16"
      >
        <Container>
          <h2
            id="prospects-activation"
            className="mx-auto max-w-3xl text-center text-2xl font-bold tracking-tight text-text-main sm:text-3xl"
          >
            Continuez dans les outils que votre équipe utilise déjà.
          </h2>
          <div className="mx-auto mt-9 grid max-w-4xl grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-4">
            {activationSteps.map(([Icon, label], index) => (
              <div
                key={label}
                className="relative flex flex-col items-center text-center"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full border border-border-base bg-bg-surface text-text-main shadow-xs">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <span className="mt-3 text-xs font-bold text-text-main">
                  {label}
                </span>
                {index < activationSteps.length - 1 && (
                  <ArrowRight
                    className="absolute -right-3 top-5 hidden h-5 w-5 text-text-disabled sm:block"
                    aria-hidden="true"
                  />
                )}
              </div>
            ))}
          </div>
          <p className="mx-auto mt-7 max-w-2xl text-center text-xs leading-relaxed text-text-muted">
            Shongre Prospects prépare l’action ; les modules CRM et Marketing
            gardent leur rôle.
          </p>
        </Container>
      </section>

      <section
        aria-labelledby="prospects-packaging"
        className="border-y border-border-base bg-bg-surface py-12 sm:py-16"
      >
        <Container>
          <h2
            id="prospects-packaging"
            className="text-center text-2xl font-bold tracking-tight text-text-main sm:text-3xl"
          >
            Une même base, deux portes d’entrée.
          </h2>
          <div className="mx-auto mt-9 max-w-4xl divide-y divide-border-base md:grid md:grid-cols-2 md:divide-x md:divide-y-0">
            <article className="py-7 md:py-2 md:pr-12">
              <Target className="h-7 w-7 text-primary" aria-hidden="true" />
              <h3 className="mt-4 text-xl font-bold text-text-main">
                Shongre Prospects
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                Pour les équipes qui veulent un espace de prospection autonome.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-text-secondary">
                {[
                  "Profil cible multi-marché",
                  "Découverte et briefs",
                  "Listes et usage",
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <Check
                      className="mt-0.5 h-icon-sm w-icon-sm shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                to={workspaceDestination}
                className={`${secondaryCtaClass} mt-6 w-full sm:w-auto`}
              >
                {workspaceCtaLabel}
              </Link>
            </article>
            <article className="py-7 md:py-2 md:pl-12">
              <Building2 className="h-7 w-7 text-primary" aria-hidden="true" />
              <h3 className="mt-4 text-xl font-bold text-text-main">
                Inclus dans Shongre Pro
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                Pour les professionnels qui veulent réunir acquisition et
                activité marketplace.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-text-secondary">
                {[
                  "Même organisation et permissions",
                  "CRM, campagnes et analytics",
                  "Parcours professionnel unifié",
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <Check
                      className="mt-0.5 h-icon-sm w-icon-sm shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                to={routes.proPlans()}
                className={`${secondaryCtaClass} mt-6 w-full sm:w-auto`}
              >
                Voir Shongre Pro
              </Link>
            </article>
          </div>
        </Container>
      </section>

      <section
        aria-labelledby="prospects-compliance"
        className="bg-stone-950 py-10 text-white sm:py-12"
      >
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <h2
              id="prospects-compliance"
              className="text-2xl font-bold tracking-tight sm:text-3xl"
            >
              L’automatisation reste sous contrôle.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-stone-300">
              Sources autorisées, quotas, suppression, provenance et validation
              humaine font partie du produit.
            </p>
          </div>
          <div className="mt-7 grid gap-5 sm:grid-cols-3 sm:divide-x sm:divide-stone-700">
            {[
              [Ban, "Aucun contact automatique"],
              [ShieldCheck, "Aucun fournisseur activé en démo"],
              [Database, "Données isolées par organisation"],
            ].map(([Icon, label]) => {
              const ItemIcon = Icon as typeof Ban;
              return (
                <div
                  key={String(label)}
                  className="flex items-center gap-3 sm:justify-center sm:px-4"
                >
                  <ItemIcon
                    className="h-6 w-6 shrink-0 text-primary-on-dark"
                    aria-hidden="true"
                  />
                  <span className="text-xs font-semibold leading-relaxed text-stone-200">
                    {String(label)}
                  </span>
                </div>
              );
            })}
          </div>
        </Container>
      </section>

      <section className="bg-bg-surface py-12 text-center sm:py-16">
        <Container>
          <h2 className="mx-auto max-w-2xl text-2xl font-bold tracking-tight text-text-main sm:text-3xl">
            Commencez par un cas réel, sans connecter vos outils.
          </h2>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to={workspaceDestination} className={primaryCtaClass}>
              {workspaceCtaLabel}
              <ArrowRight className="h-icon-sm w-icon-sm" aria-hidden="true" />
            </Link>
            <Link
              to={routes.proPlans()}
              className="inline-flex min-h-control-lg items-center justify-center gap-1 px-4 text-sm font-bold text-primary hover:text-primary-hover"
            >
              Explorer Shongre Pro
              <ArrowRight className="h-icon-sm w-icon-sm" aria-hidden="true" />
            </Link>
          </div>
        </Container>
      </section>
    </div>
  );
}
