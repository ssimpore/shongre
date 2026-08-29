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
  LucideIcon,
} from "lucide-react";
import { colors } from "@shongre/design-tokens";
import { TaxonomyNode } from "../../domains/taxonomy/taxonomy.types";
import { Category } from "../../types";

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
};

// Fallback mapping by category slug or code
export const CATEGORY_SLUG_ICON_MAP: Record<
  string,
  { icon: LucideIcon; color: string }
> = {
  // 1. Véhicules
  vehicules: { icon: Car, color: colors.category.vehicles },
  vehicles: { icon: Car, color: colors.category.vehicles },
  "vehicles.cars": { icon: Car, color: colors.category.vehicles },
  "vehicles.motorcycles": { icon: Bike, color: colors.category.vehicles },
  "vehicles.utility": { icon: Truck, color: colors.category.vehicles },
  "vehicles.caravaning": { icon: Compass, color: colors.category.vehicles },
  "vehicles.nautism": { icon: Anchor, color: colors.category.vehicles },
  "vehicles.parts": { icon: Wrench, color: colors.category.vehicles },

  // 2. Immobilier
  immobilier: { icon: Building2, color: colors.category.realEstate },
  real_estate: { icon: Building2, color: colors.category.realEstate },
  "real_estate.sales": { icon: Home, color: colors.category.realEstate },
  "real_estate.rentals": { icon: Key, color: colors.category.realEstate },
  "real_estate.commercial": { icon: Store, color: colors.category.realEstate },

  // 3. Emploi
  emploi: { icon: Briefcase, color: colors.category.tech },
  jobs: { icon: Briefcase, color: colors.category.tech },
  "jobs.tech": { icon: Code, color: colors.category.tech },
  "jobs.sales": { icon: Briefcase, color: colors.category.tech },

  // 4. Services
  "services-prestations": { icon: Wrench, color: colors.category.services },
  services: { icon: Wrench, color: colors.category.services },
  "services.home": { icon: Hammer, color: colors.category.services },
  "services.tutoring": { icon: GraduationCap, color: colors.category.services },

  // 5. Maison & Jardin
  "maison-deco": { icon: Layers, color: colors.category.homeGarden },
  home_garden: { icon: Layers, color: colors.category.homeGarden },
  "home_garden.furniture": {
    icon: Armchair,
    color: colors.category.homeGarden,
  },
  "home_garden.appliances": { icon: Tv, color: colors.category.homeGarden },
  "home_garden.decoration": {
    icon: Sparkles,
    color: colors.category.homeGarden,
  },
  "home_garden.gardening": { icon: Sun, color: colors.category.homeGarden },
  "home_garden.diy": { icon: Hammer, color: colors.category.homeGarden },

  // 6. Multimédia & Électronique
  multimedia: { icon: Smartphone, color: colors.category.multimedia },
  electronics: { icon: Smartphone, color: colors.category.multimedia },
  "electronics.telephony": {
    icon: Smartphone,
    color: colors.category.multimedia,
  },
  "electronics.computers": { icon: Laptop, color: colors.category.multimedia },
  "electronics.audio_video": {
    icon: Headphones,
    color: colors.category.multimedia,
  },
  "electronics.photo": { icon: Camera, color: colors.category.multimedia },
  "electronics.gaming": { icon: Gamepad2, color: colors.category.multimedia },

  // 7. Mode & Beauté
  "mode-beaute": { icon: Shirt, color: colors.category.fashion },
  fashion: { icon: Shirt, color: colors.category.fashion },
  "fashion.clothing": { icon: Shirt, color: colors.category.fashion },
  "fashion.shoes": { icon: Footprints, color: colors.category.fashion },
  "fashion.accessories": { icon: Watch, color: colors.category.fashion },

  // 8. Famille & Bébé
  "famille-enfant": { icon: Baby, color: colors.category.baby },
  family_baby: { icon: Baby, color: colors.category.baby },

  // 9. Culture & Loisirs
  "culture-musique": { icon: BookOpen, color: colors.category.leisure },
  culture_leisure: { icon: BookOpen, color: colors.category.leisure },
  "culture_leisure.books": { icon: BookOpen, color: colors.category.leisure },
  "culture_leisure.music": { icon: Music, color: colors.category.leisure },
  "culture_leisure.gaming": { icon: Gamepad2, color: colors.category.leisure },

  // 10. Sports & Plein Air
  "loisirs-sport": { icon: Bike, color: colors.category.jobs },
  "sports-hobbies": { icon: Trophy, color: colors.category.jobs },
  sports_outdoors: { icon: Trophy, color: colors.category.jobs },
  "sports_outdoors.cycling": { icon: Bike, color: colors.category.jobs },
  "sports_outdoors.fitness": { icon: Dumbbell, color: colors.category.jobs },

  // 11. Animaux
  animaux: { icon: Dog, color: colors.category.sport },
  animals_pets: { icon: Dog, color: colors.category.sport },

  // 12. Matériel Professionnel
  "materiel-professionnel": { icon: HardHat, color: colors.category.neutral },
  pro_equipment: { icon: HardHat, color: colors.category.neutral },

  // 13. Agriculture & BTP
  "agriculture-materiaux": {
    icon: Tractor,
    color: colors.category.agriculture,
  },
  agriculture_materials: { icon: Tractor, color: colors.category.agriculture },

  // 14. Vacances
  vacances: { icon: Palmtree, color: colors.category.pets },
  vacation_rentals: { icon: Palmtree, color: colors.category.pets },

  // 15. Numérique & Digital
  "digital-services": { icon: Server, color: colors.category.realEstate },
  digital_goods: { icon: Server, color: colors.category.realEstate },

  // 16. Dons & Divers
  "dons-divers": { icon: Gift, color: colors.category.trades },
  other_community: { icon: Gift, color: colors.category.trades },
  divers: { icon: Tag, color: colors.category.neutralSoft },
};

export interface CategoryIconProps {
  category?: string | TaxonomyNode | Category | null;
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
  // 1. Resolve Icon Component
  let IconComponent: LucideIcon = Tag;
  // The brand terracotta, matching `--color-primary` in index.css. Every
  // unmapped category falls back to it, so it must not drift from the ramp.
  let defaultColor: string = colors.category.vehicles;

  // Check explicit iconName first
  const resolvedIconName =
    iconName ||
    (typeof category === "object" && category
      ? (category as any).iconName
      : undefined);

  if (resolvedIconName && ICON_NAME_MAP[resolvedIconName]) {
    IconComponent = ICON_NAME_MAP[resolvedIconName];
  } else {
    // Resolve via category slug or ID
    const catKey =
      typeof category === "string"
        ? category
        : typeof category === "object" && category
          ? (category as any).slug || (category as any).id
          : "";

    if (catKey) {
      const lower = catKey.toLowerCase();
      // Try exact match or prefix
      const match =
        CATEGORY_SLUG_ICON_MAP[lower] ||
        Object.entries(CATEGORY_SLUG_ICON_MAP).find(
          ([k]) => lower.includes(k) || k.includes(lower),
        )?.[1];

      if (match) {
        IconComponent = match.icon;
        defaultColor = match.color;
      }
    }
  }

  const effectiveColor =
    color ||
    (typeof category === "object" && (category as any)?.accentColor) ||
    defaultColor;

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
