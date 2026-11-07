import Link from "next/link";
import SiteHeader, { headerButtonClass } from "@/components/SiteHeader";
import SavedDesigns from "@/components/SavedDesigns";

export default function MyDesignsPage() {
  return <main className="min-h-screen bg-gradient-to-br from-pink-light via-cream to-white text-pink-text">
    <SiteHeader><Link href="/customizer" className={headerButtonClass}>Thiết kế 3D</Link></SiteHeader>
    <div className="w-full px-4 py-8 sm:px-8 lg:px-12">
      <h1 className="font-display text-3xl font-bold">Thiết kế của tôi</h1>
      <p className="mb-8 mt-2 text-sm text-pink-text/70">Những chiếc vòng mang dấu ấn của bạn. Mở mẫu để xoay, phóng to, tiếp tục decor hoặc đặt hàng.</p>
      <SavedDesigns gallery />
    </div>
  </main>;
}
