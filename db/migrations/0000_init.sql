DO $$ BEGIN
 CREATE TYPE "public"."confusion_type" AS ENUM('none', 'other_pair', 'wrong_word');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."direction" AS ENUM('lp_to_word', 'word_to_lp');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."direction_setting" AS ENUM('lp_to_word', 'word_to_lp', 'random');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."result" AS ENUM('instant', 'slow', 'fail');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."session_mode" AS ENUM('daily_all', 'hard_only', 'custom');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(64) NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "letterpairs" (
	"id" serial PRIMARY KEY NOT NULL,
	"pair" varchar(4) NOT NULL,
	"word" text NOT NULL,
	"description" text,
	"image_url" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "letterpairs_pair_unique" UNIQUE("pair")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"pair" varchar(4) NOT NULL,
	"direction" "direction" NOT NULL,
	"result" "result" NOT NULL,
	"duration_ms" integer,
	"duration_discarded" boolean DEFAULT false NOT NULL,
	"confusion_type" "confusion_type",
	"confused_with_pair" varchar(4),
	"confused_with_text" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "train_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"mode" "session_mode" NOT NULL,
	"direction_setting" "direction_setting" NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "settings" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"direction_default" "direction_setting" DEFAULT 'lp_to_word' NOT NULL,
	"slow_threshold_ms" integer DEFAULT 3000 NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "train_sessions" ADD CONSTRAINT "train_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "settings" ADD CONSTRAINT "settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
