import { describe, expect, it } from "vitest";
import { DemoFinanceRepository } from "../../src/infrastructure/database/repositories/finance.repository.js";
import { FinanceService } from "../../src/modules/finance/finance.service.js";

describe("FinanceService", () => {
  const service = new FinanceService(new DemoFinanceRepository());

  it("serves platform definitions separately from gross collections and GMV", async () => {
    const dashboard = await service.getPlatformDashboard({
      period: "30d",
      marketCode: "ALL",
      currency: "EUR",
    });
    expect(dashboard.metrics.platformRevenue.amount.amountMinor).not.toBe(
      dashboard.metrics.grossCollected.amount.amountMinor,
    );
    expect(dashboard.metrics.platformRevenue.amount.amountMinor).not.toBe(
      dashboard.metrics.gmv.amount.amountMinor,
    );
    expect(dashboard.metrics.arr.amount.amountMinor).toBe(
      dashboard.metrics.mrr.amount.amountMinor * 12,
    );
  });

  it("filters reconciliation transactions without exposing arbitrary account ids", async () => {
    const page = await service.listTransactions({
      period: "30d",
      marketCode: "ALL",
      currency: "EUR",
      needsReviewOnly: true,
    });
    expect(page.items).toHaveLength(1);
    expect(page.items[0].reference).toBe("TX-20260822-1821");
  });

  it("rejects organization finance when resource membership is not authorized", async () => {
    class DeniedOrganizationRepository extends DemoFinanceRepository {
      override async getOrganizationDashboard() {
        return null;
      }
    }
    const deniedService = new FinanceService(
      new DeniedOrganizationRepository(),
    );
    await expect(
      deniedService.getOrganizationDashboard("employee_without_finance", "FR"),
    ).rejects.toMatchObject({ code: "FORBIDDEN", statusCode: 403 });
  });
});
