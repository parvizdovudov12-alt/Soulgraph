import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, timestamp, boolean, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").unique(),
  password: text("password"),
  walletAddress: text("wallet_address").unique(),
  telegramId: text("telegram_id").unique(),
  tokenName: text("token_name").default("SOUL"),
  avatarUrl: text("avatar_url"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorSecret: text("two_factor_secret"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const registerUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  tokenName: z.string().max(20).optional(),
});

export const loginUserSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type RegisterUser = z.infer<typeof registerUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type User = typeof users.$inferSelect;

export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull().default("telegram_stars"),
  plan: text("plan").notNull().default("premium_monthly"),
  status: text("status").notNull().default("active"),
  telegramPaymentChargeId: text("telegram_payment_charge_id"),
  providerPaymentChargeId: text("provider_payment_charge_id"),
  startsAt: timestamp("starts_at").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Subscription = typeof subscriptions.$inferSelect;

export const newsEvents = pgTable("news_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  time: integer("time").notNull(),
  type: text("type").notNull(),
  text: text("text").notNull(),
  impactMental: integer("impact_mental").notNull().default(0),
  impactPhysical: integer("impact_physical").notNull().default(0),
  impactMoral: integer("impact_moral").notNull().default(0),
  impactFinancial: integer("impact_financial").notNull().default(0),
  media: jsonb("media").$type<{ type: "image" | "video"; url: string }[]>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNewsEventSchema = createInsertSchema(newsEvents).omit({
  id: true,
  createdAt: true,
});

export type InsertNewsEvent = z.infer<typeof insertNewsEventSchema>;
export type NewsEvent = typeof newsEvents.$inferSelect;

export const portfolioAssets = pgTable("portfolio_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  quantity: doublePrecision("quantity").notNull(),
  entryPrice: doublePrecision("entry_price").notNull(),
  currentPrice: doublePrecision("current_price").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const portfolioTransactions = pgTable("portfolio_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assetId: varchar("asset_id").references(() => portfolioAssets.id, { onDelete: "set null" }),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(),
  description: text("description"),
  quantity: doublePrecision("quantity").notNull(),
  price: doublePrecision("price").notNull(),
  portfolioValue: doublePrecision("portfolio_value").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const portfolioAssetInputSchema = z.object({
  symbol: z.string().trim().max(32).optional().nullable(),
  name: z.string().trim().max(80).optional().nullable(),
  type: z.enum([
    "crypto",
    "stock",
    "etf",
    "gold",
    "real_estate",
    "cash",
    "card",
    "transport",
    "children",
    "skins",
    "business",
    "work",
  ]),
  quantity: z.number().min(-1_000_000_000).max(1_000_000_000).refine((value) => value !== 0),
  entryPrice: z.number().nonnegative().max(1_000_000_000),
  currentPrice: z.number().nonnegative().max(1_000_000_000),
});

export const portfolioPriceUpdateSchema = z.object({
  currentPrice: z.number().nonnegative().max(1_000_000_000),
});

export type PortfolioAsset = typeof portfolioAssets.$inferSelect;
export type PortfolioTransaction = typeof portfolioTransactions.$inferSelect;
export type PortfolioAssetInput = z.infer<typeof portfolioAssetInputSchema>;
export type PortfolioPriceUpdateInput = z.infer<typeof portfolioPriceUpdateSchema>;

export const dailyTasks = pgTable("daily_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  impact: jsonb("impact").$type<{ mental: number; physical: number; moral: number; financial: number }>().notNull(),
  completedDates: jsonb("completed_dates").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  missedDates: jsonb("missed_dates").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  pinned: boolean("pinned").notNull().default(false),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDailyTaskSchema = createInsertSchema(dailyTasks).omit({
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export type DailyTask = typeof dailyTasks.$inferSelect;
export type InsertDailyTask = z.infer<typeof insertDailyTaskSchema>;

export const stateData = pgTable("state_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
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

export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  displayName: text("display_name"),
  bio: text("bio"),
  goal: text("goal"),
  isPublic: boolean("is_public").default(true),
  allowEventSharing: boolean("allow_event_sharing").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;

export const userRelationships = pgTable("user_relationships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  followerId: varchar("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  followedId: varchar("followed_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("accepted"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserRelationshipSchema = createInsertSchema(userRelationships).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserRelationship = z.infer<typeof insertUserRelationshipSchema>;
export type UserRelationship = typeof userRelationships.$inferSelect;

export const authSessions = pgTable("auth_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAuthSessionSchema = createInsertSchema(authSessions).omit({
  id: true,
  createdAt: true,
});

export type InsertAuthSession = z.infer<typeof insertAuthSessionSchema>;
export type AuthSession = typeof authSessions.$inferSelect;

export const searchUsersSchema = z.object({
  query: z.string().min(1).max(100),
});

export const updateProfileSchema = z.object({
  displayName: z.string().trim().max(80).optional().nullable(),
  bio: z.string().trim().max(500).optional().nullable(),
  goal: z.string().trim().max(500).optional().nullable(),
  isPublic: z.boolean().optional(),
  allowEventSharing: z.boolean().optional(),
});

export type SearchUsersQuery = z.infer<typeof searchUsersSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
