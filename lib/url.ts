export type QueryValue = string | number | undefined;

/** Builds `path?query`, dropping empty values. */
export function buildHref(path: string, params: Record<string, QueryValue>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") qs.set(key, String(value));
  }
  const s = qs.toString();
  return s ? `${path}?${s}` : path;
}