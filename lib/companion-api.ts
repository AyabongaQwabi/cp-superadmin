import { revalidateTag, unstable_cache } from "next/cache";

const COMPANION_API_URL =
  process.env.COMPANION_API_URL || process.env.NEXT_PUBLIC_COMPANION_API_URL || "http://localhost:3000";
const ADMIN_STATS_SECRET = process.env.ADMIN_STATS_SECRET;
const DEFAULT_COMPANION_READ_REVALIDATE_SECONDS = 60;

export async function companionApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!ADMIN_STATS_SECRET) throw new Error("ADMIN_STATS_SECRET is not configured");
  const method = String(init.method || "GET").toUpperCase();

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
  if (method !== "GET") revalidateTag("companion-api", "max");
  return data as T;
}

export async function cachedCompanionApi<T>(
  path: string,
  revalidateSeconds = DEFAULT_COMPANION_READ_REVALIDATE_SECONDS,
): Promise<T> {
  return unstable_cache(
    () => companionApi<T>(path),
    ["companion-api", path],
    { revalidate: revalidateSeconds, tags: ["companion-api", `companion-api:${path}`] },
  )();
}
