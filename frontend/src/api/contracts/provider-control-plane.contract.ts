import type {
  ProviderControlPlaneSnapshot,
  ProviderDiagnosticResult,
} from "@shongre/contracts/provider-platform";
import type {
  ProviderConnection,
  ProviderConnectionInput,
  ProviderCredentialRotation,
} from "@shongre/contracts/provider-connections";

export interface ProviderControlPlaneServiceContract {
  getSnapshot(): Promise<ProviderControlPlaneSnapshot>;
  testProvider(providerId: string): Promise<ProviderDiagnosticResult>;
  listConnections(): Promise<ProviderConnection[]>;
  createConnection(input: ProviderConnectionInput): Promise<ProviderConnection>;
  rotateCredential(
    connectionId: string,
    input: ProviderCredentialRotation,
  ): Promise<ProviderConnection>;
}
