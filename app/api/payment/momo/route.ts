/**
 * POST /api/payment/momo
 *
 * Backend handler that creates a MoMo payment request.
 * Signs the request with HMAC-SHA256 using your MoMo secret key.
 *
 * Environment variables required (set in .env.local):
 *   MOMO_PARTNER_CODE
 *   MOMO_ACCESS_KEY
 *   MOMO_SECRET_KEY
 *   MOMO_API_URL  (sandbox: https://test-payment.momo.vn/v2/gateway/api/create)
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, amount, orderInfo, returnUrl, notifyUrl } = body;

    // ── Env vars ────────────────────────────────────────────────────────────
    const partnerCode = process.env.MOMO_PARTNER_CODE ?? "MOMODEV";
    const accessKey = process.env.MOMO_ACCESS_KEY ?? "F8BBA842ECF85";
    const secretKey =
      process.env.MOMO_SECRET_KEY ?? "K951B6PE1waDMi640xX08PD3vg6EkVlz";
    const apiUrl =
      process.env.MOMO_API_URL ??
      "https://test-payment.momo.vn/v2/gateway/api/create";

    const requestId = `${partnerCode}-${Date.now()}`;
    const requestType = "payWithMethod";
    const extraData = "";
    const lang = "vi";

    // ── HMAC-SHA256 signature ────────────────────────────────────────────────
    const rawSignature = [
      `accessKey=${accessKey}`,
      `amount=${amount}`,
      `extraData=${extraData}`,
      `ipnUrl=${notifyUrl}`,
      `orderId=${orderId}`,
      `orderInfo=${orderInfo}`,
      `partnerCode=${partnerCode}`,
      `redirectUrl=${returnUrl}`,
      `requestId=${requestId}`,
      `requestType=${requestType}`,
    ].join("&");

    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(rawSignature)
      .digest("hex");

    const momoPayload = {
      partnerCode,
      accessKey,
      requestId,
      amount: String(amount),
      orderId,
      orderInfo,
      redirectUrl: returnUrl,
      ipnUrl: notifyUrl,
      extraData,
      requestType,
      signature,
      lang,
    };

    // ── Call MoMo ────────────────────────────────────────────────────────────
    const momoRes = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(momoPayload),
    });

    const momoData = await momoRes.json();

    if (momoData.resultCode !== 0) {
      return NextResponse.json(
        { success: false, message: momoData.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, payUrl: momoData.payUrl });
  } catch (err) {
    console.error("[MoMo API]", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
