import { createServer } from "node:http";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { verifyStorageRestore } from "./verify-storage-restore.mjs";

const directory = mkdtempSync(resolve(tmpdir(), "shongre-storage-restore-"));
const evidencePath = resolve(directory, "storage-evidence.json");
const fixture = Buffer.from("shongre-storage-restore-fixture", "utf8");
let restored = Buffer.alloc(0);
let deleted = false;
const server = createServer((request, response) => {
  if (request.url === "/backup" && request.method === "GET") {
    response.setHeader("Content-Type", "application/octet-stream");
    response.end(fixture);
    return;
  }
  if (request.url === "/restore" && request.method === "PUT") {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      restored = Buffer.concat(chunks);
      response.statusCode = 200;
      response.end();
    });
    return;
  }
  if (request.url === "/restore" && request.method === "GET") {
    response.end(restored);
    return;
  }
  if (request.url === "/restore" && request.method === "DELETE") {
    restored = Buffer.alloc(0);
    deleted = true;
    response.statusCode = 204;
    response.end();
    return;
  }
  response.statusCode = 404;
  response.end();
});

try {
  await new Promise((resolveStarted) => server.listen(0, resolveStarted));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("server unavailable");
  const origin = `http://127.0.0.1:${address.port}`;
  const evidence = await verifyStorageRestore({
    sourceUrl: `${origin}/backup`,
    uploadUrl: `${origin}/restore`,
    restoredUrl: `${origin}/restore`,
    deleteUrl: `${origin}/restore`,
    targetId: "shongre-dr_test-storage",
    marketCode: "FR",
    evidencePath,
    allowInsecure: true,
  });
  if (evidence.result !== "PASS" || !deleted) {
    throw new Error("storage restore or cleanup did not pass");
  }
  const persisted = JSON.parse(readFileSync(evidencePath, "utf8"));
  if (persisted.bytes !== fixture.length || persisted.marketCode !== "FR") {
    throw new Error("storage restore evidence is incomplete");
  }
  console.log("Object-storage restore checksum and cleanup invariants passed.");
} finally {
  await new Promise((resolveClosed) => server.close(resolveClosed));
  rmSync(directory, { recursive: true, force: true });
}
