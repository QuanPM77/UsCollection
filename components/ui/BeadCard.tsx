"use client";

import { BeadType } from "@/types";
import { formatPrice } from "@/lib/beadData";
import { useBraceletStore } from "@/lib/store";
import BeadSwatch from "@/components/ui/BeadSwatch";

interface BeadCardProps {
  bead: BeadType;
  compact?: boolean;
}

export default function BeadCard({ bead, compact = false }: BeadCardProps) {
  const { selectedBeadType, setSelectedBeadType, stopAutoRotate, slots } = useBraceletStore();
  const isSelected = selectedBeadType?.id === bead.id;
  const remaining = Math.max(0, (bead.stock ?? 0) - slots.filter((slot) => slot.beadTypeId === bead.id).length);
  const label = bead.kind === "charm" || bead.model?.attachment === "pendant" ? "charm" : "hạt";

  return (
    <button
      draggable={remaining > 0}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", bead.id);
      }}
      onClick={() => {
        if (remaining <= 0) return;
        stopAutoRotate();
        setSelectedBeadType(bead);
      }}
      disabled={remaining <= 0}
      className={`
        relative flex flex-col items-center ${compact ? "h-[128px] w-[108px] shrink-0 gap-1.5 p-2" : "gap-1.5 p-3"} rounded-xl border-2 transition-all duration-200
        hover:shadow-pink hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
        ${
          isSelected
            ? "border-pink-deep bg-pink-light shadow-pink-lg scale-105"
            : "border-pink-mid/40 bg-white/70 hover:border-pink-mid"
        }
      `}
      title={bead.description}
    >
      {/* Bead swatch (thumbnail or color circle) */}
      <BeadSwatch beadId={bead.id} model={bead.model} thumbnail={bead.thumbnail} color={bead.color} className={`${compact ? "h-9 w-9" : "h-9 w-9"} rounded-full shadow-sm ring-2 ring-white`} />

      {/* Bead name */}
      <span className={`${compact ? "text-[11px]" : "text-xs"} font-medium text-pink-text leading-tight text-center line-clamp-2`}>
        {bead.name}
      </span>

      {/* Price */}
      <span className={`${compact ? "text-[10px]" : "text-[10px]"} text-pink-deep font-semibold`}>
        {formatPrice(bead.price)}
      </span>
      <span className={`${compact ? "text-[9px]" : "text-[10px]"} font-medium ${remaining === 0 ? "text-red-600" : "text-emerald-700"}`}>
        Còn {remaining} {label}
      </span>

      {/* Selected indicator */}
      {isSelected && (
        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-pink-deep rounded-full flex items-center justify-center">
          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      )}
    </button>
  );
}
