import { vi } from "vitest";

// Register mocks without preloading production modules: individual transport and
// config mocks in a test must still take effect before its imports run.
vi.mock(
  "../../src/modules/taxonomy/taxonomy.runtime.js",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("../../src/modules/taxonomy/taxonomy.runtime.js")
      >();
    const { config } = await import("../../src/app/config/index.js");
    if (config.environment.environment !== "test" || config.dataMode !== "demo")
      return actual;
    const { TAXONOMY_V1_PRIVATE_BUNDLE: bundle } =
      await import("../../taxonomy/generated/taxonomy-v1.private.js");
    return {
      ...actual,
      taxonomyV1Service: new actual.PublishedTaxonomyService({
        async getPublished() {
          return {
            revision: 1,
            checksum: bundle.metadata.normalizedSha256,
            bundle,
          };
        },
      }),
    };
  },
);

vi.mock(
  "../../src/infrastructure/database/repositories/taxonomy.repository.js",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("../../src/infrastructure/database/repositories/taxonomy.repository.js")
      >();
    const { config } = await import("../../src/app/config/index.js");
    if (config.environment.environment !== "test" || config.dataMode !== "demo")
      return actual;
    const { createTestTaxonomyRepository } =
      await import("./taxonomy-repository.js");
    const { TAXONOMY_V1_PRIVATE_BUNDLE: bundle } =
      await import("../../taxonomy/generated/taxonomy-v1.private.js");
    return {
      ...actual,
      PostgresTaxonomyRepository: class
        extends actual.PostgresTaxonomyRepository
      {
        private readonly fixture = createTestTaxonomyRepository(bundle);
        getHeaderNavigation(
          ...args: Parameters<typeof this.fixture.getHeaderNavigation>
        ) {
          return this.fixture.getHeaderNavigation(...args);
        }
        replaceHeaderNavigation(
          ...args: Parameters<typeof this.fixture.replaceHeaderNavigation>
        ) {
          return this.fixture.replaceHeaderNavigation(...args);
        }
      },
    };
  },
);
