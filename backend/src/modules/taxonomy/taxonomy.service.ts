import { Category } from '../../shared/types/index.js';

export interface TaxonomyAttribute {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean' | 'range';
  options?: Array<{ label: string; value: string }>;
  unit?: string;
  required?: boolean;
}

export interface TaxonomyNode {
  id: string;
  slug: string;
  name: string;
  shortLabel?: string;
  parentId?: string | null;
  iconName: string;
  sortOrder: number;
  isActive: boolean;
  attributes?: TaxonomyAttribute[];
  children?: TaxonomyNode[];
}

export const CANONICAL_CATEGORIES: Category[] = [
  {
    id: 'vehicles',
    slug: 'vehicles',
    name: 'Véhicules',
    shortLabel: 'Véhicules',
    iconName: 'Car',
    sortOrder: 1,
    isActive: true,
    subcategories: [
      { id: 'cars', slug: 'cars', name: "Voitures d'occasion", shortLabel: 'Voitures', parentId: 'vehicles', iconName: 'Car', sortOrder: 1, isActive: true },
      { id: 'motorcycles', slug: 'motorcycles', name: 'Motos & Scooters', shortLabel: 'Motos', parentId: 'vehicles', iconName: 'Bike', sortOrder: 2, isActive: true },
      { id: 'bicycles', slug: 'bicycles', name: 'Vélos & Mobilité douce', shortLabel: 'Vélos', parentId: 'vehicles', iconName: 'Bike', sortOrder: 3, isActive: true },
    ],
  },
  {
    id: 'real-estate',
    slug: 'real-estate',
    name: 'Immobilier',
    shortLabel: 'Immobilier',
    iconName: 'Home',
    sortOrder: 2,
    isActive: true,
    subcategories: [
      { id: 'real-estate-sale', slug: 'real-estate-sale', name: 'Ventes immobilières', shortLabel: 'Ventes', parentId: 'real-estate', iconName: 'Home', sortOrder: 1, isActive: true },
      { id: 'real-estate-rent', slug: 'real-estate-rent', name: 'Locations', shortLabel: 'Locations', parentId: 'real-estate', iconName: 'Key', sortOrder: 2, isActive: true },
    ],
  },
  {
    id: 'multimedia',
    slug: 'multimedia',
    name: 'Multimédia & High-Tech',
    shortLabel: 'Multimédia',
    iconName: 'Smartphone',
    sortOrder: 3,
    isActive: true,
    subcategories: [
      { id: 'smartphones', slug: 'smartphones', name: 'Smartphones & Téléphonie', shortLabel: 'Téléphonie', parentId: 'multimedia', iconName: 'Smartphone', sortOrder: 1, isActive: true },
      { id: 'computers', slug: 'computers', name: 'Informatique & Ordinateurs', shortLabel: 'Informatique', parentId: 'multimedia', iconName: 'Laptop', sortOrder: 2, isActive: true },
      { id: 'gaming', slug: 'gaming', name: 'Consoles & Jeux vidéo', shortLabel: 'Gaming', parentId: 'multimedia', iconName: 'Gamepad2', sortOrder: 3, isActive: true },
    ],
  },
  {
    id: 'home-garden',
    slug: 'home-garden',
    name: 'Maison & Jardin',
    shortLabel: 'Maison',
    iconName: 'Armchair',
    sortOrder: 4,
    isActive: true,
    subcategories: [
      { id: 'furniture', slug: 'furniture', name: 'Meubles & Salon', shortLabel: 'Meubles', parentId: 'home-garden', iconName: 'Armchair', sortOrder: 1, isActive: true },
      { id: 'appliances', slug: 'appliances', name: 'Électroménager', shortLabel: 'Électroménager', parentId: 'home-garden', iconName: 'Tv', sortOrder: 2, isActive: true },
    ],
  },
  {
    id: 'fashion',
    slug: 'fashion',
    name: 'Mode & Accessoires',
    shortLabel: 'Mode',
    iconName: 'Shirt',
    sortOrder: 5,
    isActive: true,
    subcategories: [
      { id: 'clothing-women', slug: 'clothing-women', name: 'Vêtements Femme', shortLabel: 'Femme', parentId: 'fashion', iconName: 'Shirt', sortOrder: 1, isActive: true },
      { id: 'clothing-men', slug: 'clothing-men', name: 'Vêtements Homme', shortLabel: 'Homme', parentId: 'fashion', iconName: 'Shirt', sortOrder: 2, isActive: true },
      { id: 'luxury-watches', slug: 'luxury-watches', name: 'Montres & Bijoux', shortLabel: 'Horlogerie', parentId: 'fashion', iconName: 'Watch', sortOrder: 3, isActive: true },
    ],
  },
  {
    id: 'leisure-sports',
    slug: 'leisure-sports',
    name: 'Loisirs & Sport',
    shortLabel: 'Loisirs',
    iconName: 'Trophy',
    sortOrder: 6,
    isActive: true,
    subcategories: [
      { id: 'musical-instruments', slug: 'musical-instruments', name: 'Instruments de Musique', shortLabel: 'Musique', parentId: 'leisure-sports', iconName: 'Music', sortOrder: 1, isActive: true },
      { id: 'sport-equipment', slug: 'sport-equipment', name: 'Équipements Sportifs', shortLabel: 'Sport', parentId: 'leisure-sports', iconName: 'Trophy', sortOrder: 2, isActive: true },
    ],
  },
  {
    id: 'professional',
    slug: 'professional',
    name: 'Matériel Professionnel',
    shortLabel: 'Pro',
    iconName: 'Briefcase',
    sortOrder: 7,
    isActive: true,
  },
];

export class TaxonomyService {
  async getRootCategories(): Promise<Category[]> {
    return CANONICAL_CATEGORIES;
  }

  async getNodeById(id: string): Promise<TaxonomyNode | null> {
    for (const cat of CANONICAL_CATEGORIES) {
      if (cat.id === id) {
        return {
          id: cat.id,
          slug: cat.slug,
          name: cat.name,
          shortLabel: cat.shortLabel,
          iconName: cat.iconName || 'Package',
          sortOrder: cat.sortOrder || 0,
          isActive: true,
        };
      }
      if (cat.subcategories) {
        const sub = cat.subcategories.find((s) => s.id === id);
        if (sub) {
          return {
            id: sub.id,
            slug: sub.slug,
            name: sub.name,
            shortLabel: sub.shortLabel,
            parentId: sub.parentId,
            iconName: sub.iconName || 'Package',
            sortOrder: sub.sortOrder || 0,
            isActive: true,
          };
        }
      }
    }
    return null;
  }

  async getNodeBySlug(slug: string): Promise<TaxonomyNode | null> {
    for (const cat of CANONICAL_CATEGORIES) {
      if (cat.slug === slug) {
        return this.getNodeById(cat.id);
      }
      if (cat.subcategories) {
        const sub = cat.subcategories.find((s) => s.slug === slug);
        if (sub) {
          return this.getNodeById(sub.id);
        }
      }
    }
    return null;
  }

  async getChildren(nodeId: string): Promise<TaxonomyNode[]> {
    const parent = CANONICAL_CATEGORIES.find((c) => c.id === nodeId);
    if (!parent || !parent.subcategories) return [];
    return parent.subcategories.map((sub) => ({
      id: sub.id,
      slug: sub.slug,
      name: sub.name,
      shortLabel: sub.shortLabel,
      parentId: sub.parentId,
      iconName: sub.iconName || 'Package',
      sortOrder: sub.sortOrder || 0,
      isActive: true,
    }));
  }

  async getAttributesForCategory(categoryId: string): Promise<TaxonomyAttribute[]> {
    const commonAttributes: TaxonomyAttribute[] = [
      { id: 'condition', name: 'condition', label: 'État général', type: 'select', required: true },
      { id: 'brand', name: 'brand', label: 'Marque', type: 'text' },
      { id: 'color', name: 'color', label: 'Couleur', type: 'text' },
    ];

    if (categoryId.includes('car') || categoryId === 'vehicles') {
      return [
        ...commonAttributes,
        { id: 'mileage', name: 'mileage', label: 'Kilométrage', type: 'number', unit: 'km', required: true },
        { id: 'fuel', name: 'fuel', label: 'Carburant', type: 'select', required: true },
        { id: 'year', name: 'year', label: 'Année modèle', type: 'number', required: true },
        { id: 'transmission', name: 'transmission', label: 'Boîte de vitesse', type: 'select' },
      ];
    }

    if (categoryId.includes('real-estate')) {
      return [
        { id: 'surface', name: 'surface', label: 'Surface habitable', type: 'number', unit: 'm²', required: true },
        { id: 'rooms', name: 'rooms', label: 'Nombre de pièces', type: 'number', required: true },
        { id: 'dpe', name: 'dpe', label: 'Classe énergétique (DPE)', type: 'select' },
      ];
    }

    return commonAttributes;
  }

  async resolveSearchFilters(nodeId?: string): Promise<Array<{ attribute: TaxonomyAttribute; facetType: string }>> {
    const attrs = await this.getAttributesForCategory(nodeId || 'root');
    return attrs.map((attribute) => ({
      attribute,
      facetType: attribute.type === 'select' ? 'multi_select' : attribute.type === 'number' ? 'range' : 'keyword',
    }));
  }
}

export const taxonomyService = new TaxonomyService();
