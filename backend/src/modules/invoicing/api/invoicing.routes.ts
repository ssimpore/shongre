import {
  type RouteRegistrar,
  permission,
} from "../../../api/v1/route-contract.js";
import { invoicingService } from "../invoicing.service.js";
import { requireApiRequestMarket } from "../../markets/request-market-context.js";
import { AppError } from "../../../shared/errors/app-error.js";

export function registerInvoicingRoutes(routes: RouteRegistrar): void {
  routes.addRoute(
    "POST",
    "/invoicing/activation",
    permission("subscription.manage.own"),
    async ({ principal, marketCode }) => {
      const workspace = await invoicingService.getWorkspace(
        principal,
        requireApiRequestMarket(marketCode),
      );
      const access = workspace.tenants[0]?.productAccess;
      if (!access) {
        throw new AppError({
          code: "FORBIDDEN",
          message: "Un droit actif Shongre Facturation est requis.",
        });
      }
      return access;
    },
  );
  routes.addRoute(
    "GET",
    "/invoicing/workspace",
    permission("invoice.read"),
    async ({ principal, marketCode }) =>
      invoicingService.getWorkspace(
        principal,
        requireApiRequestMarket(marketCode),
      ),
  );
  routes.addRoute(
    "GET",
    "/invoicing/legal-entities",
    permission("invoice.read"),
    async ({ principal, marketCode, query }) =>
      invoicingService.listLegalEntities(
        principal,
        requireApiRequestMarket(marketCode),
        query.get("tenantId") ?? "",
      ),
  );
  routes.addRoute(
    "POST",
    "/invoicing/legal-entities",
    permission("invoicing.tenant.manage"),
    async ({ principal, marketCode, body }) => {
      const activeMarket = requireApiRequestMarket(marketCode);
      if (body?.defaultMarketCode !== activeMarket) {
        throw new AppError({
          code: "CONFLICT",
          message: "Le marché de l’entité ne correspond pas à la requête.",
        });
      }
      return invoicingService.createLegalEntity(principal, body);
    },
  );
  routes.addRoute(
    "POST",
    "/invoicing/legal-entities/from-organization",
    permission("invoicing.tenant.manage"),
    async ({ principal, marketCode, body }) => {
      const activeMarket = requireApiRequestMarket(marketCode);
      if (body?.marketCode !== activeMarket) {
        throw new AppError({
          code: "CONFLICT",
          message: "Le marché de l’entité ne correspond pas à la requête.",
        });
      }
      return invoicingService.bootstrapLegalEntityFromOrganization(
        principal,
        body,
      );
    },
  );
  routes.addRoute(
    "GET",
    "/invoicing/parties",
    permission("invoice.read"),
    async ({ principal, marketCode, query }) => {
      requireApiRequestMarket(marketCode);
      return invoicingService.listParties(
        principal,
        query.get("tenantId") ?? "",
      );
    },
  );
  routes.addRoute(
    "POST",
    "/invoicing/parties",
    permission("invoice.party.manage"),
    async ({ principal, marketCode, body }) => {
      requireApiRequestMarket(marketCode);
      return invoicingService.createParty(principal, body);
    },
  );
  routes.addRoute(
    "GET",
    "/invoicing/invoices",
    permission("invoice.read"),
    async ({ principal, marketCode, query }) =>
      invoicingService.listInvoices(principal, {
        tenantId: query.get("tenantId") ?? "",
        marketCode: requireApiRequestMarket(marketCode),
        limit: query.has("limit") ? Number(query.get("limit")) : undefined,
        cursor: query.get("cursor") ?? undefined,
      }),
  );
  routes.addRoute(
    "POST",
    "/invoicing/invoices",
    permission("invoice.create"),
    async ({ principal, marketCode, body, req, requestId }) => {
      const activeMarket = requireApiRequestMarket(marketCode);
      if (body?.marketCode !== activeMarket) {
        throw new AppError({
          code: "CONFLICT",
          message: "Le marché de la facture ne correspond pas à la requête.",
        });
      }
      return invoicingService.createInvoice(
        principal,
        body,
        String(req.headers["idempotency-key"] ?? ""),
        requestId,
      );
    },
  );
  routes.addRoute(
    "GET",
    "/invoicing/invoices/:invoiceId",
    permission("invoice.read"),
    async ({ principal, marketCode, params }) => {
      const activeMarket = requireApiRequestMarket(marketCode);
      const invoice = await invoicingService.getInvoice(
        principal,
        params.invoiceId,
      );
      if (invoice.marketCode !== activeMarket) {
        throw new AppError({
          code: "NOT_FOUND",
          message: "Facture introuvable.",
        });
      }
      return invoice;
    },
  );
  routes.addRoute(
    "PUT",
    "/invoicing/invoices/:invoiceId",
    permission("invoice.create"),
    async ({ principal, marketCode, params, body, requestId }) => {
      const activeMarket = requireApiRequestMarket(marketCode);
      const invoice = await invoicingService.getInvoice(
        principal,
        params.invoiceId,
      );
      if (invoice.marketCode !== activeMarket) {
        throw new AppError({
          code: "NOT_FOUND",
          message: "Facture introuvable.",
        });
      }
      return invoicingService.updateInvoiceDraft(
        principal,
        params.invoiceId,
        body,
        requestId,
      );
    },
  );
  routes.addRoute(
    "POST",
    "/invoicing/invoices/:invoiceId/finalize",
    permission("invoice.finalize"),
    async ({ principal, marketCode, params, body, req, requestId }) => {
      const activeMarket = requireApiRequestMarket(marketCode);
      const invoice = await invoicingService.getInvoice(
        principal,
        params.invoiceId,
      );
      if (invoice.marketCode !== activeMarket) {
        throw new AppError({
          code: "NOT_FOUND",
          message: "Facture introuvable.",
        });
      }
      return invoicingService.finalizeInvoice(
        principal,
        params.invoiceId,
        {
          expectedVersion: body?.expectedVersion,
          idempotencyKey: String(req.headers["idempotency-key"] ?? ""),
        },
        requestId,
      );
    },
  );
  routes.addRoute(
    "GET",
    "/invoicing/invoices/:invoiceId/document",
    permission("invoice.read"),
    async ({ principal, marketCode, params }) => {
      const activeMarket = requireApiRequestMarket(marketCode);
      const invoice = await invoicingService.getInvoice(
        principal,
        params.invoiceId,
      );
      if (invoice.marketCode !== activeMarket) {
        throw new AppError({
          code: "NOT_FOUND",
          message: "Document introuvable.",
        });
      }
      return invoicingService.getDocument(principal, params.invoiceId);
    },
  );
}
