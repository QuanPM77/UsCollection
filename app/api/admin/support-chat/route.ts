import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function adminId() {
  const session = await auth();
  return session?.user?.role === "admin" ? session.user.id : null;
}

export async function GET() {
  if (!(await adminId())) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });

  const [conversations, unreadGroups] = await Promise.all([
    prisma.supportConversation.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        updatedAt: true,
        customer: { select: { fullName: true, email: true, phone: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, senderRole: true, createdAt: true } },
      },
    }),
    prisma.supportMessage.groupBy({
      by: ["conversationId"],
      where: { senderRole: "customer", readAt: null },
      _count: { _all: true },
    }),
  ]);

  const unreadByConversation = new Map(unreadGroups.map((item) => [item.conversationId, item._count._all]));
  const result = conversations.map((conversation) => ({
    ...conversation,
    unreadCount: unreadByConversation.get(conversation.id) ?? 0,
  }));
  return NextResponse.json({
    conversations: result,
    unreadConversations: result.filter((conversation) => conversation.unreadCount > 0).length,
  });
}
