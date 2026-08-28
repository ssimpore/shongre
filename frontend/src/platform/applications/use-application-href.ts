import { getPublicRuntimeConfig } from "../runtime-config/public-runtime-config";
import {
  resolveApplicationHref,
  type ShongreApplicationId,
} from "./application-registry";

export function applicationHref(
  applicationId: ShongreApplicationId,
  pathname = "/",
): string {
  return resolveApplicationHref(
    getPublicRuntimeConfig().applications,
    applicationId,
    pathname,
  );
}

