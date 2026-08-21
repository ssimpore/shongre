import { Category } from '../../../shared/types/index.js';
import type { TaxonomyAttribute as ContractTaxonomyAttribute } from '@shongre/contracts/taxonomy';
import { getSupabaseAdminClient } from '../../supabase/supabase-client.js';
import { logger } from '../../logging/logger.js';

/** Shared taxonomy field shape with legacy aliases retained for old adapters. */
export type TaxonomyAttribute = ContractTaxonomyAttribute & {
  name?: string;
  type?: ContractTaxonomyAttribute['dataType'];
};

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

export const CANONICAL_DEMO_CATEGORIES: Category[] = [
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

export interface ITaxonomyRepository {
  getRootCategories(): Promise<Category[]>;
  getNodeById(id: string): Promise<TaxonomyNode | null>;
  getNodeBySlug(slug: string): Promise<TaxonomyNode | null>;
  getChildren(nodeId: string): Promise<TaxonomyNode[]>;
  getAttributesForCategory(categoryId: string): Promise<TaxonomyAttribute[]>;
}

export class DemoTaxonomyRepository implements ITaxonomyRepository {
  private categories: Category[] = CANONICAL_DEMO_CATEGORIES;

  async getRootCategories(): Promise<Category[]> {
    return this.categories;
  }

  async getNodeById(id: string): Promise<TaxonomyNode | null> {
    for (const cat of this.categories) {
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
    for (const cat of this.categories) {
      if (cat.slug === slug) return this.getNodeById(cat.id);
      if (cat.subcategories) {
        const sub = cat.subcategories.find((s) => s.slug === slug);
        if (sub) return this.getNodeById(sub.id);
      }
    }
    return null;
  }

  async getChildren(nodeId: string): Promise<TaxonomyNode[]> {
    const parent = this.categories.find((c) => c.id === nodeId);
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
      { id: 'condition', code: 'condition', name: 'condition', label: 'État général', dataType: 'select', type: 'select', required: true },
      { id: 'brand', code: 'brand', name: 'brand', label: 'Marque', dataType: 'text', type: 'text' },
      { id: 'color', code: 'color', name: 'color', label: 'Couleur', dataType: 'text', type: 'text' },
    ];

    if (categoryId.includes('car') || categoryId === 'vehicles') {
      return [
        ...commonAttributes,
        { id: 'mileage', code: 'mileage', name: 'mileage', label: 'Kilométrage', dataType: 'number', type: 'number', unit: 'km', required: true },
        { id: 'fuel', code: 'fuel', name: 'fuel', label: 'Carburant', dataType: 'select', type: 'select', required: true },
        { id: 'year', code: 'year', name: 'year', label: 'Année modèle', dataType: 'year', type: 'year', required: true },
        { id: 'transmission', code: 'transmission', name: 'transmission', label: 'Boîte de vitesse', dataType: 'select', type: 'select' },
      ];
    }

    if (categoryId.includes('real-estate')) {
      return [
        { id: 'surface', code: 'surface', name: 'surface', label: 'Surface habitable', dataType: 'number', type: 'number', unit: 'm²', required: true },
        { id: 'rooms', code: 'rooms', name: 'rooms', label: 'Nombre de pièces', dataType: 'number', type: 'number', required: true },
        { id: 'dpe', code: 'energy_class', name: 'energy_class', label: 'Classe énergétique (DPE)', dataType: 'select', type: 'select' },
      ];
    }

    return commonAttributes;
  }
}

export class PostgresTaxonomyRepository implements ITaxonomyRepository {
  async getRootCategories(): Promise<Category[]> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error || !data || data.length === 0) {
        return CANONICAL_DEMO_CATEGORIES;
      }

      const roots = data.filter((c: any) => !c.parent_id);
      return roots.map((root: any) => {
        const children = data
          .filter((c: any) => c.parent_id === root.id)
          .map((sub: any) => ({
            id: sub.id,
            slug: sub.slug,
            name: sub.name,
            shortLabel: sub.short_label || undefined,
            parentId: sub.parent_id,
            iconName: sub.icon_name || 'Package',
            sortOrder: sub.sort_order || 0,
            isActive: Boolean(sub.is_active),
          }));

        return {
          id: root.id,
          slug: root.slug,
          name: root.name,
          shortLabel: root.short_label || undefined,
          iconName: root.icon_name || 'Package',
          sortOrder: root.sort_order || 0,
          isActive: Boolean(root.is_active),
          subcategories: children.length > 0 ? children : undefined,
        };
      });
    } catch (err: any) {
      logger.error(`PostgresTaxonomyRepository.getRootCategories error: ${err.message}`);
      return CANONICAL_DEMO_CATEGORIES;
    }
  }

  async getNodeById(id: string): Promise<TaxonomyNode | null> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await (supabase.from('categories' as any) as any).select('*').eq('id', id).single();
      if (error || !data) return null;
      const d = data as any;
      return {
        id: d.id,
        slug: d.slug,
        name: d.name,
        shortLabel: d.short_label || undefined,
        parentId: d.parent_id || undefined,
        iconName: d.icon_name || 'Package',
        sortOrder: d.sort_order || 0,
        isActive: Boolean(d.is_active),
      };
    } catch {
      return null;
    }
  }

  async getNodeBySlug(slug: string): Promise<TaxonomyNode | null> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await (supabase.from('categories' as any) as any).select('*').eq('slug', slug).single();
      if (error || !data) return null;
      const d = data as any;
      return {
        id: d.id,
        slug: d.slug,
        name: d.name,
        shortLabel: d.short_label || undefined,
        parentId: d.parent_id || undefined,
        iconName: d.icon_name || 'Package',
        sortOrder: d.sort_order || 0,
        isActive: Boolean(d.is_active),
      };
    } catch {
      return null;
    }
  }

  async getChildren(nodeId: string): Promise<TaxonomyNode[]> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('parent_id', nodeId)
        .order('sort_order', { ascending: true });
      if (error || !data) return [];
      return data.map((d: any) => ({
        id: d.id,
        slug: d.slug,
        name: d.name,
        shortLabel: d.short_label || undefined,
        parentId: d.parent_id || undefined,
        iconName: d.icon_name || 'Package',
        sortOrder: d.sort_order || 0,
        isActive: Boolean(d.is_active),
      }));
    } catch {
      return [];
    }
  }

  async getAttributesForCategory(categoryId: string): Promise<TaxonomyAttribute[]> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from('category_attributes')
        .select('*')
        .eq('category_id', categoryId)
        .order('sort_order', { ascending: true });

      if (error || !data || data.length === 0) {
        const demoRepo = new DemoTaxonomyRepository();
        return demoRepo.getAttributesForCategory(categoryId);
      }

      return data.map((a: any) => ({
        id: a.attribute_id || a.name,
        code: a.code || a.name,
        name: a.name,
        label: a.label,
        dataType: a.data_type || a.type || 'text',
        type: a.data_type || a.type || 'text',
        options: a.options || undefined,
        unit: a.unit || undefined,
        required: Boolean(a.is_required),
        filterable: Boolean(a.is_filterable),
        searchable: Boolean(a.is_searchable),
        sortable: Boolean(a.is_sortable),
        comparable: Boolean(a.is_comparable),
        publicationGroup: a.publication_group || undefined,
        displayOrder: a.display_order || a.sort_order || undefined,
      }));
    } catch {
      const demoRepo = new DemoTaxonomyRepository();
      return demoRepo.getAttributesForCategory(categoryId);
    }
  }
}
