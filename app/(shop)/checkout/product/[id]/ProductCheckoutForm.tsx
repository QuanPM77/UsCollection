"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLoginPrompt } from "@/components/LoginPromptProvider";
import AddressFields, { type AddressParts } from "@/components/AddressFields";
import { isValidVietnamWard } from "@/lib/vietnam-addresses";

type FormData = { name: string; phone: string; addressLine: string; province: string };
const currency = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
const inputClass = "w-full rounded-xl border border-pink-mid/40 bg-white/80 px-4 py-3 text-sm outline-none focus:border-pink-mid focus:ring-2 focus:ring-pink-mid/30";

export default function ProductCheckoutForm({
  productId,
  productName,
  sku,
  unitPrice,
  stock,
  image,
  initialValues,
}: {
  productId: string;
  productName: string;
  sku: string;
  unitPrice: number;
  stock: number;
  image: string | null;
  initialValues: FormData;
}) {
  const { isAuthenticated, requestLogin } = useLoginPrompt();
  const [form, setForm] = useState<FormData>(initialValues);
  const [addressParts, setAddressParts] = useState<AddressParts>({ street: "", province: "", ward: "" });
  const [quantityInput, setQuantityInput] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [payUrl, setPayUrl] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [paymentOpened, setPaymentOpened] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [serverTotal, setServerTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const paymentWindow = useRef<Window | null>(null);
  const cancelInProgress = useRef(false);
  const quantity = quantityInput === "" ? 0 : Number(quantityInput);
  const total = unitPrice * quantity;

  const finishCancellation = useCallback((message: string) => {
    paymentWindow.current?.close();
    paymentWindow.current = null;
    setPayUrl(null);
    setOrderId(null);
    setExpiresAt(null);
    setRemainingSeconds(0);
    setPaymentOpened(false);
    setServerTotal(null);
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
      setError(null);
      finishCancellation(expired ? "Mã thanh toán đã hết hạn. Đơn đã hủy" : "Đơn đã hủy");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Chưa thể hủy thanh toán.");
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
        // Keep the countdown running; the payment link still expires on the server.
      } finally {
        checkingStatus = false;
      }
    }, 2500);
    return () => {
      window.clearInterval(countdownTimer);
      window.clearInterval(statusTimer);
    };
  }, [cancelCurrentOrder, expiresAt, finishCancellation, orderId, payUrl]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAuthenticated) {
      requestLogin();
      return;
    }
    setError(null);
    const phone = form.phone.replace(/\s/g, "");
    if (form.name.trim().length < 2) return setError("Vui lòng nhập họ tên.");
    if (!/^(0|\+84)[0-9]{8,10}$/.test(phone)) return setError("Số điện thoại không hợp lệ.");
    if (addressParts.street.trim().length < 3 || !isValidVietnamWard(addressParts.province, addressParts.ward)) return setError("Vui lòng nhập địa chỉ và chọn phường/xã hợp lệ.");
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > stock) return setError("Số lượng vượt quá tồn kho hiện tại.");

    paymentWindow.current = window.open("about:blank", "_blank");
    setPaymentOpened(Boolean(paymentWindow.current));
    setLoading(true);
    try {
      const response = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity, customer: { name: form.name.trim(), phone, address: [addressParts.street.trim(), addressParts.ward, addressParts.province].join(", ") } }),
      });
      const result = await response.json();
      if (!response.ok || !result.success || !result.payUrl) throw new Error(result.message ?? "Không thể tạo đơn hàng.");
      if (typeof result.orderId === "string") setOrderId(result.orderId);
      if (typeof result.expiresAt === "number") {
        setExpiresAt(result.expiresAt);
        setRemainingSeconds(Math.max(0, Math.ceil((result.expiresAt - Date.now()) / 1000)));
      }
      setPayUrl(result.payUrl);
      if (paymentWindow.current) paymentWindow.current.location.href = result.payUrl;
      if (typeof result.amount === "number") setServerTotal(result.amount);
    } catch (cause) {
      paymentWindow.current?.close();
      paymentWindow.current = null;
      setPaymentOpened(false);
      setError(cause instanceof Error ? cause.message : "Lỗi thanh toán, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  if (payUrl) return <div className="mx-auto grid w-full max-w-5xl gap-8 px-5 py-10 lg:grid-cols-2 sm:px-8">
    <section>
      <h1 className="font-display text-2xl font-bold">Đơn hàng của bạn</h1>
      <ProductSummary image={image} name={productName} sku={sku} unitPrice={serverTotal === null ? unitPrice : serverTotal / quantity} quantity={quantity} total={serverTotal ?? total} />
    </section>
    <section className="self-start rounded-3xl bg-white p-7 text-center shadow-sm">
      <div className="text-5xl">🎉</div>
      <h2 className="mt-3 font-display text-2xl font-bold">Đơn hàng đã tạo!</h2>
      <p className="mt-2 text-sm text-pink-text/65">Giữ trang cửa hàng mở. Khi hủy hoặc hết giờ, link PayOS sẽ bị đóng.</p>
      <p role="timer" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">Mã PayOS còn hiệu lực: {String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:{String(remainingSeconds % 60).padStart(2, "0")}</p>
      {paymentOpened ? <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">PayOS đã mở trong tab mới.</p> : <a href={payUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex w-full justify-center rounded-2xl bg-pink-deep px-4 py-4 font-bold text-white hover:opacity-90">Thanh toán qua PayOS — {currency.format(serverTotal ?? total)}</a>}
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button type="button" onClick={() => void cancelCurrentOrder(false)} disabled={canceling} className="mt-3 w-full rounded-xl border border-pink-mid/40 px-4 py-3 text-sm font-semibold text-pink-deep disabled:opacity-50">{canceling ? "Đang hủy và quay lại…" : "Hủy thanh toán và quay lại trang đặt hàng"}</button>
    </section>
  </div>;

  return <div className="mx-auto grid w-full max-w-5xl gap-8 px-5 py-10 lg:grid-cols-2 sm:px-8">
    <section>
      <h1 className="font-display text-2xl font-bold">Đơn hàng của bạn</h1>
      <ProductSummary image={image} name={productName} sku={sku} unitPrice={unitPrice} quantity={quantity} total={total} />
      <label className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-pink-mid/25 bg-white/80 p-4 text-sm">
        <span className="font-medium">Số lượng</span>
        <input type="number" min={1} max={stock} step={1} value={quantityInput} onChange={(event) => {
          const value = event.target.value;
          if (value === "") {
            setQuantityInput("");
            return;
          }
          const parsed = Number(value);
          const bounded = Number.isFinite(parsed) ? Math.min(stock, Math.max(1, Math.floor(parsed))) : 1;
          setQuantityInput(String(bounded));
        }} disabled={stock < 1} className="w-24 rounded-lg border border-pink-mid/40 px-3 py-2 text-center outline-none focus:border-pink-deep disabled:bg-gray-100" />
      </label>
      <p className="mt-2 text-right text-xs text-pink-text/55">Tồn kho hiện tại: {stock}</p>
    </section>

    <section>
      <h2 className="font-display text-xl font-bold">Thông tin giao hàng</h2>
      {(initialValues.name || initialValues.phone || initialValues.addressLine) && <p className="mt-2 text-xs text-pink-text/60">Thông tin được điền từ hồ sơ và địa chỉ mặc định của bạn. Bạn có thể chỉnh sửa trước khi đặt hàng.</p>}
      <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
        <label className="text-xs font-medium">Họ và tên *<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nguyễn Văn A" className={`${inputClass} mt-1.5`} /></label>
        <label className="text-xs font-medium">Số điện thoại *<input required type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="0901234567" className={`${inputClass} mt-1.5`} /></label>
        <AddressFields idPrefix="product-checkout-address" streetName="addressStreet" provinceName="addressProvince" wardName="addressWard" initialAddressLine={initialValues.addressLine} initialProvince={initialValues.province} inputClass={inputClass} labelClass="text-xs font-medium" onValueChange={setAddressParts} />
        {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={loading || stock < 1} className="rounded-2xl bg-pink-deep px-4 py-4 text-sm font-bold text-white shadow-lg transition hover:bg-pink-text disabled:cursor-not-allowed disabled:opacity-50">
          {loading ? "Đang kiểm tra tồn kho..." : stock > 0 ? `Đặt hàng và thanh toán — ${currency.format(total)}` : "Sản phẩm đã hết hàng"}
        </button>
      </form>
    </section>
  </div>;
}

function ProductSummary({ image, name, sku, unitPrice, quantity, total }: { image: string | null; name: string; sku: string; unitPrice: number; quantity: number; total: number }) {
  return <>
    <div className="mt-4 flex gap-4 rounded-2xl border border-pink-mid/25 bg-white/80 p-4">
      {image ? <img src={image} alt={name} className="h-24 w-24 rounded-xl object-contain" /> : <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-pink-light text-4xl">💎</div>}
      <div className="min-w-0 flex-1">
        <h2 className="font-semibold">{name}</h2>
        <p className="mt-1 text-xs text-pink-text/55">Mã sản phẩm: {sku}</p>
        <p className="mt-2 text-sm text-pink-text/70">{currency.format(unitPrice)} × {quantity}</p>
      </div>
    </div>
    <div className="mt-4 flex justify-between rounded-2xl bg-pink-deep p-4 text-white">
      <span>Tổng cộng</span><strong>{currency.format(total)}</strong>
    </div>
  </>;
}
