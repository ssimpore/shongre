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

export interface CrmListOptions {
  limit?: number;
  cursor?: string;
  query?: string;
}

export interface CrmPage<T> {
  items: T[];
  pageInfo: { hasNextPage: boolean; nextCursor?: string };
}

export interface CrmServiceContract {
  getDashboard(): Promise<CrmDashboard>;
  listAccounts(options?: CrmListOptions): Promise<CrmPage<CrmAccount>>;
  getAccount(id: string): Promise<CrmAccount>;
  findAccountDuplicates(
    input: CrmAccountDuplicateCheck,
  ): Promise<CrmDuplicateMatch[]>;
  getAccountShongreIntelligence(id: string): Promise<CrmShongreIntelligence>;
  createAccount(input: CrmAccountInput): Promise<CrmAccount>;
  updateAccount(
    id: string,
    expectedVersion: number,
    changes: Partial<CrmAccountInput>,
  ): Promise<CrmAccount>;
  listContacts(options?: CrmListOptions): Promise<CrmPage<CrmContact>>;
  getContact(id: string): Promise<CrmContact>;
  createContact(input: CrmContactInput): Promise<CrmContact>;
  updateContact(
    id: string,
    expectedVersion: number,
    changes: Partial<CrmContactInput>,
  ): Promise<CrmContact>;
  listPipelines(): Promise<CrmPipeline[]>;
  createPipeline(input: CrmPipelineInput): Promise<CrmPipeline>;
  updatePipeline(
    id: string,
    expectedVersion: number,
    input: CrmPipelineInput,
  ): Promise<CrmPipeline>;
  listOpportunities(options?: CrmListOptions): Promise<CrmPage<CrmOpportunity>>;
  getOpportunity(id: string): Promise<CrmOpportunity>;
  createOpportunity(input: CrmOpportunityInput): Promise<CrmOpportunity>;
  transitionOpportunity(
    id: string,
    input: CrmOpportunityTransition,
  ): Promise<CrmOpportunity>;
  listTasks(options?: CrmListOptions): Promise<CrmPage<CrmTask>>;
  createTask(input: CrmTaskInput): Promise<CrmTask>;
  completeTask(
    id: string,
    expectedVersion: number,
    result?: string,
  ): Promise<CrmTask>;
  listActivities(
    entityType: "account" | "contact" | "opportunity" | "task",
    entityId: string,
    limit?: number,
  ): Promise<CrmActivity[]>;
  createActivity(
    input: Pick<
      CrmActivity,
      "entityType" | "entityId" | "activityType" | "title"
    > &
      Partial<Pick<CrmActivity, "description" | "occurredAt">>,
  ): Promise<CrmActivity>;
  listProducts(options?: CrmListOptions): Promise<CrmPage<CrmProduct>>;
  createProduct(input: CrmProductInput): Promise<CrmProduct>;
  updateProduct(
    id: string,
    expectedVersion: number,
    changes: Partial<CrmProductInput>,
  ): Promise<CrmProduct>;
  listQuotes(
    options?: CrmListOptions & { opportunityId?: string },
  ): Promise<CrmPage<CrmQuote>>;
  createQuote(input: CrmQuoteInput): Promise<CrmQuote>;
  listCustomFields(
    entityType?: "account" | "contact" | "opportunity" | "task",
  ): Promise<CrmCustomField[]>;
  createCustomField(input: CrmCustomFieldInput): Promise<CrmCustomField>;
  listSavedViews(
    entityType?: "account" | "contact" | "opportunity" | "task",
  ): Promise<CrmSavedView[]>;
  createSavedView(input: CrmSavedViewInput): Promise<CrmSavedView>;
  updateSavedView(
    id: string,
    expectedVersion: number,
    input: CrmSavedViewInput,
  ): Promise<CrmSavedView>;
  deleteSavedView(id: string, expectedVersion: number): Promise<void>;
}
