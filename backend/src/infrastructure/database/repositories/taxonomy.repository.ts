import { Category } from '../../../shared/types/index.js';
import type { TaxonomyAttribute as ContractTaxonomyAttribute } from '@shongre/contracts/taxonomy';
import {
  CANONICAL_TAXONOMY_IDENTITIES,
  CANONICAL_TAXONOMY_IDENTITY_BY_ID,
  CANONICAL_TAXONOMY_ALIASES,
} from '@shongre/contracts/taxonomy-catalog';
import type { CanonicalTaxonomyIdentity } from '@shongre/contracts/taxonomy-catalog';
import { getSupabaseAdminClient } from '../../supabase/supabase-client.js';
import { logger } from '../../logging/logger.js';

/** Shared taxonomy field shape with legacy aliases retained for old adapters. */
export type TaxonomyAttribute = ContractTaxonomyAttribute & {
  name?: string;
  type?: ContractTaxonomyAttribute['dataType'];
};

export interface TaxonomyNode {
  id: string;
  code: string;
  slug: string;
  name: string;
  labels: Record<string, string>;
  shortLabel?: string;
  parentId?: string | null;
  iconName: string;
  sortOrder: number;
  isActive: boolean;
  level: CanonicalTaxonomyIdentity['level'];
  publishable: boolean;
  listingFamily: string;
  supportedIntents: string[];
  attributes?: TaxonomyAttribute[];
  children?: TaxonomyNode[];
}

function identityToTaxonomyNode(identity: CanonicalTaxonomyIdentity): TaxonomyNode {
  return {
    id: identity.id,
    code: identity.code,
    slug: identity.slug,
    name: identity.labels['fr-FR'],
    labels: identity.labels,
    shortLabel: identity.shortLabels?.['fr-FR'],
    parentId: identity.parentId,
    iconName: identity.iconName,
    sortOrder: identity.sortOrder,
    isActive: true,
    level: identity.level,
    publishable: identity.publishable,
    listingFamily: identity.listingFamily,
    supportedIntents: [...identity.supportedIntents],
  };
}

function identityToCategory(identity: CanonicalTaxonomyIdentity): Category {
  const children = CANONICAL_TAXONOMY_IDENTITIES.filter(
    (candidate) => candidate.parentId === identity.id,
  ).map(identityToCategory);
  return {
    id: identity.id,
    slug: identity.slug,
    name: identity.labels['fr-FR'],
    shortLabel: identity.shortLabels?.['fr-FR'],
    parentId: identity.parentId,
    iconName: identity.iconName,
    sortOrder: identity.sortOrder,
    isActive: true,
    subcategories: children.length > 0 ? children : undefined,
  };
}

function databaseRowToTaxonomyNode(row: any): TaxonomyNode {
  return {
    id: String(row.id),
    code: String(row.code || row.id).toUpperCase(),
    slug: String(row.slug),
    name: String(row.name),
    labels: (row.labels || { 'fr-FR': row.name }) as Record<string, string>,
    shortLabel: row.short_label || undefined,
    parentId: row.parent_id || undefined,
    iconName: row.icon_name || 'Package',
    sortOrder: row.sort_order || 0,
    isActive: Boolean(row.is_active),
    level: (row.level || (row.parent_id ? 'subcategory' : 'category')) as TaxonomyNode['level'],
    publishable: Boolean(row.publishable),
    listingFamily: row.listing_family || 'physical_product',
    supportedIntents: Array.isArray(row.supported_intents) ? row.supported_intents : [],
  };
}

/**
 * The backend demo adapter consumes the same stable identity catalog as every
 * other client. Legacy identities exist only in the database migration map and
 * are never kept as a second runtime taxonomy.
 */
export const CANONICAL_DEMO_CATEGORIES: Category[] =
  CANONICAL_TAXONOMY_IDENTITIES.filter((node) => !node.parentId).map(
    identityToCategory,
  );

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
    const node = CANONICAL_TAXONOMY_IDENTITY_BY_ID.get(
      CANONICAL_TAXONOMY_ALIASES[id] || id,
    );
    return node ? identityToTaxonomyNode(node) : null;
  }

  async getNodeBySlug(slug: string): Promise<TaxonomyNode | null> {
    const node = CANONICAL_TAXONOMY_IDENTITIES.find(
      (candidate) => candidate.slug === slug,
    );
    return this.getNodeById(node?.id || CANONICAL_TAXONOMY_ALIASES[slug] || slug);
  }

  async getChildren(nodeId: string): Promise<TaxonomyNode[]> {
    return CANONICAL_TAXONOMY_IDENTITIES.filter(
      (node) => node.parentId === nodeId,
    ).map(identityToTaxonomyNode);
  }

  async getAttributesForCategory(categoryId: string): Promise<TaxonomyAttribute[]> {
    const identity = CANONICAL_TAXONOMY_IDENTITY_BY_ID.get(
      CANONICAL_TAXONOMY_ALIASES[categoryId] || categoryId,
    );
    const commonAttributes: TaxonomyAttribute[] = [
      { id: 'condition', code: 'condition', name: 'condition', label: 'État général', dataType: 'select', type: 'select', required: true },
      { id: 'brand', code: 'brand', name: 'brand', label: 'Marque', dataType: 'text', type: 'text' },
      { id: 'color', code: 'color', name: 'color', label: 'Couleur', dataType: 'text', type: 'text' },
    ];

    if (identity?.listingFamily === 'vehicle') {
      return [
        ...commonAttributes,
        { id: 'mileage', code: 'mileage', name: 'mileage', label: 'Kilométrage', dataType: 'number', type: 'number', unit: 'km', required: true },
        { id: 'fuel', code: 'fuel', name: 'fuel', label: 'Carburant', dataType: 'select', type: 'select', required: true },
        { id: 'year', code: 'year', name: 'year', label: 'Année modèle', dataType: 'year', type: 'year', required: true },
        { id: 'transmission', code: 'transmission', name: 'transmission', label: 'Boîte de vitesse', dataType: 'select', type: 'select' },
      ];
    }

    if (identity?.listingFamily === 'real_estate') {
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
      const canonicalId = CANONICAL_TAXONOMY_ALIASES[id] || id;
      const { data, error } = await (supabase.from('categories' as any) as any).select('*').eq('id', canonicalId).single();
      if (error || !data) return null;
      return databaseRowToTaxonomyNode(data);
    } catch {
      return null;
    }
  }

  async getNodeBySlug(slug: string): Promise<TaxonomyNode | null> {
    try {
      const mappedId = CANONICAL_TAXONOMY_ALIASES[slug];
      if (mappedId) return this.getNodeById(mappedId);
      const supabase = getSupabaseAdminClient();
      const { data, error } = await (supabase.from('categories' as any) as any).select('*').eq('slug', slug).single();
      if (error || !data) return null;
      return databaseRowToTaxonomyNode(data);
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
      return data.map(databaseRowToTaxonomyNode);
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
