"use client";

import { useEffect, useState } from "react";

import { useBraceletStore } from "@/lib/store";
import { formatPrice } from "@/lib/beadData";
import Link from "next/link";
import { useLoginPrompt } from "@/components/LoginPromptProvider";

export default function BraceletControls() {
  const { isAuthenticated, requestLogin } = useLoginPrompt();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    clearAll,
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

  const total = mounted ? totalPrice() : 0;
  const filled = mounted ? filledCount() : 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/70 rounded-xl p-2.5 border border-pink-mid/30">
          <div className="text-xs text-pink-text/60 mb-0.5">Hạt đã đặt</div>
          <div className="text-lg font-bold text-pink-text">
            {filled}
          </div>
        </div>

        <div className="bg-white/70 rounded-xl p-2.5 border border-pink-mid/30">
          <div className="text-xs text-pink-text/60 mb-0.5">Tổng tiền</div>
          <div className="text-base font-bold text-pink-deep">
            {formatPrice(total)}
          </div>
        </div>
      </div>

      {/* List of placed beads with individual Delete buttons */}
      {mounted && slots.length > 0 && (
        <div className="bg-white/60 rounded-xl p-2.5 border border-pink-mid/30 flex flex-col gap-2 max-h-32 overflow-y-auto">
          <div className="text-xs font-semibold text-pink-text mb-1 flex justify-between items-center">
            <span>Danh sách hạt ({slots.length})</span>
            <span className="text-[10px] text-pink-text/50 font-normal">Click ✕ để xóa hạt</span>
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
                  <div
                    className="w-4 h-4 rounded-full shrink-0 shadow-sm border border-white"
                    style={{ backgroundColor: bead.color }}
                  />
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
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={fillAll}
            disabled={!selectedBeadType}
            className="py-2 px-3 rounded-xl text-xs font-medium bg-pink-blush text-pink-text
              hover:bg-pink-mid transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Điền tất cả
          </button>
          <button
            onClick={clearAll}
            className="py-2 px-3 rounded-xl text-xs font-medium bg-white/80 text-pink-text
              border border-pink-mid/40 hover:bg-pink-light transition-all"
          >
            Xóa tất cả
          </button>
        </div>

        <button
          onClick={toggleAutoRotate}
          className={`py-2 px-3 rounded-xl text-xs font-medium transition-all
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
          w-full py-3 rounded-2xl text-center font-semibold text-sm transition-all
          ${filled > 0
            ? "bg-pink-deep text-white shadow-pink hover:shadow-pink-lg hover:-translate-y-0.5"
            : "bg-pink-mid/30 text-pink-text/40 cursor-not-allowed"
          }
        `}
        onClick={(e) => {
          if (filled === 0) e.preventDefault();
          else if (!isAuthenticated) {
            e.preventDefault();
            requestLogin();
          }
        }}
      >
        Đặt hàng — {formatPrice(total)}
      </Link>

      <p className="text-center text-[10px] text-pink-text/40">
        Draft được lưu tự động
      </p>
    </div>
  );
}
