import type {
  CreateInvoicingInvoice,
  CreateInvoicingLegalEntity,
  CreateInvoicingParty,
  InvoicingDocument,
  InvoicingInvoice,
  InvoicingInvoicePage,
  InvoicingLegalEntity,
  InvoicingParty,
  InvoicingWorkspace,
  UpdateInvoicingInvoiceDraft,
} from "@shongre/contracts/invoicing";
import type { InvoicingServiceContract } from "../../contracts/invoicing.contract";
import { httpClient } from "./http-client";

const marketHeaders = (marketCode: string) => ({
  "X-Shongre-Market": marketCode,
});

export class HttpInvoicingService implements InvoicingServiceContract {
  activateForCurrentOrganization(marketCode: string) {
    return httpClient.post<
      InvoicingWorkspace["tenants"][number]["productAccess"]
    >("/invoicing/activation", {}, { headers: marketHeaders(marketCode) });
  }

  getWorkspace(marketCode: string) {
    return httpClient.get<InvoicingWorkspace>("/invoicing/workspace", {
      headers: marketHeaders(marketCode),
    });
  }

  listLegalEntities(tenantId: string, marketCode: string) {
    return httpClient.get<InvoicingLegalEntity[]>("/invoicing/legal-entities", {
      params: { tenantId },
      headers: marketHeaders(marketCode),
    });
  }

  createLegalEntity(input: CreateInvoicingLegalEntity) {
    return httpClient.post<InvoicingLegalEntity>(
      "/invoicing/legal-entities",
      input,
      { headers: marketHeaders(input.defaultMarketCode) },
    );
  }

  bootstrapLegalEntityFromOrganization(input: {
    tenantId: string;
    marketCode: string;
  }) {
    return httpClient.post<InvoicingLegalEntity>(
      "/invoicing/legal-entities/from-organization",
      input,
      { headers: marketHeaders(input.marketCode) },
    );
  }

  listParties(tenantId: string) {
    return httpClient.get<InvoicingParty[]>("/invoicing/parties", {
      params: { tenantId },
    });
  }

  createParty(input: CreateInvoicingParty) {
    return httpClient.post<InvoicingParty>("/invoicing/parties", input);
  }

  listInvoices(options: {
    tenantId: string;
    marketCode: string;
    limit?: number;
    cursor?: string;
  }) {
    return httpClient.get<InvoicingInvoicePage>("/invoicing/invoices", {
      params: {
        tenantId: options.tenantId,
        limit: options.limit,
        cursor: options.cursor,
      },
      headers: marketHeaders(options.marketCode),
    });
  }

  getInvoice(invoiceId: string) {
    return httpClient.get<InvoicingInvoice>(
      `/invoicing/invoices/${encodeURIComponent(invoiceId)}`,
    );
  }

  createInvoice(input: CreateInvoicingInvoice, idempotencyKey: string) {
    return httpClient.post<InvoicingInvoice>("/invoicing/invoices", input, {
      headers: {
        ...marketHeaders(input.marketCode),
        "Idempotency-Key": idempotencyKey,
      },
    });
  }

  updateInvoiceDraft(invoiceId: string, input: UpdateInvoicingInvoiceDraft) {
    return httpClient.put<InvoicingInvoice>(
      `/invoicing/invoices/${encodeURIComponent(invoiceId)}`,
      input,
    );
  }

  finalizeInvoice(
    invoiceId: string,
    expectedVersion: number,
    idempotencyKey: string,
  ) {
    return httpClient.post<InvoicingInvoice>(
      `/invoicing/invoices/${encodeURIComponent(invoiceId)}/finalize`,
      { expectedVersion },
      { headers: { "Idempotency-Key": idempotencyKey } },
    );
  }

  getDocument(invoiceId: string) {
    return httpClient.get<InvoicingDocument>(
      `/invoicing/invoices/${encodeURIComponent(invoiceId)}/document`,
    );
  }
}

export const httpInvoicingService = new HttpInvoicingService();
