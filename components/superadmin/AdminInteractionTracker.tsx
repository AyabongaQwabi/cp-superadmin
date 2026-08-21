"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function AdminInteractionTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    const payload = JSON.stringify({ action: "page_view", path: pathname });
    const blob = new Blob([payload], { type: "application/json" });

    if (!navigator.sendBeacon("/api/admin-companion/interactions", blob)) {
      fetch("/api/admin-companion/interactions", {
        method: "POST",
        body: payload,
        headers: { "content-type": "application/json" },
        keepalive: true,
      }).catch(() => undefined);
    }
  }, [pathname]);

  return null;
}
