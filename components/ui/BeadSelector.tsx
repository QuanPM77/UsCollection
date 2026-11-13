"use client";

import { useState } from "react";
import { useBeadCatalog } from "@/lib/useBeadCatalog";
import BeadCard from "./BeadCard";

export default function BeadSelector({ compact = false }: { compact?: boolean }) {
  const { catalog, loading, error } = useBeadCatalog();
  const [kind, setKind] = useState<"bead" | "charm">("bead");
  const activeCatalog = catalog.filter((bead) =>
    bead.is_active !== false && (bead.kind ?? (bead.model?.attachment === "pendant" ? "charm" : "bead")) === kind
  );

  return (
    <div className={`flex min-h-0 flex-col ${compact ? "gap-1" : "gap-2"}`}>
      <div className="flex items-center justify-between">
        <h3 className={`${compact ? "text-xs" : "text-sm"} font-semibold text-pink-text uppercase tracking-wider`}>
          Chọn loại phụ kiện
        </h3>
      </div>

      <div role="tablist" aria-label="Loại phụ kiện" className="grid grid-cols-2 rounded-lg bg-pink-mid/15 p-1">
        {([ ["bead", "Hạt"], ["charm", "Charm"] ] as const).map(([value, label]) => (
          <button key={value} role="tab" aria-selected={kind === value} onClick={() => setKind(value)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${kind === value ? "bg-white text-pink-deep shadow-sm" : "text-pink-text/65 hover:text-pink-text"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Grid of bead cards */}
      <div className={compact
        ? "flex h-[136px] shrink-0 gap-2 overflow-x-auto overflow-y-hidden pb-1 scrollbar-thin"
        : "grid max-h-[min(25vh,240px)] grid-cols-3 gap-2 overflow-y-auto pr-1 scrollbar-thin"}>
        {loading && <p className="col-span-3 py-6 text-center text-xs text-pink-text/60">Đang tải loại hạt...</p>}
        {error && <p className="col-span-3 py-6 text-center text-xs text-red-600">Không tải được loại hạt. Vui lòng tải lại trang.</p>}
        {!loading && !error && activeCatalog.length === 0 && <p className="col-span-3 py-6 text-center text-xs text-pink-text/60">Hiện chưa có {kind === "charm" ? "charm" : "hạt"} nào đang bán.</p>}
        {activeCatalog.map((bead) => (
          <BeadCard key={bead.id} bead={bead} compact={compact} />
        ))}
      </div>
    </div>
  );
}
