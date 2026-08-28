import { describe, expect, it } from "vitest";
import { InvoicingService } from "../../src/modules/invoicing/invoicing.service.js";
import { DemoInvoicingRepository } from "../../src/infrastructure/database/repositories/invoicing.repository.js";
import type { Principal } from "../../src/shared/auth/principal.js";

const principal: Principal = {
  userId: "20000000-0000-4000-a000-000000000001",
  email: "owner@atelier-horizon.example",
  role: "pro_seller",
  accountType: "professional",
  status: "active",
  capabilities: [
    "invoice.read",
    "invoice.create",
    "invoice.finalize",
    "invoice.party.manage",
    "invoicing.tenant.manage",
  ],
};

const tenantId = "10000000-0000-4000-a000-000000000001";
const frEntityId = "10000000-0000-4000-a000-000000000002";
const frPartyId = "10000000-0000-4000-a000-000000000003";

function invoiceInput(overrides: Record<string, unknown> = {}) {
  return {
    tenantId,
    legalEntityId: frEntityId,
    customerPartyId: frPartyId,
    documentType: "standard_invoice",
    marketCode: "FR",
    countryCode: "FR",
    locale: "fr-FR",
    timezone: "Europe/Paris",
    currency: "EUR",
    issueDate: "2026-08-28",
    dueDate: "2026-09-27",
    origin: "MANUAL",
    lines: [
      {
        description: "Conseil produit",
        quantity: "1.5",
        unit: "hour",
        unitPriceMinorDecimal: "1000",
        taxRateBps: 2000,
        taxCategory: "STANDARD",
      },
    ],
    ...overrides,
  };
}

describe("invoicing service", () => {
  it("creates, idempotently finalizes, and preserves a human-readable derivative", async () => {
    const service = new InvoicingService(new DemoInvoicingRepository());
    const draft = await service.createInvoice(
      principal,
      invoiceInput(),
      "draft-command-0001",
      "request-1",
    );
    const replay = await service.createInvoice(
      principal,
      invoiceInput(),
      "draft-command-0001",
      "request-2",
    );

    expect(replay.id).toBe(draft.id);
    expect(draft.total).toEqual({ amountMinor: 1800, currency: "EUR" });
    const finalized = await service.finalizeInvoice(principal, draft.id, {
      expectedVersion: draft.version,
      idempotencyKey: "finalize-command-0001",
    });
    const finalizedReplay = await service.finalizeInvoice(principal, draft.id, {
      expectedVersion: draft.version,
      idempotencyKey: "finalize-command-0001",
    });
    const document = await service.getDocument(principal, draft.id);

    expect(finalized.commercialState).toBe("FINALIZED");
    expect(finalized.electronicState).toBe("CONFIGURATION_REQUIRED");
    expect(finalized.number).toMatch(/^DEMO-FAC-2026-/);
    expect(finalized.snapshotDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(finalizedReplay).toEqual(finalized);
    expect(document.legalOriginal).toBe(false);
    expect(document.content).toContain(
      "Electronic transport: CONFIGURATION_REQUIRED",
    );
  });

  it("returns privacy-safe not-found for a cross-tenant composition", async () => {
    const service = new InvoicingService(new DemoInvoicingRepository());
    await expect(
      service.createInvoice(
        principal,
        invoiceInput({ tenantId: "other-tenant" }),
        "draft-command-0002",
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("fails closed when the organization lacks the Facturation entitlement", async () => {
    const service = new InvoicingService(
      new DemoInvoicingRepository({
        denyProductAccessForUserIds: [principal.userId],
      }),
    );

    await expect(service.getWorkspace(principal, "FR")).rejects.toMatchObject({
      code: "FORBIDDEN",
      details: { gate: "INVOICING_ENTITLEMENT_REQUIRED" },
    });
    await expect(
      service.createInvoice(
        principal,
        invoiceInput(),
        "denied-product-command",
      ),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      details: { gate: "INVOICING_ENTITLEMENT_REQUIRED" },
    });
  });

  it("idempotently bootstraps the legal entity from the shared organization", async () => {
    const service = new InvoicingService(new DemoInvoicingRepository());
    const first = await service.bootstrapLegalEntityFromOrganization(
      principal,
      { tenantId, marketCode: "FR" },
    );
    const replay = await service.bootstrapLegalEntityFromOrganization(
      principal,
      { tenantId, marketCode: "FR" },
    );

    expect(first.id).toBe(frEntityId);
    expect(replay).toEqual(first);
    expect(first.tenantId).toBe(tenantId);
  });

  it("projects standalone product access for the shared account shell", async () => {
    const service = new InvoicingService(new DemoInvoicingRepository());
    const access = await service.productAccessForUser(principal.userId);

    expect(access).toHaveLength(1);
    expect(access[0]).toMatchObject({
      productId: "facturation",
      accessMode: "STANDALONE",
    });
  });

  it("updates an editable draft with optimistic versioning and keeps finalized invoices immutable", async () => {
    const service = new InvoicingService(new DemoInvoicingRepository());
    const draft = await service.createInvoice(
      principal,
      invoiceInput(),
      "editable-draft-command",
    );
    const updated = await service.updateInvoiceDraft(principal, draft.id, {
      expectedVersion: draft.version,
      customerPartyId: frPartyId,
      issueDate: "2026-08-29",
      dueDate: "2026-09-30",
      lines: [
        {
          description: "Conseil produit et déploiement",
          quantity: "2",
          unit: "hour",
          unitPriceMinorDecimal: "2500",
          taxRateBps: 2000,
          taxCategory: "STANDARD",
        },
      ],
    });

    expect(updated.commercialState).toBe("READY_TO_FINALIZE");
    expect(updated.version).toBe(draft.version + 1);
    expect(updated.total).toEqual({ amountMinor: 6000, currency: "EUR" });
    await expect(
      service.updateInvoiceDraft(principal, draft.id, {
        expectedVersion: draft.version,
        customerPartyId: frPartyId,
        issueDate: "2026-08-29",
        dueDate: "2026-09-30",
        lines: updated.lines,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    const finalized = await service.finalizeInvoice(principal, draft.id, {
      expectedVersion: updated.version,
      idempotencyKey: "editable-draft-finalize",
    });
    await expect(
      service.updateInvoiceDraft(principal, finalized.id, {
        expectedVersion: finalized.version,
        customerPartyId: frPartyId,
        issueDate: "2026-08-29",
        dueDate: "2026-09-30",
        lines: updated.lines,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("creates first-class credit notes and blocks cumulative over-crediting", async () => {
    const service = new InvoicingService(new DemoInvoicingRepository());
    const originalDraft = await service.createInvoice(
      principal,
      invoiceInput(),
      "credit-original-draft",
    );
    const original = await service.finalizeInvoice(
      principal,
      originalDraft.id,
      {
        expectedVersion: originalDraft.version,
        idempotencyKey: "credit-original-finalize",
      },
    );
    const creditDraft = await service.createInvoice(
      principal,
      invoiceInput({
        documentType: "credit_note",
        relatedInvoiceId: original.id,
      }),
      "credit-note-draft",
    );
    const credit = await service.finalizeInvoice(principal, creditDraft.id, {
      expectedVersion: creditDraft.version,
      idempotencyKey: "credit-note-finalize",
    });

    expect(credit.documentType).toBe("credit_note");
    expect(credit.relatedInvoiceId).toBe(original.id);
    expect(credit.number).toMatch(/^DEMO-AVOIR-2026-/);
    expect(
      (await service.getInvoice(principal, original.id)).commercialState,
    ).toBe("CREDITED");
    const overCreditDraft = await service.createInvoice(
      principal,
      invoiceInput({
        documentType: "credit_note",
        relatedInvoiceId: original.id,
      }),
      "credit-note-over-credit",
    );
    await expect(
      service.finalizeInvoice(principal, overCreditDraft.id, {
        expectedVersion: overCreditDraft.version,
        idempotencyKey: "credit-note-over-credit-finalize",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it.each([
    ["BE", "BE", "EUR", "fr-BE", "Europe/Brussels"],
    ["CH", "CH", "CHF", "fr-CH", "Europe/Zurich"],
  ])(
    "creates a market-scoped draft for %s without a France fallback",
    async (marketCode, countryCode, currency, locale, timezone) => {
      const repository = new DemoInvoicingRepository();
      const service = new InvoicingService(repository);
      const entity = await service.createLegalEntity(principal, {
        tenantId,
        legalName: `Entity ${marketCode}`,
        countryCode,
        defaultMarketCode: marketCode,
        defaultCurrency: currency,
        defaultLocale: locale,
        timezone,
        registeredAddress: {
          line1: "1 Market Street",
          postalCode: "1000",
          city: "Market City",
          countryCode,
        },
        identifiers: [],
      });
      const party = await service.createParty(principal, {
        tenantId,
        kind: "company",
        roles: ["customer"],
        legalName: `Customer ${marketCode}`,
        billingAddress: {
          line1: "2 Customer Street",
          postalCode: "1000",
          city: "Customer City",
          countryCode,
        },
        locale,
        preferredCurrency: currency,
        paymentTermsDays: 30,
        identifiers: [],
      });
      const draft = await service.createInvoice(
        principal,
        invoiceInput({
          legalEntityId: entity.id,
          customerPartyId: party.id,
          marketCode,
          countryCode,
          currency,
          locale,
          timezone,
        }),
        `draft-command-${marketCode}`,
      );

      expect(draft.marketCode).toBe(marketCode);
      expect(draft.countryCode).toBe(countryCode);
      expect(draft.total.currency).toBe(currency);
    },
  );

  it("fails closed for coming-soon, unknown, and mismatched markets", async () => {
    const service = new InvoicingService(new DemoInvoicingRepository());
    await expect(
      service.createLegalEntity(principal, {
        tenantId,
        legalName: "Entity Senegal",
        countryCode: "SN",
        defaultMarketCode: "SN",
        defaultCurrency: "XOF",
        defaultLocale: "fr-SN",
        timezone: "Africa/Dakar",
        registeredAddress: {
          line1: "1 rue du Marché",
          postalCode: "10000",
          city: "Dakar",
          countryCode: "SN",
        },
        identifiers: [],
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(service.getWorkspace(principal, "ZZ")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(
      service.createInvoice(
        principal,
        invoiceInput({ currency: "CHF" }),
        "draft-command-mismatch",
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
