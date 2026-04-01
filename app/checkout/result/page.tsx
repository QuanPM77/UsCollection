"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

function ResultContent() {
  const params = useSearchParams();
  const orderId = params.get("orderId") ?? "unknown";
  const resultCode = params.get("resultCode") ?? "0"; // 0 = success in MoMo

  const success = resultCode === "0";

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-light to-cream flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-pink-lg p-10 max-w-md w-full text-center">
        <div className="text-6xl mb-6">{success ? "🎀" : "😕"}</div>
        <h1 className="font-display text-2xl font-bold text-pink-text mb-2">
          {success ? "Thanh toán thành công!" : "Thanh toán thất bại"}
        </h1>
        <p className="text-pink-text/60 text-sm mb-2">
          Mã đơn hàng: <span className="font-mono font-medium text-pink-deep">{orderId}</span>
        </p>
        {success ? (
          <p className="text-pink-text/60 text-sm mb-8">
            Cảm ơn bạn! Chúng tôi sẽ liên hệ xác nhận trong vòng 24h.
          </p>
        ) : (
          <p className="text-pink-text/60 text-sm mb-8">
            Giao dịch không thành công. Vui lòng thử lại.
          </p>
        )}

        <div className="flex flex-col gap-3">
          {!success && (
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
