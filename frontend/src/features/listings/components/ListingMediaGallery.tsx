import React, { useState, useCallback } from "react";
import { Image } from "../../../design-system/primitives/Image";
import {
  IMAGE_SIZES,
  buildSrcSet,
} from "../../../design-system/primitives/responsiveImage";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { useDialogBehavior } from "../../../design-system/primitives/useDialogBehavior";
import { ListingPhoto } from "../../../types";
import { useTranslation } from "../../../i18n/I18nProvider";

export interface ListingMediaGalleryProps {
  photos: Array<ListingPhoto | string>;
  title: string;
  overlayActions?: React.ReactNode;
  className?: string;
  viewportAspectClassName?: string;
}

export const ListingMediaGallery: React.FC<ListingMediaGalleryProps> = ({
  photos = [],
  title,
  overlayActions,
  className = "",
  viewportAspectClassName = "aspect-4/3 sm:aspect-16/10",
}) => {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Normalize photo URLs
  const photoList: string[] =
    photos.length > 0
      ? photos.map((p) => (typeof p === "string" ? p : p.url)).filter(Boolean)
      : [];

  const hasPhotos = photoList.length > 0;
  const safeActiveIndex = Math.min(
    activeIndex,
    Math.max(photoList.length - 1, 0),
  );
  const currentUrl = hasPhotos ? photoList[safeActiveIndex] : null;

  const handlePrev = useCallback(() => {
    if (!hasPhotos) return;
    setActiveIndex((previous) => {
      const current = Math.min(previous, photoList.length - 1);
      return current > 0 ? current - 1 : photoList.length - 1;
    });
  }, [hasPhotos, photoList.length]);

  const handleNext = useCallback(() => {
    if (!hasPhotos) return;
    setActiveIndex((previous) => {
      const current = Math.min(previous, photoList.length - 1);
      return current < photoList.length - 1 ? current + 1 : 0;
    });
  }, [hasPhotos, photoList.length]);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (touchStart === null || touchEnd === null) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      handlePrev();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      handleNext();
    }
  };

  // The lightbox handled Escape but nothing else: focus stayed on the page
  // behind it and was never restored on close.
  const { containerRef: lightboxRef, titleId: lightboxTitleId } =
    useDialogBehavior(isLightboxOpen, () => setIsLightboxOpen(false));

  if (!hasPhotos) {
    return (
      <div
        className={`relative bg-stone-100 rounded-2xl border border-border-base aspect-16/10 flex flex-col items-center justify-center text-stone-500 gap-2 ${className}`}
      >
        {overlayActions ? (
          <div
            data-listing-gallery-actions="true"
            className="absolute right-3 top-3 z-raised flex items-center gap-2"
          >
            {overlayActions}
          </div>
        ) : null}
        <ImageIcon className="w-12 h-12" />
        <span className="text-xs font-semibold">Aucune photo fournie</span>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-2xl border border-border-base overflow-hidden shadow-xs space-y-0 ${className}`}
      onKeyDown={handleKeyDown}
    >
      <span className="sr-only" role="status" aria-live="polite">
        {t("listings.listingMediaGallery.photoPosition", {
          current: safeActiveIndex + 1,
          total: photoList.length,
        })}
      </span>
      {/* Main Large Viewport with Touch Gestures */}
      <div
        className={`relative ${viewportAspectClassName} bg-stone-100 flex items-center justify-center overflow-hidden group select-none touch-pan-y`}
        role="group"
        aria-label={t("listings.listingMediaGallery.galleryLabel", {
          total: photoList.length,
        })}
        tabIndex={0}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Ambient backdrop.
            Catalogue photography is mostly portrait while this frame is
            landscape, so `object-contain` — which we keep, because cropping a
            product photo hides what is being sold — left up to 60% of the frame
            as flat black. A blurred, over-scaled copy of the same photo fills
            that space with something that belongs to the image. Decorative:
            hidden from assistive tech, and it simply does not paint if the
            source fails. */}
        <img
          src={currentUrl!}
          srcSet={buildSrcSet(currentUrl!)}
          sizes={IMAGE_SIZES.gallery}
          alt=""
          aria-hidden="true"
          decoding="async"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-45 pointer-events-none"
        />
        <Image
          src={currentUrl!}
          alt={`${title} - Photo ${safeActiveIndex + 1}`}
          sizes={IMAGE_SIZES.gallery}
          priority
          onClick={() => setIsLightboxOpen(true)}
          className="relative w-full h-full object-contain cursor-zoom-in transition-transform duration-normal hover:scale-105"
          referrerPolicy="no-referrer"
        />

        {overlayActions ? (
          <div
            data-listing-gallery-actions="true"
            className="absolute right-3 top-3 z-raised flex items-center gap-2"
          >
            {overlayActions}
          </div>
        ) : null}

        {/* Prev / Next buttons if multiple photos */}
        {photoList.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              aria-label={t("listings.listingMediaGallery.photoPrecedente")}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-control-md rounded-full bg-stone-900/75 hover:bg-stone-900 text-white flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 cursor-pointer shadow-md focus:outline-none focus:ring-2 focus:ring-primary z-raised"
            >
              <ChevronLeft className="w-icon-lg h-icon-lg" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              aria-label={t("listings.listingMediaGallery.photoSuivante")}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-control-md rounded-full bg-stone-900/75 hover:bg-stone-900 text-white flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 cursor-pointer shadow-md focus:outline-none focus:ring-2 focus:ring-primary z-raised"
            >
              <ChevronRight className="w-icon-lg h-icon-lg" />
            </button>
          </>
        )}

        {/* Mobile Pagination Dots Indicator (if multiple photos) */}
        {photoList.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-raised sm:hidden bg-overlay-scrim backdrop-blur-xs px-2.5 py-1 rounded-full pointer-events-none">
            {photoList.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  safeActiveIndex === idx
                    ? "w-4 bg-primary"
                    : "w-1.5 bg-white/60"
                }`}
              />
            ))}
          </div>
        )}

        {/* Bottom controls bar: Counter & Fullscreen trigger */}
        <div className="absolute bottom-3 inset-x-3 flex items-center justify-between pointer-events-none z-raised">
          <span className="hidden sm:inline-flex bg-stone-900/80 backdrop-blur-md text-white text-xs px-3 py-1 rounded-full items-center gap-1.5 font-bold shadow-xs">
            <Camera className="w-icon-sm h-icon-sm" />
            <span>
              {safeActiveIndex + 1} / {photoList.length}
            </span>
          </span>

          <button
            type="button"
            onClick={() => setIsLightboxOpen(true)}
            aria-label={t("listings.listingMediaGallery.agrandirEnPleinEcran")}
            className="pointer-events-auto ml-auto bg-stone-900/80 hover:bg-stone-900 backdrop-blur-md text-white text-xs p-1.5 rounded-full flex items-center justify-center transition-colors cursor-pointer shadow-xs"
          >
            <Maximize2 className="w-icon-md h-icon-md" />
          </button>
        </div>
      </div>

      {/* Thumbnail Strip (Desktop & Tablet) */}
      {photoList.length > 1 && (
        <div className="p-3 bg-bg-base/60 border-t border-border-base hidden sm:flex gap-2.5 overflow-x-auto no-scrollbar">
          {photoList.map((imgUrl, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIndex(idx)}
              aria-label={`Afficher la photo ${idx + 1} sur ${photoList.length}`}
              aria-current={safeActiveIndex === idx ? "true" : undefined}
              className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer bg-stone-100 ${
                safeActiveIndex === idx
                  ? "border-primary ring-2 ring-primary/20 scale-95 opacity-100"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <Image
                src={imgUrl}
                alt=""
                sizes={IMAGE_SIZES.thumb}
                className="w-full h-full object-cover"
                fallbackIconClassName="w-4 h-4"
              />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {isLightboxOpen && (
        <div
          ref={lightboxRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={lightboxTitleId}
          tabIndex={-1}
          className="fixed inset-0 z-modal bg-black/95 flex flex-col justify-between p-4 sm:p-6 backdrop-blur-md animate-fade-in"
        >
          {/* Top bar */}
          <div className="flex items-center justify-between text-white z-raised">
            <span
              id={lightboxTitleId}
              className="text-xs sm:text-sm font-bold text-stone-300"
            >
              {title} ({safeActiveIndex + 1} / {photoList.length})
            </span>
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              aria-label={t("listings.listingMediaGallery.fermerLePleinEcran")}
              className="p-2 rounded-full bg-stone-800/80 hover:bg-stone-700 text-white transition-colors cursor-pointer"
            >
              <X className="w-icon-xl h-icon-xl" />
            </button>
          </div>

          {/* Main Large Image */}
          <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden">
            <Image
              src={currentUrl!}
              alt={`${title} - Grand format`}
              sizes={IMAGE_SIZES.gallery}
              className="max-h-media-preview-max-height max-w-dialog-viewport-max-width object-contain rounded-lg shadow-2xl"
              referrerPolicy="no-referrer"
            />

            {photoList.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label={t("listings.listingMediaGallery.photoPrecedente")}
                  className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-12 h-control-lg rounded-full bg-stone-800/80 hover:bg-stone-700 text-white flex items-center justify-center transition-colors cursor-pointer shadow-lg"
                >
                  <ChevronLeft className="w-icon-xl h-icon-xl" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label={t("listings.listingMediaGallery.photoSuivante")}
                  className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-12 h-control-lg rounded-full bg-stone-800/80 hover:bg-stone-700 text-white flex items-center justify-center transition-colors cursor-pointer shadow-lg"
                >
                  <ChevronRight className="w-icon-xl h-icon-xl" />
                </button>
              </>
            )}
          </div>

          {/* Lightbox Thumbnails Bottom */}
          {photoList.length > 1 && (
            <div className="flex justify-center gap-2 overflow-x-auto py-2 z-raised">
              {photoList.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                    safeActiveIndex === idx
                      ? "border-primary ring-2 ring-primary/40"
                      : "border-transparent opacity-50 hover:opacity-90"
                  }`}
                >
                  <Image
                    src={imgUrl}
                    alt=""
                    sizes={IMAGE_SIZES.thumb}
                    className="w-full h-full object-cover"
                    fallbackIconClassName="w-4 h-4"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
