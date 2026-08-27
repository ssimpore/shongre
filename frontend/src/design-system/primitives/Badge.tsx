import React from "react";
import { ShieldCheck, Sparkles, Zap, Tag } from "lucide-react";
import { Avatar as SharedAvatar, Badge as SharedBadge } from "@shongre/ui/web";
import { useTranslation } from "../../i18n/I18nProvider";
import { AVATAR_SIZES, buildSrcSet } from "./responsiveImage";

export interface BadgeProps {
  children: React.ReactNode;
  /**
   * `featured` is the boosted-listing ("Vedette") badge. It is a variant rather
   * than per-screen markup because the same listing state was previously drawn
   * three different ways: terracotta on the listing cards, `bg-amber-500` in the
   * home rail — white on amber is 2.13:1, well under AA — and the `urgent`
   * (danger red) variant in the seller's table, which labelled a paid promotion
   * as a problem. One variant means one colour for one meaning.
   */
  variant?:
    | "neutral"
    | "primary"
    | "pro"
    | "verified"
    | "urgent"
    | "deal"
    | "warning"
    | "success"
    | "featured";
  size?: "sm" | "md";
  icon?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "neutral",
  size = "sm",
  icon = false,
  className = "",
}) => {
  const badgeIcons: Partial<
    Record<NonNullable<BadgeProps["variant"]>, React.ReactNode>
  > = {
    verified: <ShieldCheck className="w-icon-xs h-icon-xs text-success" />,
    pro: <Sparkles className="w-icon-xs h-icon-xs text-amber-400" />,
    urgent: <Zap className="w-icon-xs h-icon-xs text-danger" />,
    deal: <Tag className="w-icon-xs h-icon-xs text-warning" />,
    featured: <Sparkles className="w-icon-xs h-icon-xs shrink-0" />,
  };
  const badgeIcon = icon ? badgeIcons[variant] : undefined;

  return (
    <SharedBadge
      variant={variant}
      size={size}
      icon={badgeIcon}
      className={className}
    >
      {children}
    </SharedBadge>
  );
};

export interface AvatarProps {
  src?: string;
  name: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  isVerified?: boolean;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = "md",
  isVerified = false,
  className = "",
}) => {
  const { t } = useTranslation();
  return (
    <SharedAvatar
      src={src}
      srcSet={buildSrcSet(src)}
      sizes={AVATAR_SIZES[size]}
      name={name}
      size={size}
      isVerified={isVerified}
      verifiedLabel={t("ui.badge.profilVerifie")}
      className={className}
    />
  );
};
