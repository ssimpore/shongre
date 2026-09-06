import React from "react";
import { Search, Sparkles } from "lucide-react";
import type { HomepageSectionView } from "../../../domains/homepage/homepage.types";
import { Container, Heading } from "../../../design-system";
import { Button } from "../../../design-system/primitives/Button";
import { PublishCtaButton } from "../../../design-system/primitives/PublishCtaButton";
import { useTranslation } from "../../../i18n/I18nProvider";
import { HeroBoostedScroll } from "./HeroBoostedScroll";
import { GlobalSearchBar } from "../../../design-system/primitives/GlobalSearchBar";
import { homepageVisibilityClass } from "../../../domains/homepage/homepage.presentation";

export const HomeHeroSection: React.FC<{ section: HomepageSectionView }> = ({
  section,
}) => {
  const { t } = useTranslation();
  return (
    <section
      data-home-hero="true"
      className={`relative overflow-hidden bg-bg-base py-3 sm:py-5 ${homepageVisibilityClass(section)}`}
    >
      <Container className="relative z-raised">
        <div
          data-home-hero-surface="true"
          className="rounded-listing-card border border-border-base bg-bg-surface px-5 py-7 shadow-sm sm:p-8 lg:px-8 lg:py-6"
        >
          <div className="grid w-full grid-cols-1 items-stretch gap-8 lg:grid-cols-2 lg:gap-10 xl:gap-12">
            <div className="flex min-w-0 w-full flex-col justify-between text-left">
              <div className="flex flex-col items-start gap-5">
                <div
                  data-home-hero-eyebrow="true"
                  className="inline-flex w-fit items-center gap-2 rounded-pill border border-primary-border bg-primary-light px-3 py-2 text-sm font-semibold text-primary shadow-2xs"
                >
                  <Sparkles
                    className="h-icon-md w-icon-md shrink-0"
                    aria-hidden="true"
                  />
                  <span>{t("home.homePage.trustedMarketplace")}</span>
                </div>
                <Heading as="h1" size="display-md" className="text-hero">
                  {section.title}
                </Heading>
                {section.subtitle ? (
                  <p className="max-w-md text-sm font-normal leading-relaxed text-text-secondary sm:text-base">
                    {section.subtitle}
                  </p>
                ) : null}
              </div>
              <div className="mt-5 w-full">
                <GlobalSearchBar
                  variant="minimal"
                  showCategory={false}
                  showLocation={false}
                  idPrefix="homepage-hero-search"
                  className="mb-3 md:hidden"
                />
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
        </div>
      </Container>
    </section>
  );
};
