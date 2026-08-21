import type { HTMLAttributes } from "react";
import { cn } from "../utils/variants";

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string;
  srcSet?: string;
  sizes?: string;
  name: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  isVerified?: boolean;
  verifiedLabel?: string;
}

const sizes = {
  sm: "w-avatar-sm h-avatar-sm text-xs",
  md: "w-avatar-md h-avatar-md text-sm",
  lg: "w-avatar-lg h-avatar-lg text-base",
  xl: "w-avatar-xl h-avatar-xl text-lg",
  "2xl": "w-24 h-24 sm:w-avatar-2xl sm:h-avatar-2xl text-2xl",
} as const;

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();

export function Avatar({
  src,
  srcSet,
  sizes: responsiveSizes,
  name,
  size = "md",
  isVerified,
  verifiedLabel = "Profil vérifié",
  className,
  ...props
}: AvatarProps) {
  return (
    <div
      className={cn(
        "relative inline-block rounded-full select-none shrink-0",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          sizes[size],
          "rounded-full overflow-hidden flex items-center justify-center font-semibold bg-bg-subtle text-stone-700 border border-border-base",
        )}
      >
        {src ? (
          <img
            src={src}
            srcSet={srcSet}
            sizes={srcSet ? responsiveSizes : undefined}
            alt={name}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        ) : (
          <span>{initials(name)}</span>
        )}
      </div>
      {isVerified ? (
        <span
          className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full px-1 shadow-sm text-success text-micro font-bold"
          title={verifiedLabel}
          aria-label={verifiedLabel}
        >
          ✓
        </span>
      ) : null}
    </div>
  );
}
