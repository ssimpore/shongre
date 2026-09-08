import { AppError } from "../../shared/errors/app-error.js";
import {
  PostgresTaxonomyPublicationRepository,
  type TaxonomyPublication,
} from "../../infrastructure/database/repositories/taxonomy-publication.repository.js";
import { TaxonomyV1Service } from "./taxonomy.v1.service.js";

export class PublishedTaxonomyService {
  private current?: {
    publication: TaxonomyPublication;
    service: TaxonomyV1Service;
  };

  constructor(
    private readonly repository: {
      getPublished(): Promise<TaxonomyPublication>;
    },
  ) {}

  async snapshot(expectedRevision?: number): Promise<TaxonomyV1Service> {
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
        service: new TaxonomyV1Service(
          publication.bundle,
          publication.revision,
          publication.checksum,
        ),
      };
    }
    return this.current.service;
  }
}

export const taxonomyV1Service = new PublishedTaxonomyService(
  new PostgresTaxonomyPublicationRepository(),
);
