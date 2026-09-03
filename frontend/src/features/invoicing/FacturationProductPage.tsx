import { Link } from "react-router-dom";
import {
  ArrowRight,
  Calculator,
  Check,
  FileCheck2,
  Globe2,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";
import { Container } from "../../design-system";
import { useAuth } from "../../app/providers/AuthProvider";
import { routes } from "../../configuration/routes";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useTranslation } from "../../i18n/I18nProvider";
import { useAuthorization } from "../../security/useAuthorization";
import { hasProductAccess } from "../../domains/user/user.domain";
import { InvoicingLandingPreview } from "./components/InvoicingLandingPreview";
import { applicationHref } from "../../platform/applications/use-application-href";

const primaryCtaClass =
  "inline-flex min-h-control-lg items-center justify-center gap-2 rounded-control bg-primary px-5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

const secondaryCtaClass =
  "inline-flex min-h-control-lg items-center justify-center gap-2 rounded-control border border-primary bg-bg-surface px-5 text-sm font-bold text-primary transition-colors hover:bg-primary-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export function FacturationProductPage() {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { canAccessRoute } = useAuthorization();

  usePageMeta({
    title: t("invoicing.product.metaTitle"),
    description: t("invoicing.product.description"),
    canonicalUrl: applicationHref("facturation"),
    alternateCountries: [],
  });

  const canOpenWorkspace = canAccessRoute("standaloneInvoicing");
  const hasFacturation = hasProductAccess(currentUser, "facturation");
  const workspaceDestination = canOpenWorkspace
    ? applicationHref("facturation", "/app")
    : currentUser
      ? applicationHref("facturation", "/activation")
      : applicationHref("marketplace", routes.facturation.registration());
  const workspaceCtaLabel = canOpenWorkspace
    ? t("invoicing.product.openApp")
    : currentUser && !hasFacturation
      ? t("invoicing.product.activatePro")
      : t("invoicing.product.createWorkspace");

  const previewLabels = {
    ariaLabel: t("invoicing.product.previewAria"),
    title: t("invoicing.product.previewTitle"),
    organization: t("invoicing.product.previewOrganization"),
    invoiceNumber: t("invoicing.product.previewNumber"),
    customer: t("invoicing.product.previewCustomer"),
    amount: t("invoicing.product.previewAmount"),
    status: t("invoicing.product.previewFinalized"),
    configuration: t("invoicing.product.previewConfiguration"),
    totalLabel: t("invoicing.product.previewSubtotal"),
    taxLabel: t("invoicing.product.previewTax"),
    marketLabel: t("invoicing.product.previewMarket"),
    marketValue: t("invoicing.product.previewMarketValue"),
    documentLabel: t("invoicing.product.previewDocument"),
    documentNotice: t("invoicing.product.previewDocumentNotice"),
  };

  const trustPoints = [
    [Calculator, t("invoicing.product.trustExact")],
    [Globe2, t("invoicing.product.trustMarkets")],
    [LockKeyhole, t("invoicing.product.trustFinalization")],
    [ShieldCheck, t("invoicing.product.trustDemo")],
  ] as const;

  const workflowSteps = [
    {
      number: "01",
      icon: Globe2,
      title: t("invoicing.product.stepConfigureTitle"),
      description: t("invoicing.product.stepConfigureBody"),
    },
    {
      number: "02",
      icon: ReceiptText,
      title: t("invoicing.product.stepCreateTitle"),
      description: t("invoicing.product.stepCreateBody"),
    },
    {
      number: "03",
      icon: FileCheck2,
      title: t("invoicing.product.stepFinalizeTitle"),
      description: t("invoicing.product.stepFinalizeBody"),
    },
    {
      number: "04",
      icon: ShieldCheck,
      title: t("invoicing.product.stepFollowTitle"),
      description: t("invoicing.product.stepFollowBody"),
    },
  ] as const;

  const finalizationPoints = [
    t("invoicing.product.finalizationNumber"),
    t("invoicing.product.finalizationSnapshot"),
    t("invoicing.product.finalizationDocument"),
  ];

  const markets = [
    ["FR", t("invoicing.product.marketFrance"), "EUR", "fr-FR"],
    ["BE", t("invoicing.product.marketBelgium"), "EUR", "fr-BE"],
    ["CH", t("invoicing.product.marketSwitzerland"), "CHF", "fr-CH"],
  ] as const;

  return (
    <div className="overflow-hidden bg-bg-surface pb-14">
      <section className="border-b border-border-base bg-bg-surface py-8 sm:py-14 lg:py-16">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
            <div className="max-w-xl">
              <h1 className="text-3xl font-bold leading-none tracking-tight text-text-main sm:text-5xl">
                {t("invoicing.product.title")}
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-text-secondary sm:text-lg">
                {t("invoicing.product.description")}
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link to={workspaceDestination} className={primaryCtaClass}>
                  {workspaceCtaLabel}
                  <ArrowRight
                    className="h-icon-sm w-icon-sm"
                    aria-hidden="true"
                  />
                </Link>
                <a href="#facturation-controls" className={secondaryCtaClass}>
                  {t("invoicing.product.secondaryCta")}
                </a>
              </div>
              <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-text-secondary">
                <ShieldCheck
                  className="mt-0.5 h-icon-sm w-icon-sm shrink-0 text-success"
                  aria-hidden="true"
                />
                {t("invoicing.product.demoNotice")}
              </p>
            </div>

            <InvoicingLandingPreview
              workspaceDestination={workspaceDestination}
              labels={previewLabels}
            />
          </div>
        </Container>
      </section>

      <section
        aria-labelledby="facturation-trust"
        className="border-b border-border-base bg-bg-surface"
      >
        <Container>
          <h2 id="facturation-trust" className="sr-only">
            {t("invoicing.product.trustTitle")}
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
        id="facturation-controls"
        aria-labelledby="facturation-workflow"
        className="scroll-mt-24 bg-bg-surface py-12 sm:py-16"
      >
        <Container>
          <h2
            id="facturation-workflow"
            className="text-2xl font-bold tracking-tight text-text-main sm:text-3xl"
          >
            {t("invoicing.product.workflowTitle")}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary">
            {t("invoicing.product.workflowBody")}
          </p>
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
        id="facturation-finalization"
        aria-labelledby="facturation-finalization-title"
        className="scroll-mt-24 border-y border-border-base bg-bg-base py-12 sm:py-16"
      >
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-commission-content-aside lg:gap-14">
            <InvoicingLandingPreview
              workspaceDestination={workspaceDestination}
              labels={previewLabels}
              variant="document"
            />
            <div>
              <h2
                id="facturation-finalization-title"
                className="text-3xl font-bold tracking-tight text-text-main sm:text-4xl"
              >
                {t("invoicing.product.finalizationTitle")}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-text-secondary">
                {t("invoicing.product.finalizationBody")}
              </p>
              <div className="mt-7 divide-y divide-border-base border-y border-border-base">
                {finalizationPoints.map((point) => (
                  <div
                    key={point}
                    className="flex min-h-16 items-center gap-3 py-3"
                  >
                    <Check
                      className="h-5 w-5 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <span className="text-sm font-bold text-text-main">
                      {point}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section
        id="facturation-markets"
        aria-labelledby="facturation-markets-title"
        className="scroll-mt-24 bg-bg-surface py-12 sm:py-16"
      >
        <Container>
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-14">
            <div>
              <h2
                id="facturation-markets-title"
                className="text-3xl font-bold tracking-tight text-text-main sm:text-4xl"
              >
                {t("invoicing.product.marketsTitle")}
              </h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-text-secondary">
                {t("invoicing.product.marketsBody")}
              </p>
              <p className="mt-4 max-w-xl text-xs leading-relaxed text-text-muted">
                {t("invoicing.product.marketsDisclaimer")}
              </p>
            </div>
            <div className="divide-y divide-border-base border-y border-border-base">
              {markets.map(([code, name, currency, locale]) => (
                <div
                  key={code}
                  className="grid min-h-16 grid-cols-4 items-center gap-3 py-3"
                >
                  <strong className="text-sm text-text-main">{code}</strong>
                  <span className="text-xs font-bold text-text-main">
                    {name}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {currency}
                  </span>
                  <span className="text-right text-xs text-text-muted">
                    {locale}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section
        aria-labelledby="facturation-guardrails"
        className="bg-stone-950 py-10 text-white sm:py-12"
      >
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <h2
              id="facturation-guardrails"
              className="text-2xl font-bold tracking-tight sm:text-3xl"
            >
              {t("invoicing.product.guardrailsTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-stone-300">
              {t("invoicing.product.guardrailsBody")}
            </p>
          </div>
          <div className="mt-7 grid gap-5 sm:grid-cols-3 sm:divide-x sm:divide-stone-700">
            {[
              t("invoicing.product.guardrailNoTransmission"),
              t("invoicing.product.guardrailNoFallback"),
              t("invoicing.product.guardrailIsolation"),
            ].map((label) => (
              <div
                key={label}
                className="flex items-center gap-3 sm:justify-center sm:px-4"
              >
                <ShieldCheck
                  className="h-6 w-6 shrink-0 text-primary-on-dark"
                  aria-hidden="true"
                />
                <span className="text-xs font-semibold leading-relaxed text-stone-200">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-bg-surface py-12 text-center sm:py-16">
        <Container>
          <h2 className="mx-auto max-w-2xl text-2xl font-bold tracking-tight text-text-main sm:text-3xl">
            {t("invoicing.product.finalCtaTitle")}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary">
            {t("invoicing.product.finalCtaBody")}
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to={workspaceDestination} className={primaryCtaClass}>
              {workspaceCtaLabel}
              <ArrowRight className="h-icon-sm w-icon-sm" aria-hidden="true" />
            </Link>
            <Link
              to={routes.proPlans()}
              className="inline-flex min-h-control-lg items-center justify-center gap-1 px-4 text-sm font-bold text-primary hover:text-primary-hover"
            >
              {t("invoicing.product.explorePro")}
              <ArrowRight className="h-icon-sm w-icon-sm" aria-hidden="true" />
            </Link>
          </div>
        </Container>
      </section>
    </div>
  );
}
