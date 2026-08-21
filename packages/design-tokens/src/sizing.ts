import { themeContainers, themeControlSizes, themeSpacing } from "./theme";

export const sizing = {
  controls: themeControlSizes,
  components: themeSpacing,
  containers: themeContainers,
} as const;
