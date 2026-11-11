"use client";
import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { DEFAULT_MODEL_SETTINGS, type BeadModel, type ModelSettings } from "@/lib/bead-model";
import { MAX_ORIGINAL_BYTES, MAX_WEB_BYTES, validateGlb } from "@/lib/glb-validation";
import { uploadModelFile } from "@/lib/upload-model";
const ModelPreview = dynamic(() => import("./ModelPreview"), { ssr: false, loading: () => <p>Đang mở khung xem trước…</p> });

type Version = { id: string; createdAt: string; model: BeadModel };
export default function BeadModelEditor({ sku, onBusyChange }: { sku: string; onBusyChange?: (busy: boolean) => void }) {
  const [model, setModel] = useState<BeadModel | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [settings, setSettings] = useState<ModelSettings>(DEFAULT_MODEL_SETTINGS);
  const [original, setOriginal] = useState<File | null>(null);
  const [web, setWeb] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [report, setReport] = useState<ReturnType<typeof validateGlb> | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const onPreviewReady = useCallback(() => setPreviewReady(true), []);
  const onPreviewError = useCallback(() => { setPreviewReady(false); setError("Không đọc được mô hình trong khung 3D. Hãy kiểm tra file trước khi áp dụng."); }, []);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { onBusyChange?.(busy); return () => onBusyChange?.(false); }, [busy, onBusyChange]);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/bead-models?sku=${encodeURIComponent(sku)}`).then(async r => {
      const data = await r.json(); if (!r.ok) throw new Error(data.message);
      if (!cancelled) { setModel(data.model); setVersions(data.versions); setSettings(data.model ?? DEFAULT_MODEL_SETTINGS); setReady(true); }
    }).catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [sku]);
  useEffect(() => {
    if (!web) { setPreviewUrl(""); return; }
    const url = URL.createObjectURL(web); setPreviewUrl(url);
    return () => { URL.revokeObjectURL(url); };
  }, [web]);
  async function select(file: File | undefined, kind: "original" | "web") {
    if (!file) return;
    setBusy(true); setError("");
    if (kind === "original") setOriginal(null);
    else { setWeb(null); setReport(null); setPreviewReady(false); }
    try {
      if (!file.name.toLowerCase().endsWith(".glb")) throw new Error("Vui lòng chọn file .glb.");
      if (file.size > (kind === "original" ? MAX_ORIGINAL_BYTES : MAX_WEB_BYTES)) throw new Error(kind === "original" ? "Bản gốc vượt 50 MB." : "Bản web vượt 8 MB. Hãy giảm dung lượng trước khi tải.");
      const result = validateGlb(new Uint8Array(await file.arrayBuffer()), kind === "original" ? MAX_ORIGINAL_BYTES : undefined);
      if (kind === "original") setOriginal(file);
      else { setPreviewReady(false); setWeb(file); setReport(result); }
      setStatus(kind === "web" ? "Đã kiểm tra file. Xoay xem và chỉnh lỗ xỏ trước khi áp dụng." : "Đã chọn bản gốc.");
    } catch (e) { setError(e instanceof Error ? e.message : "File không hợp lệ."); }
    finally { setBusy(false); }
  }
  async function call(body: object, method = "PATCH") {
    const response = await fetch("/api/admin/bead-models", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sku, expectedAssetId: model?.assetId ?? null, ...body }) });
    const data = await response.json(); if (!response.ok) throw new Error(data.message); return data;
  }
  async function apply() {
    if (!original || !web || !previewReady) return;
    setBusy(true); setError("");
    try {
      setStatus("Chuẩn bị kho lưu trữ…");
      const signed = await call({ originalBytes: original.size, webBytes: web.size }, "POST");
      await uploadModelFile(signed.original, original, p => setStatus(`Đang tải bản gốc: ${p}%`));
      await uploadModelFile(signed.web, web, p => setStatus(`Đang tải bản web: ${p}%`));
      setStatus("Đang kiểm tra và áp dụng mô hình…");
      const result = await call({ action: "publish", assetId: signed.assetId, settings });
      setModel(result.model); setVersions(v => [{ id: signed.assetId, createdAt: new Date().toISOString(), model: result.model }, ...v]);
      setWeb(null); setOriginal(null); setReport(null); setStatus("Đã áp dụng mô hình lên hạt. Bản trước được giữ trong lịch sử.");
    } catch (e) { setError(e instanceof Error ? e.message : "Không thể lưu mô hình."); }
    finally { setBusy(false); }
  }
  async function restore(assetId?: string) {
    setBusy(true); setError("");
    try {
      const data = await call({ action: assetId ? "restore" : "reset", assetId });
      setModel(data.model); setSettings(data.model ?? DEFAULT_MODEL_SETTINGS); setWeb(null); setReport(null);
      setStatus(assetId ? "Đã khôi phục phiên bản." : "Đã chuyển về hạt cầu mặc định.");
    } catch (e) { setError(e instanceof Error ? e.message : "Không thể đổi phiên bản."); }
    finally { setBusy(false); }
  }
  async function saveSettings() {
    if (!model || !previewReady) return;
    setBusy(true); setError("");
    try {
      const data = await call({ action: "configure", assetId: model.assetId, settings });
      setModel(data.model); setVersions(v => [{ id: data.model.assetId, createdAt: new Date().toISOString(), model: data.model }, ...v]);
      setStatus("Đã lưu hướng và kích thước thành phiên bản mới.");
    } catch (e) { setError(e instanceof Error ? e.message : "Không lưu được thông số."); }
    finally { setBusy(false); }
  }
  const preview = previewUrl && report ? { ...settings, assetId: "preview", url: previewUrl, bytes: report.bytes, triangles: report.triangles } : model ? { ...model, ...settings } : null;
  return <section onKeyDown={e => { if (e.key === "Enter" && e.target instanceof HTMLInputElement) e.preventDefault(); }} className="space-y-4 rounded-xl border border-rose-200 bg-rose-50/30 p-4">
    <div><h3 className="font-semibold">Mô hình 3D</h3><p className="text-sm text-gray-600">Bản gốc được giữ riêng tư. Bản web dùng để khách xem và thiết kế vòng.</p></div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {status && <p role="status" className="text-sm text-emerald-700">{status}</p>}
    <fieldset disabled={busy || !ready} className="space-y-4 disabled:opacity-60">
      <label className="block text-sm font-medium">Bản gốc (.glb, tối đa 50 MB)<input type="file" accept=".glb" className="mt-1 block w-full text-sm" onChange={e => void select(e.target.files?.[0], "original")} /></label>
      <label className="block text-sm font-medium">Bản web đã tối ưu (.glb, tối đa 8 MB)<input type="file" accept=".glb" className="mt-1 block w-full text-sm" onChange={e => void select(e.target.files?.[0], "web")} /></label>
      <p className="text-xs text-gray-500">Có thể chọn cùng một file nếu đã nhẹ. Bản này chưa tự giảm số mặt; hãy tối ưu trước khi tải. File chưa hợp lệ không thay mẫu đang dùng.</p>
      {report && <p className="text-sm">{(report.bytes / 1024).toFixed(0)} KB · {report.triangles.toLocaleString("vi-VN")} tam giác {report.warnings.map(w => <span key={w} className="block text-amber-700">{w}</span>)}</p>}
      {preview && <ModelPreview model={preview} onReady={onPreviewReady} onError={onPreviewError} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Chiều rộng mẫu (mm)<input type="number" min={2} max={80} step={.1} value={settings.widthMm} onChange={e => setSettings({ ...settings, widthMm: Number(e.target.value) })} className="mt-1 w-full rounded border p-2" /></label>
        <label className="text-sm">Chiều chiếm chỗ trên dây (mm)<input type="number" min={2} max={80} step={.1} value={settings.spacingMm} onChange={e => setSettings({ ...settings, spacingMm: Number(e.target.value) })} className="mt-1 w-full rounded border p-2" /></label>
        <label className="text-sm">Hướng lỗ trong file<select value={settings.holeAxis} onChange={e => setSettings({ ...settings, holeAxis: e.target.value as ModelSettings["holeAxis"] })} className="mt-1 w-full rounded border p-2"><option value="x">Trái–phải (X)</option><option value="y">Trên–dưới (Y)</option><option value="z">Trước–sau (Z)</option></select></label>
        <label className="text-sm">Kiểu gắn<select value={settings.attachment} onChange={e => setSettings({ ...settings, attachment: e.target.value as ModelSettings["attachment"] })} className="mt-1 w-full rounded border p-2"><option value="bead">Hạt xỏ dây</option><option value="pendant">Mặt treo — tâm ở khoen</option></select></label>
        <label className="text-sm">Xoay quanh dây (độ)<input type="number" min={-360} max={360} value={settings.rollDegrees} onChange={e => setSettings({ ...settings, rollDegrees: Number(e.target.value) })} className="mt-1 w-full rounded border p-2" /></label>
      </div>
      <div><p className="text-sm">Tâm lỗ / khoen so với tâm mẫu (mm)</p><div className="grid grid-cols-3 gap-2">{["X", "Y", "Z"].map((axis, i) => <label key={axis} className="text-xs">{axis}<input type="number" step={.1} min={-80} max={80} value={settings.holeCenter[i]} onChange={e => { const holeCenter = [...settings.holeCenter] as [number, number, number]; holeCenter[i] = Number(e.target.value); setSettings({ ...settings, holeCenter }); }} className="mt-1 w-full rounded border p-2" /></label>)}</div></div>
      <button type="button" disabled={!original || !web || !previewReady} onClick={() => void apply()} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Áp dụng mô hình mới</button>
      {model && !web && <button type="button" disabled={!previewReady} onClick={() => void saveSettings()} className="ml-2 rounded-lg border border-rose-300 px-4 py-2 text-sm text-rose-700 disabled:opacity-40">Lưu hướng và kích thước</button>}
      {versions.length > 0 && <div className="space-y-2 border-t pt-3"><p className="text-sm font-semibold">Phiên bản đã lưu</p>{versions.map(v => <div key={v.id} className="flex justify-between gap-2 text-sm"><span>{new Date(v.createdAt).toLocaleString("vi-VN")} · {Math.round(v.model.bytes / 1024)} KB</span><button type="button" disabled={v.id === model?.assetId} onClick={() => void restore(v.id)} className="text-rose-700 underline disabled:text-gray-400">{v.id === model?.assetId ? "Đang dùng" : "Khôi phục"}</button></div>)}</div>}
      {model && <button type="button" onClick={() => void restore()} className="text-sm text-gray-600 underline">Dùng lại hạt cầu mặc định</button>}
    </fieldset>
  </section>;
}
