import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSupabaseAdminClient: vi.fn(),
}));

vi.mock("../../src/infrastructure/supabase/supabase-client.js", () => ({
  getSupabaseAdminClient: mocks.getSupabaseAdminClient,
}));

import { PostgresAutoRepository } from "../../src/infrastructure/database/repositories/auto.repository.js";
import { PostgresCoursesRepository } from "../../src/infrastructure/database/repositories/courses.repository.js";
import { PostgresRealEstateRepository } from "../../src/infrastructure/database/repositories/real-estate.repository.js";

function emptyLookupClient() {
  const lookup: Record<string, ReturnType<typeof vi.fn>> = {};
  lookup.select = vi.fn(() => lookup);
  lookup.eq = vi.fn(() => lookup);
  lookup.maybeSingle = vi.fn(() =>
    Promise.resolve({ data: null, error: null }),
  );
  return {
    client: { from: vi.fn(() => lookup) },
    lookup,
  };
}

describe("database-backed public slug lookups", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    [
      "automotive vehicle",
      () => new PostgresAutoRepository().getVehicle("vehicle-public-slug"),
    ],
    [
      "real-estate property",
      () =>
        new PostgresRealEstateRepository().getProperty("property-public-slug"),
    ],
    [
      "education tutor",
      () =>
        new PostgresCoursesRepository().getTutorProfile("tutor-public-slug"),
    ],
  ])("queries the slug column for a %s", async (_label, lookupRecord) => {
    const { client, lookup } = emptyLookupClient();
    mocks.getSupabaseAdminClient.mockReturnValue(client);

    await expect(lookupRecord()).resolves.toBeNull();

    expect(lookup.eq).toHaveBeenCalledWith(
      "slug",
      expect.stringContaining("public-slug"),
    );
    expect(lookup.eq).not.toHaveBeenCalledWith(
      "id",
      expect.stringContaining("public-slug"),
    );
  });
});
