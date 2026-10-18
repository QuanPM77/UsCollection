"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";

function ResultContent() {
  const params = useSearchParams();
  const orderId = params.get("orderId") ?? "unknown";
  const wasCancelled = params.get("cancel") === "true";
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid" | "failed">("pending");
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [orderType, setOrderType] = useState<"catalog_product" | "custom_design" | null>(null);
  useEffect(() => {
    if (orderId === "unknown") return;
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch(`/api/payment/status?orderId=${encodeURIComponent(orderId)}`);
        if (!response.ok) return;
        const result = await response.json();
        if (active && ["pending", "paid", "failed"].includes(result.paymentStatus)) setPaymentStatus(result.paymentStatus);
        if (active && typeof result.orderCode === "string") setOrderCode(result.orderCode);
        if (active && ["catalog_product", "custom_design"].includes(result.orderType)) setOrderType(result.orderType);
      } catch { /* Retry while this page remains open. */ }
    };
    void refresh();
    const timer = window.setInterval(refresh, 2500);
    return () => { active = false; window.clearInterval(timer); };
  }, [orderId]);

  const success = paymentStatus === "paid";
  const pending = paymentStatus === "pending";

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-light to-cream flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-pink-lg p-10 max-w-md w-full text-center">
        <div className="text-6xl mb-6">{success ? "🎀" : pending ? "⏳" : "😕"}</div>
        <h1 className="font-display text-2xl font-bold text-pink-text mb-2">
          {success ? "Thanh toán thành công!" : wasCancelled ? "Bạn đã hủy thanh toán" : pending ? "Đang chờ xác nhận thanh toán" : "Thanh toán thất bại"}
        </h1>
        <p className="text-pink-text/60 text-sm mb-2">
          Mã đơn hàng: <span className="font-mono font-medium text-pink-deep">{orderCode ?? "Đang tải..."}</span>
        </p>
        {orderType && <p className="text-pink-text/60 text-xs mb-4">{orderType === "catalog_product" ? "Vòng tay có sẵn" : "Vòng tay thiết kế 3D"}</p>}
        {success ? (
          <p className="text-pink-text/60 text-sm mb-8">
            Cảm ơn bạn! Chúng tôi sẽ liên hệ xác nhận trong vòng 24h.
          </p>
        ) : wasCancelled ? (
          <p className="text-pink-text/60 text-sm mb-8">Đơn hàng chưa được thanh toán. Bạn có thể quay lại đặt hàng để thử lại.</p>
        ) : pending ? (
          <p className="text-pink-text/60 text-sm mb-8">
            Trạng thái sẽ tự cập nhật sau khi PayOS xác nhận giao dịch. Vui lòng giữ trang này mở trong giây lát.
          </p>
        ) : (
          <p className="text-pink-text/60 text-sm mb-8">
            Giao dịch không thành công. Vui lòng thử lại.
          </p>
        )}

        <div className="flex flex-col gap-3">
          {!success && (!pending || wasCancelled) && (
            <Link
              href="/checkout"
              className="py-3 rounded-2xl bg-pink-deep text-white font-semibold text-sm hover:opacity-90 transition-opacity"
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
    </div>
  );
}

export default function CheckoutResultPage() {
  return (
    <Suspense>
      <ResultContent />
    </Suspense>
  );
}
