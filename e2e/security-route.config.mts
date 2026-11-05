import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } },
  test: { include: ["e2e/membership-binding.integration.ts"], testTimeout: 30_000, hookTimeout: 30_000 },
});
