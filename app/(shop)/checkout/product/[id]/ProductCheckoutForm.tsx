"use client";

import { useState } from "react";
import { useLoginPrompt } from "@/components/LoginPromptProvider";

type FormData = { name: string; phone: string; address: string };
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
  const [quantityInput, setQuantityInput] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [payUrl, setPayUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const quantity = quantityInput === "" ? 0 : Number(quantityInput);
  const total = unitPrice * quantity;

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
    if (form.address.trim().length < 10) return setError("Vui lòng nhập địa chỉ giao hàng đầy đủ.");
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > stock) return setError("Số lượng vượt quá tồn kho hiện tại.");

    setLoading(true);
    try {
      const response = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity, customer: { name: form.name.trim(), phone, address: form.address.trim() } }),
      });
      const result = await response.json();
      if (!response.ok || !result.success || !result.payUrl) throw new Error(result.message ?? "Không thể tạo đơn hàng.");
      setPayUrl(result.payUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Lỗi thanh toán, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  if (payUrl) return <div className="mx-auto grid w-full max-w-5xl gap-8 px-5 py-10 lg:grid-cols-2 sm:px-8">
    <section>
      <h1 className="font-display text-2xl font-bold">Đơn hàng của bạn</h1>
      <ProductSummary image={image} name={productName} sku={sku} unitPrice={unitPrice} quantity={quantity} total={total} />
    </section>
    <section className="self-start rounded-3xl bg-white p-7 text-center shadow-sm">
      <div className="text-5xl">🎉</div>
      <h2 className="mt-3 font-display text-2xl font-bold">Đơn hàng đã tạo!</h2>
      <p className="mt-2 text-sm text-pink-text/65">Link thanh toán giữ số lượng này trong 15 phút. Tiếp tục đến PayOS để hoàn tất.</p>
      <a href={payUrl} className="mt-5 inline-flex w-full justify-center rounded-2xl bg-pink-deep px-4 py-4 font-bold text-white hover:opacity-90">Thanh toán qua PayOS — {currency.format(total)}</a>
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
          setQuantityInput(value === "" ? "" : String(Number(value)));
        }} disabled={stock < 1} className="w-24 rounded-lg border border-pink-mid/40 px-3 py-2 text-center outline-none focus:border-pink-deep disabled:bg-gray-100" />
      </label>
      <p className="mt-2 text-right text-xs text-pink-text/55">Tồn kho hiện tại: {stock}</p>
    </section>

    <section>
      <h2 className="font-display text-xl font-bold">Thông tin giao hàng</h2>
      {(initialValues.name || initialValues.phone || initialValues.address) && <p className="mt-2 text-xs text-pink-text/60">Thông tin được điền từ hồ sơ và địa chỉ mặc định của bạn. Bạn có thể chỉnh sửa trước khi đặt hàng.</p>}
      <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
        <label className="text-xs font-medium">Họ và tên *<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nguyễn Văn A" className={`${inputClass} mt-1.5`} /></label>
        <label className="text-xs font-medium">Số điện thoại *<input required type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="0901234567" className={`${inputClass} mt-1.5`} /></label>
        <label className="text-xs font-medium">Địa chỉ giao hàng *<textarea required rows={3} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" className={`${inputClass} mt-1.5 resize-none`} /></label>
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
