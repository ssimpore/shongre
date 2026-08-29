import React from "react";
import { ArrowRight, Search, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import type { HomepageSectionView } from "../../../domains/homepage/homepage.types";
import { Container, Heading } from "../../../design-system";
import { Button } from "../../../design-system/primitives/Button";
import { PublishCtaButton } from "../../../design-system/primitives/PublishCtaButton";
import { useTranslation } from "../../../i18n/I18nProvider";
import { HeroBoostedScroll } from "./HeroBoostedScroll";

export const HomeHeroSection: React.FC<{ section: HomepageSectionView }> = ({
  section,
}) => {
  const { t } = useTranslation();
  return (
    <section className="relative overflow-hidden bg-bg-base py-3 sm:py-4">
      <Container className="relative z-raised">
        <div className="rounded-3xl bg-gradient-to-br from-bg-surface via-bg-surface to-primary-light/40 px-5 py-7 shadow-xs sm:p-8 lg:p-10">
          <div className="grid w-full grid-cols-1 items-stretch gap-8 lg:grid-cols-2 lg:gap-10 xl:gap-12">
            <div className="flex w-full flex-col justify-between text-left">
              <div className="flex flex-col gap-6 sm:gap-7">
                <Heading as="h1" size="display-md" family="display">
                  {section.title}
                </Heading>
                {section.subtitle ? (
                  <p className="max-w-xl text-sm font-normal leading-relaxed text-text-secondary sm:text-base">
                    {section.subtitle}
                  </p>
                ) : null}
              </div>
              <div className="w-full">
                <div className="flex w-full flex-col gap-3 sm:w-fit sm:flex-row">
                  <PublishCtaButton size="md" />
                  <Button
                    to="/recherche"
                    variant="outline"
                    size="md"
                    leftIcon={<Search className="h-icon-lg w-icon-lg" />}
                    className="w-full sm:w-auto"
                  >
                    {t("home.homePage.explorerLeCatalogue")}
                  </Button>
                </div>
              </div>
            </div>
            <div className="relative flex min-w-0 w-full flex-col empty:hidden">
              <HeroBoostedScroll />
            </div>
          </div>
          <Link
            to="/securite"
            className="group mt-5 flex min-h-8 min-w-0 items-center gap-2 border-t border-border-subtle pt-4 text-xs font-medium text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:mt-6 sm:text-sm"
            aria-label={`${t("home.homePage.trustSummary")}. ${t("home.heroBoostedScroll.enSavoirPlus")}`}
          >
            <ShieldCheck
              className="h-icon-lg w-icon-lg shrink-0 text-success"
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate">
              {t("home.homePage.trustSummary")}
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 font-bold text-primary">
              <span className="hidden sm:inline">
                {t("home.heroBoostedScroll.enSavoirPlus")}
              </span>
              <ArrowRight className="h-icon-sm w-icon-sm" aria-hidden="true" />
            </span>
          </Link>
        </div>
      </Container>
    </section>
  );
};
