import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSupabaseAdminClient: vi.fn(),
}));

vi.mock("../../src/infrastructure/supabase/supabase-client.js", () => ({
  getSupabaseAdminClient: mocks.getSupabaseAdminClient,
}));

import { PostgresCrmShongreIntegrationRepository } from "../../src/infrastructure/database/repositories/crm-shongre-integration.repository.js";

describe("PostgresCrmShongreIntegrationRepository", () => {
  const rpc = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    rpc.mockResolvedValue({ error: null });
    mocks.getSupabaseAdminClient.mockReturnValue({ rpc });
  });

  it("sends an explicit null retry timestamp when completing successfully", async () => {
    const repository = new PostgresCrmShongreIntegrationRepository();

    await repository.complete({
      eventId: "b12fb651-7510-4755-9a21-0963d65c9db7",
      workerId: "crm-worker-test",
      success: true,
    });

    expect(rpc).toHaveBeenCalledWith("complete_crm_shongre_event", {
      p_event_id: "b12fb651-7510-4755-9a21-0963d65c9db7",
      p_worker_id: "crm-worker-test",
      p_success: true,
      p_permanent_failure: false,
      p_error_code: "",
      p_error_message: "",
      p_retry_at: null,
    });
  });
});
