/**
 * The viewport matrix the product is held to.
 *
 * 787 is not a device width — it is the awkward gap just past the `md`
 * breakpoint where a header built for desktop and a header built for mobile
 * both stop being right, and it is where the tablet regressions actually
 * appeared.
 *
 * 1024 is the `lg` boundary itself, and it is a device width: iPad landscape.
 * It was the one common width nothing covered, which is how the header search
 * field shipped collapsing from 499px to a 32px sliver on crossing it. Keep the
 * 1023/1024 pair in mind when touching the header — the whole failure lived in
 * the single pixel between them.
 *
 * The others are the common phone, tablet and laptop widths.
 */
export const VIEWPORTS = [
  { name: '320-small-phone', width: 320, height: 720 },
  { name: '375-iphone-se', width: 375, height: 812 },
  { name: '390-iphone-14', width: 390, height: 844 },
  { name: '430-iphone-pro-max', width: 430, height: 932 },
  { name: '768-tablet-portrait', width: 768, height: 1024 },
  { name: '787-awkward-gap', width: 787, height: 1024 },
  { name: '834-ipad-air', width: 834, height: 1112 },
  { name: '1023-just-below-lg', width: 1023, height: 900 },
  { name: '1024-lg-breakpoint', width: 1024, height: 768 },
  { name: '1280-laptop', width: 1280, height: 800 },
  { name: '1440-desktop', width: 1440, height: 900 },
] as const;
