import { describe, expect, it } from "vitest";
import {
  DEMO_INVOICING_CUSTOMER_ID,
  DEMO_INVOICING_ENTITY_ID,
  DEMO_INVOICING_TENANT_ID,
  DemoInvoicingService,
} from "./demo-invoicing.service";
import { storageService } from "../../../services/storage.service";

const input = {
  tenantId: DEMO_INVOICING_TENANT_ID,
  legalEntityId: DEMO_INVOICING_ENTITY_ID,
  customerPartyId: DEMO_INVOICING_CUSTOMER_ID,
  documentType: "standard_invoice" as const,
  marketCode: "FR",
  countryCode: "FR",
  locale: "fr-FR",
  timezone: "Europe/Paris",
  currency: "EUR",
  issueDate: "2026-08-28",
  dueDate: "2026-09-27",
  origin: "MANUAL" as const,
  lines: [
    {
      description: "Conception graphique",
      quantity: "1.5",
      unit: "hour",
      unitPriceMinorDecimal: "1000",
      taxRateBps: 2000,
      taxCategory: "STANDARD" as const,
    },
  ],
};

describe("DemoInvoicingService", () => {
  it("isolates organization identity and records between demo accounts", async () => {
    const previousUserKey = storageService.getCurrentUserKey();
    const service = new DemoInvoicingService();
    try {
      storageService.setCurrentUserKey("standalone_facturation_owner");
      const standalone = await service.getWorkspace("FR");
      storageService.setCurrentUserKey("pro_atelier");
      const multiProduct = await service.getWorkspace("FR");

      expect(standalone.tenants[0].legalName).toBe("Studio Rivage");
      expect(standalone.tenants[0].productAccess.accessMode).toBe("STANDALONE");
      expect(multiProduct.tenants[0].legalName).toBe(
        "Atelier Nordique SAS",
      );
      expect(multiProduct.tenants[0].productAccess.accessMode).toBe("ADD_ON");
      expect(multiProduct.tenants[0].id).not.toBe(standalone.tenants[0].id);
      expect(multiProduct.legalEntities[0].tenantId).not.toBe(
        standalone.legalEntities[0].tenantId,
      );
    } finally {
      storageService.setCurrentUserKey(previousUserKey);
    }
  });

  it("keeps exact deterministic totals and idempotent command results", async () => {
    const service = new DemoInvoicingService();
    const draft = await service.createInvoice(input, "demo-create-key");
    const replay = await service.createInvoice(input, "demo-create-key");

    expect(replay.id).toBe(draft.id);
    expect(draft.subtotal.amountMinor).toBe(1500);
    expect(draft.taxTotal.amountMinor).toBe(300);
    expect(draft.total.amountMinor).toBe(1800);

    const finalized = await service.finalizeInvoice(
      draft.id,
      draft.version,
      "demo-finalize-key",
    );
    const finalizedReplay = await service.finalizeInvoice(
      draft.id,
      draft.version,
      "demo-finalize-key",
    );
    const document = await service.getDocument(draft.id);

    expect(finalizedReplay).toEqual(finalized);
    expect(finalized.commercialState).toBe("FINALIZED");
    expect(finalized.electronicState).toBe("CONFIGURATION_REQUIRED");
    expect(document.legalOriginal).toBe(false);
    expect(document.digest).toMatch(/^[a-f0-9]{64}$/);
  });

  it("fails closed for unknown and coming-soon markets", async () => {
    const service = new DemoInvoicingService();
    await expect(service.getWorkspace("ZZ")).rejects.toThrow(
      "Marché de facturation introuvable",
    );
    const senegal = await service.getWorkspace("SN");
    expect(senegal.electronicTransport.status).toBe("COMING_SOON");
    expect(
      senegal.readiness.find((item) => item.key === "market")?.blocking,
    ).toBe(true);
  });

  it("serves the seeded finalized derivative without calling a backend", async () => {
    const service = new DemoInvoicingService();
    const document = await service.getDocument("demo-invoice-finalized");

    expect(document.fileName).toBe("DEMO-FAC-2026-000001.txt");
    expect(document.legalOriginal).toBe(false);
    expect(document.content).toContain("CONFIGURATION_REQUIRED");
  });

  it("reuses the shared organization legal entity during onboarding", async () => {
    const service = new DemoInvoicingService();
    const entity = await service.bootstrapLegalEntityFromOrganization({
      tenantId: DEMO_INVOICING_TENANT_ID,
      marketCode: "FR",
    });

    expect(entity.id).toBe(DEMO_INVOICING_ENTITY_ID);
    expect(entity.tenantId).toBe(DEMO_INVOICING_TENANT_ID);
  });

  it("edits a draft with optimistic versioning and blocks finalized edits", async () => {
    const service = new DemoInvoicingService();
    const draft = await service.createInvoice(input, "demo-edit-key");
    const updated = await service.updateInvoiceDraft(draft.id, {
      expectedVersion: draft.version,
      customerPartyId: DEMO_INVOICING_CUSTOMER_ID,
      issueDate: "2026-08-29",
      dueDate: "2026-09-30",
      lines: [
        {
          ...input.lines[0],
          description: "Conception et livraison",
          quantity: "2",
          unitPriceMinorDecimal: "2500",
        },
      ],
    });

    expect(updated.version).toBe(draft.version + 1);
    expect(updated.total.amountMinor).toBe(6000);
    await expect(
      service.updateInvoiceDraft(draft.id, {
        expectedVersion: draft.version,
        customerPartyId: DEMO_INVOICING_CUSTOMER_ID,
        issueDate: "2026-08-29",
        dueDate: "2026-09-30",
        lines: input.lines,
      }),
    ).rejects.toThrow("modifiée");

    const finalized = await service.finalizeInvoice(
      updated.id,
      updated.version,
      "demo-edit-finalize",
    );
    await expect(
      service.updateInvoiceDraft(finalized.id, {
        expectedVersion: finalized.version,
        customerPartyId: DEMO_INVOICING_CUSTOMER_ID,
        issueDate: "2026-08-29",
        dueDate: "2026-09-30",
        lines: input.lines,
      }),
    ).rejects.toThrow("finalisée");
  });
});
