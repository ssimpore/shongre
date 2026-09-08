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
import { apiOperation } from "./generated-api-operation";
import type {
  CrmListOptions,
  CrmPage,
  CrmServiceContract,
} from "../../contracts/crm.contract";

function listParams(options: CrmListOptions) {
  return {
    limit: options.limit,
    cursor: options.cursor,
    query: options.query,
  };
}

export class HttpCrmService implements CrmServiceContract {
  getDashboard() {
    return apiOperation<CrmDashboard, "getCrmDashboard">("getCrmDashboard", {});
  }

  listAccounts(options: CrmListOptions = {}) {
    return apiOperation<CrmPage<CrmAccount>, "listCrmAccounts">(
      "listCrmAccounts",
      { query: listParams(options) },
    );
  }

  getAccount(id: string) {
    return apiOperation<CrmAccount, "getCrmAccount">("getCrmAccount", {
      path: { accountId: id },
    });
  }

  async findAccountDuplicates(input: CrmAccountDuplicateCheck) {
    const response = await apiOperation<
      { items: CrmDuplicateMatch[] },
      "checkCrmAccountDuplicates"
    >("checkCrmAccountDuplicates", { body: input });
    return response.items;
  }

  getAccountShongreIntelligence(id: string) {
    return apiOperation<
      CrmShongreIntelligence,
      "getCrmAccountShongreIntelligence"
    >("getCrmAccountShongreIntelligence", { path: { accountId: id } });
  }

  createAccount(input: CrmAccountInput) {
    return apiOperation<CrmAccount, "createCrmAccount">("createCrmAccount", {
      body: input,
    });
  }

  updateAccount(
    id: string,
    expectedVersion: number,
    changes: Partial<CrmAccountInput>,
  ) {
    return apiOperation<CrmAccount, "updateCrmAccount">("updateCrmAccount", {
      path: { accountId: id },
      body: { expectedVersion, changes },
    });
  }

  listContacts(options: CrmListOptions = {}) {
    return apiOperation<CrmPage<CrmContact>, "listCrmContacts">(
      "listCrmContacts",
      { query: listParams(options) },
    );
  }

  getContact(id: string) {
    return apiOperation<CrmContact, "getCrmContact">("getCrmContact", {
      path: { contactId: id },
    });
  }

  createContact(input: CrmContactInput) {
    return apiOperation<CrmContact, "createCrmContact">("createCrmContact", {
      body: input,
    });
  }

  updateContact(
    id: string,
    expectedVersion: number,
    changes: Partial<CrmContactInput>,
  ) {
    return apiOperation<CrmContact, "updateCrmContact">("updateCrmContact", {
      path: { contactId: id },
      body: { expectedVersion, changes },
    });
  }

  async listPipelines() {
    const response = await apiOperation<
      { items: CrmPipeline[] },
      "listCrmPipelines"
    >("listCrmPipelines", {});
    return response.items;
  }

  createPipeline(input: CrmPipelineInput) {
    return apiOperation<CrmPipeline, "createCrmPipeline">("createCrmPipeline", {
      body: input,
    });
  }

  updatePipeline(id: string, expectedVersion: number, input: CrmPipelineInput) {
    return apiOperation<CrmPipeline, "updateCrmPipeline">("updateCrmPipeline", {
      path: { pipelineId: id },
      body: { expectedVersion, input },
    });
  }

  listOpportunities(options: CrmListOptions = {}) {
    return apiOperation<CrmPage<CrmOpportunity>, "listCrmOpportunities">(
      "listCrmOpportunities",
      { query: listParams(options) },
    );
  }

  getOpportunity(id: string) {
    return apiOperation<CrmOpportunity, "getCrmOpportunity">(
      "getCrmOpportunity",
      { path: { opportunityId: id } },
    );
  }

  createOpportunity(input: CrmOpportunityInput) {
    return apiOperation<CrmOpportunity, "createCrmOpportunity">(
      "createCrmOpportunity",
      { body: input },
    );
  }

  transitionOpportunity(id: string, input: CrmOpportunityTransition) {
    return apiOperation<CrmOpportunity, "transitionCrmOpportunity">(
      "transitionCrmOpportunity",
      { path: { opportunityId: id }, body: input },
    );
  }

  listTasks(options: CrmListOptions = {}) {
    return apiOperation<CrmPage<CrmTask>, "listCrmTasks">("listCrmTasks", {
      query: listParams(options),
    });
  }

  createTask(input: CrmTaskInput) {
    return apiOperation<CrmTask, "createCrmTask">("createCrmTask", {
      body: input,
    });
  }

  completeTask(id: string, expectedVersion: number, result?: string) {
    return apiOperation<CrmTask, "completeCrmTask">("completeCrmTask", {
      path: { taskId: id },
      body: { expectedVersion, result },
    });
  }

  async listActivities(
    entityType: "account" | "contact" | "opportunity" | "task",
    entityId: string,
    limit = 100,
  ) {
    const response = await apiOperation<
      { items: CrmActivity[] },
      "listCrmActivities"
    >("listCrmActivities", { query: { entityType, entityId, limit } });
    return response.items;
  }

  createActivity(
    input: Pick<
      CrmActivity,
      "entityType" | "entityId" | "activityType" | "title"
    > &
      Partial<Pick<CrmActivity, "description" | "occurredAt">>,
  ) {
    return apiOperation<CrmActivity, "createCrmActivity">("createCrmActivity", {
      body: input,
    });
  }

  listProducts(options: CrmListOptions = {}) {
    return apiOperation<CrmPage<CrmProduct>, "listCrmProducts">(
      "listCrmProducts",
      { query: listParams(options) },
    );
  }

  createProduct(input: CrmProductInput) {
    return apiOperation<CrmProduct, "createCrmProduct">("createCrmProduct", {
      body: input,
    });
  }

  updateProduct(
    id: string,
    expectedVersion: number,
    changes: Partial<CrmProductInput>,
  ) {
    return apiOperation<CrmProduct, "updateCrmProduct">("updateCrmProduct", {
      path: { productId: id },
      body: { expectedVersion, changes },
    });
  }

  listQuotes(options: CrmListOptions & { opportunityId?: string } = {}) {
    return apiOperation<CrmPage<CrmQuote>, "listCrmQuotes">("listCrmQuotes", {
      query: { ...listParams(options), opportunityId: options.opportunityId },
    });
  }

  createQuote(input: CrmQuoteInput) {
    return apiOperation<CrmQuote, "createCrmQuote">("createCrmQuote", {
      body: input,
    });
  }

  async listCustomFields(
    entityType?: "account" | "contact" | "opportunity" | "task",
  ) {
    const response = await apiOperation<
      { items: CrmCustomField[] },
      "listCrmCustomFields"
    >("listCrmCustomFields", { query: { entityType } });
    return response.items;
  }

  createCustomField(input: CrmCustomFieldInput) {
    return apiOperation<CrmCustomField, "createCrmCustomField">(
      "createCrmCustomField",
      { body: input },
    );
  }

  async listSavedViews(
    entityType?: "account" | "contact" | "opportunity" | "task",
  ) {
    const response = await apiOperation<
      { items: CrmSavedView[] },
      "listCrmSavedViews"
    >("listCrmSavedViews", { query: { entityType } });
    return response.items;
  }

  createSavedView(input: CrmSavedViewInput) {
    return apiOperation<CrmSavedView, "createCrmSavedView">(
      "createCrmSavedView",
      { body: input },
    );
  }

  updateSavedView(
    id: string,
    expectedVersion: number,
    input: CrmSavedViewInput,
  ) {
    return apiOperation<CrmSavedView, "updateCrmSavedView">(
      "updateCrmSavedView",
      { path: { savedViewId: id }, body: { expectedVersion, input } },
    );
  }

  async deleteSavedView(id: string, expectedVersion: number) {
    await apiOperation<{ deleted: boolean }, "deleteCrmSavedView">(
      "deleteCrmSavedView",
      { path: { savedViewId: id }, query: { expectedVersion } },
    );
  }
}

export const httpCrmService = new HttpCrmService();
