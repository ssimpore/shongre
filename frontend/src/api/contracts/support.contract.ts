import type {
  SupportCase,
  SupportCaseCreate,
  SupportCaseFilter,
  SupportCaseMetrics,
  SupportCaseNote,
  SupportCaseNoteCreate,
  SupportCaseUpdate,
} from "@shongre/contracts/support";

export interface SupportCaseDetail {
  case: SupportCase;
  notes: SupportCaseNote[];
}

/** Public frontend boundary for customer assistance and the staff queue. */
export interface SupportServiceContract {
  createCase(input: SupportCaseCreate): Promise<SupportCase>;
  listOwnCases(): Promise<SupportCase[]>;
  getCase(caseId: string): Promise<SupportCaseDetail>;
  listCases(filter?: SupportCaseFilter): Promise<SupportCase[]>;
  updateCase(caseId: string, input: SupportCaseUpdate): Promise<SupportCase>;
  addNote(
    caseId: string,
    input: SupportCaseNoteCreate,
  ): Promise<SupportCaseNote>;
  getMetrics(): Promise<SupportCaseMetrics>;
}
