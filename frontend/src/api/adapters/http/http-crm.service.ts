import type {
  CrmAccount,
  CrmAccountDuplicateCheck,
  CrmAccountInput,
  CrmActivity,
  CrmContact,
  CrmContactInput,
  CrmDashboard,
  CrmCustomField,
  CrmCustomFieldInput,
  CrmDuplicateMatch,
  CrmOpportunity,
  CrmOpportunityInput,
  CrmOpportunityTransition,
  CrmPipeline,
  CrmPipelineInput,
  CrmProduct,
  CrmProductInput,
  CrmQuote,
  CrmQuoteInput,
  CrmSavedView,
  CrmSavedViewInput,
  CrmShongreIntelligence,
  CrmTask,
  CrmTaskInput,
} from "@shongre/contracts/crm";
import type {
  CrmListOptions,
  CrmPage,
  CrmServiceContract,
} from "../../contracts/crm.contract";
import { httpClient } from "./http-client";

function listParams(options: CrmListOptions) {
  return {
    limit: options.limit,
    cursor: options.cursor,
    query: options.query,
  };
}

export class HttpCrmService implements CrmServiceContract {
  getDashboard() {
    return httpClient.get<CrmDashboard>("/crm/dashboard");
  }

  listAccounts(options: CrmListOptions = {}) {
    return httpClient.get<CrmPage<CrmAccount>>("/crm/accounts", {
      params: listParams(options),
    });
  }

  getAccount(id: string) {
    return httpClient.get<CrmAccount>(
      `/crm/accounts/${encodeURIComponent(id)}`,
    );
  }

  async findAccountDuplicates(input: CrmAccountDuplicateCheck) {
    const response = await httpClient.post<{ items: CrmDuplicateMatch[] }>(
      "/crm/account-duplicates/check",
      input,
    );
    return response.items;
  }

  getAccountShongreIntelligence(id: string) {
    return httpClient.get<CrmShongreIntelligence>(
      `/crm/accounts/${encodeURIComponent(id)}/shongre`,
    );
  }

  createAccount(input: CrmAccountInput) {
    return httpClient.post<CrmAccount>("/crm/accounts", input);
  }

  updateAccount(
    id: string,
    expectedVersion: number,
    changes: Partial<CrmAccountInput>,
  ) {
    return httpClient.patch<CrmAccount>(
      `/crm/accounts/${encodeURIComponent(id)}`,
      { expectedVersion, changes },
    );
  }

  listContacts(options: CrmListOptions = {}) {
    return httpClient.get<CrmPage<CrmContact>>("/crm/contacts", {
      params: listParams(options),
    });
  }

  getContact(id: string) {
    return httpClient.get<CrmContact>(
      `/crm/contacts/${encodeURIComponent(id)}`,
    );
  }

  createContact(input: CrmContactInput) {
    return httpClient.post<CrmContact>("/crm/contacts", input);
  }

  updateContact(
    id: string,
    expectedVersion: number,
    changes: Partial<CrmContactInput>,
  ) {
    return httpClient.patch<CrmContact>(
      `/crm/contacts/${encodeURIComponent(id)}`,
      { expectedVersion, changes },
    );
  }

  async listPipelines() {
    const response = await httpClient.get<{ items: CrmPipeline[] }>(
      "/crm/pipelines",
    );
    return response.items;
  }

  createPipeline(input: CrmPipelineInput) {
    return httpClient.post<CrmPipeline>("/crm/pipelines", input);
  }

  updatePipeline(id: string, expectedVersion: number, input: CrmPipelineInput) {
    return httpClient.patch<CrmPipeline>(
      `/crm/pipelines/${encodeURIComponent(id)}`,
      { expectedVersion, input },
    );
  }

  listOpportunities(options: CrmListOptions = {}) {
    return httpClient.get<CrmPage<CrmOpportunity>>("/crm/opportunities", {
      params: listParams(options),
    });
  }

  getOpportunity(id: string) {
    return httpClient.get<CrmOpportunity>(
      `/crm/opportunities/${encodeURIComponent(id)}`,
    );
  }

  createOpportunity(input: CrmOpportunityInput) {
    return httpClient.post<CrmOpportunity>("/crm/opportunities", input);
  }

  transitionOpportunity(id: string, input: CrmOpportunityTransition) {
    return httpClient.post<CrmOpportunity>(
      `/crm/opportunities/${encodeURIComponent(id)}/transition`,
      input,
    );
  }

  listTasks(options: CrmListOptions = {}) {
    return httpClient.get<CrmPage<CrmTask>>("/crm/tasks", {
      params: listParams(options),
    });
  }

  createTask(input: CrmTaskInput) {
    return httpClient.post<CrmTask>("/crm/tasks", input);
  }

  completeTask(id: string, expectedVersion: number, result?: string) {
    return httpClient.post<CrmTask>(
      `/crm/tasks/${encodeURIComponent(id)}/complete`,
      { expectedVersion, result },
    );
  }

  async listActivities(
    entityType: "account" | "contact" | "opportunity" | "task",
    entityId: string,
    limit = 100,
  ) {
    const response = await httpClient.get<{ items: CrmActivity[] }>(
      "/crm/activities",
      { params: { entityType, entityId, limit } },
    );
    return response.items;
  }

  createActivity(
    input: Pick<
      CrmActivity,
      "entityType" | "entityId" | "activityType" | "title"
    > &
      Partial<Pick<CrmActivity, "description" | "occurredAt">>,
  ) {
    return httpClient.post<CrmActivity>("/crm/activities", input);
  }

  listProducts(options: CrmListOptions = {}) {
    return httpClient.get<CrmPage<CrmProduct>>("/crm/products", {
      params: listParams(options),
    });
  }

  createProduct(input: CrmProductInput) {
    return httpClient.post<CrmProduct>("/crm/products", input);
  }

  updateProduct(
    id: string,
    expectedVersion: number,
    changes: Partial<CrmProductInput>,
  ) {
    return httpClient.patch<CrmProduct>(
      `/crm/products/${encodeURIComponent(id)}`,
      { expectedVersion, changes },
    );
  }

  listQuotes(options: CrmListOptions & { opportunityId?: string } = {}) {
    return httpClient.get<CrmPage<CrmQuote>>("/crm/quotes", {
      params: { ...listParams(options), opportunityId: options.opportunityId },
    });
  }

  createQuote(input: CrmQuoteInput) {
    return httpClient.post<CrmQuote>("/crm/quotes", input);
  }

  async listCustomFields(
    entityType?: "account" | "contact" | "opportunity" | "task",
  ) {
    const response = await httpClient.get<{ items: CrmCustomField[] }>(
      "/crm/custom-fields",
      { params: { entityType } },
    );
    return response.items;
  }

  createCustomField(input: CrmCustomFieldInput) {
    return httpClient.post<CrmCustomField>("/crm/custom-fields", input);
  }

  async listSavedViews(
    entityType?: "account" | "contact" | "opportunity" | "task",
  ) {
    const response = await httpClient.get<{ items: CrmSavedView[] }>(
      "/crm/saved-views",
      { params: { entityType } },
    );
    return response.items;
  }

  createSavedView(input: CrmSavedViewInput) {
    return httpClient.post<CrmSavedView>("/crm/saved-views", input);
  }

  updateSavedView(
    id: string,
    expectedVersion: number,
    input: CrmSavedViewInput,
  ) {
    return httpClient.put<CrmSavedView>(
      `/crm/saved-views/${encodeURIComponent(id)}`,
      { expectedVersion, input },
    );
  }

  async deleteSavedView(id: string, expectedVersion: number) {
    await httpClient.delete<{ deleted: boolean }>(
      `/crm/saved-views/${encodeURIComponent(id)}`,
      { params: { expectedVersion } },
    );
  }
}

export const httpCrmService = new HttpCrmService();
