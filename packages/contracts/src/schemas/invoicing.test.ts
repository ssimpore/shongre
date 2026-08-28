import { describe, expect, it } from "vitest";
import {
  createInvoicingInvoiceSchema,
  invoicingDecimalSchema,
} from "./invoicing";

const invoiceInput = {
  tenantId: "tenant-1",
  legalEntityId: "entity-1",
  customerPartyId: "party-1",
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
      description: "Conseil",
      quantity: "1.25",
      unit: "hour",
      unitPriceMinorDecimal: "1200.5",
      taxRateBps: 2000,
      taxCategory: "STANDARD" as const,
    },
  ],
};

describe("invoicing public contract", () => {
  it("keeps quantities and sub-minor prices as bounded decimal strings", () => {
    expect(invoicingDecimalSchema.safeParse("1.000001").success).toBe(true);
    expect(invoicingDecimalSchema.safeParse("1.0000001").success).toBe(false);
    expect(invoicingDecimalSchema.safeParse("1e3").success).toBe(false);
  });

  it("rejects invalid date ordering and unexplained exemptions", () => {
    expect(
      createInvoicingInvoiceSchema.safeParse({
        ...invoiceInput,
        dueDate: "2026-08-27",
      }).success,
    ).toBe(false);
    expect(
      createInvoicingInvoiceSchema.safeParse({
        ...invoiceInput,
        lines: [
          {
            ...invoiceInput.lines[0],
            taxRateBps: 0,
            taxCategory: "EXEMPT",
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("requires a first-class original invoice relationship for credit notes", () => {
    expect(
      createInvoicingInvoiceSchema.safeParse({
        ...invoiceInput,
        documentType: "credit_note",
      }).success,
    ).toBe(false);
    expect(
      createInvoicingInvoiceSchema.safeParse({
        ...invoiceInput,
        documentType: "credit_note",
        relatedInvoiceId: "invoice-original-1",
      }).success,
    ).toBe(true);
  });
});
