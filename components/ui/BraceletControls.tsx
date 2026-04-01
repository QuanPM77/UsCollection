"use client";

import { useBraceletStore } from "@/lib/store";
import { formatPrice } from "@/lib/beadData";
import Link from "next/link";

export default function BraceletControls() {
  const {
    clearAll,
    fillAll,
    toggleAutoRotate,
    isAutoRotating,
    totalPrice,
    filledCount,
    slots,
    selectedBeadType,
  } = useBraceletStore();

  const total = totalPrice();
  const filled = filledCount();
  const total_slots = slots.length;

  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/70 rounded-xl p-3 border border-pink-mid/30">
          <div className="text-xs text-pink-text/60 mb-0.5">Hạt đã đặt</div>
          <div className="text-lg font-bold text-pink-text">
            {filled}
            <span className="text-sm font-normal text-pink-text/50">/{total_slots}</span>
          </div>
        </div>
        <div className="bg-white/70 rounded-xl p-3 border border-pink-mid/30">
          <div className="text-xs text-pink-text/60 mb-0.5">Tổng tiền</div>
          <div className="text-base font-bold text-pink-deep">
            {formatPrice(total)}
          </div>
        </div>
      </div>

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
          {isAutoRotating ? "Dừng xoay" : "Tự xoay"}
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
        onClick={(e) => filled === 0 && e.preventDefault()}
      >
        Đặt hàng — {formatPrice(total)}
      </Link>

      <p className="text-center text-[10px] text-pink-text/40">
        Draft được lưu tự động
      </p>
    </div>
  );
}
