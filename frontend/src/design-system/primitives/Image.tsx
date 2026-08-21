import React, { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { buildSrcSet } from "./responsiveImage";

export interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Required: pass `''` only for images that are purely decorative. */
  alt: string;
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
 * media. This renders a neutral, on-brand placeholder instead and applies the
 * project's standard `loading="lazy"` / `referrerPolicy` defaults.
 *
 * It also owns the two things every consumer would otherwise have to remember:
 *
 * 1. **Responsive sources.** Pass `sizes` and the CDN ladder is derived from
 *    `src`, so a 270px card stops downloading an 800px photo.
 * 2. **The arrival.** Media fades up over the reserved box instead of popping
 *    in. `duration-fast` is below the reduced-motion threshold the global
 *    stylesheet already neutralises, so it stays honest for that preference.
 *
 * No wrapper element is introduced on purpose: consumers position this `<img>`
 * directly inside an aspect-ratio box, and an extra div would break that.
 */
export const Image: React.FC<ImageProps> = ({
  alt,
  className = "",
  fallbackIconClassName = "w-5 h-5",
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
  const [hasFailed, setHasFailed] = useState(false);
  const [hasArrived, setHasArrived] = useState(false);

  // A new src deserves a fresh attempt rather than inheriting the failed state.
  // Keep this reset in an effect instead of updating state during render; the
  // latter made a rapidly changing rail do an extra synchronous render for
  // every image and is especially visible while filtering search results.
  useEffect(() => {
    setHasFailed(false);
    setHasArrived(false);
  }, [src]);

  if (hasFailed || !src) {
    return (
      <div
        role="img"
        aria-label={alt || "Image indisponible"}
        className={`flex items-center justify-center bg-bg-subtle text-stone-500 ${className}`}
      >
        <ImageOff className={fallbackIconClassName} aria-hidden="true" />
      </div>
    );
  }

  const srcSet =
    sizes && typeof src === "string" ? buildSrcSet(src) : undefined;

  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      loading={loading ?? (priority ? "eager" : "lazy")}
      fetchPriority={priority ? "high" : undefined}
      decoding={decoding}
      referrerPolicy={referrerPolicy}
      className={`${className} transition-opacity duration-fast ${hasArrived ? "opacity-100" : "opacity-0"}`}
      /* A cached image can finish before React attaches `onLoad`, which would
         strand it at `opacity-0`. The ref settles that case on mount. */
      ref={(node) => {
        if (node?.complete) setHasArrived(true);
      }}
      onLoad={(e) => {
        setHasArrived(true);
        onLoad?.(e);
      }}
      onError={(e) => {
        setHasFailed(true);
        onError?.(e);
      }}
      {...props}
    />
  );
};
