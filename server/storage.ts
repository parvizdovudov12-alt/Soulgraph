import { 
  type User, 
  type InsertUser,
  type NewsEvent as DBNewsEvent,
  type InsertNewsEvent,
  type StateData as DBStateData,
  type InsertStateData,
  type UserProfile,
  type InsertUserProfile,
  type UserRelationship,
  type InsertUserRelationship,
  users,
  newsEvents,
  stateData,
  userProfiles,
  userRelationships
} from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and, or, ilike, ne } from "drizzle-orm";

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
  
  // Social features - User profiles
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(userId: string, updates: Partial<InsertUserProfile>): Promise<UserProfile | undefined>;
  
  // Social features - Search and relationships
  searchUsers(query: string, currentUserId: string): Promise<(User & { profile?: UserProfile; isFollowing?: boolean })[]>;
  followUser(followerId: string, followedId: string): Promise<UserRelationship>;
  unfollowUser(followerId: string, followedId: string): Promise<void>;
  getFollowing(userId: string): Promise<(User & { profile?: UserProfile })[]>;
  getFollowers(userId: string): Promise<(User & { profile?: UserProfile })[]>;
  isFollowing(followerId: string, followedId: string): Promise<boolean>;
  
  // Get public user data for viewing
  getPublicUserData(userId: string, viewerId: string): Promise<{
    user: User;
    profile?: UserProfile;
    stateData: DBStateData[];
    events?: DBNewsEvent[];
    isFollowing: boolean;
  } | null>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private newsEvents: Map<string, DBNewsEvent>;
  private stateData: Map<string, DBStateData>;
  private userProfilesMap: Map<string, UserProfile>;
  private relationships: Map<string, UserRelationship>;

  constructor() {
    this.users = new Map();
    this.newsEvents = new Map();
    this.stateData = new Map();
    this.userProfilesMap = new Map();
    this.relationships = new Map();
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

  // Social features - User profiles (MemStorage implementation)
  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    return Array.from(this.userProfilesMap.values()).find(p => p.userId === userId);
  }

  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const id = randomUUID();
    const newProfile: UserProfile = { 
      id, 
      userId: profile.userId, 
      displayName: profile.displayName ?? null, 
      bio: profile.bio ?? null,
      isPublic: profile.isPublic ?? true, 
      allowEventSharing: profile.allowEventSharing ?? false,
      createdAt: new Date(), 
      updatedAt: new Date() 
    };
    this.userProfilesMap.set(id, newProfile);
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
    const results = Array.from(this.users.values())
      .filter(u => u.id !== currentUserId && (u.tokenName?.toLowerCase().includes(query.toLowerCase()) || u.email?.toLowerCase().includes(query.toLowerCase())));
    return Promise.all(results.map(async user => ({
      ...user,
      profile: await this.getUserProfile(user.id),
      isFollowing: await this.isFollowing(currentUserId, user.id)
    })));
  }

  async followUser(followerId: string, followedId: string): Promise<UserRelationship> {
    const id = randomUUID();
    const rel: UserRelationship = { id, followerId, followedId, status: "accepted", createdAt: new Date(), updatedAt: new Date() };
    this.relationships.set(id, rel);
    return rel;
  }

  async unfollowUser(followerId: string, followedId: string): Promise<void> {
    const key = Array.from(this.relationships.entries()).find(([, r]) => r.followerId === followerId && r.followedId === followedId)?.[0];
    if (key) this.relationships.delete(key);
  }

  async getFollowing(userId: string): Promise<(User & { profile?: UserProfile })[]> {
    const following = Array.from(this.relationships.values()).filter(r => r.followerId === userId && r.status === "accepted");
    const results = await Promise.all(following.map(async r => {
      const user = this.users.get(r.followedId);
      if (!user) return null;
      const profile = await this.getUserProfile(r.followedId);
      return { ...user, profile } as User & { profile?: UserProfile };
    }));
    return results.filter((u): u is User & { profile?: UserProfile } => u !== null);
  }

  async getFollowers(userId: string): Promise<(User & { profile?: UserProfile })[]> {
    const followers = Array.from(this.relationships.values()).filter(r => r.followedId === userId && r.status === "accepted");
    const results = await Promise.all(followers.map(async r => {
      const user = this.users.get(r.followerId);
      if (!user) return null;
      const profile = await this.getUserProfile(r.followerId);
      return { ...user, profile } as User & { profile?: UserProfile };
    }));
    return results.filter((u): u is User & { profile?: UserProfile } => u !== null);
  }

  async isFollowing(followerId: string, followedId: string): Promise<boolean> {
    return Array.from(this.relationships.values()).some(r => r.followerId === followerId && r.followedId === followedId && r.status === "accepted");
  }

  async getPublicUserData(userId: string, viewerId: string): Promise<{ user: User; profile?: UserProfile; stateData: DBStateData[]; events?: DBNewsEvent[]; isFollowing: boolean } | null> {
    const user = this.users.get(userId);
    if (!user) return null;
    const profile = await this.getUserProfile(userId);
    const isFollowing = await this.isFollowing(viewerId, userId);
    const canView = profile?.isPublic !== false || isFollowing || userId === viewerId;
    if (!canView) return { user, profile, stateData: [], isFollowing };
    const userStateData = await this.getUserStateData(userId);
    let events: DBNewsEvent[] | undefined;
    if (profile?.allowEventSharing || userId === viewerId) events = await this.getUserNewsEvents(userId);
    return { user, profile, stateData: userStateData, events, isFollowing };
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

  // Social features - User profiles
  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const result = await this.db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return result[0];
  }

  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const result = await this.db.insert(userProfiles).values(profile).returning();
    return result[0];
  }

  async updateUserProfile(userId: string, updates: Partial<InsertUserProfile>): Promise<UserProfile | undefined> {
    const result = await this.db.update(userProfiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId))
      .returning();
    return result[0];
  }

  // Social features - Search and relationships
  async searchUsers(query: string, currentUserId: string): Promise<(User & { profile?: UserProfile; isFollowing?: boolean })[]> {
    const searchResults = await this.db.select()
      .from(users)
      .where(and(
        ne(users.id, currentUserId),
        or(
          ilike(users.tokenName, `%${query}%`),
          ilike(users.email, `%${query}%`)
        )
      ))
      .limit(20);

    const enrichedResults = await Promise.all(
      searchResults.map(async (user) => {
        const profile = await this.getUserProfile(user.id);
        const isFollowing = await this.isFollowing(currentUserId, user.id);
        return { ...user, profile, isFollowing };
      })
    );

    return enrichedResults;
  }

  async followUser(followerId: string, followedId: string): Promise<UserRelationship> {
    const existing = await this.db.select().from(userRelationships)
      .where(and(
        eq(userRelationships.followerId, followerId),
        eq(userRelationships.followedId, followedId)
      ));
    
    if (existing.length > 0) {
      return existing[0];
    }

    const result = await this.db.insert(userRelationships).values({
      followerId,
      followedId,
      status: "accepted"
    }).returning();
    return result[0];
  }

  async unfollowUser(followerId: string, followedId: string): Promise<void> {
    await this.db.delete(userRelationships)
      .where(and(
        eq(userRelationships.followerId, followerId),
        eq(userRelationships.followedId, followedId)
      ));
  }

  async getFollowing(userId: string): Promise<(User & { profile?: UserProfile })[]> {
    const relationships = await this.db.select()
      .from(userRelationships)
      .where(and(
        eq(userRelationships.followerId, userId),
        eq(userRelationships.status, "accepted")
      ));

    const followedUsers = await Promise.all(
      relationships.map(async (rel) => {
        const user = await this.getUser(rel.followedId);
        if (!user) return null;
        const profile = await this.getUserProfile(rel.followedId);
        return { ...user, profile } as User & { profile?: UserProfile };
      })
    );

    return followedUsers.filter((u): u is User & { profile?: UserProfile } => u !== null);
  }

  async getFollowers(userId: string): Promise<(User & { profile?: UserProfile })[]> {
    const relationships = await this.db.select()
      .from(userRelationships)
      .where(and(
        eq(userRelationships.followedId, userId),
        eq(userRelationships.status, "accepted")
      ));

    const followerUsers = await Promise.all(
      relationships.map(async (rel) => {
        const user = await this.getUser(rel.followerId);
        if (!user) return null;
        const profile = await this.getUserProfile(rel.followerId);
        return { ...user, profile } as User & { profile?: UserProfile };
      })
    );

    return followerUsers.filter((u): u is User & { profile?: UserProfile } => u !== null);
  }

  async isFollowing(followerId: string, followedId: string): Promise<boolean> {
    const result = await this.db.select().from(userRelationships)
      .where(and(
        eq(userRelationships.followerId, followerId),
        eq(userRelationships.followedId, followedId),
        eq(userRelationships.status, "accepted")
      ));
    return result.length > 0;
  }

  async getPublicUserData(userId: string, viewerId: string): Promise<{
    user: User;
    profile?: UserProfile;
    stateData: DBStateData[];
    events?: DBNewsEvent[];
    isFollowing: boolean;
  } | null> {
    const user = await this.getUser(userId);
    if (!user) return null;

    const profile = await this.getUserProfile(userId);
    const isFollowing = await this.isFollowing(viewerId, userId);
    
    // Check if user is public or viewer is following
    const canView = profile?.isPublic !== false || isFollowing || userId === viewerId;
    if (!canView) {
      return { user, profile, stateData: [], isFollowing };
    }

    const userStateData = await this.getUserStateData(userId);
    
    // Only include events if user allows event sharing
    let events: DBNewsEvent[] | undefined;
    if (profile?.allowEventSharing || userId === viewerId) {
      events = await this.getUserNewsEvents(userId);
    }

    return { user, profile, stateData: userStateData, events, isFollowing };
  }
}

export const storage = new PostgresStorage();
