import type {
  ProviderControlPlaneSnapshot,
  ProviderDiagnosticResult,
} from "@shongre/contracts/provider-platform";

export interface ProviderControlPlaneServiceContract {
  getSnapshot(): Promise<ProviderControlPlaneSnapshot>;
  testProvider(providerId: string): Promise<ProviderDiagnosticResult>;
}
