# CloudPulse Security & Privacy Model

---

## 1. Security Architecture Principles

### 1.1 Zero Secrets in Source Code
- All configuration is sourced from `wrangler.jsonc` environment variables or runtime bindings.
- No database credentials, tokens, or passwords are hardcoded in source files.
- Sensitive production secrets (if needed in the future) are managed via `wrangler secret put <KEY>`.

### 1.2 Boundary Validation & Sanitization
- All incoming requests undergo strict validation before reaching business logic or database queries (`validateEventPayload`, `parseDateRange`).
- `visitor_id` is restricted to `/^[a-zA-Z0-9_-]{8,64}$/`. This prevents arbitrary injections, shell expansions, and prevents users from submitting emails, credit cards, or PII as visitor identifiers.
- Maximum string length limits are enforced on `page_path` (2,048 chars) and `referrer` (2,048 chars) to mitigate buffer and payload exhaustion attacks.

### 1.3 Injection Prevention via Parameterized SQL
- CloudPulse strictly uses Cloudflare D1 prepared statements with `.bind(...)`.
- Direct string interpolation into SQL queries is completely forbidden throughout the codebase.

### 1.4 Safe Error Handling & Information Leakage Prevention
- Internal database exceptions, stack traces, and SQL syntax errors are caught at the handler boundary and logged to server-side logs (`console.error`).
- Clients receive a sanitized `{ success: false, error: "Internal server error" }` with HTTP 500 status code.
- Database connection strings or internal file paths are never surfaced to the browser.

### 1.5 No Direct Database Access
- Frontend JavaScript and tracking clients communicate solely with the Worker's REST API.
- The Cloudflare D1 binding (`env.DB`) is only accessible within the secure V8 isolate worker context on Cloudflare's edge.

---

## 2. Privacy & Data Protection Compliance

1. **GDPR / CCPA Alignment**:
   - **No IP Addresses**: Client IP addresses are discarded at the edge and never stored.
   - **No Cookies**: The tracking script does not set or read HTTP cookies.
   - **No Fingerprinting**: Canvas fingerprinting, audio fingerprinting, and device enumeration are explicitly avoided.
   - **Anonymity**: Visitor IDs are pseudonymous random identifiers generated on the client device.
2. **Data Minimization**:
   - Only 4 data points are collected: `visitor_id`, `page_path`, `referrer`, and `timestamp`.

---

## 3. Rate Limiting & Abuse Mitigation

### 1.6 Authentication for Analytics Read Endpoints
- Ingestion (`POST /api/events`) remains public and unauthenticated so that the embeddable `tracker.js` script can send telemetry beacons from arbitrary client browsers.
- Analytics endpoints (`GET /api/analytics/*`) support API key protection via the `ANALYTICS_API_KEY` secret or environment variable.
- When `ANALYTICS_API_KEY` is configured, requests must supply a valid token via either:
  - `Authorization: Bearer <ANALYTICS_API_KEY>`
  - `X-API-Key: <ANALYTICS_API_KEY>`
- Unauthenticated requests receive `HTTP 401 Unauthorized`.
- If `ANALYTICS_API_KEY` is not set or empty, requests are permitted (suitable for initial local development).

### Current Edge Protections
- Cloudflare automatically provides DDoS mitigation and L3/L4 attack filtering for all Workers routes.
- The `POST /api/events` endpoint rejects non-JSON payloads, missing headers, and malformed bodies with zero DB interactions.

### Limitations & Recommended Future Hardening
1. **Analytics Endpoint Authentication**: Currently, `GET /api/analytics/*` endpoints are open for educational and demonstration purposes. In commercial production, protect `/api/analytics/*` with Cloudflare Access (Zero Trust) or JWT API bearer tokens.
2. **Cloudflare WAF Rate Limiting**: On paid tiers or custom domains, configure Cloudflare Rate Limiting rules (e.g. 50 requests / 10 seconds per IP on `/api/events`).
3. **Bot Mitigation**: Integrate Cloudflare Turnstile for CAPTCHA-free bot challenge verification on public endpoints.

