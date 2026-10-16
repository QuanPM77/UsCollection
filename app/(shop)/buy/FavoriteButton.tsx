"use client";

import { useFavorites, toggleFavorite } from "@/lib/favorites";

export default function FavoriteButton({ productId, variant = "icon" }: { productId: string; variant?: "icon" | "label" }) {
  const favorites = useFavorites();
  const active = favorites.includes(productId);

  return <button
    type="button"
    aria-pressed={active}
    aria-label={active ? "Bỏ khỏi mục yêu thích" : "Thêm vào mục yêu thích"}
    title={active ? "Bỏ khỏi mục yêu thích" : "Thêm vào mục yêu thích"}
    onClick={() => toggleFavorite(productId)}
    className={variant === "label"
      ? `inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${active ? "border-red-200 bg-red-50 text-red-600" : "border-pink-mid/40 bg-white text-pink-text hover:bg-pink-light"}`
      : `absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-2xl leading-none shadow-md transition hover:scale-110 ${active ? "text-red-600" : "text-gray-400 hover:text-red-500"}`}
  >
    <span aria-hidden="true">{active ? "♥" : "♡"}</span>
    {variant === "label" && <span>{active ? "Đã yêu thích" : "Yêu thích"}</span>}
  </button>;
}
