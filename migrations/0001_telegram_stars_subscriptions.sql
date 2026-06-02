ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "telegram_id" text;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_telegram_id"
ON "users" ("telegram_id")
WHERE "telegram_id" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" varchar PRIMARY KEY,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "provider" text NOT NULL DEFAULT 'telegram_stars',
  "plan" text NOT NULL DEFAULT 'premium_monthly',
  "status" text NOT NULL DEFAULT 'active',
  "telegram_payment_charge_id" text,
  "provider_payment_charge_id" text,
  "starts_at" timestamp NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_subscriptions_user_id"
ON "subscriptions" ("user_id");

CREATE INDEX IF NOT EXISTS "idx_subscriptions_status_expires_at"
ON "subscriptions" ("status", "expires_at");

CREATE UNIQUE INDEX IF NOT EXISTS "idx_subscriptions_telegram_charge"
ON "subscriptions" ("telegram_payment_charge_id")
WHERE "telegram_payment_charge_id" IS NOT NULL;
