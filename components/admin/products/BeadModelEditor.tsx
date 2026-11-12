"use client";
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type MutableRefObject } from "react";
import dynamic from "next/dynamic";
import { DEFAULT_MODEL_SETTINGS, validateModelSettings, type BeadModel, type ModelSettings } from "@/lib/bead-model";
import { MAX_ORIGINAL_BYTES, MAX_WEB_BYTES, validateGlb } from "@/lib/glb-validation";
import { uploadModelFile } from "@/lib/upload-model";
const ModelPreview = dynamic(() => import("./ModelPreview"), { ssr: false, loading: () => <p>Đang mở khung xem trước…</p> });

type Version = { id: string; createdAt: string; model: BeadModel };
export type ModelEditorHandle = { validate: () => void; hasModel: () => boolean; save: (sku: string) => Promise<void> };
export default function BeadModelEditor({ sku, controllerRef, disabled = false, onBusyChange, onReadyChange }: {
  sku?: string; controllerRef: MutableRefObject<ModelEditorHandle | null>; disabled?: boolean; onBusyChange?: (busy: boolean) => void; onReadyChange?: (ready: boolean) => void;
}) {
  const [model, setModel] = useState<BeadModel | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [settings, setSettings] = useState<ModelSettings>(DEFAULT_MODEL_SETTINGS);
  const [original, setOriginal] = useState<File | null>(null);
  const [web, setWeb] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [report, setReport] = useState<ReturnType<typeof validateGlb> | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(!sku);
  const [previewReady, setPreviewReady] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [customThumbnail, setCustomThumbnail] = useState<string>();
  const [past, setPast] = useState<ModelSettings[]>([]);
  const [future, setFuture] = useState<ModelSettings[]>([]);
  const captureRef = useRef<(() => string) | null>(null);
  const initialSettings = useRef<ModelSettings>(DEFAULT_MODEL_SETTINGS);
  const pendingAsset = useRef<string | null>(null);
  const onPreviewReady = useCallback(() => setPreviewReady(true), []);
  const onPreviewError = useCallback(() => { setPreviewReady(false); setError("Không đọc được mô hình. Hãy kiểm tra hoặc chọn lại file."); }, []);
  useEffect(() => { onBusyChange?.(busy); return () => onBusyChange?.(false); }, [busy, onBusyChange]);
  useEffect(() => { onReadyChange?.(ready); }, [ready, onReadyChange]);
  useEffect(() => {
    if (!sku) return;
    let cancelled = false;
    fetch(`/api/admin/bead-models?sku=${encodeURIComponent(sku)}`, { cache: "no-store" }).then(async r => {
      const data = await r.json(); if (!r.ok) throw new Error(data.message);
      if (!cancelled) {
        setModel(data.model); setVersions(data.versions.filter((v: Version) => v.model));
        const value = validateModelSettings(data.model ?? DEFAULT_MODEL_SETTINGS);
        setSettings(value); initialSettings.current = value; setReady(true);
      }
    }).catch(e => { if (!cancelled) { setError(e.message); setReady(true); } });
    return () => { cancelled = true; };
  }, [sku]);
  useEffect(() => {
    if (!web) { setPreviewUrl(""); return; }
    const url = URL.createObjectURL(web); setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [web]);
  const beginChange = () => { setPast(p => [...p.slice(-39), settings]); setFuture([]); };
  const change = (next: ModelSettings) => { beginChange(); setSettings(next); };
  function undo() { if (!past.length) return; setFuture(f => [settings, ...f]); setSettings(past[past.length - 1]); setPast(p => p.slice(0, -1)); }
  function redo() { if (!future.length) return; setPast(p => [...p, settings]); setSettings(future[0]); setFuture(f => f.slice(1)); }
  async function select(file: File | undefined, optimized = false) {
    if (!file) return;
    setBusy(true); setError(""); setPreviewReady(false); setWeb(null); setReport(null); pendingAsset.current = null;
    if (!optimized) { setOriginal(null); setCustomThumbnail(undefined); }
    try {
      if (!file.name.toLowerCase().endsWith(".glb")) throw new Error("Vui lòng chọn file .glb.");
      if (file.size > (optimized ? MAX_WEB_BYTES : MAX_ORIGINAL_BYTES)) throw new Error("File vượt giới hạn dung lượng.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const result = validateGlb(bytes, optimized ? MAX_WEB_BYTES : MAX_ORIGINAL_BYTES);
      if (!optimized) setOriginal(file);
      if (file.size <= MAX_WEB_BYTES) { setWeb(file); setReport(result); setStatus("Đã đọc file. Kéo và xoay điểm gắn rồi bấm Lưu hạt."); }
      else setStatus("Bản gốc đã được chọn. Hãy chọn thêm bản web tối ưu dưới 8 MB.");
    } catch (e) { setError(e instanceof Error ? e.message : "File không hợp lệ."); }
    finally { setBusy(false); }
  }
  async function selectPhoto(file?: File) {
    if (!file) return;
    setBusy(true); setError("");
    try {
      if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 8 * 1024 * 1024) throw new Error("Chọn ảnh PNG, JPEG hoặc WebP dưới 8 MB.");
      const bitmap = await createImageBitmap(file);
      try {
        const canvas = document.createElement("canvas"); canvas.width = canvas.height = 256;
        const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Không đọc được ảnh.");
        const scale = 256 / Math.max(bitmap.width, bitmap.height);
        ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, 256, 256);
        ctx.drawImage(bitmap, (256 - bitmap.width * scale) / 2, (256 - bitmap.height * scale) / 2, bitmap.width * scale, bitmap.height * scale);
        setCustomThumbnail(canvas.toDataURL("image/webp", .85));
      } finally { bitmap.close(); }
    } catch (e) { setError(e instanceof Error ? e.message : "Không đọc được ảnh."); }
    finally { setBusy(false); }
  }
  function validate() {
    if (!ready || busy) throw new Error("Vui lòng chờ trình chỉnh 3D sẵn sàng.");
    validateModelSettings(settings);
    if (original && (!web || !previewReady)) throw new Error("Hãy chọn bản web hợp lệ và chờ model hiển thị trước khi lưu.");
    if (model && !original && !previewReady) throw new Error("Hãy chờ model hiển thị trước khi lưu.");
  }
  async function call(targetSku: string, body: object, method = "PATCH") {
    const response = await fetch("/api/admin/bead-models", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sku: targetSku, expectedAssetId: model?.assetId ?? null, ...body }) });
    const data = await response.json(); if (!response.ok) throw new Error(data.message); return data;
  }
  async function save(targetSku: string) {
    validate();
    if (!original && !model) return;
    if (!original && !customThumbnail && model?.thumbnail && JSON.stringify(settings) === JSON.stringify(initialSettings.current)) return;
    const savedPhoto = !original && settings.thumbnailSource === "photo" ? settings.thumbnail : undefined;
    const thumbnail = customThumbnail ?? savedPhoto ?? captureRef.current?.();
    if (!thumbnail) throw new Error("Chưa tạo được ảnh xem trước. Hãy chờ model tải xong rồi thử lại.");
    const config = validateModelSettings({ ...settings, thumbnail, thumbnailSource: customThumbnail || savedPhoto ? "photo" : "model" });
    setBusy(true); setError("");
    try {
      // A lost publish response must not force a second upload or a stale-version error.
      if (pendingAsset.current) {
        const response = await fetch(`/api/admin/bead-models?sku=${encodeURIComponent(targetSku)}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        if (data.model?.assetId === pendingAsset.current) {
          setModel(data.model); initialSettings.current = validateModelSettings(data.model); setSettings(initialSettings.current);
          setOriginal(null); setWeb(null); pendingAsset.current = null; return;
        }
      }
      let result;
      if (original && web) {
        setStatus("Đang chuẩn bị tải model…");
        const signed = await call(targetSku, { originalBytes: original.size, webBytes: web.size }, "POST");
        pendingAsset.current = signed.assetId;
        await uploadModelFile(signed.original, original, p => setStatus(`Đang tải bản gốc: ${p}%`));
        await uploadModelFile(signed.web, web, p => setStatus(`Đang tải bản web: ${p}%`));
        result = await call(targetSku, { action: "publish", assetId: signed.assetId, settings: config });
      } else {
        result = await call(targetSku, { action: "configure", assetId: model!.assetId, settings: config });
      }
      setModel(result.model); setVersions(v => [{ id: result.model.assetId, createdAt: new Date().toISOString(), model: result.model }, ...v]);
      initialSettings.current = config; setSettings(config); pendingAsset.current = null;
      setOriginal(null); setWeb(null); setReport(null); setCustomThumbnail(undefined); setStatus("Đã lưu mô hình và ảnh xem trước.");
    } catch (e) { setError(e instanceof Error ? e.message : "Không lưu được mô hình."); throw e; }
    finally { setBusy(false); }
  }
  useImperativeHandle(controllerRef, () => ({ validate, hasModel: () => Boolean(original || web || model), save }));
  async function restore(assetId: string) {
    if (!sku) return;
    setBusy(true); setError("");
    try {
      const data = await call(sku, { action: "restore", assetId });
      setModel(data.model); const value = validateModelSettings(data.model); setSettings(value); initialSettings.current = value;
      setWeb(null); setOriginal(null); setReport(null); setCustomThumbnail(undefined); setPast([]); setFuture([]); pendingAsset.current = null;
      setStatus("Đã khôi phục phiên bản.");
    } catch (e) { setError(e instanceof Error ? e.message : "Không khôi phục được phiên bản."); }
    finally { setBusy(false); }
  }
  const preview = previewUrl && report ? { ...settings, assetId: "preview", url: previewUrl, bytes: report.bytes, triangles: report.triangles } : !original && model ? { ...model, ...settings } : null;
  return <section onKeyDown={e => { if (e.key === "Enter" && e.target instanceof HTMLInputElement) e.preventDefault(); }} className="space-y-4 rounded-xl border border-rose-200 bg-rose-50/30 p-4">
    <h3 className="font-semibold">Model 3D và điểm gắn</h3>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {status && <p role="status" className="text-sm text-emerald-700">{status}</p>}
    <fieldset disabled={disabled || busy || !ready} className="space-y-4 disabled:opacity-60">
      <label className="block text-sm font-medium">Chọn model GLB<input type="file" accept=".glb" className="mt-1 block w-full text-sm" onChange={e => { void select(e.target.files?.[0]); e.target.value = ""; }} /></label>
      <p className="text-xs text-gray-500">File dưới 8 MB dùng trực tiếp. Bản gốc tối đa 50 MB; file lớn cần bản web tối ưu riêng.</p>
      {original && <p className="text-xs">Đã chọn: {original.name}</p>}
      {original && original.size > MAX_WEB_BYTES && <label className="block text-sm">Bản web tối ưu (.glb, tối đa 8 MB)<input type="file" accept=".glb" onChange={e => { void select(e.target.files?.[0], true); e.target.value = ""; }} /></label>}
      {report && <p className="text-xs">{Math.round(report.bytes / 1024)} KB · {report.triangles.toLocaleString("vi-VN")} tam giác{report.warnings.map(w => <span key={w} className="block text-amber-700">{w}</span>)}</p>}
      {preview && <>
        <div className="flex flex-wrap gap-2 text-xs">
          <button type="button" disabled={!past.length} onClick={undo} className="rounded border p-2 disabled:opacity-40">Hoàn tác</button>
          <button type="button" disabled={!future.length} onClick={redo} className="rounded border p-2 disabled:opacity-40">Làm lại</button>
          <button type="button" onClick={() => change({ ...settings, holeCenter: [0, 0, 0], anchorRotation: undefined, holeAxis: "x", rollDegrees: 0 })} className="rounded border p-2">Đặt lại tâm / hướng</button>
        </div>
        <div className={disabled || busy ? "pointer-events-none" : ""}><ModelPreview key={preview.url} model={preview} onChange={setSettings} onBeginChange={beginChange} onReady={onPreviewReady} onError={onPreviewError} captureRef={captureRef} /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Chiều rộng model (mm)<input type="number" min={2} max={80} step={.1} value={settings.widthMm} onChange={e => change({ ...settings, widthMm: Number(e.target.value) })} className="mt-1 w-full rounded border p-2" /></label>
          <label className="text-sm">Khoảng chiếm trên dây (mm)<input type="number" min={2} max={80} step={.1} value={settings.spacingMm} onChange={e => change({ ...settings, spacingMm: Number(e.target.value) })} className="mt-1 w-full rounded border p-2" /></label>
          <label className="text-sm">Kiểu gắn<select value={settings.attachment} onChange={e => change({ ...settings, attachment: e.target.value as ModelSettings["attachment"] })} className="mt-1 w-full rounded border p-2"><option value="bead">Hạt xỏ dây</option><option value="pendant">Mặt treo — tâm ở khoen</option></select></label>
          <button type="button" onClick={() => change({ ...settings, rollDegrees: (settings.rollDegrees + 90) % 360 })} className="self-end rounded border p-2 text-sm">Xoay model 90° quanh dây</button>
        </div>
        <details className="text-sm"><summary className="cursor-pointer font-medium">Thông số nâng cao</summary>
          <label className="mt-3 block">Đặt hướng lỗ theo trục<select value={settings.anchorRotation ? "custom" : settings.holeAxis} onChange={e => change({ ...settings, holeAxis: e.target.value as ModelSettings["holeAxis"], anchorRotation: undefined })} className="ml-2 rounded border p-2"><option disabled value="custom">Hướng tự do (đã kéo xoay)</option><option value="x">X</option><option value="y">Y</option><option value="z">Z</option></select></label>
          <p className="mt-3">Tâm lỗ so với tâm model (mm)</p><div className="grid grid-cols-3 gap-2">{["X", "Y", "Z"].map((axis, i) => <label key={axis}>{axis}<input type="number" min={-80} max={80} step={0.001} value={Number(settings.holeCenter[i].toFixed(3))} onChange={e => { const holeCenter = [...settings.holeCenter] as [number, number, number]; holeCenter[i] = Number(e.target.value); change({ ...settings, holeCenter }); }} className="w-full rounded border p-2" /></label>)}</div>
          <label className="mt-3 block">Xoay quanh dây (độ)<input type="number" min={-360} max={360} value={settings.rollDegrees} onChange={e => change({ ...settings, rollDegrees: Number(e.target.value) })} className="ml-2 rounded border p-2" /></label>
        </details>
        <details className="text-sm"><summary className="cursor-pointer font-medium">Ảnh đại diện</summary>
          <p className="my-2 text-xs text-gray-600">Tự tạo từ model khi lưu. Có thể thay bằng ảnh sản phẩm thật.</p>
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { void selectPhoto(e.target.files?.[0]); e.target.value = ""; }} />
          {(customThumbnail || settings.thumbnailSource === "photo") && <><p className="mt-2 text-xs text-emerald-700">Đang dùng ảnh sản phẩm.</p><button type="button" onClick={() => { setCustomThumbnail(undefined); change({ ...settings, thumbnailSource: "model" }); }} className="underline">Dùng ảnh từ model</button></>}
        </details>
      </>}
      {versions.length > 0 && <details className="border-t pt-3 text-sm"><summary>Phiên bản đã lưu</summary>{versions.map(v => <div key={v.id} className="mt-2 flex justify-between gap-2"><span>{new Date(v.createdAt).toLocaleString("vi-VN")}</span><button type="button" disabled={v.id === model?.assetId} onClick={() => void restore(v.id)} className="text-rose-700 underline disabled:text-gray-400">{v.id === model?.assetId ? "Đang dùng" : "Khôi phục"}</button></div>)}</details>}
    </fieldset>
  </section>;
}
