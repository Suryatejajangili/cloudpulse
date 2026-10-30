/**
 * CloudPulse — Cloudflare Worker Entry Point
 *
 * Request flow:
 *   1. CORS preflight (OPTIONS) → handled immediately, no auth/DB touched.
 *   2. /api/health              → healthHandler
 *   3. /api/events   (POST)     → eventsHandler
 *   4. /api/analytics/summary   → summaryHandler
 *   5. /api/analytics/pages     → pagesHandler
 *   6. /api/analytics/daily     → dailyHandler
 *   7. /api/analytics/recent    → recentHandler
 *   8. /api/*        (unknown)  → 404
 *   9. Everything else          → static assets served from ./public
 *
 * Handlers receive corsHeaders already built — they never construct them
 * directly, ensuring consistent CORS behaviour across all routes.
 */

import type { Env } from "./types";
import { getConfig } from "./config";
import { buildCorsHeaders, handlePreflight } from "./utils/cors";
import { methodNotAllowed, notFound } from "./utils/errors";
import { healthHandler } from "./handlers/healthHandler";
import { eventsHandler } from "./handlers/eventsHandler";
import {
  analyticsNotFound,
  dailyHandler,
  pagesHandler,
  recentHandler,
  summaryHandler,
} from "./handlers/analyticsHandler";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cfg = getConfig(env);
    const origin = request.headers.get("Origin");
    const cors = buildCorsHeaders(origin, cfg.allowedOrigins);

    // ── CORS preflight ────────────────────────────────────────────────────
    const preflight = handlePreflight(request, cfg.allowedOrigins);
    if (preflight) return preflight;

    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    // ── API routes ────────────────────────────────────────────────────────
    if (pathname.startsWith("/api/")) {
      // Health
      if (pathname === "/api/health") {
        return healthHandler(request, env, cors);
      }

      // Event ingestion
      if (pathname === "/api/events") {
        if (method !== "POST") return methodNotAllowed(cors);
        return eventsHandler(request, env, cors);
      }

      // Analytics — all GET only
      if (pathname.startsWith("/api/analytics/")) {
        if (method !== "GET") return methodNotAllowed(cors);

        if (pathname === "/api/analytics/summary") return summaryHandler(request, env, cors);
        if (pathname === "/api/analytics/pages")   return pagesHandler(request, env, cors);
        if (pathname === "/api/analytics/daily")   return dailyHandler(request, env, cors);
        if (pathname === "/api/analytics/recent")  return recentHandler(request, env, cors);

        return analyticsNotFound(cors);
      }

      // Unknown /api/* path
      return notFound(cors);
    }

    // ── Static assets (dashboard, tracker.js, CSS, JS) ───────────────────
    // Wrangler's ASSETS binding serves files from ./public automatically.
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
