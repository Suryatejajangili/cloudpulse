import type {
  AnalyticsSummary,
  DailyTraffic,
  DateRange,
  PageTraffic,
  RecentEvent,
} from "../types";
import type { IAnalyticsRepository } from "../repositories/IAnalyticsRepository";

/**
 * AnalyticsQueryService — business logic for reading analytics data.
 *
 * This layer exists to:
 *   • Be the single place where query defaults are enforced.
 *   • Allow future business rules (e.g. sampling, caching) without
 *     touching handlers or the repository.
 *   • Keep handlers thin — they parse HTTP; this service returns data.
 */
export class AnalyticsQueryService {
  constructor(
    private readonly repo: IAnalyticsRepository,
    private readonly maxDailyDays: number,
    private readonly maxRecentEvents: number,
    private readonly maxPageRows: number
  ) {}

  async getSummary(dateRange?: DateRange): Promise<AnalyticsSummary> {
    return this.repo.getSummary(dateRange);
  }

  async getPageTraffic(dateRange?: DateRange): Promise<PageTraffic[]> {
    return this.repo.getPageTraffic(dateRange, this.maxPageRows);
  }

  async getDailyTraffic(): Promise<DailyTraffic[]> {
    return this.repo.getDailyTraffic(this.maxDailyDays);
  }

  async getRecentEvents(): Promise<RecentEvent[]> {
    return this.repo.getRecentEvents(this.maxRecentEvents);
  }
}

