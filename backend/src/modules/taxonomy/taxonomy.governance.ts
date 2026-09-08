import {
  inspectTaxonomyReferences,
  readTaxonomyReferences,
} from "./taxonomy.references.js";
import { z } from "zod";
import { TAXONOMY_ADMIN_CONSTRAINTS } from "@shongre/contracts/taxonomy";
import { getCountryConfig } from "@shongre/contracts";
import { PostgresTaxonomyPublicationRepository } from "../../infrastructure/database/repositories/taxonomy-publication.repository.js";
import { AppError } from "../../shared/errors/app-error.js";
import { taxonomyPrivateBundleSchema } from "./taxonomy.bundle.js";
import { inspectTaxonomy } from "./taxonomy.integrity.js";
import { taxonomyImpact } from "./taxonomy.impact.js";
import {
  TAXONOMY_ADMIN_RESOURCES,
  taxonomyRecords,
  taxonomyRecordKey,
  mergeTaxonomyRecords,
  taxonomyRecordChanges,
} from "./taxonomy.editor.js";

const reason = z
  .string()
  .trim()
  .min(TAXONOMY_ADMIN_CONSTRAINTS.changeReason.min)
  .max(TAXONOMY_ADMIN_CONSTRAINTS.changeReason.max);
const updateSchema = z
  .object({
    expectedRevision: z.number().int().nonnegative(),
    resource: z.enum(TAXONOMY_ADMIN_RESOURCES),
    records: z
      .array(z.record(z.unknown()))
      .min(1)
      .max(TAXONOMY_ADMIN_CONSTRAINTS.updateBatchSize),
    changeReason: reason,
  })
  .strict();
const actionSchema = z
  .object({
    expectedRevision: z.number().int().nonnegative(),
    changeReason: reason,
    targetRevision: z.number().int().positive().optional(),
  })
  .strict();
type Actor = { actorId: string; requestId?: string };

export class TaxonomyGovernanceService {
  constructor(
    private readonly repository = new PostgresTaxonomyPublicationRepository(),
  ) {}

  async page(query: URLSearchParams) {
    const resource = z
      .enum(TAXONOMY_ADMIN_RESOURCES)
      .parse(query.get("resource") ?? "categories");
    const offset = z.coerce
      .number()
      .int()
      .nonnegative()
      .parse(query.get("offset") ?? 0);
    const limit = z.coerce
      .number()
      .int()
      .min(1)
      .max(200)
      .parse(query.get("limit") ?? 100);
    const search = z
      .string()
      .max(200)
      .parse(query.get("q") ?? "")
      .trim()
      .toLocaleLowerCase("fr-FR");
    const { bundle, ...draft } = await this.repository.getDraft();
    const records = taxonomyRecords(bundle, resource).filter(
      (row) =>
        !search ||
        JSON.stringify(row).toLocaleLowerCase("fr-FR").includes(search),
    );
    return {
      ...draft,
      resource,
      total: records.length,
      offset,
      records: records.slice(offset, offset + limit),
      resources: TAXONOMY_ADMIN_RESOURCES.map((key) => ({
        resource: key,
        count: taxonomyRecords(bundle, key).length,
      })),
    };
  }

  async preview() {
    const { bundle, ...draft } = await this.repository.getDraft();
    const review = inspectTaxonomy(bundle);
    const published = await this.repository.getPublished();
    return {
      ...draft,
      valid: review.issues.length === 0,
      ...review,
      impact: taxonomyImpact(published.bundle, bundle),
    };
  }

  async update(input: unknown, actor: Actor) {
    const parsed = updateSchema.parse(input);
    const current = await this.repository.getDraft();
    this.requireRevision(current.revision, parsed.expectedRevision);
    const seen = new Set<string>();
    for (const row of parsed.records) {
      const id = taxonomyRecordKey(row, parsed.resource);
      if (seen.has(id) || id.includes("undefined"))
        this.invalid("Identifiant absent ou dupliqué.");
      seen.add(id);
      const prior = taxonomyRecords(current.bundle, parsed.resource).find(
        (old) => taxonomyRecordKey(old, parsed.resource) === id,
      );
      if (prior && parsed.resource === "referenceEntries") {
        const before = prior.values as Record<string, unknown>;
        const after = row.values as Record<string, unknown> | undefined;
        for (const field of [
          "id",
          "type",
          "kind",
          "field_type",
          "unit",
          "market_code",
        ])
          if (before[field] !== after?.[field])
            this.invalid(
              "Le type, l’unité et les identités persistées du référentiel exigent une migration revue.",
            );

        for (const key of ["namespace", "marketCode", "key"])
          if (prior[key] !== row[key])
            this.invalid(
              "Les identités de référentiels nécessitent une migration revue.",
            );
      }
      if (
        prior &&
        ["categories", "listingTypes", "attributes"].includes(parsed.resource)
      ) {
        for (const key of ["slug", "sourceKey", "code"])
          if (prior[key] !== row[key])
            this.invalid(
              "Une modification d’identité exige une migration de compatibilité revue.",
            );
      }
      if (
        prior &&
        parsed.resource === "options" &&
        (prior.key !== row.key || prior.optionSetId !== row.optionSetId)
      )
        this.invalid(
          "Les valeurs d’options persistées exigent une migration de compatibilité.",
        );
      if (
        prior &&
        parsed.resource === "attributes" &&
        (prior.dataType !== row.dataType ||
          prior.unit !== row.unit ||
          prior.optionSetId !== row.optionSetId)
      )
        this.invalid(
          "Le type, l’unité et le référentiel des valeurs existantes exigent une migration revue.",
        );
      if (
        ["dependencies", "validationRules"].includes(parsed.resource) &&
        typeof prior?.status === "string" &&
        prior.status.startsWith("disabled") &&
        row.status !== prior.status
      )
        this.invalid(
          "Cette règle désactivée exige une revue dédiée avant activation.",
        );
      if (
        parsed.resource === "presentations" ||
        parsed.resource === "discovery"
      ) {
        const owner =
          parsed.resource === "presentations"
            ? current.bundle.listingTypes
            : current.bundle.categories;
        if (!owner.some((item) => item.id === id))
          this.invalid("Propriétaire de projection absent.");
        for (const [key, value] of Object.entries(row)) {
          if (key === "id") continue;
          if (
            !Array.isArray(value) ||
            value.some(
              (item) =>
                item?.[
                  parsed.resource === "presentations"
                    ? "listingTypeId"
                    : "categoryId"
                ] !== id,
            )
          )
            this.invalid("La projection doit appartenir au même nœud.");
        }
      }
      if (
        parsed.resource === "categories" &&
        Array.isArray(prior?.marketAvailability) &&
        Array.isArray(row.marketAvailability)
      ) {
        const retained = new Set(
          row.marketAvailability.map((market) => market.marketCode),
        );
        if (
          prior.marketAvailability.some(
            (market) => !retained.has(market.marketCode),
          )
        )
          this.invalid(
            "Désactivez explicitement un marché existant au lieu de supprimer sa configuration.",
          );
      }
      if (Array.isArray(row.marketAvailability))
        for (const market of row.marketAvailability) {
          const country = getCountryConfig(market.marketCode);
          if (
            (!country || country.launchStatus !== "active") &&
            (market.marketplaceEnabled || market.indexable)
          )
            this.invalid("Ce marché n’est pas approuvé pour l’activation.");
          if (market.indexable && !market.marketplaceEnabled)
            this.invalid("Un marché fermé ne peut pas être indexable.");
        }
      if (
        parsed.resource === "validationRules" &&
        prior?.status === "disabled_pending_legal" &&
        row.status !== prior.status
      )
        this.invalid(
          "Cette règle nécessite une approbation juridique distincte.",
        );
      if (parsed.resource === "validationRules" && row.status === "active")
        this.invalid(
          "L’activation d’une expression de validation nécessite un moteur et une revue dédiés.",
        );
    }
    const candidate = taxonomyPrivateBundleSchema.parse(
      mergeTaxonomyRecords(current.bundle, parsed.resource, parsed.records),
    );
    if (
      parsed.resource === "referenceEntries" &&
      inspectTaxonomyReferences(candidate.referenceEntries).length
    )
      this.invalid(
        "Référentiel invalide : vérifiez les identités, valeurs, marchés et parents.",
      );
    const records = taxonomyRecords(candidate, parsed.resource).filter((row) =>
      seen.has(taxonomyRecordKey(row, parsed.resource)),
    );
    for (const row of parsed.records) {
      const normalized = records.find(
        (item) =>
          taxonomyRecordKey(item, parsed.resource) ===
          taxonomyRecordKey(row, parsed.resource),
      );
      this.requireRetainedFields(row, normalized);
    }
    await this.repository.update({
      expectedRevision: parsed.expectedRevision,
      changes: taxonomyRecordChanges(parsed.resource, records, candidate),
      actorId: actor.actorId,
      reason: parsed.changeReason,
      requestId: actor.requestId,
    });
    return this.preview();
  }

  async publish(input: unknown, actor: Actor) {
    const parsed = actionSchema.parse(input);
    const review = await this.preview();
    const { bundle } = await this.repository.getDraft();
    const autoMarkets = new Set(
      bundle.referenceEntries
        .filter((row) => row.namespace === "auto_vehicle_types")
        .map((row) => row.marketCode),
    );
    if (autoMarkets.size) {
      const { autoService } = await import("../auto/auto.service.js");
      for (const market of autoMarkets)
        await autoService.validateReferenceActivation(
          market,
          readTaxonomyReferences(
            bundle.referenceEntries,
            "auto_vehicle_types",
            market,
            true,
          ),
        );
    }
    this.requireRevision(review.revision, parsed.expectedRevision);
    if (!review.valid)
      this.invalid(
        "Corrigez les erreurs de la prévisualisation avant publication.",
      );
    await this.repository.publish({
      expectedRevision: review.revision,
      checksum: review.checksum,
      actorId: actor.actorId,
      reason: parsed.changeReason,
      requestId: actor.requestId,
    });
    return this.preview();
  }

  async rollback(input: unknown, actor: Actor) {
    const parsed = actionSchema.parse(input);
    if (!parsed.targetRevision)
      this.invalid("Une révision publiée est requise.");
    await this.repository.rollback({
      expectedRevision: parsed.expectedRevision,
      targetRevision: parsed.targetRevision!,
      actorId: actor.actorId,
      reason: parsed.changeReason,
      requestId: actor.requestId,
    });
    return this.preview();
  }

  history() {
    return this.repository.history();
  }
  private requireRetainedFields(
    input: unknown,
    parsed: unknown,
    path = "record",
  ): void {
    if (!input || typeof input !== "object") return;
    if (Array.isArray(input)) {
      input.forEach((value, index) =>
        this.requireRetainedFields(
          value,
          Array.isArray(parsed) ? parsed[index] : undefined,
          `${path}[${index}]`,
        ),
      );
      return;
    }
    for (const [key, value] of Object.entries(input)) {
      if (!parsed || typeof parsed !== "object" || !(key in parsed))
        this.invalid(`Champ inconnu : ${path}.${key}.`);
      this.requireRetainedFields(
        value,
        (parsed as Record<string, unknown>)[key],
        `${path}.${key}`,
      );
    }
  }
  private invalid(message: string): never {
    throw new AppError({ code: "VALIDATION_ERROR", statusCode: 400, message });
  }
  private requireRevision(actual: number, expected: number) {
    if (actual !== expected)
      throw new AppError({
        code: "CONFLICT",
        statusCode: 409,
        message: "La taxonomie a changé. Rechargez la révision.",
      });
  }
}

export const taxonomyGovernanceService = new TaxonomyGovernanceService();
