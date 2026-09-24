import "server-only";
import { headers } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { edgeIdentityHeaders } from "./edge-identity";

/**
 * The edge identity of the visitor whose request is being rendered. Without
 * it every anonymous render reaches the API from the Web server's own address
 * and all visitors share one rate-limit bucket.
 */
export async function serverEdgeIdentityHeaders(): Promise<
  Record<string, string>
> {
  try {
    return edgeIdentityHeaders(await headers());
  } catch (error) {
    unstable_rethrow(error);
    // Outside a request scope there is no visitor to identify.
    return {};
  }
}
