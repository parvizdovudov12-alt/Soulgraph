CREATE TABLE IF NOT EXISTS "daily_tasks" (
  "id" varchar PRIMARY KEY,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "text" text NOT NULL,
  "impact" jsonb NOT NULL,
  "completed_dates" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "pinned" boolean NOT NULL DEFAULT false,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_daily_tasks_user_id"
ON "daily_tasks" ("user_id");

CREATE INDEX IF NOT EXISTS "idx_daily_tasks_user_pinned"
ON "daily_tasks" ("user_id", "pinned", "created_at");
