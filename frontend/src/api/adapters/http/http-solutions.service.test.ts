import { beforeEach, describe, expect, it, vi } from "vitest";
import { HttpSolutionsService } from "./http-solutions.service";
import { apiOperation } from "./generated-api-operation";

vi.mock("./generated-api-operation", () => ({ apiOperation: vi.fn() }));

const actor = { id: "client-value", name: "Client Value", canManage: true };

describe("HttpSolutionsService", () => {
  beforeEach(() => vi.mocked(apiOperation).mockReset());

  it("passes explicit market and locale to public reads", async () => {
    vi.mocked(apiOperation).mockResolvedValue([]);
    const service = new HttpSolutionsService();
    await service.listPublicSolutions({ marketCode: "be", language: "fr-BE" });
    expect(apiOperation).toHaveBeenCalledWith("getSolutions", {
      query: { locale: "fr-BE" },
      headers: { "X-Shongre-Market": "BE" },
    });
  });

  it("never sends the caller-selected admin actor and adds idempotency", async () => {
    const operation = vi.mocked(apiOperation).mockResolvedValue({});
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
    const [, { body, headers }] = operation.mock.calls[0];
    expect(body).not.toHaveProperty("actor");
    expect(headers).toMatchObject({
      "Idempotency-Key": expect.stringContaining("solutions"),
    });
  });

  it("uses the backend lifecycle endpoint without embedding identity", async () => {
    vi.mocked(apiOperation).mockResolvedValue({});
    const service = new HttpSolutionsService();
    await service.transitionLifecycle("solution-id", "AVAILABLE", {
      explanation: "Validation du lancement.",
      actor,
    });
    expect(apiOperation).toHaveBeenCalledWith("postAdminSolutionLifecycle", {
      path: { solutionId: "solution-id" },
      body: {
        lifecycle: "AVAILABLE",
        explanation: "Validation du lancement.",
      },
      headers: expect.objectContaining({
        "Idempotency-Key": expect.any(String),
      }),
    });
  });

  it("serializes an explicitly cleared optional field as null", async () => {
    vi.mocked(apiOperation).mockResolvedValue({});
    const service = new HttpSolutionsService();
    await service.updateSolution(
      "solution-id",
      { documentationUrl: undefined },
      actor,
    );
    expect(apiOperation).toHaveBeenCalledWith("patchAdminSolution", {
      path: { solutionId: "solution-id" },
      body: { documentationUrl: null },
      headers: expect.objectContaining({
        "Idempotency-Key": expect.any(String),
      }),
    });
  });
});
