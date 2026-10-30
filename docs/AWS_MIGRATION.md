# CloudPulse AWS Migration Architecture Document

> **Disclaimer**: This document specifies the architectural blueprint for migrating CloudPulse from Cloudflare Workers + D1 to AWS Serverless (API Gateway, Lambda, DynamoDB, CloudWatch). **No AWS resources have been provisioned or deployed.**

---

## 1. Architectural Mapping

| Cloudflare Component | AWS Equivalent | Purpose |
|---|---|---|
| **Cloudflare Worker** | **AWS Lambda** (Node.js/TypeScript) | Serverless execution environment |
| **Cloudflare D1** | **Amazon DynamoDB** | Fully managed NoSQL key-value & document database |
| **Worker Router** | **Amazon API Gateway** (HTTP API) | REST routing, CORS, rate limiting |
| **Workers Static Assets** | **Amazon S3 + CloudFront** | Static dashboard & `tracker.js` CDN hosting |
| **Worker Logs / Console** | **Amazon CloudWatch Logs & Metrics** | Structured application observability |

---

## 2. The Migration Seam: `IAnalyticsRepository`

The core decoupling in CloudPulse is [`IAnalyticsRepository`](../src/repositories/IAnalyticsRepository.ts). All business logic (`EventIngestionService`, `AnalyticsQueryService`) depends exclusively on this interface.

To migrate to AWS DynamoDB:
1. Retain `src/services/*`, `src/utils/*`, and domain types in `src/types/*` unchanged.
2. Implement `DynamoDBAnalyticsRepository.ts` fulfilling `IAnalyticsRepository`.
3. Wrap the handlers in an AWS Lambda entrypoint (e.g. using `@codegenie/serverless-express` or native Lambda handler events).

---

## 3. DynamoDB Data Modeling (Single-Table Design)

Because DynamoDB is a NoSQL engine, analytical aggregations (like `COUNT(DISTINCT visitor_id)` across time ranges) require thoughtful modeling or pre-aggregation:

### Table Design: `cloudpulse_analytics`
- **Partition Key (`PK`)**: String
- **Sort Key (`SK`)**: String
- **Global Secondary Index (`GSI1`)**: `GSI1PK`, `GSI1SK`

| Entity / Record | `PK` | `SK` | Attributes |
|---|---|---|---|
| **Raw Event** | `EVENT#<event_id>` | `<timestamp>` | `visitor_id`, `page_path`, `referrer`, `timestamp` |
| **Page Lookup (GSI1)** | `PAGE#<page_path>` | `<timestamp>` | `event_id`, `visitor_id` |
| **Daily Aggregate** | `DAILY#<date>` | `METRICS` | `view_count`, `unique_visitors_set` (String Set) |

### Migration Considerations:
- **Writing Events**: High-throughput writes write raw event records. An asynchronous DynamoDB Stream can trigger an aggregation Lambda to update `DAILY#<date>` counters in real-time.
- **Unique Visitors**: In DynamoDB, unique visitors can be calculated precisely using a DynamoDB `SS` (String Set) for daily partitions up to 400KB, or using HyperLogLog / pre-aggregated daily maps for higher volumes.
- **Recent Events**: Queried using a GSI with a constant partition key (e.g. `RECENT_EVENTS`) sorted by ISO timestamp descending.

---

## 4. Lambda & API Gateway Handler Architecture

```typescript
// Example: src/aws/lambdaHandler.ts (Design Blueprint)
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBAnalyticsRepository } from "./DynamoDBAnalyticsRepository";
import { EventIngestionService } from "../services/EventIngestionService";

const ddbClient = new DynamoDBClient({});
const repository = new DynamoDBAnalyticsRepository(ddbClient, process.env.TABLE_NAME!);
const ingestionService = new EventIngestionService(repository);

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const path = event.rawPath;
  const method = event.requestContext.http.method;

  if (path === "/api/events" && method === "POST") {
    const body = JSON.parse(event.body || "{}");
    await ingestionService.ingest(body);
    return {
      statusCode: 201,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ success: true, data: { message: "Event recorded" } }),
    };
  }

  // Handle other routes...
  return { statusCode: 404, body: JSON.stringify({ error: "Not found" }) };
}
```

---

## 5. Infrastructure as Code (IaC) Recommendation

When initiating the AWS deployment, use AWS Cloud Development Kit (AWS CDK) or AWS SAM:
- Define `HttpApi` in API Gateway v2.
- Define `NodejsFunction` with ARM64 architecture (Graviton3) for cost efficiency.
- Define `Table` with On-Demand Billing mode (Pay-Per-Request).
- Configure S3 bucket with CloudFront Origin Access Control (OAC) for frontend assets.
