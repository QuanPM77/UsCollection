import { prisma } from "@/lib/prisma";
import { pageNumber } from "@/lib/pagination";

export async function getProductReviews(productId: string, requestedPage: unknown, userId?: string) {
  const pageSize = 12;
  const [summary, myReview] = await Promise.all([
    prisma.productReview.aggregate({ where: { productId }, _avg: { rating: true }, _count: { _all: true } }),
    userId ? prisma.productReview.findUnique({
      where: { productId_userId: { productId, userId } }, select: { rating: true, comment: true },
    }) : null,
  ]);
  const total = summary._count._all;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(pageNumber(requestedPage), pages);
  const reviews = await prisma.productReview.findMany({
    where: { productId },
    select: { id: true, rating: true, comment: true, createdAt: true, user: { select: { fullName: true, avatarUrl: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: pageSize, skip: (page - 1) * pageSize,
  });
  return { reviews, myReview, averageRating: summary._avg.rating, total, page, pages };
}
