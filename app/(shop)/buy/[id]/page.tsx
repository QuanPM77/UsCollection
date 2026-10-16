import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import MainMenu from "@/components/MainMenu";
import { prisma } from "@/lib/prisma";
import { avatarDisplayUrl, productImageDisplayUrl } from "@/lib/supabase-storage";
import { productStyleLabel } from "@/lib/product-styles";
import ProductGallery from "./ProductGallery";
import ReviewForm from "./ReviewForm";
import FavoriteButton from "../FavoriteButton";

const currency = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" });

export default async function BraceletDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ review?: string }>;
}) {
  const [{ id }, query, session] = await Promise.all([params, searchParams, auth()]);
  const product = await prisma.products.findFirst({
    where: { id, type: "bracelet", status: "active" },
    include: {
      bracelet_product_details: true,
      reviews: {
        include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      },
    },
  });
  if (!product) notFound();

  const productStyles = Array.isArray(product.styles) ? product.styles : [];
  const myReview = session?.user.id ? product.reviews.find((review) => review.userId === session.user.id) : undefined;
  const averageRating = product.reviews.length
    ? product.reviews.reduce((total, review) => total + review.rating, 0) / product.reviews.length
    : null;
  const reviews = await Promise.all(product.reviews.map(async (review) => ({
    ...review,
    avatar: await avatarDisplayUrl(review.user.avatarUrl),
  })));
  const productImages = await Promise.all(product.images.map(productImageDisplayUrl));

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-light via-cream to-white text-pink-text">
      <header className="flex items-center gap-4 border-b border-pink-mid/25 bg-white/70 px-6 py-4">
        <MainMenu /><Link href="/" className="font-display text-xl font-bold">UsStory</Link>
      </header>
      <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8">
        <Link href="/buy" className="text-sm font-medium text-pink-deep hover:underline">← Quay lại Mua vòng</Link>
        <section className="mt-5 grid gap-8 lg:grid-cols-2 lg:gap-12">
          <ProductGallery images={productImages} name={product.name} />
          <div className="py-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-pink-deep">Vòng tay bán sẵn</p>
            <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{product.name}</h1>
            <p className="mt-4 text-2xl font-bold text-pink-deep">{currency.format(product.price)}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-pink-text/65">
              <span>{product.stock > 0 ? `Còn ${product.stock} sản phẩm` : "Tạm hết hàng"}</span>
              {averageRating !== null && <a href="#reviews" className="text-amber-600 hover:underline">★ {averageRating.toFixed(1)} · {product.reviews.length} đánh giá</a>}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={`/checkout/product/${product.id}`} aria-disabled={product.stock < 1} className={`inline-flex min-w-40 flex-1 items-center justify-center rounded-2xl px-5 py-4 text-sm font-bold text-white shadow-lg transition ${product.stock > 0 ? "bg-pink-deep hover:-translate-y-0.5 hover:bg-pink-text" : "pointer-events-none bg-pink-mid/50"}`}>
                Mua ngay
              </Link>
              <FavoriteButton productId={product.id} variant="label" />
            </div>
            {productStyles.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{productStyles.map((style) => <span key={style} className="rounded-full bg-pink-light px-3 py-1.5 text-xs font-semibold text-pink-deep">{productStyleLabel(style)}</span>)}</div>}
            {product.description && <p className="mt-6 whitespace-pre-line text-sm leading-7 text-pink-text/75">{product.description}</p>}

            <div className="mt-7 rounded-2xl border border-pink-mid/25 bg-white/80 p-5">
              <h2 className="font-semibold">Thông tin sản phẩm</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-pink-text/75">
                {product.bracelet_product_details && <li>• Chu vi vòng: {product.bracelet_product_details.wrist_circumference} mm</li>}
                {product.details.map((detail, index) => <li key={`${index}-${detail}`}>• {detail}</li>)}
                {!product.bracelet_product_details && product.details.length === 0 && <li className="text-pink-text/50">Thông tin đang được cập nhật.</li>}
              </ul>
            </div>
            <p className="mt-4 text-xs text-pink-text/50">Mã sản phẩm: {product.sku}</p>
          </div>
        </section>

        <section id="reviews" className="mt-12 scroll-mt-6 border-t border-pink-mid/25 pt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><h2 className="font-display text-2xl font-bold">Đánh giá của khách hàng</h2><p className="mt-1 text-sm text-pink-text/60">{product.reviews.length} bình luận</p></div>
            {averageRating !== null && <p className="text-lg font-semibold"><span className="text-amber-500">★</span> {averageRating.toFixed(1)} / 5</p>}
          </div>

          {query.review === "posted" && <p role="status" className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Đánh giá của bạn đã được lưu.</p>}
          {session?.user.role === "customer" ? <ReviewForm productId={product.id} rating={myReview?.rating} comment={myReview?.comment} /> : <p className="mt-5 rounded-2xl bg-white p-4 text-sm text-pink-text/70">Vui lòng <Link href="/login" className="font-semibold text-pink-deep underline">đăng nhập bằng tài khoản khách hàng</Link> để viết đánh giá.</p>}

          <div className="mt-6 divide-y divide-pink-mid/20">
            {reviews.length === 0 && <p className="py-8 text-center text-sm text-pink-text/55">Sản phẩm chưa có đánh giá. Hãy là người đầu tiên chia sẻ cảm nhận.</p>}
            {reviews.map((review) => <article key={review.id} className="flex gap-3 py-5">
              {review.avatar ? <img src={review.avatar} alt="" className="h-11 w-11 shrink-0 rounded-full bg-pink-light object-cover" /> : <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pink-deep font-semibold text-white">{(review.user.fullName?.trim().charAt(0) || "K").toUpperCase()}</div>}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><p className="font-semibold">{review.user.fullName?.trim() || "Khách hàng"}</p><span className="text-xs text-pink-text/50">{dateFormatter.format(review.createdAt)}</span></div>
                <p className="mt-1 tracking-wide text-amber-500" aria-label={`${review.rating} trên 5 sao`}>{"★".repeat(review.rating)}<span className="text-gray-300">{"★".repeat(5 - review.rating)}</span></p>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-pink-text/75">{review.comment}</p>
              </div>
            </article>)}
          </div>
        </section>
      </div>
    </main>
  );
}
