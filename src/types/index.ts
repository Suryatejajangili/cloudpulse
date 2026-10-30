/**
 * CloudPulse — Shared TypeScript Types & Interfaces
 * Updated in Phase 3 to add DateRange and complete domain types.
 */

// ── Cloudflare Worker Environment Bindings ─────────────────────────────────
export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  ENVIRONMENT: string;
  ALLOWED_ORIGINS: string;
}

// ── Domain: Date Range Filter ──────────────────────────────────────────────
export interface DateRange {
  from?: string; // YYYY-MM-DD (inclusive)
  to?: string;   // YYYY-MM-DD (inclusive)
}

// ── Domain: Page View Event ────────────────────────────────────────────────
export interface PageViewEvent {
  visitor_id: string;  // Anonymous client-generated ID (no PII)
  page_path: string;   // e.g. "/blog/hello-world"
  referrer: string;    // e.g. "https://google.com" or ""
  timestamp: string;   // ISO 8601 UTC — set by backend on ingestion
}

// ── Domain: Analytics Summary ──────────────────────────────────────────────
export interface AnalyticsSummary {
  total_views: number;
  unique_visitors: number;
  today_views: number;
  today_unique_visitors: number;
}

// ── Domain: Page Traffic ───────────────────────────────────────────────────
export interface PageTraffic {
  page_path: string;
  view_count: number;
  unique_visitors: number;
}

// ── Domain: Daily Traffic ──────────────────────────────────────────────────
export interface DailyTraffic {
  date: string;          // YYYY-MM-DD
  view_count: number;
  unique_visitors: number;
}

// ── Domain: Recent Event ──────────────────────────────────────────────────
// visitor_id is deliberately excluded from this type — it must never be
// returned via the API to avoid exposing any kind of user identifier.
export interface RecentEvent {
  event_id: number;
  page_path: string;
  referrer: string;
  timestamp: string;
}

// ── API Response Envelope ─────────────────────────────────────────────────
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
