ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "daily_word_pair" varchar(4);
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "daily_word_date" varchar(10);
