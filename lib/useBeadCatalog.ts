"use client";

import { useEffect, useState } from "react";
import { fetchBeadCatalog } from "@/lib/bead-catalog-request";
import { useBraceletStore } from "@/lib/store";

export function useBeadCatalog() {
  const catalog = useBraceletStore((state) => state.beadCatalog);
  const setCatalog = useBraceletStore((state) => state.setBeadCatalog);
  const [loading, setLoading] = useState(catalog.length === 0);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    fetchBeadCatalog()
      .then((data) => {
        if (active) setCatalog(data);
      })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [setCatalog]);

  return { catalog, loading, error };
}
