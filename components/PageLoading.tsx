import SiteHeader from "@/components/SiteHeader";

export default function PageLoading({ title }: { title: string }) {
  return <main className="min-h-screen bg-gradient-to-br from-pink-light via-cream to-white text-pink-text">
    <SiteHeader />
    <section aria-busy="true" aria-label={title} className="w-full px-4 py-8 sm:px-8 lg:px-12">
      <h1 className="font-display text-3xl font-bold">{title}</h1>
      <p role="status" className="mt-3 text-sm text-pink-text/65">Đang tải nội dung…</p>
      <div aria-hidden="true" className="mt-7 grid gap-4 motion-safe:animate-pulse sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map(index => <div key={index} className="rounded-2xl border border-pink-mid/25 bg-white/80 p-5">
          <div className="h-32 rounded-xl bg-pink-light/70" />
          <div className="mt-4 h-4 w-3/4 rounded bg-pink-light" />
          <div className="mt-3 h-3 w-1/2 rounded bg-pink-light/60" />
        </div>)}
      </div>
    </section>
  </main>;
}
