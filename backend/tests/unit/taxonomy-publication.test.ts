import { describe, expect, it, vi } from "vitest";
import { PublishedTaxonomyService } from "../../src/modules/taxonomy/taxonomy.runtime.js";
import { TaxonomyV1Service } from "../../src/modules/taxonomy/taxonomy.v1.service.js";
import { TAXONOMY_V1_PRIVATE_BUNDLE as bundle } from "../../taxonomy/generated/taxonomy-v1.private.js";
import { inspectTaxonomy } from "../../src/modules/taxonomy/taxonomy.integrity.js";
import { resolveMarketContext } from "@shongre/contracts";

const marketContext = resolveMarketContext({
  hostname: "shongre.fr",
  pathname: "/",
  infrastructure: {
    globalDomain: "shongre.com",
    franceDomain: "shongre.fr",
    canonicalProtocol: "https",
  },
});
const phone = {
  marketContext,
  categoryIdentity: "electronics.smartphones.phones",
  sellerType: "individual" as const,
  locale: "fr-FR",
};
describe("published taxonomy revisions", () => {
  it("invalidates the immutable resolver and refuses failures or stale expected revisions", async () => {
    const getPublished = vi
      .fn()
      .mockResolvedValue({ revision: 1, checksum: "a".repeat(64), bundle });
    const service = new PublishedTaxonomyService({ getPublished });
    const first = await service.snapshot(1);
    const next = structuredClone(bundle);
    next.categories.find((node) => node.id === "electronics")!.shortLabels[
      "fr-FR"
    ] = "Électronique revue";
    getPublished.mockResolvedValue({
      revision: 2,
      checksum: "b".repeat(64),
      bundle: next,
    });
    expect(
      (await service.snapshot()).projectIdentity("electronics")?.rootLabels[
        "fr-FR"
      ],
    ).toBe("Électronique revue");
    expect(first.projectIdentity("electronics")?.rootLabels["fr-FR"]).not.toBe(
      "Électronique revue",
    );
    await expect(service.snapshot(1)).rejects.toMatchObject({
      code: "CONFLICT",
    });
    getPublished.mockRejectedValue(new Error("database unavailable"));
    await expect(service.snapshot()).rejects.toThrow("database unavailable");
  });
  it("preserves every leaf and rejects malformed authoring relationships", () => {
    expect(inspectTaxonomy(bundle).issues).toEqual([]);
    const invalid = structuredClone(bundle);
    invalid.categories[0].parentId = invalid.categories[0].id;
    invalid.projections.cardFields[0].field = {
      kind: "attribute",
      key: "missing-field",
    };
    invalid.bindings.push({ ...invalid.bindings[0] });
    invalid.optionParentLinks.push({
      optionId: invalid.options[0].id,
      parentOptionId: invalid.options[0].id,
    });
    expect(inspectTaxonomy(invalid).issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "invalid_parent",
        "invalid_projection_field",
        "duplicate_binding",
        "invalid_option_parent",
      ]),
    );
  });
  it("has a resolvable schema for every declared publication flow", () => {
    const service = new TaxonomyV1Service(bundle, 1);
    const flows = new Set<string>();
    for (const type of bundle.listingTypes) {
      const schema = service.resolve({
        marketContext,
        categoryIdentity: type.categoryId,
        listingTypeId: type.id,
        sellerType: type.sellerEligibility.individualAllowed
          ? "individual"
          : "professional",
        locale: "fr-FR",
      });
      expect(schema.attributes.length, type.id).toBeGreaterThan(0);
      expect(
        schema.attributes.every(
          (field) => field.definition.privacy === "public",
        ),
      ).toBe(true);
      flows.add(type.publicationFlow);
    }
    expect(flows.size).toBe(22);
  });
  it("validates verified phone dependencies and leaves seller facts independent", () => {
    expect(
      new TaxonomyV1Service(bundle, 7).projectIdentity(
        "electronics.smartphones.phones",
        "phone_reference_brand:apple",
      )?.brandLabels?.["fr-FR"],
    ).toBe("Apple");
    const service = new TaxonomyV1Service(bundle, 1);
    const values = {
      phone_reference_brand: "apple",
      phone_reference_family: "iphone",
      phone_reference_model: "iphone_15_a3090",
      phone_reference_variant: "iphone15_a3090_128_black",
      battery_health_percent: 89,
      repair_history_status: "unknown",
    };
    const referenceFields = new Set(Object.keys(values));
    expect(
      service
        .validate({ ...phone, attributes: values })
        .issues.filter((issue) => referenceFields.has(issue.attributeId)),
    ).toEqual([]);
    expect(
      service.lookupOptions({
        optionSetId: "phone_reference_variant",
        parentOptionId: "phone_reference_model:iphone_15_a3090",
        marketContext,
      }).items,
    ).toHaveLength(15);
    const invalid = service.validate({
      ...phone,
      attributes: {
        ...values,
        phone_reference_family: "missing",
        storage_capacity_gb: 1024,
      },
    });
    expect(invalid.issues.map((issue) => issue.code)).toContain(
      "TAXONOMY_INVALID_OPTION_PARENT",
    );
    expect(invalid.issues).toContainEqual(
      expect.objectContaining({
        attributeId: "storage_capacity_gb",
        code: "TAXONOMY_ATTRIBUTE_NOT_APPLICABLE",
      }),
    );
  });
});
