"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BeadMaterial } from "@/types";
import dynamic from "next/dynamic";
import type { ModelEditorHandle } from "@/components/admin/products/BeadModelEditor";
import type { BeadModel } from "@/lib/bead-model";
import BeadSwatch from "@/components/ui/BeadSwatch";

const BeadModelEditor = dynamic(() => import("@/components/admin/products/BeadModelEditor"), { ssr: false });

type Bead = {
  model?: BeadModel;
  thumbnail?: string;
  id: string; name: string; description: string; price: number; costPrice: number | null; stock: number; status: "active" | "inactive" | "draft";
  material: BeadMaterial; color: string; emissive: string; metalness: number; roughness: number; diameter: number;
};
type FormValues = Omit<Bead, "id" | "status" | "price" | "stock"> & { price: string; stock: string };
const blank: FormValues = { name: "", description: "", price: "15000", costPrice: null, stock: "0", material: "crystal", color: "#F4A7B9", emissive: "", metalness: 0.1, roughness: 0.3, diameter: 8, thumbnail: "" };
const currency = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
const materialLabels: Record<BeadMaterial, string> = { glass: "Thủy tinh", crystal: "Pha lê", wood: "Gỗ", stone: "Đá", pearl: "Ngọc trai" };
const slugify = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export default function BeadTypesPage() {
  const modelEditor = useRef<ModelEditorHandle | null>(null);
  const savedDraftSku = useRef<string | null>(null);
  const submitLock = useRef(false);
  const [formKey, setFormKey] = useState(0);
  const [beads, setBeads] = useState<Bead[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modelBusy, setModelBusy] = useState(false);
  const [editing, setEditing] = useState<Bead | null>(null);
  const [values, setValues] = useState<FormValues>(blank);
  const [thumbnailChanged, setThumbnailChanged] = useState(false);
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

  const startCreate = () => { savedDraftSku.current = null; setFormKey(k => k + 1); setError(""); setEditing(null); setValues(blank); setThumbnailChanged(false); setShowForm(true); setMessage(""); };
  const startEdit = (bead: Bead) => {
    savedDraftSku.current = null; setFormKey(k => k + 1); setError("");
    setEditing(bead);
    setValues({ name: bead.name, description: bead.description, price: String(bead.price), costPrice: bead.costPrice, stock: String(bead.stock), material: bead.material, color: bead.color, emissive: bead.emissive, metalness: bead.metalness, roughness: bead.roughness, diameter: bead.diameter, thumbnail: bead.thumbnail ?? "" });
    setThumbnailChanged(false);
    setShowForm(true); setMessage("");
  };

  const closeForm = () => { if (saving || modelBusy) return; setShowForm(false); if (savedDraftSku.current) void load(); };

  async function selectThumbnail(file?: File) {
    if (!file) return;
    try {
      if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 8 * 1024 * 1024) throw new Error("Chọn ảnh PNG, JPEG hoặc WebP dưới 8 MB.");
      const bitmap = await createImageBitmap(file);
      try {
        const canvas = document.createElement("canvas"); canvas.width = canvas.height = 256;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Không đọc được ảnh.");
        context.fillStyle = "#ffffff"; context.fillRect(0, 0, 256, 256);
        const scale = 256 / Math.max(bitmap.width, bitmap.height);
        context.drawImage(bitmap, (256 - bitmap.width * scale) / 2, (256 - bitmap.height * scale) / 2, bitmap.width * scale, bitmap.height * scale);
        const thumbnail = canvas.toDataURL("image/webp", 0.78);
        if (thumbnail.length > 200000) throw new Error("Ảnh sau khi xử lý vẫn quá lớn. Hãy chọn ảnh đơn giản hơn.");
        setValues((current) => ({ ...current, thumbnail }));
        setThumbnailChanged(true);
      } finally { bitmap.close(); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không đọc được ảnh."); }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLock.current || modelBusy) return;
    submitLock.current = true; setSaving(true); setMessage(""); setError("");
    const id = editing?.id ?? savedDraftSku.current ?? slugify(values.name);
    try {
      const editor = modelEditor.current;
      if (!editor) throw new Error("Đang mở trình chỉnh 3D, vui lòng thử lại sau.");
      editor.validate();
      const hasModel = editor.hasModel();
      if ((editing?.status === "draft" || savedDraftSku.current) && !hasModel) throw new Error("Bản nháp này cần model hợp lệ trước khi hoàn tất.");
      const existing = Boolean(editing || savedDraftSku.current);
      const response = await fetch(existing ? "/api/admin/bead-types/" + encodeURIComponent(id) : "/api/admin/bead-types", {
        method: existing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, thumbnail: thumbnailChanged ? values.thumbnail : undefined, price: Number(values.price || "0"), stock: Number(values.stock || "0"), id, draft: hasModel }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không lưu được thông tin hạt.");
      if (!existing && hasModel) savedDraftSku.current = id;
      await editor.save(id);
      if (savedDraftSku.current || editing?.status === "draft") {
        const activated = await fetch("/api/admin/bead-types/" + encodeURIComponent(id), { method: "PUT" });
        const result = await activated.json();
        if (!activated.ok) throw new Error(result.message || "Chưa hoàn tất lưu hạt. Hãy thử lại.");
      }
      setShowForm(false); savedDraftSku.current = null;
      setMessage("Đã lưu hạt, mô hình và ảnh đại diện."); await load();
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : "Không lưu được hạt.";
      setError(savedDraftSku.current ? detail + " Hạt đang là bản nháp, chưa hiển thị cho khách. Giữ form và bấm Lưu hạt để thử lại." : detail);
    } finally { submitLock.current = false; setSaving(false); }
  }

  async function setActive(bead: Bead, active: boolean) {
    setMessage("");
    if (!active && !window.confirm(`Xóa vĩnh viễn "${bead.name}" khỏi danh mục? Thao tác này không thể hoàn tác.`)) return;
    try {
      const response = await fetch(`/api/admin/bead-types/${encodeURIComponent(bead.id)}`, { method: active ? "PUT" : "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Không thể cập nhật loại hạt.");
      setMessage(active ? "Đã bật lại loại hạt." : "Đã xóa vĩnh viễn loại hạt.");
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
            <td className="p-4"><div className="flex items-center gap-3"><BeadSwatch beadId={bead.id} model={bead.model} thumbnail={bead.thumbnail} color={bead.color} showModelFallback className="h-9 w-9 shrink-0 rounded-full border border-gray-200 shadow-inner" style={{ boxShadow: bead.emissive ? `0 0 12px ${bead.emissive}80` : undefined }} /><div><p className="font-semibold text-gray-900">{bead.name}</p><p className="text-xs text-gray-400">{bead.id}</p></div></div></td>
            <td className="p-4 text-gray-600">{materialLabels[bead.material]}</td>
            <td className="p-4 text-right font-semibold text-gray-900">{currency.format(bead.price)}</td>
            <td className="p-4 text-right text-gray-600">{bead.costPrice === null ? <span className="text-amber-700">Chưa nhập</span> : currency.format(bead.costPrice)}</td>
            <td className="p-4 text-right text-gray-600">{bead.stock}</td>
            <td className="p-4 text-gray-600">{bead.diameter} mm</td>
            <td className="p-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${bead.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{bead.status === "active" ? "Đang dùng" : bead.status === "draft" ? "Bản nháp" : "Đã ẩn"}</span></td>
            <td className="p-4 text-right"><div className="inline-flex gap-3"><button onClick={() => startEdit(bead)} className="font-semibold text-rose-600 hover:underline">{bead.status === "draft" ? "Tiếp tục" : "Sửa"}</button>{bead.status === "inactive" && <button onClick={() => void setActive(bead, true)} className="font-semibold text-emerald-700 hover:underline">Bật lại</button>}<button onClick={() => void setActive(bead, false)} className="font-semibold text-red-600 hover:underline">Xóa vĩnh viễn</button></div></td>
          </tr>)}
        </tbody>
      </table>
    </div>

    {showForm && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onMouseDown={(event) => { if (!saving && !modelBusy && event.target === event.currentTarget) closeForm(); }}>
      <form onSubmit={submit} className="max-h-[90vh] w-full max-w-5xl space-y-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div><h2 className="text-lg font-bold text-gray-900">{editing ? "Chỉnh sửa loại hạt" : "Thêm loại hạt"}</h2><p className="mt-1 text-sm text-gray-500">Giá và thuộc tính 3D này sẽ được customer sử dụng khi thiết kế.</p></div>
        <fieldset disabled={saving || modelBusy} className="grid gap-4 sm:grid-cols-2 disabled:opacity-60">
          <label className="text-sm font-medium text-gray-700">Tên hạt<input required minLength={2} maxLength={100} value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
          <label className="text-sm font-medium text-gray-700">Mã hạt<input readOnly value={editing?.id ?? savedDraftSku.current ?? (slugify(values.name) || "tu-dong-tao-tu-ten")} className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-500" /></label>
          <label className="text-sm font-medium text-gray-700">Chất liệu<select value={values.material} onChange={(e) => setValues({ ...values, material: e.target.value as BeadMaterial })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2">{Object.entries(materialLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label className="text-sm font-medium text-gray-700">Giá bán mỗi hạt (VND)<input required type="text" inputMode="numeric" pattern="[0-9]*" value={values.price} onChange={(e) => setValues({ ...values, price: e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "") })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
          <label className="text-sm font-medium text-gray-700">Giá vốn mỗi hạt (VND)<input required type="number" min={0} step={1} value={values.costPrice ?? ""} onChange={(e) => setValues({ ...values, costPrice: e.target.value === "" ? null : Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
          <label className="text-sm font-medium text-gray-700">Tồn kho<input required type="text" inputMode="numeric" pattern="[0-9]*" value={values.stock} onChange={(e) => setValues({ ...values, stock: e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "") })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
        </fieldset>
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 p-3">
          {values.thumbnail ? <>
            {/* eslint-disable-next-line @next/next/no-img-element -- local, resized data URL preview */}
            <img src={values.thumbnail} alt="Ảnh xem trước hạt hoặc charm" className="h-16 w-16 rounded-full border border-gray-200 bg-white object-contain" />
          </> : <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-gray-300 text-center text-[10px] text-gray-400">Chưa có ảnh</div>}
          <label className="text-sm font-medium text-gray-700">Ảnh hạt / charm<input type="file" accept="image/png,image/jpeg,image/webp" disabled={saving || modelBusy} onChange={(e) => { void selectThumbnail(e.target.files?.[0]); e.target.value = ""; }} className="mt-1 block max-w-full text-xs" /></label>
          {values.thumbnail && <button type="button" disabled={saving || modelBusy} onClick={() => { setValues({ ...values, thumbnail: "" }); setThumbnailChanged(true); }} className="text-xs text-rose-700 underline">Xóa ảnh</button>}
        </div>
        <BeadModelEditor key={formKey} sku={editing?.id} controllerRef={modelEditor} disabled={saving} onBusyChange={setModelBusy} />
        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4"><button type="button" disabled={saving || modelBusy} onClick={closeForm} className="rounded-lg border border-gray-300 px-4 py-2 text-sm disabled:opacity-40">Đóng</button><button disabled={saving || modelBusy} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Đang lưu..." : editing ? "Lưu hạt" : "Lưu hạt"}</button></div>
      </form>
    </div>}
  </div>;
}
