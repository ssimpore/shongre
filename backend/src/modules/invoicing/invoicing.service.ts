import { randomUUID } from "node:crypto";
import {
  bootstrapInvoicingLegalEntitySchema,
  createInvoicingInvoiceSchema,
  createInvoicingLegalEntitySchema,
  createInvoicingPartySchema,
  finalizeInvoicingInvoiceSchema,
  getCountryConfig,
  invoicingDocumentSchema,
  invoicingInvoicePageSchema,
  invoicingInvoiceSchema,
  invoicingLegalEntitySchema,
  invoicingPartySchema,
  invoicingWorkspaceSchema,
  updateInvoicingInvoiceDraftSchema,
  type InvoicingInvoice,
} from "@shongre/contracts";
import { config } from "../../app/config/index.js";
import {
  DemoInvoicingRepository,
  type InvoicingRepository,
  PostgresInvoicingRepository,
} from "../../infrastructure/database/repositories/invoicing.repository.js";
import type { Principal } from "../../shared/auth/principal.js";
import { requirePermission } from "../../shared/auth/principal.js";
import { AppError } from "../../shared/errors/app-error.js";
import {
  calculateInvoiceLines,
  InvoicingCalculationError,
} from "./exact-money.js";

const DEMO_TIME = "2026-08-28T09:00:00.000Z";

function resolvedExternalInput(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && value !== "UNSET" ? value : undefined;
}

function marketOrThrow(marketCode: string) {
  const market = getCountryConfig(marketCode);
  if (!market) {
    throw new AppError({
      code: "NOT_FOUND",
      message: "Marché de facturation introuvable.",
    });
  }
  return market;
}

function requireOperationalMarket(marketCode: string) {
  const market = marketOrThrow(marketCode);
  if (
    !market.enabled ||
    !["active", "beta", "private_beta"].includes(market.launchStatus)
  ) {
    throw new AppError({
      code: "CONFLICT",
      message: "La facturation n’est pas disponible sur ce marché.",
      details: {
        gate: "INVOICING_MARKET_NOT_AVAILABLE",
        marketCode,
        launchStatus: market.launchStatus,
      },
    });
  }
  return market;
}

export class InvoicingService {
  constructor(
    private readonly repository: InvoicingRepository = config.dataMode ===
    "database"
      ? new PostgresInvoicingRepository()
      : new DemoInvoicingRepository(),
    private readonly now: () => Date = () =>
      config.dataMode === "demo" ? new Date(DEMO_TIME) : new Date(),
  ) {}

  /** Product-shell projection; repository/RLS still enforce every operation. */
  async productAccessForUser(userId: string) {
    return (await this.repository.listTenants(userId)).map(
      (tenant) => tenant.productAccess,
    );
  }

  async hasProductAccessForUser(userId: string): Promise<boolean> {
    return (await this.productAccessForUser(userId)).length > 0;
  }

  private async entitledTenants(principal: Principal) {
    const tenants = await this.repository.listTenants(principal.userId);
    if (!tenants.length) {
      throw new AppError({
        code: "FORBIDDEN",
        message:
          "Shongre Facturation n’est pas activé pour cette organisation.",
        details: { gate: "INVOICING_ENTITLEMENT_REQUIRED" },
      });
    }
    return tenants;
  }

  private async requireEntitledTenant(principal: Principal, tenantId: string) {
    const tenants = await this.entitledTenants(principal);
    if (!tenants.some((tenant) => tenant.id === tenantId)) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Espace de facturation introuvable.",
      });
    }
    return tenants;
  }

  async getWorkspace(principal: Principal, marketCode: string) {
    requirePermission(principal, "invoice.read");
    const market = marketOrThrow(marketCode);
    const tenants = await this.entitledTenants(principal);
    const legalEntities = await this.repository.listLegalEntities(
      principal.userId,
      marketCode,
    );
    const recentPages = await Promise.all(
      tenants.map((tenant) =>
        this.repository.listInvoices(
          principal.userId,
          tenant.id,
          marketCode,
          5,
        ),
      ),
    );
    const approvedPlatform = resolvedExternalInput("TARGET_APPROVED_PLATFORM");
    const sandboxReference = resolvedExternalInput(
      "TARGET_APPROVED_PLATFORM_SANDBOX_CREDENTIAL_REFERENCE",
    );
    const productionReference = resolvedExternalInput(
      "TARGET_APPROVED_PLATFORM_PRODUCTION_CREDENTIAL_REFERENCE",
    );
    const legalReviewOwner = resolvedExternalInput(
      "LEGAL_AND_ACCOUNTING_REVIEW_OWNER",
    );
    const issuerEntity = resolvedExternalInput("SHONGRE_ISSUER_LEGAL_ENTITY");

    return invoicingWorkspaceSchema.parse({
      scope: "MULTI_MARKET_SHARED",
      activeMarketCode: marketCode,
      tenants,
      legalEntities,
      recentInvoices: recentPages
        .flatMap((page) => page.items)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .slice(0, 8),
      readiness: [
        {
          key: "market",
          label: "Marché disponible",
          status: ["active", "beta", "private_beta"].includes(
            market.launchStatus,
          )
            ? "configured"
            : "missing",
          blocking: !["active", "beta", "private_beta"].includes(
            market.launchStatus,
          ),
        },
        {
          key: "legal_entity",
          label: "Entité juridique configurée",
          status: legalEntities.length ? "configured" : "missing",
          blocking: legalEntities.length === 0,
        },
        {
          key: "issuer",
          label: "Émetteur Shongre approuvé",
          status: issuerEntity ? "configured" : "missing",
          blocking: true,
        },
        {
          key: "provider",
          label: "Plateforme agréée sélectionnée et testée",
          status:
            approvedPlatform && sandboxReference ? "configured" : "missing",
          blocking: true,
        },
        {
          key: "legal_review",
          label: "Revue juridique et comptable",
          status: legalReviewOwner ? "configured" : "missing",
          blocking: true,
        },
        {
          key: "production_transport",
          label: "Transport électronique de production certifié",
          status: productionReference ? "configured" : "missing",
          blocking: true,
        },
      ],
      electronicTransport: {
        mode: "COMPATIBLE_SOLUTION",
        status:
          approvedPlatform && sandboxReference
            ? "SANDBOX_ONLY"
            : market.launchStatus === "coming_soon"
              ? "COMING_SOON"
              : "CONFIGURATION_REQUIRED",
        providerId: approvedPlatform,
      },
    });
  }

  async listLegalEntities(
    principal: Principal,
    marketCode?: string,
    tenantId?: string,
  ) {
    requirePermission(principal, "invoice.read");
    if (marketCode) marketOrThrow(marketCode);
    const tenants = tenantId
      ? await this.requireEntitledTenant(principal, tenantId)
      : await this.entitledTenants(principal);
    if (tenantId) {
      if (!tenants.some((tenant) => tenant.id === tenantId)) {
        throw new AppError({
          code: "NOT_FOUND",
          message: "Espace de facturation introuvable.",
        });
      }
    }
    const entities = await this.repository.listLegalEntities(
      principal.userId,
      marketCode,
    );
    return Promise.all(
      entities
        .filter((entity) => !tenantId || entity.tenantId === tenantId)
        .map(async (entity) => invoicingLegalEntitySchema.parse(entity)),
    );
  }

  async createLegalEntity(principal: Principal, input: unknown) {
    requirePermission(principal, "invoicing.tenant.manage");
    const value = createInvoicingLegalEntitySchema.parse(input);
    await this.requireEntitledTenant(principal, value.tenantId);
    const market = requireOperationalMarket(value.defaultMarketCode);
    if (
      value.countryCode !== market.countryCode ||
      value.registeredAddress.countryCode !== value.countryCode ||
      value.defaultCurrency !== market.currency ||
      !market.supportedLocales.includes(value.defaultLocale) ||
      value.timezone !== market.timezone
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "L’entité juridique ne correspond pas au contexte du marché.",
        details: { gate: "LEGAL_ENTITY_MARKET_CONTEXT_MISMATCH" },
      });
    }
    return invoicingLegalEntitySchema.parse(
      await this.repository.createLegalEntity(principal.userId, value),
    );
  }

  async bootstrapLegalEntityFromOrganization(
    principal: Principal,
    input: unknown,
  ) {
    requirePermission(principal, "invoicing.tenant.manage");
    const value = bootstrapInvoicingLegalEntitySchema.parse(input);
    await this.requireEntitledTenant(principal, value.tenantId);
    const market = requireOperationalMarket(value.marketCode);
    return invoicingLegalEntitySchema.parse(
      await this.repository.bootstrapLegalEntityFromOrganization(
        principal.userId,
        {
          tenantId: value.tenantId,
          marketCode: value.marketCode,
          currency: market.currency,
          locale: market.defaultLocale,
          timezone: market.timezone,
        },
      ),
    );
  }

  async listParties(
    principal: Principal,
    tenantId: string,
    role?: "customer" | "supplier",
  ) {
    requirePermission(principal, "invoice.read");
    await this.requireEntitledTenant(principal, tenantId);
    return Promise.all(
      (await this.repository.listParties(principal.userId, tenantId, role)).map(
        async (party) => invoicingPartySchema.parse(party),
      ),
    );
  }

  async createParty(principal: Principal, input: unknown) {
    requirePermission(principal, "invoice.party.manage");
    const value = createInvoicingPartySchema.parse(input);
    await this.requireEntitledTenant(principal, value.tenantId);
    if (!getCountryConfig(value.billingAddress.countryCode)) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Le pays de l’adresse de facturation est inconnu.",
      });
    }
    return invoicingPartySchema.parse(
      await this.repository.createParty(principal.userId, value),
    );
  }

  async listInvoices(
    principal: Principal,
    options: {
      tenantId: string;
      marketCode: string;
      limit?: number;
      cursor?: string;
    },
  ) {
    requirePermission(principal, "invoice.read");
    marketOrThrow(options.marketCode);
    await this.requireEntitledTenant(principal, options.tenantId);
    const limit = options.limit ?? 25;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "La limite doit être comprise entre 1 et 100.",
      });
    }
    return invoicingInvoicePageSchema.parse(
      await this.repository.listInvoices(
        principal.userId,
        options.tenantId,
        options.marketCode,
        limit,
        options.cursor,
      ),
    );
  }

  async getInvoice(principal: Principal, invoiceId: string) {
    requirePermission(principal, "invoice.read");
    const invoice = await this.repository.getInvoice(
      principal.userId,
      invoiceId,
    );
    if (!invoice) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Facture introuvable.",
      });
    }
    await this.requireEntitledTenant(principal, invoice.tenantId);
    return invoicingInvoiceSchema.parse(invoice);
  }

  async createInvoice(
    principal: Principal,
    input: unknown,
    idempotencyKey: string | undefined,
    requestId?: string,
  ) {
    requirePermission(principal, "invoice.create");
    if (!idempotencyKey || idempotencyKey.length < 8) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Une clé d’idempotence d’au moins 8 caractères est requise.",
      });
    }
    const value = createInvoicingInvoiceSchema.parse(input);
    await this.requireEntitledTenant(principal, value.tenantId);
    const market = requireOperationalMarket(value.marketCode);
    if (!["standard_invoice", "credit_note"].includes(value.documentType)) {
      throw new AppError({
        code: "CONFLICT",
        message: "Ce type de document n’est pas encore disponible.",
        details: {
          gate: "INVOICE_DOCUMENT_TYPE_NOT_IMPLEMENTED",
          documentType: value.documentType,
        },
      });
    }
    if (
      value.countryCode !== market.countryCode ||
      value.currency !== market.currency ||
      !market.supportedLocales.includes(value.locale) ||
      value.timezone !== market.timezone
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "La facture ne correspond pas au contexte du marché.",
        details: { gate: "INVOICE_MARKET_CONTEXT_MISMATCH" },
      });
    }
    const [entity, customer] = await Promise.all([
      this.repository.getLegalEntity(principal.userId, value.legalEntityId),
      this.repository.getParty(principal.userId, value.customerPartyId),
    ]);
    if (
      !entity ||
      !customer ||
      entity.tenantId !== value.tenantId ||
      customer.tenantId !== value.tenantId
    ) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Ressource introuvable.",
      });
    }
    if (!customer.roles.includes("customer")) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Le destinataire n’est pas configuré comme client.",
      });
    }
    if (
      entity.defaultMarketCode !== value.marketCode ||
      entity.countryCode !== value.countryCode ||
      entity.defaultCurrency !== value.currency
    ) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "L’émetteur ne correspond pas au marché ou à la devise.",
        details: { gate: "ISSUER_MARKET_CONTEXT_MISMATCH" },
      });
    }

    let calculated: ReturnType<typeof calculateInvoiceLines>;
    try {
      calculated = calculateInvoiceLines(value.lines, () => randomUUID());
    } catch (error) {
      if (error instanceof InvoicingCalculationError) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: error.message,
        });
      }
      throw error;
    }

    if (value.documentType === "credit_note") {
      const original = value.relatedInvoiceId
        ? await this.repository.getInvoice(
            principal.userId,
            value.relatedInvoiceId,
          )
        : null;
      if (
        !original ||
        !["FINALIZED", "CREDITED"].includes(original.commercialState) ||
        original.documentType === "credit_note" ||
        original.tenantId !== value.tenantId ||
        original.legalEntityId !== value.legalEntityId ||
        original.customerPartyId !== value.customerPartyId ||
        original.marketCode !== value.marketCode ||
        original.currency !== value.currency
      ) {
        throw new AppError({
          code: "NOT_FOUND",
          message: "Facture d’origine introuvable.",
        });
      }
      if (calculated.totalMinor > original.total.amountMinor) {
        throw new AppError({
          code: "CONFLICT",
          message: "L’avoir dépasse le total de la facture d’origine.",
        });
      }
    }

    const now = this.now().toISOString();
    const invoice: InvoicingInvoice = {
      id: randomUUID(),
      tenantId: value.tenantId,
      legalEntityId: value.legalEntityId,
      customerPartyId: value.customerPartyId,
      scope: "MARKET_SCOPED",
      documentType: value.documentType,
      origin: value.origin,
      relatedInvoiceId: value.relatedInvoiceId,
      marketCode: value.marketCode,
      countryCode: value.countryCode,
      locale: value.locale,
      timezone: value.timezone,
      currency: value.currency,
      issueDate: value.issueDate,
      dueDate: value.dueDate,
      servicePeriodStart: value.servicePeriodStart,
      servicePeriodEnd: value.servicePeriodEnd,
      purchaseOrderReference: value.purchaseOrderReference,
      customerReference: value.customerReference,
      notes: value.notes,
      commercialState: "READY_TO_FINALIZE",
      electronicState: "NOT_REQUESTED",
      paymentState: "UNPAID",
      accountingExportState: "NOT_EXPORTED",
      customerReviewState: "NOT_REQUESTED",
      lines: calculated.lines,
      taxBreakdowns: calculated.taxBreakdowns,
      subtotal: {
        amountMinor: calculated.subtotalMinor,
        currency: value.currency,
      },
      taxTotal: {
        amountMinor: calculated.taxTotalMinor,
        currency: value.currency,
      },
      total: {
        amountMinor: calculated.totalMinor,
        currency: value.currency,
      },
      outstanding: {
        amountMinor: calculated.totalMinor,
        currency: value.currency,
      },
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    return invoicingInvoiceSchema.parse(
      await this.repository.createInvoice(principal.userId, {
        invoice,
        idempotencyKey,
        requestId,
      }),
    );
  }

  async finalizeInvoice(
    principal: Principal,
    invoiceId: string,
    input: unknown,
    requestId?: string,
  ) {
    requirePermission(principal, "invoice.finalize");
    const value = finalizeInvoicingInvoiceSchema.parse(input);
    const current = await this.getInvoice(principal, invoiceId);
    requireOperationalMarket(current.marketCode);
    return invoicingInvoiceSchema.parse(
      await this.repository.finalizeInvoice({
        invoiceId,
        actorId: principal.userId,
        expectedVersion: value.expectedVersion,
        idempotencyKey: value.idempotencyKey,
        requestId,
      }),
    );
  }

  async updateInvoiceDraft(
    principal: Principal,
    invoiceId: string,
    input: unknown,
    requestId?: string,
  ) {
    requirePermission(principal, "invoice.create");
    const value = updateInvoicingInvoiceDraftSchema.parse(input);
    const current = await this.getInvoice(principal, invoiceId);
    if (
      !current ||
      !["DRAFT", "READY_TO_FINALIZE"].includes(current.commercialState)
    ) {
      throw new AppError({
        code: "CONFLICT",
        message: "Une facture finalisée ne peut plus être modifiée.",
      });
    }
    if (current.version !== value.expectedVersion) {
      throw new AppError({
        code: "CONFLICT",
        message: "La facture a été modifiée. Rechargez-la avant de continuer.",
      });
    }
    const customer = await this.repository.getParty(
      principal.userId,
      value.customerPartyId,
    );
    if (
      !customer ||
      customer.tenantId !== current.tenantId ||
      !customer.roles.includes("customer")
    ) {
      throw new AppError({ code: "NOT_FOUND", message: "Client introuvable." });
    }

    let calculated: ReturnType<typeof calculateInvoiceLines>;
    try {
      calculated = calculateInvoiceLines(value.lines, () => randomUUID());
    } catch (error) {
      if (error instanceof InvoicingCalculationError) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: error.message,
        });
      }
      throw error;
    }
    const updatedAt = this.now().toISOString();
    const next: InvoicingInvoice = {
      ...current,
      customerPartyId: value.customerPartyId,
      issueDate: value.issueDate,
      dueDate: value.dueDate,
      servicePeriodStart: value.servicePeriodStart,
      servicePeriodEnd: value.servicePeriodEnd,
      purchaseOrderReference: value.purchaseOrderReference,
      customerReference: value.customerReference,
      notes: value.notes,
      commercialState: "READY_TO_FINALIZE",
      lines: calculated.lines,
      taxBreakdowns: calculated.taxBreakdowns,
      subtotal: {
        amountMinor: calculated.subtotalMinor,
        currency: current.currency,
      },
      taxTotal: {
        amountMinor: calculated.taxTotalMinor,
        currency: current.currency,
      },
      total: {
        amountMinor: calculated.totalMinor,
        currency: current.currency,
      },
      outstanding: {
        amountMinor: calculated.totalMinor,
        currency: current.currency,
      },
      updatedAt,
    };
    return invoicingInvoiceSchema.parse(
      await this.repository.updateInvoiceDraft(principal.userId, {
        invoice: next,
        actorId: principal.userId,
        expectedVersion: value.expectedVersion,
        requestId,
      }),
    );
  }

  async getDocument(principal: Principal, invoiceId: string) {
    requirePermission(principal, "invoice.read");
    await this.getInvoice(principal, invoiceId);
    const document = await this.repository.getDocument(
      principal.userId,
      invoiceId,
    );
    if (!document) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Document introuvable.",
      });
    }
    return invoicingDocumentSchema.parse(document);
  }
}

export const invoicingService = new InvoicingService();
