# CloudPulse REST API Documentation

All API endpoints reside under `/api/*`. Standard responses use an envelope structure:

```json
// Success
{
  "success": true,
  "data": { ... }
}

// Error
{
  "success": false,
  "error": "Error description",
  "code": "OPTIONAL_ERROR_CODE"
}
```

---

## 1. Event Ingestion

### `POST /api/events`
Receives a page-view telemetry event from the client tracking snippet and stores it in D1.

- **Content-Type**: `application/json`
- **CORS**: `Access-Control-Allow-Origin: *`

#### Request Body
```json
{
  "visitor_id": "c71a39f0-2f16-43f1-b9fa-986c071d2ee2",
  "page_path": "/blog/serverless-architecture",
  "referrer": "https://news.ycombinator.com"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `visitor_id` | `string` | **Yes** | Anonymous identifier matching `/^[a-zA-Z0-9_-]{8,64}$/`. |
| `page_path` | `string` | **Yes** | Path must start with `/` (max 2048 chars). |
| `referrer` | `string` | No | Optional referrer URL (max 2048 chars). |

#### Responses
- **201 Created**:
  ```json
  {
    "success": true,
    "data": {
      "message": "Event recorded"
    }
  }
  ```
- **400 Bad Request** (Validation Error):
  ```json
  {
    "success": false,
    "error": "visitor_id is required and must be a non-empty string",
    "code": "VALIDATION_ERROR"
  }
  ```
- **405 Method Not Allowed**: If called with `GET`, `PUT`, etc.

---

## 2. Analytics Endpoints

### `GET /api/analytics/summary`
Returns aggregate traffic metrics.

#### Query Parameters
- `from` *(optional)*: `YYYY-MM-DD` (inclusive start date)
- `to` *(optional)*: `YYYY-MM-DD` (inclusive end date)

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "total_views": 1542,
    "unique_visitors": 894,
    "today_views": 128,
    "today_unique_visitors": 64
  }
}
```
*Note: `today_views` and `today_unique_visitors` always reflect the current UTC day.*

---

### `GET /api/analytics/pages`
Returns per-page traffic statistics sorted by view count descending.

#### Query Parameters
- `from` *(optional)*: `YYYY-MM-DD`
- `to` *(optional)*: `YYYY-MM-DD`

#### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "page_path": "/",
      "view_count": 820,
      "unique_visitors": 510
    },
    {
      "page_path": "/docs",
      "view_count": 412,
      "unique_visitors": 240
    }
  ]
}
```

---

### `GET /api/analytics/daily`
Returns daily traffic trends for the last 30 calendar days (UTC).

#### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "date": "2026-10-25",
      "view_count": 142,
      "unique_visitors": 89
    },
    {
      "date": "2026-10-26",
      "view_count": 188,
      "unique_visitors": 112
    }
  ]
}
```

---

### `GET /api/analytics/recent`
Returns the 50 most recent page-view events. For privacy reasons, `visitor_id` is never returned.

#### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "event_id": 4821,
      "page_path": "/pricing",
      "referrer": "https://google.com",
      "timestamp": "2026-10-30T19:42:15.120Z"
    }
  ]
}
```

---

## 3. System & Health

### `GET /api/health`
Lightweight health and liveness probe. Executes without database access.

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "cloudpulse",
    "version": "0.1.0",
    "environment": "development",
    "timestamp": "2026-10-30T20:00:00.000Z"
  }
}
```

