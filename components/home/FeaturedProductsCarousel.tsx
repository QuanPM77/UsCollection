"use client";

import { useEffect, useState, type TransitionEvent } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

type FeaturedProduct = { id: string; name: string; price: number; image: string | null };
const currency = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

export default function FeaturedProductsCarousel({ products }: { products: FeaturedProduct[] }) {
  const [startIndex, setStartIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [sliding, setSliding] = useState(false);
  const [pendingSlide, setPendingSlide] = useState(false);

  useEffect(() => {
    if (!pendingSlide) return;
    const frame = window.requestAnimationFrame(() => {
      setPendingSlide(false);
      setSliding(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pendingSlide]);

  useEffect(() => {
    if (products.length < 2 || sliding || pendingSlide) return;
    const timer = window.setTimeout(() => {
      setDirection(1);
      setPendingSlide(true);
    }, 10000);
    return () => window.clearTimeout(timer);
  }, [products.length, pendingSlide, sliding, startIndex]);

  if (products.length === 0) return null;

  const firstTrackIndex = startIndex + (direction === -1 ? -1 : 0);
  const trackLength = Math.min(products.length === 3 ? 4 : products.length, 4);
  const trackProducts = Array.from({ length: trackLength }, (_, offset) => products[(firstTrackIndex + offset + products.length) % products.length]);
  const oneCardOffset = "-translate-x-full sm:-translate-x-1/2 lg:-translate-x-1/3";
  const trackPosition = direction === 1 ? (sliding ? oneCardOffset : "translate-x-0") : (sliding ? "translate-x-0" : oneCardOffset);
  const move = (step: -1 | 1) => {
    if (sliding || pendingSlide || products.length < 2) return;
    setDirection(step);
    setPendingSlide(true);
  };
  const finishSlide = (event: TransitionEvent<HTMLDivElement>) => {
    if (!sliding || event.target !== event.currentTarget || event.propertyName !== "transform") return;
    setStartIndex((index) => (index + direction + products.length) % products.length);
    setSliding(false);
  };

  return <section aria-label="Sản phẩm bán sẵn nổi bật" className="w-full border-y border-pink-mid/30 bg-white/65 px-4 py-9 shadow-sm sm:px-8 lg:px-12">
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pink-deep">Bộ sưu tập UsStory</p>
        <h2 className="mt-1 font-display text-2xl font-bold text-pink-text sm:text-3xl">Vòng tay bán sẵn</h2>
        <p className="mt-1 text-sm text-pink-text/60">Các mẫu vòng hoàn thiện, sẵn sàng dành cho bạn.</p>
      </div>
      <Link href="/buy" className="text-sm font-semibold text-pink-deep hover:underline">Xem tất cả sản phẩm →</Link>
    </div>

    <div className="flex items-center gap-2 sm:gap-4">
      <button type="button" onClick={() => move(-1)} disabled={sliding || pendingSlide || products.length < 2} aria-label="Xem sản phẩm trước" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-pink-mid/40 bg-white text-pink-deep shadow-sm transition hover:border-pink-deep hover:bg-pink-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-deep/30 disabled:opacity-50 sm:h-11 sm:w-11">
        <ChevronLeft size={22} />
      </button>
      <div className="min-w-0 flex-1 overflow-hidden" aria-live="polite">
        <div onTransitionEnd={finishSlide} style={{ transition: sliding ? "transform 650ms cubic-bezier(0.22, 1, 0.36, 1)" : "none" }} className={`flex w-full ${trackPosition}`}>
          {trackProducts.map((product, index) => <div key={`${product.id}-${index}`} className="w-full shrink-0 px-1.5 sm:w-1/2 sm:px-2 lg:w-1/3">
            <Link href={`/buy/${product.id}`} className="group block overflow-hidden rounded-2xl border border-pink-mid/25 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="aspect-[4/3] overflow-hidden bg-white">
                {product.image ? <img src={product.image} alt={product.name} loading="lazy" decoding="async" className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.03]" /> : <div className="flex h-full items-center justify-center text-5xl">💎</div>}
              </div>
              <div className="p-4">
                <h3 className="truncate text-sm font-semibold text-pink-text sm:text-base">{product.name}</h3>
                <p className="mt-1.5 text-base font-bold text-pink-deep">{currency.format(product.price)}</p>
              </div>
            </Link>
          </div>)}
        </div>
      </div>
      <button type="button" onClick={() => move(1)} disabled={sliding || pendingSlide || products.length < 2} aria-label="Xem sản phẩm tiếp theo" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-pink-mid/40 bg-white text-pink-deep shadow-sm transition hover:border-pink-deep hover:bg-pink-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-deep/30 disabled:opacity-50 sm:h-11 sm:w-11">
        <ChevronRight size={22} />
      </button>
    </div>
  </section>;
}
