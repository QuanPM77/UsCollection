/**
 * PayOS Payment Strategy
 *
 * Implements the PayOS (VietQR) payment flow.
 * In production: calls your backend /api/payment/create which uses
 * the @payos/node SDK to create a payment link.
 *
 */

import { PaymentPayload, PaymentResult, PaymentStrategy } from "@/types";

export class PayOSStrategy implements PaymentStrategy {
  name = "PayOS";

  async pay(payload: PaymentPayload): Promise<PaymentResult> {
    try {
      const res = await fetch("/api/payment/create", {
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

