import { describe, expect, it, vi } from "vitest";
import { TAXONOMY_V4_PRIVATE_BUNDLE as bundle } from "../../src/modules/taxonomy/generated/taxonomy-v4.private.js";
import { taxonomyImpact } from "../../src/modules/taxonomy/taxonomy.impact.js";
import { TaxonomyGovernanceService } from "../../src/modules/taxonomy/taxonomy.governance.js";
import { PostgresTaxonomyPublicationRepository } from "../../src/infrastructure/database/repositories/taxonomy-publication.repository.js";

describe("taxonomy revision review", () => {
  it("reports changed dependency, binding and presentation owners without requiring a category edit", () => {
    const next = structuredClone(bundle);
    const phone = next.listingTypes.find(
      (type) => type.categoryId === "electronics.smartphones.phones",
    )!;
    next.dependencies.push({
      ...next.dependencies[0],
      id: "phone_review",
      scopes: [phone.categoryId],
    });
    const binding = next.bindings.find(
      (row) => row.listingTypeId !== phone.id,
    )!;
    const oldOwner = binding.listingTypeId;
    binding.listingTypeId = phone.id;
    const impact = taxonomyImpact(bundle, next);
    expect(impact.categoryIds).toEqual([]);
    expect(impact.listingTypeIds).toEqual(
      expect.arrayContaining([phone.id, oldOwner]),
    );
    expect(impact.attributeIds).toContain(binding.attributeId);
    const presentation = structuredClone(bundle);
    const card = presentation.projections.cardFields[0];
    presentation.projections.cardFields =
      presentation.projections.cardFields.filter((row) => row !== card);
    expect(taxonomyImpact(bundle, presentation).listingTypeIds).toContain(
      card.listingTypeId,
    );
  });

  it("rejects unknown nested import fields before making a database write", async () => {
    const repository = new PostgresTaxonomyPublicationRepository();
    vi.spyOn(repository, "getDraft").mockResolvedValue({
      revision: 3,
      publishedRevision: 1,
      checksum: "a".repeat(64),
      bundle,
    });
    const write = vi
      .spyOn(repository, "update")
      .mockRejectedValue(new Error("unexpected write"));
    const service = new TaxonomyGovernanceService(repository);
    const category = bundle.categories[0];
    await expect(
      service.update(
        {
          resource: "categories",
          expectedRevision: 3,
          changeReason: "Check import fields",
          records: [
            {
              ...category,
              sellerEligibility: {
                ...category.sellerEligibility,
                misspelledRule: true,
              },
            },
          ],
        },
        { actorId: "reviewer" },
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(write).not.toHaveBeenCalled();
  });
});
