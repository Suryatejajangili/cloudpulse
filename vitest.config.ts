import { defineConfig } from "vitest/config";
import { cloudflareTest } from "@cloudflare/vitest-plugin";

/**
 * Vitest configuration for Cloudflare Workers.
 *
 * Tests run inside a real Workers runtime (Miniflare) rather than Node.js.
 * This means D1 SQL, Workers APIs, and bindings all behave exactly as they
 * would on Cloudflare's edge — no mocking of the runtime required.
 *
 * Reference: https://developers.cloudflare.com/workers/testing/vitest-integration/
 */
export default defineConfig({
  plugins: [
    cloudflareTest({
      // Point the test runtime at our wrangler config so it picks up
      // the D1 binding, compatibility_date, and compatibility_flags.
      wrangler: {
        configPath: "./wrangler.jsonc",
      },
    }),
  ],
  test: {
    // Test file pattern
    include: ["tests/**/*.test.ts"],

    // Clear mocks automatically between tests
    clearMocks: true,
    restoreMocks: true,
  },
});
