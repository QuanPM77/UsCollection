import CheckoutShell from "@/components/checkout/CheckoutShell";
import { notFound } from "next/navigation";
import { getSession as auth } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { productImageDisplayUrl } from "@/lib/supabase-storage";
import { getAvailableProductStock } from "@/lib/product-availability";
import ProductCheckoutForm from "./ProductCheckoutForm";

export default async function ProductCheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessionPromise = auth();
  const [product, user, session] = await Promise.all([
    prisma.products.findFirst({
      where: { id, type: "bracelet", status: "active" },
      select: { id: true, name: true, sku: true, price: true, stock: true, images: true },
    }),
    sessionPromise.then(session => session?.user.id ? prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        fullName: true,
        phone: true,
        addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }], take: 1 },
      },
    }) : null),
    sessionPromise,
  ]);
  if (!product) notFound();
  const [availableStock, image] = await Promise.all([
    getAvailableProductStock(product.id, product.stock, session?.user.id),
    product.images[0] ? productImageDisplayUrl(product.images[0]) : Promise.resolve(null),
  ]);
  const savedAddress = user?.addresses[0];
  const initialValues = {
    name: savedAddress?.recipientName || user?.fullName || "",
    phone: savedAddress?.phone || user?.phone || "",
    addressLine: savedAddress?.addressLine ?? "",
    province: savedAddress?.province ?? "",
  };

  return <CheckoutShell backHref={`/buy/${product.id}`} backLabel="Quay lại sản phẩm">
    <ProductCheckoutForm productId={product.id} productName={product.name} sku={product.sku} unitPrice={product.price} stock={availableStock} image={image} initialValues={initialValues} />
  </CheckoutShell>;
}
