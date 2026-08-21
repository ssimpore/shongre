import {
  Bell,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  Home,
  MapPin,
  Menu,
  MessageCircle,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Truck,
  User,
  X,
} from "lucide-react-native";
import type { ComponentType } from "react";
import type { ColorValue } from "react-native";
import { nativeSizing } from "@shongre/design-tokens/native";
import type { IconName } from "./Icon.web";
export type { IconName } from "./Icon.web";

export interface SemanticIconProps {
  name: IconName;
  size?: "xs" | "sm" | "md" | "lg" | "nav" | "xl";
  label?: string;
  color?: ColorValue;
}
const icons: Record<
  IconName,
  ComponentType<{
    size?: number;
    color?: ColorValue;
    strokeWidth?: number;
    accessibilityLabel?: string;
    accessible?: boolean;
  }>
> = {
  bell: Bell,
  camera: Camera,
  check: Check,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  heart: Heart,
  home: Home,
  "map-pin": MapPin,
  menu: Menu,
  message: MessageCircle,
  plus: Plus,
  search: Search,
  settings: Settings,
  shield: ShieldCheck,
  star: Star,
  truck: Truck,
  user: User,
  x: X,
};
const sizes = {
  xs: 12,
  sm: nativeSizing.iconSm,
  md: nativeSizing.iconMd,
  lg: nativeSizing.iconLg,
  nav: 22,
  xl: nativeSizing.iconXl,
} as const;
export function SemanticIcon({
  name,
  size = "md",
  label,
  color,
}: SemanticIconProps) {
  const Glyph = icons[name];
  return (
    <Glyph
      size={sizes[size]}
      color={color}
      strokeWidth={2}
      accessible={Boolean(label)}
      accessibilityLabel={label}
    />
  );
}
