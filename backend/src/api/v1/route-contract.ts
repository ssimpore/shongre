import { Permission } from "../../shared/auth/rbac.js";
import { IncomingMessage, ServerResponse } from "http";
import { Principal } from "../../shared/auth/principal.js";

export type RouteAccess =
  | { kind: "public" }
  | { kind: "authenticated" }
  | { kind: "permission"; permission: Permission };

export const PUBLIC: RouteAccess = { kind: "public" };

export const AUTHENTICATED: RouteAccess = { kind: "authenticated" };

export const permission = (p: Permission): RouteAccess => ({
  kind: "permission",
  permission: p,
});

export interface RouteContext {
  req: IncomingMessage;
  res: ServerResponse;
  params: Record<string, string>;
  body: any;
  principal: Principal;
  query: URLSearchParams;
  marketCode: string | null;
  requestId: string;
}

export type RouteHandler = (ctx: RouteContext) => Promise<any>;

export interface RouteRegistrar {
  addRoute(
    method: string,
    path: string,
    access: RouteAccess,
    handler: RouteHandler,
  ): void;
}
