# CloudPulse — Serverless Website Analytics Platform

A lightweight, privacy-preserving, production-minded serverless website analytics platform engineered for the **Cloudflare Free tier** with an architected migration path to **AWS Serverless (Lambda + DynamoDB)**.

![CloudPulse Architecture](https://img.shields.io/badge/Architecture-Serverless%20Isolates-blue?style=flat-square)
![Runtime](https://img.shields.io/badge/Cloudflare-Workers%20%2B%20D1-orange?style=flat-square)
![TypeScript](https://img.shields.io/badge/Language-TypeScript%205-blue?style=flat-square)
![Tests](https://img.shields.io/badge/Tests-28%20Passed-success?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-lightgrey?style=flat-square)

---

## 1. Overview & Key Capabilities

- **Serverless Edge Performance**: Edge execution via Cloudflare Workers with 0ms cold starts.
- **Privacy-First**: No cookies, no IP address logging, no device fingerprinting, and zero PII collected.
- **SaaS Dark Monitoring Dashboard**: Real-time traffic metrics, Chart.js trends, page-wise breakdown, recent events feed, and date range filters.
- **Zero-Dependency Tracker (`tracker.js`)**: Tiny, non-blocking client tracking snippet (<1.5 KB) with dynamic origin detection and keepalive beaconing.
- **Abstract Repository Architecture**: Clean separation of business logic (`IAnalyticsRepository`) enabling frictionless database migration to AWS DynamoDB.
- **Automated Testing Suite**: 28 automated tests running in real Cloudflare Miniflare runtime with Vitest.

---

## 2. Architecture Diagram

```
[ Visitor Browser ]                          [ CloudPulse on Cloudflare Edge ]
        │                                                     │
        │ <script src="/tracker.js" defer></script>           │
        ├────────────────────────────────────────────────────▶│ Worker (TypeScript)
        │ POST /api/events (non-blocking)                     │   ├─ Ingestion Service
        │                                                     │   ├─ Validation Layer
[ Admin / User ]                                              │   └─ D1 Repository
        │                                                     │         │
        ├────────────────────────────────────────────────────▶│         ▼
        │ GET /                                               │ Cloudflare D1 (SQLite)
        │ GET /api/analytics/*                                │  - events table
        │ (Static Dashboard + REST APIs)                      │  - indexes
```

Detailed architectural specifications are documented in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## 3. Prerequisites

- **Node.js**: `v18.0.0` or higher (verified on `v26.13.0` LTS)
- **npm**: `v9.0.0` or higher (verified on `v11.20.0`)
- **Git**: Installed locally
- **Cloudflare Account**: Free tier (required only for remote deployment)

---

## 4. Installation & Local Setup

Clone the repository and install dependencies in your WSL / Linux terminal:

```bash
git clone <repository-url>
cd CloudPulse

# Install local dependencies (Wrangler, TypeScript, Vitest)
npm install
```

---

## 5. Local Database Migration

CloudPulse stores event logs in Cloudflare D1. Initialize the local SQLite database schema:

```bash
npm run db:migrate:local
```
*Applies [`migrations/0001_create_events.sql`](migrations/0001_create_events.sql) to `.wrangler/state/v3/d1`.*

---

## 6. Running Local Development Server

Launch the local development server with hot-reloading:

```bash
npm run dev
```

The application will start locally:
- **Dashboard UI**: [http://localhost:8787](http://localhost:8787)
- **Tracking Snippet**: [http://localhost:8787/tracker.js](http://localhost:8787/tracker.js)
- **API Health Check**: [http://localhost:8787/api/health](http://localhost:8787/api/health)

---

## 7. Automated Testing & Type Checking

Run the comprehensive test suite (runs in Cloudflare's Miniflare environment):

```bash
# Run 28 automated tests
npm test

# Run TypeScript compiler checks
npm run typecheck
```

---

## 8. Website Integration Guide

Add this single snippet to any website's HTML `<head>` or before `</body>`:

```html
<script src="https://YOUR-WORKER-SUBDOMAIN.workers.dev/tracker.js" defer></script>
```

The tracker automatically:
1. Generates an anonymous, pseudonymous UUID token in `localStorage`.
2. Captures `window.location.pathname` and `document.referrer`.
3. Sends a lightweight beacon to `POST /api/events`.

---

## 9. Cloudflare Free Tier Deployment Procedure

> **SAFETY NOTICE**: CloudPulse is fully tested locally. Do not execute remote commands without reviewing the safety instructions below.

### Step 1: Login to Cloudflare CLI
```bash
npx wrangler login
```

### Step 2: Create Remote D1 Database (Free Tier)
```bash
npx wrangler d1 create cloudpulse-db
```
*This outputs a UUID (e.g. `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`). Copy this UUID into `wrangler.jsonc` under `d1_databases[0].database_id`.*

### Step 3: Apply Remote Database Migrations
```bash
npx wrangler d1 migrations apply cloudpulse-db --remote
```

### Step 4: Deploy the Worker & Static Dashboard
```bash
npx wrangler deploy
```

Your dashboard and tracking endpoint will immediately be live at `https://cloudpulse.<your-account>.workers.dev`.

---

## 10. AWS Migration Roadmap

CloudPulse was architected so that the data layer can migrate to **AWS Lambda + Amazon DynamoDB** without rewriting business logic.

- **Data Layer Interface**: [`src/repositories/IAnalyticsRepository.ts`](src/repositories/IAnalyticsRepository.ts)
- **Migration Blueprint**: Detailed guide on single-table DynamoDB design and API Gateway mapping in [`docs/AWS_MIGRATION.md`](docs/AWS_MIGRATION.md).

---

## 11. Documentation Index

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — System architecture, V8 isolate lifecycle, component boundaries
- [`docs/DATABASE.md`](docs/DATABASE.md) — D1 schema, index performance, query design
- [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md) — REST API specification, request/response examples
- [`docs/SECURITY.md`](docs/SECURITY.md) — Privacy principles, CORS, sanitization, rate limiting
- [`docs/AWS_MIGRATION.md`](docs/AWS_MIGRATION.md) — Step-by-step AWS Lambda & DynamoDB migration blueprint
