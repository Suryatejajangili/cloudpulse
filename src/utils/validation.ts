import type { DateRange } from "../types";

// ── Visitor ID ─────────────────────────────────────────────────────────────
// 8–64 chars, alphanumeric + hyphens + underscores.
// This deliberately rejects anything that looks like an email, phone number,
// or other PII, keeping the ID anonymous.
const VISITOR_ID_RE = /^[a-zA-Z0-9_-]{8,64}$/;

// ── Page Path ──────────────────────────────────────────────────────────────
const MAX_PATH_LEN = 2048;
const MAX_REFERRER_LEN = 2048;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates the JSON body of POST /api/events.
 * Returns a list of human-readable error messages if invalid.
 */
export function validateEventPayload(body: unknown): ValidationResult {
  const errors: string[] = [];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { valid: false, errors: ["Request body must be a JSON object"] };
  }

  const raw = body as Record<string, unknown>;

  // visitor_id
  if (typeof raw.visitor_id !== "string" || raw.visitor_id.length === 0) {
    errors.push("visitor_id is required and must be a non-empty string");
  } else if (!VISITOR_ID_RE.test(raw.visitor_id)) {
    errors.push(
      "visitor_id must be 8–64 characters: alphanumeric, hyphens, and underscores only"
    );
  }

  // page_path
  if (typeof raw.page_path !== "string" || raw.page_path.length === 0) {
    errors.push("page_path is required and must be a non-empty string");
  } else if (!raw.page_path.startsWith("/")) {
    errors.push("page_path must start with /");
  } else if (raw.page_path.length > MAX_PATH_LEN) {
    errors.push(`page_path must not exceed ${MAX_PATH_LEN} characters`);
  }

  // referrer (optional — defaults to empty string)
  if (raw.referrer !== undefined && raw.referrer !== null) {
    if (typeof raw.referrer !== "string") {
      errors.push("referrer must be a string if provided");
    } else if (raw.referrer.length > MAX_REFERRER_LEN) {
      errors.push(`referrer must not exceed ${MAX_REFERRER_LEN} characters`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Parses ?from=YYYY-MM-DD&to=YYYY-MM-DD from query params.
 * Returns the date range, or { error } if the params are malformed.
 */
export type DateRangeResult =
  | { ok: true; range: DateRange }
  | { ok: false; error: string };

export function parseDateRange(params: URLSearchParams): DateRangeResult {
  const from = params.get("from") ?? undefined;
  const to = params.get("to") ?? undefined;

  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  if (from !== undefined && !DATE_RE.test(from)) {
    return { ok: false, error: "from must be in YYYY-MM-DD format" };
  }
  if (to !== undefined && !DATE_RE.test(to)) {
    return { ok: false, error: "to must be in YYYY-MM-DD format" };
  }
  if (from !== undefined && to !== undefined && from > to) {
    return { ok: false, error: "from must not be later than to" };
  }

  return { ok: true, range: { from, to } };
}
