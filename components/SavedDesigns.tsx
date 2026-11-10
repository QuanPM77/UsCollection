"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bookmark, FolderHeart, TriangleAlert, X } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useRouter } from "next/navigation";
import { useLoginPrompt } from "@/components/LoginPromptProvider";
import { useBraceletStore } from "@/lib/store";
import { designFingerprint, type SavedDesign } from "@/lib/saved-design";

const button = "rounded-xl border border-pink-mid/40 bg-white px-4 py-2 text-sm font-semibold text-pink-text hover:bg-pink-light disabled:opacity-40";
async function request(method: string, body?: unknown, cursor?: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`/api/custom-designs${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, { method, signal: controller.signal, cache: "no-store", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result) throw new Error(result?.message || "Không thể tải thiết kế. Vui lòng thử lại.");
    return result;
  } catch (error) {
    if (controller.signal.aborted) throw new Error("Kết nối chậm. Bạn có thể thử lưu lại; hệ thống sẽ không tạo thêm mẫu trùng.");
    if (error instanceof TypeError) throw new Error("Mất kết nối mạng. Vui lòng kiểm tra kết nối và thử lại.");
    throw error;
  } finally { clearTimeout(timeout); }
}

export default function SavedDesigns({ gallery = false }: { gallery?: boolean }) {
  const store = useBraceletStore(useShallow(s => ({ slots: s.slots, wristCircumference: s.wristCircumference, beadCatalog: s.beadCatalog, savedDesignId: s.savedDesignId, savedDesignName: s.savedDesignName, savedFingerprint: s.savedFingerprint, savedUpdatedAt: s.savedUpdatedAt })));
  const { isAuthenticated, requestLogin } = useLoginPrompt();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const unsavedDialog = useRef<HTMLDialogElement>(null);
  const [pendingDesign, setPendingDesign] = useState<SavedDesign | null>(null);
  const saving = useRef(false);
  const listRequest = useRef(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [items, setItems] = useState<SavedDesign[]>([]);
  const [loading, setLoading] = useState(gallery);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"new" | "update" | "rename">("new");
  const [target, setTarget] = useState<SavedDesign | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  const refresh = useCallback(async (cursor?: string) => {
    const sequence = ++listRequest.current;
    setLoading(true); setError("");
    try {
      const result = await request("GET", undefined, cursor);
      if (sequence !== listRequest.current) return;
      setItems(previous => cursor ? [...previous, ...result.data.filter((item: SavedDesign) => !previous.some(p => p.id === item.id))] : result.data);
      setNextCursor(result.nextCursor);
    } catch (e) { if (sequence === listRequest.current) setError((e as Error).message); }
    finally { if (sequence === listRequest.current) setLoading(false); }
  }, []);
  const invalidateList = useCallback(() => { listRequest.current++; }, []);
  useEffect(() => {
    if (gallery && isAuthenticated) void refresh();
    else { setItems([]); setLoading(false); }
    return invalidateList;
  }, [gallery, isAuthenticated, refresh, invalidateList]);
  function show(nextMode: typeof mode, design: SavedDesign | null = null) {
    if (!isAuthenticated) { requestLogin(); return; }
    setMode(nextMode); setTarget(design); setError("");
    setName(design ? design.name : store.savedDesignName || "Vòng tay của tôi");
    dialog.current?.showModal();
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving.current || !name.trim()) return;
    saving.current = true; setBusy(true); setError("");
    const config = target?.config ?? { wristCircumference: store.wristCircumference, slots: store.slots };
    try {
      const id = mode === "rename" ? target?.id : mode === "update" ? store.savedDesignId : null;
      const { data, reused } = await request(id ? "PATCH" : "POST", { id, name: name.trim(), ...(mode === "rename" ? { renameOnly: true } : { config }), updatedAt: target?.updatedAt ?? store.savedUpdatedAt });
      if (!gallery) useBraceletStore.setState({ savedDesignId: data.id, savedDesignName: data.name, savedUpdatedAt: data.updatedAt, savedFingerprint: designFingerprint(config), savedBeads: data.config.beads });
      dialog.current?.close(); setMessage(reused ? "Mẫu này đã được lưu. Đã mở lại mẫu có sẵn, không tạo bản trùng." : "Đã lưu vào Thiết kế của tôi.");
      if (gallery) {
        setItems(previous => previous.map(item => item.id === data.id ? data : item));
        if (store.savedDesignId === data.id) useBraceletStore.setState({ savedDesignName: data.name, savedUpdatedAt: data.updatedAt });
      }
    } catch (e) { setError((e as Error).message); }
    finally { saving.current = false; setBusy(false); }
  }
  function open(design: SavedDesign) {
    const current = useBraceletStore.getState();
    if (current.slots.length && designFingerprint(current) !== current.savedFingerprint) {
      setPendingDesign(design);
      unsavedDialog.current?.showModal();
      return;
    }
    openDesign(design);
  }
  function openDesign(design: SavedDesign) {
    const current = useBraceletStore.getState();
    const activeCatalog = current.beadCatalog.filter(b => b.is_active !== false);
    const currentIds = new Set(activeCatalog.map(b => b.id));
    useBraceletStore.setState({ slots: design.config.slots, wristCircumference: design.config.wristCircumference, savedBeads: design.config.beads,
      beadCatalog: [...activeCatalog, ...design.config.beads.filter(b => !currentIds.has(b.id))],
      savedDesignId: design.id, savedDesignName: design.name, savedUpdatedAt: design.updatedAt, savedFingerprint: designFingerprint(design.config), selectedBeadType: null, hoveredSlotIndex: null });
    router.push("/customizer");
  }
  async function remove(design: SavedDesign) {
    if (saving.current || !window.confirm(`Xóa thiết kế “${design.name}”?`)) return;
    saving.current = true; setBusy(true); setError("");
    try {
      await request("DELETE", { id: design.id });
      if (store.savedDesignId === design.id) useBraceletStore.setState({ savedDesignId: null, savedDesignName: "", savedFingerprint: "" });
      setItems(previous => previous.filter(item => item.id !== design.id)); setMessage("Đã xóa thiết kế.");
    } catch (e) { setError((e as Error).message); }
    finally { saving.current = false; setBusy(false); }
  }
  return <section className="space-y-3">
    {!gallery ? <>
      {ready && store.savedDesignName && <p className="text-sm text-pink-text">Đang sửa: <strong>{store.savedDesignName}</strong></p>}
      {ready && store.slots.some(slot => store.beadCatalog.some(bead => bead.id === slot.beadTypeId && bead.is_active === false)) && <p role="status" className="text-sm text-amber-700">Một số hạt trong mẫu không còn bán. Bạn vẫn xem được mẫu; hãy thay các hạt này trước khi đặt hàng.</p>}
      <div className="grid grid-cols-2 gap-2.5 rounded-2xl border border-pink-mid/40 bg-white/70 p-2 shadow-sm">
        <button
          className="flex min-h-14 min-w-0 items-center justify-center gap-2 rounded-xl border border-[#9f3558] bg-[#9f3558] px-2 py-3 text-center text-xs font-bold leading-4 text-white shadow-sm transition-colors hover:bg-pink-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-text disabled:cursor-not-allowed disabled:border-[#bd7189] disabled:bg-[#bd7189] disabled:shadow-none sm:text-[13px]"
          disabled={!ready || !store.slots.length}
          onClick={() => show(store.savedDesignId ? "update" : "new")}
        >
          <Bookmark aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span>{store.savedDesignId ? "Lưu thay đổi" : "Lưu thiết kế"}</span>
        </button>
        <Link
          className="flex min-h-14 min-w-0 items-center justify-center gap-2 rounded-xl border border-pink-deep bg-pink-light/60 px-2 py-3 text-center text-xs font-bold leading-4 text-pink-text shadow-sm transition-colors hover:bg-pink-blush focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-text sm:text-[13px]"
          href="/my-designs"
        >
          <FolderHeart aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span>Thiết kế của tôi</span>
        </Link>
      </div>
      {store.savedDesignId && designFingerprint(store) !== store.savedFingerprint && <button className={`${button} w-full`} disabled={!store.slots.length} onClick={() => show("new")}>Lưu thành mẫu mới</button>}
    </> : !isAuthenticated ? <button className={button} onClick={() => requestLogin()}>Đăng nhập để xem thiết kế của tôi</button> : <>
      {loading ? <p role="status">Đang tải thiết kế…</p> : !items.length && !error ? <div className="rounded-3xl bg-white p-8 text-center"><p>Bạn chưa lưu thiết kế nào.</p><Link href="/customizer" className={`${button} mt-4 inline-block`}>Thiết kế vòng tay đầu tiên</Link></div> : null}
      {error && <button className={button} disabled={loading} onClick={() => refresh(nextCursor ?? undefined)}>Tải lại</button>}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(design => <article key={design.id} className="rounded-3xl border border-pink-mid/30 bg-white p-5 shadow-sm" style={{ contentVisibility: "auto", containIntrinsicSize: "auto 360px" }}>
          <button className="w-full rounded-2xl bg-pink-light/50" onClick={() => open(design)} aria-label={`Xem ${design.name} trong 3D`}>
            <svg viewBox="0 0 240 200" role="img" aria-label={`Ảnh xem trước ${design.name}`} className="mx-auto h-48 w-full">
              <ellipse cx="120" cy="100" rx="70" ry="60" fill="none" stroke="#d8bfa1" strokeWidth="2" />
              {design.config.slots.map((slot, i) => { const bead = design.config.beads.find(b => b.id === slot.beadTypeId); const angle = i / design.config.slots.length * Math.PI * 2; return <circle key={i} cx={120 + 70 * Math.cos(angle)} cy={100 + 60 * Math.sin(angle)} r={Math.min(13, Math.max(4, (bead?.diameter ?? 8)))} fill={bead?.color ?? "#ddd"} stroke="#ffffff" strokeWidth="1.5" />; })}
            </svg>
          </button>
          <h2 className="mt-3 break-words text-lg font-bold">{design.name}</h2>
          <p className="mb-4 text-xs opacity-60">{design.config.slots.length} hạt · {design.config.wristCircumference} mm · {new Date(design.updatedAt).toLocaleDateString("vi-VN")}</p>
          <div className="flex flex-wrap gap-2"><button className={button} onClick={() => open(design)}>Xem / chỉnh sửa 3D</button><button className={button} disabled={busy} onClick={() => show("rename", design)}>Đổi tên</button><button className={button} disabled={busy} onClick={() => remove(design)}>Xóa</button></div>
        </article>)}
      </div>
      {nextCursor && <button className={button} disabled={loading} onClick={() => refresh(nextCursor)}> {loading ? "Đang tải…" : "Xem thêm thiết kế"}</button>}
    </>}
    {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
    {error && !dialog.current?.open && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <dialog
      ref={unsavedDialog}
      role="alertdialog"
      aria-labelledby="unsaved-design-title"
      aria-describedby="unsaved-design-description"
      onClose={() => setPendingDesign(null)}
      className="fixed bottom-auto left-1/2 right-auto top-1/2 m-0 max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-pink-mid/40 bg-cream p-0 text-pink-text shadow-2xl backdrop:bg-slate-950/45 backdrop:backdrop-blur-sm"
    >
      <div className="relative px-5 pb-6 pt-8 text-center sm:px-8 sm:pb-8">
        <button type="button" aria-label="Đóng thông báo, giữ nguyên bản nháp" onClick={() => unsavedDialog.current?.close()} className="absolute right-3 top-3 rounded-full p-2 text-pink-text/60 transition hover:bg-pink-light hover:text-pink-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-text">
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-pink-mid/40 bg-pink-light">
          <TriangleAlert aria-hidden="true" className="h-6 w-6 text-[#9f3558]" />
        </div>
        <h2 id="unsaved-design-title" className="text-balance text-xl font-semibold leading-snug sm:text-[22px]">Bạn có thay đổi chưa lưu</h2>
        <p id="unsaved-design-description" className="mx-auto mt-3 max-w-xs text-pretty text-sm leading-6 text-pink-text/75">
          Vòng tay đang làm chưa được lưu. Nếu mở thiết kế khác, những thay đổi này sẽ bị thay thế.
        </p>
        {pendingDesign && <div className="mt-5 rounded-xl border border-pink-mid/30 bg-white px-4 py-3.5">
          <p className="text-xs text-pink-text/60">Thiết kế bạn muốn mở</p>
          <p className="mt-1 break-words text-sm font-semibold">{pendingDesign.name}</p>
        </div>}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" autoFocus onClick={() => { unsavedDialog.current?.close(); router.push("/customizer"); }} className="min-h-12 rounded-xl bg-[#9f3558] px-3 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-pink-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-text">
            Quay lại lưu
          </button>
          <button type="button" disabled={!pendingDesign} onClick={() => { if (!pendingDesign) return; const design = pendingDesign; unsavedDialog.current?.close(); openDesign(design); }} className="min-h-12 rounded-xl border border-pink-deep bg-white px-3 py-3 text-sm font-bold text-pink-text transition hover:bg-pink-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-text disabled:opacity-40">
            Mở thiết kế
          </button>
        </div>
      </div>
    </dialog>
    <dialog ref={dialog} aria-labelledby="design-name-title" className="w-[calc(100%-2rem)] max-w-md rounded-3xl bg-white p-6 text-pink-text shadow-xl backdrop:bg-black/40" onCancel={event => { if (busy) event.preventDefault(); }}>
      <form onSubmit={save} className="space-y-4">
        <h2 id="design-name-title" className="text-xl font-bold">{mode === "rename" ? "Đổi tên thiết kế" : "Lưu thiết kế của bạn"}</h2>
        <label className="block text-sm">Tên thiết kế<input autoFocus required maxLength={80} value={name} disabled={busy} onChange={event => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-pink-mid p-3" placeholder="Vòng tay của tôi" /></label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2"><button type="button" className={button} disabled={busy} onClick={() => dialog.current?.close()}>Hủy</button><button className={button} disabled={busy || !name.trim()}>{busy ? "Đang lưu…" : "Lưu thiết kế"}</button></div>
      </form>
    </dialog>
  </section>;
}
