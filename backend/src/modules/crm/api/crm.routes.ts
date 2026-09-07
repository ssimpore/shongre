import {
  type RouteRegistrar,
  permission,
} from "../../../api/v1/route-contract.js";
import { prospectingService } from "../prospecting/prospecting.service.js";
import { crmService } from "../crm.service.js";
import { crmShongreService } from "../crm-shongre.service.js";

export function registerCrmRoutes(routes: RouteRegistrar): void {
  routes.addRoute(
    "GET",
    "/crm/prospecting/profiles",
    permission("crm.prospecting.read"),
    async ({ principal }) => prospectingService.listProfiles(principal),
  );
  routes.addRoute(
    "POST",
    "/crm/prospecting/profiles",
    permission("crm.prospecting.profiles.manage"),
    async ({ principal, body }) =>
      prospectingService.createProfile(principal, body),
  );
  routes.addRoute(
    "GET",
    "/crm/prospecting/sources",
    permission("crm.prospecting.read"),
    async ({ principal, query }) =>
      prospectingService.listSources(principal, query.get("marketCode") ?? ""),
  );
  routes.addRoute(
    "POST",
    "/crm/prospecting/discover",
    permission("crm.prospecting.discover"),
    async ({ principal, body }) => prospectingService.discover(principal, body),
  );
  routes.addRoute(
    "GET",
    "/crm/prospecting/candidates/:candidateId/brief",
    permission("crm.prospecting.score"),
    async ({ principal, params }) =>
      prospectingService.opportunityBrief(principal, params.candidateId),
  );
  routes.addRoute(
    "POST",
    "/crm/prospecting/imports",
    permission("crm.prospecting.import"),
    async ({ principal, body }) =>
      prospectingService.importCandidate(principal, body),
  );
  routes.addRoute(
    "GET",
    "/crm/prospecting/usage",
    permission("crm.prospecting.read"),
    async ({ principal, query }) =>
      prospectingService.usage(principal, query.get("marketCode") ?? ""),
  );
  routes.addRoute(
    "GET",
    "/crm/dashboard",
    permission("crm.dashboard.read"),
    async ({ principal }) => crmService.dashboard(principal),
  );
  routes.addRoute(
    "GET",
    "/crm/accounts",
    permission("crm.accounts.read"),
    async ({ principal, query }) =>
      crmService.listAccounts(principal, {
        limit: query.get("limit") ?? undefined,
        cursor: query.get("cursor") ?? undefined,
        query: query.get("query") ?? undefined,
      }),
  );
  routes.addRoute(
    "POST",
    "/crm/accounts",
    permission("crm.accounts.create"),
    async ({ principal, body }) => crmService.createAccount(principal, body),
  );
  routes.addRoute(
    "POST",
    "/crm/account-duplicates/check",
    permission("crm.accounts.read"),
    async ({ principal, body }) =>
      crmService.findAccountDuplicates(principal, body),
  );
  routes.addRoute(
    "GET",
    "/crm/accounts/:accountId",
    permission("crm.accounts.read"),
    async ({ principal, params }) =>
      crmService.getAccount(principal, params.accountId),
  );
  routes.addRoute(
    "GET",
    "/crm/accounts/:accountId/shongre",
    permission("crm.accounts.read"),
    async ({ principal, params }) =>
      crmShongreService.accountIntelligence(principal, params.accountId),
  );
  routes.addRoute(
    "PATCH",
    "/crm/accounts/:accountId",
    permission("crm.accounts.update"),
    async ({ principal, params, body }) =>
      crmService.updateAccount(principal, params.accountId, body),
  );
  routes.addRoute(
    "GET",
    "/crm/contacts",
    permission("crm.contacts.read"),
    async ({ principal, query }) =>
      crmService.listContacts(principal, {
        limit: query.get("limit") ?? undefined,
        cursor: query.get("cursor") ?? undefined,
        query: query.get("query") ?? undefined,
      }),
  );
  routes.addRoute(
    "POST",
    "/crm/contacts",
    permission("crm.contacts.create"),
    async ({ principal, body }) => crmService.createContact(principal, body),
  );
  routes.addRoute(
    "GET",
    "/crm/contacts/:contactId",
    permission("crm.contacts.read"),
    async ({ principal, params }) =>
      crmService.getContact(principal, params.contactId),
  );
  routes.addRoute(
    "PATCH",
    "/crm/contacts/:contactId",
    permission("crm.contacts.update"),
    async ({ principal, params, body }) =>
      crmService.updateContact(principal, params.contactId, body),
  );
  routes.addRoute(
    "GET",
    "/crm/pipelines",
    permission("crm.pipelines.read"),
    async ({ principal }) => crmService.listPipelines(principal),
  );
  routes.addRoute(
    "POST",
    "/crm/pipelines",
    permission("crm.pipelines.manage"),
    async ({ principal, body }) => crmService.createPipeline(principal, body),
  );
  routes.addRoute(
    "PATCH",
    "/crm/pipelines/:pipelineId",
    permission("crm.pipelines.manage"),
    async ({ principal, params, body }) =>
      crmService.updatePipeline(principal, params.pipelineId, body),
  );
  routes.addRoute(
    "GET",
    "/crm/opportunities",
    permission("crm.opportunities.read"),
    async ({ principal, query }) =>
      crmService.listOpportunities(principal, {
        limit: query.get("limit") ?? undefined,
        cursor: query.get("cursor") ?? undefined,
        query: query.get("query") ?? undefined,
      }),
  );
  routes.addRoute(
    "POST",
    "/crm/opportunities",
    permission("crm.opportunities.create"),
    async ({ principal, body }) =>
      crmService.createOpportunity(principal, body),
  );
  routes.addRoute(
    "GET",
    "/crm/opportunities/:opportunityId",
    permission("crm.opportunities.read"),
    async ({ principal, params }) =>
      crmService.getOpportunity(principal, params.opportunityId),
  );
  routes.addRoute(
    "POST",
    "/crm/opportunities/:opportunityId/transition",
    permission("crm.opportunities.transition"),
    async ({ principal, params, body }) =>
      crmService.transitionOpportunity(principal, params.opportunityId, body),
  );
  routes.addRoute(
    "GET",
    "/crm/tasks",
    permission("crm.tasks.read"),
    async ({ principal, query }) =>
      crmService.listTasks(principal, {
        limit: query.get("limit") ?? undefined,
        cursor: query.get("cursor") ?? undefined,
        query: query.get("query") ?? undefined,
      }),
  );
  routes.addRoute(
    "POST",
    "/crm/tasks",
    permission("crm.tasks.create"),
    async ({ principal, body }) => crmService.createTask(principal, body),
  );
  routes.addRoute(
    "POST",
    "/crm/tasks/:taskId/complete",
    permission("crm.tasks.complete"),
    async ({ principal, params, body }) =>
      crmService.completeTask(principal, params.taskId, body),
  );
  routes.addRoute(
    "GET",
    "/crm/activities",
    permission("crm.activities.read"),
    async ({ principal, query }) =>
      crmService.listActivities(
        principal,
        query.get("entityType") ?? "",
        query.get("entityId") ?? "",
        query.get("limit") ?? undefined,
      ),
  );
  routes.addRoute(
    "POST",
    "/crm/activities",
    permission("crm.activities.create"),
    async ({ principal, body }) => crmService.addActivity(principal, body),
  );
  routes.addRoute(
    "GET",
    "/crm/products",
    permission("crm.products.read"),
    async ({ principal, query }) =>
      crmService.listProducts(principal, {
        limit: query.get("limit") ?? undefined,
        cursor: query.get("cursor") ?? undefined,
        query: query.get("query") ?? undefined,
      }),
  );
  routes.addRoute(
    "POST",
    "/crm/products",
    permission("crm.products.manage"),
    async ({ principal, body }) => crmService.createProduct(principal, body),
  );
  routes.addRoute(
    "PATCH",
    "/crm/products/:productId",
    permission("crm.products.manage"),
    async ({ principal, params, body }) =>
      crmService.updateProduct(principal, params.productId, body),
  );
  routes.addRoute(
    "GET",
    "/crm/quotes",
    permission("crm.quotes.read"),
    async ({ principal, query }) =>
      crmService.listQuotes(principal, {
        limit: query.get("limit") ?? undefined,
        cursor: query.get("cursor") ?? undefined,
        query: query.get("query") ?? undefined,
        opportunityId: query.get("opportunityId") ?? undefined,
      }),
  );
  routes.addRoute(
    "POST",
    "/crm/quotes",
    permission("crm.quotes.create"),
    async ({ principal, body }) => crmService.createQuote(principal, body),
  );
  routes.addRoute(
    "GET",
    "/crm/custom-fields",
    permission("crm.custom_fields.read"),
    async ({ principal, query }) =>
      crmService.listCustomFields(
        principal,
        query.get("entityType") ?? undefined,
      ),
  );
  routes.addRoute(
    "POST",
    "/crm/custom-fields",
    permission("crm.custom_fields.manage"),
    async ({ principal, body }) =>
      crmService.createCustomField(principal, body),
  );
  routes.addRoute(
    "GET",
    "/crm/saved-views",
    permission("crm.access"),
    async ({ principal, query }) =>
      crmService.listSavedViews(
        principal,
        query.get("entityType") ?? undefined,
      ),
  );
  routes.addRoute(
    "POST",
    "/crm/saved-views",
    permission("crm.access"),
    async ({ principal, body }) => crmService.createSavedView(principal, body),
  );
  routes.addRoute(
    "PUT",
    "/crm/saved-views/:savedViewId",
    permission("crm.access"),
    async ({ principal, params, body }) =>
      crmService.updateSavedView(principal, params.savedViewId, body),
  );
  routes.addRoute(
    "DELETE",
    "/crm/saved-views/:savedViewId",
    permission("crm.access"),
    async ({ principal, params, query }) =>
      crmService.deleteSavedView(
        principal,
        params.savedViewId,
        query.get("expectedVersion"),
      ),
  );
}
