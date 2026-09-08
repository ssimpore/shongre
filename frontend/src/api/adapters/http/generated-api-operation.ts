import {
  executeGeneratedApiOperation,
  type ApiInput,
  type ApiResponse,
  type GeneratedApiOperationId,
} from "@shongre/contracts/api-client";
import { httpClient } from "./http-client";

type Mutable<T> = T extends readonly (infer Item)[]
  ? Mutable<Item>[]
  : T extends object
    ? { -readonly [Key in keyof T]: Mutable<T[Key]> }
    : T;
type FrontendApiInput<Id extends GeneratedApiOperationId> = Omit<
  ApiInput<Id>,
  "body" | "query"
> & {
  /** Domain contracts are normalized to the generated wire shape by the API. */
  body?: unknown;
  query?: Record<string, unknown>;
};

/** Typed binding from generated operations to the browser session transport. */
export function apiOperation<Id extends GeneratedApiOperationId>(
  operationId: Id,
  input: FrontendApiInput<Id>,
): Promise<Mutable<ApiResponse<Id>>>;
/**
 * UI-facing contracts can be narrower than transport projections. The explicit
 * expected type keeps that compatibility assertion at this adapter boundary.
 */
export function apiOperation<Expected, Id extends GeneratedApiOperationId>(
  operationId: Id,
  input: FrontendApiInput<Id>,
): Promise<Expected>;
export function apiOperation<Id extends GeneratedApiOperationId>(
  operationId: Id,
  input: FrontendApiInput<Id>,
): Promise<unknown> {
  return executeGeneratedApiOperation(
    (path, request) => httpClient.request(path, request),
    operationId,
    input as ApiInput<Id>,
  );
}
