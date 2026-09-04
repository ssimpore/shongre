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
} from "lucide-react";
import type { ComponentType } from "react";
import { iconStrokeWidths } from "@shongre/design-tokens";
import { cn } from "../utils/variants";

export type IconName =
  | "bell"
  | "book-open"
  | "briefcase"
  | "camera"
  | "calendar"
  | "check"
  | "chevron-left"
  | "chevron-right"
  | "database"
  | "file"
  | "fuel"
  | "gauge"
  | "heart"
  | "home"
  | "laptop"
  | "layers"
  | "layout-grid"
  | "map-pin"
  | "menu"
  | "message"
  | "plus"
  | "ruler"
  | "search"
  | "settings"
  | "shirt"
  | "shield"
  | "star"
  | "tag"
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
      strokeWidth={iconStrokeWidths.regular}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
    />
  );
}
