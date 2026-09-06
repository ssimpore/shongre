export function homepageVisibilityClass(input: {
  mobileVisible: boolean;
  desktopVisible: boolean;
}): string {
  if (input.mobileVisible && input.desktopVisible) return "";
  if (input.mobileVisible) return "sm:hidden";
  if (input.desktopVisible) return "hidden sm:block";
  return "hidden";
}
