"use client";

import { useCallback, useEffect, useState } from "react";
import { BeadMaterial } from "@/types";

type Bead = {
  id: string; name: string; description: string; price: number; costPrice: number | null; stock: number; status: "active" | "inactive" | "draft";
  material: BeadMaterial; color: string; emissive: string; metalness: number; roughness: number; diameter: number;
};
type FormValues = Omit<Bead, "id" | "status" | "price" | "stock"> & { price: string; stock: string };
const blank: FormValues = { name: "", description: "", price: "15000", costPrice: null, stock: "0", material: "crystal", color: "#F4A7B9", emissive: "", metalness: 0.1, roughness: 0.3, diameter: 8 };
const currency = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
const materialLabels: Record<BeadMaterial, string> = { glass: "Thủy tinh", crystal: "Pha lê", wood: "Gỗ", stone: "Đá", pearl: "Ngọc trai" };
const slugify = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export default function BeadTypesPage() {
  const [beads, setBeads] = useState<Bead[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Bead | null>(null);
  const [values, setValues] = useState<FormValues>(blank);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [attentionOnly, setAttentionOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const attention = new URLSearchParams(window.location.search).get("stockStatus") === "attention";
      setAttentionOnly(attention);
      const response = await fetch(`/api/admin/bead-types${attention ? "?stockStatus=attention" : ""}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể tải danh sách hạt.");
      setBeads(data.beads);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tải danh sách hạt.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const startCreate = () => { setEditing(null); setValues(blank); setShowForm(true); setMessage(""); };
  const startEdit = (bead: Bead) => {
    setEditing(bead);
    setValues({ name: bead.name, description: bead.description, price: String(bead.price), costPrice: bead.costPrice, stock: String(bead.stock), material: bead.material, color: bead.color, emissive: bead.emissive, metalness: bead.metalness, roughness: bead.roughness, diameter: bead.diameter });
    setShowForm(true); setMessage("");
  };

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage("");
    const id = editing?.id ?? slugify(values.name);
    try {
      const response = await fetch(editing ? `/api/admin/bead-types/${encodeURIComponent(id)}` : "/api/admin/bead-types", {
        method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, price: Number(values.price || "0"), stock: Number(values.stock || "0"), id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể lưu loại hạt.");
      setShowForm(false); setMessage(editing ? "Đã cập nhật loại hạt." : "Đã thêm loại hạt vào thiết kế 3D.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể lưu loại hạt."); }
    finally { setSaving(false); }
  }

  async function setActive(bead: Bead, active: boolean) {
    setMessage("");
    if (!active && !window.confirm(`Xóa “${bead.name}” khỏi danh sách hạt customer có thể chọn? Hạt sẽ được lưu lại cho các đơn cũ.`)) return;
    try {
      const response = await fetch(`/api/admin/bead-types/${encodeURIComponent(bead.id)}`, { method: active ? "PUT" : "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể cập nhật loại hạt.");
      setMessage(active ? "Đã bật lại loại hạt." : "Đã xóa hạt khỏi danh sách customer.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể cập nhật loại hạt."); }
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-gray-900">Các loại hạt</h1><p className="mt-1 text-sm text-gray-500">{attentionOnly ? "Danh sách hạt đang hết hoặc sắp hết hàng." : "Quản lý hạt dùng trong thiết kế vòng tay 3D của customer."}</p></div>
      <button onClick={startCreate} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700">+ Thêm hạt</button>
    </div>

    {message && <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}
    {error && <div role="alert" className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"><span>{error}</span><button onClick={() => { setError(""); void load(); }} className="font-semibold underline">Thử lại</button></div>}

    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
      <table className="w-full min-w-[850px] text-left text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="p-4">Hạt</th><th className="p-4">Chất liệu</th><th className="p-4 text-right">Giá bán / hạt</th><th className="p-4 text-right">Giá vốn / hạt</th><th className="p-4 text-right">Tồn kho</th><th className="p-4">Kích thước</th><th className="p-4">Trạng thái</th><th className="p-4 text-right">Thao tác</th></tr></thead>
        <tbody>
          {loading && <tr><td colSpan={8} className="p-10 text-center text-gray-500">Đang tải danh sách hạt...</td></tr>}
          {!loading && beads.length === 0 && <tr><td colSpan={8} className="p-10 text-center text-gray-500">Chưa có loại hạt nào.</td></tr>}
          {!loading && beads.map((bead) => <tr key={bead.id} className="border-t border-gray-100">
            <td className="p-4"><div className="flex items-center gap-3"><span className="h-9 w-9 rounded-full border border-gray-200 shadow-inner" style={{ backgroundColor: bead.color, boxShadow: bead.emissive ? `0 0 12px ${bead.emissive}80` : undefined }} /><div><p className="font-semibold text-gray-900">{bead.name}</p><p className="text-xs text-gray-400">{bead.id}</p></div></div></td>
            <td className="p-4 text-gray-600">{materialLabels[bead.material]}</td>
            <td className="p-4 text-right font-semibold text-gray-900">{currency.format(bead.price)}</td>
            <td className="p-4 text-right text-gray-600">{bead.costPrice === null ? <span className="text-amber-700">Chưa nhập</span> : currency.format(bead.costPrice)}</td>
            <td className="p-4 text-right text-gray-600">{bead.stock}</td>
            <td className="p-4 text-gray-600">{bead.diameter} mm</td>
            <td className="p-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${bead.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{bead.status === "active" ? "Đang dùng" : "Đã ẩn"}</span></td>
            <td className="p-4 text-right"><div className="inline-flex gap-3"><button onClick={() => startEdit(bead)} className="font-semibold text-rose-600 hover:underline">Sửa</button>{bead.status === "active" ? <button onClick={() => void setActive(bead, false)} className="font-semibold text-red-600 hover:underline">Xóa</button> : <button onClick={() => void setActive(bead, true)} className="font-semibold text-emerald-700 hover:underline">Bật lại</button>}</div></td>
          </tr>)}
        </tbody>
      </table>
    </div>

    {showForm && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false); }}>
      <form onSubmit={submit} className="max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div><h2 className="text-lg font-bold text-gray-900">{editing ? "Chỉnh sửa loại hạt" : "Thêm loại hạt"}</h2><p className="mt-1 text-sm text-gray-500">Giá và thuộc tính 3D này sẽ được customer sử dụng khi thiết kế.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-gray-700">Tên hạt<input required minLength={2} maxLength={100} value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
          <label className="text-sm font-medium text-gray-700">Mã hạt<input readOnly value={editing?.id ?? (slugify(values.name) || "tu-dong-tao-tu-ten")} className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-500" /></label>
          <label className="text-sm font-medium text-gray-700">Chất liệu<select value={values.material} onChange={(e) => setValues({ ...values, material: e.target.value as BeadMaterial })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">{Object.entries(materialLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label className="text-sm font-medium text-gray-700">Giá bán mỗi hạt (VND)<input required type="text" inputMode="numeric" pattern="[0-9]*" value={values.price} onChange={(e) => setValues({ ...values, price: e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "") })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
          <label className="text-sm font-medium text-gray-700">Giá vốn mỗi hạt (VND)<input required type="number" min={0} step={1} value={values.costPrice ?? ""} onChange={(e) => setValues({ ...values, costPrice: e.target.value === "" ? null : Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
          <label className="text-sm font-medium text-gray-700">Tồn kho<input required type="text" inputMode="numeric" pattern="[0-9]*" value={values.stock} onChange={(e) => setValues({ ...values, stock: e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "") })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
          <label className="text-sm font-medium text-gray-700">Màu hạt<input required type="color" value={values.color} onChange={(e) => setValues({ ...values, color: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-gray-300 p-1" /></label>
          <div className="text-sm font-medium text-gray-700"><span>Màu phát sáng (tùy chọn)</span><label className="mt-2 flex items-center gap-2 text-xs font-normal"><input type="checkbox" checked={Boolean(values.emissive)} onChange={(e) => setValues({ ...values, emissive: e.target.checked ? "#ffffff" : "" })} /> Bật hiệu ứng phát sáng</label>{values.emissive && <input aria-label="Màu phát sáng" type="color" value={values.emissive} onChange={(e) => setValues({ ...values, emissive: e.target.value })} className="mt-2 h-10 w-full rounded-lg border border-gray-300 p-1" />}</div>
          <label className="text-sm font-medium text-gray-700">Đường kính (mm)<input required type="number" min={2} max={30} value={values.diameter} onChange={(e) => setValues({ ...values, diameter: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
          <label className="text-sm font-medium text-gray-700">Độ kim loại ({values.metalness.toFixed(2)})<input type="range" min={0} max={1} step={0.05} value={values.metalness} onChange={(e) => setValues({ ...values, metalness: Number(e.target.value) })} className="mt-3 block w-full" /></label>
          <label className="text-sm font-medium text-gray-700">Độ nhám ({values.roughness.toFixed(2)})<input type="range" min={0} max={1} step={0.05} value={values.roughness} onChange={(e) => setValues({ ...values, roughness: Number(e.target.value) })} className="mt-3 block w-full" /></label>
          <label className="text-sm font-medium text-gray-700 sm:col-span-2">Mô tả<input maxLength={500} value={values.description} onChange={(e) => setValues({ ...values, description: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4"><button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm">Hủy</button><button disabled={saving} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Thêm hạt"}</button></div>
      </form>
    </div>}
  </div>;
}
