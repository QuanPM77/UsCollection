"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { CircleCheck, CircleAlert, Clock3 } from "lucide-react";
import CheckoutShell, { checkoutPanelClass, paymentButtonClass } from "@/components/checkout/CheckoutShell";

function ResultContent() {
  const params = useSearchParams();
  const orderId = params.get("orderId") ?? "unknown";
  const wasCancelled = params.get("cancel") === "true";
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid" | "failed">("pending");
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [orderType, setOrderType] = useState<"catalog_product" | "custom_design" | null>(null);
  const [inventoryReviewRequired, setInventoryReviewRequired] = useState(false);
  useEffect(() => {
    if (orderId === "unknown") return;
    let active = true;
    let checking = false;
    let completed = false;
    const controller = new AbortController();
    let timer: number | undefined;
    let syncPayOSOnNextRequest = wasCancelled;
    const refresh = async () => {
      if (!active || checking || completed) return;
      checking = true;
      try {
        const shouldSyncPayOS = syncPayOSOnNextRequest;
        syncPayOSOnNextRequest = false;
        const response = await fetch(`/api/payment/status?orderId=${encodeURIComponent(orderId)}${shouldSyncPayOS ? "&syncPayOS=1" : ""}`, { signal: controller.signal });
        if (!response.ok) return;
        const result = await response.json();
        if (active && ["pending", "paid", "failed"].includes(result.paymentStatus)) {
          setPaymentStatus(result.paymentStatus);
          if (result.paymentStatus !== "pending") {
            completed = true;
            window.clearInterval(timer);
          }
        }
        if (active && typeof result.orderCode === "string") setOrderCode(result.orderCode);
        if (active && ["catalog_product", "custom_design"].includes(result.orderType)) setOrderType(result.orderType);
        if (active) setInventoryReviewRequired(result.inventoryReviewRequired === true);
      } catch { /* Retry while this page remains open. */ }
      finally { checking = false; }
    };
    void refresh();
    timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 2500);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [orderId, wasCancelled]);

  const success = paymentStatus === "paid";
  const pending = paymentStatus === "pending";

  return (
    <CheckoutShell backHref="/transactions" backLabel="Xem đơn hàng của bạn" title="Thông tin thanh toán" subtitle="Theo dõi trạng thái giao dịch và đơn hàng UsStory của bạn.">
      <div className={`${checkoutPanelClass} mx-auto my-8 w-[calc(100%-2rem)] max-w-lg text-center`}>
        <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full bg-pink-light/60 text-[#b9385b]">
          {success && !inventoryReviewRequired ? <CircleCheck aria-hidden="true" className="h-10 w-10" /> : pending ? <Clock3 aria-hidden="true" className="h-10 w-10" /> : <CircleAlert aria-hidden="true" className="h-10 w-10" />}
        </div>
        <h2 aria-live="polite" className="font-display text-2xl font-bold text-pink-text mb-2">
          {success ? (inventoryReviewRequired ? "Đơn hàng cần xác nhận tồn kho" : "Thanh toán thành công!") : pending ? "Đang chờ xác nhận thanh toán" : wasCancelled ? "Thanh toán chưa hoàn tất" : "Thanh toán thất bại"}
        </h2>
        <p className="text-pink-text/60 text-sm mb-2">
          Mã đơn hàng: <span className="font-mono font-medium text-pink-deep">{orderCode ?? "Đang tải..."}</span>
        </p>
        {orderType && <p className="text-pink-text/60 text-xs mb-4">{orderType === "catalog_product" ? "Vòng tay có sẵn" : "Vòng tay thiết kế 3D"}</p>}
        {success && inventoryReviewRequired ? (
          <p className="text-amber-800 text-sm mb-8">
            PayOS đã xác nhận khoản thanh toán, nhưng sản phẩm vừa hết tồn kho do đơn khác được thanh toán trước. Cửa hàng sẽ liên hệ bạn để xử lý đơn hàng.
          </p>
        ) : success ? (
          <p className="text-pink-text/60 text-sm mb-8">
            Cảm ơn bạn! Chúng tôi sẽ liên hệ xác nhận trong vòng 24h.
          </p>
        ) : pending ? (
          <p className="text-pink-text/60 text-sm mb-8">
            {wasCancelled ? "Yêu cầu hủy đã được gửi. Đang chờ PayOS xác nhận trạng thái giao dịch." : "Trạng thái sẽ tự cập nhật sau khi PayOS xác nhận giao dịch. Vui lòng giữ trang này mở trong giây lát."}
          </p>
        ) : wasCancelled ? (
          <p className="text-pink-text/60 text-sm mb-8">Giao dịch chưa được ghi nhận thành công. Bạn có thể quay lại đặt hàng để thử lại.</p>
        ) : (
          <p className="text-pink-text/60 text-sm mb-8">
            Giao dịch không thành công. Vui lòng thử lại.
          </p>
        )}

        <div className="flex flex-col gap-3">
          {!success && !pending && (
            <Link
              href="/checkout"
              className={paymentButtonClass}
            >
              Thử lại
            </Link>
          )}
          <Link
            href="/"
            className="py-3 rounded-2xl bg-pink-light text-pink-text font-semibold text-sm hover:bg-pink-mid/30 transition-colors"
          >
            Về trang chủ
          </Link>
          <Link
            href="/customizer"
            className="text-xs text-pink-deep hover:underline"
          >
            Thiết kế vòng tay mới
          </Link>
        </div>
      </div>
    </CheckoutShell>
  );
}

export default function CheckoutResultPage() {
  return (
    <Suspense fallback={<p role="status" className="p-8 text-center text-pink-text">Đang tải thông tin thanh toán…</p>}>
      <ResultContent />
    </Suspense>
  );
}
