import { NextRequest, NextResponse } from "next/server";
import { PayOS } from "@payos/node";
import { supabase } from "@/lib/supabase";

const payos = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID!,
  apiKey: process.env.PAYOS_API_KEY!,
  checksumKey: process.env.PAYOS_CHECKSUM_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const webhook = await req.json();
    const data = await payos.webhooks.verify(webhook);

    // Tìm đơn hàng theo order_code trong Supabase
    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("order_code", String(data.orderCode))
      .single();

    if (error || !order || order.total_price !== data.amount) {
      return NextResponse.json(
        { message: "Order not found or amount mismatch" },
        { status: 400 }
      );
    }

    if (data.code === "00") {
      // Cập nhật trạng thái thanh toán
      await supabase
        .from("orders")
        .update({ payment_status: "paid" })
        .eq("id", order.id)
        .eq("payment_status", "pending");

      // Ghi nhật ký thanh toán vào payment_logs
      await supabase.from("payment_logs").insert({
        order_id: order.id,
        method: "payos",
        amount: data.amount,
        status: "success",
        transaction_id: String(data.transactionDateTime ?? Date.now()),
        raw_response: JSON.stringify(data),
      });
    }

    return NextResponse.json({ message: "OK" });
  } catch (error) {
    console.error("[PayOS Webhook] Invalid webhook or processing error", error);
    return NextResponse.json({ message: "Invalid webhook" }, { status: 400 });
  }
}
