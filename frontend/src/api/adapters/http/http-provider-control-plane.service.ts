import type {
  ProviderControlPlaneSnapshot,
  ProviderDiagnosticResult,
} from "@shongre/contracts/provider-platform";
import type { ProviderControlPlaneServiceContract } from "../../contracts/provider-control-plane.contract";
import { httpClient } from "./http-client";

export class HttpProviderControlPlaneService implements ProviderControlPlaneServiceContract {
  getSnapshot(): Promise<ProviderControlPlaneSnapshot> {
    return httpClient.get("/admin/providers/control-plane");
  }

  testProvider(providerId: string): Promise<ProviderDiagnosticResult> {
    return httpClient.post(
      `/admin/providers/${encodeURIComponent(providerId)}/test`,
    );
  }
}

export const httpProviderControlPlaneService =
  new HttpProviderControlPlaneService();
