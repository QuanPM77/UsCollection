CREATE TABLE "saved_designs" (
"id" UUID PRIMARY KEY, "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
"name" VARCHAR(80) NOT NULL, "config" JSONB NOT NULL,
"created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "saved_designs_user_id_updated_at_idx" ON "saved_designs"("user_id", "updated_at");
ALTER TABLE "saved_designs" ENABLE ROW LEVEL SECURITY;
