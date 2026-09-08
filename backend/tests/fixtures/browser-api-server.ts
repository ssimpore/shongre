import { writeFileSync } from "node:fs";
import { createBackendApplication } from "../../src/app/server/index.js";
import { config } from "../../src/app/config/index.js";
import { seedDemoCredentials } from "../../src/app/bootstrap/seed-demo-credentials.js";
import { repositories } from "../../src/infrastructure/database/repositories/index.js";

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
const reviewOrder = await repositories.orders.findById("ord_sample_1");
if (!reviewOrder) throw new Error("Missing canonical review order fixture");
for (const engine of ["chromium", "firefox", "webkit"]) {
  await repositories.orders.create({
    ...reviewOrder,
    id: `browser-review-${engine}`,
    orderNumber: `BROWSER-REVIEW-${engine}`,
    status: "completed",
  });
}
const app = await createBackendApplication();
await app.listen(0, "127.0.0.1");
const address = app.getHttpServer().address();
if (!address || typeof address === "string")
  throw new Error("Missing test listener");
writeFileSync(process.env.E2E_API_PORT_FILE!, String(address.port), {
  mode: 0o600,
});
process.once("SIGTERM", () => {
  void app.close();
});
