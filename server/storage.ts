import { 
  type User, 
  type InsertUser,
  type NewsEvent as DBNewsEvent,
  type InsertNewsEvent,
  type StateData as DBStateData,
  type InsertStateData
} from "@shared/schema";
import { randomUUID } from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
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

export const storage = new MemStorage();
