"use client";

import Link from "next/link";
import { useState } from "react";

const MENU_ITEMS = [
  { href: "/buy", label: "Mua vòng" },
  { href: "/customizer", label: "Thiết kế" },
  { href: "/favorites", label: "Yêu thích" },
  { href: "/transactions", label: "Lịch sử giao dịch" },
  { href: "/customer", label: "Thông tin tài khoản" },
];

export default function MainMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative z-50">
      <button
        type="button"
        aria-label={open ? "Đóng menu" : "Mở menu"}
        aria-expanded={open}
        aria-controls="main-navigation"
        onClick={() => setOpen((value) => !value)}
        className="flex h-11 w-11 flex-col items-center justify-center gap-1.5 rounded-xl border border-pink-mid/40 bg-white/80 text-pink-text shadow-sm transition hover:bg-pink-light"
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
            className="absolute left-0 top-14 z-50 w-72 overflow-hidden rounded-2xl border border-pink-mid/30 bg-white p-2 shadow-xl"
          >
            {MENU_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block rounded-xl px-4 py-3 text-sm font-medium text-pink-text transition hover:bg-pink-light hover:text-pink-deep"
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
