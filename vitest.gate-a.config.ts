import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/** Config isolada — execução live Gate A (não roda no `npm test` padrão). */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: [
      "src/modules/platform-hub-bridges/gate-a-meta-staging/__tests__/gate-a-live.cli.test.ts",
      "src/modules/platform-hub-bridges/gate-a-meta-staging/__tests__/gate-a-discover.cli.test.ts",
    ],
    passWithNoTests: true,
    testTimeout: 300_000,
  },
});
