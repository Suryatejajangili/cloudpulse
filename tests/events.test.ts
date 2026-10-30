import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import worker from "../src/index";
import { testEnv, setupTestDatabase, clearEventsTable } from "./helper";

describe("Event Ingestion Endpoint (POST /api/events)", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await clearEventsTable();
  });

  it("should successfully ingest a valid page view event", async () => {
    const payload = {
      visitor_id: "test-user-uuid-12345",
      page_path: "/pricing",
      referrer: "https://search.engine.com",
    };

    const req = new Request("http://localhost:8787/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://mysite.com",
      },
      body: JSON.stringify(payload),
    });

    const res = await worker.fetch(req, testEnv);
    expect(res.status).toBe(201);

    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.message).toBe("Event recorded");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");

    // Verify persisted directly in D1
    const row = await testEnv.DB.prepare(
      "SELECT * FROM events WHERE visitor_id = ?"
    )
      .bind(payload.visitor_id)
      .first<any>();

    expect(row).toBeDefined();
    expect(row?.page_path).toBe("/pricing");
    expect(row?.referrer).toBe("https://search.engine.com");
    expect(row?.timestamp).toBeDefined();
  });

  it("should reject payloads with missing visitor_id", async () => {
    const req = new Request("http://localhost:8787/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page_path: "/contact" }),
    });

    const res = await worker.fetch(req, testEnv);
    expect(res.status).toBe(400);

    const body = (await res.json()) as any;
    expect(body.success).toBe(false);
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("should reject non-JSON Content-Type", async () => {
    const req = new Request("http://localhost:8787/api/events", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "plain text event",
    });

    const res = await worker.fetch(req, testEnv);
    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error).toContain("Content-Type must be application/json");
  });

  it("should handle malformed JSON gracefully", async () => {
    const req = new Request("http://localhost:8787/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ malformed json ...",
    });

    const res = await worker.fetch(req, testEnv);
    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error).toBe("Invalid JSON body");
  });

  it("should respond to OPTIONS preflight correctly", async () => {
    const req = new Request("http://localhost:8787/api/events", {
      method: "OPTIONS",
      headers: { Origin: "https://thirdparty.org" },
    });

    const res = await worker.fetch(req, testEnv);
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
  });

  it("should return 405 Method Not Allowed for GET /api/events", async () => {
    const req = new Request("http://localhost:8787/api/events", {
      method: "GET",
    });

    const res = await worker.fetch(req, testEnv);
    expect(res.status).toBe(405);
  });
});
