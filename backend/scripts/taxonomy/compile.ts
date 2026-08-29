import { pathToFileURL } from "node:url";
import { main } from "./master-compiler.js";

export { main } from "./master-compiler.js";

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
