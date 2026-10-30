import type { ApiError, ApiSuccess } from "../types";
import type { CorsHeaders } from "./cors";

type ExtraHeaders = CorsHeaders | Record<string, string>;

function json(body: unknown, status: number, extra: ExtraHeaders = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...extra },
  });
}

export function successResponse<T>(data: T, extra: ExtraHeaders = {}): Response {
  return json({ success: true, data } satisfies ApiSuccess<T>, 200, extra);
}

export function createdResponse<T>(data: T, extra: ExtraHeaders = {}): Response {
  return json({ success: true, data } satisfies ApiSuccess<T>, 201, extra);
}

export function clientError(
  message: string,
  extra: ExtraHeaders = {},
  code?: string
): Response {
  const body: ApiError = { success: false, error: message, ...(code ? { code } : {}) };
  return json(body, 400, extra);
}

export function unauthorized(extra: ExtraHeaders = {}): Response {
  return json(
    { success: false, error: "Unauthorized: Invalid or missing API key" } satisfies ApiError,
    401,
    extra
  );
}

export function notFound(extra: ExtraHeaders = {}): Response {
  return json({ success: false, error: "API endpoint not found" } satisfies ApiError, 404, extra);
}

export function methodNotAllowed(extra: ExtraHeaders = {}): Response {
  return json({ success: false, error: "Method not allowed" } satisfies ApiError, 405, extra);
}

export function serverError(extra: ExtraHeaders = {}): Response {
  return json(
    { success: false, error: "Internal server error" } satisfies ApiError,
    500,
    extra
  );
}

