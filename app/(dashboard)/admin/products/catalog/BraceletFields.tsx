"use client";

import Link from "next/link";
import { useState, type ChangeEvent } from "react";
import { PRODUCT_STYLES } from "@/lib/product-styles";

type BraceletProductFieldsData = {
  name: string;
  sku: string;
  description: string | null;
  price: number;
  stock: number;
  status: "active" | "inactive" | "draft";
  images: Array<{ path: string; url: string }>;
  details: string[];
  styles: string[];
  bracelet_product_details: { wrist_circumference: number } | null;
};

const fieldClass = "w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100";
const MAX_IMAGE_BYTES = 140_000;

async function compressImage(file: File) {
  const bitmap = await createImageBitmap(file);
  let scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  let quality = 0.82;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Trình duyệt không thể xử lý ảnh này.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (blob && blob.size <= MAX_IMAGE_BYTES) {
      bitmap.close();
      return new File([blob], "product-image.webp", { type: "image/webp" });
    }
    if (quality > 0.52) quality -= 0.1;
    else scale *= 0.82;
  }

  bitmap.close();
  throw new Error("Ảnh quá lớn sau khi nén. Hãy chọn ảnh khác.");
}

export default function BraceletFields({ product }: { product?: BraceletProductFieldsData }) {
  const [images, setImages] = useState(product?.images ?? []);
  const [details, setDetails] = useState(product?.details.length ? product.details : [""]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wristCircumference = product?.bracelet_product_details?.wrist_circumference ?? 160;

  async function handleImageSelection(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!selected.length) return;
    if (images.length + selected.length > 10) {
      setError("Mỗi sản phẩm có thể tải tối đa 10 ảnh.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const uploaded: Array<{ path: string; url: string }> = [];
      for (const source of selected) {
        if (!source.type.startsWith("image/") || source.size > 12 * 1024 * 1024) {
          throw new Error("Chỉ nhận tệp ảnh có dung lượng gốc tối đa 12 MB.");
        }
        const file = await compressImage(source);
        const payload = new FormData();
        payload.set("file", file);
        const response = await fetch("/api/admin/product-images", { method: "POST", body: payload, credentials: "same-origin" });
        const result = await response.json() as { path?: string; url?: string; error?: string };
        if (!response.ok || !result.path || !result.url) throw new Error(result.error || "Không tải được ảnh lên.");
        uploaded.push({ path: result.path, url: result.url });
      }
      setImages((current) => [...current, ...uploaded]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Không tải được ảnh lên.");
    } finally {
      setUploading(false);
    }
  }

  return <div className="grid gap-5 rounded-2xl border border-gray-200 bg-white p-5 md:grid-cols-2">
    <label className="text-sm font-medium text-gray-700">Tên vòng *
      <input name="name" required minLength={2} maxLength={160} defaultValue={product?.name ?? ""} className={`${fieldClass} mt-1.5`} />
    </label>
    <label className="text-sm font-medium text-gray-700">Mã SKU *
      <input name="sku" required maxLength={64} defaultValue={product?.sku ?? ""} className={`${fieldClass} mt-1.5`} />
    </label>
    <label className="text-sm font-medium text-gray-700">Giá (VND) *
      <input name="price" type="number" required min={1} step={1} defaultValue={product?.price ?? ""} className={`${fieldClass} mt-1.5`} />
    </label>
    <label className="text-sm font-medium text-gray-700">Tồn kho *
      <input name="stock" type="number" required min={0} step={1} defaultValue={product?.stock ?? 0} className={`${fieldClass} mt-1.5`} />
    </label>
    <label className="text-sm font-medium text-gray-700">Chu vi cổ tay (mm) *
      <input name="wristCircumference" type="number" required min={100} max={250} step={1} defaultValue={wristCircumference} className={`${fieldClass} mt-1.5`} />
    </label>
    <label className="text-sm font-medium text-gray-700">Trạng thái
      <select name="status" defaultValue={product?.status ?? "draft"} className={`${fieldClass} mt-1.5`}>
        <option value="draft">Bản nháp</option><option value="active">Đang bán</option><option value="inactive">Ngừng bán</option>
      </select>
    </label>
    <label className="text-sm font-medium text-gray-700 md:col-span-2">Mô tả ngắn
      <textarea name="description" rows={3} defaultValue={product?.description ?? ""} className={`${fieldClass} mt-1.5`} />
    </label>

    <fieldset className="md:col-span-2">
      <legend className="text-sm font-medium text-gray-700">Phong cách vòng</legend>
      <p className="mt-1 text-xs text-gray-500">Chọn một hoặc nhiều phong cách để khách có thể lọc sản phẩm.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {PRODUCT_STYLES.map((style) => <label key={style.key} className="flex cursor-pointer gap-3 rounded-xl border border-gray-200 p-3 hover:border-rose-300">
          <input type="checkbox" name="styles" value={style.key} defaultChecked={product?.styles.includes(style.key)} className="mt-1 accent-rose-600" />
          <span><span className="block text-sm font-semibold text-gray-800">{style.label}</span><span className="mt-0.5 block text-xs font-normal text-gray-500">{style.description}</span></span>
        </label>)}
      </div>
    </fieldset>

    <div className="md:col-span-2">
      <p className="text-sm font-medium text-gray-700">Ảnh sản phẩm</p>
      <p className="mt-1 text-xs text-gray-500">Chọn được nhiều ảnh cùng lúc. Ảnh sẽ được nén và tải lên Supabase Storage.</p>
      <label className={`mt-3 inline-flex cursor-pointer items-center rounded-xl border border-dashed border-rose-300 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 ${uploading ? "pointer-events-none opacity-50" : ""}`}>
        <input type="file" accept="image/*" multiple disabled={uploading || images.length >= 10} onChange={handleImageSelection} className="sr-only" />
        {uploading ? "Đang tải ảnh lên..." : "Chọn nhiều ảnh"}
      </label>
      {error && <p role="alert" className="mt-2 text-sm text-rose-600">{error}</p>}
      {images.map((image, index) => <input key={`${image.path}-${index}`} type="hidden" name="images" value={image.path} />)}
      {images.length > 0 && <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {images.map((image, index) => <div key={`${image.path}-${index}`} className="relative aspect-square overflow-hidden rounded-xl border border-gray-200">
          <img src={image.url} alt={`Ảnh sản phẩm ${index + 1}`} className="h-full w-full bg-white object-contain" />
          <button type="button" onClick={() => setImages((current) => current.filter((_, imageIndex) => imageIndex !== index))} aria-label={`Gỡ ảnh ${index + 1}`} className="absolute right-2 top-2 rounded-full bg-black/65 px-2.5 py-1 text-xs font-semibold text-white hover:bg-black">Gỡ</button>
        </div>)}
      </div>}
    </div>

    <div className="md:col-span-2">
      <p className="text-sm font-medium text-gray-700">Thông tin sản phẩm</p>
      <p className="mt-1 text-xs text-gray-500">Mỗi dòng sẽ hiển thị thành một gạch đầu dòng trên trang sản phẩm.</p>
      <div className="mt-3 space-y-2">
        {details.map((detail, index) => <div key={index} className="flex items-center gap-2">
          <span className="text-gray-400">•</span>
          <input name="details" maxLength={300} value={detail} onChange={(event) => setDetails((current) => current.map((value, row) => row === index ? event.target.value : value))} placeholder={`Thông tin ${index + 1}`} className={fieldClass} />
          {details.length > 1 && <button type="button" onClick={() => setDetails((current) => current.filter((_, row) => row !== index))} aria-label={`Xóa dòng thông tin ${index + 1}`} className="rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50">Xóa</button>}
        </div>)}
      </div>
      <button type="button" disabled={details.length >= 30} onClick={() => setDetails((current) => [...current, ""])} className="mt-3 rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">+ Thêm thông tin</button>
    </div>

    <div className="flex justify-end gap-3 md:col-span-2">
      <Link href="/admin/products/catalog" className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700">Hủy</Link>
      <button disabled={uploading} className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50">Lưu sản phẩm</button>
    </div>
  </div>;
}
