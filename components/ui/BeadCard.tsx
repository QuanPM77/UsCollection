"use client";

import { BeadType } from "@/types";
import { formatPrice } from "@/lib/beadData";
import { useBraceletStore } from "@/lib/store";

interface BeadCardProps {
  bead: BeadType;
}

export default function BeadCard({ bead }: BeadCardProps) {
  const { selectedBeadType, setSelectedBeadType } = useBraceletStore();
  const isSelected = selectedBeadType?.id === bead.id;

  return (
    <button
      onClick={() => setSelectedBeadType(isSelected ? null : bead)}
      className={`
        relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200
        hover:shadow-pink hover:-translate-y-0.5
        ${
          isSelected
            ? "border-pink-deep bg-pink-light shadow-pink-lg scale-105"
            : "border-pink-mid/40 bg-white/70 hover:border-pink-mid"
        }
      `}
      title={bead.description}
    >
      {/* Color swatch circle */}
      <div
        className="w-9 h-9 rounded-full shadow-sm ring-2 ring-white"
        style={{ backgroundColor: bead.color }}
      />

      {/* Bead name */}
      <span className="text-xs font-medium text-pink-text leading-tight text-center">
        {bead.name}
      </span>

      {/* Price */}
      <span className="text-[10px] text-pink-deep font-semibold">
        {formatPrice(bead.price)}
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
