import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import MainMenu from "@/components/MainMenu";

export const headerButtonClass =
  "inline-flex min-h-11 items-center rounded-xl border border-[#d8bfa1] bg-white/80 px-3 py-2.5 text-xs font-semibold text-pink-text transition hover:bg-pink-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-text sm:px-4 sm:text-sm";

export default function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="relative z-50 flex w-full shrink-0 items-center gap-3 border-b border-pink-mid/25 bg-gradient-to-r from-pink-light via-cream to-white px-4 py-3 sm:gap-4 sm:px-8 sm:py-5 lg:px-12">
      <MainMenu tone="champagne" />
      <Link href="/" aria-label="UsStory – về trang chủ" className="shrink-0 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pink-text">
        <BrandLogo className="w-32 sm:w-40" sizes="(max-width: 639px) 128px, 160px" />
      </Link>
      {children && <div className="ml-auto flex min-w-0 items-center gap-3">{children}</div>}
    </header>
  );
}
