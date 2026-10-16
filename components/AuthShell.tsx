import Link from "next/link";

export const inputCls =
  "w-full rounded-lg border border-pink-200 bg-pink-50 px-3 py-3 text-rose-950 outline-none focus:border-rose-500";
export const primaryCls =
  "w-full rounded-lg bg-rose-500 py-3 font-semibold text-white hover:bg-rose-700 disabled:opacity-60";

export function AuthShell({
  title, subtitle, children,
}: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen bg-pink-50 md:grid-cols-2">
      <section className="hidden flex-col justify-between bg-gradient-to-br from-pink-300 to-rose-500 p-14 text-white md:flex">
        <Link href="/" aria-label="UsStory - về trang chủ" className="w-fit text-xl font-bold hover:opacity-85 focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
          UsStory
        </Link>
        <h1 className="text-4xl font-bold leading-tight">Chào mừng bạn đến với UsStory</h1>
        <span />
      </section>
      <section className="flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold text-rose-950">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-rose-700/70">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </section>
    </main>
  );
}

export const Notice = ({ kind, children }: { kind: "ok" | "err"; children: React.ReactNode }) => (
  <p role={kind === "err" ? "alert" : "status"}
     className={`rounded-lg p-3 text-sm ${kind === "err" ? "bg-rose-50 text-rose-700" : "bg-pink-100 text-rose-900"}`}>
    {children}
  </p>
);
