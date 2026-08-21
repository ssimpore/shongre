import { themeRadii } from "./theme";

export const radius = {
  ...themeRadii,
  button: themeRadii.control,
  input: themeRadii.control,
  card: themeRadii.card,
  modal: themeRadii.overlay,
  badge: themeRadii.md,
  avatar: themeRadii.pill,
} as const;

export type Radius = typeof radius;
