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
import { apiOperation } from "./generated-api-operation";
import type { InvoicingServiceContract } from "../../contracts/invoicing.contract";

const marketHeaders = (marketCode: string) => ({
  "X-Shongre-Market": marketCode,
});

export class HttpInvoicingService implements InvoicingServiceContract {
  activateForCurrentOrganization(marketCode: string) {
    return apiOperation<
      InvoicingWorkspace["tenants"][number]["productAccess"],
      "activateInvoicingForCurrentOrganization"
    >("activateInvoicingForCurrentOrganization", {
      body: {},
      headers: marketHeaders(marketCode),
    });
  }

  getWorkspace(marketCode: string) {
    return apiOperation<InvoicingWorkspace, "getInvoicingWorkspace">(
      "getInvoicingWorkspace",
      { headers: marketHeaders(marketCode) },
    );
  }

  listLegalEntities(tenantId: string, marketCode: string) {
    return apiOperation<InvoicingLegalEntity[], "listInvoicingLegalEntities">(
      "listInvoicingLegalEntities",
      { query: { tenantId }, headers: marketHeaders(marketCode) },
    );
  }

  createLegalEntity(input: CreateInvoicingLegalEntity) {
    return apiOperation<InvoicingLegalEntity, "createInvoicingLegalEntity">(
      "createInvoicingLegalEntity",
      { body: input, headers: marketHeaders(input.defaultMarketCode) },
    );
  }

  bootstrapLegalEntityFromOrganization(input: {
    tenantId: string;
    marketCode: string;
  }) {
    return apiOperation<
      InvoicingLegalEntity,
      "bootstrapInvoicingLegalEntityFromOrganization"
    >("bootstrapInvoicingLegalEntityFromOrganization", {
      body: input,
      headers: marketHeaders(input.marketCode),
    });
  }

  listParties(tenantId: string) {
    return apiOperation<InvoicingParty[], "listInvoicingParties">(
      "listInvoicingParties",
      { query: { tenantId } },
    );
  }

  createParty(input: CreateInvoicingParty) {
    return apiOperation<InvoicingParty, "createInvoicingParty">(
      "createInvoicingParty",
      { body: input },
    );
  }

  listInvoices(options: {
    tenantId: string;
    marketCode: string;
    limit?: number;
    cursor?: string;
  }) {
    return apiOperation<InvoicingInvoicePage, "listInvoicingInvoices">(
      "listInvoicingInvoices",
      {
        query: {
          tenantId: options.tenantId,
          limit: options.limit,
          cursor: options.cursor,
        },
        headers: marketHeaders(options.marketCode),
      },
    );
  }

  getInvoice(invoiceId: string) {
    return apiOperation<InvoicingInvoice, "getInvoicingInvoice">(
      "getInvoicingInvoice",
      { path: { invoiceId: invoiceId } },
    );
  }

  createInvoice(input: CreateInvoicingInvoice, idempotencyKey: string) {
    return apiOperation<InvoicingInvoice, "createInvoicingInvoice">(
      "createInvoicingInvoice",
      {
        body: input,
        headers: {
          ...marketHeaders(input.marketCode),
          "Idempotency-Key": idempotencyKey,
        },
      },
    );
  }

  updateInvoiceDraft(invoiceId: string, input: UpdateInvoicingInvoiceDraft) {
    return apiOperation<InvoicingInvoice, "updateInvoicingInvoiceDraft">(
      "updateInvoicingInvoiceDraft",
      { path: { invoiceId: invoiceId }, body: input },
    );
  }

  finalizeInvoice(
    invoiceId: string,
    expectedVersion: number,
    idempotencyKey: string,
  ) {
    return apiOperation<InvoicingInvoice, "finalizeInvoicingInvoice">(
      "finalizeInvoicingInvoice",
      {
        path: { invoiceId: invoiceId },
        body: { expectedVersion },
        headers: { "Idempotency-Key": idempotencyKey },
      },
    );
  }

  getDocument(invoiceId: string) {
    return apiOperation<InvoicingDocument, "getInvoicingDocument">(
      "getInvoicingDocument",
      { path: { invoiceId: invoiceId } },
    );
  }
}

export const httpInvoicingService = new HttpInvoicingService();
