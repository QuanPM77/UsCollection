"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guard";
import { removeProductImage } from "@/lib/supabase-storage";
import { PRODUCT_STYLES } from "@/lib/product-styles";

function readProduct(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const sku = String(formData.get("sku") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const price = Number(formData.get("price"));
  const stock = Number(formData.get("stock"));
  const wristCircumference = Number(formData.get("wristCircumference"));
  const statusValue = String(formData.get("status") ?? "draft");
  const status: "active" | "inactive" | "draft" = statusValue === "active" || statusValue === "inactive" ? statusValue : "draft";
  const images = formData.getAll("images").map((value) => String(value).trim()).filter(Boolean);
  const details = formData.getAll("details").map((value) => String(value).trim()).filter(Boolean);
  const styles = [...new Set(formData.getAll("styles").map((value) => String(value).trim()).filter(Boolean))];

  if (name.length < 2 || name.length > 160) throw new Error("Tên sản phẩm cần từ 2 đến 160 ký tự.");
  if (!sku || sku.length > 64) throw new Error("Vui lòng nhập mã SKU hợp lệ.");
  if (!Number.isSafeInteger(price) || price <= 0) throw new Error("Giá sản phẩm phải lớn hơn 0.");
  if (!Number.isSafeInteger(stock) || stock < 0) throw new Error("Tồn kho không hợp lệ.");
  if (!Number.isSafeInteger(wristCircumference) || wristCircumference < 100 || wristCircumference > 250) {
    throw new Error("Chu vi vòng cần từ 100 đến 250 mm.");
  }
  if (images.length > 10 || images.some((image) => !/^https?:\/\//i.test(image) && !image.startsWith("products/"))) {
    throw new Error("Tối đa 10 ảnh; ảnh cần được tải lên Storage hoặc dùng URL http(s).");
  }
  if (details.length > 30 || details.some((line) => line.length > 300)) {
    throw new Error("Thông tin sản phẩm tối đa 30 dòng, mỗi dòng không quá 300 ký tự.");
  }
  if (styles.some((style) => !PRODUCT_STYLES.some((option) => option.key === style))) {
    throw new Error("Phong cách sản phẩm không hợp lệ.");
  }

  return { name, sku, description: description || null, price, stock, status, images, details, styles, wristCircumference };
}

function refreshCatalog(productId?: string) {
  revalidatePath("/admin/products/catalog");
  revalidatePath("/buy");
  if (productId) revalidatePath(`/buy/${productId}`);
}

export async function createBracelet(formData: FormData) {
  await requireRole("admin");
  const data = readProduct(formData);
  const product = await prisma.products.create({
    data: {
      sku: data.sku,
      type: "bracelet",
      name: data.name,
      description: data.description,
      price: data.price,
      stock: data.stock,
      status: data.status,
      images: data.images,
      details: data.details,
      styles: data.styles,
      bracelet_product_details: {
        create: { wrist_circumference: data.wristCircumference, image_url: data.images[0] ?? null },
      },
    },
    select: { id: true },
  });
  refreshCatalog(product.id);
  redirect("/admin/products/catalog");
}

export async function updateBracelet(productId: string, formData: FormData) {
  await requireRole("admin");
  const data = readProduct(formData);
  const previous = await prisma.products.findFirst({ where: { id: productId, type: "bracelet" }, select: { images: true } });
  if (!previous) redirect("/admin/products/catalog");
  await prisma.products.update({
    where: { id: productId, type: "bracelet" },
    data: {
      sku: data.sku,
      name: data.name,
      description: data.description,
      price: data.price,
      stock: data.stock,
      status: data.status,
      images: data.images,
      details: data.details,
      styles: data.styles,
      bracelet_product_details: {
        upsert: {
          create: { wrist_circumference: data.wristCircumference, image_url: data.images[0] ?? null },
          update: { wrist_circumference: data.wristCircumference, image_url: data.images[0] ?? null },
        },
      },
    },
  });
  const removedImages = previous.images.filter((image) => !data.images.includes(image));
  await Promise.all(removedImages.map((image) => removeProductImage(image).catch(() => undefined)));
  refreshCatalog(productId);
  redirect("/admin/products/catalog");
}
