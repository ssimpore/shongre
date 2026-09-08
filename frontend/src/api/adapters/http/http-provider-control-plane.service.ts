import type {
  ProviderControlPlaneSnapshot,
  ProviderDiagnosticResult,
} from "@shongre/contracts/provider-platform";
import { apiOperation } from "./generated-api-operation";
import type {
  ProviderConnection,
  ProviderConnectionInput,
  ProviderCredentialRotation,
} from "@shongre/contracts/provider-connections";
import type { ProviderControlPlaneServiceContract } from "../../contracts/provider-control-plane.contract";

export class HttpProviderControlPlaneService implements ProviderControlPlaneServiceContract {
  async listConnections(): Promise<ProviderConnection[]> {
    const response = await apiOperation<
      { items: ProviderConnection[] },
      "listProviderConnections"
    >("listProviderConnections", {});
    return response.items;
  }

  createConnection(
    input: ProviderConnectionInput,
  ): Promise<ProviderConnection> {
    return apiOperation<ProviderConnection, "createProviderConnection">(
      "createProviderConnection",
      { body: input },
    );
  }

  rotateCredential(
    connectionId: string,
    input: ProviderCredentialRotation,
  ): Promise<ProviderConnection> {
    return apiOperation<
      ProviderConnection,
      "rotateProviderConnectionCredential"
    >("rotateProviderConnectionCredential", {
      path: { connectionId: connectionId },
      body: input,
    });
  }

  getSnapshot(): Promise<ProviderControlPlaneSnapshot> {
    return apiOperation<
      ProviderControlPlaneSnapshot,
      "getAdminProvidersControlPlane"
    >("getAdminProvidersControlPlane", {});
  }

  testProvider(providerId: string): Promise<ProviderDiagnosticResult> {
    return apiOperation<
      ProviderDiagnosticResult,
      "postAdminProvidersByProviderIdTest"
    >("postAdminProvidersByProviderIdTest", {
      path: { providerId: providerId },
    });
  }
}

export const httpProviderControlPlaneService =
  new HttpProviderControlPlaneService();
