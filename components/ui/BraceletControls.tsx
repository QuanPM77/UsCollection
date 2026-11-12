"use client";

import { useEffect, useState } from "react";

import { useBraceletStore } from "@/lib/store";
import { formatPrice } from "@/lib/beadData";
import { generateVariableBeadPositions } from "@/lib/braceletMath";
import { beadSpacing } from "@/lib/bead-model";
import BeadSwatch from "@/components/ui/BeadSwatch";
import Link from "next/link";
import { useLoginPrompt } from "@/components/LoginPromptProvider";

export default function BraceletControls({ compact = false }: { compact?: boolean }) {
  const { isAuthenticated, requestLogin } = useLoginPrompt();
  const [clearedDesign, setClearedDesign] = useState<{ slots: ReturnType<typeof useBraceletStore.getState>["slots"]; wrist: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    clearAll,
    wristCircumference,
    fillAll,
    removeBead,
    toggleAutoRotate,
    isAutoRotating,
    totalPrice,
    filledCount,
    slots,
    selectedBeadType,
    beadCatalog,
  } = useBraceletStore();

  useEffect(() => {
    if (slots.length > 0 || (clearedDesign && clearedDesign.wrist !== wristCircumference)) setClearedDesign(null);
  }, [slots, wristCircumference, clearedDesign]);

  const canUndo = mounted && clearedDesign && slots.length === 0 && clearedDesign.wrist === wristCircumference;
  const total = mounted ? totalPrice() : 0;
  const filled = mounted ? filledCount() : 0;

  function spreadBeadsAroundBracelet() {
    const state = useBraceletStore.getState();
    const sizes = state.slots.map(slot => beadSpacing(slot.beadTypeId
      ? state.beadCatalog.find(bead => bead.id === slot.beadTypeId)
      : null));
    const positions = generateVariableBeadPositions(sizes, state.wristCircumference, true);
    useBraceletStore.setState({ slots: state.slots.map((slot, index) => ({ ...slot, angle: positions[index]?.angle })) });
  }

  return (
    <div className={`flex flex-col ${compact ? "gap-1.5" : "gap-3"}`}>
      {/* Stats */}
      <div className={`grid grid-cols-2 ${compact ? "gap-1" : "gap-2"}`}>
        <div className={`bg-white/70 rounded-xl ${compact ? "px-2.5 py-1.5" : "p-2.5"} border border-pink-mid/30`}>
          <div className={`${compact ? "text-[10px]" : "text-xs"} text-pink-text/60 mb-0.5`}>Hạt đã đặt</div>
          <div className={`${compact ? "text-base" : "text-lg"} font-bold text-pink-text`}>
            {filled}
          </div>
        </div>

        <div className={`bg-white/70 rounded-xl ${compact ? "px-2.5 py-1.5" : "p-2.5"} border border-pink-mid/30`}>
          <div className={`${compact ? "text-[10px]" : "text-xs"} text-pink-text/60 mb-0.5`}>Tổng tiền</div>
          <div className={`${compact ? "text-base" : "text-base"} font-bold text-pink-deep`}>
            {formatPrice(total)}
          </div>
        </div>
      </div>

      {/* List of placed beads with individual Delete buttons */}
      {mounted && slots.length > 0 && compact && (
        <div className="flex h-10 items-center gap-1 overflow-x-auto rounded-lg border border-pink-mid/25 bg-white/60 px-1 scrollbar-thin" aria-label="Danh sách hạt đã đặt">
          {slots.map((slot, idx) => {
            const bead = slot.beadTypeId ? beadCatalog.find((item) => item.id === slot.beadTypeId) : null;
            if (!bead) return null;
            return <div key={`${slot.index}-${idx}`} className="flex h-8 shrink-0 items-center gap-1 rounded-full border border-pink-mid/20 bg-white px-1.5">
              <BeadSwatch beadId={bead.id} model={bead.model} thumbnail={bead.thumbnail} color={bead.color} className="h-5 w-5 rounded-full" />
              <span className="max-w-16 truncate text-[10px] text-pink-text">{idx + 1}. {bead.name}</span>
              <button onClick={() => removeBead(idx)} className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-500" aria-label={`Xóa hạt ${idx + 1}`}>×</button>
            </div>;
          })}
        </div>
      )}

      {mounted && slots.length > 0 && !compact && (
        <div className="bg-white/60 rounded-xl p-2.5 border border-pink-mid/30 flex flex-col gap-2 max-h-32 overflow-y-auto">
          <div className="text-xs font-semibold text-pink-text mb-1 flex justify-between items-center">
            <span>Danh sách hạt ({slots.length})</span>
            <span className="text-[10px] text-pink-text/50 font-normal">Chạm ✕ để xóa hạt</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {slots.map((slot, idx) => {
              const bead = slot.beadTypeId ? beadCatalog.find((item) => item.id === slot.beadTypeId) : null;
              if (!bead) return null;
              return (
                <div
                  key={`${slot.index}-${idx}`}
                  className="flex items-center gap-2 bg-white/80 px-2.5 py-1.5 rounded-lg border border-pink-mid/20 hover:border-pink-mid transition-all"
                >
                  <BeadSwatch beadId={bead.id} model={bead.model} thumbnail={bead.thumbnail} color={bead.color} className="w-4 h-4 rounded-full shrink-0 shadow-sm border border-white" />
                  <span className="text-xs font-medium text-pink-text flex-1 truncate">
                    #{idx + 1} {bead.name}
                  </span>
                  <span className="text-[10px] font-semibold text-pink-deep mr-1">
                    {formatPrice(bead.price)}
                  </span>
                  <button
                    onClick={() => removeBead(idx)}
                    className="w-5 h-5 rounded-full bg-red-100 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center text-[10px] font-bold transition-all shadow-sm"
                    title="Xóa hạt này"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className={`flex flex-col ${compact ? "gap-1.5" : "gap-2"}`}>
        <div className={`grid grid-cols-2 ${compact ? "gap-1" : "gap-2"}`}>
          <button
            onClick={fillAll}
            disabled={!selectedBeadType}
            className={`${compact ? "py-2.5" : "py-2"} px-2 rounded-xl text-xs font-medium bg-pink-blush text-pink-text
              hover:bg-pink-mid transition-all disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            Phối đầy vòng
          </button>
          <button
            disabled={filled === 0}
            onClick={() => {
              setClearedDesign({ slots: slots.map(slot => ({ ...slot })), wrist: wristCircumference });
              clearAll();
            }}
            className={`${compact ? "py-2.5" : "py-2"} px-2 rounded-xl text-xs font-medium bg-white/80 text-pink-text
              border border-pink-mid/40 hover:bg-pink-light transition-all`}
          >
            Xóa tất cả
          </button>
        </div>
        <button
          type="button"
          onClick={spreadBeadsAroundBracelet}
          disabled={filled === 0}
          className={`${compact ? "py-2.5" : "py-2"} px-2 rounded-xl text-xs font-medium bg-white/80 text-pink-text border border-pink-mid/40 hover:bg-pink-light transition-all disabled:opacity-40 disabled:cursor-not-allowed`}
          title="Dàn đều các hạt quanh vòng để lấp phần dây trống"
        >
          Dàn đều hạt quanh vòng
        </button>

        {canUndo && <div role="status" className="flex items-center justify-between gap-2 rounded-xl bg-white p-3 text-xs">
          <span>Đã xóa các hạt trên vòng.</span>
          <button type="button" className="font-semibold text-pink-deep underline" onClick={() => {
            useBraceletStore.setState({ slots: clearedDesign.slots });
            setClearedDesign(null);
          }}>Hoàn tác</button>
        </div>}
        <button
          onClick={toggleAutoRotate}
          className={`${compact ? "py-2.5" : "py-2"} px-2 rounded-xl text-xs font-medium transition-all
            ${isAutoRotating
              ? "bg-pink-mid/30 text-pink-text"
              : "bg-white/80 text-pink-text/60 border border-pink-mid/40"
            }`}
        >
          {isAutoRotating ? "Dừng xoay" : "Xoay vòng"}

        </button>
      </div>

      {/* Checkout CTA */}
      <Link
        href={filled > 0 ? "/checkout" : "#"}
        className={`
          w-full ${compact ? "py-2.5" : "py-3"} rounded-2xl text-center font-semibold ${compact ? "text-xs" : "text-sm"} transition-all
          ${filled > 0
            ? "bg-pink-deep text-white shadow-pink hover:shadow-pink-lg hover:-translate-y-0.5"
            : "bg-pink-mid/30 text-pink-text/40 cursor-not-allowed"
          }
        `}
        onClick={(e) => {
          if (filled === 0) e.preventDefault();
          else if (!isAuthenticated) {
            e.preventDefault();
            requestLogin("/checkout");
          }
        }}
      >
        Đặt hàng — {formatPrice(total)}
      </Link>

    </div>
  );
}
