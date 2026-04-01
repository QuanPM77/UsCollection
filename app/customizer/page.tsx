"use client";

import dynamic from "next/dynamic";
import CustomizerPanel from "@/components/ui/CustomizerPanel";
import Link from "next/link";

// BraceletCanvas must be loaded client-side only (Three.js has no SSR)
const BraceletCanvas = dynamic(
  () => import("@/components/3d/BraceletCanvas"),
  { ssr: false }
);

export default function CustomizerPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-light via-cream to-pink-blush flex flex-col">
      {/* Navbar */}
      <nav className="px-6 py-4 flex items-center justify-between bg-white/60 backdrop-blur-sm border-b border-pink-mid/20">
        <Link href="/" className="font-display text-xl font-bold text-pink-text">
          BeadStudio
        </Link>
        <span className="text-xs text-pink-text/50 bg-pink-light px-3 py-1 rounded-full">
          Tùy chỉnh vòng tay 3D
        </span>
      </nav>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* 3D Viewport */}
        <div className="flex-1 relative bg-gradient-to-br from-pink-blush/40 to-cream/60 min-h-0">
          <BraceletCanvas />

          {/* Overlay hint */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
            <span className="text-xs text-pink-text/40 bg-white/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
              Kéo để xoay • Scroll để zoom • Click hạt để đặt
            </span>
          </div>
        </div>

        {/* Sidebar panel */}
        <div className="w-80 shrink-0 overflow-hidden">
          <CustomizerPanel />
        </div>
      </div>
    </div>
  );
}
