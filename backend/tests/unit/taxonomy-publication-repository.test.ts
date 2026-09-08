import { describe, expect, it, vi } from "vitest";
import { TAXONOMY_V1_PRIVATE_BUNDLE as bundle } from "../../taxonomy/generated/taxonomy-v1.private.js";
const database = vi.hoisted(() => ({ pointer: vi.fn(), rpc: vi.fn() }));
vi.mock("../../src/infrastructure/supabase/supabase-client.js", () => ({
  getSupabaseAdminClient: () => ({
    rpc: database.rpc,
    from: () => ({
      select: () => ({ eq: () => ({ single: database.pointer }) }),
    }),
  }),
}));
import { PostgresTaxonomyPublicationRepository } from "../../src/infrastructure/database/repositories/taxonomy-publication.repository.js";

describe("authoritative draft cache", () => {
  it("coalesces reads, checks every revision, invalidates changes and rejects database failures", async () => {
    database.pointer.mockResolvedValue({
      data: {
        draft_revision: 4,
        published_revision: 2,
        updated_at: "2026-09-08T12:00:00Z",
      },
      error: null,
    });
    database.rpc.mockResolvedValue({
      data: {
        revision: 4,
        publishedRevision: 2,
        checksum: "a".repeat(64),
        bundle,
      },
      error: null,
    });
    const repository = new PostgresTaxonomyPublicationRepository();
    const [first, same] = await Promise.all([
      repository.getDraft(),
      repository.getDraft(),
    ]);
    expect(first).toBe(same);
    expect(database.rpc).toHaveBeenCalledTimes(1);
    expect(await repository.getDraft()).toBe(first);
    expect(database.pointer).toHaveBeenCalledTimes(2);
    expect(database.rpc).toHaveBeenCalledTimes(1);
    database.pointer.mockResolvedValueOnce({
      data: null,
      error: { code: "unavailable" },
    });
    await expect(repository.getDraft()).rejects.toMatchObject({
      code: "NETWORK_ERROR",
    });
    database.pointer.mockResolvedValue({
      data: {
        draft_revision: 5,
        published_revision: 2,
        updated_at: "2026-09-08T12:01:00Z",
      },
      error: null,
    });
    database.rpc.mockResolvedValue({
      data: {
        revision: 5,
        publishedRevision: 2,
        checksum: "b".repeat(64),
        bundle,
      },
      error: null,
    });
    expect((await repository.getDraft()).revision).toBe(5);
    expect(database.rpc).toHaveBeenCalledTimes(2);
  });
});
