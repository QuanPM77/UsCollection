"use client";

import dynamic from "next/dynamic";
import CustomizerPanel from "@/components/ui/CustomizerPanel";
import SiteHeader from "@/components/SiteHeader";

const BraceletCanvas = dynamic(
  () => import("@/components/3d/BraceletCanvas"),
  { ssr: false }
);

export default function CustomizerView() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-gradient-to-br from-pink-light via-cream to-pink-blush">
      <SiteHeader>
        <span className="rounded-full bg-pink-light px-3 py-1 text-center text-xs text-pink-text/70">
          <span className="hidden sm:inline">Tùy chỉnh vòng tay 3D</span>
          <span className="sm:hidden">Thiết kế 3D</span>
        </span>
      </SiteHeader>

      <div className="relative z-0 flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="relative min-h-[35vh] flex-1 bg-gradient-to-br from-pink-blush/40 to-cream/60 lg:min-h-0">
          <BraceletCanvas />
          <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 sm:bottom-4">
            <span className="whitespace-nowrap rounded-full bg-white/50 px-3 py-1.5 text-[10px] text-pink-text/50 backdrop-blur-sm sm:text-xs">
              Kéo để xoay • Scroll để zoom • Click hạt để đặt
            </span>
          </div>
        </div>
        <div className="h-[52%] min-h-0 shrink-0 overflow-hidden border-t border-pink-mid/30 sm:h-[48%] lg:h-full lg:w-[360px] lg:border-l lg:border-t-0 xl:w-[390px]">
          <CustomizerPanel />
        </div>
      </div>
    </div>
  );
}
