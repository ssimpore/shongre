import { afterEach, describe, expect, it, vi } from "vitest";
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

  it("scopes the platform dashboard to one market without breaking its invariants", async () => {
    const whole = await service.getPlatformDashboard({
      period: "30d",
      marketCode: "ALL",
      currency: "EUR",
    });
    const france = await service.getPlatformDashboard({
      period: "30d",
      marketCode: "FR",
      currency: "EUR",
    });
    const franceRow = whole.markets.find((row) => row.marketCode === "FR")!;
    expect(france.scope.marketCode).toBe("FR");
    expect(france.markets.map((row) => row.marketCode)).toEqual(["FR"]);
    expect(france.metrics.platformRevenue.amount).toEqual(
      franceRow.platformRevenue,
    );
    expect(france.metrics.netRevenue.amount).toEqual(franceRow.netRevenue);
    expect(france.metrics.gmv.amount).toEqual(franceRow.gmv);
    expect(
      france.revenueSources.reduce(
        (sum, source) => sum + source.amount.amountMinor,
        0,
      ),
    ).toBe(franceRow.platformRevenue.amountMinor);
    expect(france.metrics.platformRevenue.amount.amountMinor).toBeLessThan(
      whole.metrics.platformRevenue.amount.amountMinor,
    );
    expect(france.metrics.arr.amount.amountMinor).toBe(
      france.metrics.mrr.amount.amountMinor * 12,
    );
    // An unknown market answers the platform view rather than an empty one.
    const unknown = await service.getPlatformDashboard({
      period: "30d",
      marketCode: "CH",
      currency: "EUR",
    });
    expect(unknown.markets.length).toBe(whole.markets.length);
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

  it("replays the demo ledger relative to now so it never ages out of a period", async () => {
    // A year after the fixture's snapshot the 30-day view still has the
    // scenario, with every timestamp inside the window.
    vi.useFakeTimers({
      toFake: ["Date"],
      now: new Date("2027-08-22T21:45:00.000Z"),
    });
    const page = await service.listTransactions({
      period: "30d",
      marketCode: "ALL",
      currency: "EUR",
      needsReviewOnly: true,
    });
    expect(page.items.map((item) => item.reference)).toEqual([
      "TX-20260822-1821",
    ]);
    expect(page.items[0].occurredAt.startsWith("2027-08-22")).toBe(true);
  });
});

afterEach(() => {
  vi.useRealTimers();
});
