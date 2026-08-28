export const SEOUL_API_KEY_COOKIE = "seoul_api_key";
export const SEOUL_API_KEY_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export type ApiKeySource = "browser" | "environment" | "none";

export function normalizeSeoulApiKey(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function isPlausibleSeoulApiKey(value: string): boolean {
  return value.length >= 5 && value.length <= 200 && !/\s/.test(value);
}

export function resolveApiKeySource(browserKey?: string | null): ApiKeySource {
  if (browserKey?.trim()) return "browser";
  if (process.env.SEOUL_API_KEY?.trim()) return "environment";
  return "none";
}
