import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";

export const directionEnum = pgEnum("direction", ["lp_to_word", "word_to_lp"]);
export const resultEnum = pgEnum("result", ["instant", "slow", "fail"]);
export const confusionTypeEnum = pgEnum("confusion_type", [
  "none",
  "other_pair",
  "wrong_word",
]);
export const sessionModeEnum = pgEnum("session_mode", [
  "daily_all",
  "hard_only",
  "custom",
]);
export const directionSettingEnum = pgEnum("direction_setting", [
  "lp_to_word",
  "word_to_lp",
  "random",
]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const letterpairs = pgTable("letterpairs", {
  id: serial("id").primaryKey(),
  pair: varchar("pair", { length: 4 }).notNull().unique(),
  word: text("word").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  pair: varchar("pair", { length: 4 }).notNull(),
  direction: directionEnum("direction").notNull(),
  result: resultEnum("result").notNull(),
  durationMs: integer("duration_ms"),
  durationDiscarded: boolean("duration_discarded").default(false).notNull(),
  confusionType: confusionTypeEnum("confusion_type"),
  confusedWithPair: varchar("confused_with_pair", { length: 4 }),
  confusedWithText: text("confused_with_text"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const trainSessions = pgTable("train_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  mode: sessionModeEnum("mode").notNull(),
  directionSetting: directionSettingEnum("direction_setting").notNull(),
});

export const settings = pgTable("settings", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => users.id),
  directionDefault: directionSettingEnum("direction_default")
    .default("lp_to_word")
    .notNull(),
  slowThresholdMs: integer("slow_threshold_ms").default(3000).notNull(),
  dailyWordPair: varchar("daily_word_pair", { length: 4 }),
  dailyWordDate: varchar("daily_word_date", { length: 10 }),
  hardOnlyCount: integer("hard_only_count").default(50).notNull(),
});

export type User = typeof users.$inferSelect;
export type Letterpair = typeof letterpairs.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type TrainSession = typeof trainSessions.$inferSelect;
export type Settings = typeof settings.$inferSelect;
