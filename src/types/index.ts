/**
 * CloudPulse — Shared TypeScript Types & Interfaces
 *
 * This file defines:
 *   - Env: the Cloudflare Worker environment bindings (D1, vars, etc.)
 *   - Domain types that are used across handlers, services, and repositories
 *
 * Phases 3–5 will add more types as the repository and service layers are built.
 */

// ── Cloudflare Worker Environment Bindings ─────────────────────────────────
// This interface must match the bindings declared in wrangler.jsonc exactly.
// Cloudflare injects these at runtime via the Worker's `env` parameter.
export interface Env {
  // D1 database binding — declared as "DB" in wrangler.jsonc
  DB: D1Database;

  // Static asset binding — declared as "ASSETS" in wrangler.jsonc
  ASSETS: Fetcher;

  // Non-secret environment variables from wrangler.jsonc [vars]
  ENVIRONMENT: string;
  ALLOWED_ORIGINS: string;
}

// ── Domain: Page View Event ────────────────────────────────────────────────
// Represents a single page view as received from the tracker script.
export interface PageViewEvent {
  visitor_id: string;   // Anonymous, client-generated UUID (no PII)
  page_path: string;    // e.g. "/blog/hello-world"
  referrer: string;     // e.g. "https://google.com" or "" if direct
  timestamp: string;    // ISO 8601 UTC — set by the backend on receipt
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
  date: string;         // YYYY-MM-DD
  view_count: number;
  unique_visitors: number;
}

// ── Domain: Recent Event ──────────────────────────────────────────────────
export interface RecentEvent {
  event_id: number;
  page_path: string;
  referrer: string;
  timestamp: string;    // ISO 8601 — visitor_id deliberately excluded
}

// ── API Response Envelope ─────────────────────────────────────────────────
// Consistent shape for all API responses.
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
