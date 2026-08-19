import React from 'react';
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
  LucideIcon,
} from 'lucide-react';
import { TaxonomyNode } from '../../domains/taxonomy/taxonomy.types';
import { Category } from '../../types';

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
};

// Fallback mapping by category slug or code
export const CATEGORY_SLUG_ICON_MAP: Record<string, { icon: LucideIcon; color: string }> = {
  // 1. Véhicules
  vehicules: { icon: Car, color: '#C4431F' },
  vehicles: { icon: Car, color: '#C4431F' },
  'vehicles.cars': { icon: Car, color: '#C4431F' },
  'vehicles.motorcycles': { icon: Bike, color: '#C4431F' },
  'vehicles.utility': { icon: Truck, color: '#C4431F' },
  'vehicles.caravaning': { icon: Compass, color: '#C4431F' },
  'vehicles.nautism': { icon: Anchor, color: '#C4431F' },
  'vehicles.parts': { icon: Wrench, color: '#C4431F' },

  // 2. Immobilier
  immobilier: { icon: Building2, color: '#0284C7' },
  real_estate: { icon: Building2, color: '#0284C7' },
  'real_estate.sales': { icon: Home, color: '#0284C7' },
  'real_estate.rentals': { icon: Key, color: '#0284C7' },
  'real_estate.commercial': { icon: Store, color: '#0284C7' },

  // 3. Emploi
  emploi: { icon: Briefcase, color: '#4F46E5' },
  jobs: { icon: Briefcase, color: '#4F46E5' },
  'jobs.tech': { icon: Code, color: '#4F46E5' },
  'jobs.sales': { icon: Briefcase, color: '#4F46E5' },

  // 4. Services
  'services-prestations': { icon: Wrench, color: '#0D9488' },
  services: { icon: Wrench, color: '#0D9488' },
  'services.home': { icon: Hammer, color: '#0D9488' },
  'services.tutoring': { icon: GraduationCap, color: '#0D9488' },

  // 5. Maison & Jardin
  'maison-deco': { icon: Layers, color: '#D97706' },
  home_garden: { icon: Layers, color: '#D97706' },
  'home_garden.furniture': { icon: Armchair, color: '#D97706' },
  'home_garden.appliances': { icon: Tv, color: '#D97706' },
  'home_garden.decoration': { icon: Sparkles, color: '#D97706' },
  'home_garden.gardening': { icon: Sun, color: '#D97706' },
  'home_garden.diy': { icon: Hammer, color: '#D97706' },

  // 6. Multimédia & Électronique
  multimedia: { icon: Smartphone, color: '#6366F1' },
  electronics: { icon: Smartphone, color: '#6366F1' },
  'electronics.telephony': { icon: Smartphone, color: '#6366F1' },
  'electronics.computers': { icon: Laptop, color: '#6366F1' },
  'electronics.audio_video': { icon: Headphones, color: '#6366F1' },
  'electronics.photo': { icon: Camera, color: '#6366F1' },
  'electronics.gaming': { icon: Gamepad2, color: '#6366F1' },

  // 7. Mode & Beauté
  'mode-beaute': { icon: Shirt, color: '#DB2777' },
  fashion: { icon: Shirt, color: '#DB2777' },
  'fashion.clothing': { icon: Shirt, color: '#DB2777' },
  'fashion.shoes': { icon: Footprints, color: '#DB2777' },
  'fashion.accessories': { icon: Watch, color: '#DB2777' },

  // 8. Famille & Bébé
  'famille-enfant': { icon: Baby, color: '#EC4899' },
  family_baby: { icon: Baby, color: '#EC4899' },

  // 9. Culture & Loisirs
  'culture-musique': { icon: BookOpen, color: '#8B5CF6' },
  culture_leisure: { icon: BookOpen, color: '#8B5CF6' },
  'culture_leisure.books': { icon: BookOpen, color: '#8B5CF6' },
  'culture_leisure.music': { icon: Music, color: '#8B5CF6' },
  'culture_leisure.gaming': { icon: Gamepad2, color: '#8B5CF6' },

  // 10. Sports & Plein Air
  'loisirs-sport': { icon: Bike, color: '#059669' },
  'sports-hobbies': { icon: Trophy, color: '#059669' },
  sports_outdoors: { icon: Trophy, color: '#059669' },
  'sports_outdoors.cycling': { icon: Bike, color: '#059669' },
  'sports_outdoors.fitness': { icon: Dumbbell, color: '#059669' },

  // 11. Animaux
  animaux: { icon: Dog, color: '#EA580C' },
  animals_pets: { icon: Dog, color: '#EA580C' },

  // 12. Matériel Professionnel
  'materiel-professionnel': { icon: HardHat, color: '#57534E' },
  pro_equipment: { icon: HardHat, color: '#57534E' },

  // 13. Agriculture & BTP
  'agriculture-materiaux': { icon: Tractor, color: '#65A30D' },
  agriculture_materials: { icon: Tractor, color: '#65A30D' },

  // 14. Vacances
  vacances: { icon: Palmtree, color: '#EAB308' },
  vacation_rentals: { icon: Palmtree, color: '#EAB308' },

  // 15. Numérique & Digital
  'digital-services': { icon: Server, color: '#0284C7' },
  digital_goods: { icon: Server, color: '#0284C7' },

  // 16. Dons & Divers
  'dons-divers': { icon: Gift, color: '#DC2626' },
  other_community: { icon: Gift, color: '#DC2626' },
  divers: { icon: Tag, color: '#78716C' },
};

export interface CategoryIconProps {
  category?: string | TaxonomyNode | Category | null;
  iconName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  className?: string;
  withBackground?: boolean;
  color?: string;
}

const SIZE_CLASSES = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
};

const BG_SIZE_CLASSES = {
  xs: 'w-6 h-6 rounded-md',
  sm: 'w-8 h-8 rounded-lg',
  md: 'w-10 h-10 rounded-xl',
  lg: 'w-12 h-12 rounded-2xl',
  xl: 'w-16 h-16 rounded-2xl',
};

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  category,
  iconName,
  size = 'md',
  className = '',
  withBackground = false,
  color,
}) => {
  // 1. Resolve Icon Component
  let IconComponent: LucideIcon = Tag;
  // The brand terracotta, matching `--color-primary` in index.css. Every
  // unmapped category falls back to it, so it must not drift from the ramp.
  let defaultColor = '#C4431F';

  // Check explicit iconName first
  const resolvedIconName =
    iconName ||
    (typeof category === 'object' && category ? (category as any).iconName : undefined);

  if (resolvedIconName && ICON_NAME_MAP[resolvedIconName]) {
    IconComponent = ICON_NAME_MAP[resolvedIconName];
  } else {
    // Resolve via category slug or ID
    const catKey =
      typeof category === 'string'
        ? category
        : typeof category === 'object' && category
        ? (category as any).slug || (category as any).id
        : '';

    if (catKey) {
      const lower = catKey.toLowerCase();
      // Try exact match or prefix
      const match =
        CATEGORY_SLUG_ICON_MAP[lower] ||
        Object.entries(CATEGORY_SLUG_ICON_MAP).find(([k]) => lower.includes(k) || k.includes(lower))?.[1];

      if (match) {
        IconComponent = match.icon;
        defaultColor = match.color;
      }
    }
  }

  const effectiveColor = color || (typeof category === 'object' && (category as any)?.accentColor) || defaultColor;

  const sizeClass = typeof size === 'string' ? SIZE_CLASSES[size] || SIZE_CLASSES.md : '';
  const customPixelSize = typeof size === 'number' ? size : undefined;

  if (withBackground) {
    const bgSizeClass = typeof size === 'string' ? BG_SIZE_CLASSES[size] || BG_SIZE_CLASSES.md : 'w-10 h-10 rounded-xl';

    return (
      <div
        className={`flex items-center justify-center shrink-0 shadow-2xs transition-transform ${bgSizeClass} ${className}`}
        style={{
          backgroundColor: `${effectiveColor}15`,
          color: effectiveColor,
        }}
      >
        <IconComponent
          className={sizeClass}
          style={customPixelSize ? { width: customPixelSize, height: customPixelSize } : {}}
        />
      </div>
    );
  }

  return (
    <IconComponent
      className={`${sizeClass} ${className}`}
      style={{
        color: effectiveColor,
        ...(customPixelSize ? { width: customPixelSize, height: customPixelSize } : {}),
      }}
    />
  );
};
