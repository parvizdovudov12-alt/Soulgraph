import { 
  type User, 
  type InsertUser,
  type NewsEvent as DBNewsEvent,
  type InsertNewsEvent,
  type StateData as DBStateData,
  type InsertStateData,
  users,
  newsEvents,
  stateData
} from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and } from "drizzle-orm";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByWalletAddress(walletAddress: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserTokenName(userId: string, tokenName: string): Promise<User | undefined>;
  updateUserAvatar(userId: string, avatarUrl: string): Promise<User | undefined>;
  
  // News events - now user-specific
  getUserNewsEvents(userId: string): Promise<DBNewsEvent[]>;
  createNewsEvent(userId: string, event: Omit<InsertNewsEvent, 'userId'>): Promise<DBNewsEvent>;
  deleteNewsEvent(userId: string, eventId: string): Promise<void>;
  deleteAllUserNewsEvents(userId: string): Promise<void>;
  
  // State data - now user-specific
  getUserStateData(userId: string): Promise<DBStateData[]>;
  createStateData(userId: string, data: Omit<InsertStateData, 'userId'>): Promise<DBStateData>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private newsEvents: Map<string, DBNewsEvent>;
  private stateData: Map<string, DBStateData>;

  constructor() {
    this.users = new Map();
    this.newsEvents = new Map();
    this.stateData = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.walletAddress === walletAddress,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      id, 
      email: insertUser.email ?? null,
      password: insertUser.password ?? null,
      walletAddress: insertUser.walletAddress ?? null,
      tokenName: insertUser.tokenName ?? "SOUL",
      avatarUrl: insertUser.avatarUrl ?? null,
      createdAt: new Date()
    };
    this.users.set(id, user);
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

  async getUserNewsEvents(userId: string): Promise<DBNewsEvent[]> {
    return Array.from(this.newsEvents.values())
      .filter(event => event.userId === userId)
      .sort((a, b) => a.time - b.time);
  }

  async createNewsEvent(userId: string, insertEvent: Omit<InsertNewsEvent, 'userId'>): Promise<DBNewsEvent> {
    const id = randomUUID();
    const event: DBNewsEvent = { 
      id,
      userId,
      type: insertEvent.type,
      time: insertEvent.time,
      text: insertEvent.text,
      impactMental: insertEvent.impactMental ?? 0,
      impactPhysical: insertEvent.impactPhysical ?? 0,
      impactMoral: insertEvent.impactMoral ?? 0,
      impactFinancial: insertEvent.impactFinancial ?? 0,
      media: (insertEvent.media as { type: 'image' | 'video'; url: string }[] | null) ?? null,
      createdAt: new Date()
    };
    this.newsEvents.set(id, event);
    return event;
  }

  async deleteNewsEvent(userId: string, eventId: string): Promise<void> {
    const event = this.newsEvents.get(eventId);
    if (event && event.userId === userId) {
      this.newsEvents.delete(eventId);
    }
  }

  async deleteAllUserNewsEvents(userId: string): Promise<void> {
    const eventIds = Array.from(this.newsEvents.entries())
      .filter(([, event]) => event.userId === userId)
      .map(([id]) => id);
    
    eventIds.forEach(id => this.newsEvents.delete(id));
  }

  async getUserStateData(userId: string): Promise<DBStateData[]> {
    return Array.from(this.stateData.values())
      .filter(data => data.userId === userId)
      .sort((a, b) => a.time - b.time);
  }

  async createStateData(userId: string, insertData: Omit<InsertStateData, 'userId'>): Promise<DBStateData> {
    const id = randomUUID();
    const data: DBStateData = { 
      ...insertData,
      id,
      userId,
      createdAt: new Date()
    };
    this.stateData.set(id, data);
    return data;
  }
}

// PostgreSQL storage implementation using Drizzle ORM
export class PostgresStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL environment variable is not defined. Please configure your database connection.");
    }

    try {
      const connection = neon(databaseUrl);
      this.db = drizzle({ client: connection });
    } catch (error) {
      throw new Error(`Failed to connect to database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.walletAddress, walletAddress));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUserTokenName(userId: string, tokenName: string): Promise<User | undefined> {
    const result = await this.db.update(users)
      .set({ tokenName })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  async updateUserAvatar(userId: string, avatarUrl: string): Promise<User | undefined> {
    const result = await this.db.update(users)
      .set({ avatarUrl })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  async getUserNewsEvents(userId: string): Promise<DBNewsEvent[]> {
    return await this.db.select().from(newsEvents)
      .where(eq(newsEvents.userId, userId))
      .orderBy(newsEvents.time);
  }

  async createNewsEvent(userId: string, insertEvent: Omit<InsertNewsEvent, 'userId'>): Promise<DBNewsEvent> {
    // Validate and serialize media data
    let mediaData: { type: 'image' | 'video'; url: string }[] | null = null;
    if (insertEvent.media && Array.isArray(insertEvent.media)) {
      // Ensure media is an array of valid objects
      const validated = (insertEvent.media as unknown[]).filter((item): item is { type: 'image' | 'video'; url: string } => {
        return (
          item !== null &&
          typeof item === 'object' &&
          'type' in item &&
          'url' in item &&
          ((item as any).type === 'image' || (item as any).type === 'video') &&
          typeof (item as any).url === 'string'
        );
      });
      
      // Only set if there are valid items
      if (validated.length > 0) {
        mediaData = validated;
      }
    }

    const result = await this.db.insert(newsEvents).values({
      userId,
      type: insertEvent.type,
      time: insertEvent.time,
      text: insertEvent.text,
      impactMental: insertEvent.impactMental ?? 0,
      impactPhysical: insertEvent.impactPhysical ?? 0,
      impactMoral: insertEvent.impactMoral ?? 0,
      impactFinancial: insertEvent.impactFinancial ?? 0,
      media: mediaData,
    }).returning();
    return result[0];
  }

  async deleteNewsEvent(userId: string, eventId: string): Promise<void> {
    await this.db.delete(newsEvents)
      .where(and(
        eq(newsEvents.id, eventId),
        eq(newsEvents.userId, userId)
      ));
  }

  async deleteAllUserNewsEvents(userId: string): Promise<void> {
    await this.db.delete(newsEvents).where(eq(newsEvents.userId, userId));
  }

  async getUserStateData(userId: string): Promise<DBStateData[]> {
    return await this.db.select().from(stateData)
      .where(eq(stateData.userId, userId))
      .orderBy(stateData.time);
  }

  async createStateData(userId: string, insertData: Omit<InsertStateData, 'userId'>): Promise<DBStateData> {
    const result = await this.db.insert(stateData).values({
      ...insertData,
      userId
    }).returning();
    return result[0];
  }
}

export const storage = new PostgresStorage();
