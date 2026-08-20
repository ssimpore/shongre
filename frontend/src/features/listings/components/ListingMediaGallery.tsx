import React, { useState, useEffect, useCallback } from 'react';
import { Image } from '../../../design-system/primitives/Image';
import { IMAGE_SIZES, buildSrcSet } from '../../../design-system/primitives/responsiveImage';
import { Camera, ChevronLeft, ChevronRight, Maximize2, X, Image as ImageIcon } from 'lucide-react';
import { useDialogBehavior } from '../../../design-system/primitives/useDialogBehavior';
import { ListingPhoto } from '../../../types';
import { useTranslation } from '../../../i18n/I18nProvider';

export interface ListingMediaGalleryProps {
  photos: ListingPhoto[];
  title: string;
  className?: string;
}

export const ListingMediaGallery: React.FC<ListingMediaGalleryProps> = ({
  photos = [],
  title,
  className = '',
}) => {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Normalize photo URLs
  const photoList: string[] = photos.length > 0
    ? photos.map((p) => (typeof p === 'string' ? p : p.url)).filter(Boolean)
    : [];

  const hasPhotos = photoList.length > 0;
  const currentUrl = hasPhotos ? photoList[activeIndex] : null;

  const handlePrev = useCallback(() => {
    if (!hasPhotos) return;
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : photoList.length - 1));
  }, [hasPhotos, photoList.length]);

  const handleNext = useCallback(() => {
    if (!hasPhotos) return;
    setActiveIndex((prev) => (prev < photoList.length - 1 ? prev + 1 : 0));
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
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
  };

  // Keyboard navigation for gallery & lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'Escape' && isLightboxOpen) {
        setIsLightboxOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext, isLightboxOpen]);

  if (!hasPhotos) {
    return (
      <div className={`bg-stone-100 rounded-2xl border border-border-base aspect-16/10 flex flex-col items-center justify-center text-stone-500 gap-2 ${className}`}>
        <ImageIcon className="w-12 h-12" />
        <span className="text-xs font-semibold">Aucune photo fournie</span>
      </div>
    );
  }

  // The lightbox handled Escape but nothing else: focus stayed on the page
  // behind it and was never restored on close.
  const { containerRef: lightboxRef, titleId: lightboxTitleId } = useDialogBehavior(
    isLightboxOpen,
    () => setIsLightboxOpen(false)
  );
  return (
    <div className={`bg-white rounded-2xl border border-border-base overflow-hidden shadow-xs space-y-0 ${className}`}>
      {/* Main Large Viewport with Touch Gestures */}
      <div
        className="relative aspect-4/3 sm:aspect-16/10 bg-stone-100 flex items-center justify-center overflow-hidden group select-none touch-pan-y"
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
          alt={`${title} - Photo ${activeIndex + 1}`}
          sizes={IMAGE_SIZES.gallery}
          priority
          onClick={() => setIsLightboxOpen(true)}
          className="relative w-full h-full object-contain cursor-zoom-in transition-transform duration-normal hover:scale-[1.02]"
          referrerPolicy="no-referrer"
        />

        {/* Prev / Next buttons if multiple photos */}
        {photoList.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              aria-label={t('listings.listingMediaGallery.photoPrecedente')}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-control-md rounded-full bg-stone-900/75 hover:bg-stone-900 text-white flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 cursor-pointer shadow-md focus:outline-none focus:ring-2 focus:ring-primary z-raised"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              aria-label="Photo suivante"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-control-md rounded-full bg-stone-900/75 hover:bg-stone-900 text-white flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 cursor-pointer shadow-md focus:outline-none focus:ring-2 focus:ring-primary z-raised"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Mobile Pagination Dots Indicator (if multiple photos) */}
        {photoList.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-raised sm:hidden bg-stone-900/70 backdrop-blur-xs px-2.5 py-1 rounded-full pointer-events-none">
            {photoList.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  activeIndex === idx ? 'w-4 bg-primary' : 'w-1.5 bg-white/60'
                }`}
              />
            ))}
          </div>
        )}

        {/* Bottom controls bar: Counter & Fullscreen trigger */}
        <div className="absolute bottom-3 inset-x-3 flex items-center justify-between pointer-events-none z-raised">
          <span className="hidden sm:inline-flex bg-stone-900/80 backdrop-blur-md text-white text-xs px-3 py-1 rounded-full items-center gap-1.5 font-bold shadow-xs">
            <Camera className="w-3.5 h-3.5" />
            <span>
              {activeIndex + 1} / {photoList.length}
            </span>
          </span>

          <button
            type="button"
            onClick={() => setIsLightboxOpen(true)}
            aria-label={t('listings.listingMediaGallery.agrandirEnPleinEcran')}
            className="pointer-events-auto ml-auto bg-stone-900/80 hover:bg-stone-900 backdrop-blur-md text-white text-xs p-1.5 rounded-full flex items-center justify-center transition-colors cursor-pointer shadow-xs"
          >
            <Maximize2 className="w-4 h-4" />
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
              aria-current={activeIndex === idx ? 'true' : undefined}
              className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer bg-stone-100 ${
                activeIndex === idx
                  ? 'border-primary ring-2 ring-primary/20 scale-95 opacity-100'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <Image src={imgUrl} alt="" sizes={IMAGE_SIZES.thumb} className="w-full h-full object-cover" fallbackIconClassName="w-4 h-4" />
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
            <span id={lightboxTitleId} className="text-xs sm:text-sm font-bold text-stone-300">
              {title} ({activeIndex + 1} / {photoList.length})
            </span>
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              aria-label={t('listings.listingMediaGallery.fermerLePleinEcran')}
              className="p-2 rounded-full bg-stone-800/80 hover:bg-stone-700 text-white transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Main Large Image */}
          <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden">
            <Image
              src={currentUrl!}
              alt={`${title} - Grand format`}
              sizes={IMAGE_SIZES.gallery}
              className="max-h-[80vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
              referrerPolicy="no-referrer"
            />

            {photoList.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label={t('listings.listingMediaGallery.photoPrecedente')}
                  className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-12 h-control-lg rounded-full bg-stone-800/80 hover:bg-stone-700 text-white flex items-center justify-center transition-colors cursor-pointer shadow-lg"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Photo suivante"
                  className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-12 h-control-lg rounded-full bg-stone-800/80 hover:bg-stone-700 text-white flex items-center justify-center transition-colors cursor-pointer shadow-lg"
                >
                  <ChevronRight className="w-6 h-6" />
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
                    activeIndex === idx ? 'border-primary ring-2 ring-primary/40' : 'border-transparent opacity-50 hover:opacity-90'
                  }`}
                >
                  <Image src={imgUrl} alt="" sizes={IMAGE_SIZES.thumb} className="w-full h-full object-cover" fallbackIconClassName="w-4 h-4" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
