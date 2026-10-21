ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "payment_checkout_url" TEXT;
