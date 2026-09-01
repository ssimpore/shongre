import { beforeEach, describe, expect, it, vi } from "vitest";
import { HttpSolutionsService } from "./http-solutions.service";
import { httpClient } from "./http-client";

const actor = { id: "client-value", name: "Client Value", canManage: true };

describe("HttpSolutionsService", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("passes explicit market and locale to public reads", async () => {
    const get = vi.spyOn(httpClient, "get").mockResolvedValue([]);
    const service = new HttpSolutionsService();
    await service.listPublicSolutions({ marketCode: "be", language: "fr-BE" });
    expect(get).toHaveBeenCalledWith("/solutions", {
      params: { locale: "fr-BE" },
      headers: { "X-Shongre-Market": "BE" },
    });
  });

  it("never sends the caller-selected admin actor and adds idempotency", async () => {
    const post = vi.spyOn(httpClient, "post").mockResolvedValue({});
    const service = new HttpSolutionsService();
    await service.createSolution(
      {
        name: "Test",
        slug: "test",
        shortDescription: "Description",
        description: "Description complète",
        icon: "apps",
        category: "Test",
        lifecycle: "COMING_SOON",
        markets: ["FR"],
        languages: ["fr-FR"],
        audiences: [],
        capabilities: [],
        requiresAuthentication: false,
        requiresEntitlement: false,
        sortOrder: 10,
        catalogVisible: true,
        featured: false,
      },
      actor,
    );
    const [, body, options] = post.mock.calls[0];
    expect(body).not.toHaveProperty("actor");
    expect(options?.headers).toMatchObject({
      "Idempotency-Key": expect.stringContaining("solutions"),
    });
  });

  it("uses the backend lifecycle endpoint without embedding identity", async () => {
    const post = vi.spyOn(httpClient, "post").mockResolvedValue({});
    const service = new HttpSolutionsService();
    await service.transitionLifecycle("solution-id", "AVAILABLE", {
      explanation: "Validation du lancement.",
      actor,
    });
    expect(post).toHaveBeenCalledWith(
      "/admin/solutions/solution-id/lifecycle",
      { lifecycle: "AVAILABLE", explanation: "Validation du lancement." },
      {
        headers: expect.objectContaining({
          "Idempotency-Key": expect.any(String),
        }),
      },
    );
  });

  it("serializes an explicitly cleared optional field as null", async () => {
    const patch = vi.spyOn(httpClient, "patch").mockResolvedValue({});
    const service = new HttpSolutionsService();
    await service.updateSolution(
      "solution-id",
      { documentationUrl: undefined },
      actor,
    );
    expect(patch).toHaveBeenCalledWith(
      "/admin/solutions/solution-id",
      { documentationUrl: null },
      {
        headers: expect.objectContaining({
          "Idempotency-Key": expect.any(String),
        }),
      },
    );
  });
});
