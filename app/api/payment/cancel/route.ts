import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PayOS } from "@payos/node";
import { deleteUnpaidOrder, settlePaidOrder } from "@/lib/payment-settlement";

const payos = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID,
  apiKey: process.env.PAYOS_API_KEY,
  checksumKey: process.env.PAYOS_CHECKSUM_KEY,
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user.id || session.user.role !== "customer") {
    return NextResponse.json({ success: false, message: "Vui lòng đăng nhập bằng tài khoản khách hàng." }, { status: 401 });
  }
  const body = await req.json().catch(() => null) as { orderId?: string } | null;
  if (!body?.orderId || !/^[0-9a-f-]{36}$/i.test(body.orderId)) {
    return NextResponse.json({ success: false, message: "Mã đơn hàng không hợp lệ." }, { status: 400 });
  }
  const order = await prisma.order.findUnique({
    where: { id: body.orderId },
    select: { user_id: true, orderCode: true, totalPrice: true, paymentStatus: true },
  });
  if (!order) {
    // A PayOS webhook/status refresh may already have deleted a failed or
    // canceled pending order. Treat the user's cancel request as complete.
    return NextResponse.json({ success: true, paymentStatus: "failed", message: "Đơn thanh toán đã được hủy và xóa." });
  }
  if (order.user_id !== session.user.id) {
    return NextResponse.json({ success: false, message: "Không tìm thấy đơn hàng." }, { status: 404 });
  }
  if (order.paymentStatus === "paid") {
    return NextResponse.json({ success: true, paymentStatus: "paid", message: "PayOS đã xác nhận thanh toán." });
  }
  if (order.paymentStatus !== "pending") {
    return NextResponse.json({ success: true, paymentStatus: order.paymentStatus });
  }
  if (!process.env.PAYOS_CLIENT_ID || !process.env.PAYOS_API_KEY || !process.env.PAYOS_CHECKSUM_KEY) {
    return NextResponse.json({ success: false, message: "PayOS chưa được cấu hình." }, { status: 503 });
  }

  try {
    let link = await payos.paymentRequests.get(Number(order.orderCode));
    if (link.amount !== order.totalPrice) {
      return NextResponse.json({ success: false, message: "Thông tin thanh toán không khớp với đơn hàng." }, { status: 409 });
    }
    if (link.status === "PAID") {
      await settlePaidOrder(order.orderCode, link.amount);
      return NextResponse.json({ success: true, paymentStatus: "paid", message: "PayOS đã xác nhận thanh toán." });
    }
    if (link.status === "PENDING" || link.status === "PROCESSING") {
      try {
        link = await payos.paymentRequests.cancel(Number(order.orderCode), "Khách hàng đã đóng trang thanh toán");
      } catch {
        link = await payos.paymentRequests.get(Number(order.orderCode));
      }
    }
    if (link.status === "PAID") {
      await settlePaidOrder(order.orderCode, link.amount);
      return NextResponse.json({ success: true, paymentStatus: "paid", message: "PayOS đã xác nhận thanh toán." });
    }
    if (["CANCELLED", "EXPIRED", "FAILED"].includes(link.status)) {
      await deleteUnpaidOrder(order.orderCode);
      return NextResponse.json({ success: true, paymentStatus: "failed", message: "Link thanh toán đã hủy; đơn và số lượng giữ chỗ đã được xóa." });
    }
    return NextResponse.json({ success: false, message: "PayOS đang xử lý giao dịch. Tồn kho chưa được giải phóng; vui lòng đợi trạng thái cập nhật." }, { status: 409 });
  } catch (error) {
    console.error("[PayOS Cancel] Could not cancel payment link", error);
    return NextResponse.json({ success: false, message: "Chưa thể hủy link thanh toán. Đơn hàng vẫn giữ số lượng trong thời gian chờ." }, { status: 502 });
  }
}
