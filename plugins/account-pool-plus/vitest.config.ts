import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    name: "bb-plugin-account-pool-plus",
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["dist/**", "node_modules/**"],
  },
});
