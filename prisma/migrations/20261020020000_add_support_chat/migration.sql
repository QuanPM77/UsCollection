CREATE TABLE "support_conversations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "customer_id" UUID,
  "guest_token_hash" VARCHAR(64),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "support_conversations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "support_conversations_identity_check" CHECK (("customer_id" IS NOT NULL) <> ("guest_token_hash" IS NOT NULL)),
  CONSTRAINT "support_conversations_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX "support_conversations_customer_id_key" ON "support_conversations"("customer_id");
CREATE UNIQUE INDEX "support_conversations_guest_token_hash_key" ON "support_conversations"("guest_token_hash");

CREATE TABLE "support_messages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "conversation_id" UUID NOT NULL,
  "sender_id" UUID,
  "sender_role" VARCHAR(16) NOT NULL,
  "body" VARCHAR(2000) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "read_at" TIMESTAMPTZ(6),
  CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "support_messages_sender_role_check" CHECK ("sender_role" IN ('customer', 'admin')),
  CONSTRAINT "support_messages_admin_sender_check" CHECK ("sender_role" <> 'admin' OR "sender_id" IS NOT NULL),
  CONSTRAINT "support_messages_conversation_id_fkey"
    FOREIGN KEY ("conversation_id") REFERENCES "support_conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "support_messages_sender_id_fkey"
    FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE INDEX "idx_support_messages_conversation_created"
  ON "support_messages"("conversation_id", "created_at");
CREATE INDEX "idx_support_messages_unread"
  ON "support_messages"("sender_role", "read_at");

ALTER TABLE "support_conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "support_messages" ENABLE ROW LEVEL SECURITY;
