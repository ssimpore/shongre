import { ArrowRight, CheckCircle2, Layers3, ReceiptText } from "lucide-react";
import { useState } from "react";
import { services } from "../../api/client/service-registry";
import { useAuth } from "../../app/providers/AuthProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { routes } from "../../configuration/routes";
import { Button, Notice } from "../../design-system";
import { hasProductAccess } from "../../domains/user/user.domain";
import { usePageMeta } from "../../hooks/usePageMeta";
import { applicationHref } from "../../platform/applications/use-application-href";

export function InvoicingActivationPage() {
  const { currentUser, refreshUser } = useAuth();
  const { activeMarket } = useMarketLocation();
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alreadyActive = hasProductAccess(currentUser, "facturation");

  usePageMeta({
    title: "Activer Shongre Facturation",
    description:
      "Ajoutez Facturation à votre compte et à votre organisation Shongre existants.",
    canonicalPath: routes.facturation.activation(),
    noIndex: true,
  });

  const activate = async () => {
    setActivating(true);
    setError(null);
    try {
      await services.invoicing.activateForCurrentOrganization(
        activeMarket.code,
      );
      await refreshUser();
      window.location.assign(applicationHref("facturation", "/onboarding"));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "L’activation n’a pas pu être confirmée.",
      );
    } finally {
      setActivating(false);
    }
  };

  return (
    <main className="bg-bg-base px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-card border border-border-base bg-bg-surface p-6 shadow-sm sm:p-9">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary-light text-primary">
            <ReceiptText className="h-icon-lg w-icon-lg" aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-2xl font-black tracking-tight text-text-main sm:text-3xl">
            Ajoutez Facturation à votre organisation
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary">
            Votre compte, votre entreprise et votre équipe restent uniques. Seul
            le produit Facturation est ajouté, sans modifier vos autres
            abonnements.
          </p>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            <li className="flex gap-3 rounded-control border border-border-base p-4 text-sm text-text-secondary">
              <Layers3
                className="h-icon-md w-icon-md shrink-0 text-primary"
                aria-hidden="true"
              />
              Même organisation et mêmes informations légales
            </li>
            <li className="flex gap-3 rounded-control border border-border-base p-4 text-sm text-text-secondary">
              <CheckCircle2
                className="h-icon-md w-icon-md shrink-0 text-success"
                aria-hidden="true"
              />
              Permissions et abonnement gérés indépendamment
            </li>
          </ul>

          {error ? (
            <Notice
              className="mt-6"
              variant="error"
              title="Activation impossible"
            >
              {error} L’accès de production reste fermé tant qu’un droit
              commercial approuvé n’est pas actif pour l’organisation.
            </Notice>
          ) : null}

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            {alreadyActive ? (
              <a
                href={applicationHref("facturation", "/onboarding")}
                className="inline-flex min-h-control-md items-center justify-center gap-2 rounded-control bg-primary px-5 text-sm font-bold text-white"
              >
                Continuer la configuration
                <ArrowRight
                  className="h-icon-sm w-icon-sm"
                  aria-hidden="true"
                />
              </a>
            ) : (
              <Button
                type="button"
                isLoading={activating}
                onClick={() => void activate()}
                rightIcon={<ArrowRight className="h-icon-sm w-icon-sm" />}
              >
                Activer Facturation
              </Button>
            )}
            <a
              href={applicationHref("facturation")}
              className="inline-flex min-h-control-md items-center justify-center rounded-control border border-border-base px-5 text-sm font-bold text-text-main"
            >
              Retour au produit
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
