import { env } from "cloudflare:test";
import type { Env } from "../src/types";

export const testEnv = env as unknown as Env;

/**
 * Ensures tables and indexes exist in the test D1 database.
 */
export async function setupTestDatabase(): Promise<void> {
  if (!testEnv.DB) {
    throw new Error("testEnv.DB is not available");
  }

  await testEnv.DB.batch([
    testEnv.DB.prepare(`
      CREATE TABLE IF NOT EXISTS events (
        event_id   INTEGER PRIMARY KEY AUTOINCREMENT,
        visitor_id TEXT    NOT NULL,
        page_path  TEXT    NOT NULL,
        referrer   TEXT    NOT NULL DEFAULT '',
        timestamp  TEXT    NOT NULL
      )
    `),
    testEnv.DB.prepare(
      "CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events (timestamp)"
    ),
    testEnv.DB.prepare(
      "CREATE INDEX IF NOT EXISTS idx_events_page_path ON events (page_path)"
    ),
    testEnv.DB.prepare(
      "CREATE INDEX IF NOT EXISTS idx_events_visitor_id ON events (visitor_id)"
    ),
  ]);
}

/**
 * Wipes all records from the events table between test runs.
 */
export async function clearEventsTable(): Promise<void> {
  await testEnv.DB.prepare("DELETE FROM events").run();
}
