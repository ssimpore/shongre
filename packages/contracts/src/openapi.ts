import type { paths } from "./generated/openapi";

export type { components, operations, paths } from "./generated/openapi";

export type ApiMethod = "get" | "post" | "put" | "patch" | "delete";

type OpenApiPathToRuntime<Path extends string> =
  Path extends `${infer Prefix}{${string}}${infer Suffix}`
    ? `${Prefix}${string}${OpenApiPathToRuntime<Suffix>}`
    : Path;

export type ApiPath = OpenApiPathToRuntime<keyof paths & string>;

export type ApiPathForMethod<Method extends ApiMethod> = {
  [Path in keyof paths]: Method extends keyof paths[Path]
    ? paths[Path][Method] extends never | undefined
      ? never
      : OpenApiPathToRuntime<Path & string>
    : never;
}[keyof paths];

export const SHONGRE_API_VERSION = "1.0.0" as const;
export const SHONGRE_API_PREFIX = "/api/v1" as const;
