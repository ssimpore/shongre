import {
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Camera,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Database,
  FileText,
  Fuel,
  Gauge,
  Heart,
  Home,
  ImageOff,
  Laptop,
  Layers3,
  LayoutGrid,
  MapPin,
  Menu,
  MessageCircle,
  Plus,
  RefreshCw,
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
  Zap,
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
  | "image-off"
  | "laptop"
  | "layers"
  | "layout-grid"
  | "map-pin"
  | "menu"
  | "message"
  | "payment"
  | "plus"
  | "refresh"
  | "ruler"
  | "search"
  | "settings"
  | "shirt"
  | "shield"
  | "star"
  | "tag"
  | "truck"
  | "user"
  | "x"
  | "zap";
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
  "image-off": ImageOff,
  laptop: Laptop,
  layers: Layers3,
  "layout-grid": LayoutGrid,
  "map-pin": MapPin,
  menu: Menu,
  message: MessageCircle,
  payment: CreditCard,
  plus: Plus,
  refresh: RefreshCw,
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
  zap: Zap,
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
