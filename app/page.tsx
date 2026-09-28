import Link from "next/link";

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
    title: "Thanh toán MoMo tiện lợi",
    desc: "Đặt hàng nhanh, không cần tài khoản, giao hàng tận nơi",
  },
];

const TESTIMONIALS = [
  {
    name: "Nguyễn Linh",
    text: "Vòng tay đẹp hơn mong đợi. Nhìn 3D trước khi mua rất yên tâm!",
    rating: 5,
  },
  {
    name: "Trần Minh Anh",
    text: "Thiết kế xong trong 5 phút, hôm sau đã nhận hàng. Tuyệt vời!",
    rating: 5,
  },
  {
    name: "Phạm Thu Hương",
    text: "Rose quartz đẹp lắm, sẽ mua thêm cho bạn bè.",
    rating: 5,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-light via-cream to-white">
      {/* Nav */}
      <nav className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <span className="font-display text-2xl font-bold text-pink-text">
          BeadStudio
        </span>
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="text-xs font-medium text-stone-500 hover:text-pink-deep transition-colors"
          >
            Quản trị (Admin)
          </Link>
          <Link
            href="/customizer"
            className="text-sm font-medium text-pink-deep hover:text-pink-text transition-colors"
          >
            Thiết kế ngay
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-24 grid lg:grid-cols-2 gap-12 items-center">
        <div className="flex flex-col gap-6">
          <div className="inline-flex w-fit items-center gap-2 bg-pink-blush/60 text-pink-text text-xs font-medium px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-deep" />
            Vòng tay thủ công — thiết kế 3D
          </div>

          <h1 className="font-display text-5xl lg:text-6xl font-bold text-pink-text leading-tight">
            Vòng tay
            <br />
            <span className="text-pink-deep">riêng của bạn</span>
          </h1>

          <p className="text-pink-text/70 text-lg leading-relaxed max-w-md">
            Chọn từng hạt, xem ngay trong 3D, đặt hàng trong vài phút.
            Mỗi chiếc vòng là một câu chuyện riêng.
          </p>

          <div className="flex gap-3 flex-wrap">
            <Link
              href="/customizer"
              className="
                inline-flex items-center gap-2 px-8 py-4 rounded-2xl
                bg-pink-deep text-white font-semibold text-sm
                shadow-pink hover:shadow-pink-lg hover:-translate-y-0.5
                transition-all duration-200
              "
            >
              Bắt đầu thiết kế
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <a
              href="#features"
              className="
                inline-flex items-center gap-2 px-8 py-4 rounded-2xl
                bg-white/70 text-pink-text font-semibold text-sm
                border border-pink-mid/40
                hover:bg-pink-light transition-all duration-200
              "
            >
              Xem thêm
            </a>
          </div>

          <p className="text-xs text-pink-text/40">
            Miễn phí thiết kế • Giao hàng toàn quốc • Thanh toán MoMo
          </p>
        </div>

        {/* Hero visual — placeholder bracelet preview card */}
        <div className="relative flex items-center justify-center">
          <div className="w-72 h-72 lg:w-96 lg:h-96 rounded-full bg-gradient-to-br from-pink-blush to-pink-mid/60 flex items-center justify-center shadow-pink-lg">
            <div className="text-center">
              <div className="text-7xl mb-4">🔮</div>
              <p className="text-pink-text font-display font-semibold text-lg">3D Preview</p>
              <p className="text-pink-text/60 text-sm mt-1">trong trang thiết kế</p>
            </div>
          </div>
          {/* Floating badges */}
          <div className="absolute top-4 right-0 bg-white rounded-xl px-3 py-2 shadow-pink text-xs font-medium text-pink-text">
            Rose Quartz ✦
          </div>
          <div className="absolute bottom-8 left-0 bg-white rounded-xl px-3 py-2 shadow-pink text-xs font-medium text-pink-text">
            Amethyst ✦
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-white/50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="font-display text-3xl font-bold text-pink-text text-center mb-12">
            Tại sao chọn BeadStudio?
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-cream rounded-2xl p-6 border border-pink-mid/20 hover:shadow-pink transition-all"
              >
                <span className="text-pink-deep text-2xl font-bold mb-3 block">{f.icon}</span>
                <h3 className="font-semibold text-pink-text mb-2 text-sm">{f.title}</h3>
                <p className="text-pink-text/60 text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 max-w-6xl mx-auto px-6">
        <h2 className="font-display text-3xl font-bold text-pink-text text-center mb-12">
          Khách hàng nói gì?
        </h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-pink-mid/20 shadow-sm"
            >
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <span key={i} className="text-pink-deep text-sm">★</span>
                ))}
              </div>
              <p className="text-pink-text/80 text-sm leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p>
              <p className="text-pink-deep text-xs font-semibold">{t.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-gradient-to-r from-pink-mid to-pink-deep py-16">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="font-display text-3xl font-bold text-white mb-4">
            Sẵn sàng tạo vòng tay của bạn?
          </h2>
          <p className="text-white/80 mb-8">Chỉ mất 5 phút. Không cần tài khoản.</p>
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
      <footer className="py-8 text-center text-xs text-pink-text/40">
        © 2026 BeadStudio. Handcrafted with love.
      </footer>
    </div>
  );
}
