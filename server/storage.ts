import {
  type AuthSession,
  type DailyTask as DBDailyTask,
  type InsertNewsEvent,
  type InsertDailyTask,
  type InsertStateData,
  type InsertUser,
  type InsertUserProfile,
  type NewsEvent as DBNewsEvent,
  type PortfolioAsset,
  type PortfolioAssetInput,
  type PortfolioTransaction,
  type StateData as DBStateData,
  type Subscription,
  type User,
  type UserProfile,
  type UserRelationship,
} from "@shared/schema";
import { randomUUID } from "crypto";
import pg from "pg";

const { Client } = pg;

type DbClient = InstanceType<typeof Client>;

const dbConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    }
  : null;

function mapUser(row: any): User {
  return {
    id: row.id,
    email: row.email ?? null,
    password: row.password ?? null,
    walletAddress: row.wallet_address ?? null,
    telegramId: row.telegram_id ?? null,
    tokenName: row.token_name ?? null,
    avatarUrl: row.avatar_url ?? null,
    twoFactorEnabled: row.two_factor_enabled ?? false,
    twoFactorSecret: row.two_factor_secret ?? null,
    createdAt: row.created_at ? new Date(row.created_at) : null,
  };
}

function mapSubscription(row: any): Subscription {
  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    plan: row.plan,
    status: row.status,
    telegramPaymentChargeId: row.telegram_payment_charge_id ?? null,
    providerPaymentChargeId: row.provider_payment_charge_id ?? null,
    startsAt: new Date(row.starts_at),
    expiresAt: new Date(row.expires_at),
    createdAt: row.created_at ? new Date(row.created_at) : null,
    updatedAt: row.updated_at ? new Date(row.updated_at) : null,
  };
}

function mapNewsEvent(row: any): DBNewsEvent {
  return {
    id: row.id,
    userId: row.user_id,
    time: row.time,
    type: row.type,
    text: row.text,
    impactMental: row.impact_mental,
    impactPhysical: row.impact_physical,
    impactMoral: row.impact_moral,
    impactFinancial: row.impact_financial,
    media: row.media ?? null,
    createdAt: row.created_at ? new Date(row.created_at) : null,
  };
}

function mapPortfolioAsset(row: any): PortfolioAsset {
  return {
    id: row.id,
    userId: row.user_id,
    symbol: row.symbol,
    name: row.name,
    type: row.type,
    quantity: Number(row.quantity),
    entryPrice: Number(row.entry_price),
    currentPrice: Number(row.current_price),
    createdAt: row.created_at ? new Date(row.created_at) : null,
    updatedAt: row.updated_at ? new Date(row.updated_at) : null,
  };
}

function mapPortfolioTransaction(row: any): PortfolioTransaction {
  return {
    id: row.id,
    userId: row.user_id,
    assetId: row.asset_id ?? null,
    symbol: row.symbol,
    side: row.side,
    quantity: Number(row.quantity),
    price: Number(row.price),
    portfolioValue: Number(row.portfolio_value),
    createdAt: row.created_at ? new Date(row.created_at) : null,
  };
}

function normalizeTaskImpactValue(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(-1000, Math.min(1000, Math.round(numeric)));
}

function normalizeMoneyValue(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(1_000_000_000, numeric));
}

function normalizePortfolioQuantity(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(-1_000_000_000, Math.min(1_000_000_000, numeric));
}

function normalizePortfolioSymbol(input: PortfolioAssetInput) {
  const rawSymbol = input.symbol?.trim() || input.name?.trim() || input.type;
  return rawSymbol.toUpperCase().replace(/[^A-ZА-ЯЁ0-9 _.-]/gi, "").slice(0, 32) || input.type.toUpperCase();
}

function normalizeTaskImpact(impact: any) {
  return {
    mental: normalizeTaskImpactValue(impact?.mental),
    physical: normalizeTaskImpactValue(impact?.physical),
    moral: normalizeTaskImpactValue(impact?.moral),
    financial: normalizeTaskImpactValue(impact?.financial),
  };
}

function mapDailyTask(row: any): DBDailyTask {
  return {
    id: row.id,
    userId: row.user_id,
    text: row.text,
    impact: normalizeTaskImpact(row.impact),
    completedDates: Array.isArray(row.completed_dates) ? row.completed_dates.filter((date: unknown) => typeof date === "string") : [],
    pinned: row.pinned === true,
    orderIndex: Number.isFinite(Number(row.order_index)) ? Number(row.order_index) : 0,
    createdAt: row.created_at ? new Date(row.created_at) : null,
    updatedAt: row.updated_at ? new Date(row.updated_at) : null,
  };
}

function mapStateData(row: any): DBStateData {
  return {
    id: row.id,
    userId: row.user_id,
    time: row.time,
    mental: row.mental,
    physical: row.physical,
    moral: row.moral,
    financial: row.financial,
    createdAt: row.created_at ? new Date(row.created_at) : null,
  };
}

function mapUserProfile(row: any): UserProfile {
  return {
    id: row.id,
    userId: row.user_id,
    displayName: row.display_name ?? null,
    bio: row.bio ?? null,
    goal: row.goal ?? null,
    isPublic: row.is_public ?? null,
    allowEventSharing: row.allow_event_sharing ?? null,
    createdAt: row.created_at ? new Date(row.created_at) : null,
    updatedAt: row.updated_at ? new Date(row.updated_at) : null,
  };
}

function mapUserRelationship(row: any): UserRelationship {
  return {
    id: row.id,
    followerId: row.follower_id,
    followedId: row.followed_id,
    status: row.status,
    createdAt: row.created_at ? new Date(row.created_at) : null,
    updatedAt: row.updated_at ? new Date(row.updated_at) : null,
  };
}

function mapAuthSession(row: any): AuthSession {
  return {
    id: row.id,
    userId: row.user_id,
    token: row.token,
    expiresAt: new Date(row.expires_at),
    createdAt: row.created_at ? new Date(row.created_at) : null,
  };
}

async function withClient<T>(callback: (client: DbClient) => Promise<T>): Promise<T> {
  if (!dbConfig) {
    throw new Error("DATABASE_URL environment variable is not defined. Please configure your database connection.");
  }

  const client = new Client(dbConfig);
  client.on("error", (error) => {
    console.error("PostgreSQL client error:", error.message);
  });

  await client.connect();

  try {
    return await callback(client);
  } finally {
    try {
      await client.end();
    } catch (error) {
      console.error("PostgreSQL client shutdown error:", error instanceof Error ? error.message : error);
    }
  }
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByWalletAddress(walletAddress: string): Promise<User | undefined>;
  getUserByTelegramId(telegramId: string): Promise<User | undefined>;
  getUserBySessionToken(token: string): Promise<User | undefined>;
  createAuthSession(userId: string, expiresAt: Date): Promise<AuthSession>;
  deleteAuthSession(token: string): Promise<void>;
  createUser(user: InsertUser): Promise<User>;
  updateUserTokenName(userId: string, tokenName: string): Promise<User | undefined>;
  updateUserAvatar(userId: string, avatarUrl: string): Promise<User | undefined>;
  updateUserTelegramId(userId: string, telegramId: string): Promise<User | undefined>;
  updateUserTwoFactor(userId: string, updates: { enabled: boolean; secret: string | null }): Promise<User | undefined>;
  getActiveSubscription(userId: string): Promise<Subscription | undefined>;
  activateTelegramStarsSubscription(input: {
    userId: string;
    telegramPaymentChargeId: string;
    providerPaymentChargeId?: string | null;
  }): Promise<Subscription>;
  getUserNewsEvents(userId: string): Promise<DBNewsEvent[]>;
  createNewsEvent(userId: string, event: Omit<InsertNewsEvent, "userId">): Promise<DBNewsEvent>;
  deleteNewsEvent(userId: string, eventId: string): Promise<void>;
  deleteAllUserNewsEvents(userId: string): Promise<void>;
  getUserPortfolio(userId: string): Promise<{ assets: PortfolioAsset[]; transactions: PortfolioTransaction[] }>;
  createPortfolioAsset(userId: string, asset: PortfolioAssetInput): Promise<{ assets: PortfolioAsset[]; transaction: PortfolioTransaction }>;
  createPortfolioMovement(userId: string, direction: "profit" | "loss", amount: number): Promise<{ assets: PortfolioAsset[]; transaction: PortfolioTransaction }>;
  updatePortfolioAssetPrice(userId: string, assetId: string, currentPrice: number): Promise<{ assets: PortfolioAsset[]; transaction: PortfolioTransaction } | undefined>;
  deletePortfolioAsset(userId: string, assetId: string): Promise<void>;
  getUserDailyTasks(userId: string): Promise<DBDailyTask[]>;
  createDailyTask(userId: string, task: InsertDailyTask): Promise<DBDailyTask>;
  completeDailyTask(userId: string, taskId: string, dayKey: string): Promise<DBDailyTask | undefined>;
  updateDailyTaskPinned(userId: string, taskId: string, pinned: boolean): Promise<DBDailyTask | undefined>;
  reorderDailyTasks(userId: string, taskIds: string[]): Promise<DBDailyTask[]>;
  deleteDailyTask(userId: string, taskId: string): Promise<void>;
  getUserStateData(userId: string): Promise<DBStateData[]>;
  createStateData(userId: string, data: Omit<InsertStateData, "userId">): Promise<DBStateData>;
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(userId: string, updates: Partial<InsertUserProfile>): Promise<UserProfile | undefined>;
  searchUsers(query: string, currentUserId: string): Promise<(User & { profile?: UserProfile; isFollowing?: boolean })[]>;
  followUser(followerId: string, followedId: string): Promise<UserRelationship>;
  unfollowUser(followerId: string, followedId: string): Promise<void>;
  getFollowing(userId: string): Promise<(User & { profile?: UserProfile })[]>;
  getFollowers(userId: string): Promise<(User & { profile?: UserProfile })[]>;
  isFollowing(followerId: string, followedId: string): Promise<boolean>;
  getPublicUserData(userId: string, viewerId: string): Promise<{
    user: User;
    profile?: UserProfile;
    stateData: DBStateData[];
    events?: DBNewsEvent[];
    isFollowing: boolean;
  } | null>;
}

export class MemStorage implements IStorage {
  private users = new Map<string, User>();
  private newsEvents = new Map<string, DBNewsEvent>();
  private portfolioAssets = new Map<string, PortfolioAsset>();
  private portfolioTransactions = new Map<string, PortfolioTransaction>();
  private stateData = new Map<string, DBStateData>();
  private dailyTasks = new Map<string, DBDailyTask>();
  private userProfilesMap = new Map<string, UserProfile>();
  private relationships = new Map<string, UserRelationship>();
  private authSessions = new Map<string, AuthSession>();
  private subscriptions = new Map<string, Subscription>();

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.email === email);
  }

  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.walletAddress === walletAddress);
  }

  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.telegramId === telegramId);
  }

  async getUserBySessionToken(token: string): Promise<User | undefined> {
    const session = this.authSessions.get(token);
    if (!session || session.expiresAt.getTime() <= Date.now()) {
      if (session) {
        this.authSessions.delete(token);
      }
      return undefined;
    }

    return this.users.get(session.userId);
  }

  async createAuthSession(userId: string, expiresAt: Date): Promise<AuthSession> {
    const session: AuthSession = {
      id: randomUUID(),
      userId,
      token: randomUUID(),
      expiresAt,
      createdAt: new Date(),
    };
    this.authSessions.set(session.token, session);
    return session;
  }

  async deleteAuthSession(token: string): Promise<void> {
    this.authSessions.delete(token);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      id: randomUUID(),
      email: insertUser.email ?? null,
      password: insertUser.password ?? null,
      walletAddress: insertUser.walletAddress ?? null,
      telegramId: insertUser.telegramId ?? null,
      tokenName: insertUser.tokenName ?? "SOUL",
      avatarUrl: insertUser.avatarUrl ?? null,
      twoFactorEnabled: insertUser.twoFactorEnabled ?? false,
      twoFactorSecret: insertUser.twoFactorSecret ?? null,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateUserTokenName(userId: string, tokenName: string): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    const updatedUser: User = { ...user, tokenName };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async updateUserAvatar(userId: string, avatarUrl: string): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    const updatedUser: User = { ...user, avatarUrl };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async updateUserTelegramId(userId: string, telegramId: string): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    const updatedUser: User = { ...user, telegramId };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async getActiveSubscription(userId: string): Promise<Subscription | undefined> {
    const now = Date.now();
    return Array.from(this.subscriptions.values())
      .filter((subscription) => subscription.userId === userId && subscription.status === "active" && subscription.expiresAt.getTime() > now)
      .sort((a, b) => b.expiresAt.getTime() - a.expiresAt.getTime())[0];
  }

  async activateTelegramStarsSubscription(input: {
    userId: string;
    telegramPaymentChargeId: string;
    providerPaymentChargeId?: string | null;
  }): Promise<Subscription> {
    const now = new Date();
    const active = await this.getActiveSubscription(input.userId);
    const startsAt = active && active.expiresAt.getTime() > now.getTime() ? active.expiresAt : now;
    const expiresAt = new Date(startsAt.getTime() + 30 * 24 * 60 * 60 * 1000);
    const existing = Array.from(this.subscriptions.values()).find(
      (subscription) => subscription.userId === input.userId && subscription.provider === "telegram_stars" && subscription.plan === "premium_monthly",
    );

    const subscription: Subscription = {
      id: existing?.id ?? randomUUID(),
      userId: input.userId,
      provider: "telegram_stars",
      plan: "premium_monthly",
      status: "active",
      telegramPaymentChargeId: input.telegramPaymentChargeId,
      providerPaymentChargeId: input.providerPaymentChargeId ?? null,
      startsAt: existing?.startsAt ?? now,
      expiresAt,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.subscriptions.set(subscription.id, subscription);
    return subscription;
  }

  async updateUserTwoFactor(userId: string, updates: { enabled: boolean; secret: string | null }): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    const updatedUser: User = {
      ...user,
      twoFactorEnabled: updates.enabled,
      twoFactorSecret: updates.secret,
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async getUserNewsEvents(userId: string): Promise<DBNewsEvent[]> {
    return Array.from(this.newsEvents.values()).filter((event) => event.userId === userId).sort((a, b) => a.time - b.time);
  }

  async createNewsEvent(userId: string, insertEvent: Omit<InsertNewsEvent, "userId">): Promise<DBNewsEvent> {
    const event: DBNewsEvent = {
      id: randomUUID(),
      userId,
      type: insertEvent.type,
      time: insertEvent.time,
      text: insertEvent.text,
      impactMental: insertEvent.impactMental ?? 0,
      impactPhysical: insertEvent.impactPhysical ?? 0,
      impactMoral: insertEvent.impactMoral ?? 0,
      impactFinancial: insertEvent.impactFinancial ?? 0,
      media: (insertEvent.media as { type: "image" | "video"; url: string }[] | null) ?? null,
      createdAt: new Date(),
    };
    this.newsEvents.set(event.id, event);
    return event;
  }

  async deleteNewsEvent(userId: string, eventId: string): Promise<void> {
    const event = this.newsEvents.get(eventId);
    if (event && event.userId === userId) {
      this.newsEvents.delete(eventId);
    }
  }

  async deleteAllUserNewsEvents(userId: string): Promise<void> {
    for (const [id, event] of Array.from(this.newsEvents.entries())) {
      if (event.userId === userId) {
        this.newsEvents.delete(id);
      }
    }
  }

  async getUserPortfolio(userId: string): Promise<{ assets: PortfolioAsset[]; transactions: PortfolioTransaction[] }> {
    return {
      assets: Array.from(this.portfolioAssets.values())
        .filter((asset) => asset.userId === userId)
        .sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0)),
      transactions: Array.from(this.portfolioTransactions.values())
        .filter((transaction) => transaction.userId === userId)
        .sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0)),
    };
  }

  private getPortfolioValue(userId: string) {
    return Array.from(this.portfolioAssets.values())
      .filter((asset) => asset.userId === userId)
      .reduce((sum, asset) => sum + asset.quantity * asset.currentPrice, 0);
  }

  async createPortfolioAsset(userId: string, input: PortfolioAssetInput): Promise<{ assets: PortfolioAsset[]; transaction: PortfolioTransaction }> {
    const now = new Date();
    const symbol = normalizePortfolioSymbol(input);
    const asset: PortfolioAsset = {
      id: randomUUID(),
      userId,
      symbol,
      name: input.name?.trim() || symbol,
      type: input.type,
      quantity: normalizePortfolioQuantity(input.quantity),
      entryPrice: normalizeMoneyValue(input.entryPrice),
      currentPrice: normalizeMoneyValue(input.currentPrice),
      createdAt: now,
      updatedAt: now,
    };
    this.portfolioAssets.set(asset.id, asset);

    const transaction: PortfolioTransaction = {
      id: randomUUID(),
      userId,
      assetId: asset.id,
      symbol: asset.symbol,
      side: asset.quantity < 0 ? "loss" : "profit",
      quantity: asset.quantity,
      price: asset.entryPrice,
      portfolioValue: this.getPortfolioValue(userId),
      createdAt: now,
    };
    this.portfolioTransactions.set(transaction.id, transaction);
    return { ...(await this.getUserPortfolio(userId)), transaction };
  }

  async createPortfolioMovement(userId: string, direction: "profit" | "loss", amount: number): Promise<{ assets: PortfolioAsset[]; transaction: PortfolioTransaction }> {
    const now = new Date();
    const normalizedAmount = normalizeMoneyValue(amount);
    const transactions = Array.from(this.portfolioTransactions.values())
      .filter((transaction) => transaction.userId === userId && (transaction.side === "profit" || transaction.side === "loss"))
      .sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));
    const previousValue = transactions[transactions.length - 1]?.portfolioValue ?? 0;
    const signedAmount = direction === "loss" ? -normalizedAmount : normalizedAmount;
    const transaction: PortfolioTransaction = {
      id: randomUUID(),
      userId,
      assetId: null,
      symbol: "PORTFOLIO",
      side: direction,
      quantity: direction === "loss" ? -1 : 1,
      price: normalizedAmount,
      portfolioValue: previousValue + signedAmount,
      createdAt: now,
    };
    this.portfolioTransactions.set(transaction.id, transaction);
    return { ...(await this.getUserPortfolio(userId)), transaction };
  }

  async updatePortfolioAssetPrice(userId: string, assetId: string, currentPrice: number): Promise<{ assets: PortfolioAsset[]; transaction: PortfolioTransaction } | undefined> {
    const asset = this.portfolioAssets.get(assetId);
    if (!asset || asset.userId !== userId) return undefined;
    const now = new Date();
    const updated: PortfolioAsset = {
      ...asset,
      currentPrice: normalizeMoneyValue(currentPrice),
      updatedAt: now,
    };
    this.portfolioAssets.set(assetId, updated);
    const transaction: PortfolioTransaction = {
      id: randomUUID(),
      userId,
      assetId,
      symbol: updated.symbol,
      side: "update",
      quantity: updated.quantity,
      price: updated.currentPrice,
      portfolioValue: this.getPortfolioValue(userId),
      createdAt: now,
    };
    this.portfolioTransactions.set(transaction.id, transaction);
    return { ...(await this.getUserPortfolio(userId)), transaction };
  }

  async deletePortfolioAsset(userId: string, assetId: string): Promise<void> {
    const asset = this.portfolioAssets.get(assetId);
    if (!asset || asset.userId !== userId) return;
    this.portfolioAssets.delete(assetId);
    const transaction: PortfolioTransaction = {
      id: randomUUID(),
      userId,
      assetId: null,
      symbol: asset.symbol,
      side: "sell",
      quantity: asset.quantity,
      price: asset.currentPrice,
      portfolioValue: this.getPortfolioValue(userId),
      createdAt: new Date(),
    };
    this.portfolioTransactions.set(transaction.id, transaction);
  }

  async getUserDailyTasks(userId: string): Promise<DBDailyTask[]> {
    return Array.from(this.dailyTasks.values())
      .filter((task) => task.userId === userId)
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.orderIndex - b.orderIndex || (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));
  }

  async createDailyTask(userId: string, insertTask: InsertDailyTask): Promise<DBDailyTask> {
    const now = new Date();
    const task: DBDailyTask = {
      id: typeof insertTask.id === "string" && insertTask.id ? insertTask.id : randomUUID(),
      userId,
      text: insertTask.text,
      impact: normalizeTaskImpact(insertTask.impact),
      completedDates: Array.isArray(insertTask.completedDates) ? insertTask.completedDates.filter((date) => typeof date === "string") : [],
      pinned: insertTask.pinned === true,
      orderIndex: typeof insertTask.orderIndex === "number" ? insertTask.orderIndex : this.dailyTasks.size,
      createdAt: now,
      updatedAt: now,
    };
    this.dailyTasks.set(task.id, task);
    return task;
  }

  async completeDailyTask(userId: string, taskId: string, dayKey: string): Promise<DBDailyTask | undefined> {
    const task = this.dailyTasks.get(taskId);
    if (!task || task.userId !== userId) return undefined;
    const completedDates = task.completedDates.includes(dayKey) ? task.completedDates : [...task.completedDates, dayKey];
    const updated = { ...task, completedDates, updatedAt: new Date() };
    this.dailyTasks.set(taskId, updated);
    return updated;
  }

  async updateDailyTaskPinned(userId: string, taskId: string, pinned: boolean): Promise<DBDailyTask | undefined> {
    const task = this.dailyTasks.get(taskId);
    if (!task || task.userId !== userId) return undefined;
    const updated = { ...task, pinned, updatedAt: new Date() };
    this.dailyTasks.set(taskId, updated);
    return updated;
  }

  async reorderDailyTasks(userId: string, taskIds: string[]): Promise<DBDailyTask[]> {
    const requestedOrder = new Map(taskIds.map((taskId, index) => [taskId, index]));
    const now = new Date();

    for (const [taskId, task] of Array.from(this.dailyTasks.entries())) {
      if (task.userId !== userId || !requestedOrder.has(taskId)) {
        continue;
      }

      this.dailyTasks.set(taskId, {
        ...task,
        orderIndex: requestedOrder.get(taskId) ?? task.orderIndex,
        updatedAt: now,
      });
    }

    return this.getUserDailyTasks(userId);
  }

  async deleteDailyTask(userId: string, taskId: string): Promise<void> {
    const task = this.dailyTasks.get(taskId);
    if (task && task.userId === userId) {
      this.dailyTasks.delete(taskId);
    }
  }

  async getUserStateData(userId: string): Promise<DBStateData[]> {
    return Array.from(this.stateData.values()).filter((item) => item.userId === userId).sort((a, b) => a.time - b.time);
  }

  async createStateData(userId: string, insertData: Omit<InsertStateData, "userId">): Promise<DBStateData> {
    const data: DBStateData = { ...insertData, id: randomUUID(), userId, createdAt: new Date() };
    this.stateData.set(data.id, data);
    return data;
  }

  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    return Array.from(this.userProfilesMap.values()).find((profile) => profile.userId === userId);
  }

  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const newProfile: UserProfile = {
      id: randomUUID(),
      userId: profile.userId,
      displayName: profile.displayName ?? null,
      bio: profile.bio ?? null,
      goal: profile.goal ?? null,
      isPublic: profile.isPublic ?? true,
      allowEventSharing: profile.allowEventSharing ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.userProfilesMap.set(newProfile.id, newProfile);
    return newProfile;
  }

  async updateUserProfile(userId: string, updates: Partial<InsertUserProfile>): Promise<UserProfile | undefined> {
    const profile = await this.getUserProfile(userId);
    if (!profile) return undefined;
    const updated = { ...profile, ...updates, updatedAt: new Date() };
    this.userProfilesMap.set(profile.id, updated);
    return updated;
  }

  async searchUsers(query: string, currentUserId: string): Promise<(User & { profile?: UserProfile; isFollowing?: boolean })[]> {
    const results = Array.from(this.users.values()).filter(
      (user) => user.id !== currentUserId
        && (((user.tokenName ?? "").toLowerCase().includes(query.toLowerCase())) || ((user.email ?? "").toLowerCase().includes(query.toLowerCase())))
    );

    return Promise.all(results.map(async (user) => ({
      ...user,
      profile: await this.getUserProfile(user.id),
      isFollowing: await this.isFollowing(currentUserId, user.id),
    })));
  }

  async followUser(followerId: string, followedId: string): Promise<UserRelationship> {
    const existing = Array.from(this.relationships.values()).find((relationship) => relationship.followerId === followerId && relationship.followedId === followedId);
    if (existing) return existing;

    const relationship: UserRelationship = {
      id: randomUUID(),
      followerId,
      followedId,
      status: "accepted",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.relationships.set(relationship.id, relationship);
    return relationship;
  }

  async unfollowUser(followerId: string, followedId: string): Promise<void> {
    for (const [id, relationship] of Array.from(this.relationships.entries())) {
      if (relationship.followerId === followerId && relationship.followedId === followedId) {
        this.relationships.delete(id);
      }
    }
  }

  async getFollowing(userId: string): Promise<(User & { profile?: UserProfile })[]> {
    const following = Array.from(this.relationships.values()).filter((relationship) => relationship.followerId === userId && relationship.status === "accepted");
    const results = await Promise.all(following.map(async (relationship) => {
      const user = this.users.get(relationship.followedId);
      if (!user) return null;
      return { ...user, profile: await this.getUserProfile(relationship.followedId) };
    }));
    return results.filter((user) => user !== null) as (User & { profile?: UserProfile })[];
  }

  async getFollowers(userId: string): Promise<(User & { profile?: UserProfile })[]> {
    const followers = Array.from(this.relationships.values()).filter((relationship) => relationship.followedId === userId && relationship.status === "accepted");
    const results = await Promise.all(followers.map(async (relationship) => {
      const user = this.users.get(relationship.followerId);
      if (!user) return null;
      return { ...user, profile: await this.getUserProfile(relationship.followerId) };
    }));
    return results.filter((user) => user !== null) as (User & { profile?: UserProfile })[];
  }

  async isFollowing(followerId: string, followedId: string): Promise<boolean> {
    return Array.from(this.relationships.values()).some((relationship) => relationship.followerId === followerId && relationship.followedId === followedId && relationship.status === "accepted");
  }

  async getPublicUserData(userId: string, viewerId: string): Promise<{
    user: User;
    profile?: UserProfile;
    stateData: DBStateData[];
    events?: DBNewsEvent[];
    isFollowing: boolean;
  } | null> {
    const user = this.users.get(userId);
    if (!user) return null;

    const profile = await this.getUserProfile(userId);
    const isFollowing = await this.isFollowing(viewerId, userId);
    const canView = profile?.isPublic !== false || isFollowing || userId === viewerId;
    if (!canView) {
      return { user, profile, stateData: [], isFollowing };
    }

    const data = await this.getUserStateData(userId);
    const events = profile?.allowEventSharing || userId === viewerId ? await this.getUserNewsEvents(userId) : undefined;
    return { user, profile, stateData: data, events, isFollowing };
  }
}

export class PostgresStorage implements IStorage {
  async initialize(): Promise<void> {
    await withClient(async (client) => {
      await client.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS two_factor_enabled boolean DEFAULT false
      `);
      await client.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS two_factor_secret text
      `);
      await client.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS telegram_id text
      `);
      await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_telegram_id ON users (telegram_id) WHERE telegram_id IS NOT NULL`);
      await client.query(`
        CREATE TABLE IF NOT EXISTS auth_sessions (
          id varchar PRIMARY KEY,
          user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token text NOT NULL UNIQUE,
          expires_at timestamp NOT NULL,
          created_at timestamp DEFAULT now()
        )
      `);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions (user_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions (expires_at)`);
      await client.query(`
        CREATE TABLE IF NOT EXISTS subscriptions (
          id varchar PRIMARY KEY,
          user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          provider text NOT NULL DEFAULT 'telegram_stars',
          plan text NOT NULL DEFAULT 'premium_monthly',
          status text NOT NULL DEFAULT 'active',
          telegram_payment_charge_id text,
          provider_payment_charge_id text,
          starts_at timestamp NOT NULL,
          expires_at timestamp NOT NULL,
          created_at timestamp DEFAULT now(),
          updated_at timestamp DEFAULT now()
        )
      `);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions (user_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_subscriptions_status_expires_at ON subscriptions (status, expires_at)`);
      await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_telegram_charge ON subscriptions (telegram_payment_charge_id) WHERE telegram_payment_charge_id IS NOT NULL`);
      await client.query(`
        CREATE TABLE IF NOT EXISTS portfolio_assets (
          id varchar PRIMARY KEY,
          user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          symbol text NOT NULL,
          name text NOT NULL,
          type text NOT NULL,
          quantity double precision NOT NULL,
          entry_price double precision NOT NULL,
          current_price double precision NOT NULL,
          created_at timestamp DEFAULT now(),
          updated_at timestamp DEFAULT now()
        )
      `);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_portfolio_assets_user_id ON portfolio_assets (user_id)`);
      await client.query(`
        CREATE TABLE IF NOT EXISTS portfolio_transactions (
          id varchar PRIMARY KEY,
          user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          asset_id varchar REFERENCES portfolio_assets(id) ON DELETE SET NULL,
          symbol text NOT NULL,
          side text NOT NULL,
          quantity double precision NOT NULL,
          price double precision NOT NULL,
          portfolio_value double precision NOT NULL,
          created_at timestamp DEFAULT now()
        )
      `);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_portfolio_transactions_user_id ON portfolio_transactions (user_id, created_at)`);
      await client.query(`
        CREATE TABLE IF NOT EXISTS daily_tasks (
          id varchar PRIMARY KEY,
          user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          text text NOT NULL,
          impact jsonb NOT NULL,
          completed_dates jsonb NOT NULL DEFAULT '[]'::jsonb,
          pinned boolean NOT NULL DEFAULT false,
          order_index integer NOT NULL DEFAULT 0,
          created_at timestamp DEFAULT now(),
          updated_at timestamp DEFAULT now()
        )
      `);
      await client.query(`ALTER TABLE daily_tasks ADD COLUMN IF NOT EXISTS order_index integer NOT NULL DEFAULT 0`);
      await client.query(`
        WITH ordered AS (
          SELECT id, row_number() OVER (PARTITION BY user_id ORDER BY pinned DESC, created_at ASC) - 1 AS next_order
          FROM daily_tasks
        )
        UPDATE daily_tasks
        SET order_index = ordered.next_order
        FROM ordered
        WHERE daily_tasks.id = ordered.id
          AND daily_tasks.order_index = 0
      `);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_daily_tasks_user_id ON daily_tasks (user_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_daily_tasks_user_pinned ON daily_tasks (user_id, pinned, created_at)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_daily_tasks_user_order ON daily_tasks (user_id, pinned, order_index)`);
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return withClient(async (client) => {
      const result = await client.query("select * from users where id = $1 limit 1", [id]);
      return result.rows[0] ? mapUser(result.rows[0]) : undefined;
    });
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return withClient(async (client) => {
      const result = await client.query("select * from users where email = $1 limit 1", [email]);
      return result.rows[0] ? mapUser(result.rows[0]) : undefined;
    });
  }

  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    return withClient(async (client) => {
      const result = await client.query("select * from users where wallet_address = $1 limit 1", [walletAddress]);
      return result.rows[0] ? mapUser(result.rows[0]) : undefined;
    });
  }

  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    return withClient(async (client) => {
      const result = await client.query("select * from users where telegram_id = $1 limit 1", [telegramId]);
      return result.rows[0] ? mapUser(result.rows[0]) : undefined;
    });
  }

  async getUserBySessionToken(token: string): Promise<User | undefined> {
    return withClient(async (client) => {
      const sessionResult = await client.query(
        "select * from auth_sessions where token = $1 limit 1",
        [token]
      );

      const sessionRow = sessionResult.rows[0];
      if (!sessionRow) {
        return undefined;
      }

      if (new Date(sessionRow.expires_at).getTime() <= Date.now()) {
        await client.query("delete from auth_sessions where token = $1", [token]);
        return undefined;
      }

      const userResult = await client.query("select * from users where id = $1 limit 1", [sessionRow.user_id]);
      return userResult.rows[0] ? mapUser(userResult.rows[0]) : undefined;
    });
  }

  async createAuthSession(userId: string, expiresAt: Date): Promise<AuthSession> {
    return withClient(async (client) => {
      const result = await client.query(
        `insert into auth_sessions (id, user_id, token, expires_at)
         values ($1, $2, $3, $4)
         returning *`,
        [randomUUID(), userId, randomUUID(), expiresAt]
      );
      return mapAuthSession(result.rows[0]);
    });
  }

  async deleteAuthSession(token: string): Promise<void> {
    await withClient(async (client) => {
      await client.query("delete from auth_sessions where token = $1", [token]);
    });
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    return withClient(async (client) => {
      const result = await client.query(
        `insert into users (id, email, password, wallet_address, telegram_id, token_name, avatar_url, two_factor_enabled, two_factor_secret)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         returning *`,
        [
          randomUUID(),
          insertUser.email ?? null,
          insertUser.password ?? null,
          insertUser.walletAddress ?? null,
          insertUser.telegramId ?? null,
          insertUser.tokenName ?? "SOUL",
          insertUser.avatarUrl ?? null,
          insertUser.twoFactorEnabled ?? false,
          insertUser.twoFactorSecret ?? null,
        ]
      );
      return mapUser(result.rows[0]);
    });
  }

  async updateUserTokenName(userId: string, tokenName: string): Promise<User | undefined> {
    return withClient(async (client) => {
      const result = await client.query(
        "update users set token_name = $2 where id = $1 returning *",
        [userId, tokenName]
      );
      return result.rows[0] ? mapUser(result.rows[0]) : undefined;
    });
  }

  async updateUserAvatar(userId: string, avatarUrl: string): Promise<User | undefined> {
    return withClient(async (client) => {
      const result = await client.query(
        "update users set avatar_url = $2 where id = $1 returning *",
        [userId, avatarUrl]
      );
      return result.rows[0] ? mapUser(result.rows[0]) : undefined;
    });
  }

  async updateUserTelegramId(userId: string, telegramId: string): Promise<User | undefined> {
    return withClient(async (client) => {
      const result = await client.query(
        "update users set telegram_id = $2 where id = $1 returning *",
        [userId, telegramId]
      );
      return result.rows[0] ? mapUser(result.rows[0]) : undefined;
    });
  }

  async getActiveSubscription(userId: string): Promise<Subscription | undefined> {
    return withClient(async (client) => {
      const result = await client.query(
        `select *
         from subscriptions
         where user_id = $1
           and status = 'active'
           and expires_at > now()
         order by expires_at desc
         limit 1`,
        [userId]
      );
      return result.rows[0] ? mapSubscription(result.rows[0]) : undefined;
    });
  }

  async activateTelegramStarsSubscription(input: {
    userId: string;
    telegramPaymentChargeId: string;
    providerPaymentChargeId?: string | null;
  }): Promise<Subscription> {
    return withClient(async (client) => {
      const duplicate = await client.query(
        "select * from subscriptions where telegram_payment_charge_id = $1 limit 1",
        [input.telegramPaymentChargeId]
      );
      if (duplicate.rows[0]) {
        return mapSubscription(duplicate.rows[0]);
      }

      const active = await client.query(
        `select *
         from subscriptions
         where user_id = $1
           and provider = 'telegram_stars'
           and plan = 'premium_monthly'
           and status = 'active'
           and expires_at > now()
         order by expires_at desc
         limit 1`,
        [input.userId]
      );
      const existing = await client.query(
        `select *
         from subscriptions
         where user_id = $1
           and provider = 'telegram_stars'
           and plan = 'premium_monthly'
         order by created_at desc
         limit 1`,
        [input.userId]
      );
      const baseDate = active.rows[0] ? new Date(active.rows[0].expires_at) : new Date();
      const expiresAt = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);

      if (existing.rows[0]) {
        const result = await client.query(
          `update subscriptions
           set status = 'active',
               telegram_payment_charge_id = $2,
               provider_payment_charge_id = $3,
               expires_at = $4,
               updated_at = now()
           where id = $1
           returning *`,
          [existing.rows[0].id, input.telegramPaymentChargeId, input.providerPaymentChargeId ?? null, expiresAt]
        );
        return mapSubscription(result.rows[0]);
      }

      const result = await client.query(
        `insert into subscriptions (
          id, user_id, provider, plan, status,
          telegram_payment_charge_id, provider_payment_charge_id, starts_at, expires_at
        )
        values ($1, $2, 'telegram_stars', 'premium_monthly', 'active', $3, $4, now(), $5)
        returning *`,
        [randomUUID(), input.userId, input.telegramPaymentChargeId, input.providerPaymentChargeId ?? null, expiresAt]
      );
      return mapSubscription(result.rows[0]);
    });
  }

  async updateUserTwoFactor(userId: string, updates: { enabled: boolean; secret: string | null }): Promise<User | undefined> {
    return withClient(async (client) => {
      const result = await client.query(
        "update users set two_factor_enabled = $2, two_factor_secret = $3 where id = $1 returning *",
        [userId, updates.enabled, updates.secret]
      );
      return result.rows[0] ? mapUser(result.rows[0]) : undefined;
    });
  }

  async getUserNewsEvents(userId: string): Promise<DBNewsEvent[]> {
    return withClient(async (client) => {
      const result = await client.query(
        "select * from news_events where user_id = $1 order by time asc",
        [userId]
      );
      return result.rows.map(mapNewsEvent);
    });
  }

  async createNewsEvent(userId: string, insertEvent: Omit<InsertNewsEvent, "userId">): Promise<DBNewsEvent> {
    const media = Array.isArray(insertEvent.media) ? insertEvent.media : null;

    return withClient(async (client) => {
      const result = await client.query(
        `insert into news_events (
          id, user_id, time, type, text,
          impact_mental, impact_physical, impact_moral, impact_financial, media
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        returning *`,
        [
          randomUUID(),
          userId,
          insertEvent.time,
          insertEvent.type,
          insertEvent.text,
          insertEvent.impactMental ?? 0,
          insertEvent.impactPhysical ?? 0,
          insertEvent.impactMoral ?? 0,
          insertEvent.impactFinancial ?? 0,
          media ? JSON.stringify(media) : null,
        ]
      );
      return mapNewsEvent(result.rows[0]);
    });
  }

  async deleteNewsEvent(userId: string, eventId: string): Promise<void> {
    await withClient(async (client) => {
      await client.query("delete from news_events where id = $1 and user_id = $2", [eventId, userId]);
    });
  }

  async deleteAllUserNewsEvents(userId: string): Promise<void> {
    await withClient(async (client) => {
      await client.query("delete from news_events where user_id = $1", [userId]);
    });
  }

  async getUserPortfolio(userId: string): Promise<{ assets: PortfolioAsset[]; transactions: PortfolioTransaction[] }> {
    return withClient(async (client) => {
      const [assetsResult, transactionsResult] = await Promise.all([
        client.query(
          `select *
           from portfolio_assets
           where user_id = $1
           order by updated_at desc, created_at desc`,
          [userId]
        ),
        client.query(
          `select *
           from portfolio_transactions
           where user_id = $1
           order by created_at asc`,
          [userId]
        ),
      ]);

      return {
        assets: assetsResult.rows.map(mapPortfolioAsset),
        transactions: transactionsResult.rows.map(mapPortfolioTransaction),
      };
    });
  }

  async createPortfolioAsset(userId: string, input: PortfolioAssetInput): Promise<{ assets: PortfolioAsset[]; transaction: PortfolioTransaction }> {
    return withClient(async (client) => {
      await client.query("begin");
      try {
        const assetResult = await client.query(
          `insert into portfolio_assets (id, user_id, symbol, name, type, quantity, entry_price, current_price)
           values ($1, $2, $3, $4, $5, $6, $7, $8)
           returning *`,
          [
            randomUUID(),
            userId,
            normalizePortfolioSymbol(input),
            input.name?.trim() || normalizePortfolioSymbol(input),
            input.type,
            normalizePortfolioQuantity(input.quantity),
            normalizeMoneyValue(input.entryPrice),
            normalizeMoneyValue(input.currentPrice),
          ]
        );
        const asset = mapPortfolioAsset(assetResult.rows[0]);
        const valueResult = await client.query(
          "select coalesce(sum(quantity * current_price), 0) as value from portfolio_assets where user_id = $1",
          [userId]
        );
        const transactionResult = await client.query(
          `insert into portfolio_transactions (id, user_id, asset_id, symbol, side, quantity, price, portfolio_value)
           values ($1, $2, $3, $4, $5, $6, $7, $8)
           returning *`,
          [
            randomUUID(),
            userId,
            asset.id,
            asset.symbol,
            asset.quantity < 0 ? "loss" : "profit",
            asset.quantity,
            asset.entryPrice,
            Number(valueResult.rows[0]?.value ?? 0),
          ]
        );
        const assetsResult = await client.query(
          `select * from portfolio_assets where user_id = $1 order by updated_at desc, created_at desc`,
          [userId]
        );
        await client.query("commit");
        return {
          assets: assetsResult.rows.map(mapPortfolioAsset),
          transaction: mapPortfolioTransaction(transactionResult.rows[0]),
        };
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    });
  }

  async createPortfolioMovement(userId: string, direction: "profit" | "loss", amount: number): Promise<{ assets: PortfolioAsset[]; transaction: PortfolioTransaction }> {
    return withClient(async (client) => {
      await client.query("begin");
      try {
        const normalizedAmount = normalizeMoneyValue(amount);
        const previousResult = await client.query(
          `select portfolio_value
           from portfolio_transactions
           where user_id = $1 and side in ('profit', 'loss')
           order by created_at desc
           limit 1`,
          [userId]
        );
        const previousValue = Number(previousResult.rows[0]?.portfolio_value ?? 0);
        const signedAmount = direction === "loss" ? -normalizedAmount : normalizedAmount;
        const transactionResult = await client.query(
          `insert into portfolio_transactions (id, user_id, asset_id, symbol, side, quantity, price, portfolio_value)
           values ($1, $2, null, 'PORTFOLIO', $3, $4, $5, $6)
           returning *`,
          [
            randomUUID(),
            userId,
            direction,
            direction === "loss" ? -1 : 1,
            normalizedAmount,
            previousValue + signedAmount,
          ]
        );
        const assetsResult = await client.query(
          `select * from portfolio_assets where user_id = $1 order by updated_at desc, created_at desc`,
          [userId]
        );
        await client.query("commit");
        return {
          assets: assetsResult.rows.map(mapPortfolioAsset),
          transaction: mapPortfolioTransaction(transactionResult.rows[0]),
        };
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    });
  }

  async updatePortfolioAssetPrice(userId: string, assetId: string, currentPrice: number): Promise<{ assets: PortfolioAsset[]; transaction: PortfolioTransaction } | undefined> {
    return withClient(async (client) => {
      await client.query("begin");
      try {
        const assetResult = await client.query(
          `update portfolio_assets
           set current_price = $3,
               updated_at = now()
           where id = $1 and user_id = $2
           returning *`,
          [assetId, userId, normalizeMoneyValue(currentPrice)]
        );
        if (!assetResult.rows[0]) {
          await client.query("rollback");
          return undefined;
        }
        const asset = mapPortfolioAsset(assetResult.rows[0]);
        const valueResult = await client.query(
          "select coalesce(sum(quantity * current_price), 0) as value from portfolio_assets where user_id = $1",
          [userId]
        );
        const transactionResult = await client.query(
          `insert into portfolio_transactions (id, user_id, asset_id, symbol, side, quantity, price, portfolio_value)
           values ($1, $2, $3, $4, 'update', $5, $6, $7)
           returning *`,
          [randomUUID(), userId, asset.id, asset.symbol, asset.quantity, asset.currentPrice, Number(valueResult.rows[0]?.value ?? 0)]
        );
        const assetsResult = await client.query(
          `select * from portfolio_assets where user_id = $1 order by updated_at desc, created_at desc`,
          [userId]
        );
        await client.query("commit");
        return {
          assets: assetsResult.rows.map(mapPortfolioAsset),
          transaction: mapPortfolioTransaction(transactionResult.rows[0]),
        };
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    });
  }

  async deletePortfolioAsset(userId: string, assetId: string): Promise<void> {
    await withClient(async (client) => {
      await client.query("begin");
      try {
        const assetResult = await client.query("select * from portfolio_assets where id = $1 and user_id = $2", [assetId, userId]);
        if (!assetResult.rows[0]) {
          await client.query("rollback");
          return;
        }
        const asset = mapPortfolioAsset(assetResult.rows[0]);
        await client.query("delete from portfolio_assets where id = $1 and user_id = $2", [assetId, userId]);
        const valueResult = await client.query(
          "select coalesce(sum(quantity * current_price), 0) as value from portfolio_assets where user_id = $1",
          [userId]
        );
        await client.query(
          `insert into portfolio_transactions (id, user_id, asset_id, symbol, side, quantity, price, portfolio_value)
           values ($1, $2, null, $3, 'sell', $4, $5, $6)`,
          [randomUUID(), userId, asset.symbol, asset.quantity, asset.currentPrice, Number(valueResult.rows[0]?.value ?? 0)]
        );
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    });
  }

  async getUserDailyTasks(userId: string): Promise<DBDailyTask[]> {
    return withClient(async (client) => {
      const result = await client.query(
        `select *
         from daily_tasks
         where user_id = $1
         order by pinned desc, order_index asc, created_at asc`,
        [userId]
      );
      return result.rows.map(mapDailyTask);
    });
  }

  async createDailyTask(userId: string, insertTask: InsertDailyTask): Promise<DBDailyTask> {
    const taskId = typeof insertTask.id === "string" && insertTask.id ? insertTask.id : randomUUID();
    const impact = normalizeTaskImpact(insertTask.impact);
    const completedDates = Array.isArray(insertTask.completedDates) ? insertTask.completedDates.filter((date) => typeof date === "string") : [];

    return withClient(async (client) => {
      const result = await client.query(
        `insert into daily_tasks (id, user_id, text, impact, completed_dates, pinned, order_index)
         values ($1, $2, $3, $4, $5, $6, $7)
         on conflict (id) do update
         set text = excluded.text,
             impact = excluded.impact,
             completed_dates = excluded.completed_dates,
             pinned = excluded.pinned,
             order_index = excluded.order_index,
             updated_at = now()
         returning *`,
        [
          taskId,
          userId,
          insertTask.text,
          JSON.stringify(impact),
          JSON.stringify(completedDates),
          insertTask.pinned === true,
          typeof insertTask.orderIndex === "number" ? insertTask.orderIndex : Date.now(),
        ]
      );
      return mapDailyTask(result.rows[0]);
    });
  }

  async completeDailyTask(userId: string, taskId: string, dayKey: string): Promise<DBDailyTask | undefined> {
    return withClient(async (client) => {
      const result = await client.query(
        `update daily_tasks
         set completed_dates = case
               when completed_dates ? $3 then completed_dates
               else completed_dates || to_jsonb($3::text)
             end,
             updated_at = now()
         where id = $1 and user_id = $2
         returning *`,
        [taskId, userId, dayKey]
      );
      return result.rows[0] ? mapDailyTask(result.rows[0]) : undefined;
    });
  }

  async updateDailyTaskPinned(userId: string, taskId: string, pinned: boolean): Promise<DBDailyTask | undefined> {
    return withClient(async (client) => {
      const result = await client.query(
        `update daily_tasks
         set pinned = $3,
             updated_at = now()
         where id = $1 and user_id = $2
         returning *`,
        [taskId, userId, pinned]
      );
      return result.rows[0] ? mapDailyTask(result.rows[0]) : undefined;
    });
  }

  async reorderDailyTasks(userId: string, taskIds: string[]): Promise<DBDailyTask[]> {
    return withClient(async (client) => {
      await client.query("begin");
      try {
        for (let index = 0; index < taskIds.length; index += 1) {
          const taskId = taskIds[index];
          await client.query(
            `update daily_tasks
             set order_index = $3,
                 updated_at = now()
             where id = $1 and user_id = $2`,
            [taskId, userId, index]
          );
        }

        const result = await client.query(
          `select *
           from daily_tasks
           where user_id = $1
           order by pinned desc, order_index asc, created_at asc`,
          [userId]
        );
        await client.query("commit");
        return result.rows.map(mapDailyTask);
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    });
  }

  async deleteDailyTask(userId: string, taskId: string): Promise<void> {
    await withClient(async (client) => {
      await client.query("delete from daily_tasks where id = $1 and user_id = $2", [taskId, userId]);
    });
  }

  async getUserStateData(userId: string): Promise<DBStateData[]> {
    return withClient(async (client) => {
      const result = await client.query(
        "select * from state_data where user_id = $1 order by time asc",
        [userId]
      );
      return result.rows.map(mapStateData);
    });
  }

  async createStateData(userId: string, insertData: Omit<InsertStateData, "userId">): Promise<DBStateData> {
    return withClient(async (client) => {
      const result = await client.query(
        `insert into state_data (id, user_id, time, mental, physical, moral, financial)
         values ($1, $2, $3, $4, $5, $6, $7)
         returning *`,
        [
          randomUUID(),
          userId,
          insertData.time,
          insertData.mental,
          insertData.physical,
          insertData.moral,
          insertData.financial,
        ]
      );
      return mapStateData(result.rows[0]);
    });
  }

  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    return withClient(async (client) => {
      const result = await client.query("select * from user_profiles where user_id = $1 limit 1", [userId]);
      return result.rows[0] ? mapUserProfile(result.rows[0]) : undefined;
    });
  }

  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    return withClient(async (client) => {
      const result = await client.query(
        `insert into user_profiles (
          id, user_id, display_name, bio, goal, is_public, allow_event_sharing
        )
        values ($1, $2, $3, $4, $5, $6, $7)
        returning *`,
        [
          randomUUID(),
          profile.userId,
          profile.displayName ?? null,
          profile.bio ?? null,
          profile.goal ?? null,
          profile.isPublic ?? true,
          profile.allowEventSharing ?? false,
        ]
      );
      return mapUserProfile(result.rows[0]);
    });
  }

  async updateUserProfile(userId: string, updates: Partial<InsertUserProfile>): Promise<UserProfile | undefined> {
    return withClient(async (client) => {
      const current = await client.query("select * from user_profiles where user_id = $1 limit 1", [userId]);
      if (!current.rows[0]) {
        return undefined;
      }

      const existing = mapUserProfile(current.rows[0]);
      const result = await client.query(
        `update user_profiles
         set display_name = $2,
             bio = $3,
             goal = $4,
             is_public = $5,
             allow_event_sharing = $6,
             updated_at = now()
         where user_id = $1
         returning *`,
        [
          userId,
          updates.displayName ?? existing.displayName,
          updates.bio ?? existing.bio,
          updates.goal ?? existing.goal,
          updates.isPublic ?? existing.isPublic,
          updates.allowEventSharing ?? existing.allowEventSharing,
        ]
      );
      return result.rows[0] ? mapUserProfile(result.rows[0]) : undefined;
    });
  }

  async searchUsers(query: string, currentUserId: string): Promise<(User & { profile?: UserProfile; isFollowing?: boolean })[]> {
    const pattern = `%${query}%`;
    return withClient(async (client) => {
      const result = await client.query(
        `select u.*,
                up.id as profile_id,
                up.display_name,
                up.bio,
                up.goal,
                up.is_public,
                up.allow_event_sharing,
                up.created_at as profile_created_at,
                up.updated_at as profile_updated_at,
                exists(
                  select 1
                  from user_relationships ur
                  where ur.follower_id = $1
                    and ur.followed_id = u.id
                    and ur.status = 'accepted'
                ) as is_following
         from users u
         left join user_profiles up on up.user_id = u.id
         where u.id <> $1
           and (coalesce(u.token_name, '') ilike $2 or coalesce(u.email, '') ilike $2)
         order by u.created_at desc
         limit 20`,
        [currentUserId, pattern]
      );

      return result.rows.map((row) => ({
        ...mapUser(row),
        profile: row.profile_id
          ? mapUserProfile({
              id: row.profile_id,
              user_id: row.id,
              display_name: row.display_name,
              bio: row.bio,
              goal: row.goal,
              is_public: row.is_public,
              allow_event_sharing: row.allow_event_sharing,
              created_at: row.profile_created_at,
              updated_at: row.profile_updated_at,
            })
          : undefined,
        isFollowing: row.is_following,
      }));
    });
  }

  async followUser(followerId: string, followedId: string): Promise<UserRelationship> {
    return withClient(async (client) => {
      const existing = await client.query(
        "select * from user_relationships where follower_id = $1 and followed_id = $2 limit 1",
        [followerId, followedId]
      );
      if (existing.rows[0]) {
        return mapUserRelationship(existing.rows[0]);
      }

      const result = await client.query(
        `insert into user_relationships (id, follower_id, followed_id, status)
         values ($1, $2, $3, 'accepted')
         returning *`,
        [randomUUID(), followerId, followedId]
      );
      return mapUserRelationship(result.rows[0]);
    });
  }

  async unfollowUser(followerId: string, followedId: string): Promise<void> {
    await withClient(async (client) => {
      await client.query(
        "delete from user_relationships where follower_id = $1 and followed_id = $2",
        [followerId, followedId]
      );
    });
  }

  async getFollowing(userId: string): Promise<(User & { profile?: UserProfile })[]> {
    return withClient(async (client) => {
      const result = await client.query(
        `select u.*,
                up.id as profile_id,
                up.display_name,
                up.bio,
                up.goal,
                up.is_public,
                up.allow_event_sharing,
                up.created_at as profile_created_at,
                up.updated_at as profile_updated_at
         from user_relationships ur
         join users u on u.id = ur.followed_id
         left join user_profiles up on up.user_id = u.id
         where ur.follower_id = $1 and ur.status = 'accepted'
         order by ur.created_at desc`,
        [userId]
      );

      return result.rows.map((row) => ({
        ...mapUser(row),
        profile: row.profile_id
          ? mapUserProfile({
              id: row.profile_id,
              user_id: row.id,
              display_name: row.display_name,
              bio: row.bio,
              goal: row.goal,
              is_public: row.is_public,
              allow_event_sharing: row.allow_event_sharing,
              created_at: row.profile_created_at,
              updated_at: row.profile_updated_at,
            })
          : undefined,
      }));
    });
  }

  async getFollowers(userId: string): Promise<(User & { profile?: UserProfile })[]> {
    return withClient(async (client) => {
      const result = await client.query(
        `select u.*,
                up.id as profile_id,
                up.display_name,
                up.bio,
                up.goal,
                up.is_public,
                up.allow_event_sharing,
                up.created_at as profile_created_at,
                up.updated_at as profile_updated_at
         from user_relationships ur
         join users u on u.id = ur.follower_id
         left join user_profiles up on up.user_id = u.id
         where ur.followed_id = $1 and ur.status = 'accepted'
         order by ur.created_at desc`,
        [userId]
      );

      return result.rows.map((row) => ({
        ...mapUser(row),
        profile: row.profile_id
          ? mapUserProfile({
              id: row.profile_id,
              user_id: row.id,
              display_name: row.display_name,
              bio: row.bio,
              goal: row.goal,
              is_public: row.is_public,
              allow_event_sharing: row.allow_event_sharing,
              created_at: row.profile_created_at,
              updated_at: row.profile_updated_at,
            })
          : undefined,
      }));
    });
  }

  async isFollowing(followerId: string, followedId: string): Promise<boolean> {
    return withClient(async (client) => {
      const result = await client.query(
        `select 1
         from user_relationships
         where follower_id = $1 and followed_id = $2 and status = 'accepted'
         limit 1`,
        [followerId, followedId]
      );
      return result.rows.length > 0;
    });
  }

  async getPublicUserData(userId: string, viewerId: string): Promise<{
    user: User;
    profile?: UserProfile;
    stateData: DBStateData[];
    events?: DBNewsEvent[];
    isFollowing: boolean;
  } | null> {
    const user = await this.getUser(userId);
    if (!user) {
      return null;
    }

    const profile = await this.getUserProfile(userId);
    const isFollowing = await this.isFollowing(viewerId, userId);
    const canView = profile?.isPublic !== false || isFollowing || userId === viewerId;
    if (!canView) {
      return { user, profile, stateData: [], isFollowing };
    }

    const stateData = await this.getUserStateData(userId);
    const events = profile?.allowEventSharing || userId === viewerId ? await this.getUserNewsEvents(userId) : undefined;

    return { user, profile, stateData, events, isFollowing };
  }
}

function createStorage(): IStorage {
  if (!process.env.DATABASE_URL) {
    console.warn("DATABASE_URL is not set. Falling back to in-memory storage for local development.");
    return new MemStorage();
  }

  return new PostgresStorage();
}

export const storage = createStorage();
export const storageReady = typeof (storage as IStorage & { initialize?: () => Promise<void> }).initialize === "function"
  ? (storage as IStorage & { initialize: () => Promise<void> }).initialize()
  : Promise.resolve();
