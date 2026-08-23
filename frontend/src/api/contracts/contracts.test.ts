import { describe, it, expect } from "vitest";
import { services } from "../client/service-registry";
import { AppError, getFriendlyErrorMessage } from "../errors/app-error";

describe("Shongre API Service Contracts & Demo Adapters", () => {
  it("resolves listings asynchronously with total count", async () => {
    const res = await services.listings.getListings();
    expect(res).toBeDefined();
    expect(Array.isArray(res.listings)).toBe(true);
    expect(res.total).toBeGreaterThanOrEqual(1);
  });

  it("performs structured search and keyword suggestions", async () => {
    const searchRes = await services.search.search({ query: "iPhone" });
    expect(searchRes).toBeDefined();
    expect(Array.isArray(searchRes.items)).toBe(true);

    const suggestions = await services.search.getSearchSuggestions("iPh");
    expect(suggestions).toContain("iPhone 15 Pro");
  });

  it("handles authentication and role switching deterministically", async () => {
    const user = await services.auth.switchRole("pro_seller");
    expect(user).toBeDefined();
    expect(user?.role).toBe("pro_seller");
    expect(user?.sellerType).toBe("pro");

    const currentUser = await services.auth.getCurrentUser();
    expect(currentUser?.role).toBe("pro_seller");
  });

  it("treats the guest persona as a signed-out session and restores exact accounts", async () => {
    await expect(services.auth.switchRole("guest")).resolves.toBeNull();
    await expect(services.auth.getCurrentUser()).resolves.toBeNull();

    const seller = await services.auth.switchDemoUser("seller_camille");
    expect(seller?.id).toBe("user_camille");
    expect(seller?.primaryRole).toBe("seller");
    await expect(services.auth.getCurrentUser()).resolves.toMatchObject({
      id: "user_camille",
    });

    await services.auth.switchDemoUser("buyer_thomas");
    await expect(
      services.auth.switchDemoUser("missing_persona"),
    ).rejects.toThrow("profil de démonstration");
    await expect(services.auth.getCurrentUser()).resolves.toMatchObject({
      id: "user_thomas",
    });
  });

  it("resolves effective market configurations through service contract", async () => {
    const market = await services.markets.getEffectiveMarketConfig("BE");
    expect(market.code).toBe("BE");
    expect(market.currency).toBe("EUR");
  });

  it("retrieves canonical taxonomy categories and attributes", async () => {
    const rootCats = await services.taxonomy.getRootCategories();
    expect(rootCats.length).toBeGreaterThan(0);
    expect(
      rootCats.some((c) => c.id === "vehicles" || c.slug === "vehicules"),
    ).toBe(true);
  });

  it("looks up companies by SIRET deterministically", async () => {
    const company =
      await services.verification.lookupCompanyBySiret("98765432100012");
    expect(company).toBeDefined();
    expect(company?.name).toContain("Atelier Nordique SAS");
  });

  it("formats normalized AppErrors into user-friendly messages", () => {
    const authErr = new AppError({
      code: "UNAUTHENTICATED",
      message: "Token expired",
    });
    expect(getFriendlyErrorMessage(authErr)).toBe(
      "Veuillez vous connecter pour effectuer cette action.",
    );

    const kycErr = new AppError({
      code: "KYC_REQUIRED",
      message: "Verification required",
    });
    expect(getFriendlyErrorMessage(kycErr)).toBe(
      "Une vérification d’identité est requise pour finaliser cette transaction.",
    );

    expect(
      getFriendlyErrorMessage(
        new Error("database.internal_table does not exist"),
      ),
    ).toBe("Une erreur inattendue est survenue.");
  });
});
