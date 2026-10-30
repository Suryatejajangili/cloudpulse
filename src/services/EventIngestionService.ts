import type { PageViewEvent } from "../types";
import type { IAnalyticsRepository } from "../repositories/IAnalyticsRepository";
import { validateEventPayload } from "../utils/validation";

export class EventIngestionError extends Error {
  constructor(
    message: string,
    public readonly isValidationError: boolean = false
  ) {
    super(message);
    this.name = "EventIngestionError";
  }
}

/**
 * EventIngestionService — business logic for receiving page-view events.
 *
 * Responsibilities:
 *   • Validate the raw payload (delegates to validation util).
 *   • Sanitise and normalise fields before storage.
 *   • Stamp the server-side UTC timestamp (client timestamp is ignored).
 *   • Delegate persistence to the repository.
 *
 * The service is decoupled from HTTP concerns — handlers convert
 * HTTP request/response; this service only deals with domain objects.
 */
export class EventIngestionService {
  constructor(private readonly repo: IAnalyticsRepository) {}

  async ingest(rawBody: unknown): Promise<void> {
    const validation = validateEventPayload(rawBody);
    if (!validation.valid) {
      throw new EventIngestionError(validation.errors.join("; "), true);
    }

    const body = rawBody as Record<string, unknown>;

    const event: PageViewEvent = {
      visitor_id: (body.visitor_id as string).trim(),
      page_path: (body.page_path as string).trim(),
      referrer: typeof body.referrer === "string" ? body.referrer.trim() : "",
      // Server-side timestamp — the client's clock is untrusted.
      timestamp: new Date().toISOString(),
    };

    await this.repo.insertEvent(event);
  }
}

