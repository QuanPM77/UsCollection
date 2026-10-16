"use client";

import { useEffect } from "react";

const REFRESH_INTERVAL = 60_000;

export default function SessionActivity() {
  useEffect(() => {
    let lastRefresh = Date.now();
    let pending = false;

    const refreshSession = () => {
      if (document.visibilityState === "hidden" || pending) return;
      const now = Date.now();
      if (now - lastRefresh < REFRESH_INTERVAL) return;

      lastRefresh = now;
      pending = true;
      void fetch("/api/auth/session", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      })
        .then(async (response) => {
          if (!response.ok) return;
          const session = await response.json();
          if (!session?.user) window.location.assign("/login?expired=1");
        })
        .catch(() => undefined)
        .finally(() => { pending = false; });
    };

    const activityEvents: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "scroll", "touchstart"];
    for (const eventName of activityEvents) {
      window.addEventListener(eventName, refreshSession, { passive: true });
    }
    document.addEventListener("visibilitychange", refreshSession);

    return () => {
      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, refreshSession);
      }
      document.removeEventListener("visibilitychange", refreshSession);
    };
  }, []);

  return null;
}
