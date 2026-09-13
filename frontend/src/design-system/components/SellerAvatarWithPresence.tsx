import type { UserPresence } from "@shongre/shared/presence";
import { currentPresence } from "@shongre/shared/presence";
import { PresenceIndicator } from "@shongre/ui/web";
import { useTranslation } from "../../i18n/I18nProvider";
import { Avatar, type AvatarProps } from "../primitives/Badge";
import { cn } from "../utils/variants";

type AvatarSize = NonNullable<AvatarProps["size"]>;

const presenceSizes: Record<AvatarSize, "xs" | "sm"> = {
  sm: "xs",
  md: "xs",
  lg: "xs",
  xl: "sm",
  "2xl": "sm",
};

export interface SellerAvatarWithPresenceProps {
  src?: string;
  name: string;
  size?: AvatarSize;
  /** Authorized, short-lived presence only; absence is rendered as unknown. */
  presence?: UserPresence;
  className?: string;
  avatarClassName?: string;
}

/** Shared seller avatar anatomy: presence owns the corner, never verification. */
export function SellerAvatarWithPresence({
  src,
  name,
  size = "lg",
  presence,
  className,
  avatarClassName,
}: SellerAvatarWithPresenceProps) {
  const { t } = useTranslation();
  const status = currentPresence(presence)?.status ?? "unknown";

  return (
    <span
      className={cn("relative inline-flex shrink-0", className)}
      data-seller-avatar="true"
    >
      <Avatar src={src} name={name} size={size} className={avatarClassName} />
      <span className="absolute -bottom-0.5 -right-0.5 inline-flex">
        <PresenceIndicator
          status={status}
          label={t(`messaging.presence.${status}`)}
          size={presenceSizes[size]}
        />
      </span>
    </span>
  );
}
