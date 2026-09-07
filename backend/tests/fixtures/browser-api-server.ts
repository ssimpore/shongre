import { writeFileSync } from "node:fs";
import { createHttpServer } from "../../src/app/server/index.js";
import { config } from "../../src/app/config/index.js";
import { seedDemoCredentials } from "../../src/app/bootstrap/seed-demo-credentials.js";

if (
  config.environment.environment !== "test" ||
  config.dataMode !== "demo" ||
  !process.env.E2E_API_PORT_FILE
) {
  throw new Error(
    "The browser API fixture requires the isolated test/demo profile.",
  );
}
await seedDemoCredentials();
const server = createHttpServer();
server.listen(0, "127.0.0.1", () => {
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Missing test listener");
  writeFileSync(process.env.E2E_API_PORT_FILE!, String(address.port), {
    mode: 0o600,
  });
});
process.once("SIGTERM", () => {
  server.closeAllConnections();
  server.close();
});
