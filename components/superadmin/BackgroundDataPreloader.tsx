"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ADMIN_PREFETCH_ROUTES } from "@/lib/admin-prefetch-routes";

const REFRESH_MS = 90_000;

function schedule(callback: () => void) {
  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
    const id = idleWindow.requestIdleCallback(callback, { timeout: 5000 });
    return () => idleWindow.cancelIdleCallback?.(id);
  }
  const id = globalThis.setTimeout(callback, 1500);
  return () => globalThis.clearTimeout(id);
}

export function BackgroundDataPreloader() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function warm() {
      if (cancelled || document.visibilityState === "hidden") return;
      for (const route of ADMIN_PREFETCH_ROUTES) {
        router.prefetch(route);
      }
      await fetch("/api/admin-companion/cache-warm", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      }).catch(() => undefined);
    }

    const cancelInitial = schedule(warm);
    const interval = window.setInterval(warm, REFRESH_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void warm();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      cancelInitial();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [router]);

  return null;
}
