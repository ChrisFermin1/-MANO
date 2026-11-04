import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests for the app's logic (money math, numbering, invoice states). Run: npm test
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { environment: "node", setupFiles: ["./src/lib/__tests__/setup.ts"], include: ["src/**/*.test.ts"] },
});
