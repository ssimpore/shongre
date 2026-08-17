import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';

export interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Required: pass `''` only for images that are purely decorative. */
  alt: string;
  /** Icon size used by the fallback placeholder. */
  fallbackIconClassName?: string;
}

/**
 * Marketplace image with a graceful failure state.
 *
 * Listing photos come from third-party URLs that can 404, hotlink-block, or be
 * removed by the seller. A bare `<img>` renders the browser's broken-image
 * chrome in those cases, which looked like a rendering bug rather than missing
 * media. This renders a neutral, on-brand placeholder instead and applies the
 * project's standard `loading="lazy"` / `referrerPolicy` defaults.
 */
export const Image: React.FC<ImageProps> = ({
  alt,
  className = '',
  fallbackIconClassName = 'w-5 h-5',
  loading = 'lazy',
  referrerPolicy = 'no-referrer',
  onError,
  src,
  ...props
}) => {
  const [hasFailed, setHasFailed] = useState(false);

  // A new src deserves a fresh attempt rather than inheriting the failed state.
  const [lastSrc, setLastSrc] = useState(src);
  if (src !== lastSrc) {
    setLastSrc(src);
    setHasFailed(false);
  }

  if (hasFailed || !src) {
    return (
      <div
        role="img"
        aria-label={alt || 'Image indisponible'}
        className={`flex items-center justify-center bg-bg-subtle text-stone-500 ${className}`}
      >
        <ImageOff className={fallbackIconClassName} aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      referrerPolicy={referrerPolicy}
      className={className}
      onError={(e) => {
        setHasFailed(true);
        onError?.(e);
      }}
      {...props}
    />
  );
};
