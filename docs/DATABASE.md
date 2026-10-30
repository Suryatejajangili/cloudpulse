# CloudPulse Database Design (Cloudflare D1)

CloudPulse uses **Cloudflare D1**, a globally distributed serverless SQL database built on SQLite.

---

## 1. Schema Definition

The initial database migration is defined in [`migrations/0001_create_events.sql`](../migrations/0001_create_events.sql):

```sql
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
```

### Column Specifications

| Column Name | Data Type | Nullable | Default | Description |
|---|---|---|---|---|
| `event_id` | `INTEGER` | No | Auto-increment | Unique surrogate primary key. |
| `visitor_id` | `TEXT` | No | None | Anonymous client-generated UUID (8–64 chars). No PII. |
| `page_path` | `TEXT` | No | None | Normalized URI path (e.g. `/docs/quickstart`). |
| `referrer` | `TEXT` | No | `''` | Document referrer string or empty for direct visits. |
| `timestamp` | `TEXT` | No | None | ISO 8601 UTC string (`YYYY-MM-DDTHH:mm:ss.sssZ`). |

---

## 2. Indexing Strategy

SQLite builds B-Tree indexes that significantly accelerate read queries:

1. **`idx_events_timestamp` (`timestamp`)**:
   - Accelerates daily aggregations (`WHERE timestamp >= datetime('now', '-30 days')`).
   - Supports date-range filtering (`WHERE timestamp >= ? AND timestamp <= ?`).
   - Powers chronological ordering for recent events (`ORDER BY timestamp DESC LIMIT ?`).

2. **`idx_events_page_path` (`page_path`)**:
   - Accelerates `GROUP BY page_path` queries in page-wise traffic calculations.
   - Allows index-assisted lookups for traffic-by-page breakdowns.

3. **`idx_events_visitor_id` (`visitor_id`)**:
   - Accelerates `COUNT(DISTINCT visitor_id)` computations for unique visitor reporting across specific pages and time windows.

---

## 3. Parameterized SQL & Query Architecture

All queries inside [`D1AnalyticsRepository.ts`](../src/repositories/D1AnalyticsRepository.ts) strictly use D1 prepared statements to prevent SQL injection vulnerabilities:

### Example: Summary Aggregation
```typescript
const totalRow = await this.db
  .prepare(
    `SELECT COUNT(*) AS total_views,
            COUNT(DISTINCT visitor_id) AS unique_visitors
     FROM events ${clause}`
  )
  .bind(...params)
  .first<SummaryTotalRow>();
```

### Example: Event Insertion
```typescript
await this.db
  .prepare(
    "INSERT INTO events (visitor_id, page_path, referrer, timestamp) VALUES (?, ?, ?, ?)"
  )
  .bind(event.visitor_id, event.page_path, event.referrer, event.timestamp)
  .run();
```

---

## 4. Migration Workflow

Migrations are managed via the official Wrangler D1 migration engine:

### Local Development Migration
Applies migrations to `.wrangler/state/v3/d1` without connecting to any remote Cloudflare service:
```bash
npm run db:migrate:local
# Underlying command: npx wrangler d1 migrations apply cloudpulse-db --local
```

### Remote Production Migration
Requires explicit user approval and a valid Cloudflare account login:
```bash
npm run db:migrate:remote
# Underling command: npx wrangler d1 migrations apply cloudpulse-db --remote
```

