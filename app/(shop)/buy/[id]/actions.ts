"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function submitReview(productId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user.id || session.user.role !== "customer") redirect("/login");

  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error("Vui lòng chọn số sao từ 1 đến 5.");
  if (comment.length < 1 || comment.length > 2000) throw new Error("Bình luận cần từ 1 đến 2.000 ký tự.");

  const product = await prisma.products.findFirst({ where: { id: productId, type: "bracelet", status: "active" }, select: { id: true } });
  if (!product) redirect("/buy");

  await prisma.productReview.upsert({
    where: { productId_userId: { productId, userId: session.user.id } },
    create: { productId, userId: session.user.id, rating, comment },
    update: { rating, comment },
  });

  revalidatePath("/buy");
  revalidatePath(`/buy/${productId}`);
  redirect(`/buy/${productId}?review=posted#reviews`);
}
