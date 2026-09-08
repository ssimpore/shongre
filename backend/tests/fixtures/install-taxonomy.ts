import { config } from "../../src/app/config/index.js";
import {
  taxonomyV1Service,
  PublishedTaxonomyService,
} from "../../src/modules/taxonomy/taxonomy.runtime.js";
import { TAXONOMY_V1_PRIVATE_BUNDLE } from "../../taxonomy/generated/taxonomy-v1.private.js";
import {
  PostgresTaxonomyRepository,
  type ITaxonomyRepository,
} from "../../src/infrastructure/database/repositories/taxonomy.repository.js";
import { createTestTaxonomyRepository } from "./taxonomy-repository.js";

// Fixture injection is owned by test entrypoints. API/worker bundles never
// import a catalogue or switch taxonomy repositories on environment failures.
if (config.environment.environment === "test" && config.dataMode === "demo") {
  const fixture = new PublishedTaxonomyService({
    async getPublished() {
      return {
        revision: 1,
        checksum: TAXONOMY_V1_PRIVATE_BUNDLE.metadata.normalizedSha256,
        bundle: TAXONOMY_V1_PRIVATE_BUNDLE,
      };
    },
  });
  taxonomyV1Service.snapshot = fixture.snapshot.bind(fixture);
  const instances = new WeakMap<
    PostgresTaxonomyRepository,
    ITaxonomyRepository
  >();
  for (const key of [
    "getNodeById",
    "getNodeBySlug",
    "getHeaderNavigation",
    "replaceHeaderNavigation",
  ] as const) {
    Object.defineProperty(PostgresTaxonomyRepository.prototype, key, {
      configurable: true,
      value(this: PostgresTaxonomyRepository, ...args: unknown[]) {
        let repository = instances.get(this);
        if (!repository) {
          repository = createTestTaxonomyRepository(TAXONOMY_V1_PRIVATE_BUNDLE);
          instances.set(this, repository);
        }
        return Reflect.apply(repository[key], repository, args);
      },
    });
  }
}
