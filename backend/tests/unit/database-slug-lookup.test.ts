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
import { PostgresUserRepository } from "../../src/infrastructure/database/repositories/user.repository.js";

function emptyLookupClient() {
  const lookup: Record<string, ReturnType<typeof vi.fn>> = {};
  lookup.select = vi.fn(() => lookup);
  lookup.eq = vi.fn(() => lookup);
  lookup.order = vi.fn(() => lookup);
  lookup.limit = vi.fn(() => lookup);
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

describe("public storefront owner resolution", () => {
  const owner = {
    id: "6f01be37-1011-50ea-8bd0-12feeef55a05",
    slug: "clara-dupont-agence-canopee",
    name: "Clara Dupont",
    country: "FR",
    account_family: "professional",
    email: "private@example.test",
  };

  function setup() {
    const profile = emptyLookupClient().lookup;
    const store = emptyLookupClient().lookup;
    const client = {
      from: vi.fn((table: string) => {
        if (table === "public_profiles") return profile;
        if (table === "stores") return store;
        throw new Error(`Unexpected private table read: ${table}`);
      }),
    };
    mocks.getSupabaseAdminClient.mockReturnValue(client);
    return { client, profile, store, repository: new PostgresUserRepository() };
  }

  it("resolves a store slug to its public owner and preserves the canonical profile", async () => {
    const { profile, store, repository } = setup();
    profile.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: owner, error: null });
    store.maybeSingle.mockResolvedValue({
      data: {
        display_name: "Agence Canopée",
        organizations: { owner_id: owner.id },
      },
      error: null,
    });

    const seller = await repository.findPublicById("agence-canopee");
    // The storefront is published under the store's name; the owner keeps theirs.
    expect(seller).toMatchObject({
      id: owner.id,
      slug: owner.slug,
      name: "Clara Dupont",
      storeName: "Agence Canopée",
    });
    expect(seller).not.toHaveProperty("email");
    expect(store.select).toHaveBeenCalledWith(
      "display_name, organizations!inner(owner_id)",
    );
    expect(store.eq).toHaveBeenCalledWith("slug", "agence-canopee");
    expect(store.eq).toHaveBeenCalledWith("is_active", true);
    expect(store.eq).toHaveBeenCalledWith("organizations.status", "active");
    expect(profile.eq).toHaveBeenCalledWith("id", owner.id);
    expect(profile.eq).toHaveBeenCalledWith("account_family", "professional");
  });

  it("preserves existing profile slug precedence and attaches the owner's storefront", async () => {
    const { profile, store, repository } = setup();
    profile.maybeSingle.mockResolvedValue({ data: owner, error: null });
    store.maybeSingle.mockResolvedValue({
      data: {
        slug: "agence-canopee",
        display_name: "Agence Canopée",
        organizations: { owner_id: owner.id, status: "active" },
      },
      error: null,
    });
    expect(await repository.findPublicById(owner.slug)).toMatchObject({
      id: owner.id,
      slug: owner.slug,
      storeSlug: "agence-canopee",
      storeName: "Agence Canopée",
    });
    // The profile answered first; the store was looked up by its owner,
    // never by reinterpreting the profile slug as a store slug.
    expect(store.eq).toHaveBeenCalledWith("organizations.owner_id", owner.id);
    expect(store.eq).not.toHaveBeenCalledWith("slug", owner.slug);
  });

  it("leaves a professional without a storefront on their own slug", async () => {
    const { profile, store, repository } = setup();
    profile.maybeSingle.mockResolvedValue({ data: owner, error: null });
    store.maybeSingle.mockResolvedValue({ data: null, error: null });
    const seller = await repository.findPublicById(owner.slug);
    expect(seller).toMatchObject({ id: owner.id, slug: owner.slug });
    expect(seller).not.toHaveProperty("storeSlug");
  });

  it("does not reinterpret an unknown account UUID as a store slug", async () => {
    const { client, repository } = setup();
    expect(await repository.findPublicById(owner.id)).toBeNull();
    expect(client.from).not.toHaveBeenCalledWith("stores");
  });

  it("returns null when no active storefront and organization match", async () => {
    const { profile, repository } = setup();
    expect(await repository.findPublicById("unavailable-shop")).toBeNull();
    expect(profile.maybeSingle).toHaveBeenCalledTimes(1);
  });

  it("does not expose a store owner excluded by the public view", async () => {
    const { store, repository } = setup();
    store.maybeSingle.mockResolvedValue({
      data: { organizations: { owner_id: owner.id } },
      error: null,
    });
    expect(await repository.findPublicById("agence-canopee")).toBeNull();
  });

  it("reports a database failure rather than treating it as a missing shop", async () => {
    const { store, repository } = setup();
    store.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: "database unavailable" },
    });
    await expect(repository.findPublicById("agence-canopee")).rejects.toThrow();
  });
});
