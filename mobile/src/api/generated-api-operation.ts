import {
  executeGeneratedApiOperation,
  type ApiInput,
  type ApiResponse,
  type GeneratedApiOperationId,
} from "@shongre/contracts/api-client";
import { apiRequest } from "./http-client";

/** Typed binding from generated operations to the native session transport. */
export function apiOperation<Id extends GeneratedApiOperationId>(
  operationId: Id,
  input: ApiInput<Id>,
  marketCode?: string,
): Promise<ApiResponse<Id>> {
  return executeGeneratedApiOperation(
    (path, init) => apiRequest(path, init, marketCode),
    operationId,
    input,
  );
}
