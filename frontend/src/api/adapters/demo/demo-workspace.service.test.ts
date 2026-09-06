import { beforeEach, describe, expect, it } from "vitest";
import { storageService } from "../../../services/storage.service";
import { demoWorkspaceService } from "./demo-workspace.service";

describe("DemoWorkspaceService favorite scope", () => {
  beforeEach(() => {
    storageService.remove("shongre_favorites_v3");
    storageService.setCurrentUserKey("buyer_thomas");
  });

  it("counts the requested account only in the requested market", async () => {
    storageService.toggleFavorite("listing-be", "buyer_thomas", "BE");

    const france = await demoWorkspaceService.getUserWorkspaceSummary(
      "user_thomas",
      "FR",
    );
    const belgium = await demoWorkspaceService.getUserWorkspaceSummary(
      "user_thomas",
      "BE",
    );

    expect(france.totalFavoritesCount).toBe(2);
    expect(belgium.totalFavoritesCount).toBe(1);
  });
});
