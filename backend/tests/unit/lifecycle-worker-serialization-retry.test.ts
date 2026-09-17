import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSupabaseAdminClient: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  dispatchNotification: vi.fn(async () => ({})),
}));

vi.mock("../../src/infrastructure/supabase/supabase-client.js", () => ({
  getSupabaseAdminClient: mocks.getSupabaseAdminClient,
}));

vi.mock("../../src/infrastructure/logging/logger.js", () => ({
  logger: {
    info: mocks.info,
    error: mocks.error,
  },
}));

vi.mock("../../src/modules/notifications/notifications.service.js", () => ({
  notificationsService: { dispatchNotification: mocks.dispatchNotification },
}));

import { LifecycleWorker } from "../../src/workers/lifecycle/lifecycle-worker.js";

type ArchivedRow = {
  id: string;
  seller_id: string;
  title: string;
  market_code: string;
};
const archivedRow: ArchivedRow = {
  id: "listing-1",
  seller_id: "seller-1",
  title: "Vélo gravel",
  market_code: "FR",
};

function mockArchiveMutation(
  results: Array<{ data: ArchivedRow[] | null; error: unknown }>,
) {
  const select = vi.fn();
  for (const result of results) select.mockResolvedValueOnce(result);
  const builder = {
    update: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    lt: vi.fn(() => builder),
    select,
  };
  const client = { from: vi.fn(() => builder) };
  mocks.getSupabaseAdminClient.mockReturnValue(client);
  return { client, builder };
}

describe("lifecycle listing serialization retry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retries an archived-listing mutation twice after 40001", async () => {
    const { client, builder } = mockArchiveMutation([
      { data: null, error: { code: "40001" } },
      { data: null, error: { code: "40001" } },
      { data: [archivedRow], error: null },
    ]);

    await expect(
      new LifecycleWorker().runExpiredListingsCleanup(),
    ).resolves.toBe(1);
    expect(client.from).toHaveBeenCalledTimes(3);
    expect(builder.select).toHaveBeenCalledTimes(3);
    expect(mocks.info).toHaveBeenCalledOnce();
    expect(mocks.error).not.toHaveBeenCalled();
    // The seller is told the listing expired, once, in the listing's market.
    expect(mocks.dispatchNotification).toHaveBeenCalledOnce();
    expect(mocks.dispatchNotification.mock.calls[0]?.slice(0, 2)).toEqual([
      "seller-1",
      "listing_expired",
    ]);
    expect(mocks.dispatchNotification.mock.calls[0]?.[6]).toBe("FR");
  });

  it("does not retry a non-serialization database error", async () => {
    const permanentError = { code: "23514", message: "invalid row" };
    const { client } = mockArchiveMutation([
      { data: null, error: permanentError },
    ]);

    await expect(
      new LifecycleWorker().runExpiredListingsCleanup(),
    ).resolves.toBe(0);
    expect(client.from).toHaveBeenCalledOnce();
    expect(mocks.error).toHaveBeenCalledWith(
      "Lifecycle Worker error: invalid row",
    );
  });
});
