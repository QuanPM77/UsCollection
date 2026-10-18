ALTER TABLE "products"
ADD COLUMN IF NOT EXISTS "cost_price" INTEGER;

ALTER TABLE "order_items"
ADD COLUMN IF NOT EXISTS "unit_cost" INTEGER;

ALTER TABLE "orders"
ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMPTZ(6);

-- Preserve an estimated payment date for historical paid orders; exact payment
-- timestamps were not stored before this migration.
UPDATE "orders"
SET "paid_at" = "created_at"
WHERE "payment_status" = 'paid' AND "paid_at" IS NULL;

CREATE INDEX IF NOT EXISTS "idx_orders_paid_at" ON "orders"("paid_at" DESC);

-- Start a traceable inventory ledger from the live stock values at deployment.
-- This makes the sum of movements reconcile to the stock on hand without
-- rewriting any existing movement history.
INSERT INTO "inventory_movements" ("product_id", "quantity_delta", "reason")
SELECT p."id", p."stock" - COALESCE(SUM(m."quantity_delta"), 0), 'opening_balance'
FROM "products" p
LEFT JOIN "inventory_movements" m ON m."product_id" = p."id"
GROUP BY p."id", p."stock"
HAVING p."stock" - COALESCE(SUM(m."quantity_delta"), 0) <> 0;
