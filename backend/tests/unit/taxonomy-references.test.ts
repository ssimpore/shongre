import { describe, expect, it } from "vitest";
import { TAXONOMY_V1_PRIVATE_BUNDLE as bundle } from "../../taxonomy/generated/taxonomy-v1.private.js";
import { TaxonomyV1Service } from "../../src/modules/taxonomy/taxonomy.v1.service.js";
import {
  inspectTaxonomyReferences,
  taxonomyReferenceChange,
} from "../../src/modules/taxonomy/taxonomy.references.js";
import { PublishedTaxonomyService } from "../../src/modules/taxonomy/taxonomy.runtime.js";
import { taxonomyRecords } from "../../src/modules/taxonomy/taxonomy.editor.js";
import { taxonomyReferenceEntrySchema } from "../../src/modules/taxonomy/taxonomy.references.js";

describe("canonical v1 domain references", () => {
  it("exports one editable value per field and restores the complete persisted reference on import", () => {
    const exported = JSON.parse(
      JSON.stringify(taxonomyRecords(bundle, "referenceEntries")),
    );
    for (const raw of exported) {
      const entry = taxonomyReferenceEntrySchema.parse(raw);
      const original = bundle.referenceEntries.find(
        (row) => row.id === entry.id,
      )!;
      expect(taxonomyReferenceChange(entry)).toEqual(
        taxonomyReferenceChange(original),
      );
      if (entry.values.public_payload)
        expect(entry.values.public_payload).not.toHaveProperty("label");
    }
  });
  it("preserves imported reference identities and isolates markets", () => {
    expect(bundle.referenceEntries).toHaveLength(144);
    expect(inspectTaxonomyReferences(bundle.referenceEntries)).toEqual([]);
    const taxonomy = new TaxonomyV1Service(bundle, 1);
    expect(taxonomy.getReferences("course_subjects", "FR")).toHaveLength(15);
    expect(taxonomy.getReferences("course_subjects", "BE")).toEqual([]);
    expect(
      taxonomy
        .getReferences("auto_catalog_entries", "FR")
        .find((row) => row.id === "peugeot-3008")?.parentId,
    ).toBe("peugeot");
  });
  it("projects active public options from the requested market and publication revision", () => {
    const edited = structuredClone(bundle);
    const diesel = edited.options.find(
      (option) => option.optionSetId === "fuel_type" && option.key === "diesel",
    )!;
    diesel.labels["fr-FR"] = "Énergie publiée";
    const petrol = edited.options.find(
      (option) => option.optionSetId === "fuel_type" && option.key === "petrol",
    )!;
    petrol.active = false;
    const taxonomy = new TaxonomyV1Service(edited, 42);
    const result = taxonomy.getOptionSets("FR", ["fuel_type"]);
    expect(result.revision).toBe(42);
    expect(
      result.optionSets.fuel_type.find((option) => option.key === "diesel")
        ?.labels["fr-FR"],
    ).toBe("Énergie publiée");
    expect(
      result.optionSets.fuel_type.some((option) => option.key === "petrol"),
    ).toBe(false);
    expect(
      taxonomy.getOptionSets("SN", ["fuel_type"]).optionSets.fuel_type,
    ).toEqual([]);
    expect(
      taxonomy.getOptionSets("FR", ["not-a-public-option-set"]).optionSets[
        "not-a-public-option-set"
      ],
    ).toEqual([]);
  });

  it("rejects mismatched keys, markets, parent references and field types", () => {
    for (const change of [
      { market_code: "BE" },
      { id: "replacement" },
      { parent_id: "missing" },
      {
        parent_id: bundle.referenceEntries.find(
          (row) => row.namespace === "course_subjects",
        )!.key,
      },
      { is_active: "true" },
    ]) {
      const entries = structuredClone(bundle.referenceEntries);
      const subject = entries.find(
        (row) => row.namespace === "course_subjects",
      )!;
      Object.assign(subject.values, change);
      expect(
        inspectTaxonomyReferences(entries).some((row) => row.id === subject.id),
      ).toBe(true);
    }
  });
  it("publishes label changes once without letting draft rows or stale payloads become a second source", async () => {
    const original = { revision: 1, checksum: "a".repeat(64), bundle };
    let publication = original;
    const runtime = new PublishedTaxonomyService({
      getPublished: async () => publication,
    });
    const before = await runtime.snapshot();
    const draft = structuredClone(bundle);
    const subject = draft.referenceEntries.find(
      (row) => row.namespace === "course_subjects",
    )!;
    const oldLabel = String(subject.values.label);
    subject.values.label = "Edited subject";
    expect(
      (await runtime.snapshot())
        .getReferences("course_subjects", "FR", true)
        .find((row) => row.id === subject.key)?.label,
    ).toBe(oldLabel);
    const change = taxonomyReferenceChange(subject);
    expect(change.table).toBe("course_subjects");
    expect(change.values).toMatchObject({
      label: "Edited subject",
      public_payload: { label: "Edited subject" },
    });
    publication = { revision: 2, checksum: "b".repeat(64), bundle: draft };
    expect(
      (await runtime.snapshot())
        .getReferences("course_subjects", "FR", true)
        .find((row) => row.id === subject.key)?.label,
    ).toBe("Edited subject");
    expect(
      before
        .getReferences("course_subjects", "FR", true)
        .find((row) => row.id === subject.key)?.label,
    ).toBe(oldLabel);
    await expect(runtime.snapshot(1)).rejects.toMatchObject({
      code: "CONFLICT",
    });
    publication = original;
    expect((await runtime.snapshot()).revision).toBe(1);
  });
});
