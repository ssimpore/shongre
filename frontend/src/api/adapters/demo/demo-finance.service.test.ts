import { beforeEach, describe, expect, it } from "vitest";
import { storageService } from "../../../services/storage.service";
import { DemoFinanceService } from "./demo-finance.service";

describe("DemoFinanceService", () => {
  beforeEach(() => storageService.setCurrentUserKey("pro_atelier"));

  it("returns reconciled platform totals and balanced entries", async () => {
    const service = new DemoFinanceService();
    const dashboard = await service.getPlatformDashboard({
      period: "30d",
      marketCode: "ALL",
      currency: "EUR",
    });
    expect(
      dashboard.revenueSources.reduce((sum, source) => sum + source.amount.amountMinor, 0),
    ).toBe(dashboard.metrics.platformRevenue.amount.amountMinor);
    expect(dashboard.metrics.netRevenue.amount.amountMinor).toBe(
      dashboard.metrics.platformRevenue.amount.amountMinor -
        dashboard.metrics.providerFees.amount.amountMinor -
        dashboard.metrics.refunds.amount.amountMinor,
    );
    const page = await service.listTransactions({
      period: "30d",
      marketCode: "ALL",
      currency: "EUR",
      needsReviewOnly: true,
    });
    expect(page.items).toHaveLength(1);
    expect(page.items[0].status).toBe("needs_review");
  });

  it("scopes customer finance to the active account", async () => {
    const service = new DemoFinanceService();
    const dashboard = await service.getAccountDashboard();
    expect(dashboard.accountId).toBe("user_pro_atelier");
    expect(dashboard.accountKind).toBe("professional");
    expect(dashboard.transactions.every((item) => item.accountId === dashboard.accountId)).toBe(true);
  });

  it("uses a distinct organization finance operation for professional workspaces", async () => {
    const service = new DemoFinanceService();
    const dashboard = await service.getOrganizationDashboard();
    expect(dashboard.accountId).toBe("user_pro_atelier");
    expect(dashboard.accountKind).toBe("professional");
    expect(dashboard.accountLabel).toBe("Atelier Nordique SAS");
  });

  it("does not invent seller earnings for a buyer-only account", async () => {
    storageService.setCurrentUserKey("buyer_thomas");
    const dashboard = await new DemoFinanceService().getAccountDashboard();
    expect(dashboard.metrics.sellerEarnings.amount.amountMinor).toBe(0);
    expect(dashboard.metrics.availableForPayout.amount.amountMinor).toBe(0);
  });

  it("keeps exact market net revenue reconciled after allocation", async () => {
    const service = new DemoFinanceService();
    const dashboard = await service.getPlatformDashboard({
      period: "30d",
      marketCode: "FR",
      currency: "EUR",
    });
    expect(dashboard.metrics.platformRevenue.amount.amountMinor).toBe(3_214_000);
    expect(dashboard.metrics.netRevenue.amount.amountMinor).toBe(
      dashboard.metrics.platformRevenue.amount.amountMinor -
        dashboard.metrics.providerFees.amount.amountMinor -
        dashboard.metrics.refunds.amount.amountMinor,
    );
  });

  it("exports integer minor units instead of formatted floating point", async () => {
    const service = new DemoFinanceService();
    const exported = await service.exportTransactions({
      period: "30d",
      marketCode: "FR",
      currency: "EUR",
    });
    expect(exported.mimeType).toBe("text/csv");
    expect(exported.content).toContain("Brut (minor)");
    expect(exported.content).toContain("12000");
  });
});
