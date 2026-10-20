import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function currentAdminId() {
  const session = await auth();
  return session?.user?.role === "admin" ? session.user.id : null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await currentAdminId();
  if (!adminId) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });
  const { id } = await params;

  const conversation = await prisma.supportConversation.findUnique({ where: { id }, select: { id: true } });
  if (!conversation) return NextResponse.json({ message: "Không tìm thấy cuộc trò chuyện." }, { status: 404 });
  const [details, messages] = await Promise.all([
    prisma.supportConversation.findUnique({
      where: { id },
      select: { id: true, customer: { select: { fullName: true, email: true, phone: true } } },
    }),
    prisma.supportMessage.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, senderRole: true, body: true, createdAt: true },
    }),
  ]);
  return NextResponse.json({ conversation: details, messages: messages.reverse() });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await currentAdminId();
  if (!adminId) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });
  const { id } = await params;
  const input = await request.json().catch(() => null) as { body?: unknown } | null;
  const body = typeof input?.body === "string" ? input.body.trim() : "";
  if (!body || body.length > 2000) return NextResponse.json({ message: "Tin nhắn cần có từ 1 đến 2.000 ký tự." }, { status: 400 });
  const conversation = await prisma.supportConversation.findUnique({ where: { id }, select: { id: true } });
  if (!conversation) return NextResponse.json({ message: "Không tìm thấy cuộc trò chuyện." }, { status: 404 });

  const [message] = await prisma.$transaction([
    prisma.supportMessage.create({ data: { conversationId: id, senderId: adminId, senderRole: "admin", body }, select: { id: true, senderRole: true, body: true, createdAt: true } }),
    prisma.supportConversation.update({ where: { id }, data: { updatedAt: new Date() } }),
    prisma.supportMessage.updateMany({
      where: { conversationId: id, senderRole: "customer", readAt: null },
      data: { readAt: new Date() },
    }),
  ]);
  return NextResponse.json({ message }, { status: 201 });
}
