"use client";

import WristInput from "./WristInput";
import SavedDesigns from "@/components/SavedDesigns";
import BeadSelector from "./BeadSelector";
import BraceletControls from "./BraceletControls";

export default function CustomizerPanel() {
  return (
    <div
      className="
        flex flex-col justify-start gap-3 overflow-visible lg:h-full lg:min-h-0 lg:gap-3 lg:overflow-y-auto
        bg-cream/80 backdrop-blur-md
        border-l border-pink-mid/30
        p-2 sm:p-3 lg:p-4
      "
    >
      {/* Header */}
      <div className="shrink-0">
        <h2 className="font-display text-lg font-bold text-pink-text lg:text-xl">
          Thiết kế vòng tay
        </h2>
      </div>

      <hr className="shrink-0 border-pink-mid/30" />

      {/* Wrist size */}
      <div className="shrink-0"><WristInput compact /></div>

      <hr className="shrink-0 border-pink-mid/30" />

      {/* Bead catalog */}
      <div className="shrink-0"><BeadSelector compact /></div>

      <hr className="shrink-0 border-pink-mid/30" />

      {/* Controls + checkout */}
      <div className="shrink-0 space-y-1.5 lg:space-y-3">
        <BraceletControls compact />
        <SavedDesigns compact />
      </div>
    </div>
  );
}
