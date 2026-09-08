import { AppError } from "../../shared/errors/app-error.js";
import { config } from "../../app/config/index.js";
import {
  PostgresTaxonomyPublicationRepository,
  type TaxonomyPublication,
} from "../../infrastructure/database/repositories/taxonomy-publication.repository.js";
import { TaxonomyV4Service } from "./taxonomy.v4.service.js";

export class PublishedTaxonomyService {
  private current?: {
    publication: TaxonomyPublication;
    service: TaxonomyV4Service;
  };

  constructor(
    private readonly repository: {
      getPublished(): Promise<TaxonomyPublication>;
    },
  ) {}

  async snapshot(expectedRevision?: number): Promise<TaxonomyV4Service> {
    const publication = await this.repository.getPublished();
    if (
      expectedRevision !== undefined &&
      expectedRevision !== publication.revision
    )
      throw new AppError({
        code: "CONFLICT",
        statusCode: 409,
        message:
          "La taxonomie a été actualisée. Rechargez les caractéristiques et vérifiez vos choix avant de publier.",
      });
    if (this.current?.publication !== publication) {
      this.current = {
        publication,
        service: new TaxonomyV4Service(
          publication.bundle,
          publication.revision,
          publication.checksum,
        ),
      };
    }
    return this.current.service;
  }
}

const postgres = new PostgresTaxonomyPublicationRepository();
export const taxonomyV4Service = new PublishedTaxonomyService({
  async getPublished() {
    if (
      config.environment.environment === "test" &&
      config.dataMode === "demo"
    ) {
      // Isolated backend test scenarios explicitly select fixture data. This
      // branch cannot execute in local, preview, or any hosted application.
      const { TAXONOMY_V4_PRIVATE_BUNDLE } =
        await import("./generated/taxonomy-v4.private.js");
      return {
        revision: 1,
        checksum: TAXONOMY_V4_PRIVATE_BUNDLE.metadata.normalizedSha256,
        bundle: TAXONOMY_V4_PRIVATE_BUNDLE,
      };
    }
    return postgres.getPublished();
  },
});
