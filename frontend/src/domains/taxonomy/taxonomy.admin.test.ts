import { describe, it, expect, beforeEach } from 'vitest';
import { taxonomyAdminRepository } from '../../repositories/taxonomy.repository';
import { taxonomyService } from './taxonomy.service';

describe('Taxonomy Administration & Repository Governance', () => {
  beforeEach(async () => {
    await taxonomyAdminRepository.resetToCanonical();
    taxonomyService.reload(taxonomyAdminRepository.getTree());
  });

  it('loads canonical tree containing all root categories', () => {
    const tree = taxonomyAdminRepository.getTree();
    expect(tree.length).toBeGreaterThanOrEqual(10);
    const vehicles = tree.find((n) => n.id === 'vehicles');
    expect(vehicles).toBeDefined();
    expect(vehicles?.name).toBe('Véhicules');
  });

  it('creates a new child node with stable ID, draft status, and draft change log', async () => {
    const created = await taxonomyAdminRepository.createNode({
      parentId: 'vehicles.cars',
      level: 'type',
      name: 'Voitures Électriques Test',
      label: 'Voitures Électriques Test',
      shortLabel: 'Électriques Test',
      slug: 'voitures-electriques-test',
      publishable: true,
      status: 'draft',
    });

    expect(created.id).toBe('vehicles.cars.voitures_electriques_test');
    expect(created.status).toBe('draft');
    expect(created.shortLabel).toBe('Électriques Test');

    const drafts = taxonomyAdminRepository.getDraftChanges();
    expect(drafts.length).toBeGreaterThanOrEqual(1);
    expect(drafts.some((d) => d.nodeId === created.id && d.changeType === 'created')).toBe(true);
  });

  it('preserves immutable stable ID when renaming canonical label and shortLabel', async () => {
    const originalNode = taxonomyAdminRepository.getNode('vehicles.cars');
    expect(originalNode).toBeDefined();
    const originalId = originalNode!.id;

    const updated = await taxonomyAdminRepository.updateNode(originalId, {
      name: 'Voitures & Véhicules Particuliers',
      label: 'Voitures & Véhicules Particuliers',
      shortLabel: 'Voitures & Autos',
    });

    expect(updated.id).toBe(originalId);
    expect(updated.name).toBe('Voitures & Véhicules Particuliers');
    expect(updated.shortLabel).toBe('Voitures & Autos');
  });

  it('swaps sort order correctly when reordering siblings', async () => {
    const parent = taxonomyAdminRepository.getNode('vehicles');
    expect(parent?.children).toBeDefined();
    expect(parent!.children!.length).toBeGreaterThan(1);

    const firstChild = parent!.children![0];
    const secondChild = parent!.children![1];

    await taxonomyAdminRepository.reorderNode(firstChild.id, 'down');

    const refreshedParent = taxonomyAdminRepository.getNode('vehicles');
    expect(refreshedParent!.children![0].id).toBe(secondChild.id);
    expect(refreshedParent!.children![1].id).toBe(firstChild.id);
  });

  it('prevents cyclic branch moves (moving a node into its own descendant)', async () => {
    // vehicles -> vehicles.cars
    // Attempting to move 'vehicles' into 'vehicles.cars' must throw cycle error
    await expect(
      taxonomyAdminRepository.moveNode('vehicles', 'vehicles.cars')
    ).rejects.toThrow(/cycle/i);
  });

  it('moves a valid branch and updates ancestor IDs correctly', async () => {
    // Create a temporary child under electronics
    const tempNode = await taxonomyAdminRepository.createNode({
      parentId: 'electronics',
      level: 'subcategory',
      name: 'Domotique & Objets Connectés',
      slug: 'domotique-connectee',
    });

    // Move from electronics to home_garden
    await taxonomyAdminRepository.moveNode(tempNode.id, 'home_garden');

    const refreshed = taxonomyAdminRepository.getNode(tempNode.id);
    expect(refreshed?.parentId).toBe('home_garden');
    expect(refreshed?.ancestorIds).toContain('home_garden');
  });

  it('deprecates a category, unpublishes it, and maps successor replacement', async () => {
    await taxonomyAdminRepository.deprecateNode('vehicles.cars', 'vehicles.motos');

    const node = taxonomyAdminRepository.getNode('vehicles.cars');
    expect(node?.status).toBe('deprecated');
    expect(node?.publishable).toBe(false);
    expect(node?.replacedById).toBe('vehicles.motos');
  });

  it('blocks permanent deletion when active listings or child branches exist', async () => {
    const res = await taxonomyAdminRepository.deleteNode('vehicles');
    expect(res.success).toBe(false);
    expect(res.message).toMatch(/bloquée/i);
  });

  it('allows safe permanent deletion when node is an empty leaf with zero listings', async () => {
    const emptyNode = await taxonomyAdminRepository.createNode({
      parentId: 'pets',
      level: 'subcategory',
      name: 'Reptiles & Terrariophilie Test',
      slug: 'reptiles-test',
    });

    const res = await taxonomyAdminRepository.deleteNode(emptyNode.id);
    expect(res.success).toBe(true);
    expect(taxonomyAdminRepository.getNode(emptyNode.id)).toBeUndefined();
  });

  it('duplicates a node into a new draft entity with unique slug and ID', async () => {
    const copy = await taxonomyAdminRepository.duplicateNode('vehicles.cars');
    expect(copy.id).not.toBe('vehicles.cars');
    expect(copy.id).toContain('vehicles.cars_copie');
    expect(copy.slug).toContain('voitures-copie');
    expect(copy.status).toBe('draft');
  });

  it('configures and resets market overrides with France inheritance restoration', async () => {
    await taxonomyAdminRepository.setMarketOverride('vehicles.cars', 'BE', {
      capabilities: {
        securePaymentAllowed: false,
      },
    });

    let node = taxonomyAdminRepository.getNode('vehicles.cars');
    expect(node?.marketOverrides?.BE?.capabilities?.securePaymentAllowed).toBe(false);

    // Reset market override
    await taxonomyAdminRepository.resetMarketOverride('vehicles.cars', 'BE');
    node = taxonomyAdminRepository.getNode('vehicles.cars');
    expect(node?.marketOverrides?.BE).toBeUndefined();
  });

  it('validates taxonomy and detects blocking errors', () => {
    const issues = taxonomyAdminRepository.validateTaxonomy();
    const blocking = issues.filter((i) => i.severity === 'error');
    expect(blocking).toHaveLength(0);
  });

  it('publishes staged drafts, increments version number, and records audit trail', async () => {
    await taxonomyAdminRepository.createNode({
      parentId: 'leisure_culture',
      level: 'subcategory',
      name: 'Mangas & Comics Rares',
      slug: 'mangas-comics-rares',
    });

    const initialVersions = taxonomyAdminRepository.getVersions().length;
    const newVersion = await taxonomyAdminRepository.publishDraft('Publication test mangas');

    expect(newVersion.versionNumber).toBe(initialVersions + 1);
    expect(taxonomyAdminRepository.getDraftChanges()).toHaveLength(0);

    const audit = taxonomyAdminRepository.getAuditHistory();
    expect(audit.some((a) => a.action.includes('Publication de la version'))).toBe(true);
  });

  it('exports and imports JSON taxonomy without data loss', () => {
    const json = taxonomyAdminRepository.exportTaxonomyJSON();
    expect(json).toBeTruthy();
    expect(json).toContain('vehicles');

    const importRes = taxonomyAdminRepository.importTaxonomyJSON(json);
    expect(importRes.success).toBe(true);
    expect(importRes.errors).toHaveLength(0);
  });
});
