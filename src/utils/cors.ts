/**
 * CORS utility helpers.
 *
 * Policy rationale:
 *  - POST /api/events: must allow any origin (tracker embeds on third-party sites).
 *  - GET  /api/analytics/*: also open while auth is not implemented; document as
 *    a known limitation in SECURITY.md.
 *  - When ALLOWED_ORIGINS is set to a comma-separated list in wrangler.jsonc, only
 *    those origins receive a non-null ACAO header (tracker still works; browsers
 *    simply won't expose the analytics responses cross-origin).
 */

export type CorsHeaders = Record<string, string>;

export function buildCorsHeaders(
  requestOrigin: string | null,
  allowedOrigins: string[]
): CorsHeaders {
  const isWildcard = allowedOrigins.includes("*");
  const originAllowed =
    isWildcard ||
    (requestOrigin !== null && allowedOrigins.includes(requestOrigin));

  return {
    "Access-Control-Allow-Origin": isWildcard
      ? "*"
      : originAllowed
      ? (requestOrigin as string)
      : "null",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

/**
 * Handles OPTIONS preflight requests.
 * Returns a Response if this is an OPTIONS request, otherwise null.
 */
export function handlePreflight(
  request: Request,
  allowedOrigins: string[]
): Response | null {
  if (request.method !== "OPTIONS") return null;
  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(request.headers.get("Origin"), allowedOrigins),
  });
}

