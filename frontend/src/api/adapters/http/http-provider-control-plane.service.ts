import type {
  ProviderControlPlaneSnapshot,
  ProviderDiagnosticResult,
} from "@shongre/contracts/provider-platform";
import type {
  ProviderConnection,
  ProviderConnectionInput,
  ProviderCredentialRotation,
} from "@shongre/contracts/provider-connections";
import type { ProviderControlPlaneServiceContract } from "../../contracts/provider-control-plane.contract";
import { httpClient } from "./http-client";

export class HttpProviderControlPlaneService implements ProviderControlPlaneServiceContract {
  async listConnections(): Promise<ProviderConnection[]> {
    const response = await httpClient.get<{ items: ProviderConnection[] }>(
      "/provider-connections",
    );
    return response.items;
  }

  createConnection(
    input: ProviderConnectionInput,
  ): Promise<ProviderConnection> {
    return httpClient.post("/provider-connections", input);
  }

  rotateCredential(
    connectionId: string,
    input: ProviderCredentialRotation,
  ): Promise<ProviderConnection> {
    return httpClient.put(
      `/provider-connections/${encodeURIComponent(connectionId)}/credential`,
      input,
    );
  }

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
