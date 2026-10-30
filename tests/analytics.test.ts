import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import worker from "../src/index";
import { testEnv, setupTestDatabase, clearEventsTable } from "./helper";

describe("Analytics Endpoints", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await clearEventsTable();
  });

  // Helper to seed events
  async function seedEvents() {
    const now = new Date().toISOString();
    const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

    const insertStmt = testEnv.DB.prepare(
      "INSERT INTO events (visitor_id, page_path, referrer, timestamp) VALUES (?, ?, ?, ?)"
    );

    await testEnv.DB.batch([
      // Visitor 1 visits /home twice today
      insertStmt.bind("user-alpha-001", "/home", "https://google.com", now),
      insertStmt.bind("user-alpha-001", "/home", "", now),
      // Visitor 2 visits /pricing today
      insertStmt.bind("user-beta-002", "/pricing", "https://twitter.com", now),
      // Visitor 1 visits /pricing today
      insertStmt.bind("user-alpha-001", "/pricing", "", now),
      // Visitor 3 visited /blog yesterday
      insertStmt.bind("user-gamma-003", "/blog", "https://news.ycombinator.com", yesterday),
    ]);
  }

  describe("GET /api/analytics/summary", () => {
    it("should calculate correct total views, unique visitors, and today's metrics", async () => {
      await seedEvents();

      const req = new Request("http://localhost:8787/api/analytics/summary", {
        method: "GET",
      });

      const res = await worker.fetch(req, testEnv);
      expect(res.status).toBe(200);

      const body = (await res.json()) as any;
      expect(body.success).toBe(true);

      const d = body.data;
      // 5 total events seeded
      expect(d.total_views).toBe(5);
      // 3 distinct visitors: user-alpha-001, user-beta-002, user-gamma-003
      expect(d.unique_visitors).toBe(3);
      // 4 events occurred today
      expect(d.today_views).toBe(4);
      // 2 distinct visitors today: user-alpha-001, user-beta-002
      expect(d.today_unique_visitors).toBe(2);
    });

    it("should handle empty database gracefully", async () => {
      const req = new Request("http://localhost:8787/api/analytics/summary");
      const res = await worker.fetch(req, testEnv);
      expect(res.status).toBe(200);

      const body = (await res.json()) as any;
      expect(body.data.total_views).toBe(0);
      expect(body.data.unique_visitors).toBe(0);
      expect(body.data.today_views).toBe(0);
      expect(body.data.today_unique_visitors).toBe(0);
    });

    it("should reject invalid date range params", async () => {
      const req = new Request(
        "http://localhost:8787/api/analytics/summary?from=invalid-date"
      );
      const res = await worker.fetch(req, testEnv);
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/analytics/pages", () => {
    it("should return page-wise breakdown ordered by view count descending", async () => {
      await seedEvents();

      const req = new Request("http://localhost:8787/api/analytics/pages");
      const res = await worker.fetch(req, testEnv);
      expect(res.status).toBe(200);

      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      const pages = body.data;

      // /home had 2 views (1 unique visitor)
      // /pricing had 2 views (2 unique visitors)
      // /blog had 1 view (1 unique visitor)
      expect(pages.length).toBe(3);

      const home = pages.find((p: any) => p.page_path === "/home");
      expect(home.view_count).toBe(2);
      expect(home.unique_visitors).toBe(1);

      const pricing = pages.find((p: any) => p.page_path === "/pricing");
      expect(pricing.view_count).toBe(2);
      expect(pricing.unique_visitors).toBe(2);

      const blog = pages.find((p: any) => p.page_path === "/blog");
      expect(blog.view_count).toBe(1);
      expect(blog.unique_visitors).toBe(1);
    });
  });

  describe("GET /api/analytics/daily", () => {
    it("should return daily traffic statistics grouped by date", async () => {
      await seedEvents();

      const req = new Request("http://localhost:8787/api/analytics/daily");
      const res = await worker.fetch(req, testEnv);
      expect(res.status).toBe(200);

      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);

      const todayStr = new Date().toISOString().slice(0, 10);
      const todayData = body.data.find((d: any) => d.date === todayStr);
      expect(todayData).toBeDefined();
      expect(todayData.view_count).toBe(4);
      expect(todayData.unique_visitors).toBe(2);
    });
  });

  describe("GET /api/analytics/recent", () => {
    it("should return recent events and deliberately omit visitor_id for privacy", async () => {
      await seedEvents();

      const req = new Request("http://localhost:8787/api/analytics/recent");
      const res = await worker.fetch(req, testEnv);
      expect(res.status).toBe(200);

      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(5);

      const first = body.data[0];
      expect(first.event_id).toBeDefined();
      expect(first.page_path).toBeDefined();
      expect(first.referrer).toBeDefined();
      expect(first.timestamp).toBeDefined();
      // visitor_id MUST NOT be present in recent events
      expect(first.visitor_id).toBeUndefined();
    });
  });

  describe("Method Not Allowed & Routing", () => {
    it("should return 405 for POST to /api/analytics/summary", async () => {
      const req = new Request("http://localhost:8787/api/analytics/summary", {
        method: "POST",
      });
      const res = await worker.fetch(req, testEnv);
      expect(res.status).toBe(405);
    });

    it("should return 404 for unknown /api route", async () => {
      const req = new Request("http://localhost:8787/api/unknown-route");
      const res = await worker.fetch(req, testEnv);
      expect(res.status).toBe(404);
    });
  });

  describe("Database Error Handling", () => {
    it("should return 500 when database operation fails", async () => {
      // Mock D1 where execution rejects
      const brokenStatement = {
        bind: () => brokenStatement,
        first: () => Promise.reject(new Error("Simulated D1 query failure")),
        all: () => Promise.reject(new Error("Simulated D1 query failure")),
        run: () => Promise.reject(new Error("Simulated D1 query failure")),
      };

      const brokenEnv = {
        ...testEnv,
        DB: {
          prepare: () => brokenStatement,
          batch: () => Promise.reject(new Error("Simulated D1 batch failure")),
          exec: () => Promise.reject(new Error("Simulated D1 exec failure")),
        } as unknown as D1Database,
      };

      const req = new Request("http://localhost:8787/api/analytics/summary");
      const res = await worker.fetch(req, brokenEnv);
      expect(res.status).toBe(500);

      const body = (await res.json()) as any;
      expect(body.success).toBe(false);
      expect(body.error).toBe("Internal server error");
    });
  });
});
