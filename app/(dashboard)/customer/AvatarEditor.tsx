"use client";

import { useEffect, useRef, useState } from "react";
import { UserRound, X } from "lucide-react";
import { deleteAvatar, saveAvatar } from "./actions";

const CROP_SIZE = 280;

function fallbackAvatar() {
  return <UserRound aria-hidden="true" className="h-16 w-16 text-white" strokeWidth={1.6} />;
}

export default function AvatarEditor({ avatarUrl }: { avatarUrl: string | null }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const previewImage = useRef<HTMLImageElement>(null);
  const dragOrigin = useRef<{ pointerX: number; pointerY: number; offsetX: number; offsetY: number } | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);
  const [brokenAvatar, setBrokenAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    return () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    };
  }, [sourceUrl]);

  function closeModal() {
    setIsOpen(false);
    setSourceUrl(null);
    setDimensions(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setError(null);
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn một tệp ảnh.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Ảnh gốc cần nhỏ hơn 8 MB.");
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setSourceUrl(nextUrl);
      setDimensions({ width: image.naturalWidth, height: image.naturalHeight });
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    image.onerror = () => {
      URL.revokeObjectURL(nextUrl);
      setError("Không thể mở tệp ảnh này.");
    };
    image.src = nextUrl;
  }

  function clampOffset(x: number, y: number, nextZoom = zoom) {
    if (!dimensions) return { x: 0, y: 0 };
    const scale = Math.max(CROP_SIZE / dimensions.width, CROP_SIZE / dimensions.height) * nextZoom;
    const maxX = Math.max(0, (dimensions.width * scale - CROP_SIZE) / 2);
    const maxY = Math.max(0, (dimensions.height * scale - CROP_SIZE) / 2);
    return { x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) };
  }

  function handleZoomChange(value: number) {
    setZoom(value);
    setOffset((current) => clampOffset(current.x, current.y, value));
  }

  async function saveCroppedImage() {
    const image = previewImage.current;
    if (!image || !dimensions) {
      setError("Hãy chọn ảnh trước khi lưu.");
      return;
    }

    const scale = Math.max(CROP_SIZE / dimensions.width, CROP_SIZE / dimensions.height) * zoom;
    const renderedWidth = dimensions.width * scale;
    const renderedHeight = dimensions.height * scale;
    const left = (CROP_SIZE - renderedWidth) / 2 + offset.x;
    const top = (CROP_SIZE - renderedHeight) / 2 + offset.y;
    const sourceX = Math.max(0, Math.min(dimensions.width, -left / scale));
    const sourceY = Math.max(0, Math.min(dimensions.height, -top / scale));
    const sourceSize = Math.min(CROP_SIZE / scale, dimensions.width - sourceX, dimensions.height - sourceY);
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext("2d");
    if (!context) {
      setError("Không thể xử lý ảnh trên trình duyệt này.");
      return;
    }
    context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, 512, 512);
    const compressed = canvas.toDataURL("image/webp", 0.82);
    const formData = new FormData();
    formData.set("avatarData", compressed);
    setIsSaving(true);
    try {
      await saveAvatar(formData);
    } finally {
      setIsSaving(false);
    }
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!sourceUrl) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragOrigin.current = { pointerX: event.clientX, pointerY: event.clientY, offsetX: offset.x, offsetY: offset.y };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragOrigin.current) return;
    const start = dragOrigin.current;
    setOffset(clampOffset(start.offsetX + event.clientX - start.pointerX, start.offsetY + event.clientY - start.pointerY));
  }

  function stopDragging() {
    dragOrigin.current = null;
  }

  const scale = dimensions ? Math.max(CROP_SIZE / dimensions.width, CROP_SIZE / dimensions.height) * zoom : 1;
  const displayUrl = avatarUrl && !brokenAvatar ? avatarUrl : null;

  return (
    <>
      <button
        type="button"
        aria-label="Mở hộp chỉnh sửa ảnh đại diện"
        onClick={() => setIsOpen(true)}
        className="group relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-pink-deep shadow-md outline-none ring-pink-mid transition hover:ring-4 focus-visible:ring-4"
      >
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayUrl} alt="Ảnh đại diện" onError={() => setBrokenAvatar(true)} className="h-full w-full object-cover" />
        ) : fallbackAvatar()}
        <span className="absolute inset-x-0 bottom-0 bg-slate-950/55 py-1.5 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
          Chỉnh sửa
        </span>
      </button>
      <div className="mt-3 text-center sm:text-left">
        <p className="font-semibold">Ảnh đại diện</p>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="avatar-dialog-title" className="my-auto w-full max-w-lg rounded-3xl bg-white p-5 text-pink-text shadow-2xl sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="avatar-dialog-title" className="text-xl font-bold">Chỉnh sửa ảnh đại diện</h2>
                <p className="mt-1 text-sm text-pink-text/60">Kéo ảnh để căn vùng muốn dùng, dùng thanh trượt để phóng to.</p>
              </div>
              <button type="button" aria-label="Đóng" onClick={closeModal} className="rounded-full p-2 text-pink-text/60 hover:bg-pink-light hover:text-pink-text"><X className="h-5 w-5" /></button>
            </div>

            <input ref={fileInput} type="file" accept="image/*" className="sr-only" onChange={handleFileChange} />
            <div
              className="relative mx-auto h-[280px] w-[280px] touch-none overflow-hidden rounded-2xl bg-pink-deep/10 ring-1 ring-pink-mid/40"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={stopDragging}
              onPointerCancel={stopDragging}
              style={{ cursor: sourceUrl ? "grab" : "default" }}
            >
              {sourceUrl && dimensions ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  ref={previewImage}
                  src={sourceUrl}
                  alt="Xem trước ảnh đang căn chỉnh"
                  draggable={false}
                  className="pointer-events-none absolute max-w-none select-none"
                  style={{ width: dimensions.width * scale, height: dimensions.height * scale, left: `calc(50% + ${offset.x}px)`, top: `calc(50% + ${offset.y}px)`, transform: "translate(-50%, -50%)" }}
                />
              ) : displayUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={displayUrl} alt="Ảnh đại diện hiện tại" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-pink-deep">
                  {fallbackAvatar()}
                  <span className="text-xs">Chọn ảnh để bắt đầu</span>
                </div>
              )}
            </div>

            {sourceUrl && (
              <label className="mt-5 block text-xs font-semibold">
                Phóng to ảnh
                <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => handleZoomChange(Number(event.target.value))} className="mt-2 block w-full accent-pink-deep" />
              </label>
            )}

            {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
            <div className="mt-6 flex flex-wrap justify-center gap-2 sm:justify-end">
              <button type="button" onClick={() => fileInput.current?.click()} className="rounded-xl border border-pink-mid/50 px-4 py-2.5 text-sm font-semibold text-pink-deep hover:bg-pink-light">
                {sourceUrl ? "Chọn ảnh khác" : "Chọn ảnh"}
              </button>
              <button type="button" onClick={closeModal} className="rounded-xl border border-pink-mid/40 px-4 py-2.5 text-sm font-medium text-pink-text/70 hover:bg-pink-light">
                Hủy
              </button>
              <button type="button" onClick={saveCroppedImage} disabled={!sourceUrl || isSaving} className="rounded-xl bg-pink-deep px-5 py-2.5 text-sm font-semibold text-white hover:bg-pink-text disabled:cursor-not-allowed disabled:opacity-40">
                {isSaving ? "Đang lưu..." : "Lưu ảnh"}
              </button>
              <form action={deleteAvatar}>
                <button type="submit" disabled={!avatarUrl} className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40">
                  Xóa ảnh
                </button>
              </form>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
