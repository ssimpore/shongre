import assert from "node:assert/strict";
import { runDatabasePerformancePlan } from "./database-performance-plan.mjs";

assert.throws(
  () =>
    runDatabasePerformancePlan({
      connection: "postgresql://db.example.com/shongre",
      rowCount: 100_000,
    }),
  /restricted|refuses/,
);

console.log("Database performance target safety invariants passed.");
