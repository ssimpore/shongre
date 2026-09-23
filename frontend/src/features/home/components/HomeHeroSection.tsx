import React from "react";
import {
  LockKeyhole,
  Search,
  ShieldCheck,
  Truck,
  UsersRound,
} from "lucide-react";
import type { HomepageSectionView } from "../../../domains/homepage/homepage.types";
import type { Listing } from "../../../types";
import { Container, Heading } from "../../../design-system";
import { Button } from "../../../design-system/primitives/Button";
import { PublishCtaButton } from "../../../design-system/primitives/PublishCtaButton";
import { useTranslation } from "../../../i18n/I18nProvider";
import { HeroBoostedScroll } from "./HeroBoostedScroll";
import { GlobalSearchBar } from "../../../design-system/primitives/GlobalSearchBar";
import { homepageVisibilityClass } from "../../../domains/homepage/homepage.presentation";

export const HomeHeroSection: React.FC<{
  section: HomepageSectionView;
  /** The rail's selection when the document already carries it. */
  heroListings?: Listing[];
}> = ({ section, heroListings }) => {
  const { t } = useTranslation();
  const titleSeparator = section.title.indexOf(",");
  const titleLead =
    titleSeparator >= 0
      ? section.title.slice(0, titleSeparator + 1)
      : section.title;
  const titleAccent =
    titleSeparator >= 0 ? section.title.slice(titleSeparator + 1).trim() : "";
  const reassuranceItems = [
    {
      Icon: ShieldCheck,
      label: t("home.homePage.explicitSellerStatusesShort"),
    },
    {
      Icon: LockKeyhole,
      label: t("home.homePage.trackedPayment"),
    },
    {
      Icon: Truck,
      label: t("home.homePage.deliveryAvailable"),
    },
    {
      Icon: UsersRound,
      label: t("home.homePage.individualsAndPros"),
    },
  ];

  return (
    <section
      data-home-hero="true"
      className={`relative overflow-hidden bg-bg-base pb-4 pt-6 sm:pt-8 ${homepageVisibilityClass(section)}`}
    >
      <Container width="results" className="relative z-raised">
        <div
          data-home-hero-surface="true"
          className="relative isolate overflow-hidden rounded-listing-card border border-border-base bg-bg-surface shadow-sm"
        >
          {/* Below `sm` the gradient covers the whole surface, so the artwork
              is invisible there — yet as the largest painted element it was
              the phone's LCP, 163 KB at high priority behind a 95% overlay
              (7.7 s on a throttled 4G phone). The source only matches from
              `sm`; the fallback is an empty pixel, so a phone downloads
              nothing and its LCP is the headline. */}
          <picture>
            <source
              media="(min-width: 640px)"
              srcSet="/images/home-marketplace-hero.webp"
              type="image/webp"
            />
            <img
              src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
              alt=""
              width={2056}
              height={765}
              fetchPriority="high"
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          </picture>
          <div
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-bg-surface via-bg-surface/95 to-bg-surface/30 sm:w-4/5 lg:w-3/5 lg:to-transparent"
          />
          <div className="relative grid w-full grid-cols-1 items-stretch gap-6 px-5 py-6 sm:p-6 lg:grid-cols-2 lg:gap-8 lg:px-8 lg:py-6">
            <div className="flex min-w-0 w-full flex-col justify-center text-left">
              <div className="flex flex-col items-start gap-3">
                <Heading
                  as="h1"
                  size="display-md"
                  className="max-w-2xl lg:text-hero"
                >
                  {titleLead}
                  {titleAccent ? (
                    <span className="block text-primary">{titleAccent}</span>
                  ) : null}
                </Heading>
                {section.subtitle ? (
                  <p className="max-w-2xl text-sm font-normal leading-relaxed text-text-secondary sm:text-base">
                    {section.subtitle}
                  </p>
                ) : null}
                <ul
                  aria-label={t("home.homePage.garantiesShongre")}
                  className="hidden w-full grid-cols-2 gap-x-5 gap-y-3 pt-1 lg:grid xl:flex xl:flex-nowrap xl:items-center xl:gap-x-4"
                >
                  {reassuranceItems.map(({ Icon, label }) => (
                    <li
                      key={label}
                      className="flex min-w-0 items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-text-secondary"
                    >
                      <Icon
                        className="h-icon-md w-icon-md shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-5 w-full">
                <GlobalSearchBar
                  variant="minimal"
                  showCategory={false}
                  showLocation={false}
                  idPrefix="homepage-hero-search"
                  className="mb-3 md:hidden"
                />
                <div
                  data-home-hero-actions="true"
                  className="flex w-full flex-col gap-3 sm:mx-auto sm:w-fit sm:flex-row lg:mx-0"
                >
                  <PublishCtaButton variant="primary" />
                  <Button
                    to="/recherche"
                    variant="outline"
                    leftIcon={<Search className="h-icon-md w-icon-md" />}
                    className="w-full bg-bg-surface/90 backdrop-blur-xs sm:w-auto"
                  >
                    {t("home.homePage.explorerLeCatalogue")}
                  </Button>
                </div>
              </div>
            </div>
            <div className="relative flex min-w-0 w-full flex-col justify-center empty:hidden">
              <HeroBoostedScroll initialListings={heroListings} />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};
