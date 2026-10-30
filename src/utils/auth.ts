import type { Env } from "../types";

/**
 * Authentication utility for CloudPulse Analytics Endpoints.
 *
 * Policy:
 *  - Event ingestion (POST /api/events) is ALWAYS public for third-party trackers.
 *  - Health check (GET /api/health) is ALWAYS public for monitoring probes.
 *  - Analytics query endpoints (GET /api/analytics/*) require authentication
 *    if ANALYTICS_API_KEY is configured in the environment.
 *  - If ANALYTICS_API_KEY is not set or empty, requests are permitted (convenient for local dev).
 *  - Supports both `Authorization: Bearer <token>` and `X-API-Key: <token>`.
 */
export function isAuthorized(request: Request, env: Env): boolean {
  const configuredKey = env.ANALYTICS_API_KEY;

  // If no key is configured, pass through (e.g. initial dev setup)
  if (!configuredKey || configuredKey.trim() === "") {
    return true;
  }

  // 1. Check X-API-Key header
  const apiKey = request.headers.get("X-API-Key");
  if (apiKey && apiKey === configuredKey) {
    return true;
  }

  // 2. Check Authorization: Bearer <token>
  const authHeader = request.headers.get("Authorization");
  if (authHeader) {
    const parts = authHeader.trim().split(/\s+/);
    if (parts.length === 2 && parts[0].toLowerCase() === "bearer" && parts[1] === configuredKey) {
      return true;
    }
  }

  return false;
}
