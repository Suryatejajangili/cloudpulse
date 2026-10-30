import type { Env } from "../types";
import type { CorsHeaders } from "../utils/cors";
import { successResponse } from "../utils/errors";

/**
 * GET /api/health
 * Returns service health information. No DB query — kept lightweight
 * so it can serve as an uptime/liveness probe without side-effects.
 */
export function healthHandler(
  _request: Request,
  env: Env,
  corsHeaders: CorsHeaders
): Response {
  return successResponse(
    {
      status: "ok",
      service: "cloudpulse",
      version: "0.1.0",
      environment: env.ENVIRONMENT ?? "unknown",
      timestamp: new Date().toISOString(),
    },
    corsHeaders
  );
}

