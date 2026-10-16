import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { productImageDisplayUrl } from "@/lib/supabase-storage";
import ProductCheckoutForm from "./ProductCheckoutForm";

export default async function ProductCheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, session] = await Promise.all([params, auth()]);
  const [product, user] = await Promise.all([
    prisma.products.findFirst({
      where: { id, type: "bracelet", status: "active" },
      select: { id: true, name: true, sku: true, price: true, stock: true, images: true },
    }),
    session?.user.id ? prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        fullName: true,
        phone: true,
        addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }], take: 1 },
      },
    }) : Promise.resolve(null),
  ]);
  if (!product) notFound();
  const image = product.images[0] ? await productImageDisplayUrl(product.images[0]) : null;
  const savedAddress = user?.addresses[0];
  const initialValues = {
    name: savedAddress?.recipientName || user?.fullName || "",
    phone: savedAddress?.phone || user?.phone || "",
    address: savedAddress ? [savedAddress.addressLine, savedAddress.province].filter(Boolean).join(", ") : "",
  };

  return <main className="min-h-screen bg-gradient-to-br from-pink-light via-cream to-white text-pink-text">
    <nav className="flex items-center gap-4 border-b border-pink-mid/20 bg-white/60 px-6 py-4">
      <Link href={`/buy/${product.id}`} className="text-sm text-pink-deep hover:underline">← Quay lại sản phẩm</Link>
      <span className="font-display font-bold">Thanh toán</span>
    </nav>
    <ProductCheckoutForm productId={product.id} productName={product.name} sku={product.sku} unitPrice={product.price} stock={product.stock} image={image} initialValues={initialValues} />
  </main>;
}
