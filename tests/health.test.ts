import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import worker from "../src/index";
import type { Env } from "../src/types";

describe("Health Endpoint", () => {
  const testEnv = env as unknown as Env;

  it("should return 200 OK with service details", async () => {
    const req = new Request("http://localhost:8787/api/health", {
      method: "GET",
    });

    const res = await worker.fetch(req, testEnv);
    expect(res.status).toBe(200);

    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.status).toBe("ok");
    expect(body.data.service).toBe("cloudpulse");
    expect(body.data.version).toBe("0.1.0");
    expect(body.data.environment).toBeDefined();
    expect(body.data.timestamp).toBeDefined();
  });

  it("should return CORS headers on health check", async () => {
    const req = new Request("http://localhost:8787/api/health", {
      method: "GET",
      headers: { Origin: "https://example.com" },
    });

    const res = await worker.fetch(req, testEnv);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});
