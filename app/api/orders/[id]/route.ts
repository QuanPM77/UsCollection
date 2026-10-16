import { NextResponse } from "next/server";
import { getOrderById, getOrderSlots, updateTrangThaiThanhToan, addAdminAuditLog, getOrders } from "@/lib/db/fileDb";
import fs from "fs/promises";
import path from "path";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json({ success: false, error: "Không tìm thấy đơn hàng" }, { status: 404 });
    }
    const slots = await getOrderSlots(order.id);
    return NextResponse.json({ success: true, data: { ...order, slots } });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Lỗi lấy chi tiết đơn hàng" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { fulfillment_status, payment_status, manager_id } = body;

    const orders = await getOrders();
    const order = orders.find((o) => o.id === id || o.order_code === id);
    if (!order) {
      return NextResponse.json({ success: false, error: "Không tìm thấy đơn hàng" }, { status: 404 });
    }

    if (fulfillment_status) {
      order.fulfillment_status = fulfillment_status;
    }
    if (payment_status) {
      order.payment_status = payment_status;
    }
    order.updated_at = new Date().toISOString();

    const filePath = path.join(process.cwd(), "data", "orders.json");
    await fs.writeFile(filePath, JSON.stringify(orders, null, 2), "utf-8");

    if (manager_id) {
      await addAdminAuditLog(manager_id, "update_order_status", "orders", order.id, `Cập nhật trạng thái đơn hàng ${order.order_code}`);
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Lỗi cập nhật đơn hàng" }, { status: 500 });
  }
}
