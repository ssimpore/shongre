import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ReceiptText,
  UsersRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { InvoicingWorkspace } from "@shongre/contracts/invoicing";
import { services } from "../../api/client/service-registry";
import { useAuth } from "../../app/providers/AuthProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { routes } from "../../configuration/routes";
import {
  Badge,
  Button,
  Notice,
  OnboardingPreparationPage,
} from "../../design-system";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useTranslation } from "../../i18n/I18nProvider";
import { scrollToTop } from "../../utilities/motion";
import { applicationHref } from "../../platform/applications/use-application-href";

export function InvoicingOnboardingPage() {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { activeMarket } = useMarketLocation();
  const [workspace, setWorkspace] = useState<InvoicingWorkspace | null>(null);
  const [error, setError] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [isPreparationVisible, setIsPreparationVisible] = useState(true);
  const onboardingHeadingRef = useRef<HTMLHeadingElement>(null);

  usePageMeta({
    title: "Configurer Shongre Facturation",
    description: "Configurez votre organisation et commencez à facturer.",
    canonicalPath: routes.facturation.onboarding(),
    noIndex: true,
  });

  useEffect(() => {
    let active = true;
    services.invoicing
      .getWorkspace(activeMarket.code)
      .then((next) => active && setWorkspace(next))
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, [activeMarket.code]);

  useEffect(() => {
    if (!isPreparationVisible) onboardingHeadingRef.current?.focus();
  }, [isPreparationVisible]);

  const organization = workspace?.tenants[0];
  const hasEntity = Boolean(workspace?.legalEntities[0]);
  const bootstrapLegalEntity = async () => {
    if (!organization) return;
    setIsBootstrapping(true);
    setBootstrapError(null);
    try {
      await services.invoicing.bootstrapLegalEntityFromOrganization({
        tenantId: organization.id,
        marketCode: activeMarket.code,
      });
      setWorkspace(await services.invoicing.getWorkspace(activeMarket.code));
    } catch (bootstrapFailure) {
      setBootstrapError(
        bootstrapFailure instanceof Error
          ? bootstrapFailure.message
          : t("invoicing.onboarding.bootstrapError"),
      );
    } finally {
      setIsBootstrapping(false);
    }
  };
  const steps = [
    {
      icon: Building2,
      title: "Organisation Shongre",
      body:
        organization?.legalName ??
        currentUser?.companyName ??
        "Votre organisation",
      complete: Boolean(organization),
    },
    {
      icon: ReceiptText,
      title: "Coordonnées de facturation",
      body: hasEntity
        ? `${workspace?.legalEntities[0]?.legalName} · ${workspace?.legalEntities[0]?.countryCode}`
        : "À compléter dans les paramètres Facturation",
      complete: hasEntity,
    },
    {
      icon: UsersRound,
      title: "Équipe et permissions",
      body: organization
        ? `${organization.membershipRole} · ${organization.productAccess.seats} sièges disponibles`
        : "Chargement de vos droits",
      complete: Boolean(organization),
    },
  ];

  const showWorkspaceConfiguration = () => {
    setIsPreparationVisible(false);
    scrollToTop();
  };

  const showPreparation = () => {
    setIsPreparationVisible(true);
    scrollToTop();
  };

  if (isPreparationVisible) {
    return (
      <OnboardingPreparationPage
        eyebrow={t("onboarding.preparation.invoicing.eyebrow")}
        title={t("onboarding.preparation.invoicing.title")}
        description={t("onboarding.preparation.invoicing.description")}
        checklistTitle={t("onboarding.preparation.invoicing.checklistTitle")}
        items={[
          {
            title: t("onboarding.preparation.invoicing.entityTitle"),
            description: t(
              "onboarding.preparation.invoicing.entityDescription",
            ),
            icon: Building2,
          },
          {
            title: t("onboarding.preparation.invoicing.billingTitle"),
            description: t(
              "onboarding.preparation.invoicing.billingDescription",
            ),
            icon: ReceiptText,
          },
          {
            title: t("onboarding.preparation.invoicing.teamTitle"),
            description: t("onboarding.preparation.invoicing.teamDescription"),
            icon: UsersRound,
          },
        ]}
        actionLabel={t(
          hasEntity
            ? "onboarding.preparation.invoicing.resume"
            : "onboarding.preparation.invoicing.start",
        )}
        durationLabel={t("onboarding.preparation.invoicing.duration")}
        statusLabel={t("onboarding.preparation.invoicing.status")}
        onStart={showWorkspaceConfiguration}
      />
    );
  }

  return (
    <main className="bg-bg-base px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-4xl">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mb-4"
          leftIcon={<ArrowLeft className="h-icon-sm w-icon-sm" />}
          onClick={showPreparation}
        >
          {t("onboarding.preparation.back")}
        </Button>
        <Badge variant="primary">Configuration Facturation</Badge>
        <h1
          ref={onboardingHeadingRef}
          tabIndex={-1}
          className="mt-4 text-2xl font-black tracking-tight text-text-main focus:outline-none sm:text-4xl"
        >
          Votre espace, prêt sans la marketplace
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary">
          Ces réglages concernent uniquement Facturation. Aucun catalogue,
          aucune annonce et aucun paramètre Prospects ne sont requis.
        </p>

        {error ? (
          <Notice
            className="mt-6"
            variant="error"
            title="Configuration inaccessible"
          >
            Vérifiez que l’organisation dispose d’un droit Facturation actif.
          </Notice>
        ) : null}

        <ol className="mt-7 grid gap-4 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, body, complete }, index) => (
            <li
              key={title}
              className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-light text-primary">
                  <Icon className="h-icon-md w-icon-md" aria-hidden="true" />
                </span>
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-success-surface text-success"
                  role="img"
                  aria-label={complete ? "Terminé" : `Étape ${index + 1}`}
                >
                  {complete ? (
                    <Check className="h-icon-sm w-icon-sm" aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </span>
              </div>
              <h2 className="mt-4 text-sm font-black text-text-main">
                {title}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-text-secondary">
                {body}
              </p>
            </li>
          ))}
        </ol>

        {organization && !hasEntity ? (
          <section className="mt-6 rounded-card border border-primary/20 bg-primary-light p-5 sm:flex sm:items-center sm:justify-between sm:gap-5">
            <div>
              <h2 className="text-sm font-black text-text-main">
                {t("invoicing.onboarding.bootstrapTitle")}
              </h2>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-text-secondary">
                {t("invoicing.onboarding.bootstrapBody")}
              </p>
              {bootstrapError ? (
                <p className="mt-2 text-xs font-bold text-danger" role="alert">
                  {bootstrapError}
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="primary"
              size="md"
              className="mt-4 shrink-0 sm:mt-0"
              isLoading={isBootstrapping}
              onClick={() => void bootstrapLegalEntity()}
            >
              {t("invoicing.onboarding.bootstrapAction")}
            </Button>
          </section>
        ) : null}

        <div className="mt-7 rounded-card border border-border-base bg-bg-surface p-5 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-text-main">
              Vous pouvez commencer
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              Clients, brouillons, exports, suivi des paiements et paramètres
              sont réunis dans votre espace.
            </p>
          </div>
          <a
            href={applicationHref("facturation", "/app")}
            className="mt-4 inline-flex min-h-control-md items-center justify-center gap-2 rounded-control bg-primary px-5 text-sm font-bold text-white sm:mt-0"
          >
            Ouvrir Facturation
            <ArrowRight className="h-icon-sm w-icon-sm" aria-hidden="true" />
          </a>
        </div>
      </div>
    </main>
  );
}
