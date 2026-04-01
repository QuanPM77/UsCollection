/**
 * MoMo Payment Strategy
 *
 * Implements the MoMo QR/Deep-link payment flow.
 * In production: calls your backend /api/payment/momo which signs the
 * HMAC-SHA256 request and calls MoMo's API.
 *
 * In dev/mock mode: returns a simulated payUrl.
 */

import { PaymentPayload, PaymentResult, PaymentStrategy } from "@/types";

export class MoMoStrategy implements PaymentStrategy {
  name = "MoMo";

  async pay(payload: PaymentPayload): Promise<PaymentResult> {
    try {
      // In production, call your own backend endpoint which handles HMAC signing
      const res = await fetch("/api/payment/momo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return {
          success: false,
          message: err.message ?? `HTTP ${res.status}`,
        };
      }

      const data = await res.json();
      return {
        success: true,
        payUrl: data.payUrl,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Network error",
      };
    }
  }
}

// ─── Mock for development ─────────────────────────────────────────────────────

export class MoMoMockStrategy implements PaymentStrategy {
  name = "MoMo (Mock)";

  async pay(payload: PaymentPayload): Promise<PaymentResult> {
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 1200));

    console.log("[MoMo Mock] Payment payload:", payload);

    return {
      success: true,
      payUrl: `https://test-payment.momo.vn/v2/gateway/pay?orderId=${payload.orderId}&amount=${payload.amount}`,
      message: "Mock payment URL generated",
    };
  }
}
