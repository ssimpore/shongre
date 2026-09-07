import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestContext {
  requestId: string;
  operationId?: string;
  route?: string;
  marketCode?: string | null;
  actorId?: string;
}

/** One context per request; async domain/repository logs inherit its identity. */
export const requestContext = new AsyncLocalStorage<RequestContext>();

export function enrichRequestContext(context: Partial<RequestContext>): void {
  const current = requestContext.getStore();
  if (current) Object.assign(current, context);
}
