BEGIN;

ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TYPE "user_role" RENAME TO "user_role_old";
CREATE TYPE "user_role" AS ENUM ('customer', 'staff', 'admin');
ALTER TABLE "users"
  ALTER COLUMN "role" TYPE "user_role"
  USING (CASE "role"::text WHEN 'manager' THEN 'staff' ELSE "role"::text END)::"user_role";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'customer'::"user_role";
DROP TYPE "user_role_old";

ALTER TABLE "store_settings" DROP COLUMN IF EXISTS "order_auto_confirm";
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "inventory_review_required" BOOLEAN NOT NULL DEFAULT false;

COMMIT;
