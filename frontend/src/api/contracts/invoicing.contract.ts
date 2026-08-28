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

export interface InvoicingServiceContract {
  /** Completes product provisioning after a commercial grant already exists. */
  activateForCurrentOrganization(
    marketCode: string,
  ): Promise<InvoicingWorkspace["tenants"][number]["productAccess"]>;
  getWorkspace(marketCode: string): Promise<InvoicingWorkspace>;
  listLegalEntities(
    tenantId: string,
    marketCode: string,
  ): Promise<InvoicingLegalEntity[]>;
  createLegalEntity(
    input: CreateInvoicingLegalEntity,
  ): Promise<InvoicingLegalEntity>;
  bootstrapLegalEntityFromOrganization(input: {
    tenantId: string;
    marketCode: string;
  }): Promise<InvoicingLegalEntity>;
  listParties(tenantId: string): Promise<InvoicingParty[]>;
  createParty(input: CreateInvoicingParty): Promise<InvoicingParty>;
  listInvoices(options: {
    tenantId: string;
    marketCode: string;
    limit?: number;
    cursor?: string;
  }): Promise<InvoicingInvoicePage>;
  getInvoice(invoiceId: string): Promise<InvoicingInvoice>;
  createInvoice(
    input: CreateInvoicingInvoice,
    idempotencyKey: string,
  ): Promise<InvoicingInvoice>;
  updateInvoiceDraft(
    invoiceId: string,
    input: UpdateInvoicingInvoiceDraft,
  ): Promise<InvoicingInvoice>;
  finalizeInvoice(
    invoiceId: string,
    expectedVersion: number,
    idempotencyKey: string,
  ): Promise<InvoicingInvoice>;
  getDocument(invoiceId: string): Promise<InvoicingDocument>;
}
