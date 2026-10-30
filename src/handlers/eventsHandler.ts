import type { Env } from "../types";
import type { CorsHeaders } from "../utils/cors";
import { D1AnalyticsRepository } from "../repositories/D1AnalyticsRepository";
import { EventIngestionService, EventIngestionError } from "../services/EventIngestionService";
import { clientError, createdResponse, serverError } from "../utils/errors";

/**
 * POST /api/events
 * Receives a page-view event from the tracker script, validates it,
 * and persists it to D1.
 */
export async function eventsHandler(
  request: Request,
  env: Env,
  corsHeaders: CorsHeaders
): Promise<Response> {
  // Only accept JSON
  const contentType = request.headers.get("Content-Type") ?? "";
  if (!contentType.includes("application/json")) {
    return clientError("Content-Type must be application/json", corsHeaders);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return clientError("Invalid JSON body", corsHeaders);
  }

  const repo = new D1AnalyticsRepository(env.DB);
  const service = new EventIngestionService(repo);

  try {
    await service.ingest(body);
    return createdResponse({ message: "Event recorded" }, corsHeaders);
  } catch (err) {
    if (err instanceof EventIngestionError && err.isValidationError) {
      return clientError(err.message, corsHeaders, "VALIDATION_ERROR");
    }
    console.error("[eventsHandler] DB error:", err);
    return serverError(corsHeaders);
  }
}

