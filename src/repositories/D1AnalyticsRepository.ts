import type {
  AnalyticsSummary,
  DailyTraffic,
  DateRange,
  PageTraffic,
  PageViewEvent,
  RecentEvent,
} from "../types";
import type { IAnalyticsRepository } from "./IAnalyticsRepository";

// ── Internal row shapes ────────────────────────────────────────────────────
// These match the column aliases used in SELECT queries.

interface SummaryTotalRow {
  total_views: number;
  unique_visitors: number;
}

interface SummaryTodayRow {
  today_views: number;
  today_unique_visitors: number;
}

interface PageTrafficRow {
  page_path: string;
  view_count: number;
  unique_visitors: number;
}

interface DailyTrafficRow {
  date: string;
  view_count: number;
  unique_visitors: number;
}

interface RecentEventRow {
  event_id: number;
  page_path: string;
  referrer: string;
  timestamp: string;
}

// ── Helper: Build WHERE clause from optional DateRange ─────────────────────
function dateFilter(
  dateRange: DateRange | undefined
): { clause: string; params: string[] } {
  const conditions: string[] = [];
  const params: string[] = [];

  if (dateRange?.from) {
    conditions.push("timestamp >= ?");
    params.push(`${dateRange.from}T00:00:00.000Z`);
  }
  if (dateRange?.to) {
    conditions.push("timestamp <= ?");
    params.push(`${dateRange.to}T23:59:59.999Z`);
  }

  return {
    clause: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}

// ── D1 Implementation ──────────────────────────────────────────────────────

export class D1AnalyticsRepository implements IAnalyticsRepository {
  constructor(private readonly db: D1Database) {}

  async insertEvent(event: PageViewEvent): Promise<void> {
    await this.db
      .prepare(
        "INSERT INTO events (visitor_id, page_path, referrer, timestamp) VALUES (?, ?, ?, ?)"
      )
      .bind(event.visitor_id, event.page_path, event.referrer, event.timestamp)
      .run();
  }

  async getSummary(dateRange?: DateRange): Promise<AnalyticsSummary> {
    const { clause, params } = dateFilter(dateRange);

    // Total views and unique visitors (with optional date range).
    const totalRow = await this.db
      .prepare(
        `SELECT COUNT(*) AS total_views,
                COUNT(DISTINCT visitor_id) AS unique_visitors
         FROM events ${clause}`
      )
      .bind(...params)
      .first<SummaryTotalRow>();

    // Today's metrics always reflect the current UTC day — not date-range-filtered.
    const todayRow = await this.db
      .prepare(
        `SELECT COUNT(*) AS today_views,
                COUNT(DISTINCT visitor_id) AS today_unique_visitors
         FROM events
         WHERE date(timestamp) = date('now')`
      )
      .first<SummaryTodayRow>();

    return {
      total_views: totalRow?.total_views ?? 0,
      unique_visitors: totalRow?.unique_visitors ?? 0,
      today_views: todayRow?.today_views ?? 0,
      today_unique_visitors: todayRow?.today_unique_visitors ?? 0,
    };
  }

  async getPageTraffic(
    dateRange?: DateRange,
    limit = 50
  ): Promise<PageTraffic[]> {
    const { clause, params } = dateFilter(dateRange);

    const result = await this.db
      .prepare(
        `SELECT page_path,
                COUNT(*) AS view_count,
                COUNT(DISTINCT visitor_id) AS unique_visitors
         FROM events ${clause}
         GROUP BY page_path
         ORDER BY view_count DESC
         LIMIT ?`
      )
      .bind(...params, limit)
      .all<PageTrafficRow>();

    return result.results.map((r) => ({
      page_path: r.page_path,
      view_count: r.view_count,
      unique_visitors: r.unique_visitors,
    }));
  }

  async getDailyTraffic(days = 30): Promise<DailyTraffic[]> {
    const result = await this.db
      .prepare(
        `SELECT date(timestamp) AS date,
                COUNT(*) AS view_count,
                COUNT(DISTINCT visitor_id) AS unique_visitors
         FROM events
         WHERE timestamp >= datetime('now', ? || ' days')
         GROUP BY date(timestamp)
         ORDER BY date ASC`
      )
      .bind(`-${days}`)
      .all<DailyTrafficRow>();

    return result.results.map((r) => ({
      date: r.date,
      view_count: r.view_count,
      unique_visitors: r.unique_visitors,
    }));
  }

  async getRecentEvents(limit = 50): Promise<RecentEvent[]> {
    // visitor_id is deliberately excluded from SELECT — never expose it via API.
    const result = await this.db
      .prepare(
        `SELECT event_id, page_path, referrer, timestamp
         FROM events
         ORDER BY timestamp DESC
         LIMIT ?`
      )
      .bind(limit)
      .all<RecentEventRow>();

    return result.results.map((r) => ({
      event_id: r.event_id,
      page_path: r.page_path,
      referrer: r.referrer,
      timestamp: r.timestamp,
    }));
  }
}

