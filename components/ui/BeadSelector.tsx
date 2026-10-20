"use client";

import { useBeadCatalog } from "@/lib/useBeadCatalog";
import BeadCard from "./BeadCard";
import { useBraceletStore } from "@/lib/store";

export default function BeadSelector() {
  const { selectedBeadType } = useBraceletStore();
  const { catalog, loading, error } = useBeadCatalog();

  return (
    <div className="flex flex-col gap-2">
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
        Kéo hạt thả vào vòng hoặc click để xâu • Click lên dây để xâu hạt đang chọn • Chuột phải để xóa
      </p>

      {/* Grid of bead cards */}
      <div className="grid max-h-[min(25vh,240px)] grid-cols-3 gap-2 overflow-y-auto pr-1 scrollbar-thin">
        {loading && <p className="col-span-3 py-6 text-center text-xs text-pink-text/60">Đang tải loại hạt...</p>}
        {error && <p className="col-span-3 py-6 text-center text-xs text-red-600">Không tải được loại hạt. Vui lòng tải lại trang.</p>}
        {!loading && !error && catalog.filter((bead) => bead.is_active !== false && (bead.stock ?? 0) > 0).length === 0 && <p className="col-span-3 py-6 text-center text-xs text-pink-text/60">Hiện không có loại hạt nào còn hàng.</p>}
        {catalog.filter((bead) => bead.is_active !== false && (bead.stock ?? 0) > 0).map((bead) => (
          <BeadCard key={bead.id} bead={bead} />
        ))}
      </div>
    </div>
  );
}
