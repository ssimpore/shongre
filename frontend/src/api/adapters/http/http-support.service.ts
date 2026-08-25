import type {
  SupportCase,
  SupportCaseFilter,
  SupportCaseMetrics,
  SupportCaseNote,
  SupportCaseNoteCreate,
  SupportCaseUpdate,
  SupportCaseCreate,
} from "@shongre/contracts/support";
import type {
  SupportCaseDetail,
  SupportServiceContract,
} from "../../contracts/support.contract";
import { httpClient } from "./http-client";

export class HttpSupportService implements SupportServiceContract {
  createCase(input: SupportCaseCreate) {
    return httpClient.post<SupportCase>("/support/cases", input);
  }

  async listOwnCases() {
    const result = await httpClient.get<{ items: SupportCase[] }>(
      "/support/cases/mine",
    );
    return result.items;
  }

  getCase(caseId: string) {
    return httpClient.get<SupportCaseDetail>(
      `/support/cases/${encodeURIComponent(caseId)}`,
    );
  }

  async listCases(filter: SupportCaseFilter = {}) {
    const result = await httpClient.get<{ items: SupportCase[] }>(
      "/support/cases",
      { params: filter },
    );
    return result.items;
  }

  updateCase(caseId: string, input: SupportCaseUpdate) {
    return httpClient.patch<SupportCase>(
      `/support/cases/${encodeURIComponent(caseId)}`,
      input,
    );
  }

  addNote(caseId: string, input: SupportCaseNoteCreate) {
    return httpClient.post<SupportCaseNote>(
      `/support/cases/${encodeURIComponent(caseId)}/notes`,
      input,
    );
  }

  getMetrics() {
    return httpClient.get<SupportCaseMetrics>("/support/metrics");
  }
}

export const httpSupportService = new HttpSupportService();
