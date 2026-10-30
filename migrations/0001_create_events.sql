-- CloudPulse: Initial database schema
-- Migration: 0001_create_events
--
-- Design decisions:
--   • event_id: AUTOINCREMENT primary key (INTEGER for SQLite efficiency)
--   • visitor_id: anonymous client-generated ID — no PII stored
--   • timestamp: ISO 8601 UTC string — sortable lexicographically
--   • referrer: stored as raw string, empty string when absent
--   • No IP addresses, no user agents, no emails — privacy by design
--
-- Indexes:
--   • timestamp  → range queries (daily trends, date filtering)
--   • page_path  → GROUP BY queries (page traffic stats)
--   • visitor_id → COUNT(DISTINCT visitor_id) for unique visitor counts

CREATE TABLE IF NOT EXISTS events (
  event_id   INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_id TEXT    NOT NULL,
  page_path  TEXT    NOT NULL,
  referrer   TEXT    NOT NULL DEFAULT '',
  timestamp  TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_timestamp  ON events (timestamp);
CREATE INDEX IF NOT EXISTS idx_events_page_path  ON events (page_path);
CREATE INDEX IF NOT EXISTS idx_events_visitor_id ON events (visitor_id);

