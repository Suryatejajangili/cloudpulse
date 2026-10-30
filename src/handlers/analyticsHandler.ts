import type { Env } from "../types";
import type { CorsHeaders } from "../utils/cors";
import { D1AnalyticsRepository } from "../repositories/D1AnalyticsRepository";
import { AnalyticsQueryService } from "../services/AnalyticsQueryService";
import { getConfig } from "../config";
import { parseDateRange } from "../utils/validation";
import { clientError, notFound, serverError, successResponse } from "../utils/errors";
function makeService(env: Env): AnalyticsQueryService {
  const cfg = getConfig(env);
  const repo = new D1AnalyticsRepository(env.DB);
  return new AnalyticsQueryService(repo, cfg.maxDailyDays, cfg.maxRecentEvents, cfg.maxPageRows);
}

/**
 * GET /api/analytics/summary[?from=YYYY-MM-DD&to=YYYY-MM-DD]
 */
export async function summaryHandler(
  request: Request,
  env: Env,
  corsHeaders: CorsHeaders
): Promise<Response> {
  const url = new URL(request.url);
  const parsed = parseDateRange(url.searchParams);
  if (!parsed.ok) return clientError(parsed.error, corsHeaders);

  try {
    const data = await makeService(env).getSummary(parsed.range);
    return successResponse(data, corsHeaders);
  } catch (err) {
    console.error("[summaryHandler]", err);
    return serverError(corsHeaders);
  }
}

/**
 * GET /api/analytics/pages[?from=YYYY-MM-DD&to=YYYY-MM-DD]
 */
export async function pagesHandler(
  request: Request,
  env: Env,
  corsHeaders: CorsHeaders
): Promise<Response> {
  const url = new URL(request.url);
  const parsed = parseDateRange(url.searchParams);
  if (!parsed.ok) return clientError(parsed.error, corsHeaders);

  try {
    const data = await makeService(env).getPageTraffic(parsed.range);
    return successResponse(data, corsHeaders);
  } catch (err) {
    console.error("[pagesHandler]", err);
    return serverError(corsHeaders);
  }
}

/**
 * GET /api/analytics/daily
 */
export async function dailyHandler(
  _request: Request,
  env: Env,
  corsHeaders: CorsHeaders
): Promise<Response> {
  try {
    const data = await makeService(env).getDailyTraffic();
    return successResponse(data, corsHeaders);
  } catch (err) {
    console.error("[dailyHandler]", err);
    return serverError(corsHeaders);
  }
}

/**
 * GET /api/analytics/recent
 */
export async function recentHandler(
  _request: Request,
  env: Env,
  corsHeaders: CorsHeaders
): Promise<Response> {
  try {
    const data = await makeService(env).getRecentEvents();
    return successResponse(data, corsHeaders);
  } catch (err) {
    console.error("[recentHandler]", err);
    return serverError(corsHeaders);
  }
}

/**
 * Catch-all for unknown /api/analytics/* sub-paths.
 */
export function analyticsNotFound(corsHeaders: CorsHeaders): Response {
  return notFound(corsHeaders);
}
