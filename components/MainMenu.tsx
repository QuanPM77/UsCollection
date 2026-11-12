"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLoginPrompt } from "@/components/LoginPromptProvider";

const MENU_ITEMS = [
  { href: "/", label: "Trang chủ" },
  { href: "/buy", label: "Mua vòng" },
  { href: "/customizer", label: "Thiết kế" },
  { href: "/favorites", label: "Yêu thích", requiresLogin: true },
  { href: "/my-designs", label: "Thiết kế của tôi", requiresLogin: true },
  { href: "/transactions", label: "Lịch sử giao dịch", requiresLogin: true },
  { href: "/customer", label: "Thông tin tài khoản", requiresLogin: true },
];

export default function MainMenu({ tone = "pink" }: { tone?: "pink" | "champagne" }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const prefetched = useRef(new Map<string, number>());
  const { isAuthenticated, requestLogin } = useLoginPrompt();
  const champagne = tone === "champagne";
  function preparePage(item: (typeof MENU_ITEMS)[number]) {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if ((item.requiresLogin && !isAuthenticated) || navigator.onLine === false || connection?.saveData || ["slow-2g", "2g", "3g"].includes(connection?.effectiveType ?? "")) return;
    const last = prefetched.current.get(item.href);
    if (last !== undefined && Date.now() - last < 30000) return;
    prefetched.current.set(item.href, Date.now());
    router.prefetch(item.href);
  }

  return (
    <div className="relative z-50">
      <button
        type="button"
        aria-label={open ? "Đóng menu" : "Mở menu"}
        aria-expanded={open}
        aria-controls="main-navigation"
        onClick={() => setOpen((value) => !value)}
        className={`flex h-11 w-11 flex-col items-center justify-center gap-1.5 rounded-xl border shadow-sm transition ${champagne
          ? "border-[#d8bfa1] bg-white/80 text-pink-text hover:bg-pink-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-text"
          : "border-pink-mid/40 bg-white/80 text-pink-text hover:bg-pink-light"}`}
      >
        <span className={`h-0.5 w-5 rounded bg-current transition-transform ${open ? "translate-y-2 rotate-45" : ""}`} />
        <span className={`h-0.5 w-5 rounded bg-current transition-opacity ${open ? "opacity-0" : "opacity-100"}`} />
        <span className={`h-0.5 w-5 rounded bg-current transition-transform ${open ? "-translate-y-2 -rotate-45" : ""}`} />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Đóng menu"
            className="fixed inset-0 z-40 cursor-default bg-slate-950/20"
            onClick={() => setOpen(false)}
          />
          <nav
            id="main-navigation"
            aria-label="Menu chính"
            className={`absolute left-0 top-14 z-50 w-72 overflow-hidden rounded-2xl border p-2 shadow-xl ${champagne
              ? "border-[#d8bfa1] bg-cream"
              : "border-pink-mid/30 bg-white"}`}
          >
            {MENU_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                onMouseEnter={() => preparePage(item)}
                onFocus={() => preparePage(item)}
                onTouchStart={() => preparePage(item)}
                onClick={(event) => {
                  setOpen(false);
                  if (item.requiresLogin && !isAuthenticated) {
                    event.preventDefault();
                    requestLogin(item.href);
                  }
                }}
                className={`block rounded-xl px-4 py-3 text-sm font-medium transition ${champagne
                  ? "text-pink-text hover:bg-pink-light focus-visible:bg-pink-light"
                  : "text-pink-text hover:bg-pink-light hover:text-pink-deep"}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}
