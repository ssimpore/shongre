import {
  Bell,
  Camera,
  Calendar,
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
} from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "../utils/variants";

export type IconName =
  | "bell"
  | "camera"
  | "calendar"
  | "check"
  | "chevron-left"
  | "chevron-right"
  | "heart"
  | "home"
  | "map-pin"
  | "menu"
  | "message"
  | "plus"
  | "search"
  | "settings"
  | "shield"
  | "star"
  | "truck"
  | "user"
  | "x";
export interface SemanticIconProps {
  name: IconName;
  size?: "xs" | "sm" | "md" | "lg" | "nav" | "xl";
  label?: string;
  className?: string;
}
const icons: Record<
  IconName,
  ComponentType<{
    className?: string;
    strokeWidth?: number;
    "aria-hidden"?: boolean;
    "aria-label"?: string;
    role?: string;
  }>
> = {
  bell: Bell,
  camera: Camera,
  calendar: Calendar,
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
const iconSizes = {
  xs: "h-icon-xs w-icon-xs",
  sm: "h-icon-sm w-icon-sm",
  md: "h-icon-md w-icon-md",
  lg: "h-icon-lg w-icon-lg",
  nav: "h-icon-nav w-icon-nav",
  xl: "h-icon-xl w-icon-xl",
} as const;
export function SemanticIcon({
  name,
  size = "md",
  label,
  className,
}: SemanticIconProps) {
  const Glyph = icons[name];
  return (
    <Glyph
      className={cn("shrink-0", iconSizes[size], className)}
      strokeWidth={2}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
    />
  );
}
