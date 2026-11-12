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
    <div className="flex min-h-dvh flex-col bg-gradient-to-br from-pink-light via-cream to-pink-blush lg:h-dvh lg:min-h-0 lg:overflow-hidden">
      <SiteHeader>
        <span className="rounded-full bg-pink-light px-3 py-1 text-center text-xs text-pink-text/70">
          <span className="hidden sm:inline">Tùy chỉnh vòng tay 3D</span>
          <span className="sm:hidden">Thiết kế 3D</span>
        </span>
      </SiteHeader>

      <div className="relative z-0 flex flex-col lg:min-h-0 lg:flex-1 lg:flex-row lg:overflow-hidden">
        <div className="relative h-[42dvh] min-h-[260px] shrink-0 bg-gradient-to-br from-pink-blush/40 to-cream/60 lg:h-auto lg:min-h-0 lg:flex-1">
          <BraceletCanvas />
          <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 sm:bottom-4">
            <span className="whitespace-nowrap rounded-full bg-white/50 px-3 py-1.5 text-[10px] text-pink-text/50 backdrop-blur-sm sm:text-xs">
              Kéo để xoay • Chọn hạt ở bảng bên dưới
            </span>
          </div>
        </div>
        <div className="shrink-0 border-t border-pink-mid/30 lg:h-full lg:min-h-0 lg:w-[360px] lg:overflow-hidden lg:border-l lg:border-t-0 xl:w-[390px]">
          <CustomizerPanel />
        </div>
      </div>
    </div>
  );
}
