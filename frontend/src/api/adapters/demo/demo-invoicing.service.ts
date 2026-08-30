import {
  createInvoicingInvoiceSchema,
  createInvoicingLegalEntitySchema,
  createInvoicingPartySchema,
  type CreateInvoicingInvoice,
  type CreateInvoicingLegalEntity,
  type CreateInvoicingParty,
  type InvoicingDocument,
  type InvoicingInvoice,
  type InvoicingInvoicePage,
  type InvoicingLegalEntity,
  type InvoicingLine,
  type InvoicingParty,
  type InvoicingTaxBreakdown,
  type InvoicingWorkspace,
  type UpdateInvoicingInvoiceDraft,
} from "@shongre/contracts/invoicing";
import { getCountryConfig } from "@shongre/contracts";
import type { Capability } from "@shongre/contracts/access-control";
import type { InvoicingServiceContract } from "../../contracts/invoicing.contract";
import { simulateNetworkDelay } from "../../client/api-client.config";
import { storageService } from "../../../services/storage.service";
import { requireDemoCapability } from "./demo-authorization";

function requireCustomerInvoicing(capability: Capability): void {
  requireDemoCapability("marketplace.customer.access");
  requireDemoCapability(capability);
}

const NOW = "2026-08-28T09:00:00.000Z";
export const DEMO_INVOICING_TENANT_ID = "10000000-0000-4000-a000-000000000001";
export const DEMO_INVOICING_ENTITY_ID = "10000000-0000-4000-a000-000000000002";
export const DEMO_INVOICING_CUSTOMER_ID =
  "10000000-0000-4000-a000-000000000003";

const entity: InvoicingLegalEntity = {
  id: DEMO_INVOICING_ENTITY_ID,
  tenantId: DEMO_INVOICING_TENANT_ID,
  scope: "MULTI_MARKET_SHARED",
  legalName: "Atelier Horizon",
  tradingName: "Atelier Horizon",
  legalForm: "SAS",
  countryCode: "FR",
  defaultMarketCode: "FR",
  defaultCurrency: "EUR",
  defaultLocale: "fr-FR",
  timezone: "Europe/Paris",
  registeredAddress: {
    line1: "24 rue des Ateliers",
    postalCode: "75011",
    city: "Paris",
    countryCode: "FR",
  },
  identifiers: [
    {
      id: "identifier-entity-siret",
      type: "SIRET",
      countryCode: "FR",
      value: "81234567800028",
      verificationStatus: "unverified",
    },
  ],
  verificationStatus: "unverified",
  createdAt: NOW,
  updatedAt: NOW,
};

const customer: InvoicingParty = {
  id: DEMO_INVOICING_CUSTOMER_ID,
  tenantId: DEMO_INVOICING_TENANT_ID,
  scope: "MULTI_MARKET_SHARED",
  kind: "company",
  roles: ["customer"],
  legalName: "Studio Mercure",
  billingAddress: {
    line1: "12 rue des Artisans",
    postalCode: "75011",
    city: "Paris",
    countryCode: "FR",
  },
  email: "facturation@studio-mercure.example",
  locale: "fr-FR",
  preferredCurrency: "EUR",
  paymentTermsDays: 30,
  identifiers: [
    {
      id: "identifier-customer-siret",
      type: "SIRET",
      countryCode: "FR",
      value: "91234567800016",
      verificationStatus: "unverified",
    },
  ],
  createdAt: NOW,
  updatedAt: NOW,
};

const SCALE = BigInt(1_000_000);

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function fixed6(value: string): bigint {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * SCALE + BigInt(fraction.padEnd(6, "0"));
}

function roundHalfUp(value: bigint, divisor: bigint): bigint {
  return (value + divisor / BigInt(2)) / divisor;
}

function calculateLines(inputs: CreateInvoicingInvoice["lines"]): {
  lines: InvoicingLine[];
  taxes: InvoicingTaxBreakdown[];
} {
  const taxMap = new Map<string, InvoicingTaxBreakdown>();
  const lines = inputs.map((line, index) => {
    const net = roundHalfUp(
      fixed6(line.quantity) * fixed6(line.unitPriceMinorDecimal),
      SCALE * SCALE,
    );
    const tax = roundHalfUp(net * BigInt(line.taxRateBps), BigInt(10_000));
    const key = `${line.taxCategory}:${line.taxRateBps}`;
    const current = taxMap.get(key) ?? {
      taxRateBps: line.taxRateBps,
      taxCategory: line.taxCategory,
      taxableAmountMinor: 0,
      taxAmountMinor: 0,
    };
    current.taxableAmountMinor += Number(net);
    current.taxAmountMinor += Number(tax);
    taxMap.set(key, current);
    return {
      ...line,
      id: `demo-line-${index + 1}`,
      position: index + 1,
      netAmountMinor: Number(net),
      taxAmountMinor: Number(tax),
      grossAmountMinor: Number(net + tax),
    };
  });
  return { lines, taxes: [...taxMap.values()] };
}

function fixtureInvoice(options: {
  id: string;
  number?: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  totalMinor: number;
  state: "DRAFT" | "FINALIZED";
}): InvoicingInvoice {
  const net = Number(
    (BigInt(options.totalMinor) * BigInt(5) + BigInt(3)) / BigInt(6),
  );
  const tax = options.totalMinor - net;
  return {
    id: options.id,
    tenantId: DEMO_INVOICING_TENANT_ID,
    legalEntityId: DEMO_INVOICING_ENTITY_ID,
    customerPartyId: DEMO_INVOICING_CUSTOMER_ID,
    scope: "MARKET_SCOPED",
    documentType: "standard_invoice",
    origin: "MANUAL",
    number: options.number,
    marketCode: "FR",
    countryCode: "FR",
    locale: "fr-FR",
    timezone: "Europe/Paris",
    currency: "EUR",
    issueDate: options.issueDate,
    dueDate: options.dueDate,
    notes: options.customerName,
    commercialState: options.state,
    electronicState:
      options.state === "FINALIZED"
        ? "CONFIGURATION_REQUIRED"
        : "NOT_REQUESTED",
    paymentState: "UNPAID",
    accountingExportState: "NOT_EXPORTED",
    customerReviewState: "NOT_REQUESTED",
    lines: [
      {
        id: `${options.id}-line-1`,
        position: 1,
        description: "Prestation de service",
        quantity: "1",
        unit: "service",
        unitPriceMinorDecimal: String(net),
        taxRateBps: 2000,
        taxCategory: "STANDARD",
        netAmountMinor: net,
        taxAmountMinor: tax,
        grossAmountMinor: options.totalMinor,
      },
    ],
    taxBreakdowns: [
      {
        taxRateBps: 2000,
        taxCategory: "STANDARD",
        taxableAmountMinor: net,
        taxAmountMinor: tax,
      },
    ],
    subtotal: { amountMinor: net, currency: "EUR" },
    taxTotal: { amountMinor: tax, currency: "EUR" },
    total: { amountMinor: options.totalMinor, currency: "EUR" },
    outstanding: { amountMinor: options.totalMinor, currency: "EUR" },
    version: options.state === "FINALIZED" ? 2 : 1,
    snapshotDigest: options.state === "FINALIZED" ? "a".repeat(64) : undefined,
    finalizedAt: options.state === "FINALIZED" ? NOW : undefined,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

interface DemoInvoicingState {
  legalEntities: Map<string, InvoicingLegalEntity>;
  parties: Map<string, InvoicingParty>;
  invoices: Map<string, InvoicingInvoice>;
  documents: Map<string, InvoicingDocument>;
  createKeys: Map<string, string>;
  finalizeKeys: Map<string, string>;
  counter: number;
}

function createStateForCurrentOrganization(): DemoInvoicingState {
  const activeUser = storageService.getCurrentUser();
  const currentUser =
    activeUser?.accountType === "professional" ? activeUser : null;
  const accountKey = currentUser?.id ?? "guest";
  const tenantId = currentUser
    ? `demo-invoicing-tenant-${accountKey}`
    : DEMO_INVOICING_TENANT_ID;
  const entityId = currentUser
    ? `demo-invoicing-entity-${accountKey}`
    : DEMO_INVOICING_ENTITY_ID;
  const customerId = currentUser
    ? `demo-invoicing-customer-${accountKey}`
    : DEMO_INVOICING_CUSTOMER_ID;
  const legalName = currentUser?.companyName ?? "Atelier Horizon";
  const countryCode = currentUser?.country ?? entity.countryCode;
  const scopedEntity: InvoicingLegalEntity = {
    ...structuredClone(entity),
    id: entityId,
    tenantId,
    legalName,
    tradingName: legalName,
    registeredAddress: {
      ...entity.registeredAddress,
      postalCode:
        currentUser?.postalCode ?? entity.registeredAddress.postalCode,
      city: currentUser?.city ?? entity.registeredAddress.city,
      countryCode,
    },
  };
  const scopedCustomer: InvoicingParty = {
    ...structuredClone(customer),
    id: customerId,
    tenantId,
  };
  const scopedInvoice = (value: InvoicingInvoice): InvoicingInvoice => ({
    ...value,
    tenantId,
    legalEntityId: entityId,
    customerPartyId: customerId,
  });

  return {
    legalEntities: new Map([[entityId, scopedEntity]]),
    parties: new Map([[customerId, scopedCustomer]]),
    invoices: new Map([
      [
        "demo-invoice-finalized",
        scopedInvoice(
          fixtureInvoice({
            id: "demo-invoice-finalized",
            number: "DEMO-FAC-2026-000001",
            customerName: "Studio Mercure",
            issueDate: "2026-08-19",
            dueDate: "2026-09-18",
            totalMinor: 180000,
            state: "FINALIZED",
          }),
        ),
      ],
      [
        "demo-invoice-draft-2",
        scopedInvoice(
          fixtureInvoice({
            id: "demo-invoice-draft-2",
            customerName: "Créations Alpines",
            issueDate: "2026-08-20",
            dueDate: "2026-09-19",
            totalMinor: 120000,
            state: "DRAFT",
          }),
        ),
      ],
      [
        "demo-invoice-draft-3",
        scopedInvoice(
          fixtureInvoice({
            id: "demo-invoice-draft-3",
            customerName: "Studio Lumière",
            issueDate: "2026-08-21",
            dueDate: "2026-09-20",
            totalMinor: 1800,
            state: "DRAFT",
          }),
        ),
      ],
    ]),
    documents: new Map(),
    createKeys: new Map(),
    finalizeKeys: new Map(),
    counter: 4,
  };
}

export class DemoInvoicingService implements InvoicingServiceContract {
  async activateForCurrentOrganization(marketCode: string) {
    await simulateNetworkDelay();
    requireCustomerInvoicing("subscription.manage.own");
    const currentUser = storageService.getCurrentUser();
    if (!currentUser || currentUser.accountType !== "professional") {
      throw new Error("Un compte professionnel est requis.");
    }
    storageService.saveUser({
      ...currentUser,
      enabledProducts: Array.from(
        new Set([
          ...(currentUser.enabledProducts ?? ["marketplace"]),
          "facturation",
        ]),
      ),
    });
    const activatedWorkspace = await this.getWorkspace(marketCode);
    return activatedWorkspace.tenants[0].productAccess;
  }

  private readonly organizationStates = new Map<string, DemoInvoicingState>();

  private currentState(): DemoInvoicingState {
    const currentUser = storageService.getCurrentUser();
    const accountKey =
      currentUser?.accountType === "professional" ? currentUser.id : "guest";
    const existing = this.organizationStates.get(accountKey);
    if (existing) return existing;
    const created = createStateForCurrentOrganization();
    this.organizationStates.set(accountKey, created);
    return created;
  }

  private get legalEntities() {
    return this.currentState().legalEntities;
  }

  private get parties() {
    return this.currentState().parties;
  }

  private get invoices() {
    return this.currentState().invoices;
  }

  private get documents() {
    return this.currentState().documents;
  }

  private get createKeys() {
    return this.currentState().createKeys;
  }

  private get finalizeKeys() {
    return this.currentState().finalizeKeys;
  }

  private get counter() {
    return this.currentState().counter;
  }

  private set counter(value: number) {
    this.currentState().counter = value;
  }

  async getWorkspace(marketCode: string): Promise<InvoicingWorkspace> {
    await simulateNetworkDelay(80);
    requireCustomerInvoicing("invoice.read");
    const market = getCountryConfig(marketCode);
    if (!market) throw new Error("Marché de facturation introuvable.");
    const operational =
      market.enabled &&
      ["active", "beta", "private_beta"].includes(market.launchStatus);
    const legalEntities = [...this.legalEntities.values()].filter(
      (item) => item.defaultMarketCode === marketCode,
    );
    const recentInvoices = [...this.invoices.values()].filter(
      (invoice) => invoice.marketCode === marketCode,
    );
    const currentUser = storageService.getCurrentUser();
    const activeEntity = legalEntities[0];
    const tenantId =
      activeEntity?.tenantId ??
      `demo-invoicing-tenant-${currentUser?.id ?? "guest"}`;
    const productOnly =
      currentUser?.enabledProducts?.length === 1 &&
      currentUser.enabledProducts[0] === "facturation";
    return {
      scope: "MULTI_MARKET_SHARED",
      activeMarketCode: marketCode,
      tenants: [
        {
          id: tenantId,
          legalName: currentUser?.companyName ?? "Atelier Horizon",
          countryCode: currentUser?.country ?? "FR",
          membershipRole: "owner",
          capabilities: ["invoice.read", "invoice.create", "invoice.finalize"],
          productAccess: {
            organizationId: tenantId,
            productId: "facturation",
            entitlementKey: "invoicing.enabled",
            status: "trialing",
            accessMode: productOnly ? "STANDALONE" : "ADD_ON",
            planName: "Shongre Facturation — démonstration",
            source: "trial",
            activatedAt: "2026-08-15T09:00:00.000Z",
            currentPeriodEndsAt: "2026-09-14T09:00:00.000Z",
            cancelAtPeriodEnd: false,
            seats: 5,
            capabilities: [
              "invoice.read",
              "invoice.create",
              "invoice.finalize",
              "invoice.export",
              "invoice.party.manage",
              "invoicing.tenant.manage",
              "subscription.manage.own",
            ],
          },
        },
      ],
      legalEntities,
      recentInvoices,
      readiness: [
        {
          key: "market",
          label: "Marché disponible",
          status: operational ? "configured" : "missing",
          blocking: !operational,
        },
        {
          key: "legal_entity",
          label: "Entité juridique configurée",
          status: legalEntities.length ? "configured" : "missing",
          blocking: !legalEntities.length,
        },
        {
          key: "issuer",
          label: "Émetteur Shongre approuvé",
          status: "missing",
          blocking: true,
        },
        {
          key: "provider",
          label: "Plateforme agréée sélectionnée et testée",
          status: "missing",
          blocking: true,
        },
        {
          key: "legal_review",
          label: "Revue juridique et comptable",
          status: "missing",
          blocking: true,
        },
        {
          key: "production_transport",
          label: "Transport électronique de production certifié",
          status: "missing",
          blocking: true,
        },
      ],
      electronicTransport: {
        mode: "COMPATIBLE_SOLUTION",
        status:
          market.launchStatus === "coming_soon"
            ? "COMING_SOON"
            : "CONFIGURATION_REQUIRED",
      },
    };
  }

  async listLegalEntities(tenantId: string, marketCode: string) {
    await simulateNetworkDelay(40);
    requireCustomerInvoicing("invoice.read");
    return [...this.legalEntities.values()].filter(
      (item) =>
        item.tenantId === tenantId && item.defaultMarketCode === marketCode,
    );
  }

  async createLegalEntity(input: CreateInvoicingLegalEntity) {
    await simulateNetworkDelay(70);
    requireCustomerInvoicing("invoicing.tenant.manage");
    const value = createInvoicingLegalEntitySchema.parse(input);
    const id = `demo-legal-entity-${this.legalEntities.size + 1}`;
    const created: InvoicingLegalEntity = {
      ...value,
      id,
      scope: "MULTI_MARKET_SHARED",
      identifiers: value.identifiers.map((identifier, index) => ({
        ...identifier,
        id: `${id}-identifier-${index + 1}`,
        verificationStatus: "unverified",
      })),
      verificationStatus: "unverified",
      createdAt: NOW,
      updatedAt: NOW,
    };
    this.legalEntities.set(id, created);
    return structuredClone(created);
  }

  async bootstrapLegalEntityFromOrganization(input: {
    tenantId: string;
    marketCode: string;
  }) {
    await simulateNetworkDelay(70);
    requireCustomerInvoicing("invoicing.tenant.manage");
    const existing = [...this.legalEntities.values()].find(
      (item) =>
        item.tenantId === input.tenantId &&
        item.defaultMarketCode === input.marketCode,
    );
    if (existing) return structuredClone(existing);
    const market = getCountryConfig(input.marketCode);
    if (!market) throw new Error("Marché de facturation introuvable.");
    return this.createLegalEntity({
      tenantId: input.tenantId,
      legalName: "Organisation Facturation",
      countryCode: input.marketCode,
      defaultMarketCode: input.marketCode,
      defaultCurrency: market.currency,
      defaultLocale: market.defaultLocale,
      timezone: market.timezone,
      registeredAddress: {
        line1: "Adresse de l’organisation",
        postalCode: "00000",
        city: "Ville",
        countryCode: input.marketCode,
      },
      identifiers: [],
    });
  }

  async listParties(tenantId: string) {
    await simulateNetworkDelay(40);
    requireCustomerInvoicing("invoice.read");
    return [...this.parties.values()].filter(
      (item) => item.tenantId === tenantId,
    );
  }

  async createParty(input: CreateInvoicingParty) {
    await simulateNetworkDelay(70);
    requireCustomerInvoicing("invoice.party.manage");
    const value = createInvoicingPartySchema.parse(input);
    const id = `demo-party-${this.parties.size + 1}`;
    const created: InvoicingParty = {
      ...value,
      id,
      scope: "MULTI_MARKET_SHARED",
      identifiers: value.identifiers.map((identifier, index) => ({
        ...identifier,
        id: `${id}-identifier-${index + 1}`,
        verificationStatus: "unverified",
      })),
      createdAt: NOW,
      updatedAt: NOW,
    };
    this.parties.set(id, created);
    return structuredClone(created);
  }

  async listInvoices(options: {
    tenantId: string;
    marketCode: string;
    limit?: number;
    cursor?: string;
  }): Promise<InvoicingInvoicePage> {
    await simulateNetworkDelay(60);
    requireCustomerInvoicing("invoice.read");
    const offset = Number(options.cursor ?? 0);
    const limit = options.limit ?? 25;
    const matching = [...this.invoices.values()].filter(
      (item) =>
        item.tenantId === options.tenantId &&
        item.marketCode === options.marketCode,
    );
    const items = matching.slice(offset, offset + limit);
    const nextOffset = offset + items.length;
    return {
      items: structuredClone(items),
      pageInfo: {
        hasNextPage: nextOffset < matching.length,
        nextCursor:
          nextOffset < matching.length ? String(nextOffset) : undefined,
      },
    };
  }

  async getInvoice(invoiceId: string) {
    await simulateNetworkDelay(35);
    requireCustomerInvoicing("invoice.read");
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) throw new Error("Facture introuvable.");
    return structuredClone(invoice);
  }

  async updateInvoiceDraft(
    invoiceId: string,
    input: UpdateInvoicingInvoiceDraft,
  ) {
    await simulateNetworkDelay(70);
    requireCustomerInvoicing("invoice.create");
    const current = this.invoices.get(invoiceId);
    if (!current) throw new Error("Facture introuvable.");
    if (!["DRAFT", "READY_TO_FINALIZE"].includes(current.commercialState)) {
      throw new Error("Une facture finalisée ne peut plus être modifiée.");
    }
    if (current.version !== input.expectedVersion) {
      throw new Error("La facture a été modifiée. Rechargez-la.");
    }
    const parsed = createInvoicingInvoiceSchema.parse({
      tenantId: current.tenantId,
      legalEntityId: current.legalEntityId,
      customerPartyId: input.customerPartyId,
      documentType: current.documentType,
      marketCode: current.marketCode,
      countryCode: current.countryCode,
      locale: current.locale,
      timezone: current.timezone,
      currency: current.currency,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      servicePeriodStart: input.servicePeriodStart,
      servicePeriodEnd: input.servicePeriodEnd,
      purchaseOrderReference: input.purchaseOrderReference,
      customerReference: input.customerReference,
      notes: input.notes,
      origin: current.origin,
      relatedInvoiceId: current.relatedInvoiceId,
      lines: input.lines,
    });
    const calculated = calculateLines(parsed.lines);
    const subtotal = calculated.lines.reduce(
      (sum, line) => sum + line.netAmountMinor,
      0,
    );
    const taxTotal = calculated.lines.reduce(
      (sum, line) => sum + line.taxAmountMinor,
      0,
    );
    const updated: InvoicingInvoice = {
      ...current,
      customerPartyId: parsed.customerPartyId,
      issueDate: parsed.issueDate,
      dueDate: parsed.dueDate,
      servicePeriodStart: parsed.servicePeriodStart,
      servicePeriodEnd: parsed.servicePeriodEnd,
      purchaseOrderReference: parsed.purchaseOrderReference,
      customerReference: parsed.customerReference,
      notes: parsed.notes,
      commercialState: "READY_TO_FINALIZE",
      lines: calculated.lines.map((line) => ({
        ...line,
        id: `demo-line-${invoiceId}-${current.version + 1}-${line.position}`,
      })),
      taxBreakdowns: calculated.taxes,
      subtotal: { amountMinor: subtotal, currency: current.currency },
      taxTotal: { amountMinor: taxTotal, currency: current.currency },
      total: { amountMinor: subtotal + taxTotal, currency: current.currency },
      outstanding: {
        amountMinor: subtotal + taxTotal,
        currency: current.currency,
      },
      version: current.version + 1,
      updatedAt: NOW,
    };
    this.invoices.set(invoiceId, structuredClone(updated));
    return structuredClone(updated);
  }

  async createInvoice(input: CreateInvoicingInvoice, idempotencyKey: string) {
    await simulateNetworkDelay(90);
    requireCustomerInvoicing("invoice.create");
    const existingId = this.createKeys.get(idempotencyKey);
    if (existingId) return this.getInvoice(existingId);
    const value = createInvoicingInvoiceSchema.parse(input);
    const market = getCountryConfig(value.marketCode);
    if (
      !market ||
      !market.enabled ||
      !["active", "beta", "private_beta"].includes(market.launchStatus) ||
      market.countryCode !== value.countryCode ||
      market.currency !== value.currency ||
      !market.supportedLocales.includes(value.locale) ||
      market.timezone !== value.timezone
    ) {
      throw new Error("La facture ne correspond pas au contexte du marché.");
    }
    const calculated = calculateLines(value.lines);
    const subtotalMinor = calculated.lines.reduce(
      (sum, line) => sum + line.netAmountMinor,
      0,
    );
    const taxMinor = calculated.lines.reduce(
      (sum, line) => sum + line.taxAmountMinor,
      0,
    );
    if (value.documentType === "credit_note") {
      const original = value.relatedInvoiceId
        ? this.invoices.get(value.relatedInvoiceId)
        : undefined;
      if (
        !original ||
        !["FINALIZED", "CREDITED"].includes(original.commercialState) ||
        original.documentType === "credit_note" ||
        original.tenantId !== value.tenantId ||
        original.legalEntityId !== value.legalEntityId ||
        original.customerPartyId !== value.customerPartyId ||
        original.marketCode !== value.marketCode ||
        original.currency !== value.currency ||
        subtotalMinor + taxMinor > original.total.amountMinor
      ) {
        throw new Error("Facture d’origine introuvable ou montant invalide.");
      }
    }
    const id = `demo-invoice-draft-${this.counter++}`;
    const invoice: InvoicingInvoice = {
      ...value,
      id,
      scope: "MARKET_SCOPED",
      commercialState: "DRAFT",
      electronicState: "NOT_REQUESTED",
      paymentState: "UNPAID",
      accountingExportState: "NOT_EXPORTED",
      customerReviewState: "NOT_REQUESTED",
      lines: calculated.lines,
      taxBreakdowns: calculated.taxes,
      subtotal: { amountMinor: subtotalMinor, currency: value.currency },
      taxTotal: { amountMinor: taxMinor, currency: value.currency },
      total: {
        amountMinor: subtotalMinor + taxMinor,
        currency: value.currency,
      },
      outstanding: {
        amountMinor: subtotalMinor + taxMinor,
        currency: value.currency,
      },
      version: 1,
      createdAt: NOW,
      updatedAt: NOW,
    };
    this.invoices.set(id, invoice);
    this.createKeys.set(idempotencyKey, id);
    return structuredClone(invoice);
  }

  async finalizeInvoice(
    invoiceId: string,
    expectedVersion: number,
    idempotencyKey: string,
  ) {
    await simulateNetworkDelay(100);
    requireCustomerInvoicing("invoice.finalize");
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) throw new Error("Facture introuvable.");
    if (invoice.commercialState === "FINALIZED") {
      if (this.finalizeKeys.get(invoiceId) !== idempotencyKey) {
        throw new Error("La facture est déjà finalisée.");
      }
      return structuredClone(invoice);
    }
    if (invoice.version !== expectedVersion) {
      throw new Error(
        "La facture a été modifiée. Rechargez-la avant de continuer.",
      );
    }
    let original: InvoicingInvoice | undefined;
    let creditedAfterFinalization = 0;
    if (invoice.documentType === "credit_note") {
      original = invoice.relatedInvoiceId
        ? this.invoices.get(invoice.relatedInvoiceId)
        : undefined;
      const alreadyCredited = [...this.invoices.values()]
        .filter(
          (candidate) =>
            candidate.documentType === "credit_note" &&
            candidate.relatedInvoiceId === invoice.relatedInvoiceId &&
            candidate.commercialState === "FINALIZED",
        )
        .reduce((sum, candidate) => sum + candidate.total.amountMinor, 0);
      creditedAfterFinalization = alreadyCredited + invoice.total.amountMinor;
      if (!original || creditedAfterFinalization > original.total.amountMinor) {
        throw new Error(
          "L’avoir dépasse le montant restant de la facture d’origine.",
        );
      }
    }
    const sequence =
      [...this.invoices.values()].filter(
        (item) =>
          item.commercialState === "FINALIZED" &&
          item.documentType === invoice.documentType,
      ).length + 1;
    const prefix = invoice.documentType === "credit_note" ? "AVOIR" : "FAC";
    const finalized: InvoicingInvoice = {
      ...invoice,
      number: `DEMO-${prefix}-2026-${String(sequence).padStart(6, "0")}`,
      commercialState: "FINALIZED",
      electronicState: "CONFIGURATION_REQUIRED",
      version: invoice.version + 1,
      snapshotDigest: "b".repeat(64),
      finalizedAt: NOW,
      updatedAt: NOW,
    };
    const content = [
      "SHONGRE INVOICE CORE FOUNDATION",
      `Number: ${finalized.number}`,
      `Total (minor): ${finalized.total.amountMinor}`,
      "Electronic transport: CONFIGURATION_REQUIRED",
    ].join("\n");
    this.invoices.set(invoiceId, finalized);
    this.finalizeKeys.set(invoiceId, idempotencyKey);
    this.documents.set(invoiceId, {
      id: `${invoiceId}-document`,
      invoiceId,
      fileName: `${finalized.number}.txt`,
      mediaType: "text/plain;charset=utf-8",
      format: "TEXT_V1",
      legalOriginal: false,
      digestAlgorithm: "SHA-256",
      digest: await sha256Hex(content),
      generatorVersion: "demo-invoicing-1",
      templateVersion: "human-readable-text-1",
      complianceRulesetVersion: "GENERIC-UNREVIEWED-1",
      generatedAt: NOW,
      content,
    });
    if (original && creditedAfterFinalization === original.total.amountMinor) {
      this.invoices.set(original.id, {
        ...original,
        commercialState: "CREDITED",
        version: original.version + 1,
        updatedAt: NOW,
      });
    }
    return structuredClone(finalized);
  }

  async getDocument(invoiceId: string) {
    await simulateNetworkDelay(40);
    requireCustomerInvoicing("invoice.read");
    let document = this.documents.get(invoiceId);
    if (!document) {
      const invoice = this.invoices.get(invoiceId);
      if (
        !invoice ||
        !["FINALIZED", "CREDITED"].includes(invoice.commercialState) ||
        !invoice.number
      ) {
        throw new Error("Document introuvable.");
      }
      const content = [
        "SHONGRE INVOICE CORE FOUNDATION",
        `Number: ${invoice.number}`,
        `Total (minor): ${invoice.total.amountMinor}`,
        "Electronic transport: CONFIGURATION_REQUIRED",
      ].join("\n");
      document = {
        id: `${invoiceId}-document`,
        invoiceId,
        fileName: `${invoice.number}.txt`,
        mediaType: "text/plain;charset=utf-8",
        format: "TEXT_V1",
        legalOriginal: false,
        digestAlgorithm: "SHA-256",
        digest: await sha256Hex(content),
        generatorVersion: "demo-invoicing-1",
        templateVersion: "human-readable-text-1",
        complianceRulesetVersion: "GENERIC-UNREVIEWED-1",
        generatedAt: invoice.finalizedAt ?? NOW,
        content,
      };
      this.documents.set(invoiceId, document);
    }
    return structuredClone(document);
  }
}

export const demoInvoicingService = new DemoInvoicingService();
