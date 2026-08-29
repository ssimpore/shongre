import React from "react";
import type { HomepageSectionView } from "../../../domains/homepage/homepage.types";
import { Container } from "../../../design-system";
import { Button } from "../../../design-system/primitives/Button";
import { useTranslation } from "../../../i18n/I18nProvider";
import { HomeSectionHeading } from "./HomeSectionHeading";

export const HomeProCtaSection: React.FC<{ section: HomepageSectionView }> = ({
  section,
}) => {
  const { t } = useTranslation();
  return (
    <Container as="section" aria-labelledby="home-pro-title">
      <div className="flex flex-col items-center justify-between gap-6 rounded-2xl border border-border-base bg-bg-base p-6 sm:p-10 md:flex-row">
        <div className="max-w-xl space-y-2">
          <HomeSectionHeading id="home-pro-title">
            {section.title}
          </HomeSectionHeading>
          {section.subtitle ? (
            <p className="text-xs leading-relaxed text-text-secondary sm:text-sm">
              {section.subtitle}
            </p>
          ) : null}
        </div>
        <div className="w-full shrink-0 md:w-auto">
          <Button to="/solutions-pro" variant="pro" size="md" fullWidth>
            {t("home.homePage.decouvrirLesForfaitsPro")}
          </Button>
        </div>
      </div>
    </Container>
  );
};
