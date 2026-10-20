CREATE TABLE "store_social_links" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(100) NOT NULL,
  "url" VARCHAR(2048) NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "store_social_links_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_store_social_links_sort_order"
  ON "store_social_links"("sort_order", "created_at");

ALTER TABLE "store_social_links" ENABLE ROW LEVEL SECURITY;
