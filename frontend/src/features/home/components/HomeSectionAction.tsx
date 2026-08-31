import React from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "../../../design-system/primitives/Button";
import { useTranslation } from "../../../i18n/I18nProvider";

interface HomeSectionActionProps {
  to: string;
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
}

/** Canonical navigation action for homepage section and rail headers. */
export const HomeSectionAction: React.FC<HomeSectionActionProps> = ({
  to,
  children,
  onClick,
}) => {
  const { t } = useTranslation();

  return (
    <Button
      to={to}
      variant="secondary"
      size="sm"
      onClick={onClick}
      data-home-section-action="true"
      rightIcon={
        <ArrowRight className="h-icon-sm w-icon-sm" aria-hidden="true" />
      }
      className="shrink-0"
    >
      <span className="hidden sm:inline">{children}</span>
      <span className="sm:hidden">{t("home.homePage.voirTout")}</span>
    </Button>
  );
};
