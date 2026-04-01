/**
 * POST /api/payment/notify
 *
 * MoMo IPN (Instant Payment Notification) webhook.
 * MoMo calls this URL after payment to confirm status.
 *
 * TODO: Verify HMAC signature, update DynamoDB order status.
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[MoMo IPN]", body);

    const { orderId, resultCode, amount, transId } = body;

    // TODO: Verify HMAC signature from MoMo
    // TODO: Update DynamoDB: orders/{orderId}.paymentStatus

    if (resultCode === 0) {
      console.log(`[MoMo IPN] Order ${orderId} paid. transId=${transId}, amount=${amount}`);
      // Mark order as paid in DB
    } else {
      console.log(`[MoMo IPN] Order ${orderId} payment failed. code=${resultCode}`);
    }

    // MoMo requires HTTP 200 to acknowledge receipt
    return NextResponse.json({ message: "OK" }, { status: 200 });
  } catch (err) {
    console.error("[MoMo IPN Error]", err);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}
