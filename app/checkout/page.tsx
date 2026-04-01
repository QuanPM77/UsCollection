"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useBraceletStore } from "@/lib/store";
import { formatPrice, getBeadById } from "@/lib/beadData";
import { PaymentContext, MoMoMockStrategy } from "@/lib/payment";
import { GuestOrder } from "@/types";

type FormData = {
  name: string;
  phone: string;
  address: string;
};

type FormErrors = Partial<FormData>;

function validate(data: FormData): FormErrors {
  const errors: FormErrors = {};
  if (!data.name.trim()) errors.name = "Vui lòng nhập họ tên";
  if (!/^(0|\+84)[0-9]{8,10}$/.test(data.phone.replace(/\s/g, "")))
    errors.phone = "Số điện thoại không hợp lệ";
  if (data.address.trim().length < 10)
    errors.address = "Vui lòng nhập địa chỉ đầy đủ";
  return errors;
}

const paymentCtx = new PaymentContext(new MoMoMockStrategy());

export default function CheckoutPage() {
  const router = useRouter();
  const { slots, wristCircumference, totalPrice, filledCount } = useBraceletStore();

  const [form, setForm] = useState<FormData>({ name: "", phone: "", address: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [payUrl, setPayUrl] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const total = totalPrice();
  const filled = filledCount();

  const filledSlots = slots.filter((s) => s.beadTypeId !== null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    const orderId = `BS-${Date.now()}`;

    const order: GuestOrder = {
      id: orderId,
      name: form.name.trim(),
      phone: form.phone.replace(/\s/g, ""),
      address: form.address.trim(),
      braceletConfig: { wristCircumference, slots },
      totalPrice: total,
      paymentStatus: "pending",
      createdAt: new Date().toISOString(),
    };

    // Persist order to localStorage for reference
    localStorage.setItem(`order-${orderId}`, JSON.stringify(order));

    // Initiate MoMo payment
    const result = await paymentCtx.execute({
      orderId,
      amount: total,
      orderInfo: `Vòng tay BeadStudio — ${filledSlots.length} hạt`,
      returnUrl: `${window.location.origin}/checkout/result?orderId=${orderId}`,
      notifyUrl: `${window.location.origin}/api/payment/notify`,
    });

    setLoading(false);

    if (result.success && result.payUrl) {
      setPayUrl(result.payUrl);
    } else {
      setSubmitError(result.message ?? "Lỗi thanh toán, vui lòng thử lại.");
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
          <p className="text-pink-text/60 text-sm mb-6">
            Bấm nút bên dưới để thanh toán qua MoMo.
          </p>
          <a
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
            Thanh toán MoMo — {formatPrice(total)}
          </a>
          <p className="mt-4 text-xs text-pink-text/40">
            (Demo: URL mock, chưa kết nối MoMo thật)
          </p>
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
                const bead = getBeadById(slot.beadTypeId!);
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
              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="123 Đường ABC, Phường XYZ, Quận 1, TP.HCM"
                rows={3}
                className={`
                  w-full px-4 py-3 rounded-xl bg-white/80 border text-sm text-pink-text
                  outline-none focus:ring-2 focus:ring-pink-mid transition-all resize-none
                  ${errors.address ? "border-red-300 focus:ring-red-200" : "border-pink-mid/40 focus:border-pink-mid"}
                `}
              />
              {errors.address && (
                <p className="text-red-400 text-xs mt-1">{errors.address}</p>
              )}
            </div>

            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-500 text-xs">
                {submitError}
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
                  <span>💜</span>
                  Thanh toán qua MoMo — {formatPrice(total)}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
