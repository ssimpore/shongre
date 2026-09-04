import {
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Camera,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Database,
  FileText,
  Fuel,
  Gauge,
  Heart,
  Home,
  Laptop,
  Layers3,
  LayoutGrid,
  MapPin,
  Menu,
  MessageCircle,
  Plus,
  Ruler,
  Search,
  Settings,
  Shirt,
  ShieldCheck,
  Star,
  Tag,
  Truck,
  User,
  X,
} from "lucide-react-native";
import type { ComponentType } from "react";
import { Platform, type ColorValue } from "react-native";
import { iconStrokeWidths, nativeSizing } from "@shongre/design-tokens/native";
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
  "book-open": BookOpen,
  briefcase: BriefcaseBusiness,
  camera: Camera,
  calendar: Calendar,
  check: Check,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  database: Database,
  file: FileText,
  fuel: Fuel,
  gauge: Gauge,
  heart: Heart,
  home: Home,
  laptop: Laptop,
  layers: Layers3,
  "layout-grid": LayoutGrid,
  "map-pin": MapPin,
  menu: Menu,
  message: MessageCircle,
  plus: Plus,
  ruler: Ruler,
  search: Search,
  settings: Settings,
  shirt: Shirt,
  shield: ShieldCheck,
  star: Star,
  tag: Tag,
  truck: Truck,
  user: User,
  x: X,
};
const sizes = {
  xs: nativeSizing.iconXs,
  sm: nativeSizing.iconSm,
  md: nativeSizing.iconMd,
  lg: nativeSizing.iconLg,
  nav: nativeSizing.iconNav,
  xl: nativeSizing.iconXl,
} as const;
export function SemanticIcon({
  name,
  size = "md",
  label,
  color,
}: SemanticIconProps) {
  const Glyph = icons[name];
  const accessibilityProps =
    Platform.OS === "web"
      ? { accessibilityLabel: label }
      : { accessible: Boolean(label), accessibilityLabel: label };
  return (
    <Glyph
      size={sizes[size]}
      color={color}
      strokeWidth={iconStrokeWidths.regular}
      {...accessibilityProps}
    />
  );
}
