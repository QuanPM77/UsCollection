"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { scheduleIdlePreloads } from "@/lib/idle-preload";

export default function IdleModulePreloader() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
      return scheduleIdlePreloads([
        () => import("@/components/admin/DashboardCharts"),
        () => import("@/components/admin/AnalyticsCharts"),
      ]);
    }
    // These pages lead to the designer. On /customizer it already loads on demand.
    if (pathname === "/" || pathname === "/favorites" || pathname === "/buy" || pathname.startsWith("/buy/")) {
      return scheduleIdlePreloads([() => import("@/components/3d/BraceletCanvas")]);
    }
  }, [pathname]);

  return null;
}
