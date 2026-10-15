import Link from "next/link";
import MainMenu from "@/components/MainMenu";

export default function FavoritesPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-light via-cream to-white text-pink-text">
      <header className="flex items-center gap-4 border-b border-pink-mid/25 bg-white/70 px-6 py-4">
        <MainMenu />
        <Link href="/" className="font-display text-xl font-bold">UsStory</Link>
      </header>
      <section className="mx-auto flex min-h-[65vh] max-w-3xl flex-col items-center justify-center px-6 text-center">
        <span className="mb-4 text-5xl">♡</span>
        <h1 className="font-display text-3xl font-bold">Yêu thích</h1>
        <p className="mt-3 max-w-lg text-sm leading-6 text-pink-text/65">Danh sách sản phẩm yêu thích sẽ hiển thị tại đây khi tính năng được triển khai.</p>
        <Link href="/" className="mt-7 rounded-xl border border-pink-mid/50 bg-white px-6 py-3 text-sm font-semibold text-pink-deep hover:bg-pink-light">Về trang chủ</Link>
      </section>
    </main>
  );
}
