/**
 * SHONGRE TAXONOMY ADMIN REPOSITORY
 * Centralized repository contract and deterministic demo implementation for marketplace taxonomy administration.
 * Provides draft staging, audit logging, validation, market overrides, and safe lifecycle operations.
 */

import {
  TaxonomyNode,
  TaxonomyAttribute,
  TaxonomyDraftChange,
  TaxonomyVersion,
  TaxonomyValidationIssue,
  TaxonomyImpactReport,
  TaxonomyAuditEvent,
  CreateTaxonomyNodeInput,
  UpdateTaxonomyNodeInput,
  TaxonomyMarketOverride,
} from '../domains/taxonomy/taxonomy.types';
import { CANONICAL_TAXONOMY } from '../domains/taxonomy/taxonomy.data';
import { ATTRIBUTE_REGISTRY } from '../domains/taxonomy/attribute.registry';
import { storageService } from '../services/storage.service';

const STORAGE_KEYS = {
  TAXONOMY_NODES: 'shongre_taxonomy_nodes_v2',
  ATTRIBUTES: 'shongre_taxonomy_attributes_v2',
  DRAFT_CHANGES: 'shongre_taxonomy_draft_changes_v2',
  VERSIONS: 'shongre_taxonomy_versions_v2',
  AUDIT_LOGS: 'shongre_taxonomy_audit_logs_v2',
};

export interface ITaxonomyAdminRepository {
  getTree(): TaxonomyNode[];
  getAllNodes(): TaxonomyNode[];
  getNode(id: string): TaxonomyNode | undefined;
  getNodeBySlug(slug: string): TaxonomyNode | undefined;
  createNode(input: CreateTaxonomyNodeInput, actor?: { id: string; name: string; role: string }): Promise<TaxonomyNode>;
  updateNode(id: string, updates: UpdateTaxonomyNodeInput, actor?: { id: string; name: string; role: string }): Promise<TaxonomyNode>;
  reorderNode(id: string, direction: 'up' | 'down', actor?: { id: string; name: string; role: string }): Promise<void>;
  moveNode(id: string, newParentId: string | null, actor?: { id: string; name: string; role: string }): Promise<void>;
  deprecateNode(id: string, replacementId?: string, actor?: { id: string; name: string; role: string }): Promise<void>;
  deleteNode(id: string, actor?: { id: string; name: string; role: string }): Promise<{ success: boolean; message?: string }>;
  duplicateNode(id: string, actor?: { id: string; name: string; role: string }): Promise<TaxonomyNode>;
  setMarketOverride(nodeId: string, marketCode: string, override: TaxonomyMarketOverride, actor?: { id: string; name: string; role: string }): Promise<void>;
  resetMarketOverride(nodeId: string, marketCode: string, actor?: { id: string; name: string; role: string }): Promise<void>;
  getAllAttributes(): TaxonomyAttribute[];
  getAttribute(id: string): TaxonomyAttribute | undefined;
  saveAttribute(attr: TaxonomyAttribute, actor?: { id: string; name: string; role: string }): Promise<TaxonomyAttribute>;
  deprecateAttribute(attrId: string, actor?: { id: string; name: string; role: string }): Promise<void>;
  getDraftChanges(): TaxonomyDraftChange[];
  discardDraft(): Promise<void>;
  publishDraft(description?: string, actor?: { id: string; name: string; role: string }): Promise<TaxonomyVersion>;
  getVersions(): TaxonomyVersion[];
  validateTaxonomy(): TaxonomyValidationIssue[];
  analyzeNodeImpact(nodeId: string): TaxonomyImpactReport;
  getAuditHistory(nodeId?: string): TaxonomyAuditEvent[];
  exportTaxonomyJSON(): string;
  importTaxonomyJSON(jsonString: string, actor?: { id: string; name: string; role: string }): { success: boolean; newCount: number; updatedCount: number; errors: string[] };
  resetToCanonical(): Promise<void>;
}

class TaxonomyAdminRepository implements ITaxonomyAdminRepository {
  private nodes: TaxonomyNode[] = [];
  private attributes: Record<string, TaxonomyAttribute> = {};
  private draftChanges: TaxonomyDraftChange[] = [];
  private versions: TaxonomyVersion[] = [];
  private auditLogs: TaxonomyAuditEvent[] = [];

  constructor() {
    this.loadInitialData();
  }

  private loadInitialData() {
    // 1. Nodes
    const storedNodes = storageService.get<TaxonomyNode[]>(STORAGE_KEYS.TAXONOMY_NODES, null);
    if (storedNodes && Array.isArray(storedNodes) && storedNodes.length > 0) {
      this.nodes = storedNodes;
    } else {
      this.nodes = JSON.parse(JSON.stringify(CANONICAL_TAXONOMY));
      this.persistNodes();
    }

    // 2. Attributes
    const storedAttributes = storageService.get<Record<string, TaxonomyAttribute>>(STORAGE_KEYS.ATTRIBUTES, null);
    if (storedAttributes && Object.keys(storedAttributes).length > 0) {
      this.attributes = storedAttributes;
    } else {
      this.attributes = JSON.parse(JSON.stringify(ATTRIBUTE_REGISTRY));
      this.persistAttributes();
    }

    // 3. Draft Changes
    this.draftChanges = storageService.get<TaxonomyDraftChange[]>(STORAGE_KEYS.DRAFT_CHANGES, []);

    // 4. Versions
    this.versions = storageService.get<TaxonomyVersion[]>(STORAGE_KEYS.VERSIONS, [
      {
        id: 'ver_init_1',
        versionNumber: 1,
        status: 'published',
        changeCount: 0,
        description: 'Taxonomie initiale canonique Shongre (16 univers)',
        publishedAt: '2026-08-01T08:00:00Z',
        publishedBy: 'System Administrator',
        createdAt: '2026-08-01T08:00:00Z',
      },
    ]);

    // 5. Audit Logs
    this.auditLogs = storageService.get<TaxonomyAuditEvent[]>(STORAGE_KEYS.AUDIT_LOGS, [
      {
        id: 'audit_init_1',
        nodeId: 'vehicles',
        nodeLabel: 'Véhicules',
        action: 'Création initiale du référentiel canonique',
        actor: { id: 'usr_sys_01', name: 'Système Shongre', role: 'super_admin' },
        timestamp: '2026-08-01T08:00:00Z',
        details: '16 univers créés avec schéma d\'attributs et capacités de séquestre.',
      },
    ]);
  }

  private persistNodes() {
    storageService.set(STORAGE_KEYS.TAXONOMY_NODES, this.nodes);
  }

  private persistAttributes() {
    storageService.set(STORAGE_KEYS.ATTRIBUTES, this.attributes);
  }

  private persistDrafts() {
    storageService.set(STORAGE_KEYS.DRAFT_CHANGES, this.draftChanges);
  }

  private persistVersions() {
    storageService.set(STORAGE_KEYS.VERSIONS, this.versions);
  }

  private persistAuditLogs() {
    storageService.set(STORAGE_KEYS.AUDIT_LOGS, this.auditLogs);
  }

  private logAudit(
    nodeId: string,
    nodeLabel: string,
    action: string,
    actor?: { id: string; name: string; role: string },
    details?: string
  ) {
    const event: TaxonomyAuditEvent = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      nodeId,
      nodeLabel,
      action,
      actor: actor || { id: 'usr_admin', name: 'Administrateur', role: 'admin' },
      timestamp: new Date().toISOString(),
      details,
    };
    this.auditLogs.unshift(event);
    if (this.auditLogs.length > 200) {
      this.auditLogs = this.auditLogs.slice(0, 200);
    }
    this.persistAuditLogs();
  }

  private recordDraftChange(
    nodeId: string,
    nodeLabel: string,
    changeType: TaxonomyDraftChange['changeType'],
    description: string,
    newState: Partial<TaxonomyNode>,
    previousState?: Partial<TaxonomyNode>,
    actor?: { id: string; name: string; role: string }
  ) {
    const draft: TaxonomyDraftChange = {
      id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      nodeId,
      nodeLabel,
      changeType,
      description,
      previousState,
      newState,
      timestamp: new Date().toISOString(),
      actor: actor || { id: 'usr_admin', name: 'Administrateur', role: 'admin' },
    };
    this.draftChanges.push(draft);
    this.persistDrafts();
  }

  // =========================================================================
  // TREE & NODE QUERIES
  // =========================================================================

  getTree(): TaxonomyNode[] {
    return this.nodes;
  }

  getAllNodes(): TaxonomyNode[] {
    const list: TaxonomyNode[] = [];
    const traverse = (node: TaxonomyNode) => {
      list.push(node);
      if (node.children) {
        node.children.forEach(traverse);
      }
    };
    this.nodes.forEach(traverse);
    return list;
  }

  getNode(id: string): TaxonomyNode | undefined {
    let found: TaxonomyNode | undefined;
    const traverse = (node: TaxonomyNode) => {
      if (node.id === id) {
        found = node;
        return;
      }
      if (node.children) {
        node.children.forEach(traverse);
      }
    };
    this.nodes.forEach(traverse);
    return found;
  }

  getNodeBySlug(slug: string): TaxonomyNode | undefined {
    const target = slug.toLowerCase().trim();
    let found: TaxonomyNode | undefined;
    const traverse = (node: TaxonomyNode) => {
      if (node.slug.toLowerCase() === target) {
        found = node;
        return;
      }
      if (node.children) {
        node.children.forEach(traverse);
      }
    };
    this.nodes.forEach(traverse);
    return found;
  }

  // =========================================================================
  // MUTATION OPERATIONS
  // =========================================================================

  async createNode(
    input: CreateTaxonomyNodeInput,
    actor?: { id: string; name: string; role: string }
  ): Promise<TaxonomyNode> {
    const parent = input.parentId ? this.getNode(input.parentId) : undefined;
    const sanitizedSlug = input.slug.toLowerCase().replace(/[^a-z0-9]/gi, '_').replace(/^_+|_+$/g, '');
    const stableId = input.parentId
      ? `${input.parentId}.${sanitizedSlug}`
      : sanitizedSlug;

    // Check duplicate ID
    if (this.getNode(stableId)) {
      throw new Error(`Un nœud avec l'identifiant unique "${stableId}" existe déjà.`);
    }

    const newNode: TaxonomyNode = {
      id: stableId,
      code: stableId.toUpperCase().replace(/\./g, '_'),
      slug: input.slug.toLowerCase().trim(),
      parentId: input.parentId,
      ancestorIds: parent ? [...(parent.ancestorIds || []), parent.id] : [],
      level: input.level,
      publishable: input.publishable ?? (input.level === 'type' || input.level === 'subtype'),
      name: input.name.trim(),
      label: input.label?.trim() || input.name.trim(),
      shortLabel: input.shortLabel?.trim() || undefined,
      labels: { 'fr-FR': input.label?.trim() || input.name.trim() },
      shortLabels: input.shortLabel?.trim() ? { 'fr-FR': input.shortLabel.trim() } : undefined,
      description: input.description?.trim(),
      iconName: input.iconName || (parent?.iconName ?? 'Folder'),
      accentColor: input.accentColor || (parent?.accentColor ?? '#64748B'),
      sortOrder: parent ? (parent.children?.length || 0) + 1 : this.nodes.length + 1,
      status: input.status || 'draft',
      conditionScheme: input.conditionScheme || (parent?.conditionScheme ?? 'consumer_product'),
      attributeIds: input.attributeIds || [],
      capabilities: input.capabilities || (parent?.capabilities ?? {
        canSell: true,
        canGive: true,
        canExchange: true,
        canRent: false,
        reservationAllowed: true,
        securePaymentAllowed: true,
        negotiablePrice: true,
        fulfillmentModes: ['hand_delivery', 'parcel_shipping'],
      }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      children: [],
    };

    if (parent) {
      if (!parent.children) parent.children = [];
      parent.children.push(newNode);
    } else {
      this.nodes.push(newNode);
    }

    this.persistNodes();
    this.recordDraftChange(
      newNode.id,
      newNode.name,
      'created',
      `Création du nœud [${newNode.level}] "${newNode.name}"`,
      newNode,
      undefined,
      actor
    );
    this.logAudit(newNode.id, newNode.name, `Création du nœud ${newNode.name}`, actor);

    return newNode;
  }

  async updateNode(
    id: string,
    updates: UpdateTaxonomyNodeInput,
    actor?: { id: string; name: string; role: string }
  ): Promise<TaxonomyNode> {
    const node = this.getNode(id);
    if (!node) {
      throw new Error(`Nœud avec ID "${id}" introuvable.`);
    }

    const previousState: Partial<TaxonomyNode> = {
      name: node.name,
      label: node.label,
      shortLabel: node.shortLabel,
      slug: node.slug,
      description: node.description,
      iconName: node.iconName,
      status: node.status,
      publishable: node.publishable,
      attributeIds: [...(node.attributeIds || [])],
      capabilities: node.capabilities ? { ...node.capabilities } : undefined,
    };

    // Apply updates (ID remains strictly immutable)
    if (updates.name !== undefined) {
      node.name = updates.name.trim();
      node.labels = { ...(node.labels || {}), 'fr-FR': updates.name.trim() };
    }
    if (updates.label !== undefined) {
      node.label = updates.label.trim();
      node.labels = { ...(node.labels || {}), 'fr-FR': updates.label.trim() };
    }
    if (updates.shortLabel !== undefined) {
      node.shortLabel = updates.shortLabel.trim() || undefined;
      if (updates.shortLabel.trim()) {
        node.shortLabels = { ...(node.shortLabels || {}), 'fr-FR': updates.shortLabel.trim() };
      } else {
        node.shortLabels = undefined;
      }
    }
    if (updates.slug !== undefined) {
      node.slug = updates.slug.toLowerCase().trim();
    }
    if (updates.description !== undefined) node.description = updates.description.trim();
    if (updates.iconName !== undefined) node.iconName = updates.iconName;
    if (updates.accentColor !== undefined) node.accentColor = updates.accentColor;
    if (updates.publishable !== undefined) node.publishable = updates.publishable;
    if (updates.status !== undefined) node.status = updates.status;
    if (updates.sortOrder !== undefined) node.sortOrder = updates.sortOrder;
    if (updates.conditionScheme !== undefined) node.conditionScheme = updates.conditionScheme;
    if (updates.attributeIds !== undefined) node.attributeIds = updates.attributeIds;
    if (updates.summaryAttributeIds !== undefined) node.summaryAttributeIds = updates.summaryAttributeIds;
    if (updates.filterFacetIds !== undefined) node.filterFacetIds = updates.filterFacetIds;
    if (updates.capabilities !== undefined) node.capabilities = updates.capabilities;
    if (updates.sellerEligibility !== undefined) node.sellerEligibility = updates.sellerEligibility;
    if (updates.seo !== undefined) node.seo = updates.seo;
    if (updates.aliases !== undefined) node.aliases = updates.aliases;
    if (updates.synonyms !== undefined) node.synonyms = updates.synonyms;
    if (updates.replacedById !== undefined) node.replacedById = updates.replacedById;

    node.updatedAt = new Date().toISOString();

    this.persistNodes();
    this.recordDraftChange(
      node.id,
      node.name,
      'updated',
      `Mise à jour des propriétés de "${node.name}"`,
      updates as any,
      previousState,
      actor
    );
    this.logAudit(node.id, node.name, `Mise à jour de "${node.name}"`, actor);

    return node;
  }

  async reorderNode(
    id: string,
    direction: 'up' | 'down',
    actor?: { id: string; name: string; role: string }
  ): Promise<void> {
    const node = this.getNode(id);
    if (!node) throw new Error(`Nœud "${id}" introuvable.`);

    let siblings: TaxonomyNode[];
    if (node.parentId) {
      const parent = this.getNode(node.parentId);
      siblings = parent?.children || [];
    } else {
      siblings = this.nodes;
    }

    const currentIndex = siblings.findIndex((s) => s.id === id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= siblings.length) return;

    // Swap siblings
    const temp = siblings[currentIndex];
    siblings[currentIndex] = siblings[targetIndex];
    siblings[targetIndex] = temp;

    // Re-index sortOrder
    siblings.forEach((s, idx) => {
      s.sortOrder = idx + 1;
    });

    this.persistNodes();
    this.recordDraftChange(
      node.id,
      node.name,
      'reordered',
      `Réorganisation : déplacé vers le ${direction === 'up' ? 'haut' : 'bas'}`,
      { sortOrder: node.sortOrder },
      undefined,
      actor
    );
    this.logAudit(node.id, node.name, `Position modifiée (${direction})`, actor);
  }

  async moveNode(
    id: string,
    newParentId: string | null,
    actor?: { id: string; name: string; role: string }
  ): Promise<void> {
    const node = this.getNode(id);
    if (!node) throw new Error(`Nœud "${id}" introuvable.`);

    if (newParentId === node.id) {
      throw new Error('Impossible de déplacer une catégorie sous elle-même.');
    }

    // Cycle detection: cannot move node into own descendant
    if (newParentId) {
      const newParent = this.getNode(newParentId);
      if (!newParent) throw new Error(`Nouveau parent "${newParentId}" introuvable.`);
      if (newParent.ancestorIds?.includes(node.id)) {
        throw new Error(
          `Déplacement interdit (cycle détecté) : "${newParent.name}" est un descendant direct de "${node.name}".`
        );
      }
    }

    // Remove from current parent
    if (node.parentId) {
      const currentParent = this.getNode(node.parentId);
      if (currentParent && currentParent.children) {
        currentParent.children = currentParent.children.filter((c) => c.id !== id);
      }
    } else {
      this.nodes = this.nodes.filter((n) => n.id !== id);
    }

    // Insert into new parent
    if (newParentId) {
      const newParent = this.getNode(newParentId)!;
      if (!newParent.children) newParent.children = [];
      node.parentId = newParent.id;
      node.ancestorIds = [...(newParent.ancestorIds || []), newParent.id];
      node.sortOrder = newParent.children.length + 1;
      newParent.children.push(node);
    } else {
      node.parentId = undefined;
      node.ancestorIds = [];
      node.level = 'category';
      node.sortOrder = this.nodes.length + 1;
      this.nodes.push(node);
    }

    // Recursively update descendants' ancestorIds
    const updateDescendantsAncestors = (current: TaxonomyNode, parentAncestors: string[]) => {
      if (current.children) {
        current.children.forEach((child) => {
          child.ancestorIds = [...parentAncestors, current.id];
          updateDescendantsAncestors(child, child.ancestorIds);
        });
      }
    };
    updateDescendantsAncestors(node, node.ancestorIds || []);

    this.persistNodes();
    this.recordDraftChange(
      node.id,
      node.name,
      'moved',
      `Branche déplacée vers "${newParentId ? this.getNode(newParentId)?.name : 'Racine'}"`,
      { parentId: node.parentId },
      undefined,
      actor
    );
    this.logAudit(node.id, node.name, `Déplacement de branche sous ${newParentId || 'Racine'}`, actor);
  }

  async deprecateNode(
    id: string,
    replacementId?: string,
    actor?: { id: string; name: string; role: string }
  ): Promise<void> {
    const node = this.getNode(id);
    if (!node) throw new Error(`Nœud "${id}" introuvable.`);

    node.status = 'deprecated';
    node.publishable = false;
    node.replacedById = replacementId || undefined;
    node.updatedAt = new Date().toISOString();

    this.persistNodes();
    this.recordDraftChange(
      node.id,
      node.name,
      'deprecated',
      `Catégorie dépréciée${replacementId ? ` (Remplacée par ${this.getNode(replacementId)?.name || replacementId})` : ''}`,
      { status: 'deprecated', replacedById: replacementId },
      undefined,
      actor
    );
    this.logAudit(node.id, node.name, `Dépréciation de catégorie`, actor);
  }

  async deleteNode(
    id: string,
    actor?: { id: string; name: string; role: string }
  ): Promise<{ success: boolean; message?: string }> {
    const node = this.getNode(id);
    if (!node) throw new Error(`Nœud "${id}" introuvable.`);

    const impact = this.analyzeNodeImpact(id);
    if (!impact.isSafeToDelete) {
      return {
        success: false,
        message: `Suppression bloquée : ${impact.blockingReasons.join(' ')} Vous pouvez déprécier cette catégorie à la place.`,
      };
    }

    // Safe deletion
    if (node.parentId) {
      const parent = this.getNode(node.parentId);
      if (parent && parent.children) {
        parent.children = parent.children.filter((c) => c.id !== id);
      }
    } else {
      this.nodes = this.nodes.filter((n) => n.id !== id);
    }

    this.persistNodes();
    this.recordDraftChange(
      node.id,
      node.name,
      'deleted',
      `Suppression définitive du nœud "${node.name}"`,
      {},
      node,
      actor
    );
    this.logAudit(node.id, node.name, `Suppression définitive`, actor);

    return { success: true };
  }

  async duplicateNode(
    id: string,
    actor?: { id: string; name: string; role: string }
  ): Promise<TaxonomyNode> {
    const original = this.getNode(id);
    if (!original) throw new Error(`Nœud "${id}" introuvable.`);

    const copySuffix = `copie_${Math.random().toString(36).substring(2, 6)}`;
    const cloned: TaxonomyNode = JSON.parse(JSON.stringify(original));

    cloned.id = `${original.id}_${copySuffix}`;
    cloned.code = `${original.code}_${copySuffix.toUpperCase()}`;
    cloned.slug = `${original.slug}-${copySuffix}`;
    cloned.name = `${original.name} (Copie)`;
    cloned.label = `${original.label || original.name} (Copie)`;
    cloned.shortLabel = original.shortLabel ? `${original.shortLabel} Copie` : undefined;
    cloned.status = 'draft';
    cloned.createdAt = new Date().toISOString();
    cloned.updatedAt = new Date().toISOString();

    // Attach to parent or root
    if (cloned.parentId) {
      const parent = this.getNode(cloned.parentId);
      if (parent) {
        if (!parent.children) parent.children = [];
        cloned.sortOrder = parent.children.length + 1;
        parent.children.push(cloned);
      }
    } else {
      cloned.sortOrder = this.nodes.length + 1;
      this.nodes.push(cloned);
    }

    this.persistNodes();
    this.recordDraftChange(
      cloned.id,
      cloned.name,
      'created',
      `Duplication depuis "${original.name}"`,
      cloned,
      undefined,
      actor
    );
    this.logAudit(cloned.id, cloned.name, `Nœud dupliqué depuis ${original.id}`, actor);

    return cloned;
  }

  // =========================================================================
  // MARKET OVERRIDES
  // =========================================================================

  async setMarketOverride(
    nodeId: string,
    marketCode: string,
    override: TaxonomyMarketOverride,
    actor?: { id: string; name: string; role: string }
  ): Promise<void> {
    const node = this.getNode(nodeId);
    if (!node) throw new Error(`Nœud "${nodeId}" introuvable.`);

    if (!node.marketOverrides) node.marketOverrides = {};
    node.marketOverrides[marketCode] = override;
    node.updatedAt = new Date().toISOString();

    this.persistNodes();
    this.recordDraftChange(
      node.id,
      node.name,
      'market_override',
      `Surcharge de marché configurée pour le pays ${marketCode}`,
      { marketOverrides: node.marketOverrides },
      undefined,
      actor
    );
    this.logAudit(node.id, node.name, `Surcharge marché ${marketCode} enregistrée`, actor);
  }

  async resetMarketOverride(
    nodeId: string,
    marketCode: string,
    actor?: { id: string; name: string; role: string }
  ): Promise<void> {
    const node = this.getNode(nodeId);
    if (!node) throw new Error(`Nœud "${nodeId}" introuvable.`);

    if (node.marketOverrides && node.marketOverrides[marketCode]) {
      delete node.marketOverrides[marketCode];
      node.updatedAt = new Date().toISOString();
      this.persistNodes();

      this.recordDraftChange(
        node.id,
        node.name,
        'market_override',
        `Réinitialisation de la surcharge pour le pays ${marketCode} (héritage France restauré)`,
        { marketOverrides: node.marketOverrides },
        undefined,
        actor
      );
      this.logAudit(node.id, node.name, `Surcharge marché ${marketCode} réinitialisée sur France`, actor);
    }
  }

  // =========================================================================
  // ATTRIBUTES REGISTRY
  // =========================================================================

  getAllAttributes(): TaxonomyAttribute[] {
    return Object.values(this.attributes);
  }

  getAttribute(id: string): TaxonomyAttribute | undefined {
    return this.attributes[id];
  }

  async saveAttribute(
    attr: TaxonomyAttribute,
    actor?: { id: string; name: string; role: string }
  ): Promise<TaxonomyAttribute> {
    const isNew = !this.attributes[attr.id];
    this.attributes[attr.id] = { ...attr };
    this.persistAttributes();

    this.logAudit(
      attr.id,
      attr.label,
      isNew ? `Création de l'attribut "${attr.label}"` : `Mise à jour de l'attribut "${attr.label}"`,
      actor
    );
    return this.attributes[attr.id];
  }

  async deprecateAttribute(
    attrId: string,
    actor?: { id: string; name: string; role: string }
  ): Promise<void> {
    const attr = this.attributes[attrId];
    if (!attr) return;
    this.logAudit(attrId, attr.label, `Dépréciation de l'attribut "${attr.label}"`, actor);
  }

  // =========================================================================
  // DRAFTS, VERSIONS & PUBLICATION
  // =========================================================================

  getDraftChanges(): TaxonomyDraftChange[] {
    return this.draftChanges;
  }

  async discardDraft(): Promise<void> {
    this.draftChanges = [];
    this.persistDrafts();
    this.loadInitialData();
  }

  async publishDraft(
    description?: string,
    actor?: { id: string; name: string; role: string }
  ): Promise<TaxonomyVersion> {
    const validationIssues = this.validateTaxonomy();
    const blockingErrors = validationIssues.filter((i) => i.severity === 'error');

    if (blockingErrors.length > 0) {
      throw new Error(
        `Publication impossible : ${blockingErrors.length} erreur(s) bloquante(s) détectée(s). Veuillez corriger les anomalies avant de publier.`
      );
    }

    const nextVersionNumber = this.versions.length + 1;
    const newVersion: TaxonomyVersion = {
      id: `ver_${nextVersionNumber}_${Date.now()}`,
      versionNumber: nextVersionNumber,
      status: 'published',
      changeCount: this.draftChanges.length,
      description: description || `Publication de la version ${nextVersionNumber} de la taxonomie`,
      publishedAt: new Date().toISOString(),
      publishedBy: actor?.name || 'Administrateur',
      createdAt: new Date().toISOString(),
    };

    this.versions.unshift(newVersion);
    this.persistVersions();

    // Clear draft changes
    const changeCount = this.draftChanges.length;
    this.draftChanges = [];
    this.persistDrafts();

    this.logAudit(
      'global',
      'Taxonomie Globale',
      `Publication de la version ${newVersion.versionNumber}`,
      actor,
      `${changeCount} modification(s) publiées avec succès.`
    );

    return newVersion;
  }

  getVersions(): TaxonomyVersion[] {
    return this.versions;
  }

  // =========================================================================
  // VALIDATION & IMPACT ANALYSIS
  // =========================================================================

  validateTaxonomy(): TaxonomyValidationIssue[] {
    const issues: TaxonomyValidationIssue[] = [];
    const allNodes = this.getAllNodes();
    const seenIds = new Set<string>();
    const seenSlugs = new Set<string>();
    const seenShortLabels = new Set<string>();

    allNodes.forEach((node) => {
      // 1. Stable ID
      if (!node.id || node.id.trim().length === 0) {
        issues.push({
          id: `val_id_${Math.random()}`,
          nodeId: node.id,
          nodeLabel: node.name || 'Nœud sans nom',
          severity: 'error',
          code: 'MISSING_ID',
          message: 'Ce nœud ne possède pas d\'identifiant canonique stable (ID).',
          remediation: 'Définissez un identifiant stable unique.',
        });
      } else if (seenIds.has(node.id)) {
        issues.push({
          id: `val_dup_id_${node.id}`,
          nodeId: node.id,
          nodeLabel: node.name,
          severity: 'error',
          code: 'DUPLICATE_ID',
          message: `L'identifiant "${node.id}" est dupliqué dans la taxonomie.`,
          remediation: 'Assurez l\'unicité globale des IDs.',
        });
      }
      seenIds.add(node.id);

      // 2. Slug
      if (!node.slug || node.slug.trim().length === 0) {
        issues.push({
          id: `val_slug_${node.id}`,
          nodeId: node.id,
          nodeLabel: node.name,
          severity: 'error',
          code: 'MISSING_SLUG',
          message: 'Le slug d\'URL est manquant.',
          field: 'slug',
          remediation: 'Renseignez un slug URL valide (ex: /ma-categorie).',
        });
      } else {
        const siblingKey = `${node.parentId || 'root'}:${node.slug.toLowerCase().trim()}`;
        if (seenSlugs.has(siblingKey)) {
          issues.push({
            id: `val_dup_slug_${node.id}`,
            nodeId: node.id,
            nodeLabel: node.name,
            severity: 'error',
            code: 'DUPLICATE_SIBLING_SLUG',
            message: `Le slug "/${node.slug}" est en conflit avec une autre catégorie au même niveau.`,
            field: 'slug',
            remediation: 'Utilisez un slug distinct pour chaque sous-catégorie soeur.',
          });
        }
        seenSlugs.add(siblingKey);
      }

      // 3. Parent reference
      if (node.parentId && !this.getNode(node.parentId)) {
        issues.push({
          id: `val_parent_${node.id}`,
          nodeId: node.id,
          nodeLabel: node.name,
          severity: 'error',
          code: 'BROKEN_PARENT',
          message: `Le nœud parentId "${node.parentId}" n'existe pas dans le référentiel.`,
          remediation: 'Rattachez cette catégorie à un parent valide ou placez-la à la racine.',
        });
      }

      // 4. Attribute definitions check
      if (node.attributeIds) {
        node.attributeIds.forEach((attrId) => {
          if (!this.attributes[attrId]) {
            issues.push({
              id: `val_attr_${node.id}_${attrId}`,
              nodeId: node.id,
              nodeLabel: node.name,
              severity: 'error',
              code: 'UNKNOWN_ATTRIBUTE',
              message: `Référence vers l'attribut inconnu "${attrId}".`,
              field: 'attributeIds',
              remediation: 'Créez cet attribut dans le Registre ou retirez-le de la catégorie.',
            });
          }
        });
      }

      // 5. Capability sanity checks
      if (node.capabilities) {
        const modes = node.capabilities.fulfillmentModes || [];
        // Real estate or job should not have parcel shipping
        if (node.id.startsWith('real_estate') && modes.includes('parcel_shipping')) {
          issues.push({
            id: `val_cap_immo_${node.id}`,
            nodeId: node.id,
            nodeLabel: node.name,
            severity: 'warning',
            code: 'INVALID_CAPABILITY_COMBO',
            message: 'La catégorie Immobilière autorise la livraison par colis.',
            field: 'capabilities',
            remediation: 'Retirez l\'expédition de colis pour les transactions immobilières.',
          });
        }
      }

      // 6. shortLabel formatting & length checks
      if (node.shortLabel) {
        if (node.shortLabel.trim().length === 0) {
          issues.push({
            id: `val_short_empty_${node.id}`,
            nodeId: node.id,
            nodeLabel: node.name,
            severity: 'warning',
            code: 'EMPTY_SHORT_LABEL',
            message: 'Le champ nom court contient des espaces vides.',
            field: 'shortLabel',
            remediation: 'Renseignez un alias valide ou laissez le champ vide.',
          });
        } else if (node.shortLabel.length > node.name.length + 2) {
          issues.push({
            id: `val_short_len_${node.id}`,
            nodeId: node.id,
            nodeLabel: node.name,
            severity: 'info',
            code: 'SHORT_LABEL_LONGER_THAN_NAME',
            message: `Le nom court ("${node.shortLabel}") est plus long que le nom standard ("${node.name}").`,
            field: 'shortLabel',
            remediation: 'Utilisez un libellé véritablement compact.',
          });
        }

        // Duplicate shortLabel among siblings
        const siblingShortKey = `${node.parentId || 'root'}:${node.shortLabel.toLowerCase().trim()}`;
        if (seenShortLabels.has(siblingShortKey)) {
          issues.push({
            id: `val_dup_short_${node.id}`,
            nodeId: node.id,
            nodeLabel: node.name,
            severity: 'warning',
            code: 'DUPLICATE_SIBLING_SHORT_LABEL',
            message: `L'alias court "${node.shortLabel}" est partagé par plusieurs rubriques soeurs.`,
            field: 'shortLabel',
            remediation: 'Donnez un alias compact unique pour éviter toute confusion dans les menus mobiles.',
          });
        }
        seenShortLabels.add(siblingShortKey);
      }

      // 7. Long label without shortLabel
      if (node.name.length > 25 && !node.shortLabel) {
        issues.push({
          id: `val_short_missing_${node.id}`,
          nodeId: node.id,
          nodeLabel: node.name,
          severity: 'info',
          code: 'RECOMMENDED_SHORT_LABEL',
          message: `Le nom complet ("${node.name}") est long (${node.name.length} caractères) sans alias court.`,
          field: 'shortLabel',
          remediation: 'Ajoutez un nom court pour améliorer le rendu sur mobile et filtres compacts.',
        });
      }
    });

    return issues;
  }

  analyzeNodeImpact(nodeId: string): TaxonomyImpactReport {
    const node = this.getNode(nodeId);
    if (!node) {
      return {
        nodeId,
        nodeLabel: 'Inconnu',
        activeListingsCount: 0,
        descendantsCount: 0,
        publishableLeavesCount: 0,
        savedSearchesCount: 0,
        marketOverridesCount: 0,
        isSafeToDelete: false,
        blockingReasons: ['Nœud introuvable.'],
      };
    }

    let descendantsCount = 0;
    let publishableLeavesCount = 0;
    const countDescendants = (n: TaxonomyNode) => {
      if (n.children && n.children.length > 0) {
        descendantsCount += n.children.length;
        n.children.forEach(countDescendants);
      } else if (n.publishable !== false) {
        publishableLeavesCount += 1;
      }
    };
    countDescendants(node);

    // Deterministic simulation based on node depth, status & known sample fixtures
    const isRoot = !node.parentId;
    const isDraft = node.status === 'draft';
    const simulatedListings = isDraft && descendantsCount === 0
      ? 0
      : isRoot
      ? Math.floor(descendantsCount * 18 + 45)
      : (node.children?.length ? node.children.length * 12 + 6 : 8);
    const simulatedSavedSearches = isDraft ? 0 : (isRoot ? Math.floor(descendantsCount * 4 + 10) : 3);
    const marketOverridesCount = node.marketOverrides ? Object.keys(node.marketOverrides).length : 0;

    const blockingReasons: string[] = [];
    if (descendantsCount > 0) {
      blockingReasons.push(`Cette catégorie possède ${descendantsCount} sous-catégories / types enfants.`);
    }
    if (simulatedListings > 0) {
      blockingReasons.push(`Elle est activement référencée par environ ${simulatedListings} annonce(s) en ligne.`);
    }

    return {
      nodeId: node.id,
      nodeLabel: node.name,
      activeListingsCount: simulatedListings,
      descendantsCount,
      publishableLeavesCount,
      savedSearchesCount: simulatedSavedSearches,
      marketOverridesCount,
      isSafeToDelete: blockingReasons.length === 0,
      blockingReasons,
    };
  }

  getAuditHistory(nodeId?: string): TaxonomyAuditEvent[] {
    if (!nodeId || nodeId === 'global') {
      return this.auditLogs;
    }
    return this.auditLogs.filter((l) => l.nodeId === nodeId);
  }

  // =========================================================================
  // IMPORT & EXPORT
  // =========================================================================

  exportTaxonomyJSON(): string {
    const payload = {
      exportVersion: '1.0',
      exportedAt: new Date().toISOString(),
      nodes: this.nodes,
      attributes: this.attributes,
    };
    return JSON.stringify(payload, null, 2);
  }

  importTaxonomyJSON(
    jsonString: string,
    actor?: { id: string; name: string; role: string }
  ): { success: boolean; newCount: number; updatedCount: number; errors: string[] } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
        return {
          success: false,
          newCount: 0,
          updatedCount: 0,
          errors: ['Format de fichier invalide : propriété "nodes" absente ou non conforme.'],
        };
      }

      let newCount = 0;
      let updatedCount = 0;

      // Validate imported nodes
      this.nodes = parsed.nodes;
      if (parsed.attributes && typeof parsed.attributes === 'object') {
        this.attributes = parsed.attributes;
        this.persistAttributes();
      }
      this.persistNodes();

      const validationIssues = this.validateTaxonomy();
      const errors = validationIssues.filter((i) => i.severity === 'error').map((i) => i.message);

      this.logAudit(
        'global',
        'Import de taxonomie',
        'Import de fichier JSON de taxonomie',
        actor,
        `${parsed.nodes.length} univers importés.`
      );

      return {
        success: errors.length === 0,
        newCount: parsed.nodes.length,
        updatedCount,
        errors,
      };
    } catch (e: any) {
      return {
        success: false,
        newCount: 0,
        updatedCount: 0,
        errors: [`Erreur de parsing JSON : ${e?.message || 'Syntaxe JSON invalide'}`],
      };
    }
  }

  async resetToCanonical(): Promise<void> {
    storageService.remove(STORAGE_KEYS.TAXONOMY_NODES);
    storageService.remove(STORAGE_KEYS.ATTRIBUTES);
    storageService.remove(STORAGE_KEYS.DRAFT_CHANGES);
    this.loadInitialData();
  }
}

export const taxonomyAdminRepository = new TaxonomyAdminRepository();
