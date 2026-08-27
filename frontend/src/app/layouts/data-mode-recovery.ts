import type { AppEnvironment } from "@shongre/contracts/environment";

import type { DataMode } from "../../api/client/api-client.config";

export function allowsLocalDataModeRecovery(
  mode: DataMode,
  environment: AppEnvironment,
): boolean {
  return (
    mode === "api" &&
    (environment === "local" ||
      environment === "development" ||
      environment === "test")
  );
}
