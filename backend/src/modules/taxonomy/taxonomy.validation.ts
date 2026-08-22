import { TaxonomyAttribute, TaxonomyService } from './taxonomy.service.js';

export interface TaxonomyValidationIssue {
  field: string;
  code: string;
  message: string;
}

export interface TaxonomyValidationResult {
  isValid: boolean;
  issues: TaxonomyValidationIssue[];
}

const isPresent = (value: unknown): boolean => {
  if (value === undefined || value === null || value === '') return false;
  return !(Array.isArray(value) && value.length === 0);
};

/**
 * API-side guard for the canonical taxonomy contract. It deliberately works
 * through TaxonomyService so the demo repository and future Postgres adapter
 * enforce the same publication rules.
 */
export class TaxonomyValidationService {
  constructor(private readonly taxonomy: TaxonomyService = new TaxonomyService()) {}

  async validateListingAttributes(
    categoryId: string,
    attributes: Record<string, unknown> = {},
  ): Promise<TaxonomyValidationResult> {
    const issues: TaxonomyValidationIssue[] = [];
    const node = await this.taxonomy.getNodeById(categoryId);
    if (!node) {
      return {
        isValid: false,
        issues: [{ field: 'categoryId', code: 'INVALID_NODE', message: 'La catégorie sélectionnée est invalide.' }],
      };
    }
    if (!node.isActive || !node.publishable) {
      return {
        isValid: false,
        issues: [{ field: 'categoryId', code: 'NODE_NOT_PUBLISHABLE', message: 'Sélectionnez une catégorie finale active.' }],
      };
    }

    const definitions = await this.taxonomy.getAttributesForCategory(categoryId);
    const definitionByKey = new Map<string, TaxonomyAttribute>();
    definitions.forEach((definition) => {
      definitionByKey.set(definition.id, definition);
      definitionByKey.set(definition.code, definition);
      if (definition.name) definitionByKey.set(definition.name, definition);
    });

    definitions.forEach((definition) => {
      const key = definition.code || definition.name || definition.id;
      const value = attributes[key] ?? attributes[definition.id] ?? (definition.name ? attributes[definition.name] : undefined);
      const required = definition.required || definition.fieldRole === 'required';
      if (required && !isPresent(value)) {
        issues.push({ field: `attributes.${key}`, code: 'ATTRIBUTE_REQUIRED', message: `Le champ "${definition.label}" est obligatoire.` });
        return;
      }
      if (!isPresent(value)) return;

      if (definition.dataType === 'number' || definition.dataType === 'year' || definition.dataType === 'money') {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) {
          issues.push({ field: `attributes.${key}`, code: 'ATTRIBUTE_INVALID_NUMBER', message: `Le champ "${definition.label}" doit être un nombre.` });
        } else {
          if (definition.validation?.min !== undefined && numeric < definition.validation.min) {
            issues.push({ field: `attributes.${key}`, code: 'ATTRIBUTE_BELOW_MINIMUM', message: `Le champ "${definition.label}" est inférieur au minimum autorisé.` });
          }
          if (definition.validation?.max !== undefined && numeric > definition.validation.max) {
            issues.push({ field: `attributes.${key}`, code: 'ATTRIBUTE_ABOVE_MAXIMUM', message: `Le champ "${definition.label}" dépasse le maximum autorisé.` });
          }
          if (definition.validation?.integer && !Number.isInteger(numeric)) {
            issues.push({ field: `attributes.${key}`, code: 'ATTRIBUTE_NOT_INTEGER', message: `Le champ "${definition.label}" doit être entier.` });
          }
        }
      }

      if (definition.dataType === 'select' || definition.dataType === 'year') {
        const allowed = new Set((definition.options || []).map((option) => option.value.toLowerCase()));
        if (allowed.size > 0 && !allowed.has(String(value).toLowerCase())) {
          issues.push({ field: `attributes.${key}`, code: 'ATTRIBUTE_INVALID_OPTION', message: `La valeur du champ "${definition.label}" est invalide.` });
        }
      }

      if (definition.dataType === 'multi_select') {
        if (!Array.isArray(value)) {
          issues.push({ field: `attributes.${key}`, code: 'ATTRIBUTE_INVALID_OPTIONS', message: `Le champ "${definition.label}" doit contenir une liste.` });
        } else {
          const allowed = new Set((definition.options || []).map((option) => option.value.toLowerCase()));
          if (allowed.size > 0 && value.some((entry) => !allowed.has(String(entry).toLowerCase()))) {
            issues.push({ field: `attributes.${key}`, code: 'ATTRIBUTE_INVALID_OPTION', message: `Une valeur du champ "${definition.label}" est invalide.` });
          }
        }
      }

      if (typeof value === 'string') {
        if (definition.validation?.minLength !== undefined && value.length < definition.validation.minLength) {
          issues.push({ field: `attributes.${key}`, code: 'ATTRIBUTE_TOO_SHORT', message: `Le champ "${definition.label}" est trop court.` });
        }
        if (definition.validation?.maxLength !== undefined && value.length > definition.validation.maxLength) {
          issues.push({ field: `attributes.${key}`, code: 'ATTRIBUTE_TOO_LONG', message: `Le champ "${definition.label}" est trop long.` });
        }
      }
    });

    Object.keys(attributes).forEach((key) => {
      if (!definitionByKey.has(key)) {
        issues.push({ field: `attributes.${key}`, code: 'UNKNOWN_ATTRIBUTE', message: `L'attribut "${key}" n'est pas disponible pour cette catégorie.` });
      }
    });

    return { isValid: issues.length === 0, issues };
  }
}

export const taxonomyValidationService = new TaxonomyValidationService();
