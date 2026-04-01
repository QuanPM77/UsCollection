"use client";

import { BEAD_CATALOG } from "@/lib/beadData";
import BeadCard from "./BeadCard";
import { useBraceletStore } from "@/lib/store";

export default function BeadSelector() {
  const { selectedBeadType } = useBraceletStore();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-pink-text uppercase tracking-wider">
          Chọn loại hạt
        </h3>
        {selectedBeadType && (
          <span className="text-xs text-pink-deep bg-pink-light px-2 py-0.5 rounded-full">
            Đang chọn: {selectedBeadType.name}
          </span>
        )}
      </div>

      {/* Hint */}
      <p className="text-xs text-pink-text/60">
        Chọn hạt rồi click vào vị trí trên vòng tay • Chuột phải để xóa
      </p>

      {/* Grid of bead cards */}
      <div className="grid grid-cols-3 gap-2 max-h-[340px] overflow-y-auto pr-1 scrollbar-thin">
        {BEAD_CATALOG.map((bead) => (
          <BeadCard key={bead.id} bead={bead} />
        ))}
      </div>
    </div>
  );
}
