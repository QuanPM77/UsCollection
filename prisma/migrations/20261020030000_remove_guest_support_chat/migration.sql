-- Remove unauthenticated guest conversations and their messages.
DELETE FROM "support_conversations"
WHERE "customer_id" IS NULL;

DROP INDEX IF EXISTS "support_conversations_guest_token_hash_key";
ALTER TABLE "support_conversations"
  DROP CONSTRAINT IF EXISTS "support_conversations_identity_check";
ALTER TABLE "support_conversations"
  DROP COLUMN IF EXISTS "guest_token_hash";
ALTER TABLE "support_conversations"
  ALTER COLUMN "customer_id" SET NOT NULL;
