import { describe, it, expect } from "vitest";
import { validateEventPayload, parseDateRange } from "../src/utils/validation";

describe("Validation Utility", () => {
  describe("validateEventPayload", () => {
    it("should accept valid payload with visitor_id, page_path, and referrer", () => {
      const res = validateEventPayload({
        visitor_id: "visitor-1234_abcd",
        page_path: "/docs/getting-started",
        referrer: "https://google.com",
      });
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it("should accept valid payload without referrer", () => {
      const res = validateEventPayload({
        visitor_id: "visitor-1234_abcd",
        page_path: "/about",
      });
      expect(res.valid).toBe(true);
    });

    it("should reject non-object or null payloads", () => {
      expect(validateEventPayload(null).valid).toBe(false);
      expect(validateEventPayload("string").valid).toBe(false);
      expect(validateEventPayload([]).valid).toBe(false);
    });

    it("should reject missing or empty visitor_id", () => {
      const res = validateEventPayload({
        visitor_id: "",
        page_path: "/home",
      });
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes("visitor_id"))).toBe(true);
    });

    it("should reject visitor_id containing invalid characters (e.g. emails/spaces)", () => {
      const res1 = validateEventPayload({
        visitor_id: "user@example.com",
        page_path: "/home",
      });
      expect(res1.valid).toBe(false);

      const res2 = validateEventPayload({
        visitor_id: "short", // < 8 characters
        page_path: "/home",
      });
      expect(res2.valid).toBe(false);
    });

    it("should reject page_path not starting with /", () => {
      const res = validateEventPayload({
        visitor_id: "valid-visitor-123",
        page_path: "contact",
      });
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes("start with /"))).toBe(true);
    });

    it("should reject excessively long fields", () => {
      const res = validateEventPayload({
        visitor_id: "valid-visitor-123",
        page_path: "/" + "a".repeat(2050),
      });
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes("exceed"))).toBe(true);
    });
  });

  describe("parseDateRange", () => {
    it("should parse valid from and to params", () => {
      const params = new URLSearchParams("from=2026-01-01&to=2026-01-31");
      const res = parseDateRange(params);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.range.from).toBe("2026-01-01");
        expect(res.range.to).toBe("2026-01-31");
      }
    });

    it("should allow partial date ranges (only from or only to)", () => {
      const params = new URLSearchParams("from=2026-01-01");
      const res = parseDateRange(params);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.range.from).toBe("2026-01-01");
        expect(res.range.to).toBeUndefined();
      }
    });

    it("should reject invalid date formats", () => {
      const params = new URLSearchParams("from=2026/01/01");
      const res = parseDateRange(params);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toContain("YYYY-MM-DD");
      }
    });

    it("should reject when from is after to", () => {
      const params = new URLSearchParams("from=2026-02-01&to=2026-01-01");
      const res = parseDateRange(params);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toContain("must not be later than");
      }
    });
  });
});

