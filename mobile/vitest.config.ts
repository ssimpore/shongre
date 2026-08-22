import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "node",
    env: {
      EXPO_PUBLIC_DATA_MODE: "demo",
      EXPO_PUBLIC_WEB_URL: "https://mobile-test.shongre.invalid",
    },
    include: ["tests/**/*.test.ts"],
  },
});
