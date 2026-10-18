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
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-pink-light via-cream to-pink-blush">
      <nav className="relative z-50 flex items-center gap-4 border-b border-pink-mid/20 bg-white/60 px-4 py-4 backdrop-blur-sm sm:px-6">
        <MainMenu />
        <Link href="/" className="font-display text-xl font-bold text-pink-text">
          UsStory
        </Link>
        <span className="ml-auto rounded-full bg-pink-light px-3 py-1 text-xs text-pink-text/50">
          Tùy chỉnh vòng tay 3D
        </span>
      </nav>

      <div className="relative z-0 flex flex-1 overflow-hidden">
        <div className="relative min-h-0 flex-1 bg-gradient-to-br from-pink-blush/40 to-cream/60">
          <BraceletCanvas />
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2">
            <span className="rounded-full bg-white/50 px-3 py-1.5 text-xs text-pink-text/40 backdrop-blur-sm">
              Kéo để xoay • Scroll để zoom • Click hạt để đặt
            </span>
          </div>
        </div>
        <div className="w-80 shrink-0 overflow-hidden">
          <CustomizerPanel />
        </div>
      </div>
    </div>
  );
}
