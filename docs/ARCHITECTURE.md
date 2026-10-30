# CloudPulse Architecture

CloudPulse is a serverless, privacy-first website analytics platform engineered for the **Cloudflare Free tier** with an explicit migration path to **AWS Serverless (Lambda + DynamoDB)**.

---

## 1. High-Level Architecture

```
Visitor Browser                                  Cloudflare Edge (Free Tier)
┌─────────────────┐                                ┌────────────────────────────────────────┐
│   Website       │                                │  Worker (TypeScript / V8 Isolate)      │
│  ┌───────────┐  │  POST /api/events              │  ┌──────────────────────────────────┐  │
│  │tracker.js │──┼───────────────────────────────┼─▶│ Request Router (src/index.ts)    │  │
│  └───────────┘  │  (non-blocking JSON beacon)    │  └────────────────┬─────────────────┘  │
└─────────────────┘                                │                   │                    │
                                                   │                   ▼                    │
Admin / Analyst Browser                            │  ┌──────────────────────────────────┐  │
┌─────────────────┐                                │  │ Business Services                │  │
│  Dashboard SPA  │  GET /api/analytics/*          │  │ • EventIngestionService          │  │
│  ┌───────────┐  │  GET /api/health               │  │ • AnalyticsQueryService          │  │
│  │Chart.js UI│──┼───────────────────────────────┼─▶│ └────────────────┬─────────────────┘  │
│  └───────────┘  │                                │                    │                    │
└─────────────────┘                                │                    ▼                    │
        ▲                                          │  ┌──────────────────────────────────┐  │
        │ Static Asset Serving                     │  │ Repository Seam                  │  │
        └──────────────────────────────────────────┼─▶│ IAnalyticsRepository (Interface) │  │
                                                   │  └────────────────┬─────────────────┘  │
                                                   │                   │                    │
                                                   │                   ▼                    │
                                                   │  ┌──────────────────────────────────┐  │
                                                   │  │ D1AnalyticsRepository            │  │
                                                   │  │ (SQLite Prepared Statements)     │  │
                                                   │  └────────────────┬─────────────────┘  │
                                                   └───────────────────┼────────────────────┘
                                                                       ▼
                                                       ┌────────────────────────────────┐
                                                       │ Cloudflare D1 (cloudpulse-db)  │
                                                       │  - events table                │
                                                       │  - 3 B-Tree secondary indexes  │
                                                       └────────────────────────────────┘
```

---

## 2. Layered Component Design

CloudPulse enforces clean separation of concerns to avoid vendor lock-in:

### 2.1 Transport Layer (`src/index.ts`, `src/utils/cors.ts`)
- Serves as the central HTTP router.
- Handles CORS preflights (`OPTIONS`) immediately without invoking downstream business logic or database queries.
- Routes `/api/*` endpoints to dedicated handlers.
- Serves static dashboard assets for non-API routes via Cloudflare Workers Static Assets (`env.ASSETS`).

### 2.2 Handler Layer (`src/handlers/`)
- Parses request payloads, headers, and query parameters.
- Validates data boundaries (`validateEventPayload`, `parseDateRange`).
- Translates service outcomes into standardized JSON HTTP responses (`ApiSuccess<T>`, `ApiError`).

### 2.3 Domain & Service Layer (`src/services/`)
- Contains pure business logic agnostic of Cloudflare, HTTP, or SQLite:
  - **`EventIngestionService`**: Validates visitor IDs, normalizes page paths, stamps authoritative server-side UTC timestamps (ignoring untrusted client clocks), and persists events.
  - **`AnalyticsQueryService`**: Enforces query parameter limits, pagination windows, and default intervals (e.g. 30-day daily traffic limit).

### 2.4 Data Repository Abstraction (`src/repositories/`)
- **`IAnalyticsRepository`**: An abstract TypeScript contract defining persistence and analytical query operations:
  ```typescript
  export interface IAnalyticsRepository {
    insertEvent(event: PageViewEvent): Promise<void>;
    getSummary(dateRange?: DateRange): Promise<AnalyticsSummary>;
    getPageTraffic(dateRange?: DateRange, limit?: number): Promise<PageTraffic[]>;
    getDailyTraffic(days?: number): Promise<DailyTraffic[]>;
    getRecentEvents(limit?: number): Promise<RecentEvent[]>;
  }
  ```
- **`D1AnalyticsRepository`**: The Cloudflare D1 implementation using parameterized prepared statements.

---

## 3. Technology Choices & Rationale

| Layer | Technology | Rationale |
|---|---|---|
| **Runtime** | Cloudflare Workers | Instant cold starts (0ms V8 isolates), 100,000 req/day free tier, global edge presence. |
| **Language** | TypeScript (ES2022) | Type safety across domain contracts, interfaces, and compile-time validation. |
| **Database** | Cloudflare D1 (SQLite) | Embedded edge SQL database, ACID compliance, zero maintenance, free tier (5M reads/day, 100k writes/day). |
| **Testing** | Vitest + `@cloudflare/vitest-plugin` | Executes tests against the real Cloudflare Miniflare runtime environment instead of mock stubs. |
| **Frontend** | Vanilla JS + HTML5 + CSS3 | Zero client-side build step, ultra-fast load time, no bloated framework runtime. |
| **Visualization** | Chart.js (CDN) | Lightweight, responsive canvas rendering for traffic trends and page breakdowns. |

---

## 4. Privacy-By-Design Philosophy

1. **Zero Personal Identifiable Information (PII)**:
   - No IP addresses are stored or logged.
   - No user agents, fingerprints, device IDs, or geolocation are captured.
   - No cookies or advertising identifiers are created.
2. **Pseudonymous Visitor Identification**:
   - The tracking client generates a random UUID v4 stored in `localStorage`.
   - The backend validates that visitor IDs conform strictly to `/^[a-zA-Z0-9_-]{8,64}$/`. Any payload attempting to send an email or personal token is rejected.
   - Visitor IDs are never exposed in public query responses (e.g. `/api/analytics/recent`).

