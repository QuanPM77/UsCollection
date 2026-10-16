import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { productImageDisplayUrl } from "@/lib/supabase-storage";
import { productStyleLabel } from "@/lib/product-styles";

const currency = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

export default async function BraceletCatalogAdminPage() {
  const products = await prisma.products.findMany({
    where: { type: "bracelet" },
    include: { bracelet_product_details: true },
    orderBy: { updated_at: "desc" },
  });
  const imageUrls = await Promise.all(products.map((product) => product.images[0] ? productImageDisplayUrl(product.images[0]) : null));

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-xl font-bold text-gray-900">Vòng bán sẵn</h2><p className="mt-1 text-sm text-gray-500">Quản lý sản phẩm hiển thị tại trang Mua vòng.</p></div>
        <Link href="/admin/products/catalog/new" className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700">Thêm vòng</Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="p-4">Sản phẩm</th><th className="p-4">Phong cách</th><th className="p-4">SKU</th><th className="p-4">Giá</th><th className="p-4">Kho</th><th className="p-4">Trạng thái</th><th className="p-4" /></tr></thead>
          <tbody>
            {products.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-gray-500">Chưa có vòng bán sẵn. Thêm sản phẩm để hiển thị trên trang Mua vòng.</td></tr>}
            {products.map((product, index) => (
              <tr key={product.id} className="border-t border-gray-100">
                <td className="p-4"><div className="flex items-center gap-3">
                  {imageUrls[index] ? <img src={imageUrls[index]!} alt="" className="h-12 w-12 rounded-lg bg-pink-50 object-contain" /> : <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-pink-50">💎</div>}
                  <div><p className="font-semibold text-gray-900">{product.name}</p><p className="text-xs text-gray-500">{product.bracelet_product_details?.wrist_circumference ?? "—"} mm</p></div>
                </div></td>
                <td className="p-4"><div className="flex flex-wrap gap-1">{product.styles.map((style) => <span key={style} className="rounded-full bg-pink-50 px-2 py-1 text-xs text-rose-700">{productStyleLabel(style)}</span>)}</div></td>
                <td className="p-4 text-gray-600">{product.sku}</td><td className="p-4 font-medium">{currency.format(product.price)}</td><td className="p-4">{product.stock}</td>
                <td className="p-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${product.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{product.status === "active" ? "Đang bán" : product.status === "draft" ? "Bản nháp" : "Ngừng bán"}</span></td>
                <td className="p-4 text-right"><Link href={`/admin/products/catalog/${product.id}`} className="font-semibold text-rose-600 hover:underline">Chỉnh sửa</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
