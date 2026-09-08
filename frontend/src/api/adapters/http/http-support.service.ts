import type {
  SupportCase,
  SupportCaseFilter,
  SupportCaseMetrics,
  SupportCaseNote,
  SupportCaseNoteCreate,
  SupportCaseUpdate,
  SupportCaseCreate,
} from "@shongre/contracts/support";
import { apiOperation } from "./generated-api-operation";
import type {
  SupportCaseDetail,
  SupportServiceContract,
} from "../../contracts/support.contract";

export class HttpSupportService implements SupportServiceContract {
  createCase(input: SupportCaseCreate) {
    return apiOperation<SupportCase, "postSupportCases">("postSupportCases", {
      body: input,
    });
  }

  async listOwnCases() {
    const result = await apiOperation<
      { items: SupportCase[] },
      "getSupportCasesMine"
    >("getSupportCasesMine", {});
    return result.items;
  }

  getCase(caseId: string) {
    return apiOperation<SupportCaseDetail, "getSupportCasesById">(
      "getSupportCasesById",
      { path: { id: caseId } },
    );
  }

  async listCases(filter: SupportCaseFilter = {}) {
    const result = await apiOperation<
      { items: SupportCase[] },
      "getSupportCases"
    >("getSupportCases", { query: filter });
    return result.items;
  }

  updateCase(caseId: string, input: SupportCaseUpdate) {
    return apiOperation<SupportCase, "patchSupportCasesById">(
      "patchSupportCasesById",
      { path: { id: caseId }, body: input },
    );
  }

  addNote(caseId: string, input: SupportCaseNoteCreate) {
    return apiOperation<SupportCaseNote, "postSupportCasesByIdNotes">(
      "postSupportCasesByIdNotes",
      { path: { id: caseId }, body: input },
    );
  }

  getMetrics() {
    return apiOperation<SupportCaseMetrics, "getSupportMetrics">(
      "getSupportMetrics",
      {},
    );
  }
}

export const httpSupportService = new HttpSupportService();
