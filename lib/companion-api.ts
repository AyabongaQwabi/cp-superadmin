const COMPANION_API_URL =
  process.env.COMPANION_API_URL || process.env.NEXT_PUBLIC_COMPANION_API_URL || "http://localhost:3000";
const ADMIN_STATS_SECRET = process.env.ADMIN_STATS_SECRET;

export async function companionApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!ADMIN_STATS_SECRET) throw new Error("ADMIN_STATS_SECRET is not configured");

  const res = await fetch(`${COMPANION_API_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      "x-admin-stats-secret": ADMIN_STATS_SECRET,
      ...(init.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}
