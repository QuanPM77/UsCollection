import Link from "next/link";
import MainMenu from "@/components/MainMenu";

export default function TransactionsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-light via-cream to-white text-pink-text">
      <header className="flex items-center gap-4 border-b border-pink-mid/25 bg-white/70 px-6 py-4">
        <MainMenu />
        <Link href="/" className="font-display text-xl font-bold">UsStory</Link>
      </header>
      <section className="mx-auto flex min-h-[65vh] max-w-3xl flex-col items-center justify-center px-6 text-center">
        <span className="mb-4 text-5xl">🧾</span>
        <h1 className="font-display text-3xl font-bold">Lịch sử giao dịch</h1>
        <p className="mt-3 max-w-lg text-sm leading-6 text-pink-text/65">Lịch sử đơn hàng và thanh toán sẽ hiển thị tại đây khi được kết nối với tài khoản.</p>
        <Link href="/customizer" className="mt-7 rounded-xl bg-pink-deep px-6 py-3 text-sm font-semibold text-white hover:bg-pink-text">Thiết kế vòng tay</Link>
      </section>
    </main>
  );
}
