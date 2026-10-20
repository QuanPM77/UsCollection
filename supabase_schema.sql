-- UsStory database for the current Next.js + Prisma application.
-- Run this script only in a NEW/EMPTY Supabase project (public schema).
-- It intentionally does not DROP existing tables or insert demo accounts.
-- Generated from prisma/schema.prisma, then extended with application constraints,
-- starter 3D bead catalog, singleton settings, RLS, and the Storage bucket.

BEGIN;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE SCHEMA IF NOT EXISTS "public";
SET search_path TO "public";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('customer', 'manager', 'admin');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('active', 'locked');

-- CreateEnum
CREATE TYPE "bead_material" AS ENUM ('glass', 'crystal', 'wood', 'stone', 'pearl');

-- CreateEnum
CREATE TYPE "fulfillment_status" AS ENUM ('pending', 'processing', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('new', 'confirmed', 'processing', 'shipping', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "payment_log_status" AS ENUM ('initiated', 'success', 'failed');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('payos', 'bank_transfer', 'cod');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('pending', 'paid', 'failed');

-- CreateEnum
CREATE TYPE "product_status" AS ENUM ('active', 'inactive', 'draft');

-- CreateEnum
CREATE TYPE "product_type" AS ENUM ('bead', 'bracelet');

-- CreateEnum
CREATE TYPE "template_status" AS ENUM ('draft', 'published');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT,
    "google_id" TEXT,
    "password_hash" TEXT,
    "email_verified_at" TIMESTAMPTZ(6),
    "full_name" TEXT,
    "phone" TEXT,
    "profile_completed_at" TIMESTAMPTZ(6),
    "avatar_url" TEXT,
    "role" "user_role" NOT NULL DEFAULT 'customer',
    "status" "user_status" NOT NULL DEFAULT 'active',
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_addresses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "recipient_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address_line" TEXT NOT NULL,
    "province" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verification_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "email" TEXT,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limits" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "reset_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_code" BIGINT NOT NULL,
    "user_id" UUID,
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT NOT NULL,
    "customer_address" TEXT NOT NULL,
    "bracelet_config" JSONB NOT NULL,
    "total_price" INTEGER NOT NULL,
    "paid_at" TIMESTAMPTZ(6),
    "payment_status" TEXT NOT NULL DEFAULT 'pending',
    "order_status" "order_status" NOT NULL DEFAULT 'new',
    "payment_method" "payment_method" NOT NULL DEFAULT 'payos',
    "payment_link_id" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bead_product_details" (
    "product_id" UUID NOT NULL,
    "material" "bead_material" NOT NULL,
    "color" TEXT NOT NULL,
    "emissive_color" TEXT,
    "diameter" INTEGER NOT NULL DEFAULT 8,
    "metalness" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "roughness" DOUBLE PRECISION NOT NULL DEFAULT 0.5,

    CONSTRAINT "bead_product_details_pkey" PRIMARY KEY ("product_id")
);

-- CreateTable
CREATE TABLE "bracelet_product_beads" (
    "bracelet_product_id" UUID NOT NULL,
    "bead_product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "bracelet_product_beads_pkey" PRIMARY KEY ("bracelet_product_id","bead_product_id")
);

-- CreateTable
CREATE TABLE "bracelet_product_details" (
    "product_id" UUID NOT NULL,
    "wrist_circumference" INTEGER NOT NULL,
    "image_url" TEXT,

    CONSTRAINT "bracelet_product_details_pkey" PRIMARY KEY ("product_id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "changed_by" UUID,
    "quantity_delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "order_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "product_id" UUID,
    "product_name" TEXT NOT NULL,
    "sku" TEXT,
    "product_type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "unit_cost" INTEGER,
    "line_total" INTEGER NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sku" TEXT NOT NULL,
    "type" "product_type" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "cost_price" INTEGER,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "status" "product_status" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "details" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "styles" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_settings" (
    "id" SMALLINT NOT NULL DEFAULT 1,
    "store_name" TEXT NOT NULL DEFAULT 'UsStory',
    "store_description" TEXT NOT NULL DEFAULT '',
    "contact_phone" TEXT NOT NULL DEFAULT '',
    "contact_email" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "low_stock_threshold" INTEGER NOT NULL DEFAULT 5,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "order_auto_confirm" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "idx_user_addresses_user_id" ON "user_addresses"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "idx_password_reset_user_id" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_tokens_token_hash_key" ON "email_verification_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "idx_email_verification_user_id" ON "email_verification_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_code_key" ON "orders"("order_code");

-- CreateIndex
CREATE INDEX "idx_orders_created_at" ON "orders"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_orders_paid_at" ON "orders"("paid_at" DESC);

-- CreateIndex
CREATE INDEX "idx_orders_order_status" ON "orders"("order_status");

-- CreateIndex
CREATE INDEX "idx_orders_payment_status" ON "orders"("payment_status");

-- CreateIndex
CREATE INDEX "idx_orders_user_id" ON "orders"("user_id");

-- CreateIndex
CREATE INDEX "idx_inventory_created_at" ON "inventory_movements"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_inventory_product_id" ON "inventory_movements"("product_id");

-- CreateIndex
CREATE INDEX "idx_order_items_order_id" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "idx_order_items_product_id" ON "order_items"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "idx_products_name" ON "products"("name");

-- CreateIndex
CREATE INDEX "idx_products_status" ON "products"("status");

-- CreateIndex
CREATE INDEX "idx_products_type" ON "products"("type");

-- CreateIndex
CREATE INDEX "idx_product_reviews_product_created" ON "product_reviews"("product_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "product_reviews_product_id_user_id_key" ON "product_reviews"("product_id", "user_id");

-- AddForeignKey
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bead_product_details" ADD CONSTRAINT "bead_product_details_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bracelet_product_beads" ADD CONSTRAINT "bracelet_product_beads_bead_product_id_fkey" FOREIGN KEY ("bead_product_id") REFERENCES "bead_product_details"("product_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bracelet_product_beads" ADD CONSTRAINT "bracelet_product_beads_bracelet_product_id_fkey" FOREIGN KEY ("bracelet_product_id") REFERENCES "bracelet_product_details"("product_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bracelet_product_details" ADD CONSTRAINT "bracelet_product_details_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Application-level invariants enforced by the database as well.
ALTER TABLE "products"
  ADD CONSTRAINT "products_price_nonnegative_check" CHECK ("price" >= 0),
  ADD CONSTRAINT "products_cost_nonnegative_check" CHECK ("cost_price" IS NULL OR "cost_price" >= 0),
  ADD CONSTRAINT "products_stock_nonnegative_check" CHECK ("stock" >= 0);

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_total_price_nonnegative_check" CHECK ("total_price" >= 0),
  ADD CONSTRAINT "orders_payment_status_check" CHECK ("payment_status" IN ('pending', 'paid', 'failed'));

ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_product_type_check" CHECK ("product_type" IN ('bead', 'bracelet')),
  ADD CONSTRAINT "order_items_quantity_positive_check" CHECK ("quantity" > 0),
  ADD CONSTRAINT "order_items_unit_price_nonnegative_check" CHECK ("unit_price" >= 0),
  ADD CONSTRAINT "order_items_unit_cost_nonnegative_check" CHECK ("unit_cost" IS NULL OR "unit_cost" >= 0),
  ADD CONSTRAINT "order_items_line_total_nonnegative_check" CHECK ("line_total" >= 0);

ALTER TABLE "bead_product_details"
  ADD CONSTRAINT "bead_product_details_diameter_check" CHECK ("diameter" BETWEEN 2 AND 30),
  ADD CONSTRAINT "bead_product_details_metalness_check" CHECK ("metalness" BETWEEN 0 AND 1),
  ADD CONSTRAINT "bead_product_details_roughness_check" CHECK ("roughness" BETWEEN 0 AND 1);

ALTER TABLE "bracelet_product_beads"
  ADD CONSTRAINT "bracelet_product_beads_quantity_positive_check" CHECK ("quantity" > 0);

ALTER TABLE "product_reviews"
  ADD CONSTRAINT "product_reviews_rating_check" CHECK ("rating" BETWEEN 1 AND 5);

ALTER TABLE "store_settings"
  ADD CONSTRAINT "store_settings_singleton_id_check" CHECK ("id" = 1),
  ADD CONSTRAINT "store_settings_low_stock_threshold_check" CHECK ("low_stock_threshold" >= 1);

-- Keep updated_at accurate for writes made through SQL as well as Prisma.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "users_set_updated_at" BEFORE UPDATE ON "users"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "products_set_updated_at" BEFORE UPDATE ON "products"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "orders_set_updated_at" BEFORE UPDATE ON "orders"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "product_reviews_set_updated_at" BEFORE UPDATE ON "product_reviews"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "store_settings_set_updated_at" BEFORE UPDATE ON "store_settings"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- The application accesses database tables through its authenticated server/Prisma
-- connection. No public/anon table policies are created, so the Supabase Data API
-- cannot read or write customer/order data directly.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_addresses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "password_reset_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_verification_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rate_limits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bead_product_details" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bracelet_product_beads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bracelet_product_details" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_movements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "store_settings" ENABLE ROW LEVEL SECURITY;

-- Public read-only product images/avatars; uploads and deletes use the server-only
-- SUPABASE_SERVICE_ROLE_KEY. Do not expose that key to the browser.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', TRUE, 153600, ARRAY['image/webp']::text[])
ON CONFLICT (id) DO NOTHING;

-- The site needs one settings row; admin API also upserts it if it is missing.
INSERT INTO "store_settings" ("id") VALUES (1) ON CONFLICT ("id") DO NOTHING;

-- Starter bead catalog used by the 3D designer. Stock starts at zero and costs are
-- intentionally NULL because real opening stock/costs must be entered by the shop.
-- Checkout blocks items without a recorded cost, which protects profit reporting.
WITH seed("sku", "name", "description", "price", "material", "color", "emissive", "metalness", "roughness", "diameter") AS (
  VALUES
    ('rose-quartz', 'Rose Quartz', 'Pha lê hồng nhạt, biểu tượng của tình yêu', 15000, 'crystal', '#F4A7B9', '#FF8FAB', 0.1, 0.3, 8),
    ('amethyst', 'Amethyst', 'Tím amethyst, mang lại bình yên', 18000, 'crystal', '#9B59B6', '#7D3C98', 0.1, 0.25, 8),
    ('pearl-white', 'White Pearl', 'Ngọc trai trắng thuần khiết', 22000, 'pearl', '#F8F0E3', NULL, 0.3, 0.1, 6),
    ('moonstone', 'Moonstone', 'Đá mặt trăng huyền bí', 20000, 'stone', '#E8E8F0', '#C5C5E0', 0.15, 0.2, 8),
    ('turquoise', 'Turquoise', 'Ngọc lam xanh biển rực rỡ', 16000, 'stone', '#40E0D0', NULL, 0.05, 0.5, 8),
    ('gold-bead', 'Gold Accent', 'Hạt vàng sang trọng', 30000, 'crystal', '#FFD700', '#B8860B', 0.9, 0.05, 4),
    ('obsidian', 'Black Obsidian', 'Đá hắc diệu, bảo vệ năng lượng', 14000, 'stone', '#2C2C2C', NULL, 0.4, 0.15, 10),
    ('sandalwood', 'Sandalwood', 'Gỗ đàn hương thơm nhẹ', 10000, 'wood', '#C19A6B', NULL, 0.0, 0.8, 8),
    ('cherry-glass', 'Cherry Glass', 'Hạt thủy tinh đỏ anh đào', 12000, 'glass', '#DC143C', '#8B0000', 0.05, 0.05, 6),
    ('lavender-jade', 'Lavender Jade', 'Ngọc bích oải hương thanh lịch', 25000, 'stone', '#B57EDC', NULL, 0.1, 0.35, 8)
)
INSERT INTO "products" ("id", "sku", "type", "name", "description", "price", "cost_price", "stock", "status")
SELECT gen_random_uuid(), seed."sku", 'bead'::"product_type", seed."name", seed."description", seed."price", NULL, 0, 'active'::"product_status"
FROM seed
ON CONFLICT ("sku") DO NOTHING;

WITH seed("sku", "material", "color", "emissive", "metalness", "roughness", "diameter") AS (
  VALUES
    ('rose-quartz', 'crystal', '#F4A7B9', '#FF8FAB', 0.1, 0.3, 8),
    ('amethyst', 'crystal', '#9B59B6', '#7D3C98', 0.1, 0.25, 8),
    ('pearl-white', 'pearl', '#F8F0E3', NULL, 0.3, 0.1, 6),
    ('moonstone', 'stone', '#E8E8F0', '#C5C5E0', 0.15, 0.2, 8),
    ('turquoise', 'stone', '#40E0D0', NULL, 0.05, 0.5, 8),
    ('gold-bead', 'crystal', '#FFD700', '#B8860B', 0.9, 0.05, 4),
    ('obsidian', 'stone', '#2C2C2C', NULL, 0.4, 0.15, 10),
    ('sandalwood', 'wood', '#C19A6B', NULL, 0.0, 0.8, 8),
    ('cherry-glass', 'glass', '#DC143C', '#8B0000', 0.05, 0.05, 6),
    ('lavender-jade', 'stone', '#B57EDC', NULL, 0.1, 0.35, 8)
)
INSERT INTO "bead_product_details" ("product_id", "material", "color", "emissive_color", "metalness", "roughness", "diameter")
SELECT p."id", seed."material"::"bead_material", seed."color", seed."emissive", seed."metalness", seed."roughness", seed."diameter"
FROM seed
JOIN "products" p ON p."sku" = seed."sku" AND p."type" = 'bead'::"product_type"
ON CONFLICT ("product_id") DO NOTHING;

COMMIT;
