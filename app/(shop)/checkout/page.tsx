"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useBraceletStore } from "@/lib/store";
import { formatPrice } from "@/lib/beadData";
import { useBeadCatalog } from "@/lib/useBeadCatalog";
import { PaymentContext, PayOSStrategy } from "@/lib/payment";
import { useLoginPrompt } from "@/components/LoginPromptProvider";
import AddressFields, { type AddressParts } from "@/components/AddressFields";
import { isValidVietnamWard } from "@/lib/vietnam-addresses";

type FormData = {
  name: string;
  phone: string;
};

type FormErrors = Partial<FormData> & { address?: string };

function validate(data: FormData): FormErrors {
  const errors: FormErrors = {};
  if (!data.name.trim()) errors.name = "Vui lòng nhập họ tên";
  if (!/^(0|\+84)[0-9]{8,10}$/.test(data.phone.replace(/\s/g, "")))
    errors.phone = "Số điện thoại không hợp lệ";
  return errors;
}

const paymentCtx = new PaymentContext(new PayOSStrategy());

export default function CheckoutPage() {
  const router = useRouter();
  const { isAuthenticated, requestLogin } = useLoginPrompt();
  const { slots, wristCircumference, totalPrice, filledCount, beadCatalog } = useBraceletStore();
  useBeadCatalog();

  const [form, setForm] = useState<FormData>({ name: "", phone: "" });
  const [addressParts, setAddressParts] = useState<AddressParts>({ street: "", province: "", ward: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [payUrl, setPayUrl] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [paymentOpened, setPaymentOpened] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [serverAmount, setServerAmount] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const paymentWindow = useRef<Window | null>(null);
  const cancelInProgress = useRef(false);

  const total = totalPrice();
  const filled = filledCount();

  const filledSlots = slots.filter((s) => s.beadTypeId !== null);

  const finishCancellation = useCallback((message: string) => {
    paymentWindow.current?.close();
    paymentWindow.current = null;
    setPayUrl(null);
    setOrderId(null);
    setExpiresAt(null);
    setRemainingSeconds(0);
    setPaymentOpened(false);
    setServerAmount(null);
    setNotice(message);
    setCanceling(false);
    cancelInProgress.current = false;
  }, []);

  const cancelCurrentOrder = useCallback(async (expired: boolean) => {
    if (!orderId || cancelInProgress.current) return;
    cancelInProgress.current = true;
    setCanceling(true);
    try {
      const response = await fetch("/api/payment/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message ?? "Chưa thể hủy thanh toán.");
      if (result.paymentStatus === "paid") {
        paymentWindow.current?.close();
        window.location.assign(`/checkout/result?orderId=${encodeURIComponent(orderId)}`);
        return;
      }
      setSubmitError(null);
      finishCancellation(expired ? "Mã thanh toán đã hết hạn" : "Đơn đã hủy");
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : "Chưa thể hủy thanh toán");
      setCanceling(false);
      cancelInProgress.current = false;
    }
  }, [finishCancellation, orderId]);

  useEffect(() => {
    if (!orderId || !payUrl || !expiresAt) return;
    const popup = paymentWindow.current;
    let checkingStatus = false;
    let cancellationTriggered = false;
    const countdownTimer = window.setInterval(() => {
      const seconds = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setRemainingSeconds(seconds);
      if (!cancellationTriggered && popup?.closed) {
        cancellationTriggered = true;
        void cancelCurrentOrder(false);
      } else if (!cancellationTriggered && seconds === 0) {
        cancellationTriggered = true;
        void cancelCurrentOrder(true);
      }
    }, 500);
    const statusTimer = window.setInterval(async () => {
      if (checkingStatus || cancelInProgress.current) return;
      checkingStatus = true;
      try {
        const response = await fetch(`/api/payment/status?orderId=${encodeURIComponent(orderId)}`);
        if (response.ok) {
          const result = await response.json();
          if (result.paymentStatus === "paid") {
            popup?.close();
            window.location.assign(`/checkout/result?orderId=${encodeURIComponent(orderId)}`);
          } else if (result.paymentStatus === "failed") {
            finishCancellation("Thanh toán đã hủy");
          }
        }
      } catch {
        // Keep checking; the payment link still expires on the server.
      } finally {
        checkingStatus = false;
      }
    }, 2500);
    return () => {
      window.clearInterval(countdownTimer);
      window.clearInterval(statusTimer);
    };
  }, [cancelCurrentOrder, expiresAt, finishCancellation, orderId, payUrl]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      requestLogin();
      return;
    }
    setSubmitError(null);

    const validationErrors = validate(form);
    if (addressParts.street.trim().length < 3 || !isValidVietnamWard(addressParts.province, addressParts.ward)) {
      validationErrors.address = "Vui lòng nhập địa chỉ và chọn phường/xã hợp lệ.";
    }
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    paymentWindow.current = window.open("about:blank", "_blank");
    setPaymentOpened(Boolean(paymentWindow.current));

    try {
      // The server calculates the price from the catalog and creates the order.
      const result = await paymentCtx.execute({
        customer: { name: form.name.trim(), phone: form.phone.replace(/\s/g, ""), address: [addressParts.street.trim(), addressParts.ward, addressParts.province].join(", ") },
        braceletConfig: { wristCircumference, slots },
      });
      if (result.success && result.payUrl) {
        if (result.orderId) setOrderId(result.orderId);
        if (typeof result.expiresAt === "number") {
          setExpiresAt(result.expiresAt);
          setRemainingSeconds(Math.max(0, Math.ceil((result.expiresAt - Date.now()) / 1000)));
        }
        setPayUrl(result.payUrl);
        if (paymentWindow.current) paymentWindow.current.location.href = result.payUrl;
        if (typeof result.amount === "number") setServerAmount(result.amount);
      } else {
        paymentWindow.current?.close();
        paymentWindow.current = null;
        setSubmitError(result.message ?? "Lỗi thanh toán, vui lòng thử lại.");
      }
    } catch {
      paymentWindow.current?.close();
      paymentWindow.current = null;
      setSubmitError("Không thể kết nối cổng thanh toán. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  // ── Pay URL screen ───────────────────────────────────────────────────────────
  if (payUrl) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-light to-cream flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-pink-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="font-display text-2xl font-bold text-pink-text mb-2">
            Đơn hàng đã tạo!
          </h2>
          <p className="text-pink-text/60 text-sm mb-3">Giữ trang cửa hàng mở. Khi hủy hoặc hết giờ, link PayOS sẽ bị đóng</p>
          <p role="timer" className="mb-4 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">Mã PayOS còn hiệu lực: {String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:{String(remainingSeconds % 60).padStart(2, "0")}</p>
          {paymentOpened ? <p className="text-pink-text/60 text-sm mb-6">PayOS đã mở trong tab mới.</p> : <a
            href={payUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="
              inline-flex items-center gap-2 w-full justify-center
              py-4 rounded-2xl bg-[#AE2070] text-white font-bold text-sm
              hover:bg-[#8B1A5A] transition-colors shadow-lg
            "
          >
            <span className="text-xl">💜</span>
            Thanh toán PayOS — {formatPrice(serverAmount ?? total)}
          </a>}
          {submitError && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{submitError}</p>}
          <button type="button" onClick={() => void cancelCurrentOrder(false)} disabled={canceling} className="mt-3 w-full rounded-xl border border-pink-mid/40 px-4 py-3 text-sm font-semibold text-pink-deep disabled:opacity-50">{canceling ? "Đang hủy và quay lại…" : "Hủy thanh toán và quay lại trang đặt hàng"}</button>
          <Link href="/" className="block mt-4 text-xs text-pink-deep hover:underline">
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  // ── Checkout form ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-light via-cream to-white">
      {/* Nav */}
      <nav className="px-6 py-4 flex items-center gap-4 bg-white/60 backdrop-blur-sm border-b border-pink-mid/20">
        <Link href="/customizer" className="text-pink-deep text-sm hover:underline">
          ← Quay lại thiết kế
        </Link>
        <span className="font-display font-bold text-pink-text">Đặt hàng</span>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-10 grid lg:grid-cols-2 gap-8">
        {/* Order Summary */}
        <div className="flex flex-col gap-4">
          <h2 className="font-display text-xl font-bold text-pink-text">Đơn hàng của bạn</h2>

          <div className="bg-white/70 rounded-2xl border border-pink-mid/20 p-4">
            <div className="flex justify-between text-xs text-pink-text/60 mb-3">
              <span>Chu vi cổ tay</span>
              <span className="font-medium text-pink-text">{wristCircumference}mm</span>
            </div>
            <div className="flex justify-between text-xs text-pink-text/60 mb-4">
              <span>Số hạt</span>
              <span className="font-medium text-pink-text">{filled}/{slots.length}</span>
            </div>

            {/* Bead list */}
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
              {filledSlots.map((slot) => {
                const bead = beadCatalog.find((item) => item.id === slot.beadTypeId);
                if (!bead) return null;
                return (
                  <div key={slot.index} className="flex items-center gap-2.5">
                    <div
                      className="w-5 h-5 rounded-full shrink-0 ring-1 ring-white shadow-sm"
                      style={{ backgroundColor: bead.color }}
                    />
                    <span className="text-xs text-pink-text flex-1">{bead.name}</span>
                    <span className="text-xs font-medium text-pink-deep">{formatPrice(bead.price)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Total */}
          <div className="bg-pink-deep rounded-2xl p-4 flex justify-between items-center">
            <span className="text-white/80 text-sm">Tổng cộng</span>
            <span className="text-white font-bold text-lg">{formatPrice(total)}</span>
          </div>

          <p className="text-xs text-pink-text/40 text-center">
            Draft được lưu trong trình duyệt
          </p>
        </div>

        {/* Form */}
        <div>
          <h2 className="font-display text-xl font-bold text-pink-text mb-4">Thông tin giao hàng</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-pink-text mb-1.5">
                Họ và tên *
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Nguyễn Văn A"
                className={`
                  w-full px-4 py-3 rounded-xl bg-white/80 border text-sm text-pink-text
                  outline-none focus:ring-2 focus:ring-pink-mid transition-all
                  ${errors.name ? "border-red-300 focus:ring-red-200" : "border-pink-mid/40 focus:border-pink-mid"}
                `}
              />
              {errors.name && (
                <p className="text-red-400 text-xs mt-1">{errors.name}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-medium text-pink-text mb-1.5">
                Số điện thoại *
              </label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="0901234567"
                type="tel"
                className={`
                  w-full px-4 py-3 rounded-xl bg-white/80 border text-sm text-pink-text
                  outline-none focus:ring-2 focus:ring-pink-mid transition-all
                  ${errors.phone ? "border-red-300 focus:ring-red-200" : "border-pink-mid/40 focus:border-pink-mid"}
                `}
              />
              {errors.phone && (
                <p className="text-red-400 text-xs mt-1">{errors.phone}</p>
              )}
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-medium text-pink-text mb-1.5">
                Địa chỉ giao hàng *
              </label>
              <AddressFields
                idPrefix="checkout-address"
                streetName="addressStreet"
                provinceName="addressProvince"
                wardName="addressWard"
                inputClass={`w-full px-4 py-3 rounded-xl bg-white/80 border text-sm text-pink-text outline-none focus:ring-2 focus:ring-pink-mid transition-all ${errors.address ? "border-red-300 focus:ring-red-200" : "border-pink-mid/40 focus:border-pink-mid"}`}
                labelClass="block text-xs font-medium text-pink-text mb-1.5"
                onValueChange={(parts) => {
                  setAddressParts(parts);
                  if (errors.address) setErrors((current) => ({ ...current, address: undefined }));
                }}
              />
              {errors.address && (
                <p className="text-red-400 text-xs mt-1">{errors.address}</p>
              )}
            </div>

            {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-500 text-xs">
                {submitError}
                <Link href="/customizer" className="mt-2 block font-semibold text-pink-deep underline">
                  Quay lại chỉnh sửa thiết kế
                </Link>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || filled === 0}
              className="
                w-full py-4 rounded-2xl font-bold text-sm
                bg-[#AE2070] text-white
                hover:bg-[#8B1A5A] shadow-lg
                transition-all hover:-translate-y-0.5
                disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0
                flex items-center justify-center gap-2
              "
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  Thanh toán qua PayOS — {formatPrice(total)}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
