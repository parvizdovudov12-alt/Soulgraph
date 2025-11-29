import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").unique(),
  password: text("password"),
  walletAddress: text("wallet_address").unique(),
  tokenName: text("token_name").default("SOUL"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const registerUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
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

// News events with media attachments
export const newsEvents = pgTable("news_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
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
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
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

// User profiles for social features
export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  displayName: text("display_name"),
  bio: text("bio"),
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

// User relationships (follows)
export const userRelationships = pgTable("user_relationships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  followerId: varchar("follower_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  followedId: varchar("followed_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text("status").notNull().default("accepted"), // 'pending', 'accepted', 'blocked'
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

// Search users schema
export const searchUsersSchema = z.object({
  query: z.string().min(1).max(100),
});

export type SearchUsersQuery = z.infer<typeof searchUsersSchema>;
