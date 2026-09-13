import {
  Bell,
  BatteryCharging,
  BedDouble,
  Bath,
  Car,
  Clock,
  Cpu,
  DoorOpen,
  FileCheck,
  Globe,
  Leaf,
  Package,
  Palette,
  PawPrint,
  Plug,
  ShieldAlert,
  Sofa,
  Users,
  Wifi,
  Wrench,
  Music,
  Ticket,
  Thermometer,
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
  Flame,
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
  Rocket,
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
  | "battery"
  | "bed"
  | "bath"
  | "car"
  | "clock"
  | "cpu"
  | "door"
  | "file-check"
  | "globe"
  | "leaf"
  | "package"
  | "palette"
  | "paw"
  | "plug"
  | "shield-alert"
  | "sofa"
  | "users"
  | "wifi"
  | "wrench"
  | "music"
  | "ticket"
  | "thermometer"
  | "book-open"
  | "briefcase"
  | "camera"
  | "calendar"
  | "check"
  | "chevron-left"
  | "chevron-right"
  | "database"
  | "file"
  | "flame"
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
  | "rocket"
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
  filled?: boolean;
}
const icons: Record<
  IconName,
  ComponentType<{
    className?: string;
    strokeWidth?: number;
    fill?: string;
    "aria-hidden"?: boolean;
    "aria-label"?: string;
    role?: string;
  }>
> = {
  bell: Bell,
  battery: BatteryCharging,
  bed: BedDouble,
  bath: Bath,
  car: Car,
  clock: Clock,
  cpu: Cpu,
  door: DoorOpen,
  "file-check": FileCheck,
  globe: Globe,
  leaf: Leaf,
  package: Package,
  palette: Palette,
  paw: PawPrint,
  plug: Plug,
  "shield-alert": ShieldAlert,
  sofa: Sofa,
  users: Users,
  wifi: Wifi,
  wrench: Wrench,
  music: Music,
  ticket: Ticket,
  thermometer: Thermometer,
  "book-open": BookOpen,
  briefcase: BriefcaseBusiness,
  camera: Camera,
  calendar: Calendar,
  check: Check,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  database: Database,
  file: FileText,
  flame: Flame,
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
  rocket: Rocket,
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
  filled = false,
}: SemanticIconProps) {
  const Glyph = icons[name];
  return (
    <Glyph
      className={cn("shrink-0", iconSizes[size], className)}
      strokeWidth={iconStrokeWidths.regular}
      fill={filled ? "currentColor" : "none"}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
    />
  );
}
