import React from "react";
import { PlusCircle } from "lucide-react";
import { usePublishCta } from "../../security/usePublishCta";
import { useTranslation } from "../../i18n/I18nProvider";
import { Button } from "./Button";

export interface PublishCtaButtonProps {
  /** Fills its container; the drawer and the hero's mobile stack both want this. */
  fullWidth?: boolean;
  /** Runs before navigation — the mobile drawer uses it to close itself. */
  onNavigate?: () => void;
  /** Allows a prominent marketing surface to use the brand-filled treatment. */
  variant?: "pro" | "primary";
  className?: string;
}

/**
 * The publish call to action, in one place.
 *
 * It is the loudest control in the product and it appeared three times with
 * three different treatments: the home hero and the mobile tab bar both used a
 * `stone-900` surface with a `primary` glyph, while the drawer rendered a solid
 * terracotta button. Same action, same label, same icon — three looks, so
 * whichever one a visitor met first taught them the wrong thing about the
 * others.
 *
 * The dark treatment remains the shell default: it is what the raised tab-bar
 * button and header use, and it keeps the brand colour for the glyph. A focused
 * marketing surface may request the primary variant when the action is the
 * page's visual anchor; destination, label and interaction stay centralized.
 *
 * Destination and label come from `usePublishCta`, so the button keeps matching
 * what the visitor can actually do — a guest is offered registration, a seller
 * the publish flow, a suspended account its own status.
 */
export const PublishCtaButton: React.FC<PublishCtaButtonProps> = ({
  fullWidth = false,
  onNavigate,
  variant = "pro",
  className = "",
}) => {
  const publishCta = usePublishCta();
  const { t } = useTranslation();

  return (
    <Button
      to={publishCta.to}
      data-marketplace-action="listing.publish"
      onClick={onNavigate}
      variant={variant}
      fullWidth={fullWidth}
      leftIcon={
        <PlusCircle
          className={`h-4.5 w-4.5 ${variant === "primary" ? "text-on-primary" : "text-primary"}`}
        />
      }
      className={`${fullWidth ? "" : "w-full sm:w-auto"} ${className}`}
    >
      {t(publishCta.labelKey)}
    </Button>
  );
};
