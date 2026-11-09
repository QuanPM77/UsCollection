"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { scheduleLinkPreloads } from "@/lib/idle-preload";

export default function IdleModulePreloader() {
  const pathname = usePathname();

  useEffect(() => {
    return scheduleLinkPreloads({
      "/customizer": () => import("@/components/3d/BraceletCanvas"),
      "/admin": () => import("@/components/admin/DashboardCharts"),
      "/admin/analytics": () => import("@/components/admin/AnalyticsCharts"),
    });
  }, [pathname]);

  return null;
}
