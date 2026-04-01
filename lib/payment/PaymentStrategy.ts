/**
 * Payment Strategy Pattern
 *
 * Strategy interface + context class.
 * Add new payment methods (VNPay, ZaloPay) by implementing PaymentStrategy.
 */

import { PaymentPayload, PaymentResult, PaymentStrategy } from "@/types";

// ─── Strategy Context ─────────────────────────────────────────────────────────

export class PaymentContext {
  private strategy: PaymentStrategy;

  constructor(strategy: PaymentStrategy) {
    this.strategy = strategy;
  }

  setStrategy(strategy: PaymentStrategy) {
    this.strategy = strategy;
  }

  async execute(payload: PaymentPayload): Promise<PaymentResult> {
    return this.strategy.pay(payload);
  }

  get name() {
    return this.strategy.name;
  }
}
