import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull().unique(),
  tokenName: text("token_name").default("SOUL"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  walletAddress: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// News events with media attachments
export const newsEvents = pgTable("news_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  time: integer("time").notNull(),
  type: text("type").notNull(), // 'positive' or 'negative'
  text: text("text").notNull(),
  impactMental: integer("impact_mental").notNull().default(0),
  impactPhysical: integer("impact_physical").notNull().default(0),
  impactMoral: integer("impact_moral").notNull().default(0),
  impactFinancial: integer("impact_financial").notNull().default(0),
  media: jsonb("media").$type<{ type: 'image' | 'video'; url: string }[]>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNewsEventSchema = createInsertSchema(newsEvents).omit({
  id: true,
  createdAt: true,
});

export type InsertNewsEvent = z.infer<typeof insertNewsEventSchema>;
export type NewsEvent = typeof newsEvents.$inferSelect;

// State data points
export const stateData = pgTable("state_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  time: integer("time").notNull(),
  mental: integer("mental").notNull(),
  physical: integer("physical").notNull(),
  moral: integer("moral").notNull(),
  financial: integer("financial").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertStateDataSchema = createInsertSchema(stateData).omit({
  id: true,
  createdAt: true,
});

export type InsertStateData = z.infer<typeof insertStateDataSchema>;
export type StateData = typeof stateData.$inferSelect;
