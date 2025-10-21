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
import { eq } from "drizzle-orm";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByWalletAddress(walletAddress: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserTokenName(userId: string, tokenName: string): Promise<User | undefined>;
  
  // News events
  getAllNewsEvents(): Promise<DBNewsEvent[]>;
  createNewsEvent(event: InsertNewsEvent): Promise<DBNewsEvent>;
  
  // State data
  getAllStateData(): Promise<DBStateData[]>;
  createStateData(data: InsertStateData): Promise<DBStateData>;
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

  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.walletAddress === walletAddress,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      id, 
      walletAddress: insertUser.walletAddress,
      tokenName: "SOUL",
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

  async getAllNewsEvents(): Promise<DBNewsEvent[]> {
    return Array.from(this.newsEvents.values()).sort((a, b) => a.time - b.time);
  }

  async createNewsEvent(insertEvent: InsertNewsEvent): Promise<DBNewsEvent> {
    const id = randomUUID();
    const event: DBNewsEvent = { 
      id,
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

  async getAllStateData(): Promise<DBStateData[]> {
    return Array.from(this.stateData.values()).sort((a, b) => a.time - b.time);
  }

  async createStateData(insertData: InsertStateData): Promise<DBStateData> {
    const id = randomUUID();
    const data: DBStateData = { 
      ...insertData, 
      id,
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
    const connection = neon(process.env.DATABASE_URL!);
    this.db = drizzle({ client: connection });
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.walletAddress, walletAddress));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values({
      walletAddress: insertUser.walletAddress,
      tokenName: "SOUL",
    }).returning();
    return result[0];
  }

  async updateUserTokenName(userId: string, tokenName: string): Promise<User | undefined> {
    const result = await this.db.update(users)
      .set({ tokenName })
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  async getAllNewsEvents(): Promise<DBNewsEvent[]> {
    return await this.db.select().from(newsEvents).orderBy(newsEvents.time);
  }

  async createNewsEvent(insertEvent: InsertNewsEvent): Promise<DBNewsEvent> {
    const result = await this.db.insert(newsEvents).values({
      type: insertEvent.type,
      time: insertEvent.time,
      text: insertEvent.text,
      impactMental: insertEvent.impactMental ?? 0,
      impactPhysical: insertEvent.impactPhysical ?? 0,
      impactMoral: insertEvent.impactMoral ?? 0,
      impactFinancial: insertEvent.impactFinancial ?? 0,
      media: insertEvent.media as any ?? null,
    }).returning();
    return result[0];
  }

  async getAllStateData(): Promise<DBStateData[]> {
    return await this.db.select().from(stateData).orderBy(stateData.time);
  }

  async createStateData(insertData: InsertStateData): Promise<DBStateData> {
    const result = await this.db.insert(stateData).values(insertData).returning();
    return result[0];
  }
}

export const storage = new PostgresStorage();
