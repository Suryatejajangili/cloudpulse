/**
 * CloudPulse — Cloudflare Worker Entry Point
 *
 * This is the main request router. All HTTP requests arrive here first.
 * The router will be expanded in later phases to wire in:
 *   - POST /api/events        → eventsHandler
 *   - GET  /api/analytics/*   → analyticsHandler
 *   - GET  /api/health        → healthHandler
 *   - Everything else         → static assets (public/)
 *
 * Phase 1: Minimal scaffold — health check only, confirms the Worker
 * compiles and runs correctly under wrangler dev.
 */

import type { Env } from "./types";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // ── Phase 1 placeholder routing ────────────────────────────────────────
    // Full routing will be implemented in Phase 5 (API Handlers).
    if (url.pathname === "/api/health") {
      return new Response(
        JSON.stringify({
          status: "ok",
          service: "cloudpulse",
          environment: env.ENVIRONMENT ?? "unknown",
          timestamp: new Date().toISOString(),
          version: "0.1.0",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Temporary catch-all during scaffold phase.
    // Will be replaced by static asset serving + full API routing.
    return new Response(
      JSON.stringify({
        error: "CloudPulse API — Phase 1 Scaffold",
        message: "Full routing not yet implemented. Check /api/health",
        path: url.pathname,
      }),
      {
        status: 501,
        headers: { "Content-Type": "application/json" },
      }
    );
  },
} satisfies ExportedHandler<Env>;
