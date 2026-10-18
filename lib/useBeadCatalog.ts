"use client";

import { useEffect, useState } from "react";
import { BeadType } from "@/types";
import { useBraceletStore } from "@/lib/store";

export function useBeadCatalog() {
  const catalog = useBraceletStore((state) => state.beadCatalog);
  const setCatalog = useBraceletStore((state) => state.setBeadCatalog);
  const [loading, setLoading] = useState(catalog.length === 0);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/bead-types", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !Array.isArray(result.data)) throw new Error("Không tải được danh sách hạt");
        if (active) setCatalog(result.data as BeadType[]);
      })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [setCatalog]);

  return { catalog, loading, error };
}
