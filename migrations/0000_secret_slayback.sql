CREATE TABLE "news_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"time" integer NOT NULL,
	"type" text NOT NULL,
	"text" text NOT NULL,
	"impact_mental" integer DEFAULT 0 NOT NULL,
	"impact_physical" integer DEFAULT 0 NOT NULL,
	"impact_moral" integer DEFAULT 0 NOT NULL,
	"impact_financial" integer DEFAULT 0 NOT NULL,
	"media" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "state_data" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"time" integer NOT NULL,
	"mental" integer NOT NULL,
	"physical" integer NOT NULL,
	"moral" integer NOT NULL,
	"financial" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" text NOT NULL,
	"token_name" text DEFAULT 'SOUL',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_wallet_address_unique" UNIQUE("wallet_address")
);
