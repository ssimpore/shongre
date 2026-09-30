import React, { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import {
  buildResponsiveFallbackUrl,
  buildSrcSet,
} from "@shongre/shared/responsive-image";
import {
  getPublicRuntimeConfig,
  resolveOwnedPublicMediaUrl,
} from "../../platform/runtime-config/public-runtime-config";

export interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Required: pass `''` only for images that are purely decorative. */
  alt: string;
  /** Optional owned asset to render when `src` is absent or fails to load. */
  fallbackSrc?: string;
  /** Localized label announced only for the visual fallback. */
  fallbackLabel?: string;
  /** Icon size used by the fallback placeholder. */
  fallbackIconClassName?: string;
  /**
   * Slot width hint, normally one of `IMAGE_SIZES`.
   *
   * Supplying it is what turns on the responsive `srcset` — without a `sizes`
   * value the browser assumes `100vw` and would happily pick a *larger* source
   * than the fixed one it fetches today, so the ladder is opt-in per slot
   * rather than applied blindly.
   */
  sizes?: string;
  /**
   * Marks an image the user is waiting on — a hero or an above-the-fold cover.
   * Opts out of lazy-loading and asks the browser to fetch it early.
   */
  priority?: boolean;
}

/**
 * Marketplace image with a graceful failure state.
 *
 * Listing photos come from third-party URLs that can 404, hotlink-block, or be
 * removed by the seller. A bare `<img>` renders the browser's broken-image
 * chrome in those cases, which looked like a rendering bug rather than missing
 * media. This first tries an owned caller-supplied fallback and otherwise
 * renders the neutral placeholder, while applying the project's standard
 * `loading="lazy"` / `referrerPolicy` defaults.
 *
 * Pass `sizes` and the responsive CDN ladder is derived from `src`, so a
 * 270px card stops downloading an 800px photo.
 * Server-rendered media stays visible without waiting for hydration. The
 * consumer reserves its geometry; the browser paints the image when it loads.
 *
 * No wrapper element is introduced on purpose: consumers position this `<img>`
 * directly inside an aspect-ratio box, and an extra div would break that.
 */
export const Image: React.FC<ImageProps> = ({
  alt,
  className = "",
  fallbackIconClassName = "w-5 h-5",
  fallbackLabel,
  fallbackSrc,
  loading,
  referrerPolicy = "no-referrer",
  decoding = "async",
  onError,
  onLoad,
  sizes,
  priority = false,
  src,
  ...props
}) => {
  const ownedSrc =
    typeof src === "string" ? resolveOwnedPublicMediaUrl(src) : src;
  const [hasFailed, setHasFailed] = useState(false);
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  // A new src deserves a fresh attempt rather than inheriting the failed state.
  // Keep this reset in an effect instead of updating state during render; the
  // latter made a rapidly changing rail do an extra synchronous render for
  // every image and is especially visible while filtering search results.
  useEffect(() => {
    setHasFailed(false);
    setIsUsingFallback(false);
  }, [fallbackSrc, ownedSrc]);

  const isFallbackSource = !ownedSrc || isUsingFallback;
  const resolvedSrc = isFallbackSource ? fallbackSrc : ownedSrc;

  if (hasFailed || !resolvedSrc) {
    return (
      <div
        role="img"
        aria-label={fallbackLabel || alt || "Image indisponible"}
        className={`flex items-center justify-center bg-bg-subtle text-text-muted ${className}`}
      >
        <ImageOff className={fallbackIconClassName} aria-hidden="true" />
      </div>
    );
  }

  const transformOptions = {
    transformMode: getPublicRuntimeConfig().publicMediaImageTransform,
  };
  const srcSet =
    sizes && typeof resolvedSrc === "string"
      ? buildSrcSet(resolvedSrc, transformOptions)
      : undefined;
  const responsiveFallbackSrc =
    sizes && typeof resolvedSrc === "string"
      ? buildResponsiveFallbackUrl(resolvedSrc, sizes, transformOptions)
      : undefined;

  return (
    <img
      src={responsiveFallbackSrc ?? resolvedSrc}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      loading={loading ?? (priority ? "eager" : "lazy")}
      fetchPriority={priority ? "high" : undefined}
      decoding={decoding}
      referrerPolicy={referrerPolicy}
      className={className}
      onLoad={onLoad}
      onError={(e) => {
        if (!isFallbackSource && fallbackSrc) {
          setIsUsingFallback(true);
        } else {
          setHasFailed(true);
        }
        onError?.(e);
      }}
      {...props}
    />
  );
};
