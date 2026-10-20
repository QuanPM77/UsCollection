import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function customerId() {
  const session = await auth();
  return session?.user?.role === "customer" ? session.user.id : null;
}

export async function GET(request: Request) {
  const id = await customerId();
  if (!id) return NextResponse.json({ message: "Vui lòng đăng nhập để trò chuyện với shop." }, { status: 401 });

  const summaryOnly = new URL(request.url).searchParams.get("summary") === "1";
  const markRead = new URL(request.url).searchParams.get("read") === "1";
  const conversation = await prisma.supportConversation.findUnique({
    where: { customerId: id },
    select: { id: true },
  });

  if (conversation && markRead) {
    await prisma.supportMessage.updateMany({
      where: { conversationId: conversation.id, senderRole: "admin", readAt: null },
      data: { readAt: new Date() },
    });
  }
  const unreadCount = conversation ? await prisma.supportMessage.count({
    where: { conversationId: conversation.id, senderRole: "admin", readAt: null },
  }) : 0;
  const messages = conversation && !summaryOnly ? await prisma.supportMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, senderRole: true, body: true, createdAt: true },
  }) : [];

  return NextResponse.json({
    conversationId: conversation?.id ?? null,
    unreadCount,
    messages: messages.reverse(),
  });
}

export async function POST(request: Request) {
  const id = await customerId();
  if (!id) return NextResponse.json({ message: "Vui lòng đăng nhập để trò chuyện với shop." }, { status: 401 });

  const input = await request.json().catch(() => null) as { body?: unknown } | null;
  const body = typeof input?.body === "string" ? input.body.trim() : "";
  if (!body || body.length > 2000) return NextResponse.json({ message: "Tin nhắn cần có từ 1 đến 2.000 ký tự." }, { status: 400 });

  const conversation = await prisma.supportConversation.upsert({
    where: { customerId: id },
    create: { customerId: id },
    update: {},
    select: { id: true },
  });
  const [message] = await prisma.$transaction([
    prisma.supportMessage.create({
      data: { conversationId: conversation.id, senderId: id, senderRole: "customer", body },
      select: { id: true, senderRole: true, body: true, createdAt: true },
    }),
    prisma.supportConversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } }),
  ]);
  return NextResponse.json({ conversationId: conversation.id, message }, { status: 201 });
}
