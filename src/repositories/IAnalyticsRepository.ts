import type {
  AnalyticsSummary,
  DailyTraffic,
  DateRange,
  PageTraffic,
  PageViewEvent,
  RecentEvent,
} from "../types";

/**
 * AnalyticsRepository — abstract contract for all data access.
 *
 * This interface is the AWS migration seam. The Cloudflare D1 implementation
 * (D1AnalyticsRepository) can be swapped for a DynamoDB implementation by:
 *   1. Implementing this interface against the DynamoDB SDK.
 *   2. Updating the factory in each handler (or a DI container).
 *   3. Replacing wrangler.jsonc with a CDK/SAM template.
 *   → No handler, service, or business logic changes required.
 */
export interface IAnalyticsRepository {
  /**
   * Persists a single page-view event.
   */
  insertEvent(event: PageViewEvent): Promise<void>;

  /**
   * Returns aggregate summary metrics.
   * today_views / today_unique_visitors always reflect the current UTC day
   * regardless of the dateRange filter (which applies to total_* fields).
   */
  getSummary(dateRange?: DateRange): Promise<AnalyticsSummary>;

  /**
   * Returns per-page traffic breakdown, ordered by view count descending.
   */
  getPageTraffic(dateRange?: DateRange, limit?: number): Promise<PageTraffic[]>;

  /**
   * Returns daily traffic for the last `days` calendar days (UTC).
   * Results are ordered chronologically (oldest first).
   */
  getDailyTraffic(days?: number): Promise<DailyTraffic[]>;

  /**
   * Returns the most recent events, newest first.
   * visitor_id MUST NOT be included in the returned objects.
   */
  getRecentEvents(limit?: number): Promise<RecentEvent[]>;
}

