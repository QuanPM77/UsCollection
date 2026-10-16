import { NextResponse } from "next/server";
import { getOrders, createOrderWithSlots, getOrderSlots } from "@/lib/db/fileDb";

export async function GET() {
  try {
    const orders = await getOrders();
    const result = await Promise.all(
      orders.map(async (o) => {
        const slots = await getOrderSlots(o.id);
        return { ...o, slots };
      })
    );
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Lỗi lấy danh sách đơn hàng" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      order_code,
      user_id,
      source_design_id,
      source_template_id,
      customer_name,
      phone,
      address,
      wrist_circumference,
      total_price,
      payment_status,
      fulfillment_status,
      beadSlotIds,
    } = body;

    if (!customer_name || !phone || !address || !beadSlotIds || !Array.isArray(beadSlotIds)) {
      return NextResponse.json(
        { success: false, error: "Thiếu thông tin đặt hàng (customer_name, phone, address, beadSlotIds)" },
        { status: 400 }
      );
    }

    const { order, slots } = await createOrderWithSlots(
      {
        id,
        order_code: order_code || `BS-${Date.now()}`,
        user_id: user_id || null,
        source_design_id: source_design_id || null,
        source_template_id: source_template_id || null,
        customer_name: customer_name.trim(),
        phone: phone.replace(/\s/g, ""),
        address: address.trim(),
        wrist_circumference: wrist_circumference || 160,
        total_price: total_price || 0,
        payment_status: payment_status || "pending",
        fulfillment_status: fulfillment_status || "pending",
      },
      beadSlotIds
    );

    return NextResponse.json({ success: true, data: { order, slots } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Lỗi khi lưu đơn hàng" }, { status: 500 });
  }
}
