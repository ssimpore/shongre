import type { ApiPath, operations } from "../openapi";

export type ApiTransport = (
  path: ApiPath,
  init: RequestInit,
) => Promise<unknown>;
type OperationId = keyof operations;
type Parameter<
  Id extends OperationId,
  Kind extends string,
> = operations[Id] extends { parameters: infer P }
  ? Kind extends keyof P
    ? NonNullable<P[Kind]>
    : never
  : never;
type Slot<Name extends string, Value> = [Value] extends [never]
  ? {}
  : {} extends Value
    ? { [K in Name]?: Value }
    : { [K in Name]: Value };
type Content<T> = T extends { content: infer C }
  ? "application/json" extends keyof C
    ? C["application/json"]
    : "application/x-www-form-urlencoded" extends keyof C
      ? C["application/x-www-form-urlencoded"]
      : never
  : undefined;
type Body<Id extends OperationId> = operations[Id] extends {
  requestBody?: infer B;
}
  ? Content<NonNullable<B>>
  : never;
type CompatibleBody<T> = T extends object
  ? string extends keyof T
    ? object
    : T
  : T;
type BodySlot<Id extends OperationId> = [Body<Id>] extends [never]
  ? {}
  : operations[Id] extends { requestBody: unknown }
    ? { body: CompatibleBody<Body<Id>> }
    : { body?: CompatibleBody<Body<Id>> };

export type ApiInput<Id extends OperationId> = Slot<
  "path",
  Parameter<Id, "path">
> &
  Slot<"query", Parameter<Id, "query">> &
  BodySlot<Id> & {
    signal?: AbortSignal;
    headers?: HeadersInit;
    credentials?: RequestCredentials;
  };
export type ApiResponse<Id extends OperationId> = operations[Id] extends {
  responses: infer R;
}
  ? {
      [Status in keyof R]: Status extends string | number
        ? `${Status}` extends `2${string}`
          ? Content<R[Status]>
          : never
        : never;
    }[keyof R]
  : never;

/** Serialization only: platform transports own credentials, deadlines and errors. */
export function executeApiOperation<Id extends OperationId>(
  transport: ApiTransport,
  method: string,
  template: string,
  input: ApiInput<Id>,
  contentType = "application/json",
): Promise<ApiResponse<Id>> {
  const args = input as {
    path?: Record<string, unknown>;
    query?: Record<string, unknown>;
    body?: unknown;
    signal?: AbortSignal;
    headers?: HeadersInit;
    credentials?: RequestCredentials;
  };
  const path = template.replace(/\{([^}]+)\}/g, (_match, name: string) => {
    const value = args.path?.[name];
    if (
      value === undefined ||
      value === null ||
      value === "" ||
      value === "." ||
      value === ".."
    )
      throw new Error(`Missing or invalid API path parameter: ${name}`);
    return encodeURIComponent(String(value));
  });
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(args.query || {})) {
    if (value === undefined || value === null) continue;
    for (const item of Array.isArray(value) ? value : [value])
      query.append(key, String(item));
  }
  const headers = new Headers(args.headers);
  let body: string | undefined;
  if (args.body !== undefined) {
    headers.set("Content-Type", contentType);
    body =
      contentType === "application/json"
        ? JSON.stringify(args.body)
        : new URLSearchParams(args.body as Record<string, string>).toString();
  }
  const suffix = query.toString();
  // The generated template and generated input types are the source of this
  // path; callers cannot choose a different method or response type.
  return transport(`${path}${suffix ? `?${suffix}` : ""}` as ApiPath, {
    method,
    headers,
    ...(body !== undefined ? { body } : {}),
    ...(args.signal ? { signal: args.signal } : {}),
    ...(args.credentials ? { credentials: args.credentials } : {}),
  }) as Promise<ApiResponse<Id>>;
}
