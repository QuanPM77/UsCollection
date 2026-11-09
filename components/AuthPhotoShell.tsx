import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import loginBackground from "@/public/images/login-bracelet.webp";

export const authInputClass = "min-h-12 w-full rounded-2xl border border-rose-900/15 bg-white/30 py-3 pl-12 pr-4 text-base text-rose-950 outline-none transition placeholder:text-rose-950/70 focus:border-rose-600 focus:ring-1 focus:ring-rose-600";
export const authIconClass = "pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-rose-900";
export const authPrimaryClass = "min-h-12 w-full rounded-2xl bg-[#b9385b] px-4 py-3 font-semibold text-white transition hover:bg-rose-800 disabled:cursor-wait disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700";

export default function AuthPhotoShell({ title, subtitle, children }: {
  title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <main
      className="grid h-dvh grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden bg-pink-light bg-cover bg-[position:45%_center] px-4 py-3 text-rose-950 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,34%)] lg:grid-rows-[minmax(0,1fr)] lg:items-center lg:gap-8 lg:bg-center lg:px-[4vw] lg:py-[clamp(1rem,3vh,2.5rem)]"
      style={{ backgroundImage: `url("${loginBackground.src}")` }}
    >
      <div className="flex min-h-0 flex-col items-center lg:h-full lg:items-start lg:pl-[1vw]">
        <Link href="/" aria-label="UsStory – về trang chủ" className="rounded-lg transition hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-700">
          <BrandLogo className="w-32 lg:w-48" sizes="(max-width: 1023px) 128px, 192px" />
        </Link>
        <p className="mt-[clamp(4rem,14vh,9rem)] hidden font-display text-[clamp(1.65rem,2.8vw,3.25rem)] font-semibold italic leading-tight lg:block">
          Chào mừng bạn đến với
          <span className="mt-1 block text-[clamp(3.75rem,6vw,7rem)] leading-none text-rose-700">UsStory</span>
        </p>
      </div>
      <section aria-labelledby="auth-title" className="mx-auto min-h-0 max-h-full w-full max-w-lg self-center overflow-y-auto rounded-[2rem] border border-white/80 bg-[#fff5f6]/90 p-5 shadow-[0_20px_60px_rgba(127,29,57,0.15)] backdrop-blur-sm sm:p-6 lg:max-w-none xl:p-[clamp(1.25rem,3vh,2.5rem)]">
        <h1 id="auth-title" className="font-display text-3xl font-bold sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-rose-950/85 sm:text-base">{subtitle}</p>
        <div className="mt-4">{children}</div>
        <Link href="/" className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl border border-rose-900/15 bg-white/35 px-4 py-3 text-sm font-semibold text-rose-950 transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700">
          <ArrowLeft aria-hidden="true" className="h-5 w-5" />Quay về trang chủ
        </Link>
      </section>
    </main>
  );
}
