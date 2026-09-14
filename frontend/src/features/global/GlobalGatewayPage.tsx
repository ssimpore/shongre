import { Search, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import {
  BrandHeaderSignature,
  BrandLogo,
} from "../../design-system/primitives/BrandLogo";
import { translate, DEFAULT_LOCALE } from "../../i18n/i18n.service";
import type { MessageKey } from "../../i18n/messages.fr";
import {
  GatewayCountrySelector,
  type GatewayCountryLink,
} from "./GatewayCountrySelector";

export function GlobalGatewayPage({
  countries,
  defaultMarketOrigin,
  locale = DEFAULT_LOCALE,
}: {
  countries: GatewayCountryLink[];
  defaultMarketOrigin: string;
  locale?: string;
}) {
  const t = (key: MessageKey) => translate(key, locale);

  const valueProps = [
    {
      title: t("shell.marketDetection.gatewayFeatureTrustTitle"),
      description: t("shell.marketDetection.gatewayFeatureTrustDesc"),
      Icon: ShieldCheck,
    },
    {
      title: t("shell.marketDetection.gatewayFeatureLocalTitle"),
      description: t("shell.marketDetection.gatewayFeatureLocalDesc"),
      Icon: Users,
    },
    {
      title: t("shell.marketDetection.gatewayFeatureSimpleTitle"),
      description: t("shell.marketDetection.gatewayFeatureSimpleDesc"),
      Icon: Search,
    },
  ];

  return (
    <div className="min-h-screen bg-bg-surface text-text-deep">
      <header className="sticky top-0 z-header border-b border-border-base bg-bg-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 w-full max-w-page items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            aria-label={t("shell.marketDetection.gatewayHomeAria")}
          >
            <BrandHeaderSignature priority />
          </Link>
          <a
            href={`${defaultMarketOrigin}/connexion`}
            className="inline-flex min-h-control-touch items-center rounded-control border border-primary px-4 text-sm font-bold text-primary transition-colors hover:bg-primary-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {t("shell.marketDetection.gatewaySignIn")}
          </a>
        </div>
      </header>

      <main id="main-content">
        <section className="mx-auto grid w-full max-w-page gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-text-deep sm:text-5xl lg:text-6xl">
              {t("shell.marketDetection.gatewayTitle")}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-text-supporting sm:text-lg">
              {t("shell.marketDetection.gatewaySubtitle")}
            </p>
          </div>

          <GatewayCountrySelector countries={countries} />
        </section>

        <section className="border-y border-border-base bg-bg-subtle">
          <div className="mx-auto grid w-full max-w-page divide-y divide-border-base px-4 sm:px-6 md:grid-cols-3 md:divide-x md:divide-y-0 lg:px-8">
            {valueProps.map(({ title, description, Icon }) => (
              <article
                key={title}
                className="flex gap-4 py-8 md:px-7 md:first:pl-0 md:last:pr-0"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border-base bg-bg-surface text-primary shadow-xs">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-sm font-bold">{title}</h2>
                  <p className="mt-2 text-xs leading-relaxed text-text-supporting">
                    {description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="bg-bg-surface">
        <div className="mx-auto flex w-full max-w-page flex-col gap-5 px-4 py-8 text-xs text-text-supporting sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <BrandLogo layout="wordmark" size="compact" />
          <nav
            aria-label={t("shell.marketDetection.gatewayLegalNav")}
            className="flex flex-wrap gap-x-5 gap-y-2"
          >
            <a
              href={`${defaultMarketOrigin}/securite`}
              className="hover:text-text-deep"
            >
              {t("shell.marketDetection.gatewaySecurity")}
            </a>
            <a
              href={`${defaultMarketOrigin}/confidentialite`}
              className="hover:text-text-deep"
            >
              {t("shell.marketDetection.gatewayPrivacy")}
            </a>
            <a
              href={`${defaultMarketOrigin}/conditions-utilisation`}
              className="hover:text-text-deep"
            >
              {t("shell.marketDetection.gatewayTerms")}
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
