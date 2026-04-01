"use client";

import { useState } from "react";
import { useBraceletStore } from "@/lib/store";
import { calculateBeadCount } from "@/lib/braceletMath";

export default function WristInput() {
  const { wristCircumference, setWristCircumference } = useBraceletStore();
  const [inputValue, setInputValue] = useState(String(wristCircumference));

  const beadCount = calculateBeadCount(wristCircumference);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleBlur = () => {
    const val = parseFloat(inputValue);
    if (!isNaN(val) && val > 0) {
      setWristCircumference(val);
      setInputValue(String(Math.min(Math.max(val, 100), 250)));
    } else {
      setInputValue(String(wristCircumference));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleBlur();
  };

  // Quick size presets
  const presets = [
    { label: "S", mm: 145, note: "14.5cm" },
    { label: "M", mm: 160, note: "16cm" },
    { label: "L", mm: 175, note: "17.5cm" },
    { label: "XL", mm: 190, note: "19cm" },
  ];

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-pink-text uppercase tracking-wider">
        Chu vi cổ tay
      </h3>

      {/* Preset buttons */}
      <div className="flex gap-2">
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={() => {
              setWristCircumference(p.mm);
              setInputValue(String(p.mm));
            }}
            className={`
              flex-1 py-1.5 rounded-lg text-xs font-medium transition-all
              ${
                wristCircumference === p.mm
                  ? "bg-pink-deep text-white shadow-pink"
                  : "bg-pink-light text-pink-text hover:bg-pink-mid/50"
              }
            `}
          >
            <div>{p.label}</div>
            <div className="text-[9px] opacity-70">{p.note}</div>
          </button>
        ))}
      </div>

      {/* Custom input */}
      <div className="flex items-center gap-2 bg-white/70 rounded-xl px-3 py-2 border border-pink-mid/40">
        <input
          type="number"
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          min={100}
          max={250}
          className="flex-1 bg-transparent text-sm text-pink-text font-medium outline-none w-0"
          placeholder="160"
        />
        <span className="text-xs text-pink-text/50 shrink-0">mm</span>
      </div>

      {/* Info */}
      <div className="flex justify-between text-xs text-pink-text/60">
        <span>R = {(wristCircumference / (2 * Math.PI * 10)).toFixed(2)} u</span>
        <span>{beadCount} hạt</span>
      </div>
    </div>
  );
}
