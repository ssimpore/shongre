import { createHash, randomUUID } from "node:crypto";
import type {
  CreateInvoicingLegalEntity,
  CreateInvoicingParty,
  InvoicingDocument,
  InvoicingInvoice,
  InvoicingInvoicePage,
  InvoicingLegalEntity,
  InvoicingLine,
  InvoicingParty,
  InvoicingTaxBreakdown,
  InvoicingTenantSummary,
} from "@shongre/contracts/invoicing";
import type { Database } from "../../../generated/database.types.js";
import { config } from "../../../app/config/index.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { getSupabaseAdminClient } from "../../supabase/supabase-client.js";
import { databaseFailure } from "./repository-error.js";

type LegalEntityRow =
  Database["public"]["Tables"]["invoicing_legal_entities"]["Row"];
type LegalIdentifierRow =
  Database["public"]["Tables"]["invoicing_legal_identifiers"]["Row"];
type PartyRow = Database["public"]["Tables"]["invoicing_parties"]["Row"];
type PartyIdentifierRow =
  Database["public"]["Tables"]["invoicing_party_identifiers"]["Row"];
type InvoiceRow = Database["public"]["Tables"]["invoicing_invoices"]["Row"];
type InvoiceLineRow =
  Database["public"]["Tables"]["invoicing_invoice_lines"]["Row"];
type TaxBreakdownRow =
  Database["public"]["Tables"]["invoicing_tax_breakdowns"]["Row"];

export interface InvoicingTenantAccess extends InvoicingTenantSummary {
  userId: string;
}

type InvoicingProductAccess = InvoicingTenantSummary["productAccess"];

export interface CreateInvoiceRecord {
  invoice: InvoicingInvoice;
  idempotencyKey: string;
  requestId?: string;
}

export interface FinalizeInvoiceRecord {
  invoiceId: string;
  actorId: string;
  expectedVersion: number;
  idempotencyKey: string;
  requestId?: string;
}

export interface UpdateInvoiceDraftRecord {
  invoice: InvoicingInvoice;
  actorId: string;
  expectedVersion: number;
  requestId?: string;
}

export interface InvoicingRepository {
  listTenants(userId: string): Promise<InvoicingTenantAccess[]>;
  listLegalEntities(
    userId: string,
    marketCode?: string,
  ): Promise<InvoicingLegalEntity[]>;
  createLegalEntity(
    userId: string,
    value: CreateInvoicingLegalEntity,
  ): Promise<InvoicingLegalEntity>;
  bootstrapLegalEntityFromOrganization(
    userId: string,
    input: {
      tenantId: string;
      marketCode: string;
      currency: string;
      locale: string;
      timezone: string;
    },
  ): Promise<InvoicingLegalEntity>;
  listParties(
    userId: string,
    tenantId: string,
    role?: "customer" | "supplier",
  ): Promise<InvoicingParty[]>;
  createParty(
    userId: string,
    value: CreateInvoicingParty,
  ): Promise<InvoicingParty>;
  getLegalEntity(
    userId: string,
    legalEntityId: string,
  ): Promise<InvoicingLegalEntity | null>;
  getParty(userId: string, partyId: string): Promise<InvoicingParty | null>;
  listInvoices(
    userId: string,
    tenantId: string,
    marketCode: string,
    limit: number,
    cursor?: string,
  ): Promise<InvoicingInvoicePage>;
  getInvoice(
    userId: string,
    invoiceId: string,
  ): Promise<InvoicingInvoice | null>;
  createInvoice(
    userId: string,
    record: CreateInvoiceRecord,
  ): Promise<InvoicingInvoice>;
  updateInvoiceDraft(
    userId: string,
    record: UpdateInvoiceDraftRecord,
  ): Promise<InvoicingInvoice>;
  finalizeInvoice(record: FinalizeInvoiceRecord): Promise<InvoicingInvoice>;
  getDocument(
    userId: string,
    invoiceId: string,
  ): Promise<InvoicingDocument | null>;
}

function valueOrUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

function mapIdentifier(row: LegalIdentifierRow | PartyIdentifierRow) {
  return {
    id: row.id,
    type: row.identifier_type,
    countryCode: row.country_code,
    value: row.identifier_value,
    issuingAuthority: valueOrUndefined(row.issuing_authority),
    verificationStatus: row.verification_status,
    verifiedAt: valueOrUndefined(row.verified_at),
    verificationSource: valueOrUndefined(row.verification_source),
  };
}

function mapLegalEntity(
  row: LegalEntityRow,
  identifiers: readonly LegalIdentifierRow[],
): InvoicingLegalEntity {
  return {
    id: row.id,
    tenantId: row.organization_id,
    scope: "MULTI_MARKET_SHARED",
    legalName: row.legal_name,
    tradingName: valueOrUndefined(row.trading_name),
    legalForm: valueOrUndefined(row.legal_form),
    countryCode: row.country_code,
    defaultMarketCode: row.default_market_code,
    defaultCurrency: row.default_currency,
    defaultLocale: row.default_locale,
    timezone: row.timezone,
    registeredAddress: {
      line1: row.address_line_1,
      line2: valueOrUndefined(row.address_line_2),
      postalCode: row.postal_code,
      city: row.city,
      countryCode: row.address_country_code,
    },
    identifiers: identifiers
      .filter((identifier) => identifier.legal_entity_id === row.id)
      .map(mapIdentifier),
    verificationStatus: row.verification_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapParty(
  row: PartyRow,
  identifiers: readonly PartyIdentifierRow[],
): InvoicingParty {
  return {
    id: row.id,
    tenantId: row.organization_id,
    scope: "MULTI_MARKET_SHARED",
    kind: row.party_kind,
    roles: row.roles,
    legalName: row.legal_name,
    tradingName: valueOrUndefined(row.trading_name),
    billingAddress: {
      line1: row.billing_address_line_1,
      line2: valueOrUndefined(row.billing_address_line_2),
      postalCode: row.billing_postal_code,
      city: row.billing_city,
      countryCode: row.billing_country_code,
    },
    email: valueOrUndefined(row.email),
    phone: valueOrUndefined(row.phone),
    locale: row.locale,
    preferredCurrency: row.preferred_currency,
    paymentTermsDays: row.payment_terms_days,
    identifiers: identifiers
      .filter((identifier) => identifier.party_id === row.id)
      .map(mapIdentifier),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLine(row: InvoiceLineRow): InvoicingLine {
  return {
    id: row.id,
    position: row.position,
    description: row.description,
    quantity: String(row.quantity_decimal).replace(/\.0+$/, ""),
    unit: row.unit,
    unitPriceMinorDecimal: String(row.unit_price_minor_decimal).replace(
      /\.0+$/,
      "",
    ),
    taxRateBps: row.tax_rate_bps,
    taxCategory: row.tax_category,
    exemptionReasonCode: valueOrUndefined(row.exemption_reason_code),
    exemptionReason: valueOrUndefined(row.exemption_reason),
    netAmountMinor: row.net_amount_minor,
    taxAmountMinor: row.tax_amount_minor,
    grossAmountMinor: row.gross_amount_minor,
  };
}

function mapTax(row: TaxBreakdownRow): InvoicingTaxBreakdown {
  return {
    taxRateBps: row.tax_rate_bps,
    taxCategory: row.tax_category,
    taxableAmountMinor: row.taxable_amount_minor,
    taxAmountMinor: row.tax_amount_minor,
  };
}

function mapInvoice(
  row: InvoiceRow,
  lines: readonly InvoiceLineRow[],
  taxBreakdowns: readonly TaxBreakdownRow[],
): InvoicingInvoice {
  return {
    id: row.id,
    tenantId: row.organization_id,
    legalEntityId: row.legal_entity_id,
    customerPartyId: row.customer_party_id,
    scope: "MARKET_SCOPED",
    documentType: row.document_type,
    origin: row.document_origin,
    relatedInvoiceId: valueOrUndefined(row.related_invoice_id),
    number: valueOrUndefined(row.legal_number),
    marketCode: row.market_code,
    countryCode: row.country_code,
    locale: row.locale,
    timezone: row.timezone,
    currency: row.currency,
    issueDate: row.issue_date,
    dueDate: row.due_date,
    servicePeriodStart: valueOrUndefined(row.service_period_start),
    servicePeriodEnd: valueOrUndefined(row.service_period_end),
    purchaseOrderReference: valueOrUndefined(row.purchase_order_reference),
    customerReference: valueOrUndefined(row.customer_reference),
    notes: valueOrUndefined(row.notes),
    commercialState: row.commercial_state,
    electronicState: row.electronic_state,
    paymentState: row.payment_state,
    accountingExportState: row.accounting_export_state,
    customerReviewState: row.customer_review_state,
    lines: lines
      .filter((line) => line.invoice_id === row.id)
      .sort((left, right) => left.position - right.position)
      .map(mapLine),
    taxBreakdowns: taxBreakdowns
      .filter((tax) => tax.invoice_id === row.id)
      .map(mapTax),
    subtotal: { amountMinor: row.subtotal_minor, currency: row.currency },
    taxTotal: { amountMinor: row.tax_total_minor, currency: row.currency },
    total: { amountMinor: row.total_minor, currency: row.currency },
    outstanding: {
      amountMinor: row.outstanding_minor,
      currency: row.currency,
    },
    version: row.version,
    snapshotDigest: valueOrUndefined(row.snapshot_digest),
    finalizedAt: valueOrUndefined(row.finalized_at),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function deterministicUuid(namespace: string, value: string): string {
  const hash = createHash("sha256")
    .update(`${namespace}:${value}`)
    .digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

const DEMO_TENANT_ID = "10000000-0000-4000-a000-000000000001";
const DEMO_ENTITY_ID = "10000000-0000-4000-a000-000000000002";
const DEMO_PARTY_ID = "10000000-0000-4000-a000-000000000003";
const DEMO_NOW = "2026-08-28T09:00:00.000Z";

const DEMO_PRODUCT_ACCESS: InvoicingProductAccess = {
  organizationId: DEMO_TENANT_ID,
  productId: "facturation",
  entitlementKey: "invoicing.enabled",
  status: "trialing",
  accessMode: "STANDALONE",
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
};

export class DemoInvoicingRepository implements InvoicingRepository {
  private readonly legalEntities = new Map<string, InvoicingLegalEntity>();
  private readonly parties = new Map<string, InvoicingParty>();
  private readonly invoices = new Map<string, InvoicingInvoice>();
  private readonly documents = new Map<string, InvoicingDocument>();
  private readonly finalizationKeys = new Map<string, string>();
  private readonly finalizedSequences = new Map<string, number>();

  constructor(
    private readonly options: {
      denyProductAccessForUserIds?: readonly string[];
    } = {},
  ) {
    this.legalEntities.set(DEMO_ENTITY_ID, {
      id: DEMO_ENTITY_ID,
      tenantId: DEMO_TENANT_ID,
      scope: "MULTI_MARKET_SHARED",
      legalName: "Atelier Horizon SARL",
      tradingName: "Atelier Horizon",
      legalForm: "SARL",
      countryCode: "FR",
      defaultMarketCode: "FR",
      defaultCurrency: "EUR",
      defaultLocale: "fr-FR",
      timezone: "Europe/Paris",
      registeredAddress: {
        line1: "18 rue des Tisserands",
        postalCode: "69003",
        city: "Lyon",
        countryCode: "FR",
      },
      identifiers: [
        {
          id: "10000000-0000-4000-a000-000000000004",
          type: "SIREN",
          countryCode: "FR",
          value: "812345678",
          issuingAuthority: "INSEE",
          verificationStatus: "verified",
          verifiedAt: "2026-08-20T09:00:00.000Z",
          verificationSource: "demo_fixture",
        },
      ],
      verificationStatus: "verified",
      createdAt: DEMO_NOW,
      updatedAt: DEMO_NOW,
    });
    this.parties.set(DEMO_PARTY_ID, {
      id: DEMO_PARTY_ID,
      tenantId: DEMO_TENANT_ID,
      scope: "MULTI_MARKET_SHARED",
      kind: "company",
      roles: ["customer"],
      legalName: "Maison Lenoir SAS",
      billingAddress: {
        line1: "42 avenue du Parc",
        postalCode: "75012",
        city: "Paris",
        countryCode: "FR",
      },
      email: "facturation@maison-lenoir.example",
      locale: "fr-FR",
      preferredCurrency: "EUR",
      paymentTermsDays: 30,
      identifiers: [],
      createdAt: DEMO_NOW,
      updatedAt: DEMO_NOW,
    });
  }

  async listTenants(userId: string): Promise<InvoicingTenantAccess[]> {
    if (this.options.denyProductAccessForUserIds?.includes(userId)) return [];
    return [
      {
        id: DEMO_TENANT_ID,
        userId,
        legalName: "Atelier Horizon SARL",
        countryCode: "FR",
        membershipRole: "owner",
        capabilities: [
          "invoice.read",
          "invoice.create",
          "invoice.finalize",
          "invoice.party.manage",
          "invoicing.tenant.manage",
        ],
        productAccess: structuredClone(DEMO_PRODUCT_ACCESS),
      },
    ];
  }

  async listLegalEntities(
    _userId: string,
    marketCode?: string,
  ): Promise<InvoicingLegalEntity[]> {
    return structuredClone(
      [...this.legalEntities.values()].filter(
        (entity) => !marketCode || entity.defaultMarketCode === marketCode,
      ),
    );
  }

  async createLegalEntity(
    _userId: string,
    value: CreateInvoicingLegalEntity,
  ): Promise<InvoicingLegalEntity> {
    const id = deterministicUuid("legal-entity", JSON.stringify(value));
    const entity: InvoicingLegalEntity = {
      ...value,
      id,
      scope: "MULTI_MARKET_SHARED",
      verificationStatus: "unverified",
      identifiers: value.identifiers.map((identifier, index) => ({
        ...identifier,
        id: deterministicUuid("legal-identifier", `${id}:${index}`),
        verificationStatus: "unverified",
      })),
      createdAt: DEMO_NOW,
      updatedAt: DEMO_NOW,
    };
    this.legalEntities.set(id, structuredClone(entity));
    return structuredClone(entity);
  }

  async bootstrapLegalEntityFromOrganization(
    userId: string,
    input: {
      tenantId: string;
      marketCode: string;
      currency: string;
      locale: string;
      timezone: string;
    },
  ): Promise<InvoicingLegalEntity> {
    const existing = [...this.legalEntities.values()].find(
      (candidate) =>
        candidate.tenantId === input.tenantId &&
        candidate.defaultMarketCode === input.marketCode,
    );
    if (existing) return structuredClone(existing);
    return this.createLegalEntity(userId, {
      tenantId: input.tenantId,
      legalName: "Organisation Facturation",
      countryCode: input.marketCode,
      defaultMarketCode: input.marketCode,
      defaultCurrency: input.currency,
      defaultLocale: input.locale,
      timezone: input.timezone,
      registeredAddress: {
        line1: "Adresse de l’organisation",
        postalCode: "00000",
        city: "Ville",
        countryCode: input.marketCode,
      },
      identifiers: [],
    });
  }

  async listParties(
    _userId: string,
    tenantId: string,
    role?: "customer" | "supplier",
  ): Promise<InvoicingParty[]> {
    return structuredClone(
      [...this.parties.values()].filter(
        (party) =>
          party.tenantId === tenantId && (!role || party.roles.includes(role)),
      ),
    );
  }

  async createParty(
    _userId: string,
    value: CreateInvoicingParty,
  ): Promise<InvoicingParty> {
    const id = deterministicUuid("party", JSON.stringify(value));
    const party: InvoicingParty = {
      ...value,
      id,
      scope: "MULTI_MARKET_SHARED",
      identifiers: value.identifiers.map((identifier, index) => ({
        ...identifier,
        id: deterministicUuid("party-identifier", `${id}:${index}`),
        verificationStatus: "unverified",
      })),
      createdAt: DEMO_NOW,
      updatedAt: DEMO_NOW,
    };
    this.parties.set(id, structuredClone(party));
    return structuredClone(party);
  }

  async getLegalEntity(
    _userId: string,
    legalEntityId: string,
  ): Promise<InvoicingLegalEntity | null> {
    return structuredClone(this.legalEntities.get(legalEntityId) ?? null);
  }

  async getParty(
    _userId: string,
    partyId: string,
  ): Promise<InvoicingParty | null> {
    return structuredClone(this.parties.get(partyId) ?? null);
  }

  async listInvoices(
    _userId: string,
    tenantId: string,
    marketCode: string,
    limit: number,
    cursor?: string,
  ): Promise<InvoicingInvoicePage> {
    const sorted = [...this.invoices.values()]
      .filter(
        (invoice) =>
          invoice.tenantId === tenantId && invoice.marketCode === marketCode,
      )
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    const start = cursor
      ? Math.max(0, sorted.findIndex((invoice) => invoice.id === cursor) + 1)
      : 0;
    const items = sorted.slice(start, start + limit);
    return {
      items: structuredClone(items),
      pageInfo: {
        hasNextPage: start + limit < sorted.length,
        nextCursor:
          start + limit < sorted.length ? items.at(-1)?.id : undefined,
      },
    };
  }

  async getInvoice(
    _userId: string,
    invoiceId: string,
  ): Promise<InvoicingInvoice | null> {
    return structuredClone(this.invoices.get(invoiceId) ?? null);
  }

  async createInvoice(
    _userId: string,
    record: CreateInvoiceRecord,
  ): Promise<InvoicingInvoice> {
    const existing = [...this.invoices.values()].find(
      (invoice) =>
        invoice.tenantId === record.invoice.tenantId &&
        invoice.id === deterministicUuid("invoice", record.idempotencyKey),
    );
    if (existing) return structuredClone(existing);
    const invoice = {
      ...record.invoice,
      id: deterministicUuid("invoice", record.idempotencyKey),
      lines: record.invoice.lines.map((line) => ({
        ...line,
        id: deterministicUuid(
          "invoice-line",
          `${record.idempotencyKey}:${line.position}`,
        ),
      })),
    };
    this.invoices.set(invoice.id, structuredClone(invoice));
    return structuredClone(invoice);
  }

  async updateInvoiceDraft(
    _userId: string,
    record: UpdateInvoiceDraftRecord,
  ): Promise<InvoicingInvoice> {
    const current = this.invoices.get(record.invoice.id);
    if (!current) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Facture introuvable.",
      });
    }
    if (
      current.commercialState !== "DRAFT" &&
      current.commercialState !== "READY_TO_FINALIZE"
    ) {
      throw new AppError({
        code: "CONFLICT",
        message: "Une facture finalisée ne peut plus être modifiée.",
      });
    }
    if (current.version !== record.expectedVersion) {
      throw new AppError({
        code: "CONFLICT",
        message: "La facture a été modifiée. Rechargez-la avant de continuer.",
      });
    }
    const updated = {
      ...record.invoice,
      id: current.id,
      createdAt: current.createdAt,
      version: current.version + 1,
      updatedAt: DEMO_NOW,
      lines: record.invoice.lines.map((line) => ({
        ...line,
        id: deterministicUuid(
          "invoice-line-update",
          `${current.id}:${current.version + 1}:${line.position}`,
        ),
      })),
    };
    this.invoices.set(updated.id, structuredClone(updated));
    return structuredClone(updated);
  }

  async finalizeInvoice(
    record: FinalizeInvoiceRecord,
  ): Promise<InvoicingInvoice> {
    const current = this.invoices.get(record.invoiceId);
    if (!current) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Facture introuvable.",
      });
    }
    if (current.commercialState === "FINALIZED") {
      if (this.finalizationKeys.get(current.id) === record.idempotencyKey) {
        return structuredClone(current);
      }
      throw new AppError({
        code: "CONFLICT",
        message: "La facture a déjà été finalisée avec une autre commande.",
      });
    }
    if (current.version !== record.expectedVersion) {
      throw new AppError({
        code: "CONFLICT",
        message: "La facture a été modifiée. Rechargez-la avant de finaliser.",
      });
    }
    const year = Number(current.issueDate.slice(0, 4));
    const sequenceKey = `${current.legalEntityId}:${current.marketCode}:${year}:${current.documentType}`;
    const sequence = (this.finalizedSequences.get(sequenceKey) ?? 0) + 1;
    this.finalizedSequences.set(sequenceKey, sequence);
    const prefix = current.documentType === "credit_note" ? "AVOIR" : "FAC";
    if (current.documentType === "credit_note") {
      const original = current.relatedInvoiceId
        ? this.invoices.get(current.relatedInvoiceId)
        : undefined;
      const alreadyCredited = [...this.invoices.values()]
        .filter(
          (invoice) =>
            invoice.documentType === "credit_note" &&
            invoice.relatedInvoiceId === current.relatedInvoiceId &&
            invoice.commercialState === "FINALIZED",
        )
        .reduce((sum, invoice) => sum + invoice.total.amountMinor, 0);
      if (
        !original ||
        !["FINALIZED", "CREDITED"].includes(original.commercialState) ||
        original.documentType === "credit_note" ||
        alreadyCredited + current.total.amountMinor > original.total.amountMinor
      ) {
        throw new AppError({
          code: "CONFLICT",
          message:
            "L’avoir dépasse le montant restant de la facture d’origine.",
        });
      }
    }
    const number = `DEMO-${prefix}-${year}-${String(sequence).padStart(8, "0")}`;
    const finalizedAt = DEMO_NOW;
    const snapshot = JSON.stringify({ ...current, number, finalizedAt });
    const digest = createHash("sha256").update(snapshot).digest("hex");
    const invoice: InvoicingInvoice = {
      ...current,
      number,
      commercialState: "FINALIZED",
      electronicState: "CONFIGURATION_REQUIRED",
      outstanding: current.total,
      version: current.version + 1,
      snapshotDigest: digest,
      finalizedAt,
      updatedAt: finalizedAt,
    };
    const content = [
      "SHONGRE INVOICE DEMO",
      `Number: ${number}`,
      `Issue date: ${invoice.issueDate}`,
      `Currency: ${invoice.currency}`,
      `Total (minor): ${invoice.total.amountMinor}`,
      `Snapshot SHA-256: ${digest}`,
      "Electronic transport: CONFIGURATION_REQUIRED",
    ].join("\n");
    this.documents.set(invoice.id, {
      id: deterministicUuid("document", invoice.id),
      invoiceId: invoice.id,
      fileName: `${number}.txt`,
      mediaType: "text/plain;charset=utf-8",
      format: "TEXT_V1",
      legalOriginal: false,
      digestAlgorithm: "SHA-256",
      digest: createHash("sha256").update(content).digest("hex"),
      generatorVersion: "demo-invoicing-core-1",
      templateVersion: "human-readable-text-1",
      complianceRulesetVersion: "GENERIC-UNREVIEWED-1",
      generatedAt: finalizedAt,
      content,
    });
    this.finalizationKeys.set(invoice.id, record.idempotencyKey);
    this.invoices.set(invoice.id, structuredClone(invoice));
    if (invoice.documentType === "credit_note" && invoice.relatedInvoiceId) {
      const original = this.invoices.get(invoice.relatedInvoiceId);
      if (original) {
        const creditedTotal = [...this.invoices.values()]
          .filter(
            (candidate) =>
              candidate.documentType === "credit_note" &&
              candidate.relatedInvoiceId === original.id &&
              candidate.commercialState === "FINALIZED",
          )
          .reduce((sum, candidate) => sum + candidate.total.amountMinor, 0);
        if (creditedTotal === original.total.amountMinor) {
          this.invoices.set(original.id, {
            ...original,
            commercialState: "CREDITED",
            version: original.version + 1,
            updatedAt: finalizedAt,
          });
        }
      }
    }
    return structuredClone(invoice);
  }

  async getDocument(
    _userId: string,
    invoiceId: string,
  ): Promise<InvoicingDocument | null> {
    return structuredClone(this.documents.get(invoiceId) ?? null);
  }
}

export class PostgresInvoicingRepository implements InvoicingRepository {
  private readonly client = getSupabaseAdminClient();

  private async productAccessForOrganizations(
    organizations: readonly { id: string; owner_id: string }[],
    capabilitiesByOrganization: ReadonlyMap<string, readonly string[]>,
  ): Promise<Map<string, InvoicingProductAccess>> {
    if (!organizations.length) return new Map();
    const ownerIds = [...new Set(organizations.map((item) => item.owner_id))];
    const result = await this.client
      .from("monetization_entitlements")
      .select(
        "account_id,product_id,entitlement_key,entitlement_value,source_order_id,starts_at,ends_at,status",
      )
      .in("account_id", ownerIds)
      .eq("product_id", "product.facturation")
      .in("entitlement_key", [
        "invoicing.enabled",
        "invoicing.accessMode",
        "invoicing.planName",
        "invoicing.seats",
      ]);
    if (result.error)
      databaseFailure("invoicing.listProductEntitlements", result.error);

    const now = Date.now();
    const activeRows = result.data.filter((row) => {
      const startsAt = new Date(row.starts_at).getTime();
      const endsAt = row.ends_at ? new Date(row.ends_at).getTime() : undefined;
      return (
        row.status === "active" &&
        startsAt <= now &&
        (endsAt === undefined || endsAt > now)
      );
    });
    const accessByOrganization = new Map<string, InvoicingProductAccess>();
    for (const organization of organizations) {
      const rows = activeRows.filter(
        (row) => row.account_id === organization.owner_id,
      );
      const values = new Map(
        rows.map((row) => [row.entitlement_key, row.entitlement_value]),
      );
      const enabled = values.get("invoicing.enabled");
      if (enabled !== true && enabled !== "true") continue;
      const enabledRow = rows.find(
        (row) => row.entitlement_key === "invoicing.enabled",
      );
      const rawAccessMode = values.get("invoicing.accessMode");
      const accessMode = [
        "STANDALONE",
        "ADD_ON",
        "BUNDLED",
        "INTERNAL_SHONGRE",
      ].includes(String(rawAccessMode))
        ? (String(rawAccessMode) as InvoicingProductAccess["accessMode"])
        : "ADD_ON";
      const rawSeats = Number(values.get("invoicing.seats") ?? 1);
      accessByOrganization.set(organization.id, {
        organizationId: organization.id,
        productId: "facturation",
        entitlementKey: "invoicing.enabled",
        status: "active",
        accessMode,
        planName: String(
          values.get("invoicing.planName") ?? "Shongre Facturation",
        ),
        source: enabledRow?.source_order_id
          ? "subscription"
          : "complimentary_grant",
        activatedAt: enabledRow?.starts_at,
        currentPeriodEndsAt: enabledRow?.ends_at ?? undefined,
        cancelAtPeriodEnd: false,
        seats: Number.isSafeInteger(rawSeats) && rawSeats > 0 ? rawSeats : 1,
        capabilities: [
          ...(capabilitiesByOrganization.get(organization.id) ?? []),
        ].filter(
          (capability) =>
            capability.startsWith("invoice") ||
            capability.startsWith("invoicing") ||
            capability === "subscription.manage.own",
        ),
      });
    }
    return accessByOrganization;
  }

  private async requireTenant(userId: string, tenantId: string) {
    const { data, error } = await this.client
      .from("organization_members")
      .select("organization_id,user_id,role,status,permissions")
      .eq("organization_id", tenantId)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    if (error) databaseFailure("invoicing.requireTenant", error);
    if (!data) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Ressource introuvable.",
      });
    }
    const organizationResult = await this.client
      .from("organizations")
      .select("id,owner_id")
      .eq("id", tenantId)
      .eq("status", "active")
      .maybeSingle();
    if (organizationResult.error)
      databaseFailure(
        "invoicing.requireTenantOrganization",
        organizationResult.error,
      );
    if (!organizationResult.data) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Ressource introuvable.",
      });
    }
    const access = await this.productAccessForOrganizations(
      [organizationResult.data],
      new Map([[tenantId, data.permissions]]),
    );
    if (!access.has(tenantId)) {
      throw new AppError({
        code: "FORBIDDEN",
        message:
          "Shongre Facturation n’est pas activé pour cette organisation.",
        details: { gate: "INVOICING_ENTITLEMENT_REQUIRED" },
      });
    }
    return data;
  }

  async listTenants(userId: string): Promise<InvoicingTenantAccess[]> {
    const memberships = await this.client
      .from("organization_members")
      .select("organization_id,user_id,role,status,permissions")
      .eq("user_id", userId)
      .eq("status", "active");
    if (memberships.error)
      databaseFailure("invoicing.listMemberships", memberships.error);
    const tenantIds = memberships.data.map(
      (membership) => membership.organization_id,
    );
    if (!tenantIds.length) return [];
    const organizations = await this.client
      .from("organizations")
      .select("id,owner_id,legal_name,country")
      .in("id", tenantIds)
      .eq("status", "active");
    if (organizations.error)
      databaseFailure("invoicing.listOrganizations", organizations.error);
    const capabilitiesByOrganization = new Map(
      memberships.data.map((membership) => [
        membership.organization_id,
        membership.permissions,
      ]),
    );
    const productAccess = await this.productAccessForOrganizations(
      organizations.data,
      capabilitiesByOrganization,
    );
    return memberships.data.flatMap((membership) => {
      const organization = organizations.data.find(
        (candidate) => candidate.id === membership.organization_id,
      );
      return organization && productAccess.has(organization.id)
        ? [
            {
              id: organization.id,
              userId,
              legalName: organization.legal_name,
              countryCode: organization.country,
              membershipRole: membership.role,
              capabilities: membership.permissions,
              productAccess: productAccess.get(organization.id)!,
            },
          ]
        : [];
    });
  }

  private async identifiersForEntities(ids: readonly string[]) {
    if (!ids.length) return [];
    const result = await this.client
      .from("invoicing_legal_identifiers")
      .select("*")
      .in("legal_entity_id", [...ids]);
    if (result.error)
      databaseFailure("invoicing.listLegalIdentifiers", result.error);
    return result.data;
  }

  async listLegalEntities(
    userId: string,
    marketCode?: string,
  ): Promise<InvoicingLegalEntity[]> {
    const tenants = await this.listTenants(userId);
    if (!tenants.length) return [];
    let query = this.client
      .from("invoicing_legal_entities")
      .select("*")
      .in(
        "organization_id",
        tenants.map((tenant) => tenant.id),
      )
      .order("created_at", { ascending: true });
    if (marketCode) query = query.eq("default_market_code", marketCode);
    const result = await query;
    if (result.error)
      databaseFailure("invoicing.listLegalEntities", result.error);
    const identifiers = await this.identifiersForEntities(
      result.data.map((entity) => entity.id),
    );
    return result.data.map((entity) => mapLegalEntity(entity, identifiers));
  }

  async createLegalEntity(
    userId: string,
    value: CreateInvoicingLegalEntity,
  ): Promise<InvoicingLegalEntity> {
    await this.requireTenant(userId, value.tenantId);
    const entityResult = await this.client
      .from("invoicing_legal_entities")
      .insert({
        organization_id: value.tenantId,
        legal_name: value.legalName,
        trading_name: value.tradingName ?? null,
        legal_form: value.legalForm ?? null,
        country_code: value.countryCode,
        default_market_code: value.defaultMarketCode,
        default_currency: value.defaultCurrency,
        default_locale: value.defaultLocale,
        timezone: value.timezone,
        address_line_1: value.registeredAddress.line1,
        address_line_2: value.registeredAddress.line2 ?? null,
        postal_code: value.registeredAddress.postalCode,
        city: value.registeredAddress.city,
        address_country_code: value.registeredAddress.countryCode,
      })
      .select("*")
      .single();
    if (entityResult.error)
      databaseFailure("invoicing.createLegalEntity", entityResult.error);
    if (value.identifiers.length) {
      const identifiers = await this.client
        .from("invoicing_legal_identifiers")
        .insert(
          value.identifiers.map((identifier) => ({
            legal_entity_id: entityResult.data.id,
            identifier_type: identifier.type,
            country_code: identifier.countryCode,
            identifier_value: identifier.value,
            issuing_authority: identifier.issuingAuthority ?? null,
          })),
        );
      if (identifiers.error)
        databaseFailure("invoicing.createLegalIdentifiers", identifiers.error);
    }
    const identifierRows = await this.identifiersForEntities([
      entityResult.data.id,
    ]);
    return mapLegalEntity(entityResult.data, identifierRows);
  }

  async bootstrapLegalEntityFromOrganization(
    userId: string,
    input: {
      tenantId: string;
      marketCode: string;
      currency: string;
      locale: string;
      timezone: string;
    },
  ): Promise<InvoicingLegalEntity> {
    await this.requireTenant(userId, input.tenantId);
    const result = await this.client.rpc(
      "bootstrap_invoicing_legal_entity_from_organization",
      {
        p_organization_id: input.tenantId,
        p_actor_id: userId,
        p_market_code: input.marketCode,
        p_currency: input.currency,
        p_locale: input.locale,
        p_timezone: input.timezone,
      },
    );
    if (result.error || !result.data) {
      databaseFailure(
        "invoicing.bootstrapLegalEntityFromOrganization",
        result.error ?? new Error("Legal entity bootstrap returned no row"),
      );
    }
    const row = Array.isArray(result.data) ? result.data[0] : result.data;
    if (!row) {
      databaseFailure(
        "invoicing.bootstrapLegalEntityFromOrganization",
        new Error("Legal entity bootstrap returned no row"),
      );
    }
    return mapLegalEntity(
      row,
      await this.identifiersForEntities([row.id]),
    );
  }

  private async identifiersForParties(ids: readonly string[]) {
    if (!ids.length) return [];
    const result = await this.client
      .from("invoicing_party_identifiers")
      .select("*")
      .in("party_id", [...ids]);
    if (result.error)
      databaseFailure("invoicing.listPartyIdentifiers", result.error);
    return result.data;
  }

  async listParties(
    userId: string,
    tenantId: string,
    role?: "customer" | "supplier",
  ): Promise<InvoicingParty[]> {
    await this.requireTenant(userId, tenantId);
    let query = this.client
      .from("invoicing_parties")
      .select("*")
      .eq("organization_id", tenantId)
      .order("legal_name", { ascending: true })
      .limit(250);
    if (role) query = query.contains("roles", [role]);
    const result = await query;
    if (result.error) databaseFailure("invoicing.listParties", result.error);
    const identifiers = await this.identifiersForParties(
      result.data.map((party) => party.id),
    );
    return result.data.map((party) => mapParty(party, identifiers));
  }

  async createParty(
    userId: string,
    value: CreateInvoicingParty,
  ): Promise<InvoicingParty> {
    await this.requireTenant(userId, value.tenantId);
    const partyResult = await this.client
      .from("invoicing_parties")
      .insert({
        organization_id: value.tenantId,
        party_kind: value.kind,
        roles: value.roles,
        legal_name: value.legalName,
        trading_name: value.tradingName ?? null,
        billing_address_line_1: value.billingAddress.line1,
        billing_address_line_2: value.billingAddress.line2 ?? null,
        billing_postal_code: value.billingAddress.postalCode,
        billing_city: value.billingAddress.city,
        billing_country_code: value.billingAddress.countryCode,
        email: value.email ?? null,
        phone: value.phone ?? null,
        locale: value.locale,
        preferred_currency: value.preferredCurrency,
        payment_terms_days: value.paymentTermsDays,
      })
      .select("*")
      .single();
    if (partyResult.error)
      databaseFailure("invoicing.createParty", partyResult.error);
    if (value.identifiers.length) {
      const identifiers = await this.client
        .from("invoicing_party_identifiers")
        .insert(
          value.identifiers.map((identifier) => ({
            party_id: partyResult.data.id,
            identifier_type: identifier.type,
            country_code: identifier.countryCode,
            identifier_value: identifier.value,
            issuing_authority: identifier.issuingAuthority ?? null,
          })),
        );
      if (identifiers.error)
        databaseFailure("invoicing.createPartyIdentifiers", identifiers.error);
    }
    const identifierRows = await this.identifiersForParties([
      partyResult.data.id,
    ]);
    return mapParty(partyResult.data, identifierRows);
  }

  async getLegalEntity(
    userId: string,
    legalEntityId: string,
  ): Promise<InvoicingLegalEntity | null> {
    const result = await this.client
      .from("invoicing_legal_entities")
      .select("*")
      .eq("id", legalEntityId)
      .maybeSingle();
    if (result.error) databaseFailure("invoicing.getLegalEntity", result.error);
    if (!result.data) return null;
    await this.requireTenant(userId, result.data.organization_id);
    const identifiers = await this.identifiersForEntities([result.data.id]);
    return mapLegalEntity(result.data, identifiers);
  }

  async getParty(
    userId: string,
    partyId: string,
  ): Promise<InvoicingParty | null> {
    const result = await this.client
      .from("invoicing_parties")
      .select("*")
      .eq("id", partyId)
      .maybeSingle();
    if (result.error) databaseFailure("invoicing.getParty", result.error);
    if (!result.data) return null;
    await this.requireTenant(userId, result.data.organization_id);
    const identifiers = await this.identifiersForParties([result.data.id]);
    return mapParty(result.data, identifiers);
  }

  private async hydrateInvoices(rows: readonly InvoiceRow[]) {
    if (!rows.length) return [];
    const ids = rows.map((row) => row.id);
    const [lineResult, taxResult] = await Promise.all([
      this.client
        .from("invoicing_invoice_lines")
        .select("*")
        .in("invoice_id", ids)
        .order("position", { ascending: true }),
      this.client
        .from("invoicing_tax_breakdowns")
        .select("*")
        .in("invoice_id", ids),
    ]);
    if (lineResult.error)
      databaseFailure("invoicing.listInvoiceLines", lineResult.error);
    if (taxResult.error)
      databaseFailure("invoicing.listTaxBreakdowns", taxResult.error);
    return rows.map((row) => mapInvoice(row, lineResult.data, taxResult.data));
  }

  async listInvoices(
    userId: string,
    tenantId: string,
    marketCode: string,
    limit: number,
    cursor?: string,
  ): Promise<InvoicingInvoicePage> {
    await this.requireTenant(userId, tenantId);
    let query = this.client
      .from("invoicing_invoices")
      .select("*")
      .eq("organization_id", tenantId)
      .eq("market_code", marketCode)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1);
    if (cursor) query = query.lt("id", cursor);
    const result = await query;
    if (result.error) databaseFailure("invoicing.listInvoices", result.error);
    const hasNextPage = result.data.length > limit;
    const rows = result.data.slice(0, limit);
    const items = await this.hydrateInvoices(rows);
    return {
      items,
      pageInfo: {
        hasNextPage,
        nextCursor: hasNextPage ? rows.at(-1)?.id : undefined,
      },
    };
  }

  async getInvoice(
    userId: string,
    invoiceId: string,
  ): Promise<InvoicingInvoice | null> {
    const result = await this.client
      .from("invoicing_invoices")
      .select("*")
      .eq("id", invoiceId)
      .maybeSingle();
    if (result.error) databaseFailure("invoicing.getInvoice", result.error);
    if (!result.data) return null;
    await this.requireTenant(userId, result.data.organization_id);
    return (await this.hydrateInvoices([result.data]))[0] ?? null;
  }

  async createInvoice(
    userId: string,
    record: CreateInvoiceRecord,
  ): Promise<InvoicingInvoice> {
    const value = record.invoice;
    await this.requireTenant(userId, value.tenantId);
    const existing = await this.client
      .from("invoicing_invoices")
      .select("*")
      .eq("organization_id", value.tenantId)
      .eq("market_code", value.marketCode)
      .eq("environment_id", config.environment.environment)
      .eq("draft_idempotency_key", record.idempotencyKey)
      .maybeSingle();
    if (existing.error)
      databaseFailure("invoicing.getDraftByIdempotency", existing.error);
    if (existing.data) return (await this.hydrateInvoices([existing.data]))[0];

    const inserted = await this.client
      .from("invoicing_invoices")
      .insert({
        id: value.id,
        organization_id: value.tenantId,
        legal_entity_id: value.legalEntityId,
        customer_party_id: value.customerPartyId,
        related_invoice_id: value.relatedInvoiceId ?? null,
        document_type: value.documentType,
        document_origin: value.origin,
        market_code: value.marketCode,
        country_code: value.countryCode,
        locale: value.locale,
        timezone: value.timezone,
        environment_id: config.environment.environment,
        currency: value.currency,
        issue_date: value.issueDate,
        due_date: value.dueDate,
        service_period_start: value.servicePeriodStart ?? null,
        service_period_end: value.servicePeriodEnd ?? null,
        purchase_order_reference: value.purchaseOrderReference ?? null,
        customer_reference: value.customerReference ?? null,
        notes: value.notes ?? null,
        commercial_state: value.commercialState,
        electronic_state: value.electronicState,
        subtotal_minor: value.subtotal.amountMinor,
        tax_total_minor: value.taxTotal.amountMinor,
        total_minor: value.total.amountMinor,
        outstanding_minor: value.outstanding.amountMinor,
        version: value.version,
        draft_idempotency_key: record.idempotencyKey,
        created_by: userId,
        created_at: value.createdAt,
        updated_at: value.updatedAt,
      })
      .select("*")
      .single();
    if (inserted.error)
      databaseFailure("invoicing.createInvoice", inserted.error);

    try {
      const lines = await this.client.from("invoicing_invoice_lines").insert(
        value.lines.map((line) => ({
          id: line.id,
          invoice_id: value.id,
          position: line.position,
          description: line.description,
          quantity_decimal: line.quantity,
          unit: line.unit,
          unit_price_minor_decimal: line.unitPriceMinorDecimal,
          tax_rate_bps: line.taxRateBps,
          tax_category: line.taxCategory,
          exemption_reason_code: line.exemptionReasonCode ?? null,
          exemption_reason: line.exemptionReason ?? null,
          net_amount_minor: line.netAmountMinor,
          tax_amount_minor: line.taxAmountMinor,
          gross_amount_minor: line.grossAmountMinor,
        })),
      );
      if (lines.error) throw lines.error;
      const taxes = await this.client.from("invoicing_tax_breakdowns").insert(
        value.taxBreakdowns.map((tax) => ({
          invoice_id: value.id,
          tax_rate_bps: tax.taxRateBps,
          tax_category: tax.taxCategory,
          taxable_amount_minor: tax.taxableAmountMinor,
          tax_amount_minor: tax.taxAmountMinor,
        })),
      );
      if (taxes.error) throw taxes.error;

      await this.client.from("invoicing_number_series").upsert(
        {
          organization_id: value.tenantId,
          legal_entity_id: value.legalEntityId,
          market_code: value.marketCode,
          environment_id: config.environment.environment,
          document_type: value.documentType,
          fiscal_year: Number(value.issueDate.slice(0, 4)),
          prefix: value.documentType === "credit_note" ? "AVOIR" : "FAC",
          review_status: "unreviewed",
        },
        {
          onConflict:
            "organization_id,legal_entity_id,market_code,environment_id,document_type,fiscal_year",
          ignoreDuplicates: true,
        },
      );
      const correlationId = randomUUID();
      const outbox = await this.client.from("invoicing_outbox").insert({
        organization_id: value.tenantId,
        legal_entity_id: value.legalEntityId,
        invoice_id: value.id,
        market_code: value.marketCode,
        country_code: value.countryCode,
        environment_id: config.environment.environment,
        event_type:
          value.documentType === "credit_note"
            ? "CreditNoteDraftCreated"
            : "InvoiceDraftCreated",
        idempotency_key: record.idempotencyKey,
        correlation_id: correlationId,
        payload: {
          invoiceId: value.id,
          marketCode: value.marketCode,
          countryCode: value.countryCode,
          currency: value.currency,
          environmentId: config.environment.environment,
        },
      });
      if (outbox.error) throw outbox.error;
      const audit = await this.client.from("invoicing_audit_events").insert({
        organization_id: value.tenantId,
        legal_entity_id: value.legalEntityId,
        invoice_id: value.id,
        market_code: value.marketCode,
        country_code: value.countryCode,
        environment_id: config.environment.environment,
        actor_id: userId,
        action:
          value.documentType === "credit_note"
            ? "credit_note.draft_created"
            : "invoice.draft_created",
        resource_type: "invoice",
        resource_id: value.id,
        request_id: record.requestId ?? null,
        correlation_id: correlationId,
        reason_code: "user_requested",
        safe_metadata: {
          documentType: value.documentType,
          currency: value.currency,
          lineCount: value.lines.length,
        },
      });
      if (audit.error) throw audit.error;
    } catch (error) {
      await this.client
        .from("invoicing_tax_breakdowns")
        .delete()
        .eq("invoice_id", value.id);
      await this.client
        .from("invoicing_invoice_lines")
        .delete()
        .eq("invoice_id", value.id);
      await this.client.from("invoicing_invoices").delete().eq("id", value.id);
      databaseFailure("invoicing.createInvoiceChildren", error);
    }

    return (await this.hydrateInvoices([inserted.data]))[0];
  }

  async updateInvoiceDraft(
    userId: string,
    record: UpdateInvoiceDraftRecord,
  ): Promise<InvoicingInvoice> {
    await this.requireTenant(userId, record.invoice.tenantId);
    const value = record.invoice;
    const result = await this.client.rpc("update_invoicing_invoice_draft", {
      p_invoice_id: value.id,
      p_actor_id: record.actorId,
      p_expected_version: record.expectedVersion,
      p_invoice: {
        customerPartyId: value.customerPartyId,
        issueDate: value.issueDate,
        dueDate: value.dueDate,
        servicePeriodStart: value.servicePeriodStart ?? null,
        servicePeriodEnd: value.servicePeriodEnd ?? null,
        purchaseOrderReference: value.purchaseOrderReference ?? null,
        customerReference: value.customerReference ?? null,
        notes: value.notes ?? null,
        subtotalMinor: value.subtotal.amountMinor,
        taxTotalMinor: value.taxTotal.amountMinor,
        totalMinor: value.total.amountMinor,
        lines: value.lines,
        taxBreakdowns: value.taxBreakdowns,
      },
      p_request_id: record.requestId ?? null,
    });
    if (result.error) {
      const message = result.error.message ?? "";
      if (message.includes("invoice_not_found")) {
        throw new AppError({
          code: "NOT_FOUND",
          message: "Facture introuvable.",
        });
      }
      if (
        message.includes("version_conflict") ||
        message.includes("invoice_not_editable")
      ) {
        throw new AppError({
          code: "CONFLICT",
          message: "La facture a changé ou ne peut plus être modifiée.",
        });
      }
      databaseFailure("invoicing.updateInvoiceDraft", result.error);
    }
    return (await this.hydrateInvoices([result.data]))[0];
  }

  async finalizeInvoice(
    record: FinalizeInvoiceRecord,
  ): Promise<InvoicingInvoice> {
    const result = await this.client.rpc("finalize_invoicing_invoice", {
      p_invoice_id: record.invoiceId,
      p_actor_id: record.actorId,
      p_expected_version: record.expectedVersion,
      p_idempotency_key: record.idempotencyKey,
      p_request_id: record.requestId ?? null,
    });
    if (result.error) {
      const message = result.error.message ?? "";
      if (message.includes("invoice_not_found")) {
        throw new AppError({
          code: "NOT_FOUND",
          message: "Facture introuvable.",
        });
      }
      if (
        message.includes("version_conflict") ||
        message.includes("already_finalized")
      ) {
        throw new AppError({
          code: "CONFLICT",
          message: "La facture a changé ou a déjà été finalisée.",
        });
      }
      if (
        message.includes("credit_note_exceeds_original") ||
        message.includes("credit_note_original")
      ) {
        throw new AppError({
          code: "CONFLICT",
          message:
            "L’avoir ne correspond pas à une facture finalisée ou dépasse son solde disponible.",
        });
      }
      if (message.includes("number_series")) {
        throw new AppError({
          code: "CONFLICT",
          message:
            "La série de numérotation n’est pas configurée ou approuvée.",
          details: { gate: "NUMBER_SERIES_CONFIGURATION_REQUIRED" },
        });
      }
      databaseFailure("invoicing.finalizeInvoice", result.error);
    }
    return (await this.hydrateInvoices([result.data]))[0];
  }

  async getDocument(
    userId: string,
    invoiceId: string,
  ): Promise<InvoicingDocument | null> {
    const invoice = await this.getInvoice(userId, invoiceId);
    if (!invoice) return null;
    const result = await this.client
      .from("invoicing_documents")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (result.error) databaseFailure("invoicing.getDocument", result.error);
    if (!result.data) return null;
    if (!result.data.content_text) {
      throw new AppError({
        code: "CONFLICT",
        message:
          "Le document privé doit être récupéré par le service de stockage.",
        details: { gate: "PRIVATE_STORAGE_DOWNLOAD_REQUIRED" },
      });
    }
    return {
      id: result.data.id,
      invoiceId: result.data.invoice_id,
      fileName: result.data.file_name,
      mediaType: result.data.media_type,
      format: result.data.document_format,
      legalOriginal: result.data.legal_original,
      digestAlgorithm: result.data.digest_algorithm,
      digest: result.data.digest,
      generatorVersion: result.data.generator_version,
      templateVersion: result.data.template_version,
      complianceRulesetVersion: result.data.compliance_ruleset_version,
      generatedAt: result.data.generated_at,
      content: result.data.content_text,
    };
  }
}
