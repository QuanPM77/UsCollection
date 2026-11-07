import Link from "next/link";
import { ArrowLeft, LockKeyhole, QrCode } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";

export default function CheckoutShell({
  children, backHref, backLabel, title = "Hoàn tất chiếc vòng của bạn", subtitle = "Kiểm tra đơn hàng, thêm địa chỉ và thanh toán để gửi câu chuyện của bạn đến tận tay.",
}: {
  children: React.ReactNode;
  backHref: string;
  backLabel: string;
  title?: string;
  subtitle?: string;
}) {
  return (
    <main className="min-h-dvh bg-[radial-gradient(ellipse_at_top_left,_#fce3eb,_#fff8f9_55%,_#fffdf8)] pb-10 text-pink-text">
      <SiteHeader>
        <span className="flex items-center gap-2 text-xs font-medium text-pink-text/70">
          <LockKeyhole aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span><span className="hidden sm:inline">Thanh toán qua </span>PayOS</span>
        </span>
      </SiteHeader>
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-8">
        <Link href={backHref} className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-pink-text/70 hover:text-rose-800"><ArrowLeft aria-hidden="true" className="h-4 w-4" />{backLabel}</Link>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-pink-text/65">{subtitle}</p>
      </div>
      {children}
    </main>
  );
}

export function PaymentMethod() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#d8bfa1]/50 bg-[#fffaf4] p-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-[#927445]"><QrCode aria-hidden="true" className="h-6 w-6" /></span>
      <div><p className="text-sm font-semibold text-pink-text">Chuyển khoản bằng mã QR</p><p className="mt-1 text-xs leading-5 text-pink-text/65">Quét mã trong ứng dụng ngân hàng qua PayOS.</p></div>
    </div>
  );
}

export const checkoutPanelClass = "min-w-0 rounded-3xl border border-white bg-white/85 p-5 shadow-[0_12px_45px_rgba(125,46,70,0.06)] sm:p-7";
export const checkoutGridClass = "mx-auto grid w-full max-w-6xl gap-6 px-4 py-7 sm:px-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start";
export const paymentButtonClass = "flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#b9385b] px-4 py-4 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(185,56,91,0.18)] transition-colors hover:bg-rose-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 disabled:cursor-not-allowed disabled:opacity-50";
