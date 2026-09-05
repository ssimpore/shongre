import { webBrandAssets } from "@shongre/brand/web";

export type BrandLogoVariant =
  "primary" | "reverse" | "mono-ink" | "mono-white" | "mono-orange";

export type BrandLogoLayout = "horizontal" | "stacked" | "wordmark";
export type BrandLogoSize = "compact" | "standard" | "prominent";
export type BrandIconVariant = Exclude<BrandLogoVariant, "reverse">;
export type BrandIconSize = "minimum" | "compact" | "standard" | "prominent";
export type BrandHeaderSignatureVariant = Extract<
  BrandLogoVariant,
  "primary" | "reverse"
>;
export type BrandHeaderSignatureSize = "compact" | "standard";
export type BrandMarketLabelVisibility = "always" | "desktop";

interface ApprovedLogoAsset {
  src: string;
  width: number;
  height: number;
  srcSet?: string;
}

const logoAssets: Partial<
  Record<BrandLogoLayout, Partial<Record<BrandLogoVariant, ApprovedLogoAsset>>>
> = webBrandAssets.logo;

const logoSizeClasses: Record<BrandLogoSize, string> = {
  compact: "w-30",
  standard: "w-38",
  prominent: "w-48",
};

const logoRenderedSizes: Record<BrandLogoSize, string> = {
  compact: "120px",
  standard: "152px",
  prominent: "192px",
};

const primaryIconAsset: ApprovedLogoAsset = webBrandAssets.icon.primary;

const iconAssets: Record<BrandIconVariant, ApprovedLogoAsset> = {
  primary: primaryIconAsset,
  "mono-ink": webBrandAssets.icon["mono-ink"],
  "mono-white": webBrandAssets.icon["mono-white"],
  "mono-orange": webBrandAssets.icon["mono-orange"],
};

const iconSizeClasses: Record<BrandIconSize, string> = {
  minimum: "w-6",
  compact: "w-7",
  standard: "w-9",
  prominent: "w-12",
};

const headerSignatureSizeClasses: Record<
  BrandHeaderSignatureSize,
  { icon: string; wordmark: string }
> = {
  compact: {
    icon: "h-brand-signature-icon-compact w-brand-signature-icon-compact",
    wordmark: "w-brand-signature-wordmark-compact",
  },
  standard: {
    icon: "h-brand-signature-icon-standard w-brand-signature-icon-standard",
    wordmark: "w-brand-signature-wordmark-standard",
  },
};

interface AccessibleBrandImageProps {
  /** Empty alternative text and aria-hidden for a redundant brand mark. */
  decorative?: boolean;
  /** Contextual label. The official signature remains the safe default. */
  alt?: string;
  /** Reserve eager/high-priority loading for above-the-fold brand marks. */
  priority?: boolean;
}

export interface BrandLogoProps extends AccessibleBrandImageProps {
  variant?: BrandLogoVariant;
  layout?: BrandLogoLayout;
  size?: BrandLogoSize;
}

export function BrandLogo({
  variant = "primary",
  layout = "horizontal",
  size = "standard",
  decorative = false,
  alt = "SHONGRE.",
  priority = false,
}: BrandLogoProps) {
  const asset = logoAssets[layout]?.[variant];
  if (!asset) {
    throw new Error(
      `Unsupported SHONGRE. logo combination: ${layout}/${variant}`,
    );
  }
  return (
    <span
      className="inline-flex shrink-0 items-center p-2"
      data-brand-logo={`${layout}/${variant}`}
    >
      <img
        src={asset.src}
        srcSet={asset.srcSet}
        sizes={asset.srcSet ? logoRenderedSizes[size] : undefined}
        width={asset.width}
        height={asset.height}
        className={`${logoSizeClasses[size]} block h-auto max-w-full object-contain`}
        alt={decorative ? "" : alt}
        aria-hidden={decorative || undefined}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
      />
    </span>
  );
}

export interface BrandIconProps extends AccessibleBrandImageProps {
  variant?: BrandIconVariant;
  size?: BrandIconSize;
}

export interface BrandHeaderSignatureProps extends AccessibleBrandImageProps {
  variant?: BrandHeaderSignatureVariant;
  size?: BrandHeaderSignatureSize;
  /** Optional market name positioned beneath the wordmark, never beneath the icon. */
  marketLabel?: string;
  marketLabelVisibility?: BrandMarketLabelVisibility;
}

/**
 * Compact signature with independently governed icon and wordmark sizes.
 * The mask-safe PWA icon accepts only the restrained design-system radius and
 * stays legible without stretching or modifying either approved artwork asset.
 */
export function BrandHeaderSignature({
  variant = "primary",
  size = "compact",
  marketLabel,
  marketLabelVisibility = "always",
  decorative = false,
  alt = "SHONGRE.",
  priority = false,
}: BrandHeaderSignatureProps) {
  const sizeClasses = headerSignatureSizeClasses[size];
  const wordmark = logoAssets.wordmark?.[variant];
  if (!wordmark) {
    throw new Error(`Missing approved SHONGRE. ${variant} wordmark`);
  }

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5"
      data-brand-signature={variant}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : alt}
      aria-hidden={decorative || undefined}
    >
      <img
        src={primaryIconAsset.src}
        width={primaryIconAsset.width}
        height={primaryIconAsset.height}
        className={`${sizeClasses.icon} block shrink-0 rounded-sm object-contain`}
        alt=""
        aria-hidden="true"
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
      />
      <span className="inline-flex min-w-0 flex-col items-center justify-center gap-0.5">
        <img
          src={wordmark.src}
          width={wordmark.width}
          height={wordmark.height}
          className={`${sizeClasses.wordmark} block h-auto shrink-0 object-contain`}
          alt=""
          aria-hidden="true"
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
        />
        {marketLabel ? (
          <span
            className={`${marketLabelVisibility === "desktop" ? "hidden lg:block" : "block"} max-w-full truncate text-overline font-semibold uppercase leading-none tracking-wider text-text-tertiary`}
            data-brand-market-label
            aria-hidden="true"
          >
            {marketLabel}
          </span>
        ) : null}
      </span>
    </span>
  );
}

export function BrandIcon({
  variant = "primary",
  size = "standard",
  decorative = false,
  alt = "SHONGRE.",
  priority = false,
}: BrandIconProps) {
  const asset = iconAssets[variant];
  return (
    <img
      src={asset.src}
      width={asset.width}
      height={asset.height}
      className={`${iconSizeClasses[size]} block h-auto shrink-0 ${variant === "primary" ? "rounded-sm" : ""} object-contain`}
      data-brand-icon={variant}
      alt={decorative ? "" : alt}
      aria-hidden={decorative || undefined}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
    />
  );
}
