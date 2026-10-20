import Link from "next/link";
import MainMenu from "@/components/MainMenu";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import CopyContactButton from "@/components/CopyContactButton";
import FeaturedProductsCarousel from "@/components/home/FeaturedProductsCarousel";
import { productImageDisplayUrl } from "@/lib/supabase-storage";

const FEATURES = [
  {
    icon: "✦",
    title: "Thiết kế 3D trực quan",
    desc: "Xem vòng tay của bạn trong không gian 3D trước khi đặt hàng",
  },
  {
    icon: "✦",
    title: "10+ loại hạt cao cấp",
    desc: "Rose quartz, amethyst, ngọc trai, đá mặt trăng và nhiều hơn nữa",
  },
  {
    icon: "✦",
    title: "Đo theo cổ tay bạn",
    desc: "Nhập chu vi cổ tay — chúng tôi tính toán số hạt chính xác",
  },
  {
    icon: "✦",
    title: "Thanh toán PayOS tiện lợi",
    desc: "Quét QR thanh toán nhanh chóng, không cần tài khoản, giao hàng tận nơi",
  },
];

export default async function LandingPage() {
  const [session, storeSettings, socialLinks, products] = await Promise.all([
    auth(),
    prisma.store_settings.findUnique({
      where: { id: 1 },
      select: { store_name: true, contact_phone: true, contact_email: true },
    }),
    prisma.$queryRaw<Array<{ name: string; url: string }>>`
      SELECT "name", "url" FROM "store_social_links"
      ORDER BY "sort_order" ASC, "created_at" ASC
    `,
    prisma.products.findMany({
      where: { type: "bracelet", status: "active" },
      orderBy: { updated_at: "desc" },
      select: { id: true, name: true, price: true, images: true },
    }),
  ]);
  const featuredProducts = await Promise.all(products.map(async (product) => ({
    id: product.id,
    name: product.name,
    price: product.price,
    image: product.images[0] ? await productImageDisplayUrl(product.images[0]) : null,
  })));

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-light via-cream to-white">
      {/* Nav */}
      <nav className="flex w-full items-center gap-4 px-4 py-5 sm:px-8 lg:px-12">
        <MainMenu />
        <span className="font-display text-2xl font-bold text-pink-text">
          UsStory
        </span>
        <div className="ml-auto flex items-center gap-3">
          {session ? (
            <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
              <button className="rounded-xl border border-pink-mid/40 bg-white/80 px-4 py-2.5 text-sm font-semibold text-pink-deep transition hover:bg-pink-light">
                Đăng xuất
              </button>
            </form>
          ) : (
            <Link href="/login" className="rounded-xl border border-pink-mid/40 bg-white/80 px-4 py-2.5 text-sm font-semibold text-pink-deep transition hover:bg-pink-light">
              Đăng nhập
            </Link>
          )}
        </div>
      </nav>

      <FeaturedProductsCarousel products={featuredProducts} />

      {/* 3D bracelet design hero */}
      <section className="relative isolate w-full overflow-hidden border-b border-pink-mid/25 bg-gradient-to-br from-pink-blush/65 via-cream to-white px-4 py-14 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full bg-pink-mid/20 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 left-1/4 h-80 w-80 rounded-full bg-rose-200/25 blur-3xl" />
        <div className="relative grid w-full items-center gap-10 lg:grid-cols-[1fr_0.95fr] lg:gap-16">
          <div className="flex flex-col items-start">
            <div className="inline-flex items-center gap-2 rounded-full border border-pink-mid/35 bg-white/70 px-3.5 py-2 text-xs font-semibold tracking-wide text-pink-deep shadow-sm">
              <span className="h-2 w-2 rounded-full bg-pink-deep shadow-[0_0_0_4px_rgba(229,105,147,0.12)]" />
              THIẾT KẾ VÒNG TAY 3D
            </div>
            <h1 className="mt-6 max-w-2xl font-display text-4xl font-bold leading-[1.12] tracking-tight text-pink-text sm:text-5xl lg:text-6xl">
              Tạo chiếc vòng tay
              <span className="mt-1 block text-pink-deep">mang dấu ấn riêng</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-pink-text/70 sm:text-lg">
              Tự chọn từng loại hạt, phối màu theo phong cách của bạn và xem thiết kế xoay trong không gian 3D trước khi đặt.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/customizer" className="inline-flex items-center gap-2 rounded-xl bg-pink-deep px-6 py-3.5 text-sm font-semibold text-white shadow-pink transition hover:-translate-y-0.5 hover:bg-pink-text hover:shadow-pink-lg">
                Bắt đầu thiết kế
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-pink-text/60 sm:text-sm">
              <span className="inline-flex items-center gap-2"><span className="text-pink-deep">✦</span> Xem trước thiết kế 3D</span>
              <span className="inline-flex items-center gap-2"><span className="text-pink-deep">✦</span> Cá nhân hóa từng hạt</span>
              <span className="inline-flex items-center gap-2"><span className="text-pink-deep">✦</span> Giao hàng toàn quốc</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[560px]">
            <div aria-hidden="true" className="absolute inset-[8%] rounded-full bg-gradient-to-br from-pink-mid/40 to-rose-100/30 blur-2xl" />
            <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[2rem] border border-white/80 bg-[#fde5ec] shadow-[0_24px_80px_rgba(152,73,105,0.14)]">
              <img src="/images/bracelet-3d-reference.png" alt="Vòng tay hạt màu hồng, tím và vàng trong hình minh họa 3D" className="h-full w-full object-contain" />
              <div className="absolute left-5 top-5 rounded-full border border-white/80 bg-white/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-pink-deep shadow-sm sm:left-7 sm:top-7 sm:text-xs">Phối màu của bạn</div>
              <div className="absolute bottom-5 right-5 rounded-2xl border border-white/80 bg-white/85 px-4 py-3 shadow-lg backdrop-blur sm:bottom-7 sm:right-7">
                <p className="text-[10px] font-medium uppercase tracking-wide text-pink-text/50">Trải nghiệm</p>
                <p className="mt-0.5 text-sm font-bold text-pink-deep sm:text-base">Xoay và xem 3D</p>
              </div>
              <span aria-hidden="true" className="absolute right-[17%] top-[21%] h-3 w-3 rounded-full bg-white shadow-[0_0_20px_8px_rgba(255,255,255,0.8)]" />
            </div>
          </div>
        </div>
      </section>

      {/* Why UsStory */}
      <section id="features" className="relative overflow-hidden bg-white/65 py-20 sm:py-24">
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-pink-light/70 blur-3xl" />
        <div className="relative grid w-full gap-12 px-4 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-20 lg:px-12">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-pink-deep">Vòng tay theo câu chuyện của bạn</p>
            <h2 className="mt-4 max-w-xl font-display text-3xl font-bold leading-tight text-pink-text sm:text-4xl lg:text-5xl">
              Tại sao chọn <span className="text-pink-deep">UsStory?</span>
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-pink-text/65">
              Mỗi chiếc vòng bắt đầu từ lựa chọn của riêng bạn. UsStory giúp bạn dễ dàng phối hạt, xem trước thiết kế và tạo nên món phụ kiện mang dấu ấn cá nhân.
            </p>
            <Link href="/customizer" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-pink-deep transition hover:gap-3">
              Khám phá công cụ thiết kế <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="divide-y divide-pink-mid/20 border-y border-pink-mid/20">
            {FEATURES.map((feature, index) => (
              <article key={feature.title} className="group grid grid-cols-[3rem_1fr] gap-4 py-5 sm:grid-cols-[4rem_1fr] sm:gap-6 sm:py-6">
                <span className="pt-0.5 font-display text-lg font-semibold text-pink-mid/80 transition group-hover:text-pink-deep sm:text-xl">0{index + 1}</span>
                <div>
                  <h3 className="font-display text-lg font-semibold text-pink-text sm:text-xl">{feature.title}</h3>
                  <p className="mt-1.5 max-w-xl text-sm leading-6 text-pink-text/60">{feature.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* About Us */}
      <section className="w-full bg-gradient-to-b from-cream/70 to-pink-light/35 px-4 py-20 sm:px-8 sm:py-24 lg:px-12">
        <div className="grid w-full gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:items-start lg:gap-20">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-pink-deep">Câu chuyện UsStory</p>
            <h2 className="mt-4 font-display text-3xl font-bold leading-tight text-pink-text sm:text-4xl">Thông tin về chúng tôi</h2>
          </div>
          <div>
            <p className="font-display text-xl leading-9 text-pink-text sm:text-2xl sm:leading-10">
              UsStory mang đến trải nghiệm tự thiết kế vòng tay theo phong cách và câu chuyện riêng của mỗi người.
            </p>
            <p className="mt-5 text-sm leading-7 text-pink-text/65 sm:text-base">
              UsStory bắt đầu từ mong muốn biến một chiếc vòng tay thành điều gì đó thật riêng — nơi mỗi màu sắc, mỗi loại hạt đều có thể gợi nhắc một kỷ niệm, một người thương hay một dấu mốc đáng nhớ.
            </p>
            <p className="mt-4 text-sm leading-7 text-pink-text/65 sm:text-base">
              Vì vậy, chúng tôi tạo nên không gian để bạn tự do phối hạt, thử nghiệm ý tưởng và xem trước thiết kế 3D. Từng chiếc vòng được hình thành từ câu chuyện và lựa chọn của chính bạn, để khi đeo lên, đó không chỉ là một món phụ kiện mà còn là một phần câu chuyện bạn muốn mang theo.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-gradient-to-r from-pink-mid to-pink-deep py-16">
        <div className="w-full px-4 text-center sm:px-8 lg:px-12">
          <h2 className="font-display text-3xl font-bold text-white mb-4">
            Sẵn sàng tạo vòng tay của bạn?
          </h2>
          <Link
            href="/customizer"
            className="
              inline-flex items-center gap-2 px-10 py-4 rounded-2xl
              bg-white text-pink-deep font-bold text-sm
              hover:shadow-lg hover:-translate-y-0.5 transition-all
            "
          >
            Thiết kế ngay
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-pink-mid/25 bg-pink-light/20 px-4 py-12 text-pink-text/75 sm:px-8 lg:px-12">
        <div className="grid w-full gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12">
          <section className="flex flex-col justify-center">
            <h2 className="font-display text-xl font-bold text-pink-deep">{storeSettings?.store_name || "UsStory"}</h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-pink-text/60">Vòng tay thủ công, thiết kế dành riêng cho bạn.</p>
          </section>
          <section className="flex flex-col items-center">
            <h3 className="mb-4 text-sm font-semibold text-pink-text">Liên hệ hỗ trợ</h3>
            <div className="w-full max-w-md space-y-3">
              {storeSettings?.contact_phone && <CopyContactButton label="Số điện thoại" value={storeSettings.contact_phone} />}
              {storeSettings?.contact_email && <CopyContactButton label="Email hỗ trợ" value={storeSettings.contact_email} />}
              {!storeSettings?.contact_phone && !storeSettings?.contact_email && <p className="text-sm text-pink-text/55">Thông tin liên hệ sẽ được cập nhật.</p>}
            </div>
          </section>
          <section>
            <h3 className="mb-4 text-sm font-semibold text-pink-text">Theo dõi UsStory</h3>
            {socialLinks.length > 0 ? <ul className="grid gap-2">
              {socialLinks.map((link, index) => <li key={`${link.url}-${index}`}><a href={link.url} target="_blank" rel="noopener noreferrer" className="w-fit text-sm font-medium text-pink-deep transition hover:underline">{link.name} <span aria-hidden="true">↗</span></a></li>)}
            </ul> : <p className="text-sm text-pink-text/55">Các kênh mạng xã hội sẽ được cập nhật.</p>}
          </section>
        </div>
        <p className="mt-8 w-full border-t border-pink-mid/15 pt-5 text-center text-xs text-pink-text/45">© {new Date().getFullYear()} {storeSettings?.store_name || "UsStory"}. Handcrafted with love.</p>
      </footer>
    </div>
  );
}
