import React from "react";
import {
  Car,
  Home,
  Building2,
  Smartphone,
  Laptop,
  Shirt,
  Bike,
  Wrench,
  Briefcase,
  BriefcaseBusiness,
  Layers,
  Dog,
  PawPrint,
  Trophy,
  Dumbbell,
  Baby,
  BookOpen,
  HardHat,
  Tractor,
  Sun,
  Palmtree,
  Server,
  Globe,
  Gift,
  Truck,
  Anchor,
  Key,
  Store,
  Headphones,
  Camera,
  Gamepad2,
  Music,
  Sparkles,
  GraduationCap,
  Watch,
  Tag,
  Hammer,
  Zap,
  Armchair,
  Footprints,
  Compass,
  Code,
  Tv,
  Leaf,
  Ticket,
  FileKey,
  FileText,
  Folder,
  Heart,
  House,
  KeyRound,
  Package,
  Palette,
  Cpu,
  ShieldCheck,
  ShoppingBag,
  LucideIcon,
} from "lucide-react";
import { colors } from "@shongre/design-tokens";

// Authoritative mapping from iconName to LucideIcon
export const ICON_NAME_MAP: Record<string, LucideIcon> = {
  Car,
  Home,
  Building: Building2,
  Building2,
  Smartphone,
  Phone: Smartphone,
  Laptop,
  Shirt,
  Clothes: Shirt,
  Bike,
  Bicycle: Bike,
  Wrench,
  Tools: Wrench,
  Briefcase,
  Layers,
  Dog,
  PawPrint,
  Cat: PawPrint,
  Trophy,
  Dumbbell,
  Baby,
  BookOpen,
  Book: BookOpen,
  HardHat,
  Tractor,
  Sun,
  Palmtree,
  Server,
  Globe,
  Gift,
  Truck,
  truck: Truck,
  Anchor,
  Ship: Anchor,
  Key,
  Store,
  Headphones,
  Camera,
  Gamepad2,
  Gamepad: Gamepad2,
  Music,
  Sparkles,
  GraduationCap,
  Watch,
  Tag,
  Hammer,
  Zap,
  Armchair,
  Sofa: Armchair,
  Footprints,
  Compass,
  Code,
  Tv,
  Leaf,
  Ticket,
  FileText,
  Folder,
  Heart,
  KeyRound,
  Package,
  Palette,
  Cpu,
  ShieldCheck,
  ShoppingBag,
  // Canonical taxonomy v1 stores Lucide icon names in kebab case. Keep that
  // transport metadata authoritative instead of resolving icons from labels,
  // slugs, or category ids in feature components.
  car: Car,
  building: Building2,
  "briefcase-business": BriefcaseBusiness,
  wrench: Wrench,
  shirt: Shirt,
  house: House,
  smartphone: Smartphone,
  "book-open": BookOpen,
  palmtree: Palmtree,
  "graduation-cap": GraduationCap,
  "paw-print": PawPrint,
  "hard-hat": HardHat,
  tractor: Tractor,
  baby: Baby,
  dumbbell: Dumbbell,
  ticket: Ticket,
  gift: Gift,
  leaf: Leaf,
  "file-key": FileKey,
};

export interface CategoryIconProps {
  category?: { iconName?: string } | null;
  iconName?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  className?: string;
  withBackground?: boolean;
  color?: string;
}

const SIZE_CLASSES = {
  xs: "w-3.5 h-3.5",
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
  xl: "w-8 h-8",
};

const BG_SIZE_CLASSES = {
  xs: "w-6 h-6 rounded-md",
  sm: "w-8 h-8 rounded-lg",
  md: "w-10 h-10 rounded-xl",
  lg: "w-12 h-12 rounded-2xl",
  xl: "w-16 h-16 rounded-2xl",
};

/**
 * Category accents can be configured by taxonomy data, so they cannot be
 * compiled into a finite utility class. Expose the value through one scoped
 * custom property; all visual rules remain centralized in the stylesheet.
 */
const categoryToneStyle = (accent: string): React.CSSProperties =>
  ({ "--category-accent": accent }) as React.CSSProperties;

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  category,
  iconName,
  size = "md",
  className = "",
  withBackground = false,
  color,
}) => {
  const resolvedIconName = iconName ?? category?.iconName;
  const IconComponent =
    (resolvedIconName && ICON_NAME_MAP[resolvedIconName]) || Package;
  const effectiveColor = color ?? colors.category.neutral;

  const sizeClass =
    typeof size === "string" ? SIZE_CLASSES[size] || SIZE_CLASSES.md : "";
  const customPixelSize = typeof size === "number" ? size : undefined;

  if (withBackground) {
    const bgSizeClass =
      typeof size === "string"
        ? BG_SIZE_CLASSES[size] || BG_SIZE_CLASSES.md
        : "w-10 h-10 rounded-xl";

    return (
      <div
        className={`category-icon-tone category-icon-tone-with-background flex items-center justify-center shrink-0 shadow-2xs transition-transform ${bgSizeClass} ${className}`}
        style={categoryToneStyle(effectiveColor)}
      >
        <IconComponent className={sizeClass} size={customPixelSize} />
      </div>
    );
  }

  return (
    <IconComponent
      className={`category-icon-tone ${sizeClass} ${className}`}
      style={categoryToneStyle(effectiveColor)}
      size={customPixelSize}
    />
  );
};
