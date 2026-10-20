"use client";

import dynamic from "next/dynamic";
import CustomizerPanel from "@/components/ui/CustomizerPanel";
import Link from "next/link";
import MainMenu from "@/components/MainMenu";

const BraceletCanvas = dynamic(
  () => import("@/components/3d/BraceletCanvas"),
  { ssr: false }
);

export default function CustomizerView() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-gradient-to-br from-pink-light via-cream to-pink-blush">
      <nav className="relative z-50 flex h-14 shrink-0 items-center gap-3 border-b border-pink-mid/20 bg-white/60 px-3 backdrop-blur-sm sm:px-6">
        <MainMenu />
        <Link href="/" className="font-display text-lg font-bold text-pink-text sm:text-xl">
          UsStory
        </Link>
        <span className="ml-auto rounded-full bg-pink-light px-3 py-1 text-xs text-pink-text/50">
          Tùy chỉnh vòng tay 3D
        </span>
      </nav>

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
