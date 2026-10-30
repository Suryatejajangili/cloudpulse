import type { Env } from "./types";

export interface AppConfig {
  environment: string;
  allowedOrigins: string[]; // ["*"] means any origin
  maxRecentEvents: number;
  maxDailyDays: number;
  maxPageRows: number;
}

/**
 * Derives runtime configuration from the Worker environment bindings.
 * All tunable values live here — never scattered across handlers.
 */
export function getConfig(env: Env): AppConfig {
  const raw = env.ALLOWED_ORIGINS ?? "*";
  return {
    environment: env.ENVIRONMENT ?? "development",
    allowedOrigins: raw === "*" ? ["*"] : raw.split(",").map((s) => s.trim()),
    maxRecentEvents: 50,
    maxDailyDays: 30,
    maxPageRows: 50,
  };
}

