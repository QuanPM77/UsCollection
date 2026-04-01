"use client";

import WristInput from "./WristInput";
import BeadSelector from "./BeadSelector";
import BraceletControls from "./BraceletControls";

export default function CustomizerPanel() {
  return (
    <div
      className="
        h-full flex flex-col gap-5 overflow-y-auto
        bg-cream/80 backdrop-blur-md
        border-l border-pink-mid/30
        p-5
      "
    >
      {/* Header */}
      <div>
        <h2 className="font-display text-xl font-bold text-pink-text">
          Thiết kế vòng tay
        </h2>
        <p className="text-xs text-pink-text/60 mt-0.5">
          Kéo để xoay • Click hạt để đặt
        </p>
      </div>

      <hr className="border-pink-mid/30" />

      {/* Wrist size */}
      <WristInput />

      <hr className="border-pink-mid/30" />

      {/* Bead catalog */}
      <BeadSelector />

      <hr className="border-pink-mid/30" />

      {/* Controls + checkout */}
      <BraceletControls />
    </div>
  );
}
